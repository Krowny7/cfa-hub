// La voix de la refonte de Réviser : le hub (« La matière à revoir + la
// Bibliothèque ») et les listes /fiches, /courses, /flashcards (« Index +
// vignette du lieu »). Les phrases d'ensemble restent dans lib/voice-z4.ts.

import type { IllustrationNom } from "@/lib/illustrations";

const s = (n: number) => (n > 1 ? "s" : "");

export const RV = {
  // hub
  enPriorite: "À revoir en priorité",
  parOuCommencer: "Par où commencer",
  ensuite: "Ensuite, à revoir",
  heroMesure: (pct: number) => `${pct} % de maîtrise : ta matière la plus fragile parmi celles qui ont une fiche.`,
  heroNonMesure: "Pas encore de mesure : relis la fiche, son quiz te donnera ta maîtrise.",
  heroLigne: (meta: string, minutes: number | null) =>
    minutes ? `Relis la fiche (${meta}), puis écoute le cours : ${minutes} min, module par module.` : `Relis la fiche (${meta}), puis fais son quiz.`,
  ouvrirFiche: "Ouvrir la fiche",
  ecouterCours: (minutes: number) => `Écouter le cours · ${minutes} min`,
  biblio: "La Bibliothèque",
  biblioSous: "Les fiches et les cartes, rangées par matière",
  biblioEtat: (fiches: number, paquets: number) =>
    `${fiches} matière${s(fiches)} en fiches · ${paquets} paquet${s(paquets)} de cartes. Les cours narrés sont juste en dessous.`,
  biblioAction: "Ouvrir les fiches",
  biblioLien: "Les flashcards",
  flashTitre: "Flashcards",
  flashPaquets: (n: number) => `${n} paquet${s(n)}`,
  flashLigne: (noms: string[]) =>
    noms.length === 0 ? "Les cartes sont en préparation." : noms.length <= 2 ? `${noms.join(" et ")} : les cartes à revoir passent en premier.` : `${noms.length} matières : les cartes à revoir passent en premier.`,
  flashAction: "Revoir mes cartes",
  carnetTitre: "Carnet de ratures",
  carnetFort: "Tes questions manquées",
  carnetPropre: "Page propre.",
  carnetLigne: "Toutes sources, rangées par matière, jusqu'à ce que tu les réussisses.",
  carnetLignePropre: "Rien à reprendre pour l'instant : le carnet se remplit au fil de tes réponses.",
  carnetAction: "Ouvrir le carnet",
  coursTitre: "Écouter un cours",
  coursLigne: (n: number, heures: number) => `Les ${n} cours complets, narrés : environ ${heures} h, découpés par module. Pour les trajets.`,
  coursAction: "Choisir un cours",
  fonds: "Les fonds de révision",
  marquees: ["Questions marquées", "Celles que tu as gardées pour plus tard."],
  apresLecture: ["S'entraîner après la lecture", "Des questions par matière, pour vérifier ce que tu viens de relire."],
  eclair: ["Séries éclair", "5 questions à la suite, quand tu as deux minutes."],
  dixMatieres: "Les 10 matières",
  dixMatieresAide: "choisis une matière : sa fiche, son cours et ses cartes",

  // listes
  retour: "Réviser",
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
