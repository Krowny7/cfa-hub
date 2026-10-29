// « Tes points faibles », volet Calculs (S'entraîner) : les types de calcul où
// la réussite est la plus basse. Module pur, sans « use client » ni serveur : il
// ne fait que sommer la progression déjà lue (AllProgress, fonction SQL
// calc_progress via app/calculs/data.ts), sur les trois niveaux de chaque type.
// Les noms et les adresses viennent du registre (lib/calc/index, côté serveur),
// que l'appelant passe en `nommer` : ce module n'importe aucun catalogue.

import { CALC_LEVELS, type CalcTopic } from "./types";
import type { AllProgress } from "./engine";

/** Un type n'est jugé qu'à partir de ce nombre de réponses (sinon le pourcentage ne dit rien). */
export const MIN_TENTATIVES_CALCUL = 5;
/** Combien de types le volet en montre. */
export const MAX_CALCULS = 4;
/** La ligne repère : sous ce pourcentage, le type est à reprendre. */
export const SEUIL_CALCUL = 70;

/** Un type de calcul de la carte : réussite sur toutes ses réponses, tous niveaux confondus. */
export type LigneCalcul = {
  cle: string;
  nom: string;
  matiere: string;
  href: string;
  /** réponses données et justes */
  n: number;
  ok: number;
  /** réussite en % (0 à 100, arrondie) */
  pct: number;
};

export type CalculsFaibles = {
  /** les types les moins réussis (MAX_CALCULS au plus), du plus bas au plus haut */
  lignes: LigneCalcul[];
  /** parmi tous les types jugés : combien sont sous le seuil */
  sousSeuil: number;
  /** combien de types ont assez de réponses pour être jugés */
  evalues: number;
};

export type NomCalcul = { nom: string; matiere: string; href: string };

/** Agrège par type (somme sur les niveaux), garde les types jugés, trie par réussite croissante. */
export function calculsFaibles(
  progress: AllProgress | null | undefined,
  nommer: (topic: CalcTopic, typeKey: string) => NomCalcul | null,
  { min = MIN_TENTATIVES_CALCUL, max = MAX_CALCULS, seuil = SEUIL_CALCUL }: { min?: number; max?: number; seuil?: number } = {},
): CalculsFaibles {
  const tous: LigneCalcul[] = [];
  for (const [topic, types] of Object.entries(progress ?? {}) as [CalcTopic, NonNullable<AllProgress[CalcTopic]>][]) {
    for (const [typeKey, p] of Object.entries(types)) {
      let n = 0;
      let ok = 0;
      for (const l of CALC_LEVELS) {
        n += p.levels[l].n;
        ok += p.levels[l].ok;
      }
      if (n < min) continue;
      const nom = nommer(topic, typeKey);
      if (!nom) continue;
      tous.push({ cle: `${topic}:${typeKey}`, nom: nom.nom, matiere: nom.matiere, href: nom.href, n, ok, pct: Math.round((100 * ok) / n) });
    }
  }
  // du plus bas au plus haut ; à réussite égale, le plus travaillé d'abord (le plus sûr), puis l'ordre alphabétique
  tous.sort((a, b) => a.ok / a.n - b.ok / b.n || b.n - a.n || a.nom.localeCompare(b.nom));
  return { lignes: tous.slice(0, max), sousSeuil: tous.filter((l) => l.pct < seuil).length, evalues: tous.length };
}
