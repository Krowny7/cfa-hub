import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { QuizSetCreator } from "@/components/QuizSetCreator";
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
  const scope = normalizeScope(sp.scope) as ScopeFilter;

  const [{ data: profile }, setsRes] = await Promise.all([
    supabase.from("profiles").select("active_group_id").eq("id", user.id).maybeSingle(),
    (async () => {
      let query = supabase
        .from("quiz_sets")
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
  const totalCount = all.length;

  return (
    <div className="grid gap-4">
      {/* Top row: Info + Create aligned */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex h-full flex-col justify-center rounded-2xl border p-4 sm:p-8">
            <div className="text-sm font-semibold opacity-80">{L.infoTitle}</div>
            <div className="mt-3 text-3xl font-semibold leading-tight">{L.hero1}</div>
            <div className="mt-3 text-base opacity-80 max-w-[56ch]">{L.hero2}</div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <QuizSetCreator activeGroupId={activeGroupId} />
        </div>
      </div>

      {/* Bottom: Vos QCM */}
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{L.your}</h2>
          <div className="text-xs opacity-70">{totalCount}</div>
        </div>

        <form className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center" action="/qcm" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder={L.searchPlaceholder}
            className="w-full min-w-0 flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm sm:min-w-[220px]"
          />
          <select
            name="scope"
            defaultValue={scope}
            className="w-full rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm text-white sm:w-auto sm:min-w-[180px]"
          >
            <option value="all">{L.all}</option>
            <option value="private">{L.private}</option>
            <option value="shared">{L.shared}</option>
            <option value="public">{L.public}</option>
          </select>
          <button
            type="submit"
            className="w-full whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto"
          >
            {L.filterBtn}
          </button>

          {q || scope !== "all" ? (
            <Link href="/qcm" className="w-full whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 text-center text-sm hover:bg-white/5 sm:w-auto">
              {L.reset}
            </Link>
          ) : null}
        </form>

        <div className="mt-4 grid gap-4">
          {scope === "all" || scope === "private" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.private} subtitle={L.subtitlePrivate} count={priv.length} tone="private" />
              {priv.length ? (
                <FolderBlocks locale={localeStr} items={priv} rootLabel={L.root} openLabel={L.open} basePath="/qcm" />
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
                  locale={localeStr}
                  items={shared}
                  rootLabel={L.root}
                  openLabel={L.open}
                  basePath="/qcm"
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
                <FolderBlocks locale={localeStr} items={pub} rootLabel={L.root} openLabel={L.open} basePath="/qcm" />
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