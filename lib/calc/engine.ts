// Moteur des exercices de calcul pur (/calculs) : lecture de la saisie,
// vérification des réponses (tolérance), tirage des rounds (rotation),
// résumés de progression et format des nombres.
//
// Module neutre (ni « use client » ni serveur) : les actions serveur
// corrigent avec lui (la bonne réponse ne quitte le serveur qu'une fois la
// question répondue), les écrans s'en servent pour lire la saisie et pour
// résumer l'historique local tant que migration_calc.sql n'est pas appliquée.

import { CALC_LEVELS, type CalcLevel, type CalcQuestion, type CalcTopic, type CalcUnit } from "./types";

/** Un round : 5 questions d'un même niveau. */
export const ROUND_SIZE = 5;
/** Un niveau est « tenu » avec au moins 4 justes sur ses 5 dernières réponses. */
export const TENU_JUSTES = 4;
export const TENU_FENETRE = 5;
/** Précision récente d'un type : les 10 dernières réponses de chaque niveau. */
export const RECENT_PAR_NIVEAU = 10;
/** Écart relatif toujours accepté (0,2 %). */
export const REL_TOLERANCE = 0.002;

// ---------------------------------------------------------------------------
// Ce que le navigateur reçoit d'une question avant d'y répondre : ni la
// réponse, ni la correction, ni la tolérance.

export type CalcQuestionPublic = Pick<CalcQuestion, "id" | "level" | "prompt" | "data" | "unit" | "decimals">;

export function publicQuestion(q: CalcQuestion): CalcQuestionPublic {
  return {
    id: q.id,
    level: q.level,
    prompt: q.prompt,
    data: q.data.map((d) => ({ label: d.label, value: d.value })),
    unit: q.unit,
    decimals: q.decimals,
  };
}

// ---------------------------------------------------------------------------
// Saisie : virgule ou point, espaces, unité tapée par habitude

