import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContinueReviewing } from "@/components/ContinueReviewing";
import { ContentListPage, type ContentSetRow } from "@/components/ContentListPage";
import { FlashcardPaquets, FlashcardSubjectGrid, flashcardGroups, flashcardPaquets } from "@/components/FlashcardSubjectGrid";
import { Icone } from "@/components/adn/icons";
import { BandeReprise } from "@/components/reviser/BandeReprise";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";
import { TuileCalme } from "@/components/ui/Tuiles";
import { RV } from "@/lib/voice-reviser";
import { getLocale } from "@/lib/i18n/server";
import { normalizeScope, normalizeView, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";

type FlashcardRow = ContentSetRow & {
  is_official?: boolean | null;
  official_published?: boolean | null;
};

type SearchParams = { q?: string; scope?: string; view?: string; subject?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

export default async function FlashcardsPage({ searchParams }: PageProps) {
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

  const [setsRes, systemRes] = await Promise.all([
    (async () => {
      let query = supabase
        .from("flashcard_sets")
        .select("id,title,visibility,created_at,is_official,official_published,subject,library_folders(name)")
        .order("created_at", { ascending: false });
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
    (async () => {
      let query = admin
        .from("flashcard_sets")
        .select("id,title,visibility,created_at,is_official,official_published,subject,library_folders(name)")
        .eq("is_official", true)
        .eq("official_published", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })(),
  ]);

  const system = (systemRes.data ?? []) as unknown as FlashcardRow[];
  const systemIds = new Set(system.map((s) => s.id));

  // "Communauté" ne couvre que ce que les utilisateurs créent eux-mêmes —
  // le contenu Système a son propre onglet, plus de double affichage.
  const all = ((setsRes.data ?? []) as unknown as FlashcardRow[]).filter((s) => !systemIds.has(s.id));
  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");

  const displayItems = scope === "private" ? priv : scope === "shared" ? shared : scope === "public" ? pub : all;
  const cfaItems = displayItems.filter((s) => (s.subject ?? "cfa") !== "personal");
  const personalItems = displayItems.filter((s) => s.subject === "personal");

  // Nombre de cartes par set Système (repli : sans chiffres).
  const counts: Record<string, number> = {};
  if (systemIds.size) {
    try {
      const { data, error } = await admin.from("flashcard_sets").select("id, flashcards(count)").in("id", [...systemIds]);
      if (!error) {
        for (const r of (data ?? []) as { id: string; flashcards: { count: number }[] | null }[]) {
          const n = r.flashcards?.[0]?.count;
          if (typeof n === "number") counts[r.id] = n;
        }
      }
    } catch {
      // pas de compte de cartes
    }
  }

  // « Pour commencer » : le premier set de la première matière qui en a.
  const groups = flashcardGroups(system, counts);
  const firstGroup = groups.find((g) => g.rows.length > 0 && !g.key.startsWith("x-")) ?? groups.find((g) => g.rows.length > 0);
  const first = firstGroup?.rows[0] ?? null;
  const subjects: Record<string, string> = {};
  for (const g of groups) if (!g.key.startsWith("x-")) for (const r of g.rows) subjects[r.id] = g.name;

  // Vue Système : le gabarit commun des listes de Réviser (carte du lieu « Le
  // casier », bande « Reprendre », index du programme, puis les paquets de la
  // matière choisie). La vue Communauté garde la liste des contenus des joueurs.
  if (view === "system") {
    const subjectsAvail = await loadSubjectsSafe(supabase, user.id);
    const paquets = flashcardPaquets(system, counts, sp.subject);
    const lien = (scope: string) => `/flashcards?view=community&scope=${scope}`;
    const suite = (
      <>
        {paquets && (
          <section id="paquets" className="rl-section scroll-mt-24" aria-label={RV.lesPaquets(paquets.name)}>
            <h2 className="t-h2 m-0">{RV.lesPaquets(paquets.name)}</h2>
            <FlashcardPaquets groups={paquets.groups} basePath="/flashcards" />
          </section>
        )}
        <section className="rl-section" aria-label={RV.paquetsCommunaute}>
          <h2 className="t-h2 m-0">{RV.paquetsCommunaute}</h2>
          <div className="grid gap-4 md:grid-cols-2 md:gap-[18px]">
            <TuileCalme
              icone={<Icone nom="flashcards" size={17} />}
              titre={RV.tesPaquets.kicker}
              droite={<span className="t-micro font-mono">{priv.length}</span>}
              fort={RV.tesPaquets.titre}
              ligne={RV.tesPaquets.ligne}
              actions={
                <Link href={lien("private")} className="ink-link inline-flex items-center gap-1 text-[14px] font-semibold">
                  {RV.tesPaquets.action} <ArrowRight size={14} aria-hidden />
                </Link>
              }
            />
            <TuileCalme
              icone={<Icone nom="reviser" size={17} />}
              titre={RV.partages.kicker}
              droite={<span className="t-micro font-mono">{pub.length}</span>}
              fort={RV.partages.titre}
              ligne={RV.partages.ligne}
              actions={
                <Link href={lien("public")} className="ink-link inline-flex items-center gap-1 text-[14px] font-semibold">
                  {RV.partages.action} <ArrowRight size={14} aria-hidden />
                </Link>
              }
            />
          </div>
        </section>
      </>
    );
    return (
      <ListeReviser
        kind="cartes"
        subjects={subjectsAvail}
        bande={<BandeReprise fallback={first && firstGroup ? { id: first.id, title: first.title, subject: firstGroup.name } : null} counts={counts} subjects={subjects} />}
        suite={suite}
      />
    );
  }

  return (
    <ContentListPage
      locale={locale}
      basePath="/flashcards"
      kicker="Réviser · CFA Niveau I"
      title="Flashcards"
      titleKey="flashcards.title"
      i18nPrefix="flashcards"
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
      itemUnit="set"
      unit={["carte", "cartes"]}
      setUnit={["set", "sets"]}
      systemCount={system.length}
      continueReviewingSlot={
        <ContinueReviewing
          kind="flashcards"
          basePath="/flashcards"
          fallback={first && firstGroup ? { id: first.id, title: first.title, subject: firstGroup.name } : null}
          counts={counts}
          subjects={subjects}
          srs
          unit={["carte", "cartes"]}
        />
      }
      systemSlot={<FlashcardSubjectGrid items={system} counts={counts} basePath="/flashcards" selectedFolder={sp.subject} />}
    />
  );
}
