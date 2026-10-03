import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboard } from "@/lib/rating";
import { DEFAULT_ELO, rankFor } from "@/lib/ranks";
import { PageHero, CardLabel } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { PlayerRow, type PlayerLite } from "@/components/classement/PlayerRow";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { Profile, Rating } from "@/lib/types";

export const metadata = { title: "Joueurs · Ranked Lobby" };

type SearchParams = { q?: string; view?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "user_id" | "elo" | "games_played">;

// Annuaire des joueurs (espace Classement) : recherche par pseudo, filtre
// « mes groupes », badge de rang, accès au profil et bouton « Défier ». Le
// Top 10 renvoie vers le classement complet (/classement).
export default async function PeoplePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const view = (sp.view ?? "all") as "all" | "groups";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: myGroupsRaw } = await supabase.from("group_memberships").select("group_id").eq("user_id", user.id);
  const myGroupIds = [...new Set((myGroupsRaw ?? []).map((r: { group_id: string }) => r.group_id).filter(Boolean))];

  let people: ProfileRow[] = [];

  if (view === "groups") {
    if (myGroupIds.length > 0) {
      const { data: membersRaw } = await supabase.from("group_memberships").select("user_id").in("group_id", myGroupIds);
      const memberIds = [...new Set((membersRaw ?? []).map((m: { user_id: string }) => m.user_id).filter(Boolean))];
      if (memberIds.length > 0) {
        let qb = supabase.from("profiles").select("id,username,avatar_url,xp_total").in("id", memberIds).order("username", { ascending: true });
        if (q) qb = qb.ilike("username", `%${q}%`);
        const { data } = await qb;
        people = (data ?? []) as ProfileRow[];
      }
    }
  } else {
    let qb = supabase.from("profiles").select("id,username,avatar_url,xp_total").order("username", { ascending: true }).limit(200);
    // .ilike direct plutôt que .or() avec interpolation : la syntaxe .or() de
    // PostgREST interprète virgules/parenthèses comme séparateurs de clauses,
    // ce qui permettrait à une recherche malicieuse d'injecter des filtres
    // supplémentaires non voulus.
    if (q) qb = qb.ilike("username", `%${q}%`);
    const { data } = await qb;
    people = (data ?? []) as ProfileRow[];
  }

  const ids = people.map((p) => p.id);
  const admin = tryAdmin();
  const [{ data: ratingsRaw }, top] = await Promise.all([
    ids.length > 0 ? supabase.from("ratings").select("user_id,elo,games_played").in("user_id", ids) : Promise.resolve({ data: [] as RatingRow[] }),
    getLeaderboard(supabase, 10),
  ]);
  const mastery = await masteryByUser(admin, [...new Set([...ids, ...top.map((r) => r.userId)])]);

  const ratingByUser = new Map<string, RatingRow>();
  (ratingsRaw ?? []).forEach((r: RatingRow) => ratingByUser.set(r.user_id, r));

  const rows: PlayerLite[] = people.map((p) => {
    const r = ratingByUser.get(p.id);
    const xp = Number(p.xp_total ?? 0) || 0;
    return {
      id: p.id,
      name: displayName(p.username, p.id),
      avatarUrl: p.avatar_url ?? null,
      elo: r?.elo ?? DEFAULT_ELO,
      gamesPlayed: r?.games_played ?? 0,
      level: levelInfoFromXp(xp).level,
      xpTotal: xp,
      mastery: mastery.get(p.id) ?? null,
      isMe: p.id === user.id,
    };
  });

  const qs = (v: string) => `/people?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="rl-wide flex flex-col gap-8">
      <PageHero kicker="Classement" title="Joueurs">
        <Link href={qs("all")} className={"chip rl-press " + (view === "all" ? "chip-active" : "")} aria-current={view === "all" ? "page" : undefined}>
          Tous
        </Link>
        <Link href={qs("groups")} className={"chip rl-press " + (view === "groups" ? "chip-active" : "")} aria-current={view === "groups" ? "page" : undefined}>
          Mes groupes
        </Link>
      </PageHero>

      <div className="grid gap-[18px] lg:grid-cols-12 lg:items-start">
        <section className="card flex min-w-0 flex-col gap-4 p-[22px] lg:col-span-8" aria-label="Annuaire des joueurs">
          <form className="flex gap-2" action="/people" method="get" role="search">
            <input type="hidden" name="view" value={view} />
            <label htmlFor="rl-people-q" className="sr-only">
              Chercher un joueur
            </label>
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input id="rl-people-q" name="q" defaultValue={q} placeholder="Chercher un pseudo…" className="input pl-9" />
            </div>
            <button type="submit" className="btn btn-secondary shrink-0">
              Chercher
            </button>
          </form>

          {rows.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-line-2 p-6 text-center text-[14px] text-muted">
              {view === "groups" && myGroupIds.length === 0 ? (
                <>
                  Tu n&apos;es dans aucun groupe pour l&apos;instant.{" "}
                  <Link href="/moi#reglages" className="ink-link">
                    Créer ou rejoindre un groupe
                  </Link>
                </>
              ) : q ? (
                `Aucun joueur ne correspond à « ${q} ».`
              ) : (
                "Aucun joueur pour l'instant."
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {rows.map((p) => (
                <PlayerRow key={p.id} p={p} />
              ))}
            </ul>
          )}
          {view === "all" && <p className="text-[12px] text-muted">Les 200 premiers pseudos, par ordre alphabétique. Affine avec la recherche.</p>}
        </section>

        <aside className="card flex min-w-0 flex-col gap-3 p-[22px] lg:col-span-4" aria-label="Top 10">
          <CardLabel icon={<Trophy size={15} aria-hidden />} right={<Link href="/classement" className="hover:text-white">Tout voir</Link>}>
            Top 10 · Finance
          </CardLabel>
          {top.length === 0 ? (
            <p className="text-[13.5px] text-muted">Le classement se remplit au premier match.</p>
          ) : (
            <ol className="flex flex-col gap-0.5">
              {top.map((r) => {
                const rk = rankFor(r.elo, mastery.get(r.userId) ?? null, r.rank);
                const me = r.userId === user.id;
                return (
                  <li key={r.userId}>
                    <Link href={`/people/${r.userId}`} className={"rl-row flex items-center gap-3 rounded-[12px] px-2 py-2 " + (me ? "bg-surface-2" : "")}>
                      <span className="w-5 font-mono text-[12.5px] tabular-nums text-muted">{r.rank}</span>
                      <RankBadge tier={rk.tierIndex} size={24} glow={false} />
                      <span className={"min-w-0 flex-1 truncate text-[14px] " + (me ? "font-extrabold" : "font-semibold")}>{me ? "Toi" : displayName(r.username, r.userId)}</span>
                      <span className="font-mono text-[13.5px] font-semibold tabular-nums">{r.elo}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <Link href="/classement" className="btn btn-secondary rl-press mt-1">
            Voir le classement complet
          </Link>
        </aside>
      </div>
    </div>
  );
}