const MINUS = String.fromCharCode(0x2212);
const DASHES = [String.fromCharCode(0x2012), String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
// (les espaces, y compris insécables, sont retirés avec trim : voir sansEspaces)
const UNIT_TAIL = /(%|\$|€|usd|eur|bps|bp|pb|x|×|years|year|yrs|yr|ans|an)$/;
const CURRENCY_HEAD = /^(\$|€|usd|eur)/;

/** Retire toutes les espaces (fines, insécables comprises : String.trim les connaît). */
const sansEspaces = (s: string) => Array.from(s).filter((ch) => ch.trim() !== "").join("");

/**
 * Lit un nombre tapé à la main : « 8,5 », « 8.5 », « 1 234,56 »,
 * « 1,234.56 », « −3 », « 8.5 % », « $42 », « (12) ». Une seule virgule (ou
 * un seul point) est la marque décimale ; si les deux sont présents, la
 * dernière l'est. Renvoie null si ce n'est pas un nombre.
 */
export function parseCalcInput(raw: string): number | null {
  let s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  s = sansEspaces(s).split(MINUS).join("-");
  for (const d of DASHES) s = s.split(d).join("-");
  let sign = 1;
  if (s.length > 2 && s.startsWith("(") && s.endsWith(")")) {
    sign = -1;
    s = s.slice(1, -1);
  }
  s = s.replace(CURRENCY_HEAD, "");
  if (s.startsWith("-") || s.startsWith("+")) {
    if (s[0] === "-") sign = -sign;
    s = s.slice(1);
  }
  s = s.replace(CURRENCY_HEAD, "").replace(UNIT_TAIL, "");
  const commas = s.split(",").length - 1;
  const dots = s.split(".").length - 1;
  // séparateur de milliers : des groupes de 3 chiffres, sinon ce n'est pas un nombre
  const milliers = (str: string, sep: string) => {
    const parts = str.split(sep);
    return parts.length > 1 && /^[0-9]{1,3}$/.test(parts[0]) && parts.slice(1).every((p) => /^[0-9]{3}$/.test(p));
  };
  if (commas && dots) {
    const dec = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const cut = s.lastIndexOf(dec);
    const int = s.slice(0, cut);
    if (!milliers(int, dec === "," ? "." : ",")) return null;
    s = int.split(dec === "," ? "." : ",").join("") + "." + s.slice(cut + 1);
  } else if (commas > 1 || dots > 1) {
    const sep = commas > 1 ? "," : ".";
    if (!milliers(s, sep)) return null;
    s = s.split(sep).join("");
  } else if (commas === 1) {
    s = s.replace(",", ".");
  }
  if (!/^([0-9]+[.]?[0-9]*|[.][0-9]+)$/.test(s)) return null;
  const n = Number(s) * sign;
  return Number.isFinite(n) ? n : null;
}

/**
 * Les lectures possibles d'une saisie. « 16,500 » est ambigu : 16,5 à la
 * française, ou 16 500 avec la virgule des milliers des énoncés d'examen.
 * Dans ce cas, les deux lectures (la décimale d'abord) ; sinon une seule.
 */
export function parseCalcCandidates(raw: string): number[] {
  const v = parseCalcInput(raw);
  if (v === null) return [];
  const s = sansEspaces(String(raw ?? "").trim().toLowerCase())
    .replace(CURRENCY_HEAD, "")
    .replace(/^[-+]/, "")
    .replace(CURRENCY_HEAD, "")
    .replace(UNIT_TAIL, "");
  if (!/^[1-9][0-9]{0,2},[0-9]{3}$/.test(s)) return [v];
  const alt = (v < 0 ? -1 : 1) * Number(s.replace(",", ""));
  return Number.isFinite(alt) && alt !== v ? [v, alt] : [v];
}

// ---------------------------------------------------------------------------
// Vérification

/** Tolérance absolue : celle de la question, sinon une demi-unité de la dernière décimale. */
export function toleranceOf(q: Pick<CalcQuestion, "decimals" | "tolerance">): number {
  if (typeof q.tolerance === "number" && Number.isFinite(q.tolerance) && q.tolerance >= 0) return q.tolerance;
  return 0.5 * Math.pow(10, -Math.max(0, Math.round(q.decimals)));
}

/** Juste si l'écart tient dans la tolérance absolue, ou s'il fait au plus 0,2 % de la réponse. */
export function isCorrectValue(value: number, q: Pick<CalcQuestion, "answer" | "decimals" | "tolerance">): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(q.answer)) return false;
  const diff = Math.abs(value - q.answer);
  // marge d'arrondi binaire (8.535 − 8.53 n'est pas tout à fait 0.005)
  const eps = 1e-9 * Math.max(1, Math.abs(q.answer));
  return diff <= toleranceOf(q) + eps || diff <= REL_TOLERANCE * Math.abs(q.answer) + eps;
}

export type CalcStatus = "juste" | "faux" | "format";

/**
 * « format » : le calcul est bon mais l'échelle non (0,085 au lieu de 8,5 %,
 * 0,25 % au lieu de 25 bp). On le dit sans compter la réponse, sans donner
 * le résultat, et le joueur ressaisit.
 */
export function checkCalc(q: Pick<CalcQuestion, "answer" | "decimals" | "tolerance" | "unit">, value: number): { status: CalcStatus; hint?: string } {
  if (isCorrectValue(value, q)) return { status: "juste" };
  if (value !== 0 && q.answer !== 0) {
    if (q.unit === "%" && isCorrectValue(value * 100, q)) return { status: "format", hint: "Réponds en pourcentage : 8.5 pour 8,5 %." };
    if (q.unit === "bp" && (isCorrectValue(value * 100, q) || isCorrectValue(value * 10000, q)))
      return { status: "format", hint: "Réponds en points de base : 0,25 % = 25 bp." };
  }
  return { status: "faux" };
}

/**
 * Corrige une saisie brute : juste si l'une de ses lectures l'est (voir
 * parseCalcCandidates), « format » si l'une n'est fausse que d'échelle.
 * `value` : la lecture retenue. null : ce n'est pas un nombre.
 */
