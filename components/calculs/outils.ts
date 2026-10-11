import { levelState, type LevelState, type TypeProgress } from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcLevel } from "@/lib/calc/types";
import type { Ligne } from "@/components/outils/Gabarit";
import { roundHref, type Suggestion } from "./suggest";
import { CALC, NIVEAU } from "./voice";

// Calculs pour la mise en page des écrans de calcul (hub et matière) : l'état
// d'un type (justes récents, niveaux tenus), la liste des trois niveaux et la
// phrase du prochain calcul. Module neutre, sans hook.

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

/** Les trois niveaux d'un type, du plus facile au plus dur, chacun avec son lien de round. */
export function lignesNiveaux(slug: string, typeKey: string, p: TypeProgress | undefined): Ligne[] {
  return CALC_LEVELS.map((l: CalcLevel) => {
    const st = p?.levels[l];
    const etat = levelState(st);
    const n = st?.last5N ?? 0;
    const ok = st?.last5Ok ?? 0;
    return {
      label: NIVEAU[l].label,
      meta: etat === "tenu" ? `tenu · ${ok} sur ${n}` : etat === "entame" ? `${ok} juste${ok > 1 ? "s" : ""} sur ${n} · il en faut 4 sur 5` : "à tracer",
      pct: etat === "vierge" ? 0 : Math.round((ok / Math.max(1, n)) * 100),
      href: roundHref(slug, typeKey, l),
      rouge: etat === "entame" && ok < 4,
    };
  });
}

/** La phrase du héros « prochain calcul » : où il en est, et ce qui manque pour tenir le niveau. */
export function phraseSuggestion(sug: Suggestion | null, p: TypeProgress | undefined): string {
  if (!sug) return CALC.toutTenu;
  const lvl = p?.levels[sug.level];
  const niveau = NIVEAU[sug.level].label.toLowerCase();
  if (lvl && lvl.last5N) {
    const manque = Math.max(0, 4 - lvl.last5Ok);
    return `${lvl.last5Ok} juste${lvl.last5Ok > 1 ? "s" : ""} sur tes ${lvl.last5N} derniers au niveau ${niveau} : encore ${manque} pour le tenir.`;
  }
  return `Premier passage au niveau ${niveau} : ${NIVEAU[sug.level].desc.toLowerCase()}`;
}
