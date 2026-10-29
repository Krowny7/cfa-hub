// Session ciblée de calculs (/calculs/session) : la logique pure. Les
// réglages (matières, nombre de questions, difficulté ou mélange de
// niveaux), la répartition par niveau à l'arrondi juste, l'ajustement quand
// le vivier est trop court, le tirage sans doublon, et la lecture / l'écriture
// des réglages (adresse de la page, localStorage).
//
// Module neutre (ni « use client » ni serveur, aucun catalogue importé) :
// l'écran s'en sert pour afficher la répartition en direct, l'action serveur
// pour tirer (lib/calc/session-draw.ts). Testé par scripts/calc/test-session.ts.

import { shuffle, type CalcQuestionPublic } from "./engine";
import { CALC_LEVELS, type CalcLevel, type CalcTopic } from "./types";

export const SESSION_MIN = 5;
export const SESSION_MAX = 50;
export const SESSION_DEFAUT = 10;
/** Les nombres de questions proposés : 5, 10, 15 … 50. */
export const SESSION_COUNTS: number[] = Array.from({ length: SESSION_MAX / SESSION_MIN }, (_, i) => SESSION_MIN * (i + 1));

/** Une valeur par niveau : des pourcentages (somme 100) ou des nombres de questions. */
export type ParNiveau = Record<CalcLevel, number>;

export const MIX_DEFAUT: ParNiveau = { facile: 50, moyen: 30, difficile: 20 };

/** Les préréglages du mélange (50/30/20, 34/33/33, 20/30/50). */
export const MIX_PRESETS: { key: string; label: string; mix: ParNiveau }[] = [
  { key: "progressif", label: "Progressif", mix: { facile: 50, moyen: 30, difficile: 20 } },
  { key: "equilibre", label: "Équilibré", mix: { facile: 34, moyen: 33, difficile: 33 } },
  { key: "exigeant", label: "Exigeant", mix: { facile: 20, moyen: 30, difficile: 50 } },
];

/** Un niveau seul (100 %), ou un mélange réglable. */
export type Difficulte = { kind: "niveau"; level: CalcLevel } | { kind: "melange"; mix: ParNiveau };

/** Les réglages d'une session ; `matieres` : adresses (slugs) des matières retenues. */
export type SessionConfig = { matieres: string[]; count: number; diff: Difficulte };

const sum = (p: ParNiveau) => CALC_LEVELS.reduce((s, l) => s + p[l], 0);
const clampInt = (x: unknown, min: number, max: number, repli: number) => {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : repli;
};

// ---------------------------------------------------------------------------
// Répartition

/**
 * Répartit `total` entre des poids entiers, à la plus forte part restante
 * (méthode de Hamilton) : la somme fait toujours `total`, et un poids nul ne
 * reçoit jamais rien. Égalité : le poids le plus lourd, puis le premier.
 */
export function apportion(total: number, weights: number[]): number[] {
  const w = weights.map((x) => Math.max(0, Math.round(x)));
  const s = w.reduce((a, b) => a + b, 0);
  const t = Math.max(0, Math.round(total));
  if (t === 0 || s === 0) return w.map(() => 0);
  const out = w.map((x) => Math.floor((x * t) / s));
  let reste = t - out.reduce((a, b) => a + b, 0);
  const ordre = w.map((x, i) => ({ i, x, r: (x * t) % s })).sort((a, b) => b.r - a.r || b.x - a.x || a.i - b.i);
  for (const o of ordre) {
    if (reste <= 0) break;
    if (o.r === 0) break;
    out[o.i] += 1;
    reste -= 1;
  }
  return out;
}

/** Un mélange en pourcentages entiers dont la somme fait 100 (somme nulle : le mélange par défaut). */
export function normalizeMix(m: Partial<Record<CalcLevel, unknown>> | null | undefined): ParNiveau {
  const w = CALC_LEVELS.map((l) => clampInt(m?.[l], 0, 100, 0));
  if (w.reduce((a, b) => a + b, 0) === 0) return { ...MIX_DEFAUT };
  const [facile, moyen, difficile] = apportion(100, w);
  return { facile, moyen, difficile };
}

/** Le mélange d'une difficulté : 100 % sur le niveau choisi, ou le mélange lui-même. */
export const mixOf = (d: Difficulte): ParNiveau =>
  d.kind === "niveau" ? { facile: 0, moyen: 0, difficile: 0, [d.level]: 100 } : d.mix;

