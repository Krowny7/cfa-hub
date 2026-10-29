// Le compte des calculs réalisés, par matière et par niveau (tableau croisé
// de /calculs). Module neutre, sans « use client » : il ne fait que sommer la
// progression déjà lue (AllProgress), qui vient soit de la fonction SQL
// calc_progress (une ligne par matière × type × niveau, agrégée côté base),
// soit du repli local. Aucune lecture de plus.

import { CALC_LEVELS, type CalcLevel, type CalcTopic } from "./types";
import type { AllProgress } from "./engine";

/** Calculs réalisés (n) et calculs justes (ok). */
export type CalcCell = { n: number; ok: number };

export type CalcCountRow = { topic: CalcTopic; parNiveau: Record<CalcLevel, CalcCell>; total: CalcCell };

export type CalcCounts = {
  /** une ligne par matière qui a au moins un calcul, dans l'ordre demandé */
  rows: CalcCountRow[];
  parNiveau: Record<CalcLevel, CalcCell>;
  total: CalcCell;
};

const vide = (): Record<CalcLevel, CalcCell> => ({ facile: { n: 0, ok: 0 }, moyen: { n: 0, ok: 0 }, difficile: { n: 0, ok: 0 } });

/** Somme la progression sur les types de chaque matière de `topics` ; les matières sans calcul sont omises. */
export function calcCounts(progress: AllProgress, topics: CalcTopic[]): CalcCounts {
  const rows: CalcCountRow[] = [];
  const parNiveau = vide();
  const total: CalcCell = { n: 0, ok: 0 };
  for (const topic of topics) {
    const types = progress[topic];
    if (!types) continue;
    const row: CalcCountRow = { topic, parNiveau: vide(), total: { n: 0, ok: 0 } };
    for (const p of Object.values(types)) {
      for (const l of CALC_LEVELS) {
        const s = p.levels[l];
        row.parNiveau[l].n += s.n;
        row.parNiveau[l].ok += s.ok;
      }
    }
    for (const l of CALC_LEVELS) {
      row.total.n += row.parNiveau[l].n;
      row.total.ok += row.parNiveau[l].ok;
    }
    if (row.total.n === 0) continue;
    for (const l of CALC_LEVELS) {
      parNiveau[l].n += row.parNiveau[l].n;
      parNiveau[l].ok += row.parNiveau[l].ok;
    }
    total.n += row.total.n;
    total.ok += row.total.ok;
    rows.push(row);
  }
  return { rows, parNiveau, total };
}
