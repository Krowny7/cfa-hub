import { levelState, type LevelState, type TypeProgress } from "@/lib/calc/engine";
import { CALC_LEVELS } from "@/lib/calc/types";

// Calculs pour la mise en page des écrans de calcul (hub et matière) : l'état
// d'un type (justes récents, niveaux tenus). Module neutre, sans hook.

/** Le nom d'un calcul sans sa parenthèse (« Taux de croissance (formule) » → « Taux de croissance »). */
export const nomCourt = (name: string) => name.replace(/\s*\(.*\)$/, "");

export type EtatType = { n: number; pct: number | null; tenus: number; niveaux: LevelState[] };

/** Justes sur les derniers rounds (tous niveaux), niveaux tenus et état de chaque niveau d'un type. */
export function etatType(p: TypeProgress | undefined): EtatType {
  let n = 0;
  let ok = 0;
  let tenus = 0;
  for (const l of CALC_LEVELS) {
    n += p?.levels[l].last5N ?? 0;
    ok += p?.levels[l].last5Ok ?? 0;
    if (levelState(p?.levels[l]) === "tenu") tenus += 1;
  }
  return { n, pct: n ? Math.round((ok / n) * 100) : null, tenus, niveaux: CALC_LEVELS.map((l) => levelState(p?.levels[l])) };
}
