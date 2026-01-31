import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlashcardSetCreator } from "@/components/FlashcardSetCreator";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
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

export default async function FlashcardsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  const locale = await getLocale();

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

  const rootLabel = t(locale, "folders.none");

  const [{ data: profile }, tagsRes, setsRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    supabase.from("tags").select("id,name,color").order("name", { ascending: true }),
    (async () => {
      let query = supabase
        .from("flashcard_sets")
        .select("id,title,visibility,created_at,folder_id, library_folders(id,name,parent_id)")
        .order("created_at", { ascending: false });

      if (q) query = query.ilike("title", `%${q}%`);

      return await query;
    })()
  ]);

  const activeGroupId = (profile as any)?.active_group_id ?? null;

  let allRaw = (setsRes.data ?? []) as unknown as SetRow[];

  const tags = (tagsRes?.data ?? []) as any[];
  const tagsForFilter = [{ id: "__none", name: t(locale, "tags.noTags") }, ...tags] as any[];

  if (tagIds.length) {
    const rel = await supabase
      .from("flashcard_set_tags")
      .select("set_id,tag_id")
      .in("tag_id", tagIds);
    if (!rel.error) {
      const rows = (rel.data ?? []) as any[];
      const counts = new Map<string, number>();
      for (const r of rows) {
        const id = String(r.set_id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const allow = new Set<string>();
      for (const [setId, c] of counts.entries()) {
        if (c >= tagIds.length) allow.add(setId);
      }
      allRaw = allRaw.filter((s) => allow.has(s.id));
    }
  }

  // Build tag map for list rendering (and "untagged" filtering).
  const allIds = Array.from(new Set(allRaw.map((s) => s.id)));
  const relAll = await supabase
    .from("flashcard_set_tags")
    .select("set_id,tag_id")
    .in("set_id", allIds);
  const tagMap = new Map<string, string[]>();
  if (!relAll.error) {
    for (const r of (relAll.data ?? []) as any[]) {
      const sid = String(r.set_id);
      const tid = String(r.tag_id);
      tagMap.set(sid, [...(tagMap.get(sid) ?? []), tid]);
    }
  }

  if (untaggedOnly) {
    allRaw = allRaw.filter((s) => !tagMap.has(s.id));
  }

  const folderIds = Array.from(new Set(allRaw.map((s) => s.folder_id).filter(Boolean))) as string[];
  const folderRows = await fetchFoldersWithAncestors(supabase as any, folderIds);
  const folderPaths = buildFolderPathMap(folderRows, rootLabel);

  const all = allRaw.map((s) => ({
    ...s,
    folder_path: s.folder_id ? folderPaths.get(s.folder_id) ?? null : null,
    tag_ids: tagMap.get(s.id) ?? []
  }));

  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");

  const isFR = locale.toLowerCase().startsWith("fr");

  const L = {
    // Hero
    infoTitle: t(locale, "flashcards.title"),
    hero1: t(locale, "flashcards.subtitle"),

    // List
    your: t(locale, "flashcards.yourSets"),
    searchPlaceholder: locale === "fr" ? "Rechercher un set…" : "Search a set…",
    filterBtn: locale === "fr" ? "Filtrer" : "Filter",
    reset: "Reset",
    all: locale === "fr" ? "Tous" : "All",
    private: locale === "fr" ? "Privés" : "Private",
    shared: locale === "fr" ? "Groupes" : "Groups",
    public: locale === "fr" ? "Publics" : "Public",
    open: t(locale, "flashcards.open"),

    root: locale === "fr" ? "Sans dossier" : "No folder",

    subtitlePrivate: locale === "fr" ? "Visible uniquement par toi." : "Visible only to you.",
    subtitleShared:
      locale === "fr" ? "Visibles pour certains groupes." : "Visible to selected groups.",
    subtitlePublic:
      locale === "fr" ? "Visibles par tous (selon tes règles)." : "Visible to everyone (per your rules).",

    emptyPrivate: locale === "fr" ? "Aucun set privé." : "No private set.",
    emptyShared: locale === "fr" ? "Aucun set partagé." : "No shared set.",
    emptyPublic: locale === "fr" ? "Aucun set public." : "No public set.",
    nothingFound: t(locale, "flashcards.empty")
  };

  return (
    <div className="grid gap-4">
      {/* Hero (create is behind a + button to keep the page clean) */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold opacity-80">{L.infoTitle}</div>
            <div className="mt-3 max-w-[68ch] text-base text-white/80">{L.hero1}</div>
          </div>
          <div className="hidden sm:block">
            <CreateAction
              title={t(locale, "flashcards.createTitle")}
              buttonLabel={locale === "fr" ? "Créer un set" : "Create a set"}
              iconOnly={true}
            >
              <FlashcardSetCreator activeGroupId={activeGroupId} />
            </CreateAction>
          </div>
        </div>
      </div>

      {/* Mobile floating + */}
      <FloatingCreateAction title={t(locale, "flashcards.createTitle")} buttonLabel={locale === "fr" ? "Créer un set" : "Create a set"}>
        <FlashcardSetCreator activeGroupId={activeGroupId} />
      </FloatingCreateAction>

      {/* Bottom: Sets */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{L.your}</h2>
          <div className="text-xs opacity-70">{all.length}</div>
        </div>
        <div className="mt-4">
          <VisibilityTabs
            basePath="/flashcards"
            currentQuery={currentQuery}
            active={(scope as any)}
            labels={{ private: L.private, shared: L.shared, public: L.public }}
            counts={{ private: priv.length, shared: shared.length, public: pub.length }}
          />
        </div>

        {/* Filters */}
<div className="mt-4 sm:hidden">
  <form action="/flashcards" method="get" className="grid gap-2">
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
            <Link href="/flashcards" className="btn btn-ghost w-full whitespace-nowrap">
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
  action="/flashcards"
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
    <Link href="/flashcards" className="btn btn-ghost whitespace-nowrap">
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
                    locale={locale}
                    items={priv}
                    rootLabel={L.root}
                    openLabel={L.open}
                    basePath="/flashcards"
                    allTags={tags as any}
                    tagRelation={{ table: "flashcard_set_tags", itemColumn: "set_id" }}
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
                    locale={locale}
                    items={shared}
                    rootLabel={L.root}
                    openLabel={L.open}
                    basePath="/flashcards"
                    allTags={tags as any}
                    tagRelation={{ table: "flashcard_set_tags", itemColumn: "set_id" }}
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
                    locale={locale}
                    items={pub}
                    rootLabel={L.root}
                    openLabel={L.open}
                    basePath="/flashcards"
                    allTags={tags as any}
                    tagRelation={{ table: "flashcard_set_tags", itemColumn: "set_id" }}
                  />
                ) : (
                  <div className="text-sm opacity-70">{L.emptyPublic}</div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {all.length === 0 ? <div className="mt-4 text-sm opacity-70">{L.nothingFound}</div> : null}
      </div>
    </div>
  );
}
