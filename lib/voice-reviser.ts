// La voix de Réviser : la page « le parcours » (la Bibliothèque pour
// apprendre, l'Atelier pour revoir ses erreurs) et les listes /fiches,
// /courses, /flashcards (« Index + vignette du lieu »). Les phrases
// d'ensemble restent dans lib/voice-z4.ts.

import type { IllustrationNom } from "@/lib/illustrations";
import { nombre } from "@/lib/voice";

const s = (n: number) => (n > 1 ? "s" : "");

export const RV = {
  // la page Réviser, « le parcours »
  biblio: "La Bibliothèque",
  biblioSous: "Apprendre, dans l'ordre où l'on révise.",
  parcours: "Le parcours, dans l'ordre",
  // 1 · Cours complets
  coursEtape: "Commence ici",
  coursAudio: (duree: string) => `${duree} d'audio`,
  coursTitre: "Cours complets",
  coursSous: "Ta source la plus complète : diapositives et audio.",
  coursModule: (n: number, titre: string) => `Module ${n} · ${titre}`,
  // sans reprise : la durée est déjà à droite du titre, la ligne du dessous ne dit que les modules
  coursModules: (n: number) => `${n} modules`,
  coursReprendre: "Reprendre l'écoute",
  coursCommencer: "Commencer",
  coursLecteur: (titre: string, ou: string) => `${titre} : ${ou}`,
  coursTous: (n: number) => `Les ${n} cours`,
  coursOuvrir: "Ouvrir les cours",
  coursMatieres: "Écoute par matière",
  coursMatiere: (nom: string, pct: number) => (pct >= 100 ? `${nom} : écouté en entier` : pct > 0 ? `${nom} : ${pct} % écouté` : `${nom} : pas encore écouté`),
  // 2 · Fiches de révision
  fichesEtape: "Puis fixe",
  fichesTitre: "Fiches de révision",
  fichesSous: "Le cours condensé, puis ses questions : QCM, corrigés, drills.",
  fichesAvancement: (finies: number, entamees: number) =>
    finies === 0 && entamees === 0
      ? "Aucune fiche entamée"
      : [finies > 0 ? `${finies} fiche${s(finies)} finie${s(finies)}` : null, entamees > 0 ? `${entamees} entamée${s(entamees)}` : null].filter(Boolean).join(" · "),
  fichesSur: (n: number) => `sur ${n}`,
  fichesAide: "Une fiche est finie quand chaque question de ses pages de drill a reçu une réponse ; entamée dès la première.",
  fichesAction: "Ouvrir les fiches",
  // 3 · pour la fin
  fin: "pour la fin des révisions",
  opTitre: "One-pagers",
  opSous: "Une page A4 par matière",
  fcTitre: "Flashcards",
  fcSous: (parMatiere: number | null) => (parMatiere ? `${nombre(parMatiere)} cartes par matière` : "Termes, formules, pièges"),
  fcCarteTete: "À RETENIR",

  // l'Atelier : revoir mes erreurs
  atelier: "L'Atelier",
  atelierSous: "Revoir mes erreurs, jusqu'à ce qu'elles tiennent.",
  atelierEtat: "Une séance de 30 minutes sur tes points faibles : rappel, ratures, questions neuves, puis le bilan avant/après.",
  atelierAction: "Ouvrir l'Atelier",
  carnetTitre: "Carnet de ratures",
  carnetNeutre: "brouillon",
  carnetEnCours: (n: number) => (n > 1 ? "ratures en cours" : "rature en cours"),
  carnetPropre: "Page propre : rien à reprendre pour l'instant.",
  carnetSansChiffre: "Toutes tes questions manquées, gardées jusqu'à ce que tu les réussisses.",
  carnetCalculCoupe: "coupé sur cet appareil",
  carnetCalculActif: "actif",
  carnetOuvrir: "Ouvrir le carnet",
  carnetSansCalcul: (n: number) => `${nombre(n)} sans calcul`,
  carnetACalcul: (n: number) => `${nombre(n)} à calcul`,
  marqueesTitre: "Questions marquées",
  marqueesGardees: (n: number) => (n > 1 ? "gardées de côté" : "gardée de côté"),
  marqueesVide: "Aucune pour l'instant : touche « Marquer » après une réponse pour la garder ici.",
  marqueesSansChiffre: "Celles que tu as gardées de côté, pour revoir la notion plus tard.",
  marqueesAction: "Les revoir",
  marqueesOuvrir: "Ouvrir l'onglet",
  faiblesTitre: "Points faibles",
  faiblesRatures: (n: number) => `${nombre(n)} rature${s(n)}`,
  faiblesPctAide: "de réussite récente",
  faiblesRien: "Rien de fragile en ce moment : tes notions mesurées tiennent.",
  faiblesPeu: "Pas encore assez de réponses pour mesurer une notion. Quelques séries, et elles apparaîtront ici.",
  faiblesSansChiffre: "Mesurées sur tes dernières réponses, pour savoir quoi reprendre.",
  faiblesSous: "Les notions qui coincent",
  faiblesAction: "Voir mes points faibles",

  // listes
  retour: "Réviser",
  ouvrirFiche: "Ouvrir la fiche",
  surDix: (n: number) => `${n} matière${s(n)} sur 10`,
  programme: "Le programme, matière par matière",
  programmeAide: "ta maîtrise · en filigrane, ce qui arrive",
  aVenir: (n: number) => `${n} matière${s(n)} à venir`,
  aVenirUne: "à venir",
  voir: "voir",
  lesPaquets: (matiere: string) => `Les paquets · ${matiere}`,
  reprendre: (paquet: string) => `Reprendre : ${paquet}`,
  commencer: (paquet: string) => `Pour commencer : ${paquet}`,
  reprendreAction: "Reprendre le paquet",
  commencerAction: "Commencer le paquet",
  ordreCartes: "Les cartes à revoir passent en premier.",
} as const;

