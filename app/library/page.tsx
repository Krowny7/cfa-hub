import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PdfLinkAdder } from "@/components/PdfLinkAdder";
import { getLocale } from "@/lib/i18n/server";
import { FolderBlocks, SectionHeader } from "@/components/ContentFolderBlocks";
import { normalizeScope, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";

type DocRow = {
  id: string;
  title: string;
  visibility: string | null;
  created_at: string | null;
  library_folders?: { name: string | null } | null;
};

type SearchParams = {
  q?: string;
  scope?: string;
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
  const scope = normalizeScope(sp.scope) as ScopeFilter;

  const [{ data: profile }, docsRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("documents")
        .select("id,title,visibility,created_at, library_folders(name)")
        .order("created_at", { ascending: false });

      if (q) query = query.ilike("title", `%${q}%`);
      if (scope === "private" || scope === "public") query = query.eq("visibility", scope);
      if (scope === "shared") query = query.in("visibility", ["group", "groups"]);

      return await query;
    })()
  ]);

  const activeGroupId = (profile as any)?.active_group_id ?? null;

  const all = (docsRes.data ?? []) as unknown as DocRow[];

  const priv = all.filter((d) => sectionForVisibility(d.visibility) === "private");
  const shared = all.filter((d) => sectionForVisibility(d.visibility) === "shared");
  const pub = all.filter((d) => sectionForVisibility(d.visibility) === "public");
  const totalCount = all.length;

  return (
    <div className="grid gap-4">
      {/* Top row: Info + Add aligned */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-2xl border p-8 h-full flex flex-col justify-center">
            <div className="text-sm font-semibold opacity-80">{L.infoTitle}</div>
            <div className="mt-3 text-3xl font-semibold leading-tight">{L.hero1}</div>
            <div className="mt-3 text-base opacity-80 max-w-[56ch]">{L.hero2}</div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <PdfLinkAdder activeGroupId={activeGroupId} />
        </div>
      </div>

      {/* Bottom: Vos PDFs */}
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{L.your}</h2>
          <div className="text-xs opacity-70">{totalCount}</div>
        </div>

        <form className="mt-3 flex flex-wrap gap-2" action="/library" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder={L.searchPlaceholder}
            className="w-full flex-1 min-w-[220px] rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
          />
          <select
            name="scope"
            defaultValue={scope}
            className="min-w-[180px] rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm text-white"
          >
            <option value="all">{L.all}</option>
            <option value="private">{L.private}</option>
            <option value="shared">{L.shared}</option>
            <option value="public">{L.public}</option>
          </select>
          <button
            type="submit"
            className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5"
          >
            {L.filterBtn}
          </button>

          {q || scope !== "all" ? (
            <Link href="/library" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
              {L.reset}
            </Link>
          ) : null}
        </form>

        <div className="mt-4 grid gap-4">
          {scope === "all" || scope === "private" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.private} subtitle={L.subtitlePrivate} count={priv.length} tone="private" />
              {priv.length ? (
                <FolderBlocks
                  locale={locale}
                  items={priv}
                  rootLabel={L.root}
                  openLabel={L.open}
                  basePath="/library"
                />
              ) : (
                <div className="text-sm opacity-70">{L.emptyPrivate}</div>
              )}
            </div>
          ) : null}

          {scope === "all" || scope === "shared" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.shared} subtitle={L.subtitleShared} count={shared.length} tone="shared" />
              {shared.length ? (
                <FolderBlocks
                  locale={locale}
                  items={shared}
                  rootLabel={L.root}
                  openLabel={L.open}
                  basePath="/library"
                />
              ) : (
                <div className="text-sm opacity-70">{L.emptyShared}</div>
              )}
            </div>
          ) : null}

          {scope === "all" || scope === "public" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.public} subtitle={L.subtitlePublic} count={pub.length} tone="public" />
              {pub.length ? (
                <FolderBlocks
                  locale={locale}
                  items={pub}
                  rootLabel={L.root}
                  openLabel={L.open}
                  basePath="/library"
                />
              ) : (
                <div className="text-sm opacity-70">{L.emptyPublic}</div>
              )}
            </div>
          ) : null}

          {totalCount === 0 ? <div className="text-sm opacity-70">{L.nothingFound}</div> : null}
        </div>
      </div>
    </div>
  );
}