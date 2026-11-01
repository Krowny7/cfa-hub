// « En ce moment dans le lobby » et le personnage du vainqueur : les lectures
// (serveur). Rien ne lève jamais : une source qui manque (pas de clé admin,
// migration absente) masque sa ligne, jamais la page.
//
// - Copies dans l'heure et faits du fil : les classements du jour (les 30 et
//   les 5), visibles de tous les joueurs connectés (getDailyBoard, avec la
//   session du joueur : la RPC la demande).
// - Joueurs en ligne : user_presence (migration_presence.sql), client admin,
//   seulement ceux qui montrent leur présence et dont le signal a moins de
//   2 min 30 : le compte exact, et les 40 plus récents avec leur pseudo et leur
//   photo (profiles.username, profiles.avatar_url) pour les petits visages.
//   Tes amis (friendships, avec ta session) passent devant dans la rangée ; toi,
//   tu y es toujours (modele-direct.ts : joueursDe).
// - Duels en cours : duels acceptés, ni réglés ni expirés (asynchrones : 48 h
//   pour jouer). Duels gagnés dans l'heure : le gagnant et l'instant, pas la
//   matière (la table n'en a pas).
// - Présence masquée : un joueur qui la masque n'apparaît ni dans le décompte
//   ni dans le fil (sauf à lui-même).
// Ce qui vient du client admin est le même pour tous les joueurs : il est gardé
// 60 s (unstable_cache ; le client du joueur n'entre jamais dans un cache
// partagé). Ce qui dépend du joueur (« Tu viens de rendre ta copie ») se
// calcule après (modele-direct.ts).

import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { displayName } from "@/components/classement/format";
import { podiumDe } from "@/components/classement/data";
import { getDailyBoard, parisDay, shiftDay, type DailyBoard } from "@/lib/daily";
import { EN_LIGNE_SECONDES } from "@/lib/presence";
import { CANDIDATS_MAX, FENETRE_MS, JOUEURS_LUS, candidatsDe, directDe, persoDe, type CopieBrute, type DirectBrut, type JoueurBrut, type VictoireBrute } from "./modele-direct";
import type { CtxLecture, EnDirectLobby, PersoVainqueur } from "./types";

/** Combien de lignes on demande à un classement (les copies de l'heure y sont, sauf jour de très grande affluence). */
const LIMITE_CLASSEMENT = 200;
/** On garde un peu plus d'une heure : la partie admin vit 60 s, la fenêtre exacte se refait pour chaque joueur. */
const GARDE_MS = FENETRE_MS + 10 * 60 * 1000;
/** Combien de duels gagnés on relit au plus. */
const VICTOIRES_MAX = 12;

/** Ce qu'il faut pour lire la carte. */
export type SourceDirect = { sb: SupabaseClient; admin: SupabaseClient | null; jour: string; now: Date };

/** Les copies rendues récemment d'un classement (seulement les lignes du classement, pas « ma ligne » à part). */
function copiesDe(planche: DailyBoard | null, format: "trente" | "cinq", depuis: number): CopieBrute[] {
  if (!planche || !planche.exists) return [];
  const out: CopieBrute[] = [];
  for (const r of planche.rows) {
    const t = Date.parse(r.finishedAt);
    if (!Number.isFinite(t) || t <= depuis || !(r.total > 0)) continue;
    out.push({ userId: r.userId, nom: displayName(r.username, r.userId), score: r.score, total: r.total, finishedAt: r.finishedAt, format });
  }
  return out;
}

/** Les profils (pseudo, photo) de ces joueurs, dans l'ordre donné. Un profil illisible laisse le joueur sans photo, nommé par son identifiant court. */
async function nommer(admin: SupabaseClient, ids: string[]): Promise<JoueurBrut[]> {
  if (ids.length === 0) return [];
  const profils = new Map<string, { username: string | null; avatar_url: string | null }>();
  try {
    const { data } = await admin.from("profiles").select("id, username, avatar_url").in("id", ids);
    for (const p of (Array.isArray(data) ? data : []) as { id: string; username: string | null; avatar_url: string | null }[]) profils.set(p.id, p);
  } catch {
    // profils illisibles : des visages sans photo
  }
  return ids.map((id) => ({ id, nom: displayName(profils.get(id)?.username, id), avatarUrl: profils.get(id)?.avatar_url ?? null }));
}

/**
 * Les joueurs en ligne : le signal de présence est récent et le joueur montre sa
 * présence. Le compte exact, et les JOUEURS_LUS plus récents avec leur profil.
 * Null si la table manque.
 */
