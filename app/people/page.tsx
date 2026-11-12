import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { levelInfoFromXp } from "@/lib/leveling";
import { getMyRating } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import type { PlayerLite } from "@/components/classement/PlayerRow";
import { PeopleView } from "@/components/classement/PeopleView";
import { countPlayers } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { Profile, Rating } from "@/lib/types";
import { amisDe, demandesDe, type AmiLite } from "@/lib/profil/donnees";
import type { SupabaseClient } from "@supabase/supabase-js";

export const metadata = { title: "Joueurs · Ranked Lobby" };

type SearchParams = { q?: string; view?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "user_id" | "elo" | "games_played">;

// Annuaire des joueurs (espace S'affronter) : recherche par pseudo, filtre
// « mes groupes », les joueurs en carrousel (ceux à ta mesure devant), accès au
// profil ; tes amis (en ligne d'abord) et les demandes reçues dans la colonne
// grise. Affichage : components/classement/PeopleView.
// Les joueurs dont l'ELO est le plus proche du tien (hors toi, au moins une
// partie jouée) : les deux plus proches de chaque côté, les trois meilleurs
// gardés. Vide si une lecture échoue.
async function joueursAMesure(supabase: SupabaseClient, userId: string, elo: number): Promise<PlayerLite[]> {
  try {
    const base = () => supabase.from("ratings").select("user_id,elo,games_played").neq("user_id", userId).gt("games_played", 0);
    const [haut, bas] = await Promise.all([base().gte("elo", elo).order("elo", { ascending: true }).limit(3), base().lt("elo", elo).order("elo", { ascending: false }).limit(3)]);
    const voisins = [...((haut.data ?? []) as RatingRow[]), ...((bas.data ?? []) as RatingRow[])].sort((a, b) => Math.abs(a.elo - elo) - Math.abs(b.elo - elo)).slice(0, 3);
    if (voisins.length === 0) return [];
    const { data } = await supabase.from("profiles").select("id,username,avatar_url,xp_total").in("id", voisins.map((v) => v.user_id));
    const profils = new Map(((data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
    return voisins.flatMap((v) => {
      const p = profils.get(v.user_id);
      if (!p) return [];
      const xp = Number(p.xp_total ?? 0) || 0;
      return [{ id: p.id, name: displayName(p.username, p.id), avatarUrl: p.avatar_url ?? null, elo: v.elo, gamesPlayed: v.games_played, level: levelInfoFromXp(xp).level, xpTotal: xp, mastery: null, isMe: false }];
    });
  } catch {
    return [];
  }
}

/** Mes amis : en ligne d'abord, puis du plus récemment vu au plus ancien (get_presence) ; null sans la migration. */
async function mesAmis(supabase: SupabaseClient, userId: string): Promise<AmiLite[] | null> {
  const mes = await amisDe(userId, supabase, 60);
  if (!mes) return null;
  const amis = mes.amis;
  if (amis.length < 2) return amis;
  try {
    const { data, error } = await supabase.rpc("get_presence", { p_ids: amis.map((a) => a.id) });
    if (error) return amis;
    const age = new Map(((data ?? []) as { user_id: string; seconds_ago: number | null }[]).map((r) => [r.user_id, r.seconds_ago]));
    const rang = (id: string) => age.get(id) ?? Number.POSITIVE_INFINITY;
    return [...amis].sort((a, b) => rang(a.id) - rang(b.id));
  } catch {
    // présence indisponible : l'ordre des amitiés
    return amis;
  }
}

export default async function PeoplePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  // l'ancienne vue « Mes amis » (?view=amis) : les amis sont dans la colonne grise
  const view: "all" | "groups" = sp.view === "groups" ? "groups" : "all";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: myGroupsRaw } = await supabase.from("group_memberships").select("group_id").eq("user_id", user.id);
  const myGroupIds = [...new Set((myGroupsRaw ?? []).map((r: { group_id: string }) => r.group_id).filter(Boolean))];

  let people: ProfileRow[] = [];
  // les demandes d'ami (reçues, envoyées) et mes amis ; null tant que la migration manque
  const [demandes, amis] = await Promise.all([demandesDe(supabase, user.id), mesAmis(supabase, user.id)]);

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
  const [{ data: ratingsRaw }, total, mine] = await Promise.all([
    ids.length > 0 ? supabase.from("ratings").select("user_id,elo,games_played").in("user_id", ids) : Promise.resolve({ data: [] as RatingRow[] }),
    countPlayers(supabase),
    getMyRating(supabase, user.id),
  ]);
  const aTaMesure = !q && view === "all" && mine.gamesPlayed > 0 ? await joueursAMesure(supabase, user.id, mine.elo) : [];

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
      mastery: null,
      isMe: p.id === user.id,
    };
  });

  return <PeopleView rows={rows} view={view} q={q} hasGroups={myGroupIds.length > 0} demandes={demandes} total={total} aTaMesure={aTaMesure} amis={amis} />;
}
