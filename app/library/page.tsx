import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PdfLinkAdder } from "@/components/PdfLinkAdder";
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

type DocRow = {
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

export default async function LibraryPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  const localeRaw = await getLocale();
  const locale = String(localeRaw || "fr");
  const isFR = locale.toLowerCase().startsWith("fr");

  const L = {
    // Hero
    infoTitle: isFR ? "Bibliothèque PDF" : "PDF Library",
    hero1: isFR ? "Centralise tes PDFs CFA." : "Centralize your CFA PDFs.",
    hero2: isFR
      ? "Ajoute des liens (Drive/OneDrive…), classe-les, et partage-les à tes groupes."
      : "Add links (Drive/OneDrive…), organize them, and share with your groups.",

    // List
    your: isFR ? "Vos PDFs" : "Your PDFs",
    searchPlaceholder: isFR ? "Rechercher un PDF…" : "Search a PDF…",
    filterBtn: isFR ? "Filtrer" : "Filter",
    reset: "Reset",
    all: isFR ? "Tous" : "All",
    private: isFR ? "Privés" : "Private",
    shared: isFR ? "Groupes" : "Groups",
    public: isFR ? "Publics" : "Public",
    open: isFR ? "Ouvrir →" : "Open →",

    // folder naming
    root: isFR ? "Sans dossier" : "No folder",

    // section subtitles
    subtitlePrivate: isFR ? "Visible uniquement par toi." : "Visible only to you.",
    subtitleShared: isFR ? "Visibles pour certains groupes." : "Visible to selected groups.",
    subtitlePublic: isFR ? "Visibles par tous (selon tes règles)." : "Visible to everyone (per your rules).",

    emptyPrivate: isFR ? "Aucun PDF privé." : "No private PDF.",
    emptyShared: isFR ? "Aucun PDF partagé." : "No shared PDF.",
    emptyPublic: isFR ? "Aucun PDF public." : "No public PDF.",
    nothingFound: isFR ? "Aucun PDF trouvé." : "No PDF found."
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

  const [{ data: profile }, tagsRes, docsRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    supabase.from("tags").select("id,name,color").order("name", { ascending: true }),
    (async () => {
      let query = supabase
        .from("documents")
        .select("id,title,visibility,created_at,folder_id, library_folders(id,name,parent_id)")
        .order("created_at", { ascending: false });

      if (q) query = query.ilike("title", `%${q}%`);

      return await query;
    })()
  ]);

  const activeGroupId = (profile as any)?.active_group_id ?? null;

  let allRaw = (docsRes.data ?? []) as unknown as DocRow[];

  // Optional: tag filter (works even if folders + scope already filtered)
  const tags = (tagsRes?.data ?? []) as any[];
  const tagsForFilter = [{ id: "__none", name: t(locale, "tags.noTags") }, ...tags] as any[];

  if (tagIds.length) {
    const rel = await supabase
      .from("document_tags")
      .select("document_id,tag_id")
      .in("tag_id", tagIds);
    if (!rel.error) {
      const rows = (rel.data ?? []) as any[];
      const counts = new Map<string, number>();
      for (const r of rows) {
        const id = String(r.document_id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const allow = new Set<string>();
      for (const [docId, c] of counts.entries()) {
        if (c >= tagIds.length) allow.add(docId);
      }
      allRaw = allRaw.filter((d) => allow.has(d.id));
    }
  }

  // Build tag map for list rendering (and "untagged" filtering).
  const allIds = Array.from(new Set(allRaw.map((d) => d.id)));
  const relAll = await supabase
    .from("document_tags")
    .select("document_id,tag_id")
    .in("document_id", allIds);

  const tagMap = new Map<string, string[]>();
  if (!relAll.error) {
    for (const r of (relAll.data ?? []) as any[]) {
      const did = String(r.document_id);
      const tid = String(r.tag_id);
      tagMap.set(did, [...(tagMap.get(did) ?? []), tid]);
    }
  }

  if (untaggedOnly) {
    allRaw = allRaw.filter((d) => !tagMap.has(d.id));
  }

  // Build folder "Parent / Child" paths for better scalability when folders grow.
  const folderIds = Array.from(new Set(allRaw.map((d) => d.folder_id).filter(Boolean))) as string[];
  const folderRows = await fetchFoldersWithAncestors(supabase as any, folderIds);
  const folderPaths = buildFolderPathMap(folderRows, L.root);

  const all = allRaw.map((d) => ({
    ...d,
    folder_path: d.folder_id ? folderPaths.get(d.folder_id) ?? null : null,
    tag_ids: tagMap.get(d.id) ?? []
  }));

  const priv = all.filter((d) => sectionForVisibility(d.visibility) === "private");
  const shared = all.filter((d) => sectionForVisibility(d.visibility) === "shared");
  const pub = all.filter((d) => sectionForVisibility(d.visibility) === "public");
  const totalCount = all.length;

  return (
    <div className="grid gap-4">
      {/* Hero (create is behind a + button to keep the page clean) */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold opacity-80">{L.infoTitle}</div>
            <div className="mt-3 text-3xl font-semibold leading-tight">{L.hero1}</div>
            <div className="mt-3 max-w-[56ch] text-base text-white/80">{L.hero2}</div>
          </div>
          <div className="hidden sm:block">
            <CreateAction
              title={isFR ? "Ajouter un PDF" : "Add a PDF"}
              buttonLabel={isFR ? "Ajouter" : "Add"}
              iconOnly={true}
            >
              <PdfLinkAdder activeGroupId={activeGroupId} />
            </CreateAction>
          </div>
        </div>
      </div>

      {/* Mobile floating + */}
      <FloatingCreateAction title={isFR ? "Ajouter un PDF" : "Add a PDF"} buttonLabel={isFR ? "Ajouter" : "Add"}>
        <PdfLinkAdder activeGroupId={activeGroupId} />
      </FloatingCreateAction>

      {/* Bottom: Vos PDFs */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{L.your}</h2>
          <div className="text-xs opacity-70">{totalCount}</div>
        </div>
        <div className="mt-4">
          <VisibilityTabs
            basePath="/library"
            currentQuery={currentQuery}
            active={(scope as any)}
            labels={{ private: L.private, shared: L.shared, public: L.public }}
            counts={{ private: priv.length, shared: shared.length, public: pub.length }}
          />
        </div>

        {/* Filters */}
<div className="mt-4 sm:hidden">
  <form action="/library" method="get" className="grid gap-2">
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
            <Link href="/library" className="btn btn-ghost w-full whitespace-nowrap">
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
  action="/library"
  method="get"
>
  <input
    name="q"
    defaultValue={q}
    placeholder={L.searchPlaceholder}
    className="input flex-1 sm:min-w-[220px]"
  />
  <input type="hidden" name="scope" value={scope} />
<div className="w-full sm:w-[360px]">
    <TagFilterField tags={tagsForFilter as any} initial={rawTagIds} name="tags" />
  </div>

  <button type="submit" className="btn btn-secondary whitespace-nowrap">
    {L.filterBtn}
  </button>

  {q || scope !== "private" || tagIds.length ? (
    <Link href="/library" className="btn btn-ghost whitespace-nowrap">
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
                    basePath="/library"
                    allTags={tags as any}
                    tagRelation={{ table: "document_tags", itemColumn: "document_id" }}
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
                    basePath="/library"
                    allTags={tags as any}
                    tagRelation={{ table: "document_tags", itemColumn: "document_id" }}
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
                    basePath="/library"
                    allTags={tags as any}
                    tagRelation={{ table: "document_tags", itemColumn: "document_id" }}
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