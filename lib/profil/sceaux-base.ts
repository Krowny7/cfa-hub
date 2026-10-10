import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS, TOP_TIER, rankFor } from "@/lib/ranks";
import { jourParis } from "@/lib/objectif";
import type { ProfilStats } from "@/lib/profil/catalogue";
import type { MentionDuel } from "@/components/adn/Sceau";
import { paliersMesures, sceauxDe, type DatePalier, type EtatSceau, type MesuresBase, type Palier, type Rarete, type SceauGarde } from "@/lib/profil/sceaux";

// Les Sceaux gardés en base (migration_profil_sceaux.sql), côté serveur :
// - les mesures des 6 sceaux de la base (mentions de duel, Coup d'éclat,
//   Mise au propre), lues avec le client admin, en cache jusqu'au calcul
//   suivant (10 min au plus) ;
// - l'attribution : les paliers du jour (seuils de lib/profil/sceaux.ts)
//   envoyés à rl_sceaux_attribuer, qui ne fait que monter. À la lecture d'un
//   profil, au plus toutes les 10 min (sceaux_calculs) ; en fin de session
//   (sceauxAFeter), sur des mesures fraîches, au plus toutes les 30 s ;
// - la rareté, en cache 1 h.
// Les dates ne quittent ce module qu'au jour de Paris : jamais l'heure.
// Sans la migration (table ou fonction absente), ou sans client admin : null
// partout, et le profil garde les sceaux dérivés de l'étape 1, sans erreur.
// Module serveur.

/** Le recalcul à la lecture d'un profil : au plus toutes les 10 min. */
const CALCUL_MS = 10 * 60_000;
/** Le recalcul de fin de session : au plus toutes les 30 s (l'action peut être appelée en boucle). */
const FETE_MS = 30_000;
/** Coup d'éclat : les candidats « Top 10 » vérifiés au plus (les plus hauts ELO d'abord). */
const CANDIDATS_TOP = 5;

