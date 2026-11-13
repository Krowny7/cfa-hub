import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getLeaderboardRank, getMyRating } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { DEFAULT_ELO } from "@/lib/ranks";
import { duelsReady, getDuelSuggestions, getMyOpenDuels, getPlayerCard, refreshMyDuels } from "@/lib/duels";
import { amisDe, demandesDe, type AmiLite } from "@/lib/profil/donnees";
import { countPlayers, lastDeltaByUser, masteryByUser, panneauxDuPodium, podiumDe, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { BoardRow } from "@/components/classement/types";
import { DuelLobby, type Adversaire } from "@/components/duel/DuelLobby";
import { DuelSoon } from "@/components/duel/DuelSoon";

export const metadata = { title: "Duel · Ranked Lobby" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** la rangée de portraits : assez pour tout le monde tant qu'on est moins de dix, bornée au-delà */
const RANGEE_MAX = 24;
/** le classement lu (ta place, ce qu'une victoire te ferait gagner) */
const TOP = 50;

type PageProps = { searchParams: Promise<{ adversaire?: string | string[]; q?: string | string[] }> };
type Fiche = { id: string; username: string | null; avatarUrl: string | null; elo: number | null; gamesPlayed: number | null; place: number | null };
type Note = { elo: number; gamesPlayed: number };

const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** L'ELO de quelques joueurs (un ami hors du top 50, un joueur trouvé) : une seule lecture ; rien si elle échoue. */
async function notesDe(supabase: SupabaseClient, ids: string[]): Promise<Map<string, Note>> {
  const out = new Map<string, Note>();
  if (ids.length === 0) return out;
  try {
    const { data } = await supabase.from("ratings").select("user_id,elo,games_played").in("user_id", ids);
    for (const r of (data ?? []) as { user_id: string; elo: number; games_played: number }[]) out.set(r.user_id, { elo: r.elo, gamesPlayed: r.games_played });
  } catch {
    // sans ELO lu : celui de départ
  }
  return out;
}

/** Mes amis : en ligne d'abord, puis du plus récemment vu au plus ancien (get_presence), avec leur ELO lu en même temps ; null sans la migration. */
async function mesAmis(supabase: SupabaseClient, userId: string): Promise<{ amis: AmiLite[]; notes: Map<string, Note> } | null> {
  const mes = await amisDe(userId, supabase, 60);
  if (!mes) return null;
  const amis = mes.amis;
  const ids = amis.map((a) => a.id);
  const presence = async (): Promise<AmiLite[]> => {
    if (amis.length < 2) return amis;
    try {
      const { data, error } = await supabase.rpc("get_presence", { p_ids: ids });
      if (error) return amis;
      const age = new Map(((data ?? []) as { user_id: string; seconds_ago: number | null }[]).map((r) => [r.user_id, r.seconds_ago]));
      const rang = (id: string) => age.get(id) ?? Number.POSITIVE_INFINITY;
      return [...amis].sort((a, b) => rang(a.id) - rang(b.id));
    } catch {
      return amis;
    }
  };
  const [tries, notes] = await Promise.all([presence(), notesDe(supabase, ids)]);
  return { amis: tries, notes };
}

/** La recherche d'un joueur par pseudo (l'ancien /people?q=) : .ilike direct, jamais .or() interpolé ; l'ELO des joueurs trouvés lu tout de suite. */
async function chercher(supabase: SupabaseClient, q: string, moi: string): Promise<Fiche[]> {
  try {
    const { data } = await supabase.from("profiles").select("id,username,avatar_url").ilike("username", `%${q}%`).neq("id", moi).order("username", { ascending: true }).limit(RANGEE_MAX);
    const trouves = (data ?? []) as { id: string; username: string | null; avatar_url: string | null }[];
    const notes = await notesDe(supabase, trouves.map((p) => p.id));
    return trouves.map((p) => ({ id: p.id, username: p.username, avatarUrl: p.avatar_url, elo: notes.get(p.id)?.elo ?? null, gamesPlayed: notes.get(p.id)?.gamesPlayed ?? null, place: null }));
  } catch {
    return [];
  }
}

// /duel : le face-à-face (components/duel/DuelLobby). /duel?adversaire=<id> met ce joueur en face ;
// /duel?q=<pseudo> cherche un joueur (l'ancien /people, qui redirige ici). Les adversaires de la rangée :
// celui qu'on vise, puis (sans recherche) ceux qui t'ont lancé un défi, ceux contre qui c'est à toi de
// jouer, tes amis, les suggestions du serveur, et les autres joueurs classés, du plus proche de ton ELO
// au plus loin : l'action à l'encre dit d'abord ce qui presse. Chacun avec sa vraie bannière du podium
// (style du profil, maîtrise, dernier match, place ; le volet des bannières composées). Trois vagues de
// lectures (les duels, puis tout le reste, puis les bannières), une quatrième seulement pour un volet ;
// chaque lecture dégrade proprement.
export default async function DuelLobbyPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const sp = await searchParams;
  const raw = premier(sp.adversaire);
  const targetId = raw && UUID_RE.test(raw) && raw !== user.id ? raw : null;
  const q = (premier(sp.q) ?? "").trim().slice(0, 40);

  if (!(await duelsReady(supabase))) return <DuelSoon />;

  // Règle d'abord les duels arrivés à échéance (pas de tâche planifiée)
  await refreshMyDuels(supabase);

  const admin = tryAdmin();
  const [me, suggestions, open, target, leaderboard, profilRes, topics, mesAmisRes, demandes, trouves] = await Promise.all([
    getMyRating(supabase, user.id),
    getDuelSuggestions(supabase, 6),
    getMyOpenDuels(supabase, user.id),
    targetId ? getPlayerCard(supabase, targetId) : Promise.resolve(null),
    getLeaderboard(supabase, TOP),
    supabase.from("profiles").select("username,avatar_url").eq("id", user.id).maybeSingle(),
    getTopicMastery(supabase, user.id),
    mesAmis(supabase, user.id),
    demandesDe(supabase, user.id),
    q ? chercher(supabase, q, user.id) : Promise.resolve(null),
  ]);
  const amis = mesAmisRes?.amis ?? null;
  // le classement lu est complet (moins de TOP joueurs) : ta place et le nombre de joueurs s'y lisent
  const complet = leaderboard.length < TOP;

  // les fiches connues de chacun (classement, suggestions, cible, amis, recherche)
  const fiches = new Map<string, Fiche>();
  const ajoute = (f: Fiche) => {
    const d = fiches.get(f.id);
    fiches.set(
      f.id,
      d
        ? { id: f.id, username: f.username ?? d.username, avatarUrl: f.avatarUrl ?? d.avatarUrl, elo: f.elo ?? d.elo, gamesPlayed: f.gamesPlayed ?? d.gamesPlayed, place: f.place ?? d.place }
        : f,
    );
  };
  for (const r of leaderboard) ajoute({ id: r.userId, username: r.username, avatarUrl: r.avatarUrl, elo: r.elo, gamesPlayed: r.gamesPlayed, place: r.rank });
  for (const c of [...suggestions, ...(target ? [target] : [])]) ajoute({ id: c.userId, username: c.username, avatarUrl: c.avatarUrl, elo: c.elo, gamesPlayed: c.gamesPlayed, place: null });
  for (const a of amis ?? []) {
    const n = mesAmisRes?.notes.get(a.id);
    ajoute({ id: a.id, username: a.name, avatarUrl: a.avatarUrl, elo: n?.elo ?? null, gamesPlayed: n?.gamesPlayed ?? null, place: null });
  }
  for (const f of trouves ?? []) ajoute(f);
  // ceux de tes duels en cours (un défi reçu d'un joueur hors du top 50) : le nom et l'ELO que le duel connaît
  for (const d of open) if (d.opponentId && !fiches.has(d.opponentId)) ajoute({ id: d.opponentId, username: d.opponentName, avatarUrl: null, elo: d.opponentElo, gamesPlayed: null, place: null });

  // l'ordre de la rangée : ce qui presse d'abord (les défis reçus, puis les duels où c'est à toi), puis les amis, les suggestions, les plus proches
  const amiIds = new Set((amis ?? []).map((a) => a.id));
  const proches = leaderboard.filter((r) => r.userId !== user.id).sort((a, b) => Math.abs(a.elo - me.elo) - Math.abs(b.elo - me.elo));
  const defisRecus = open.filter((d) => d.incoming && d.status === "pending" && d.opponentId).map((d) => d.opponentId!);
  const aToi = open.filter((d) => d.status === "active" && !d.myFinished && d.opponentId).map((d) => d.opponentId!);
  const ordre = [
    ...(target ? [target.userId] : []),
    ...(trouves && trouves.length > 0
      ? trouves.map((f) => f.id)
      : [...defisRecus, ...aToi, ...(amis ?? []).map((a) => a.id), ...suggestions.map((c) => c.userId), ...proches.map((r) => r.userId)]),
  ];
  const ids = [...new Set(ordre)].filter((id) => id !== user.id && fiches.has(id)).slice(0, RANGEE_MAX);
  // personne de visé et rien qui presse : si le premier n'a qu'un duel à « Voir », le premier joueur sans duel ouvert passe
  // devant (l'encre reste « Défier X »)
  const seulementAVoir = (id: string) => {
    const siens = open.filter((d) => d.opponentId === id);
    return siens.length > 0 && siens.every((d) => d.myFinished && !(d.incoming && d.status === "pending"));
  };
  if (!target && !(trouves && trouves.length > 0) && ids.length > 1 && seulementAVoir(ids[0])) {
    const libre = ids.findIndex((id) => !open.some((d) => d.opponentId === id));
    if (libre > 0) ids.unshift(...ids.splice(libre, 1));
  }

  // les bannières : style du profil, maîtrise, dernier match (pour toi et la rangée) ; ta place et le total, s'ils ne se lisent pas déjà
  const tous = [user.id, ...ids];
  const [masteries, deltas, podium, myRank, total] = await Promise.all([
    masteryByUser(admin, tous),
    lastDeltaByUser(admin, tous),
    podiumDe(supabase, tous),
    leaderboard.find((r) => r.userId === user.id)?.rank ?? (complet ? null : getLeaderboardRank(supabase, user.id, me.elo)),
    complet ? leaderboard.length : countPlayers(supabase),
  ]);

  const ligne = (id: string, nom: string | null, avatarUrl: string | null, elo: number, jouees: number, place: number | null, mastery: number | null): BoardRow => ({
    userId: id,
    name: displayName(nom, id),
    avatarUrl,
    elo,
    gamesPlayed: jouees,
    // pas classé : une place lointaine (rankFor ne lui donne pas le Top 10)
    rank: place ?? 9999,
    mastery,
    lastDelta: deltas.get(id) ?? null,
    isMe: id === user.id,
    ...(podium.get(id) ?? {}),
  });

  const profil = profilRes.data as { username: string | null; avatar_url: string | null } | null;
  const moi = ligne(user.id, profil?.username ?? null, profil?.avatar_url ?? null, me.elo, me.gamesPlayed, myRank, programMastery(topics));
  const joueurs: Adversaire[] = ids.map((id) => {
    const f = fiches.get(id)!;
    // la place : celle du classement (top 50) ; au-delà, ou jamais joué, rien dans le coin
    const place = f.place ?? null;
    return { r: ligne(id, f.username, f.avatarUrl, f.elo ?? DEFAULT_ELO, f.gamesPlayed ?? 0, place, masteries.get(id) ?? null), place, ami: amiIds.has(id) };
  });

  // le panneau de gauche des bannières composées (il sort au survol) : toi et tous ceux de la rangée qui en ont une (peu tant qu'on est moins de dix)
  const panneaux = await panneauxDuPodium(supabase, admin, [moi, ...joueurs.map((j) => j.r)]);
  const avecPanneau = (r: BoardRow): BoardRow => (panneaux.has(r.userId) ? { ...r, panneau: panneaux.get(r.userId) } : r);

  return (
    <DuelLobby
      moi={avecPanneau(moi)}
      place={myRank}
      total={total}
      classement={leaderboard.map((r) => ({ userId: r.userId, elo: r.elo, gamesPlayed: r.gamesPlayed }))}
      joueurs={joueurs.map((j) => ({ ...j, r: avecPanneau(j.r) }))}
      open={open}
      nowIso={new Date().toISOString()}
      q={q}
      trouves={trouves ? trouves.length : null}
      demandes={demandes}
      amis={amis}
    />
  );
}