export function checkCalcInput(q: Pick<CalcQuestion, "answer" | "decimals" | "tolerance" | "unit">, raw: string): { status: CalcStatus; value: number; hint?: string } | null {
  const cands = parseCalcCandidates(raw);
  if (!cands.length) return null;
  for (const v of cands) if (isCorrectValue(v, q)) return { status: "juste", value: v };
  for (const v of cands) {
    const r = checkCalc(q, v);
    if (r.status === "format") return { ...r, value: v };
  }
  return { status: "faux", value: cands[0] };
}

// ---------------------------------------------------------------------------
// Nombres à la française, côté correcteur (comme les corrections et les
// explications du site) ; les données de l'énoncé restent en notation
// d'examen. Déterministe : même rendu serveur et navigateur.

const NBSP = String.fromCharCode(160);

/** « 1 234,57 », « −0,8 » */
export function nombreFr(n: number, decimals: number): string {
  const d = Math.max(0, Math.min(8, Math.round(decimals)));
  const fixed = Math.abs(n).toFixed(d);
  const neg = n < 0 && Number(fixed) !== 0;
  const [int, frac] = fixed.split(".");
  let out = "";
  for (let i = 0; i < int.length; i++) {
    if (i > 0 && (int.length - i) % 3 === 0) out += NBSP;
    out += int[i];
  }
  return (neg ? MINUS : "") + out + (frac ? "," + frac : "");
}

/** Libellé de l'unité à côté du champ. */
export const UNIT_FIELD: Record<CalcUnit, string> = { "%": "%", $: "$", x: "x", years: "ans", bp: "bp", "": "" };

/** « 8,53 % », « 42,17 $ », « 9,0x », « 2,5 ans », « 25 bp » */
export function formatCalc(n: number, unit: CalcUnit, decimals: number): string {
  const v = nombreFr(n, decimals);
  switch (unit) {
    case "%":
      return `${v}${NBSP}%`;
    case "$":
      return `${v}${NBSP}$`;
    case "x":
      return `${v}x`;
    case "years":
      return `${v}${NBSP}${Math.abs(n) < 2 ? "an" : "ans"}`;
    case "bp":
      return `${v}${NBSP}bp`;
    default:
      return v;
  }
}

/**
 * Les étapes de correction à montrer : sans la dernière ligne « Réponse : … »
 * qu'un catalogue ajoute de lui-même (l'écran affiche déjà la bonne réponse).
 */
export function correctionSteps(solution: string[]): string[] {
  const out = [...solution];
  while (out.length > 1 && /^ *Réponse *:/i.test(out[out.length - 1])) out.pop();
  return out;
}

/** Nombre de décimales d'une saisie (pour la réafficher telle quelle). */
export function decimalsOf(n: number): number {
  const s = String(n);
  if (s.includes("e")) return 6;
  const i = s.indexOf(".");
  return i < 0 ? 0 : Math.min(6, s.length - i - 1);
}

// ---------------------------------------------------------------------------
// Historique et rotation

/** Une réponse, côté base (calc_attempts) ou côté repli local. `at` en ms. */
export type CalcAttempt = {
  topic: CalcTopic;
  typeKey: string;
  questionId: string;
  level: CalcLevel;
  value: number | null;
  correct: boolean;
  at: number;
};

/** Ce que le tirage sait d'une question déjà vue. */
export type QuestionHistory = { seen: number; lastAt: number; lastCorrect: boolean };
export type HistoryMap = Record<string, QuestionHistory>;

export function historyFrom(attempts: Pick<CalcAttempt, "questionId" | "correct" | "at">[]): HistoryMap {
  const h: HistoryMap = {};
  for (const a of attempts) {
    const e = h[a.questionId];
    if (!e) h[a.questionId] = { seen: 1, lastAt: a.at, lastCorrect: a.correct };
    else {
      e.seen += 1;
      if (a.at >= e.lastAt) {
        e.lastAt = a.at;
        e.lastCorrect = a.correct;
      }
    }
  }
  return h;
}