function admin(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** La migration n'est pas collée (table, colonne ou fonction absente). */
export function baseAbsente(e: { code?: string; message?: string } | null | undefined): boolean {
  return !!e && (["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(e.code ?? "") || /could not find|does not exist/i.test(e.message ?? ""));
}

type LigneSceau = { cle: string; palier: number; dates: string[] | null; retro: boolean; vu: boolean };
/** Une ligne de la table : les dates ramenées au jour de Paris (« avant le » se lit avant, à l'instant près). */
function garde(r: LigneSceau): SceauGarde {
  const instants = (r.dates ?? []).map((d) => new Date(d).getTime());
  return {
    cle: r.cle,
    palier: Math.max(1, Math.min(3, Number(r.palier) || 1)) as Palier,
    dates: instants.map((t): DatePalier => ({ iso: jourParis(t), avant: !!r.retro && t === instants[0] })),
    retro: !!r.retro,
    vu: !!r.vu,
  };
}

/** Les sceaux gardés d'un joueur ; null si la base n'est pas prête (ou au moindre souci). */
async function lireGardes(sb: SupabaseClient, id: string): Promise<SceauGarde[] | null> {
  try {
    const { data, error } = await sb.from("sceaux").select("cle,palier,dates,retro,vu").eq("user_id", id);
    if (error) return null;
    return ((data ?? []) as LigneSceau[]).map(garde);
  } catch {
    return null;
  }
}

/** La date du dernier calcul (ms), null : jamais calculé. */
async function dernierCalcul(sb: SupabaseClient, id: string): Promise<number | null> {
  try {
    const { data } = await sb.from("sceaux_calculs").select("calcule_le").eq("user_id", id).maybeSingle();
    const t = Date.parse((data as { calcule_le?: string } | null)?.calcule_le ?? "");
    return Number.isNaN(t) ? null : t;
  } catch {
    return null;
  }
}

/**
 * Coup d'éclat : le meilleur écart battu en duel. Le palier de chacun se lit
 * à l'ELO d'avant le duel (sans verrou de maîtrise, inconnue à l'époque) :
 * 1 ou 2 paliers au-dessus ; 3 si l'adversaire était dans le Top 10 (ELO de
 * Grand Maître et place 10 ou mieux à ce moment, rl_place_au).
 */
async function coupDeclat(sb: SupabaseClient, id: string): Promise<number> {
  const { data, error } = await sb
    .from("duels")
    .select("challenger_id,opponent_id,challenger_elo_before,opponent_elo_before,finished_at")
    .eq("winner_id", id)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(1000);
  if (error || !data) return 0;
  type Ligne = { challenger_id: string; opponent_id: string | null; challenger_elo_before: number | null; opponent_elo_before: number | null; finished_at: string };
  let meilleur = 0;
  const candidats: { moi: number; lui: number; autre: string; le: string }[] = [];
  for (const d of data as Ligne[]) {
    const mien = d.challenger_id === id;
    const moi = mien ? d.challenger_elo_before : d.opponent_elo_before;
    const lui = mien ? d.opponent_elo_before : d.challenger_elo_before;
    const autre = mien ? d.opponent_id : d.challenger_id;
    if (moi === null || lui === null || !autre) continue;
    meilleur = Math.max(meilleur, Math.min(2, rankFor(lui).tierIndex - rankFor(moi).tierIndex));
    if (lui >= TIERS[TOP_TIER].min) candidats.push({ moi, lui, autre, le: d.finished_at });
  }
  candidats.sort((a, b) => b.lui - a.lui);
  const top10 = await Promise.all(
    candidats.slice(0, CANDIDATS_TOP).map(async (c) => {
      const { data: place, error: e } = await sb.rpc("rl_place_au", { p_elo: c.lui, p_moment: c.le, p_exclus: [id, c.autre] });
      if (e) return false;
      // les deux joueurs sont exclus du compte : le vainqueur passe devant s'il était plus haut
      const rang = Number(place) + (c.moi > c.lui ? 1 : 0);
      return rankFor(c.lui, null, rang).tierIndex === TOP_TIER;
    }),
  );
  return top10.some(Boolean) ? 3 : Math.max(0, meilleur);
}

/** Les mesures des 6 sceaux de la base ; une erreur (duel_mentions absente) est levée. */
async function mesurer(sb: SupabaseClient, id: string): Promise<MesuresBase> {
  const [mentions, rayees, coup] = await Promise.all([
    sb.from("duel_mentions").select("mention").eq("user_id", id).limit(5000),
    // rayées par une bonne réponse en reprise (ratures.rayee_le) : un retrait à la main ne compte pas
    sb.from("ratures").select("question_id", { count: "exact", head: true }).eq("user_id", id).not("rayee_le", "is", null),
    coupDeclat(sb, id).catch(() => 0),
  ]);
  if (mentions.error) throw new Error(mentions.error.message);
  const compte: Partial<Record<MentionDuel, number>> = {};
  for (const r of (mentions.data ?? []) as { mention: MentionDuel }[]) compte[r.mention] = (compte[r.mention] ?? 0) + 1;
  return { mentions: compte, coupDeclat: coup, rayees: rayees.error ? 0 : (rayees.count ?? 0) };
}

/**
 * Les mesures, en cache par joueur jusqu'à son calcul suivant (`calcul`, la
 * date du dernier : un recalcul de fin de session change la clé), 10 min au
 * plus ; un échec n'est pas mis en cache. null : indisponibles.
 */
async function mesuresBase(id: string, calcul: number | null): Promise<MesuresBase | null> {
  try {
    return await unstable_cache(
      async () => {
        const sb = admin();
        if (!sb) throw new Error("admin indisponible");
        return mesurer(sb, id);
      },
      ["rl-sceaux-mesures", id, String(calcul ?? 0)],
      { revalidate: CALCUL_MS / 1000 },
    )();
  } catch {
    return null;
  }
}

/** Attribue les paliers du jour ; renvoie tous les sceaux gardés du joueur (null : échec). */
async function attribuer(sb: SupabaseClient, id: string, paliers: Record<string, number>): Promise<SceauGarde[] | null> {
  try {
    const { data, error } = await sb.rpc("rl_sceaux_attribuer", { p_user: id, p_paliers: paliers });
    if (error || !Array.isArray(data)) return null;
    return (data as LigneSceau[]).map(garde);
  } catch {
    return null;
  }
}

/** La rareté, en cache 1 h (une erreur n'est pas mise en cache). */
const rareteEnCache = unstable_cache(
  async (): Promise<Rarete> => {
    const sb = admin();
    if (!sb) throw new Error("admin indisponible");
    const { data, error } = await sb.rpc("rl_sceaux_rarete");
    if (error || !data) throw new Error(error?.message ?? "rareté indisponible");
    const brut = data as { actifs: number; paliers: { cle: string; palier: number; n: number }[] };
    const paliers: Rarete["paliers"] = {};
    for (const p of brut.paliers ?? []) {
      const t = (paliers[p.cle] ??= [0, 0, 0]);
      if (p.palier >= 1 && p.palier <= 3) t[p.palier - 1] = Number(p.n) || 0;
    }
    return { actifs: Number(brut.actifs) || 0, paliers };
  },
  ["rl-sceaux-rarete"],
  { revalidate: 3600 },
);

async function rarete(): Promise<Rarete | null> {
  try {
    return await rareteEnCache();
  } catch {
    return null;
  }
}

export type SceauxJoueur = {
  /** les sceaux à montrer (16 dérivés sans la base, 22 avec) */
  etats: EtatSceau[];
  /** la base est prête (sceaux gardés, pins, mentions) */
  base: boolean;
  /** les sceaux gardés (null sans la base) */
  gardes: SceauGarde[] | null;
};

/**
 * Les sceaux d'un joueur. Avec la base : les paliers gardés, recalculés et
 * attribués si le dernier calcul a plus de 10 min, leurs dates (au jour) et
 * leur rareté. Sans elle : les sceaux dérivés de l'étape 1. `avancee` :
 * l'avancée des 6 sceaux de la base est montrée (son propre profil) ; sinon
 * leurs mesures ne se lisent que si l'attribution est due.
 */
export async function sceauxDuJoueur(id: string, stats: ProfilStats, { avancee = true }: { avancee?: boolean } = {}): Promise<SceauxJoueur> {
  const a = admin();
  if (!a) return { etats: sceauxDe(stats), base: false, gardes: null };
  const [gardes, calcul] = await Promise.all([lireGardes(a, id), dernierCalcul(a, id)]);
  if (gardes === null) return { etats: sceauxDe(stats), base: false, gardes: null };
  const due = calcul === null || Date.now() - calcul > CALCUL_MS;
  const [mesures, r] = await Promise.all([avancee || due ? mesuresBase(id, calcul) : Promise.resolve(null), rarete()]);
  let g = gardes;
  if (mesures && due) g = (await attribuer(a, id, paliersMesures(stats, mesures))) ?? gardes;
  return { etats: sceauxDe(stats, { mesures, gardes: g, rarete: r }), base: true, gardes: g };
}

/**
 * Fin de session : recalcule tout de suite, sur des mesures fraîches (au
 * plus toutes les 30 s), et rend les sceaux gardés ; null sans la base.
 * `stats` n'est lu que si le recalcul a lieu.
 */
export async function recalculerSceaux(id: string, stats: () => Promise<ProfilStats>): Promise<SceauGarde[] | null> {
  const a = admin();
  if (!a) return null;
  const [gardes, calcul] = await Promise.all([lireGardes(a, id), dernierCalcul(a, id)]);
  if (gardes === null || (calcul !== null && Date.now() - calcul < FETE_MS)) return gardes;
  let mesures: MesuresBase;
  try {
    mesures = await mesurer(a, id);
  } catch {
    return gardes;
  }
  return (await attribuer(a, id, paliersMesures(await stats(), mesures))) ?? gardes;
}

/** Marque des sceaux comme fêtés (la cérémonie a été jouée). */
export async function marquerVus(id: string, cles: string[]): Promise<boolean> {
  const a = admin();
  if (!a || !cles.length) return false;
  try {
    const { error } = await a.rpc("rl_sceaux_vus", { p_user: id, p_cles: cles.slice(0, 40) });
    return !error;
  } catch {
    return false;
  }
}
