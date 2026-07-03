import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { levelInfoFromXp } from "@/lib/leveling";
import type { Profile, Rating } from "@/lib/types";

type SearchParams = { q?: string; view?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "user_id" | "elo" | "games_played">;

function shortId(id: string) {
  return id ? id.split("-")[0] : "";
}

export default async function PeoplePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const view = (sp.view ?? "all") as "all" | "groups";

  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: myGroupsRaw } = await supabase
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", user.id);

  const myGroupIds = [
    ...new Set(
      (myGroupsRaw ?? [])
        .map((r: { group_id: string }) => r.group_id)
        .filter(Boolean)
    ),
  ];

  let people: ProfileRow[] = [];

  if (view === "groups") {
    if (myGroupIds.length > 0) {
      const { data: membersRaw } = await supabase
        .from("group_memberships")
        .select("user_id")
        .in("group_id", myGroupIds);

      const memberIds = [
        ...new Set(
          (membersRaw ?? [])
            .map((m: { user_id: string }) => m.user_id)
            .filter(Boolean)
        ),
      ];

      if (memberIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id,username,avatar_url,xp_total")
          .in("id", memberIds)
          .order("username", { ascending: true });
        people = (data ?? []) as ProfileRow[];
      }
    }
  } else {
    let queryBuilder = supabase
      .from("profiles")
      .select("id,username,avatar_url,xp_total")
      .order("username", { ascending: true })
      .limit(200);

    // .ilike direct plutôt que .or() avec interpolation : la syntaxe .or() de
    // PostgREST interprète virgules/parenthèses comme séparateurs de clauses,
    // ce qui permettrait à une recherche malicieuse d'injecter des filtres
    // supplémentaires non voulus.
    if (q) queryBuilder = queryBuilder.ilike("username", `%${q}%`);

    const { data } = await queryBuilder;
    people = (data ?? []) as ProfileRow[];
  }

  const peopleIds = people.map((p) => p.id);
  const ratingByUser = new Map<string, RatingRow>();

  // Deux requêtes indépendantes (ratings des personnes affichées + top 20
  // classement) -> parallélisées plutôt qu'enchaînées séquentiellement.
  const [{ data: ratingsRaw }, { data: topRatingsRaw }] = await Promise.all([
    peopleIds.length > 0
      ? supabase.from("ratings").select("user_id,elo,games_played").in("user_id", peopleIds)
      : Promise.resolve({ data: [] as RatingRow[] }),
    supabase.from("ratings").select("user_id,elo,games_played").order("elo", { ascending: false }).limit(20),
  ]);

  (ratingsRaw ?? []).forEach((r: RatingRow) => {
    ratingByUser.set(r.user_id, r);
  });

  const topUserIds = (topRatingsRaw ?? [])
    .map((r: RatingRow) => r.user_id)
    .filter(Boolean);

  const { data: topProfilesRaw } =
    topUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id,username,avatar_url,xp_total")
          .in("id", topUserIds)
      : { data: [] as ProfileRow[] };

  const topProfileById = new Map<string, ProfileRow>();
  (topProfilesRaw ?? []).forEach((p: ProfileRow) => topProfileById.set(p.id, p));

  const leaderboard = (topRatingsRaw ?? []).map((r: RatingRow) => {
    const p = topProfileById.get(r.user_id);
    return {
      user_id: r.user_id,
      username: p?.username ?? shortId(r.user_id),
      avatar_url: p?.avatar_url ?? null,
      xp_total: Number(p?.xp_total ?? 0) || 0,
      elo: r.elo ?? 1200,
      games_played: r.games_played ?? 0,
    };
  });

  return (
    <div className="grid gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t(locale, "people.title")}</h1>
        <p className="mt-1 text-sm text-white/60">{t(locale, "people.subtitle")}</p>
      </div>

      {/* Two-column: directory + leaderboard */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        {/* Directory */}
        <div className="card p-5">
          {/* View toggle + search */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Link
              href={`/people?view=all${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                view === "all"
                  ? "border-white/15 bg-white/[0.10] text-white"
                  : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.06]"
              }`}
            >
              {t(locale, "people.all")}
            </Link>
            <Link
              href={`/people?view=groups${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                view === "groups"
                  ? "border-white/15 bg-white/[0.10] text-white"
                  : "border-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.06]"
              }`}
            >
              {t(locale, "people.myGroups")}
            </Link>
          </div>

          <form className="flex gap-2 mb-4" action="/people" method="get">
            <input type="hidden" name="view" value={view} />
            <input
              name="q"
              defaultValue={q}
              placeholder={t(locale, "people.searchPlaceholder")}
              className="input flex-1"
            />
            <button type="submit" className="btn btn-secondary whitespace-nowrap">
              {t(locale, "common.filter")}
            </button>
          </form>

          <div className="grid gap-2">
            {people.length === 0 ? (
              <div className="text-sm opacity-60">{t(locale, "people.notFound")}</div>
            ) : (
              people.map((p) => {
                const rating = ratingByUser.get(p.id);
                const elo = rating?.elo ?? 1200;
                const games = rating?.games_played ?? 0;
                const xpTotal = Number(p.xp_total ?? 0) || 0;
                const lvl = levelInfoFromXp(xpTotal).level;
                const display = p.username || shortId(p.id);

                return (
                  <Link
                    key={p.id}
                    href={`/people/${p.id}`}
                    className={`card-soft flex items-center gap-3 p-3 transition hover:bg-white/[0.06] ${
                      p.id === user.id ? "bg-white/[0.06]" : ""
                    }`}
                  >
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="avatar" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">
                        {display.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {display}{" "}
                        <span className="text-muted">{shortId(p.id)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-white/50">
                        {t(locale, "common.levelN", { n: lvl })} · {xpTotal} XP · Elo {elo} ·{" "}
                        {t(locale, "common.gamesN", { n: games })}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="mt-3 text-xs text-muted">{t(locale, "people.limitNote")}</div>
        </div>

        {/* Leaderboard */}
        <aside className="card p-5">
          <div className="mb-1 text-sm font-semibold">{t(locale, "people.eloRanking")}</div>
          <div className="mb-4 text-xs text-white/55">{t(locale, "people.top20")}</div>

          <div className="grid gap-1.5">
            {leaderboard.length === 0 ? (
              <div className="text-sm opacity-60">{t(locale, "people.noRanking")}</div>
            ) : (
              leaderboard.map((row, idx) => (
                <Link
                  key={row.user_id}
                  href={`/people/${row.user_id}`}
                  className={`card-soft flex items-center justify-between px-3 py-2.5 transition hover:bg-white/[0.06] ${
                    row.user_id === user.id ? "bg-white/[0.06]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                    <div className="w-6 shrink-0 text-xs text-muted text-right">{idx + 1}</div>
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="avatar" className="h-7 w-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px]">
                        {String(row.username).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{row.username}</div>
                      <div className="text-[11px] text-muted">
                        {t(locale, "common.levelN", { n: levelInfoFromXp(row.xp_total).level })}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold">{row.elo}</div>
                </Link>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