/** Règle la part d'un niveau ; les deux autres se partagent le reste, au prorata de leur part, pour que la somme reste à 100. */
export function setMixLevel(mix: ParNiveau, level: CalcLevel, value: number): ParNiveau {
  const v = clampInt(value, 0, 100, mix[level]);
  const autres = CALC_LEVELS.filter((l) => l !== level);
  const poids = autres.map((l) => mix[l]);
  const parts = apportion(100 - v, poids.every((p) => p <= 0) ? autres.map(() => 1) : poids);
  const out = { ...mix, [level]: v } as ParNiveau;
  autres.forEach((l, i) => {
    out[l] = parts[i];
  });
  return out;
}

/** Le nombre de questions de chaque niveau pour `count` questions : arrondi juste, la somme fait `count`. */
export function splitCount(count: number, mix: ParNiveau): ParNiveau {
  const [facile, moyen, difficile] = apportion(count, CALC_LEVELS.map((l) => mix[l]));
  return { facile, moyen, difficile };
}

export type SessionPlan = {
  /** ce que les réglages demandent, niveau par niveau */
  voulu: ParNiveau;
  /** ce que la session tiendra, après ajustement au vivier */
  retenu: ParNiveau;
  total: number;
  /** niveaux dont le vivier est plus court que la demande */
  courts: CalcLevel[];
};

/**
 * Le plan d'une session : la répartition voulue, ramenée au vivier de chaque
 * niveau (`dispo`). Ce qui manque à un niveau passe aux autres niveaux
 * du mélange (jamais à un niveau que le joueur a mis à 0 %), au plus près des
 * parts demandées ; si tout est épuisé, la session est plus courte et le dit.
 */
export function planSession(count: number, mix: ParNiveau, dispo: ParNiveau): SessionPlan {
  const n = clampInt(count, 0, SESSION_MAX, SESSION_DEFAUT);
  const voulu = splitCount(n, mix);
  const retenu = { ...voulu };
  const courts: CalcLevel[] = [];
  let manque = 0;
  for (const l of CALC_LEVELS) {
    const d = Math.max(0, Math.floor(dispo[l]));
    if (retenu[l] > d) {
      manque += retenu[l] - d;
      retenu[l] = d;
      courts.push(l);
    }
  }
  while (manque > 0) {
    let meilleur: CalcLevel | null = null;
    let ecart = -Infinity;
    for (const l of CALC_LEVELS) {
      if (mix[l] <= 0 || retenu[l] >= dispo[l]) continue;
      const e = (n * mix[l]) / 100 - retenu[l];
      if (e > ecart) {
        meilleur = l;
        ecart = e;
      }
    }
    if (!meilleur) break;
    retenu[meilleur] += 1;
    manque -= 1;
  }
  return { voulu, retenu, total: sum(retenu), courts };
}

// ---------------------------------------------------------------------------
// Tirage

/**
 * Tire `k` éléments distincts en les répartissant au mieux entre les groupes
 * (les types de calcul) : un tour par groupe, dans un ordre mêlé à chaque tour,
 * jusqu'à `k` ; un type ne revient qu'une fois les autres passés. Jamais de doublon.
 */
export function pickSpread<T>(groups: T[][], k: number, rand: () => number = Math.random): T[] {
  const gs = groups.filter((g) => g.length > 0).map((g) => shuffle(g, rand));
  const out: T[] = [];
  for (let tour = 0; out.length < k; tour++) {
    const pris = shuffle(
      gs.filter((g) => tour < g.length),
      rand,
    );
    if (!pris.length) break;
    for (const g of pris) {
      if (out.length >= k) break;
      out.push(g[tour]);
    }
  }
  return out;
}