async function lireEnLigne(admin: SupabaseClient, now: Date): Promise<{ nombre: number; joueurs: JoueurBrut[] } | null> {
  try {
    const depuis = new Date(now.getTime() - EN_LIGNE_SECONDES * 1000).toISOString();
    const { data, count, error } = await admin
      .from("user_presence")
      .select("user_id", { count: "exact" })
      .eq("visible", true)
      .gt("last_seen_at", depuis)
      .order("last_seen_at", { ascending: false })
      .limit(JOUEURS_LUS);
    if (error) return null;
    const ids = [...new Set((Array.isArray(data) ? (data as { user_id: string | null }[]) : []).map((r) => r.user_id).filter((id): id is string => typeof id === "string" && id.length > 0))];
    return { nombre: count ?? ids.length, joueurs: await nommer(admin, ids) };
  } catch {
    return null;
  }
}

/** Les identifiants des amis de ce joueur (ses amitiés acceptées, lues avec sa session). [] si la lecture échoue : personne ne passe devant. */
async function lireAmisIds(sb: SupabaseClient, moi: string): Promise<string[]> {
  try {
    const { data, error } = await sb.from("friendships").select("requester,addressee").eq("status", "accepted").or(`requester.eq.${moi},addressee.eq.${moi}`).limit(500);
    if (error || !Array.isArray(data)) return [];
    return (data as { requester: string; addressee: string }[]).map((r) => (r.requester === moi ? r.addressee : r.requester));
  } catch {
    return [];
  }
}

/** Les duels en cours : acceptés, pas réglés, pas expirés. Null si la table manque. */
async function compterDuels(admin: SupabaseClient, now: Date): Promise<number | null> {
  try {
    const { count, error } = await admin.from("duels").select("id", { count: "exact", head: true }).eq("status", "active").gt("expires_at", now.toISOString());
    return error ? null : (count ?? null);
  } catch {
    return null;
  }
}

/** Les duels gagnés dans l'heure : le gagnant (avec son pseudo) et l'instant. [] si les tables manquent. */
async function lireVictoires(admin: SupabaseClient, now: Date): Promise<VictoireBrute[]> {
  try {
    const depuis = new Date(now.getTime() - GARDE_MS).toISOString();
    const { data, error } = await admin
      .from("duels")
      .select("winner_id, finished_at")
      .eq("status", "finished")
      .not("winner_id", "is", null)
      .gt("finished_at", depuis)
      .order("finished_at", { ascending: false })
      .limit(VICTOIRES_MAX);
    if (error || !Array.isArray(data) || data.length === 0) return [];
    const lignes = data as { winner_id: string | null; finished_at: string | null }[];
    const ids = [...new Set(lignes.map((l) => l.winner_id).filter((id): id is string => typeof id === "string" && id.length > 0))];
    const { data: profils } = ids.length ? await admin.from("profiles").select("id, username").in("id", ids) : { data: [] };
    const noms = new Map<string, string | null>();
    for (const p of (profils ?? []) as { id: string; username: string | null }[]) noms.set(p.id, p.username);
    const out: VictoireBrute[] = [];
    for (const l of lignes) {
      if (!l.winner_id || !l.finished_at) continue;
      out.push({ userId: l.winner_id, nom: displayName(noms.get(l.winner_id), l.winner_id), finishedAt: l.finished_at });
    }
    return out;
  } catch {
    return [];
  }
}

/** Parmi ces joueurs, ceux qui masquent leur présence. [] si la table manque (personne ne se masque alors). */
async function lireMasques(admin: SupabaseClient, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await admin.from("user_presence").select("user_id").eq("visible", false).in("user_id", ids);
    if (error || !Array.isArray(data)) return [];
    return (data as { user_id: string }[]).map((r) => r.user_id);
  } catch {
    return [];
  }
}

/** La partie de la lecture qui vient du client admin : la même pour tous les joueurs, donc gardée 60 s. */
type PartieAdmin = { enLigne: number | null; duels: number | null; victoires: VictoireBrute[]; joueurs: JoueurBrut[] };

async function lirePartieAdmin(admin: SupabaseClient, now: Date): Promise<PartieAdmin> {
  const [enLigne, duels, victoires] = await Promise.all([lireEnLigne(admin, now), compterDuels(admin, now), lireVictoires(admin, now)]);
  return { enLigne: enLigne ? enLigne.nombre : null, duels, victoires, joueurs: enLigne ? enLigne.joueurs : [] };
}

/** La partie admin, gardée 60 s (hors d'une requête, où le cache n'existe pas, on lit sans lui). */
async function partieAdminEnCache(admin: SupabaseClient, now: Date, jour: string): Promise<PartieAdmin> {
  try {
    return await unstable_cache(() => lirePartieAdmin(admin, now), ["rl-accueil-direct-2", jour], { revalidate: 60 })();
  } catch {
    return lirePartieAdmin(admin, now);
  }
}

