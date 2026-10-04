import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboard } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import type { PlayerLite } from "@/components/classement/PlayerRow";
import { PeopleView, type TopRow } from "@/components/classement/PeopleView";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { Profile, Rating } from "@/lib/types";
import { amisDe, demandesDe } from "@/lib/profil/donnees";

export const metadata = { title: "Joueurs · Ranked Lobby" };

type SearchParams = { q?: string; view?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "user_id" | "elo" | "games_played">;

// Annuaire des joueurs (espace Classement) : recherche par pseudo, filtre
// « mes groupes » ou « mes amis » (avec les demandes reçues et envoyées),
// badge de rang, accès au profil et bouton « Défier ». Le
// Top 10 renvoie vers le classement complet (/classement). Affichage :
// components/classement/PeopleView.
export default async function PeoplePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const view: "all" | "groups" | "amis" = sp.view === "groups" ? "groups" : sp.view === "amis" ? "amis" : "all";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: myGroupsRaw } = await supabase.from("group_memberships").select("group_id").eq("user_id", user.id);
  const myGroupIds = [...new Set((myGroupsRaw ?? []).map((r: { group_id: string }) => r.group_id).filter(Boolean))];

  let people: ProfileRow[] = [];
  // les demandes d'ami (reçues, envoyées) ; null tant que la migration manque
  const demandes = await demandesDe(supabase, user.id);

  if (view === "amis") {
    const mes = await amisDe(user.id, supabase, 500);
    const ids = (mes?.amis ?? []).map((a) => a.id);
    if (ids.length > 0) {
      let qb = supabase.from("profiles").select("id,username,avatar_url,xp_total").in("id", ids).order("username", { ascending: true });
      if (q) qb = qb.ilike("username", `%${q}%`);
      const { data } = await qb;
      people = (data ?? []) as ProfileRow[];
    }
  } else if (view === "groups") {
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

  const topRows: TopRow[] = top.map((r) => ({
    userId: r.userId,
    name: displayName(r.username, r.userId),
    elo: r.elo,
    rank: r.rank,
    mastery: mastery.get(r.userId) ?? null,
    isMe: r.userId === user.id,
  }));

  return <PeopleView rows={rows} top={topRows} view={view} q={q} hasGroups={myGroupIds.length > 0} demandes={demandes} />;
}
