// La série d'encre : un bonus d'XP pour les jours d'affilée (migration_serie_encre.sql).
// Un jour compte à partir de 10 questions répondues (jour de Paris) ; la série à
// la veille donne le palier du jour : 3 jours ×1,5, 7 jours et plus ×2. Un joker
// par semaine couvre un jour manqué. Le bonus ne touche que l'XP, et c'est la
// base qui l'applique (trigger sur xp_events) : le site ne fait que l'afficher.
//
// Sans la migration, `lireSerieEncre` rend null et rien de neuf n'est affiché
// (la série en « jours d'encre » de l'Accueil reste ce qu'elle était).
// Module neutre (ni « use client » ni serveur) : le chargement prend le client
// Supabase qu'on lui passe ; `multDuJour` garde le palier en mémoire, par jour.
import type { SupabaseClient } from "@supabase/supabase-js";

export const SEUIL_JOUR = 10;
export type Palier = 1 | 1.5 | 2;

export type SerieEncre = {
  /** jour de Paris du statut, « AAAA-MM-JJ » */
  jour: string;
  /** jours d'affilée à la veille (définitifs) */
  serie: number;
  /** questions répondues aujourd'hui */
  aujourdhui: number;
  /** aujourd'hui compte déjà (10 questions ou plus) */
  fait: boolean;
  /** la série d'aujourd'hui compris s'il est fait */
  serieAffichee: number;
  /** le palier du jour, appliqué dès la première question */
  mult: Palier;
  /** le joker de la semaine est encore là */
  joker: boolean;
  /** hier était un jour manqué couvert par le joker : un second manqué casserait la série */
  veilleSauvee: boolean;
  /** premier jour de la série en cours */
  debut: string | null;
  meilleure: number;
  seuil: number;
};

/** Le palier d'une série (de la veille). */
export function palierDe(serie: number): Palier {
  return serie >= 7 ? 2 : serie >= 3 ? 1.5 : 1;
}

const nb = (v: unknown, defaut = 0) => (typeof v === "number" && Number.isFinite(v) ? v : defaut);

/** Lit la réponse de serie_encre_statut ; null si elle n'a pas la forme attendue. */
export function lireStatut(raw: unknown): SerieEncre | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.jour !== "string" || typeof r.serie !== "number") return null;
  const serie = Math.max(0, Math.floor(nb(r.serie)));
  const seuil = Math.max(1, Math.floor(nb(r.seuil, SEUIL_JOUR)));
  const aujourdhui = Math.max(0, Math.floor(nb(r.aujourdhui)));
  const fait = typeof r.fait === "boolean" ? r.fait : aujourdhui >= seuil;
  const m = nb(r.mult, 1);
  return {
    jour: r.jour.slice(0, 10),
    serie,
    aujourdhui,
    fait,
    serieAffichee: Math.max(serie, Math.floor(nb(r.serie_affichee, serie + (fait ? 1 : 0)))),
    mult: m >= 2 ? 2 : m >= 1.5 ? 1.5 : 1,
    joker: r.joker !== false,
    veilleSauvee: r.veille_sauvee === true,
    debut: typeof r.debut === "string" ? r.debut.slice(0, 10) : null,
    meilleure: Math.max(0, Math.floor(nb(r.meilleure))),
    seuil,
  };
}

/** serie_encre_statut du joueur connecté ; null sans la migration, hors connexion ou en cas d'erreur. */
export async function lireSerieEncre(supabase: SupabaseClient): Promise<SerieEncre | null> {
  try {
    const { data, error } = await supabase.rpc("serie_encre_statut");
    if (error) return null;
    return lireStatut(Array.isArray(data) ? data[0] : data);
  } catch {
    return null;
  }
}

/** La meilleure série d'un joueur (get_serie_meilleure) ; null sans la migration ou sans série. */
export async function lireMeilleureSerie(supabase: SupabaseClient, id: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc("get_serie_meilleure", { p_ids: [id] });
    if (error || !Array.isArray(data)) return null;
    const n = Number((data as { user_id?: string; meilleure?: number }[]).find((x) => x.user_id === id)?.meilleure ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

/**
 * Recale le statut sur le nombre de questions de l'anneau de l'Accueil
 * (la même mesure que la base, lue au même moment) : « fait » et la série
 * d'aujourd'hui suivent ce que le joueur voit.
 */
export function avecAnneau(s: SerieEncre, repondues: number): SerieEncre {
  const aujourdhui = Math.max(repondues, 0);
  const fait = aujourdhui >= s.seuil;
  const serieAffichee = s.serie + (fait ? 1 : 0);
  return { ...s, aujourdhui, fait, serieAffichee, meilleure: Math.max(s.meilleure, serieAffichee) };
}

/** L'XP réelle d'un gain de base (arrondi 0,5 vers le haut, comme la base). */
export function xpAvecSerie(base: number, mult: number): number {
  return mult > 1 ? Math.round(base * mult + 1e-9) : base;
}

/** « ×1,5 » · « ×2 » · « » (×1 : rien). */
export function libelleMult(mult: number): string {
  return mult >= 2 ? "×2" : mult > 1 ? "×1,5" : "";
}

/** « +24 XP (×2) » ; sans bonus, « +12 XP ». */
export function texteGain(xp: number, mult: number): string {
  const m = libelleMult(mult);
  return `+${xp} XP${m ? ` (${m})` : ""}`;
}

const JOUR = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const HM = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Minutes qu'il reste avant minuit, à Paris. */
export function minutesAvantMinuit(now: Date = new Date()): number {
  const p = HM.formatToParts(now);
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0) % 24;
  const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return Math.max(0, 24 * 60 - (h * 60 + m));
}

// ---------------------------------------------------------------------------
// Le palier du jour, gardé en mémoire (il ne change qu'à minuit) : les écrans
// de réponses l'attendent d'avance, pour montrer « +24 XP (×2) » sans délai.

let memo: { jour: string; p: Promise<Palier> } | null = null;

/** Le palier d'aujourd'hui (1 sans la migration ou en cas d'erreur). Une seule lecture par jour et par page. */
export function multDuJour(supabase: SupabaseClient): Promise<Palier> {
  const jour = JOUR.format(new Date());
  if (memo && memo.jour === jour) return memo.p;
  const p = lireSerieEncre(supabase).then((s) => (s ? s.mult : (1 as Palier)));
  memo = { jour, p };
  // une lecture sans palier ne reste pas longtemps en mémoire : la prochaine réponse réessaie
  void p.then((m) => {
    if (m === 1) setTimeout(() => (memo?.p === p ? (memo = null) : undefined), 15_000);
  });
  return p;
}