/** Les one-pagers : la page /fiches/one-pagers, son accès depuis /fiches et le lien des pages de fiche. */
export const OP = {
  titre: "One-pagers",
  desc: "Chaque matière tient sur une page A4 : l'essentiel, les formules et les pièges d'examen. À relire la veille, ou à imprimer.",
  retour: "Fiches de révision",
  grille: "Les 10 matières",
  grilleAide: "le PDF s'ouvre dans un nouvel onglet",
  ouvrir: (matiere: string) => `Ouvrir le one-pager ${matiere} (PDF, nouvel onglet)`,
  indisponible: "PDF bientôt en ligne",
  impression: "Imprime-les en A4, taille réelle : chaque page est pensée pour tenir sur une feuille.",
  accesAide: "une page A4 par matière",
  accesTitre: "Toute une matière sur une page",
  accesLigne: "L'essentiel, les formules et les pièges d'examen des 10 matières, à relire la veille.",
  lienFiche: "One-pager",
  lienFicheAide: "La matière sur une page A4, dans un nouvel onglet",
} as const;

export type KindListe = "fiche" | "cours" | "cartes";

/** Le « lieu » de chaque liste : nom, une ligne, l'illustration et son cadrage. */
export const LIEUX: Record<KindListe, { nom: string; ligne: string; illustration: IllustrationNom; position: string; titre: string; desc: string }> = {
  fiche: {
    nom: "Les carnets",
    ligne: "Une synthèse par thème, comme une page de carnet : on relit, puis on vérifie au quiz.",
    illustration: "reviser-carnets",
    position: "50% 45%",
    titre: "Fiches de révision",
    desc: "Une synthèse par thème, puis son quiz corrigé. Tes erreurs restent de côté jusqu'à ce que tu les réussisses.",
  },
  cours: {
    nom: "Le pupitre",
    ligne: "Le deck intégral et sa voix : un module à la fois, à ton rythme.",
    illustration: "reviser-pupitre",
    position: "50% 55%",
    titre: "Cours complets",
    desc: "Le cours intégral par matière, à lire ou à écouter : environ une heure, découpée par module.",
  },
  cartes: {
    nom: "Le casier",
    ligne: "Des cartes courtes, revues juste avant de les oublier.",
    illustration: "reviser-casier",
    position: "50% 50%",
    titre: "Flashcards",
    desc: "Répétition espacée : termes, formules, pièges. Les cartes à revoir passent en premier.",
  },
};
