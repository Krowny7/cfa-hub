import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlashcardSetCreator } from "@/components/FlashcardSetCreator";
import { getLocale } from "@/lib/i18n/server";

type SetRow = {
  id: string;
  title: string;
  visibility: string | null; // "private" | "group" | "groups" | "public"
  created_at: string | null;
  folder_id: string | null;
  folder_name?: string | null;
};

type FolderRow = {
  id: string;
  name: string | null;
};

type SearchParams = {
  q?: string;
  scope?: "all" | "private" | "group" | "public";
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function normScope(v: any): "all" | "private" | "group" | "public" {
  if (v === "private" || v === "group" || v === "public" || v === "all") return v;
  return "all";
}

function normalizeVisibility(v: string | null | undefined): "private" | "group" | "public" {
  // UI regroupe "group" et "groups" sous le label "GROUP"
  if (v === "public") return "public";
  if (v === "group" || v === "groups") return "group";
  return "private";
}

function groupByFolder(locale: string, sets: SetRow[], rootLabel: string) {
  const grouped = new Map<string, SetRow[]>();
  for (const s of sets) {
    const folderName = (s.folder_name ?? null) || rootLabel;
    if (!grouped.has(folderName)) grouped.set(folderName, []);
    grouped.get(folderName)!.push(s);
  }

  const folderNames = Array.from(grouped.keys()).sort((a, b) => {
    if (a === rootLabel) return -1;
    if (b === rootLabel) return 1;
    return a.localeCompare(b, locale);
  });

  return { grouped, folderNames };
}

function ScopeBadge({ scope }: { scope: "private" | "group" | "public" }) {
  const label = scope === "private" ? "PRIVATE" : scope === "group" ? "GROUP" : "PUBLIC";
  const cls =
    scope === "private"
      ? "border-white/15 bg-white/5 text-white/80"
      : scope === "group"
      ? "border-blue-400/25 bg-blue-400/10 text-blue-100"
      : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {label}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
  tone
}: {
  title: string;
  subtitle: string;
  count: number;
  tone: "private" | "group" | "public";
}) {
  const border =
    tone === "private"
      ? "border-white/10"
      : tone === "group"
      ? "border-blue-400/25"
      : "border-emerald-400/25";

  const bg =
    tone === "private"
      ? "bg-white/0"
      : tone === "group"
      ? "bg-blue-400/5"
      : "bg-emerald-400/5";

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs opacity-70">{subtitle}</div>
        </div>
        <div className="text-xs opacity-70">{count}</div>
      </div>
    </div>
  );
}