/** Mêle une liste en évitant, quand c'est possible, deux voisins du même groupe (même type de calcul). */
export function melanger<T>(list: T[], groupe: (x: T) => string, rand: () => number = Math.random): T[] {
  const a = shuffle(list, rand);
  for (let i = 1; i < a.length; i++) {
    const avant = groupe(a[i - 1]);
    if (groupe(a[i]) !== avant) continue;
    const k = a.findIndex((x, m) => m > i && groupe(x) !== avant);
    if (k >= 0) [a[i], a[k]] = [a[k], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Ce que le serveur renvoie d'une session (sans réponse, sans correction)

/** Une question de la session : l'énoncé public et le type dont elle vient. */
export type SessionItem = { topic: CalcTopic; typeKey: string; q: CalcQuestionPublic };

/** Le rappel et le nom d'un type de calcul présent dans la session. */
export type SessionTypeInfo = {
  topic: CalcTopic;
  typeKey: string;
  name: string;
  /** nom court de la matière */
  subject: string;
  formulas: string[];
  traps: string[];
};

export const sessionTypeKey = (topic: string, typeKey: string) => `${topic}|${typeKey}`;

// ---------------------------------------------------------------------------
// Réglages : valeurs par défaut, lecture et écriture (adresse, localStorage)

export function defaultConfig(allSlugs: string[]): SessionConfig {
  return { matieres: [...allSlugs], count: SESSION_DEFAUT, diff: { kind: "melange", mix: { ...MIX_DEFAUT } } };
}

/** Plus proche des nombres proposés (5, 10 … 50). */
export function snapCount(x: unknown): number {
  const n = clampInt(x, SESSION_MIN, SESSION_MAX, SESSION_DEFAUT);
  return SESSION_COUNTS.reduce((best, c) => (Math.abs(c - n) < Math.abs(best - n) ? c : best), SESSION_COUNTS[0]);
}

/** « facile » | « moyen » | « difficile » | « 50-30-20 » */
export function parseDiff(s: unknown): Difficulte | null {
  if (typeof s !== "string") return null;
  if ((CALC_LEVELS as string[]).includes(s)) return { kind: "niveau", level: s as CalcLevel };
  const m = /^(\d{1,3})-(\d{1,3})-(\d{1,3})$/.exec(s);
  return m ? { kind: "melange", mix: normalizeMix({ facile: Number(m[1]), moyen: Number(m[2]), difficile: Number(m[3]) }) } : null;
}

export const diffToString = (d: Difficulte) => (d.kind === "niveau" ? d.level : `${d.mix.facile}-${d.mix.moyen}-${d.mix.difficile}`);

/** « toutes » | « quant,fsa » → les slugs connus (au moins un) ; null si rien d'exploitable. */
function parseMatieres(s: unknown, valid: string[]): string[] | null {
  if (typeof s !== "string" || !s) return null;
  if (s === "toutes") return [...valid];
  const keep = s.split(",").filter((x, i, a) => valid.includes(x) && a.indexOf(x) === i);
  return keep.length ? valid.filter((v) => keep.includes(v)) : null;
}

/** Les réglages lus dans l'adresse (?matieres=…&n=…&diff=…) ; null si l'adresse n'en porte aucun. Le reste vient des valeurs par défaut. */
export function configFromParams(get: (k: string) => string | null | undefined, validSlugs: string[]): SessionConfig | null {
  const m = parseMatieres(get("matieres"), validSlugs);
  const n = get("n");
  const d = parseDiff(get("diff"));
  if (!m && !n && !d) return null;
  const base = defaultConfig(validSlugs);
  return { matieres: m ?? base.matieres, count: n ? snapCount(n) : base.count, diff: d ?? base.diff };
}

/** Les paramètres d'adresse qui relancent la même session. */
export function configToParams(c: SessionConfig, validSlugs: string[]): Record<string, string> {
  const toutes = validSlugs.length > 0 && validSlugs.every((s) => c.matieres.includes(s));
  return { matieres: toutes ? "toutes" : validSlugs.filter((s) => c.matieres.includes(s)).join(","), n: String(c.count), diff: diffToString(c.diff) };
}

/** Les réglages gardés en localStorage (JSON inconnu : vérifié champ par champ). */
export function configFromStored(raw: unknown, validSlugs: string[]): SessionConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const texte = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);
  const matieres = Array.isArray(o.matieres) ? o.matieres.filter((x): x is string => typeof x === "string").join(",") : null;
  return configFromParams((k) => (k === "matieres" ? matieres : k === "n" ? texte(o.count) : texte(o.diff)), validSlugs);
}

/** Les réglages à garder en localStorage. */
export const configToStored = (c: SessionConfig, validSlugs: string[]) => {
  const p = configToParams(c, validSlugs);
  return { matieres: p.matieres === "toutes" ? validSlugs : p.matieres.split(",").filter(Boolean), count: c.count, diff: p.diff };
};
