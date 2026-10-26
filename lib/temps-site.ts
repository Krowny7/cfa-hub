// Le temps passé sur le site (migration_temps_site.sql) : la tuile « Temps
// sur le site » de Moi (components/moi/TuileTemps) et celle du profil
// (components/profil/blocs/Temps). Deux parts, gardées à part en base :
// - estimée : le passé, d'après les traces horodatées (réponses, séances,
//   examens blancs, défis…), calculé une fois par
//   scripts/temps/estimer-historique.mjs ; c'est un minimum ;
// - mesurée : le compteur exact depuis sa mise en ligne
//   (components/temps/CompteurTemps → ajouter_temps).
// Ici : les réglages du compteur, la lecture des totaux (temps_site_resume :
// jamais le détail par jour d'un autre joueur) et « depuis quand ».
// Module neutre (client et serveur) : le client Supabase est passé.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Sans action (clavier, souris, toucher, défilement) depuis 2 min : l'onglet n'est plus actif (sauf un cours qui joue). */
export const TEMPS_INACTIF_MS = 120_000;
/**
 * La lecture d'une fiche ou d'un cours en PDF (une iframe) : on n'y voit ni
 * le défilement ni la souris ; tant que le focus y reste, l'onglet compte
 * comme actif jusqu'à 10 min après la dernière action vue.
 */
export const TEMPS_INACTIF_IFRAME_MS = 600_000;
/** Un envoi du temps cumulé toutes les minutes (et quand l'onglet se cache ou se ferme). */
export const TEMPS_ENVOI_MS = 60_000;
/** Un envoi compte au plus 2 min (la base borne aussi). */
export const TEMPS_MAX_ENVOI = 120;

/** Les totaux d'un joueur, en secondes ; les jours en AAAA-MM-JJ (Paris). */
export type ResumeTemps = {
  mesurees: number;
  estimees: number;
  total: number;
  /** le premier jour compté (estimé ou mesuré) ; null : rien encore */
  premierJour: string | null;
  /** le premier jour mesuré par le compteur ; null : rien de mesuré encore */
  premierMesure: string | null;
  /** les 7 derniers jours, aujourd'hui compris */
  semaine: number;
  /** le jour de l'inscription (profiles.created_at) */
  inscription: string | null;
};

/** La table ou la fonction n'existe pas encore (migration pas collée). */
export function tempsIndisponible(e: { code?: string; message?: string } | null | undefined): boolean {
  return !!e && (["PGRST202", "PGRST205", "42883", "42P01"].includes(e.code ?? "") || /could not find the (function|table)|does not exist/i.test(e.message ?? ""));
}

const jour = (x: unknown): string | null => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : null);
const entier = (x: unknown) => {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/**
 * Le total d'un joueur en secondes, pour la carte de rang de son profil (vue
 * par tous, comme l'ELO : demande de l'utilisateur), lu avec le client admin
 * (la RLS ne montre ses lignes qu'au joueur). null : migration absente ou
 * lecture en échec. Côté serveur. Ne lève jamais.
 */
export async function totalTempsSite(admin: SupabaseClient, id: string): Promise<number | null> {
  try {
    const { data, error } = await admin.from("temps_site").select("secondes_mesurees,secondes_estimees").eq("user_id", id);
    if (error) return null;
    return (data ?? []).reduce((s: number, r: { secondes_mesurees: number | null; secondes_estimees: number | null }) => s + entier(r.secondes_mesurees) + entier(r.secondes_estimees), 0);
  } catch {
    return null;
  }
}

/**
 * Les totaux d'un joueur (temps_site_resume). null : la migration manque, la
 * lecture a échoué, ou c'est un autre joueur qui n'a pas posé la tuile.
 * Ne lève jamais.
 */
export async function lireTempsSite(sb: SupabaseClient, id: string): Promise<ResumeTemps | null> {
  try {
    const { data, error } = await sb.rpc("temps_site_resume", { p_user: id });
    const r = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : null;
    if (error || !r) return null;
    const mesurees = entier(r.mesurees);
    const estimees = entier(r.estimees);
    return {
      mesurees,
      estimees,
      total: mesurees + estimees,
      premierJour: jour(r.premier_jour),
      premierMesure: jour(r.premier_mesure),
      semaine: entier(r.semaine),
      inscription: jour(r.inscription),
    };
  } catch {
    return null;
  }
}

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
/** Le jour de Paris d'un instant (AAAA-MM-JJ). */
export const jourParisDe = (ms: number = Date.now()) => JOUR_PARIS.format(new Date(ms));

/** Une part du total est-elle estimée (au moins une minute) ? */
export const enPartieEstime = (t: ResumeTemps) => t.estimees >= 60;

/**
 * Depuis quand court le total : une part estimée remonte à l'inscription (le
 * plus tôt de l'inscription et du premier jour compté) ; sinon, le premier
 * jour mesuré. `inscription` : le jour est celui de l'inscription.
 */
export function depuisQuand(t: ResumeTemps): { jour: string; inscription: boolean } | null {
  if (enPartieEstime(t)) {
    const j = [t.inscription, t.premierJour].filter((x): x is string => !!x).sort()[0] ?? null;
    return j ? { jour: j, inscription: !!t.inscription && j === t.inscription } : null;
  }
  const j = t.premierMesure ?? t.premierJour;
  return j ? { jour: j, inscription: false } : null;
}