/** Les classements du jour déjà lus ailleurs sur la page (à 200 lignes au moins), pour ne pas les relire. */
export type ClassementsLus = { trente?: DailyBoard | null };

export type OptionsDirect = {
  /** pour les tests, qui ne tournent pas dans une requête : rien n'est gardé */
  sansCache?: boolean;
  /** le classement des 30 d'aujourd'hui, si la page l'a déjà lu avec au moins 200 lignes */
  classements?: ClassementsLus;
  /** le pseudo et la photo du joueur qui regarde (la page les a lus avec son profil) : son visage « Toi » */
  moi?: { nom: string | null; avatarUrl: string | null };
};

/**
 * Tout ce qu'il faut pour la carte, avant le regard de chaque joueur. Les
 * classements se lisent avec le client du joueur (la RPC veut sa session), le
 * reste avec le client admin. null : rien n'a pu être lu (ni classement, ni
 * chiffre) ; la carte est alors absente.
 */
export async function lireBrutDirect({ sb, admin, jour, now }: SourceDirect, options: OptionsDirect = {}): Promise<DirectBrut | null> {
  const maintenant = now.getTime();
  const depuis = maintenant - GARDE_MS;
  // dans la première heure d'un jour, les copies de la veille au soir comptent encore
  const veille = parisDay(new Date(maintenant - FENETRE_MS)) !== jour;
  const lu = options.classements?.trente;
  const vide: PartieAdmin = { enLigne: null, duels: null, victoires: [], joueurs: [] };
  const [trenteAuj, cinqAuj, trenteVeille, cinqVeille, partie] = await Promise.all([
    lu !== undefined ? Promise.resolve(lu) : getDailyBoard(sb, jour, LIMITE_CLASSEMENT, "trente"),
    getDailyBoard(sb, jour, LIMITE_CLASSEMENT, "cinq"),
    veille ? getDailyBoard(sb, shiftDay(jour, -1), LIMITE_CLASSEMENT, "trente") : Promise.resolve(null),
    veille ? getDailyBoard(sb, shiftDay(jour, -1), LIMITE_CLASSEMENT, "cinq") : Promise.resolve(null),
    admin ? (options.sansCache ? lirePartieAdmin(admin, now) : partieAdminEnCache(admin, now, jour)) : Promise.resolve(vide),
  ]);
  if (trenteAuj === null && cinqAuj === null && trenteVeille === null && cinqVeille === null && partie.enLigne === null && partie.duels === null) return null;
  const copies = [...copiesDe(trenteAuj, "trente", depuis), ...copiesDe(trenteVeille, "trente", depuis), ...copiesDe(cinqAuj, "cinq", depuis), ...copiesDe(cinqVeille, "cinq", depuis)];
  // la présence des joueurs que le fil pourrait nommer (une petite lecture, propre à cet instant)
  const recents = candidatsDe({ copies, victoires: partie.victoires }, maintenant, CANDIDATS_MAX).map((c) => c.userId);
  const masques = admin ? await lireMasques(admin, recents) : [];
  return { enLigne: partie.enLigne, duels: partie.duels, copies, victoires: partie.victoires, masques, joueurs: partie.joueurs ?? [] };
}

/**
 * La carte « En ce moment dans le lobby » de ce joueur. null : rien à montrer
 * (ou rien n'a pu être lu) ; la carte est alors absente.
 */
export async function lireEnDirect(ctx: CtxLecture, options: OptionsDirect = {}): Promise<EnDirectLobby | null> {
  try {
    // les amis se lisent en même temps que le reste (une petite requête de plus, pas d'attente de plus) ;
    // sans accès admin, il n'y a pas de liste de joueurs en ligne à trier : pas de requête
    const [brut, amis] = await Promise.all([
      lireBrutDirect({ sb: ctx.sb, admin: ctx.admin, jour: ctx.jour, now: ctx.now }, options),
      ctx.admin ? lireAmisIds(ctx.sb, ctx.user.id) : Promise.resolve([] as string[]),
    ]);
    return brut ? directDe(brut, ctx.now.getTime(), ctx.user.id, { moi: options.moi, amis }) : null;
  } catch {
    return null;
  }
}

/**
 * Le personnage de la bannière du vainqueur : celui de sa bannière composée,
 * sinon l'ancien personnage de son profil (podiumDe lit profile_style, lisible
 * par tous les joueurs connectés). null : il n'en a pas, ou migration_bannieres_perso.sql
 * n'est pas collée.
 */
export async function lirePersoVainqueur(ctx: CtxLecture, userId: string): Promise<PersoVainqueur | null> {
  try {
    const styles = await podiumDe(ctx.sb, [userId]);
    return persoDe(styles.get(userId));
  } catch {
    return null;
  }
}
