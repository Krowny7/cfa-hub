import { nombre } from "@/lib/voice";

// Les mots des postes de travail de Réviser sur le modèle des sous-pages (2026-11-12) : les titres
// des zones du cadre (CadreZones) de /fiches/<matière>, /courses/<slug>, /flashcards/matiere/<clé>,
// /flashcards/<id>, /flashcards/marquees et /page-blanche/<matière>, et ce que dit leur colonne grise.

/** Une fiche : le cours (le PDF) à gauche, le quiz dans la colonne grise. */
export const POSTE_FICHE = {
  cours: "Le cours",
  quiz: "Le quiz",
} as const;

/** Un cours complet : le deck à gauche, l'audio et ses modules dans la colonne grise. */
export const POSTE_COURS = {
  deck: "Le deck",
  audio: "L'audio",
} as const;

/** Les flashcards : la révision à gauche, les paquets (et le mémo) dans la colonne grise. */
export const POSTE_CARTES = {
  revision: "Ta révision",
  paquets: "Les paquets",
  autres: "Les autres paquets",
  /** la colonne grise d'un paquet sans autre paquet : son mémo seul, ou ses cartes repliées */
  memo: "Le mémo",
  paquet: "Le paquet",
  marquees: "Tes cartes marquées",
  /** le mémo d'une matière, en petit : il s'ouvre dans un nouvel onglet */
  memoOuvrir: (n: number) => `Ouvrir le mémo des ${nombre(n)} cartes (nouvel onglet)`,
} as const;

/** La page blanche : la feuille à gauche, les copies de la matière dans la colonne grise. */
export const POSTE_PB = {
  copies: "Tes copies",
  rendue: "rendue",
  aRendre: "à rendre",
  bilan: "Le bilan",
  allerA: (titre: string) => `Aller à la copie : ${titre}`,
} as const;
