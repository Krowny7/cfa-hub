import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlashcardSetCreator } from "@/components/FlashcardSetCreator";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { FolderBlocks, SectionHeader } from "@/components/ContentFolderBlocks";
import { normalizeScope, sectionForVisibility, type ScopeFilter } from "@/lib/content/visibility";

type SetRow = {
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

export default async function FlashcardsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  const locale = await getLocale();

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const scope = normalizeScope(sp.scope) as ScopeFilter;

  const [{ data: profile }, setsRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("flashcard_sets")
        .select("id,title,visibility,created_at, library_folders(name)")
        .order("created_at", { ascending: false });

      if (q) query = query.ilike("title", `%${q}%`);
      if (scope === "private" || scope === "public") query = query.eq("visibility", scope);
      if (scope === "shared") query = query.in("visibility", ["group", "groups"]);

      return await query;
    })()
  ]);

  const activeGroupId = (profile as any)?.active_group_id ?? null;

  const all = (setsRes.data ?? []) as unknown as SetRow[];

  const priv = all.filter((s) => sectionForVisibility(s.visibility) === "private");
  const shared = all.filter((s) => sectionForVisibility(s.visibility) === "shared");
  const pub = all.filter((s) => sectionForVisibility(s.visibility) === "public");

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
      {/* Top row: Info + Create */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="card flex h-full flex-col justify-center p-6 sm:p-8">
            <div className="text-sm font-semibold opacity-80">{L.infoTitle}</div>
            <div className="mt-3 max-w-[68ch] text-base text-white/80">{L.hero1}</div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <FlashcardSetCreator activeGroupId={activeGroupId} />
        </div>
      </div>

      {/* Bottom: Sets */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{L.your}</h2>
          <div className="text-xs opacity-70">{all.length}</div>
        </div>

        <form className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center" action="/flashcards" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder={L.searchPlaceholder}
            className="input min-w-0 flex-1 sm:min-w-[220px]"
          />
          <select name="scope" defaultValue={scope} className="select sm:w-auto sm:min-w-[180px]">
            <option value="all">{L.all}</option>
            <option value="private">{L.private}</option>
            <option value="shared">{L.shared}</option>
            <option value="public">{L.public}</option>
          </select>
          <button type="submit" className="btn btn-secondary w-full whitespace-nowrap sm:w-auto">
            {L.filterBtn}
          </button>

          {q || scope !== "all" ? (
            <Link href="/flashcards" className="btn btn-ghost w-full whitespace-nowrap text-center sm:w-auto">
              {L.reset}
            </Link>
          ) : null}
        </form>

        <div className="mt-4 grid gap-4">
          {scope === "all" || scope === "private" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.private} subtitle={L.subtitlePrivate} count={priv.length} tone="private" />
              {priv.length ? (
                <FolderBlocks locale={locale} items={priv} rootLabel={L.root} openLabel={L.open} basePath="/flashcards" />
              ) : (
                <div className="text-sm opacity-70">{L.emptyPrivate}</div>
              )}
            </div>
          ) : null}

          {scope === "all" || scope === "shared" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.shared} subtitle={L.subtitleShared} count={shared.length} tone="shared" />
              {shared.length ? (
                <FolderBlocks locale={locale} items={shared} rootLabel={L.root} openLabel={L.open} basePath="/flashcards" />
              ) : (
                <div className="text-sm opacity-70">{L.emptyShared}</div>
              )}
            </div>
          ) : null}

          {scope === "all" || scope === "public" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.public} subtitle={L.subtitlePublic} count={pub.length} tone="public" />
              {pub.length ? (
                <FolderBlocks locale={locale} items={pub} rootLabel={L.root} openLabel={L.open} basePath="/flashcards" />
              ) : (
                <div className="text-sm opacity-70">{L.emptyPublic}</div>
              )}
            </div>
          ) : null}

          {all.length === 0 ? <div className="text-sm opacity-70">{L.nothingFound}</div> : null}
        </div>
      </div>
    </div>
  );
}
