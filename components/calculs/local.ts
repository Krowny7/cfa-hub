import type { CalcAttempt } from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcTopic } from "@/lib/calc/types";

// Repli local du suivi des calculs : tant que migration_calc.sql n'est pas
// appliquée (ou si une écriture échoue), les réponses vivent dans le
// navigateur, par compte. Format compact (une ligne = un tableau) ; les 5 000
// plus récentes au plus. Sans état React : appelable depuis n'importe quel
// composant client (ne fait rien côté serveur).

const PREFIX = "rl_calc_v1:";
const MAX = 5000;

/** [matière, type, question, niveau (0-2), valeur, juste (0/1), date en s] */
type Row = [string, string, string, number, number | null, number, number];

const key = (owner: string) => PREFIX + (owner || "anonyme");

function readRows(owner: string): Row[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(owner));
    const rows = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(rows) ? (rows.filter((r) => Array.isArray(r) && r.length === 7) as Row[]) : [];
  } catch {
    return [];
  }
}

function writeRows(owner: string, rows: Row[]) {
  if (typeof window === "undefined") return;
  try {
    if (!rows.length) window.localStorage.removeItem(key(owner));
    else window.localStorage.setItem(key(owner), JSON.stringify(rows.slice(-MAX)));
  } catch {
    // stockage plein ou interdit : on n'insiste pas
  }
}

const toRow = (a: CalcAttempt): Row => [
  a.topic,
  a.typeKey,
  a.questionId,
  Math.max(0, CALC_LEVELS.indexOf(a.level)),
  a.value,
  a.correct ? 1 : 0,
  Math.round(a.at / 1000),
];

const fromRow = (r: Row): CalcAttempt => ({
  topic: r[0] as CalcTopic,
  typeKey: r[1],
  questionId: r[2],
  level: CALC_LEVELS[r[3]] ?? "facile",
  value: typeof r[4] === "number" ? r[4] : null,
  correct: r[5] === 1,
  at: r[6] * 1000,
});

export function readLocal(owner: string): CalcAttempt[] {
  return readRows(owner).map(fromRow);
}

export function appendLocal(owner: string, attempts: CalcAttempt[]) {
  if (!attempts.length) return;
  writeRows(owner, [...readRows(owner), ...attempts.map(toRow)]);
}

/** Retire les lignes données (après leur import en base). */
export function dropLocal(owner: string, attempts: CalcAttempt[]) {
  const gone = new Set(attempts.map((a) => JSON.stringify(toRow(a))));
  writeRows(
    owner,
    readRows(owner).filter((r) => !gone.has(JSON.stringify(r))),
  );
}