/** Deux historiques réunis (la base et le repli local) : la réponse la plus récente l'emporte. */
export function mergeHistory(a: HistoryMap, b: HistoryMap): HistoryMap {
  const out: HistoryMap = { ...a };
  for (const [id, e] of Object.entries(b)) {
    const o = out[id];
    if (!o) out[id] = { ...e };
    else out[id] = { seen: o.seen + e.seen, lastAt: Math.max(o.lastAt, e.lastAt), lastCorrect: e.lastAt >= o.lastAt ? e.lastCorrect : o.lastCorrect };
  }
  return out;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tirage d'un round : d'abord les questions jamais vues (au hasard), puis
 * les ratées (la plus ancienne erreur d'abord), puis les réussies les plus
 * anciennes. Les 5 retenues sont ensuite mélangées. Un tri en O(n log n) :
 * prêt pour un vivier de plusieurs centaines de questions par niveau.
 */
export function pickRound(pool: string[], history: HistoryMap, n = ROUND_SIZE, rand: () => number = Math.random): string[] {
  const ids = [...new Set(pool)];
  const tie = new Map(ids.map((id) => [id, rand()] as const));
  const rank = (id: string) => {
    const h = history[id];
    return !h ? 0 : h.lastCorrect ? 2 : 1;
  };
  ids.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra > 0) {
      const d = history[a].lastAt - history[b].lastAt;
      if (d) return d;
    }
    return (tie.get(a) ?? 0) - (tie.get(b) ?? 0);
  });
  return shuffle(ids.slice(0, Math.max(0, n)), rand);
}

// ---------------------------------------------------------------------------
// Progression : niveau tenu, précision récente

export type LevelStat = {
  /** toutes les réponses du niveau */
  n: number;
  ok: number;
  /** les 10 dernières (précision récente) */
  recentN: number;
  recentOk: number;
  /** les 5 dernières (niveau tenu) */
  last5N: number;
  last5Ok: number;
  lastAt: number | null;
};

export type TypeProgress = { levels: Record<CalcLevel, LevelStat>; lastAt: number | null; lastLevel: CalcLevel | null };
/** Par clé de type */
export type TopicProgress = Record<string, TypeProgress>;
/** Par matière, puis par type */
export type AllProgress = Partial<Record<CalcTopic, TopicProgress>>;

export const emptyLevelStat = (): LevelStat => ({ n: 0, ok: 0, recentN: 0, recentOk: 0, last5N: 0, last5Ok: 0, lastAt: null });
export const emptyTypeProgress = (): TypeProgress => ({
  levels: { facile: emptyLevelStat(), moyen: emptyLevelStat(), difficile: emptyLevelStat() },
  lastAt: null,
  lastLevel: null,
});

function touch(p: TypeProgress, level: CalcLevel, at: number | null) {
  if (at !== null && (p.lastAt === null || at > p.lastAt)) {
    p.lastAt = at;
    p.lastLevel = level;
  }
}

/** Résumé à partir des réponses brutes (repli local) : même définition que calc_progress en SQL. */
export function progressFromAttempts(attempts: CalcAttempt[]): AllProgress {
  const out: AllProgress = {};
  const sorted = [...attempts].sort((a, b) => b.at - a.at);
  for (const a of sorted) {
    if (!CALC_LEVELS.includes(a.level)) continue;
    const topic = (out[a.topic] ??= {});
    const p = (topic[a.typeKey] ??= emptyTypeProgress());
    const s = p.levels[a.level];
    s.n += 1;
    if (a.correct) s.ok += 1;
    if (s.recentN < RECENT_PAR_NIVEAU) {
      s.recentN += 1;
      if (a.correct) s.recentOk += 1;
    }
    if (s.last5N < TENU_FENETRE) {
      s.last5N += 1;
      if (a.correct) s.last5Ok += 1;
    }
    if (s.lastAt === null || a.at > s.lastAt) s.lastAt = a.at;
    touch(p, a.level, a.at);
  }
  return out;
}

