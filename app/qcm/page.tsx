import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/server";
import { ContinueReviewing } from "@/components/ContinueReviewing";
import { ContentListPage, type ContentSetRow } from "@/components/ContentListPage";
import { SubjectBrowser } from "@/components/ContentFolderBlocks";
import { groupBySubject, subjectFromParam, type ItemMeta } from "@/components/ContentDetailHeader";
import { normalizeScope, normalizeView, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";

type OfficialRow = ContentSetRow & {
  is_official?: boolean | null;
  official_published?: boolean | null;
  difficulty?: number | null;
};

type SearchParams = { q?: string; scope?: string; view?: string; subject?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

/**
 * Taille de chaque QCM Système et progression du joueur (questions déjà
 * réussies au moins une fois, table quiz_question_progress). Tout est
 * facultatif : en cas d'erreur, la liste s'affiche sans chiffres.
 */
async function loadOfficialProgress(admin: SupabaseClient, supabase: SupabaseClient, userId: string, ids: string[]) {
  const meta: Record<string, ItemMeta> = {};
  const last: Record<string, number> = {};
  if (!ids.length) return { meta, last };
  const official = new Set(ids);

  try {
    const { data, error } = await admin.from("quiz_sets").select("id, quiz_questions(count)").in("id", ids);
    if (!error) {
      for (const r of (data ?? []) as { id: string; quiz_questions: { count: number }[] | null }[]) {
        meta[r.id] = { count: r.quiz_questions?.[0]?.count ?? null, done: null };
      }
    }
  } catch {
    // pas de compte de questions
  }

  try {
    const { data: prog } = await supabase
      .from("quiz_question_progress")
      .select("question_id,first_correct_at")
      .eq("user_id", userId)
      .order("first_correct_at", { ascending: false })
      .limit(3000);
    const rows = (prog ?? []) as { question_id: string; first_correct_at: string | null }[];
    if (rows.length) {
      const chunks: string[][] = [];
      for (let i = 0; i < rows.length; i += 150) chunks.push(rows.slice(i, i + 150).map((r) => r.question_id));
      const results = await Promise.all(chunks.map((c) => admin.from("quiz_questions").select("id,set_id").in("id", c)));
      const setOf = new Map<string, string>();
      for (const res of results) for (const q of (res.data ?? []) as { id: string; set_id: string }[]) setOf.set(q.id, q.set_id);
      for (const r of rows) {
        const sid = setOf.get(r.question_id);
        if (!sid || !official.has(sid)) continue;
        const m = (meta[sid] ??= { count: null, done: null });
        m.done = (m.done ?? 0) + 1;
        const ts = r.first_correct_at ? Date.parse(r.first_correct_at) : 0;
        if (ts > (last[sid] ?? 0)) last[sid] = ts;
      }
    }
  } catch {
    // pas de progression
  }

  return { meta, last };
}

export default async function QcmPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const scope = normalizeScope(sp.scope) as ScopeFilter;
  const view = normalizeView(sp.view);

  const admin = createAdminClient();

  const [setsRes, officialRes] = await Promise.all([
    (async () => {
      let query = supabase
        .from("quiz_sets")
        .select("id,title,visibility,created_at,is_official,official_published,difficulty,subject,library_folders(name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
    (async () => {
      let query = admin
        .from("quiz_sets")
        .select("id,title,visibility,created_at,is_official,official_published,difficulty,subject,library_folders(name)")
        .eq("is_official", true)
        .eq("official_published", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
  ]);

  const official = (officialRes.data ?? []) as unknown as OfficialRow[];
  const officialIds = new Set(official.map((s) => s.id));

  // "Communauté" ne couvre que ce que les utilisateurs créent eux-mêmes —
  // le contenu Système a son propre onglet, plus de double affichage.
  const all = ((setsRes.data ?? []) as unknown as OfficialRow[]).filter((s) => !officialIds.has(s.id));
  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");

  const displayItems = scope === "private" ? priv : scope === "shared" ? shared : scope === "public" ? pub : all;
  const cfaItems = displayItems.filter((s) => (s.subject ?? "cfa") !== "personal");
  const personalItems = displayItems.filter((s) => s.subject === "personal");

  // Contenu Système : rangé par matière, avec taille et progression.
  const { meta, last } = await loadOfficialProgress(admin, supabase, user.id, [...officialIds]);
  const groups = groupBySubject(
    official.map((s) => ({ id: s.id, title: s.title, folder: s.library_folders?.name ?? null, visibility: s.visibility })),
    meta
  );

  // « Ta suite » : le QCM entamé le plus récemment et pas fini ; sinon le
  // premier QCM du programme (Ethics) pour un nouveau joueur.
  const ordered = groups.flatMap((g) => g.rows.map((r) => ({ r, g })));
  const started = ordered
    .filter(({ r }) => (r.done ?? 0) > 0 && (r.count === null || (r.done ?? 0) < r.count))
    .sort((a, b) => (last[b.r.id] ?? 0) - (last[a.r.id] ?? 0));
  const next = started[0] ?? ordered.find(({ r, g }) => !g.key.startsWith("x-") && !r.done) ?? ordered[0] ?? null;

  const counts: Record<string, number> = {};
  const done: Record<string, number> = {};
  const subjects: Record<string, string> = {};
  for (const { r, g } of ordered) {
    if (r.count !== null) counts[r.id] = r.count;
    if (r.done) done[r.id] = r.done;
    if (!g.key.startsWith("x-")) subjects[r.id] = g.name;
  }

  const initialKey = subjectFromParam(sp.subject)?.key ?? (sp.subject && groups.some((g) => g.key === sp.subject) ? sp.subject : null) ?? next?.g.key ?? null;

  return (
    <ContentListPage
      locale={locale}
      basePath="/qcm"
      kicker="S'entraîner · CFA Niveau I"
      title="QCM par thème"
      titleKey="qcm.title"
      i18nPrefix="qcm"
      view={view}
      scope={scope}
      q={q}
      all={all}
      priv={priv}
      shared={shared}
      pub={pub}
      cfaItems={cfaItems}
      personalItems={personalItems}
      displayItems={displayItems}
      itemUnit="QCM"
      unit={["question", "questions"]}
      setUnit={["QCM", "QCM"]}
      systemCount={official.length}
      continueReviewingSlot={
        <ContinueReviewing
          kind="qcm"
          basePath="/qcm"
          fallback={next ? { id: next.r.id, title: next.r.title, subject: next.g.key.startsWith("x-") ? null : next.g.name } : null}
          counts={counts}
          done={done}
          subjects={subjects}
          unit={["question", "questions"]}
        />
      }
      systemSlot={
        <SubjectBrowser
          groups={groups}
          basePath="/qcm"
          unit={["question", "questions"]}
          setUnit={["QCM", "QCM"]}
          setLabel="QCM"
          drillLabel="Quiz des fiches"
          initialKey={initialKey}
          syncParam="subject"
          progressLabel="réussies"
          emptyLabel="Les QCM de cette matière arrivent bientôt."
          note="L'XP se gagne sur ces QCM : une fois par question, à ta première bonne réponse."
        />
      }
    />
  );
}
