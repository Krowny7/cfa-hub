import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";

type Profile = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

type Rating = {
  user_id: string;
  elo?: number | null;
  games_played?: number | null;
};

type SearchParams = {
  q?: string;
  view?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function shortId(id: string) {
  return id ? id.split("-")[0] : "";
}

export default async function PeoplePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const view = ((sp.view ?? "all") as "all" | "groups");

  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const title = t(locale, "nav.people");
  const subtitle =
    locale === "fr"
      ? "Annuaire global + classement ELO."
      : "Global directory + ELO leaderboard.";

  // -----------------------------
  // 1) Fetch group ids of current user
  // -----------------------------
  const { data: myGroupsRaw } = await supabase
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", user.id);

  const myGroupIds = uniq((myGroupsRaw ?? []).map((r: any) => r.group_id).filter(Boolean));

  // -----------------------------
  // 2) Fetch profiles (ALL) with search, OR group-only list
  // -----------------------------
  let people: Profile[] = [];

  if (view === "groups") {
    // members of any of my groups (dedup)
    if (myGroupIds.length > 0) {
      const { data: membersRaw } = await supabase
        .from("group_memberships")
        .select("user_id")
        .in("group_id", myGroupIds);

      const memberIds = uniq((membersRaw ?? []).map((m: any) => m.user_id).filter(Boolean));

      if (memberIds.length > 0) {
        const profilesRes = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", memberIds)
          .order("username", { ascending: true });

        people = (profilesRes.data ?? []) as any;
      }
    }
  } else {
    // ALL PROFILES (limit for scalability)
    let queryBuilder = supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .order("username", { ascending: true })
      .limit(200);

    if (q) {
      queryBuilder = queryBuilder.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
    }

    const profilesRes = await queryBuilder;
    people = (profilesRes.data ?? []) as any;
  }

  const peopleIds = people.map((p) => p.id);

  // -----------------------------
  // 3) Fetch ratings for people list (elo + games)
  // -----------------------------
  const ratingByUser = new Map<string, Rating>();

  if (peopleIds.length > 0) {
    const { data: ratingsRaw } = await supabase
      .from("ratings")
      .select("user_id,elo,games_played")
      .in("user_id", peopleIds);

    (ratingsRaw ?? []).forEach((r: any) => {
      ratingByUser.set(r.user_id, {
        user_id: r.user_id,
        elo: r.elo ?? null,
        games_played: r.games_played ?? null
      });
    });
  }

  // -----------------------------
  // 4) Leaderboard (Top 20)
  // -----------------------------
  const { data: topRatingsRaw } = await supabase
    .from("ratings")
    .select("user_id,elo,games_played")
    .order("elo", { ascending: false })
    .limit(20);

  const topUserIds = (topRatingsRaw ?? []).map((r: any) => r.user_id).filter(Boolean);

  const { data: topProfilesRaw } =
    topUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", topUserIds)
      : { data: [] as any[] };

  const topProfileById = new Map<string, Profile>();
  (topProfilesRaw ?? []).forEach((p: any) => topProfileById.set(p.id, p));

  const leaderboard = (topRatingsRaw ?? []).map((r: any) => {
    const p = topProfileById.get(r.user_id);
    return {
      user_id: r.user_id,
      username: p?.username ?? shortId(r.user_id),
      full_name: p?.full_name ?? null,
      avatar_url: p?.avatar_url ?? null,
      elo: r.elo ?? 1200,
      games_played: r.games_played ?? 0
    };
  });

  const isFr = locale === "fr";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-2xl border border-white/10 p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm opacity-70">{subtitle}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT: Directory */}
        <section className="rounded-2xl border border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{isFr ? "Annuaire" : "Directory"}</div>
              <div className="mt-1 text-xs opacity-70">
                {isFr ? "Recherche + filtre (Tous / Mes groupes)." : "Search + filter (All / My groups)."}
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/people?view=all${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-lg border px-3 py-2 text-sm hover:bg-white/5 ${view === "all" ? "bg-white/5" : ""}`}
              >
                {isFr ? "Tous" : "All"}
              </Link>
              <Link
                href={`/people?view=groups${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-lg border px-3 py-2 text-sm hover:bg-white/5 ${
                  view === "groups" ? "bg-white/5" : ""
                }`}
              >
                {isFr ? "Mes groupes" : "My groups"}
              </Link>
            </div>
          </div>

          {/* Search */}
          <form className="mt-4 flex gap-2" action="/people" method="get">
            <input type="hidden" name="view" value={view} />
            <input
              name="q"
              defaultValue={q}
              placeholder={isFr ? "Rechercher un profil…" : "Search a profile…"}
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5"
            >
              {isFr ? "Filtrer" : "Filter"}
            </button>
          </form>

          {/* List */}
          <div className="mt-4 grid gap-2">
            {people.length === 0 ? (
              <div className="text-sm opacity-70">{isFr ? "Aucun profil trouvé." : "No profiles found."}</div>
            ) : (
              people.map((p) => {
                const rating = ratingByUser.get(p.id);
                const elo = rating?.elo ?? 1200;
                const games = rating?.games_played ?? 0;

                const display = p.username || p.full_name || shortId(p.id);

                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border border-white/10 p-4 ${p.id === user.id ? "bg-white/5" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs">
                          {display.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {display} <span className="opacity-60">{shortId(p.id)}</span>
                        </div>
                        {p.full_name ? <div className="truncate text-xs opacity-70">{p.full_name}</div> : null}
                        <div className="mt-1 text-xs opacity-80">
                          Elo: {elo} • {games} {isFr ? "parties" : "games"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 text-xs opacity-60">
            {isFr
              ? "Note: liste limitée à 200 profils (scalable via pagination plus tard)."
              : "Note: list limited to 200 profiles (paginate later for scale)."}
          </div>
        </section>

        {/* RIGHT: Elo Leaderboard */}
        <aside className="rounded-2xl border border-white/10 p-5">
          <div className="text-sm font-semibold">{isFr ? "Classement ELO" : "ELO Ranking"}</div>
          <div className="mt-1 text-xs opacity-70">{isFr ? "Top 20 (global)." : "Top 20 (global)."}</div>

          <div className="mt-4 grid gap-2">
            {leaderboard.length === 0 ? (
              <div className="text-sm opacity-70">{isFr ? "Aucun classement." : "No ranking yet."}</div>
            ) : (
              leaderboard.map((row, idx) => (
                <div
                  key={row.user_id}
                  className={`flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 ${
                    row.user_id === user.id ? "bg-white/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 text-xs opacity-70">{idx + 1}</div>

                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="avatar" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px]">
                        {String(row.username).slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{row.username}</div>
                      <div className="text-[11px] opacity-70">
                        {row.games_played} {isFr ? "parties" : "games"}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm font-semibold">{row.elo}</div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}