function FolderBlocks({
  locale,
  sets,
  rootLabel,
  openLabel
}: {
  locale: string;
  sets: SetRow[];
  rootLabel: string;
  openLabel: string;
}) {
  const { grouped, folderNames } = groupByFolder(locale, sets, rootLabel);

  return (
    <div className="grid gap-3">
      {folderNames.map((folder) => {
        const items = grouped.get(folder) ?? [];
        return (
          <details key={folder} className="rounded-xl border border-white/10">
            <summary className="cursor-pointer list-none select-none px-4 py-3 hover:bg-white/5 rounded-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{folder}</div>
                  <div className="text-xs opacity-70">{items.length}</div>
                </div>
                <div className="text-xs opacity-60">▼</div>
              </div>
            </summary>

            <div className="border-t border-white/10 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => {
                  const badgeVis = normalizeVisibility(s.visibility);
                  return (
                    <Link
                      key={s.id}
                      href={`/flashcards/${s.id}`}
                      className="group rounded-xl border border-white/10 p-4 hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{s.title}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <ScopeBadge scope={badgeVis} />
                            {folder !== rootLabel ? (
                              <span className="truncate text-xs opacity-60">{folder}</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm opacity-70 group-hover:opacity-100">
                          {openLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default async function FlashcardsHome({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  const localeRaw = await getLocale();
  const locale = String(localeRaw || "fr");
  const isFR = locale.toLowerCase().startsWith("fr");

  const L = {
    infoTitle: isFR ? "Flashcards" : "Flashcards",
    hero1: isFR ? "Révise plus vite, ensemble." : "Revise faster, together.",
    hero2: isFR
      ? "Crée des sets privés, partage-les à tes groupes, et progresse."
      : "Create private sets, share them with your groups, and improve.",
    createTitle: isFR ? "Créer un set" : "Create a set",

    yourSets: isFR ? "Vos sets" : "Your sets",
    searchPlaceholder: isFR ? "Rechercher un set…" : "Search a set…",
    filterBtn: isFR ? "Filtrer" : "Filter",
    reset: "Reset",
    all: isFR ? "Tous" : "All",
    private: isFR ? "Privés" : "Private",
    group: isFR ? "Groupes" : "Groups",
    public: isFR ? "Publics" : "Public",
    open: isFR ? "Ouvrir →" : "Open →",

    root: isFR ? "Sans dossier" : "No folder",

    subtitlePrivate: isFR ? "Visible uniquement par toi." : "Visible only to you.",
    subtitleGroup: isFR ? "Visibles pour certains groupes." : "Visible to selected groups.",
    subtitlePublic: isFR ? "Visibles par tous (selon tes règles)." : "Visible to everyone (per your rules).",

    emptyPrivate: isFR ? "Aucun set privé." : "No private sets.",
    emptyGroup: isFR ? "Aucun set partagé." : "No shared sets.",
    emptyPublic: isFR ? "Aucun set public." : "No public sets.",
    nothingFound: isFR ? "Aucun set trouvé." : "No sets found.",

    loadError: isFR ? "Erreur de chargement des sets." : "Failed to load sets."
  };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) redirect("/login");

  const q = (sp.q ?? "").trim();
  const scope = normScope(sp.scope);

  const profileRes = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .maybeSingle();
  const activeGroupId = (profileRes.data as any)?.active_group_id ?? null;

  const setsRes = await supabase
    .from("flashcard_sets")
    .select("id,title,visibility,created_at,folder_id")
    .order("created_at", { ascending: false });

  const setsErr = setsRes.error ? String(setsRes.error.message || setsRes.error) : null;
  const rawSets = (setsRes.data ?? []) as unknown as SetRow[];

  const folderIds = Array.from(new Set(rawSets.map((s) => s.folder_id).filter(Boolean))) as string[];
  const folderNameById = new Map<string, string | null>();

  if (folderIds.length > 0) {
    const foldersRes = await supabase.from("library_folders").select("id,name").in("id", folderIds);

    if (!foldersRes.error) {
      for (const f of (foldersRes.data ?? []) as FolderRow[]) {
        folderNameById.set(f.id, f.name ?? null);
      }
    }
  }

  const enriched: SetRow[] = rawSets.map((s) => ({
    ...s,
    folder_name: s.folder_id ? folderNameById.get(s.folder_id) ?? null : null
  }));

  const all = enriched
    .filter((s) => {
      if (!q) return true;
      return (s.title || "").toLowerCase().includes(q.toLowerCase());
    })
    .filter((s) => {
      if (scope === "all") return true;
      if (scope === "group") return ["group", "groups"].includes(s.visibility || "private");
      return (s.visibility || "private") === scope;
    });

  const rootLabel = L.root;

  const priv = all.filter((s) => (s.visibility || "private") === "private");
  const grp = all.filter((s) => ["group", "groups"].includes(s.visibility || "private"));
  const pub = all.filter((s) => (s.visibility || "private") === "public");

  const totalCount = all.length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex h-full flex-col justify-center rounded-2xl border p-4 sm:p-8">
            <div className="text-sm font-semibold opacity-80">{L.infoTitle}</div>
            <div className="mt-3 text-3xl font-semibold leading-tight">{L.hero1}</div>
            <div className="mt-3 text-base opacity-80 max-w-[52ch]">{L.hero2}</div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-2xl border p-4 h-full">
            <div className="mb-3 text-sm font-semibold">{L.createTitle}</div>
            <FlashcardSetCreator activeGroupId={activeGroupId} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{L.yourSets}</h2>
          <div className="text-xs opacity-70">{totalCount}</div>
        </div>

        <form className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center" action="/flashcards" method="get">
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
            <option value="group">{L.group}</option>
            <option value="public">{L.public}</option>
          </select>
          <button
            type="submit"
            className="w-full whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto"
          >
            {L.filterBtn}
          </button>

          {q || scope !== "all" ? (
            <Link href="/flashcards" className="w-full whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 text-center text-sm hover:bg-white/5 sm:w-auto">
              {L.reset}
            </Link>
          ) : null}
        </form>

        {setsErr ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            {L.loadError} <span className="opacity-80">({setsErr})</span>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4">
          {scope === "all" || scope === "private" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.private} subtitle={L.subtitlePrivate} count={priv.length} tone="private" />
              {priv.length ? (
                <FolderBlocks locale={locale} sets={priv} rootLabel={rootLabel} openLabel={L.open} />
              ) : (
                <div className="text-sm opacity-70">{L.emptyPrivate}</div>
              )}
            </div>
          ) : null}

          {scope === "all" || scope === "group" ? (
            <div className="grid gap-3">
              <SectionHeader title="Partagés (Groupes)" subtitle={L.subtitleGroup} count={grp.length} tone="group" />
              {grp.length ? (
                <FolderBlocks locale={locale} sets={grp} rootLabel={rootLabel} openLabel={L.open} />
              ) : (
                <div className="text-sm opacity-70">{L.emptyGroup}</div>
              )}
            </div>
          ) : null}

          {scope === "all" || scope === "public" ? (
            <div className="grid gap-3">
              <SectionHeader title={L.public} subtitle={L.subtitlePublic} count={pub.length} tone="public" />
              {pub.length ? (
                <FolderBlocks locale={locale} sets={pub} rootLabel={rootLabel} openLabel={L.open} />
              ) : (
                <div className="text-sm opacity-70">{L.emptyPublic}</div>
              )}
            </div>
          ) : null}

          {totalCount === 0 && !setsErr ? <div className="text-sm opacity-70">{L.nothingFound}</div> : null}
        </div>
      </div>
    </div>
  );
}