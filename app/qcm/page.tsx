import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { QuizSetCreator } from "@/components/QuizSetCreator";
import { FolderBlocks, SectionHeader } from "@/components/ContentFolderBlocks";
import { normalizeScope, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";
import { fetchFoldersWithAncestors, buildFolderPathMap } from "@/lib/content/folders";
import { TagFilterField } from "@/components/TagFilterField";
import { CreateAction } from "@/components/CreateAction";
import { FloatingCreateAction } from "@/components/FloatingCreateAction";
import { VisibilityTabs } from "@/components/VisibilityTabs";

function parseList(raw?: string): string[] {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type SetRow = {
  id: string;
  title: string;
  visibility: string | null;
  created_at: string | null;
  is_official?: boolean | null;
  official_published?: boolean | null;
  difficulty?: number | null;
  folder_id?: string | null;
  folder_path?: string | null;
  library_folders?: { id: string | null; name: string | null; parent_id: string | null } | null;
};

type SearchParams = {
  q?: string;
  scope?: string;
  tags?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function QcmPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  // ✅ garde le type “locale” attendu par t()
  const locale = (await getLocale()) ?? "fr";
  const localeStr = String(locale || "fr");
  const isFR = localeStr.toLowerCase().startsWith("fr");

  const L = {
    // Hero
    infoTitle: isFR ? "QCM" : "MCQ",
    hero1: isFR ? "Entraîne-toi en conditions réelles." : "Train under real conditions.",
    hero2: isFR
      ? "Crée tes QCM, partage-les à tes groupes, et progresse question après question."
      : "Create MCQs, share them with your groups, and improve question by question.",

    // List
    your: isFR ? "Vos QCM" : "Your MCQs",
    searchPlaceholder: isFR ? "Rechercher un QCM…" : "Search a MCQ…",
    filterBtn: isFR ? "Filtrer" : "Filter",
    reset: "Reset",
    all: isFR ? "Tous" : "All",
    private: isFR ? "Privés" : "Private",
    shared: isFR ? "Groupes" : "Groups",
    public: isFR ? "Publics" : "Public",

    // ✅ plus d’erreur ici
    open: t(locale, "qcm.open"),

    // folder naming
    root: isFR ? "Sans dossier" : "No folder",

    // section subtitles
    subtitlePrivate: isFR ? "Visible uniquement par toi." : "Visible only to you.",
    subtitleShared: isFR ? "Visibles pour certains groupes." : "Visible to selected groups.",
    subtitlePublic: isFR ? "Visibles par tous (selon tes règles)." : "Visible to everyone (per your rules).",

    officialTitle: isFR ? "QCM officiels (XP)" : "Official quizzes (XP)",
    officialSubtitle: isFR
      ? "Seuls les QCM officiels donnent de l’XP (questions justes)."
      : "Only official quizzes grant XP (correct answers).",
    emptyOfficial: isFR ? "Aucun QCM officiel pour l’instant." : "No official quizzes yet.",

    emptyPrivate: isFR ? "Aucun QCM privé." : "No private MCQ.",
    emptyShared: isFR ? "Aucun QCM partagé." : "No shared MCQ.",
    emptyPublic: isFR ? "Aucun QCM public." : "No public MCQ.",
    nothingFound: isFR ? "Aucun QCM trouvé." : "No MCQ found."
  };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const rawScope = normalizeScope(sp.scope ?? "private") as ScopeFilter;
  const scope = (rawScope === "all" ? "private" : rawScope) as ScopeFilter;
  const rawTagIds = parseList(sp.tags);
  const untaggedOnly = rawTagIds.includes("__none");
  const tagIds = rawTagIds.filter((id) => id !== "__none");

  const currentQuery = {
    ...(q ? { q } : {}),
    ...(scope && scope !== "private" ? { scope } : {}),
    ...(rawTagIds.length ? { tags: rawTagIds } : {})
  };

  const [{ data: profile }, tagsRes, setsRes, officialRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    supabase.from("tags").select("id,name,color").order("name", { ascending: true }),
    (async () => {
      let query = supabase
        .from("quiz_sets")
        .select("id,title,visibility,created_at,is_official,official_published,difficulty,folder_id, library_folders(id,name,parent_id)")
        .order("created_at", { ascending: false });

      if (q) query = query.ilike("title", `%${q}%`);

      return await query;
    })()
    ,
    (async () => {
      let query = supabase
        .from("quiz_sets")
        .select("id,title,visibility,created_at,is_official,official_published,difficulty,folder_id, library_folders(id,name,parent_id)")
        .eq("is_official", true)
        .eq("official_published", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (q) query = query.ilike("title", `%${q}%`);
      return await query;
    })()
  ]);

  const activeGroupId = (profile as any)?.active_group_id ?? null;

  let allRaw = (setsRes.data ?? []) as unknown as SetRow[];

  // Official (XP) quiz sets. Only these can grant XP.
  let officialRaw = (officialRes.data ?? []) as unknown as SetRow[];

  const tags = (tagsRes?.data ?? []) as any[];
  const tagsForFilter = [{ id: "__none", name: t(locale, "tags.noTags") }, ...tags] as any[];

  if (tagIds.length) {
    const rel = await supabase
      .from("quiz_set_tags")
      .select("quiz_set_id,tag_id")
      .in("tag_id", tagIds);
    if (!rel.error) {
      const rows = (rel.data ?? []) as any[];
      const counts = new Map<string, number>();
      for (const r of rows) {
        const id = String(r.quiz_set_id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const allow = new Set<string>();
      for (const [setId, c] of counts.entries()) {
        if (c >= tagIds.length) allow.add(setId);
      }
      allRaw = allRaw.filter((s) => allow.has(s.id));
      officialRaw = officialRaw.filter((s) => allow.has(s.id));
    }
  }

  // Build tag map for list rendering (and "untagged" filtering).
  const allIds = Array.from(new Set([...allRaw, ...officialRaw].map((s) => s.id)));
  const relAll = await supabase
    .from("quiz_set_tags")
    .select("quiz_set_id,tag_id")
    .in("quiz_set_id", allIds);
  const tagMap = new Map<string, string[]>();
  if (!relAll.error) {
    for (const r of (relAll.data ?? []) as any[]) {
      const sid = String(r.quiz_set_id);
      const tid = String(r.tag_id);
      tagMap.set(sid, [...(tagMap.get(sid) ?? []), tid]);
    }
  }

  if (untaggedOnly) {
    allRaw = allRaw.filter((s) => !tagMap.has(s.id));
    officialRaw = officialRaw.filter((s) => !tagMap.has(s.id));
  }

  // Build folder "Parent / Child" paths for better scalability.
  const folderIds = Array.from(
    new Set([...allRaw, ...officialRaw].map((s) => s.folder_id).filter(Boolean))
  ) as string[];
  const folderRows = await fetchFoldersWithAncestors(supabase as any, folderIds);
  const folderPaths = buildFolderPathMap(folderRows, L.root);

  const all = allRaw.map((s) => ({
    ...s,
    folder_path: s.folder_id ? folderPaths.get(s.folder_id) ?? null : null,
    tag_ids: tagMap.get(s.id) ?? []
  }));

  const official = officialRaw.map((s) => ({
    ...s,
    folder_path: s.folder_id ? folderPaths.get(s.folder_id) ?? null : null,
    tag_ids: tagMap.get(s.id) ?? []
  }));

  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");
  const totalCount = all.length;
  const officialCount = official.length;

  return (
    <div className="grid gap-4">
      {/* Hero (create is behind a + button to keep the page clean) */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold opacity-80">{L.infoTitle}</div>
            <div className="mt-3 text-3xl font-semibold leading-tight">{L.hero1}</div>
            <div className="mt-3 text-base opacity-80 max-w-[56ch]">{L.hero2}</div>
          </div>
          <div className="hidden sm:block">
            <CreateAction title={t(locale, "qcm.createTitle")} buttonLabel={isFR ? "Créer un QCM" : "Create a MCQ"} iconOnly={true}>
              <QuizSetCreator activeGroupId={activeGroupId} />
            </CreateAction>
          </div>
        </div>
      </div>

      {/* Mobile floating + */}
      <FloatingCreateAction title={t(locale, "qcm.createTitle")} buttonLabel={isFR ? "Créer un QCM" : "Create a MCQ"}>
        <QuizSetCreator activeGroupId={activeGroupId} />
      </FloatingCreateAction>

      {/* Bottom: Vos QCM */}
      <div className="card p-5">
        {official.length ? (
          <div className="mb-6 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{isFR ? "QCM officiels (XP)" : "Official quizzes (XP)"}</h2>
              <div className="text-xs opacity-70">{official.length}</div>
            </div>
            <div className="text-sm opacity-70">
              {isFR
                ? "L’XP est gagnée uniquement sur ces QCM (questions justes, 1x par question)."
                : "XP is earned only on these quizzes (correct answers, once per question)."}
            </div>
            <FolderBlocks
              locale={localeStr}
              items={official}
              rootLabel={L.root}
              openLabel={L.open}
              basePath="/qcm"
              allTags={tags as any}
              tagRelation={{ table: "quiz_set_tags", itemColumn: "quiz_set_id" }}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{L.your}</h2>
          <div className="text-xs opacity-70">{totalCount}</div>
        </div>
        <div className="mt-4">
          <VisibilityTabs
            basePath="/qcm"
            currentQuery={currentQuery}
            active={(scope as any)}
            labels={{ private: L.private, shared: L.shared, public: L.public }}
            counts={{ private: priv.length, shared: shared.length, public: pub.length }}
          />
        </div>

        {/* Filters */}
<div className="mt-4 sm:hidden">
  <form action="/qcm" method="get" className="grid gap-2">
    <input
      name="q"
      defaultValue={q}
      placeholder={L.searchPlaceholder}
      className="input"
    />
    <input type="hidden" name="scope" value={scope} />

    <details className="group card-soft">
      <summary className="cursor-pointer list-none select-none rounded-xl px-4 py-3 transition hover:bg-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{isFR ? "Filtres" : "Filters"}</div>
          <div className="text-sm opacity-60 transition group-open:rotate-180">▼</div>
        </div>
      </summary>

      <div className="border-t border-white/10 p-4">
        <div className="grid gap-2">
          <TagFilterField tags={tagsForFilter as any} initial={rawTagIds} name="tags" />
          <button type="submit" className="btn btn-secondary w-full whitespace-nowrap">
            {L.filterBtn}
          </button>

          {q || scope !== "private" || tagIds.length ? (
            <Link href="/qcm" className="btn btn-ghost w-full whitespace-nowrap">
              {L.reset}
            </Link>
          ) : null}
        </div>
      </div>
    </details>
  </form>
</div>

<form
  className="mt-4 hidden gap-2 sm:flex sm:flex-wrap sm:items-center"
  action="/qcm"
  method="get"
>
  <input
    name="q"
    defaultValue={q}
    placeholder={L.searchPlaceholder}
    className="input flex-1 sm:min-w-[220px]"
  />
  <input type="hidden" name="scope" value={scope} />
<div className="w-full sm:w-[320px]">
    <TagFilterField tags={tagsForFilter as any} initial={rawTagIds} name="tags" />
  </div>

  <button type="submit" className="btn btn-secondary whitespace-nowrap">
    {L.filterBtn}
  </button>

  {q || scope !== "private" || tagIds.length ? (
    <Link href="/qcm" className="btn btn-ghost whitespace-nowrap">
      {L.reset}
    </Link>
  ) : null}
</form>
        {/* Scope tab content */}
        <div className="mt-4 card-soft p-4">
          {scope === "private" ? (
            <>
              <SectionHeader title={L.private} subtitle={L.subtitlePrivate} count={priv.length} tone="private" />
              <div className="mt-4">
                {priv.length ? (
                  <FolderBlocks
                    locale={localeStr}
                    items={priv}
                    rootLabel={L.root}
                    openLabel={L.open}
                    basePath="/qcm"
                    allTags={tags as any}
                    tagRelation={{ table: "quiz_set_tags", itemColumn: "quiz_set_id" }}
                  />
                ) : (
                  <div className="text-sm opacity-70">{L.emptyPrivate}</div>
                )}
              </div>
            </>
          ) : null}

          {scope === "shared" ? (
            <>
              <SectionHeader title={L.shared} subtitle={L.subtitleShared} count={shared.length} tone="shared" />
              <div className="mt-4">
                {shared.length ? (
                  <FolderBlocks
                    locale={localeStr}
                    items={shared}
                    rootLabel={L.root}
                    openLabel={L.open}
                    basePath="/qcm"
                    allTags={tags as any}
                    tagRelation={{ table: "quiz_set_tags", itemColumn: "quiz_set_id" }}
                  />
                ) : (
                  <div className="text-sm opacity-70">{L.emptyShared}</div>
                )}
              </div>
            </>
          ) : null}

          {scope === "public" ? (
            <>
              <SectionHeader title={L.public} subtitle={L.subtitlePublic} count={pub.length} tone="public" />
              <div className="mt-4">
                {pub.length ? (
                  <FolderBlocks
                    locale={localeStr}
                    items={pub}
                    rootLabel={L.root}
                    openLabel={L.open}
                    basePath="/qcm"
                    allTags={tags as any}
                    tagRelation={{ table: "quiz_set_tags", itemColumn: "quiz_set_id" }}
                  />
                ) : (
                  <div className="text-sm opacity-70">{L.emptyPublic}</div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {totalCount === 0 ? <div className="mt-4 text-sm opacity-70">{L.nothingFound}</div> : null}
      </div>
    </div>
  );
}