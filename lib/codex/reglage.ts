// Le réglage du jour d'un joueur : le temps qu'il se donne (« J'ai 30 min »),
// les quêtes écartées par « Une autre idée ? » (pour la journée seulement) et
// les capacités de la base déjà vues (le rattrapage, V3 §1.9).
// En base : les colonnes v3 de codex_joueur (migration_codex_v3.sql §2), lues
// par une requête À PART (COLONNES_V3) : la lecture principale
// (COLONNES_JOUEUR) ne change pas, une colonne absente ne lui coûte rien.
// Sans elles : le compte (user_metadata.rl_codex_jour et rl_codex).
// Module neutre et pur.

import type { Budget, Capacite, Capacites } from "@/lib/codex/types";

/** La lecture principale de codex_joueur : inchangée depuis migration_codex.sql. */
export const COLONNES_JOUEUR = "premier_calcul,dernier_calcul";
/** Les colonnes v3 (§2), lues à part. */
export const COLONNES_V3 = "budget_min,budget_jour,ecartees,capacites_vues";

export const BUDGETS: readonly Budget[] = [15, 30, 60, 90];
export const estBudget = (b: unknown): b is Budget => typeof b === "number" && (BUDGETS as readonly number[]).includes(b);

/** Les quêtes écartées d'une journée : 30 au plus (la base refuse au-delà). */
export const MAX_ECARTEES = 30;

export const CAPACITES_VIDE: Capacites = { fil: false, mesures: false, seances: false, revoir: false, maitrise: false, trophees: false, debrief: false, ratures_seches: false, journal: 2 };

export type ReglageJour = {
  /** le budget choisi CE jour-là (null : pas choisi, le défaut s'applique) */
  budget: Budget | null;
  /** les quêtes écartées ce jour-là (ids) */
  ecartees: string[];
  /** les capacités vues au dernier calcul écrit (null : jamais) */
  capacitesVues: Partial<Capacites> | null;
  /** où ce réglage s'écrit : la base (§2 collée) ou le compte */
  ou: "base" | "compte";
};

type LigneV3 = { budget_min?: number | null; budget_jour?: string | null; ecartees?: unknown; capacites_vues?: unknown };

const ids = (x: unknown): string[] => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string" && i.length <= 120).slice(0, MAX_ECARTEES) : []);

/** Les quêtes écartées si elles datent de ce jour ({jour, ids}). */
function ecarteesDu(x: unknown, jour: string): string[] {
  const o = x as { jour?: unknown; ids?: unknown } | null;
  return o && typeof o === "object" && o.jour === jour ? ids(o.ids) : [];
}

function capacitesDe(x: unknown): Partial<Capacites> | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const out: Partial<Capacites> = {};
  for (const k of Object.keys(CAPACITES_VIDE) as (Capacite | "journal")[]) {
    if (k === "journal") {
      if (o.journal === 2 || o.journal === 3) out.journal = o.journal;
    } else if (typeof o[k] === "boolean") out[k] = o[k] as boolean;
  }
  return out;
}

/**
 * Les capacités de la base rendues par codex_mesures_v3 (V3 §1.8) ; une clé
 * absente ou mal formée vaut « ne sait pas » (fonction absente : CAPACITES_VIDE).
 */
export function lireCapacites(x: unknown): Capacites {
  return { ...CAPACITES_VIDE, ...(capacitesDe(x) ?? {}) };
}

/**
 * Le réglage du jour, d'après la lecture à part des colonnes v3 :
 * `absente` (colonnes ou table absentes : §2 pas collée) → le compte ;
 * sinon la ligne (null : pas encore de ligne, rien de réglé).
 */
export function reglageDe(lu: { ligne: LigneV3 | null; absente: boolean }, meta: unknown, jour: string): ReglageJour {
  if (lu.absente) return reglageDuCompte(meta, jour);
  const l = lu.ligne;
  const budget = l && estBudget(l.budget_min) && String(l.budget_jour ?? "").slice(0, 10) === jour ? l.budget_min : null;
  return { budget, ecartees: ecarteesDu(l?.ecartees, jour), capacitesVues: capacitesDe(l?.capacites_vues), ou: "base" };
}

/** Le repli sans §2 : user_metadata.rl_codex_jour = { jour, budget, ecartees } et rl_codex.capacites_vues. */
export function reglageDuCompte(meta: unknown, jour: string): ReglageJour {
  const m = (meta ?? {}) as { rl_codex_jour?: { jour?: unknown; budget?: unknown; ecartees?: unknown }; rl_codex?: { capacites_vues?: unknown } };
  const j = m.rl_codex_jour && typeof m.rl_codex_jour === "object" && m.rl_codex_jour.jour === jour ? m.rl_codex_jour : null;
  return { budget: j && estBudget(j.budget) ? j.budget : null, ecartees: ids(j?.ecartees), capacitesVues: capacitesDe(m.rl_codex?.capacites_vues), ou: "compte" };
}

/** Le réglage du jour une fois la quête écartée (sans doublon, les plus anciennes tombent au-delà de 30). */
export function ecarter(r: ReglageJour, queteId: string): string[] {
  return [...r.ecartees.filter((x) => x !== queteId), queteId].slice(-MAX_ECARTEES);
}

/**
 * Le budget par défaut : la médiane des questions des 7 derniers jours actifs,
 * à 1,2 minute la question, ramenée au budget le plus proche (30 sans
 * historique ; à égale distance, le plus court).
 */
export function budgetParDefaut(questionsParJour7: number[]): Budget {
  const n = questionsParJour7.filter((x) => x > 0).slice(-7).sort((a, b) => a - b);
  if (!n.length) return 30;
  const mediane = n.length % 2 ? n[(n.length - 1) / 2] : (n[n.length / 2 - 1] + n[n.length / 2]) / 2;
  const minutes = mediane * 1.2;
  return BUDGETS.reduce((m, b) => (Math.abs(b - minutes) < Math.abs(m - minutes) ? b : m), BUDGETS[0]);
}

/**
 * Les questions des 7 derniers jours actifs, du plus ancien au plus récent
 * (mesure « jours » de codex_lire). `avant` : seulement les jours d'avant
 * celui-ci (aujourd'hui) : le budget par défaut ne bouge pas dans la journée,
 * la séance du jour non plus.
 */
export function questionsDes7Jours(jours: { jour: string; n: number }[] | undefined, avant?: string): number[] {
  return [...(jours ?? [])].filter((j) => j.n > 0 && (!avant || String(j.jour).slice(0, 10) < avant)).sort((a, b) => a.jour.localeCompare(b.jour)).slice(-7).map((j) => j.n);
}
