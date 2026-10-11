// Voix « Le Trait » des pages-outils de S'entraîner (Calculs, QCM par thème,
// Entraînement ciblé, Examens officiels) : le nom et les phrases de leurs
// « lieux » illustrés, et les phrases des héros. Module neutre.

import { pluriel } from "@/lib/voice";

/** L'Abaque : le lieu des calculs. */
export const ABAQUE = {
  nom: "L'Abaque",
  sous: "Le calcul pur · 5 questions par round",
  action: "Entrer dans L'Abaque",
  coince: "Ce qui coince",
  reprendre: "Le reprendre",
  ouvrir: (court: string) => `Ouvrir ${court}`,
  fragiles: (n: number) => `Tes ${n} calculs fragiles`,
  justes: (pct: number) => `${pct} % de justes sur tes derniers rounds : c'est ton calcul le plus fragile.`,
  etat: (ouvertes: number, tenus: number, total: number) =>
    `${pluriel(ouvertes, "matière ouverte", "matières ouvertes")}, ${pluriel(tenus, "niveau tenu", "niveaux tenus")} sur ${total}.`,
  niveauTitre: "Comment se tient un niveau",
  niveauLigne: "4 justes sur tes 5 derniers et le niveau est tenu.",
  niveauLien: (court: string) => `Les niveaux de ${court}`,
  suiteTitre: "Entraînement ciblé",
  suiteLigne: "Le calcul, c'est la mécanique ; l'examen mêle les matières. Compose une session au poids réel de chaque matière.",
  suiteAction: "Composer une session",
  bientotMeta: (n: number) => `${pluriel(n, "matière en préparation", "matières en préparation")}`,
} as const;

/** Une matière de calcul (gabarit décliné de l'Abaque). */
export const MATIERE = {
  resume: (court: string) => `${court}, en bref`,
  lienChoisir: "Choisir un autre calcul",
  niveauxTitre: "Ses trois niveaux",
  essentielsSous: "à savoir sans hésiter",
  suiteTitre: (court: string) => `${court} en questions d'examen`,
  suiteLigne: "Passe des calculs aux QCM de la matière, chronométrés, corrigés à la fin.",
  suiteAction: "Composer une session",
  jamais: "Calculs jamais tracés",
} as const;

/** Le Studiolo : l'examen entier, dans l'entraînement ciblé. */
export const STUDIOLO = {
  nom: "Le Studiolo",
  ligne: "Tes matières, au poids réel de l'examen. Chronométré, corrigé à la fin.",
  action: (n: number) => `L'examen entier · ${n} questions`,
  sous: (duree: string) => `Tout l'examen, d'une traite · ${duree}`,
  etat: (n: number, matieres: number, meilleur: number | null) =>
    `${n} questions, les ${matieres} matières au poids réel. ${meilleur === null ? "Tu ne l'as pas encore tenté." : `Ta meilleure copie : ${meilleur} %.`}`,
  composer: "Composer ta session",
  choisir: "Choisis au moins une matière.",
  phrase: (faibles: number) =>
    faibles > 0
      ? `Déjà cochées : tes ${faibles} ${faibles > 1 ? "matières" : "matière"} sous 50 %. Ajoute ou retire ce que tu veux, le nombre de questions suit leur poids.`
      : "Coche tes matières : le nombre de questions suit leur poids à l'examen.",
  sessionsTitre: "Tes sessions",
  sessionsLigne: (n: number, trophees: number, moyenne: number, sur: number) =>
    `${pluriel(n, "copie", "copies")} · ${pluriel(trophees, "trophée", "trophées")} · ${moyenne} % sur ${sur > 1 ? `les ${sur} dernières` : "la dernière"}`,
  sessionsAction: "Voir tes copies",
  copies: "Tes dernières copies",
  corrigeTitre: "Corrigé à la fin",
  corrigeLigne: "Chaque erreur rejoint ton carnet de ratures, avec son explication.",
  suiteTitre: "Examens officiels",
  suiteLigne: "Les sessions officielles, rejouées en entier ou matière par matière, avec leurs variantes.",
  suiteAction: "Voir les sessions",
} as const;

/** La Bibliothèque : le lieu des QCM par thème. */
export const BIBLIO = {
  nom: "La Bibliothèque",
  banques: (n: number) => `${pluriel(n, "banque", "banques")}, rangées par matière`,
  suiteTitre: "Entraînement ciblé",
  suiteLigne: "Mêle les matières au poids réel de l'examen, chronométré, corrigé à la fin.",
  suiteAction: "Composer une session",
  quizFiches: "Quiz des fiches",
  quizFichesLigne: "Dix questions par page de fiche.",
  communaute: "Communauté",
  communauteLigne: "Les QCM des autres joueurs, sans XP.",
  tesQcm: "Tes QCM",
} as const;

/** Examens officiels : le format du jour J. */
export const JOUR_J = {
  eyebrow: "Le format du jour J",
  phrase: (n: number, minutes: number) => `${n} questions en ${minutes} minutes, d'une traite, comme le matin de l'examen. Corrigé question par question à la fin.`,
  action: "Passer la session complète",
  lien: "Par matière",
  matieresTitre: "Ses matières, par poids",
  variantesTitre: "Les variantes",
  variantesLigne: "Deux questions jumelles par question officielle, pour revoir sans réciter la réponse.",
  variantesAction: "Voir les matières qui en ont",
  parMatiere: "Par matière",
  blancAucun: "Examens blancs",
  blancAucunLigne: "Aucun examen blanc n'est programmé pour l'instant. Retrouve les précédents et ton parcours.",
  blancAction: "Voir les examens blancs",
  blancVoir: "Voir l'examen",
  blancLigne: "Le seul qui fait bouger ton rang.",
} as const;