/** Une ligne de la fonction SQL calc_progress. */
export type CalcProgressRow = {
  topic: string;
  type_key: string;
  level: string;
  n: number;
  ok: number;
  n_recent: number;
  ok_recent: number;
  n_last5: number;
  ok_last5: number;
  last_at: string | null;
};

export function progressFromRows(rows: CalcProgressRow[]): AllProgress {
  const out: AllProgress = {};
  for (const r of rows) {
    const level = r.level as CalcLevel;
    if (!CALC_LEVELS.includes(level)) continue;
    const topic = (out[r.topic as CalcTopic] ??= {});
    const p = (topic[r.type_key] ??= emptyTypeProgress());
    const at = r.last_at ? new Date(r.last_at).getTime() : null;
    p.levels[level] = {
      n: Number(r.n) || 0,
      ok: Number(r.ok) || 0,
      recentN: Number(r.n_recent) || 0,
      recentOk: Number(r.ok_recent) || 0,
      last5N: Number(r.n_last5) || 0,
      last5Ok: Number(r.ok_last5) || 0,
      lastAt: at !== null && Number.isFinite(at) ? at : null,
    };
    touch(p, level, p.levels[level].lastAt);
  }
  return out;
}

export type LevelState = "vierge" | "entame" | "tenu";

export function levelState(s: LevelStat | undefined | null): LevelState {
  if (!s || s.n === 0) return "vierge";
  return s.last5N >= TENU_FENETRE && s.last5Ok >= TENU_JUSTES ? "tenu" : "entame";
}

/** Le plus haut niveau tenu, ou null. */
export function reachedLevel(p: TypeProgress | undefined | null): CalcLevel | null {
  if (!p) return null;
  let r: CalcLevel | null = null;
  for (const l of CALC_LEVELS) if (levelState(p.levels[l]) === "tenu") r = l;
  return r;
}

/** Précision récente en % (0–100), null sans réponse. */
export function recentPrecision(p: TypeProgress | undefined | null): number | null {
  if (!p) return null;
  let n = 0;
  let ok = 0;
  for (const l of CALC_LEVELS) {
    n += p.levels[l].recentN;
    ok += p.levels[l].recentOk;
  }
  return n > 0 ? (ok / n) * 100 : null;
}

/** Le niveau à travailler : celui qui suit le plus haut niveau tenu (Facile au départ, Difficile au bout). */
export function suggestedLevel(p: TypeProgress | undefined | null): CalcLevel {
  const r = reachedLevel(p);
  return r === null ? "facile" : (nextLevel(r) ?? "difficile");
}

/** Type maîtrisé : le Difficile est tenu. */
export const isMastered = (p: TypeProgress | undefined | null) => levelState(p?.levels.difficile) === "tenu";

export function nextLevel(l: CalcLevel): CalcLevel | null {
  const i = CALC_LEVELS.indexOf(l);
  return i >= 0 && i < CALC_LEVELS.length - 1 ? CALC_LEVELS[i + 1] : null;
}

/** Résumé d'une matière : types entamés, types tenus jusqu'au Difficile, précision récente. */
export function topicSummary(progress: TopicProgress | undefined, typeKeys: string[]) {
  let started = 0;
  let mastered = 0;
  let n = 0;
  let ok = 0;
  let lastAt: number | null = null;
  for (const k of typeKeys) {
    const p = progress?.[k];
    if (!p || p.lastAt === null) continue;
    started += 1;
    if (isMastered(p)) mastered += 1;
    for (const l of CALC_LEVELS) {
      n += p.levels[l].recentN;
      ok += p.levels[l].recentOk;
    }
    if (lastAt === null || p.lastAt > lastAt) lastAt = p.lastAt;
  }
  return { started, mastered, precision: n > 0 ? (ok / n) * 100 : null, lastAt };
}
