// Exercices de calcul pur : format commun du contenu (lib/calc/<matière>.ts)
// et du moteur (pages /calculs). Module neutre, sans « use client ».
//
// Une matière regroupe des « types de calcul » (ex. « Pondération d'indice »),
// classés en essentiels et annexes. Chaque type propose trois niveaux ; un
// round tire 5 questions d'un niveau. Aujourd'hui 5 questions par niveau
// (15 par type) ; plus tard un vivier plus large, d'où le tirage avec rotation
// côté moteur.

export type CalcTopic =
  | "ethics"
  | "quant"
  | "economics"
  | "corporate"
  | "fsa"
  | "equity"
  | "fixed_income"
  | "derivatives"
  | "alternatives"
  | "portfolio";

export type CalcLevel = "facile" | "moyen" | "difficile";

export const CALC_LEVELS: CalcLevel[] = ["facile", "moyen", "difficile"];

/** Unité affichée à côté du champ de réponse. Pour "%", on saisit 8.5 pour 8,5 %. */
export type CalcUnit = "%" | "$" | "x" | "years" | "bp" | "";

export type CalcQuestion = {
  /** Identifiant stable et unique (ex. "eq-index-pw-f1") : sert au suivi des tentatives. Ne jamais le réutiliser pour une autre question. */
  id: string;
  level: CalcLevel;
  /** Énoncé très bref, en anglais d'examen : seulement ce qu'il faut calculer. */
  prompt: string;
  /** Les données, une par ligne (libellé anglais court + valeur formatée). */
  data: { label: string; value: string }[];
  /** Résultat exact, CALCULÉ dans le code à partir des mêmes nombres (jamais tapé à la main). */
  answer: number;
  unit: CalcUnit;
  /** Nombre de décimales attendu dans la réponse (sert à l'affichage et à la tolérance). */
  decimals: number;
  /** Tolérance absolue facultative ; par défaut le moteur accepte ± une demi-unité de la dernière décimale, plus 0,2 % relatif. */
  tolerance?: number;
  /** Correction pas à pas, en français (une étape par ligne, chiffres à l'appui). */
  solution: string[];
};

export type CalcType = {
  /** Clé d'URL stable (ex. "index-weighting"). */
  key: string;
  topic: CalcTopic;
  /** Nom affiché, en français, termes CFA en anglais si usage (ex. "Pondération d'indice"). */
  name: string;
  tier: "essentiel" | "annexe";
  /** Rappel de formule(s), court, affiché avant de lancer un round. Une ligne par formule. */
  formulas: string[];
  /** Pièges d'examen typiques (facultatif, 1 à 3 lignes). */
  traps?: string[];
  /** Reading ou Learning Module de référence (ex. "LM 2 · Security Market Indexes"). */
  source?: string;
  questions: CalcQuestion[];
};

export type CalcCatalog = {
  topic: CalcTopic;
  types: CalcType[];
};
