// La voix de Réviser : la page « le parcours » (la Bibliothèque pour
// apprendre, l'Atelier pour revoir ses erreurs) et les listes /fiches,
// /courses, /flashcards (gabarit A des sous-pages : en-tête, rangée héros, index). Les phrases
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
  fichesTitre: "Fiches de révision",
  fichesOnglets: "Les fiches, matière par matière",
  fichesReprendre: "À reprendre",
  fichesCommencer: "À commencer",
  fichesAvancement: (finies: number, entamees: number) =>
    finies === 0 && entamees === 0
      ? "Aucune fiche entamée"
      : [finies > 0 ? `${finies} fiche${s(finies)} finie${s(finies)}` : null, entamees > 0 ? `${entamees} entamée${s(entamees)}` : null].filter(Boolean).join(" · "),
  ficheOnglet: (nom: string, etat: "finie" | "entamee" | "neuve") => `${nom} : ${etat === "finie" ? "finie" : etat === "entamee" ? "entamée" : "pas commencée"}`,
  fichesAide: "Une fiche est finie quand chaque question de ses pages de drill a reçu une réponse ; entamée dès la première.",
  fichesAction: "Ouvrir les fiches",
  // 3 · pour la fin
  fin: "pour la fin des révisions",
  opTitre: "One-pagers",
  opSous: (n: number) => `${n} matières, ${n} pages`,
  opAction: "Ouvrir",
  fcTitre: "Flashcards",
  fcSous: (parMatiere: number | null) => (parMatiere ? `${nombre(parMatiere)} cartes par matière` : "Termes, formules, pièges"),
  fcCarteTete: "À RETENIR",
  pbTitre: "La page blanche",
  pbSous: "Récite tes formules sur papier",
  videosTitre: "Vidéos résumé",
  videosSous: "Une matière en quelques minutes",
  videosEtiquette: "Nouveau",
  codexTitre: "Le Codex",
  codexSous: "Tes quêtes, tes sceaux et tout ce qui reste à conquérir.",
  codexAction: "Ouvrir le Codex",
  codexTerminal: "Le Codex et le Terminal",
  terminalTitre: "Le Terminal",
  terminalSous: "Découvre un terminal de marché, avec des exercices guidés.",
  coursLire: (titre: string) => `Écouter ${titre}`,
  coursPause: (titre: string) => `Mettre ${titre} en pause`,
  coursAller: "Aller à ce moment du cours",
  coursEchec: "L'audio n'a pas pu se lancer. Réessaie.",
  codexNiveau: (n: number) => `Niveau ${nombre(n)}`,
  codexXp: (a: number, b: number) => `${nombre(a)} / ${nombre(b)} XP`,
  codexSuite: "La suite",
  codexSeance: (faits: number, total: number, minutes: number) => `Séance ${faits + 1}/${total} · ${minutes} min`,
  codexSeanceFinie: "La séance du jour est faite.",
  codexARecuperer: (n: number) => (n > 0 ? `À récupérer · ${nombre(n)}` : "À récupérer"),
  codexRien: "Rien à récupérer pour l'instant.",
  codexRevoir: "À revoir aujourd'hui",
  codexFaitJour: "Fait aujourd'hui",
  registre: "Ton suivi",

  // l'Atelier : revoir mes erreurs
  atelier: "L'Atelier",
  atelierSous: "Revoir mes erreurs, jusqu'à ce qu'elles tiennent.",
  atelierEtat: "Une séance de 15 minutes sur ta notion la plus faible : rappel, ratures, questions neuves, puis le bilan avant/après.",
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
  ouvrirFiche: "Ouvrir la fiche",
  // la carte « ta suite » des listes (la seule recommandation de la page)
  taSuite: "Ta suite",
  ficheReprendre: (nom: string) => `Reprendre par ${nom}`,
  commencerPar: (nom: string) => `Commencer par ${nom}`,
  ficheLigne: (pct: number, meta: string) => `${pct} % de maîtrise, ta matière la plus fragile qui a une fiche · ${meta}.`,
  coursEcouterMatiere: (nom: string) => `Écouter ${nom}`,
  coursLigneSuite: (pct: number, modules: number, minutes: number) => `${pct} % de maîtrise, ta matière la plus fragile · ${modules} modules, ${minutes} min.`,
  coursLigneNeuve: (modules: number, minutes: number) => `${modules} modules, ${minutes} min.`,
  coursEcouter: "Écouter le cours",
  programme: "Le programme, matière par matière",
  /** le carrousel des flashcards */
  cartesTitre: "Choisis ta matière",
  cartesAide: "fais tourner les paquets",
  cartesOuvrir: "Voir ses paquets",
  programmeAide: "ta maîtrise · en filigrane, ce qui arrive",
  // flashcards : les cartes déjà vues de chaque matière, une pastille par paquet
  avanceVues: (vues: number, total: number) => `${vues}/${total} vues`,
  avanceAide: (nom: string, vues: number, total: number, maitrises: number, enCours: number, neufs: number) =>
    `${nom} : ${vues} carte${s(vues)} vue${s(vues)} sur ${total}. Paquets : ${maitrises} maîtrisé${s(maitrises)}, ${enCours} en cours, ${neufs} pas commencé${s(neufs)}.`,
  avanceLegende: "Une pastille par paquet",
  avanceMaitrise: "maîtrisé",
  avanceCours: "en cours",
  avanceNeuf: "pas commencé",
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
  grille: "Les 10 matières",
  ouvrir: (matiere: string) => `Ouvrir le one-pager ${matiere} (PDF, nouvel onglet)`,
  indisponible: "PDF bientôt en ligne",
  impression: "Chaque PDF s'ouvre dans un nouvel onglet. Imprime-les en A4, taille réelle : chaque page est pensée pour tenir sur une feuille.",
  accesAide: "une page A4 par matière",
  accesTitre: "Toute une matière sur une page",
  accesLigne: "L'essentiel, les formules et les pièges d'examen des 10 matières, à relire la veille.",
  lienFiche: "One-pager",
  lienFicheAide: "La matière sur une page A4, dans un nouvel onglet",
} as const;

/** La page d'un cours complet (/courses/<slug>, CourseView). */
export const COURS = {
  ligne: (modules: number, pages: number, minutes: number) => `${modules} Learning Modules · ${pages} pages · ${minutes} min d'audio`,
  ligneAide: " — clique un module pour sauter directement à ce passage.",
  ecouter: "Écouter le cours",
  lire: "Lire le cours",
  deck: "Le deck",
  ouvrir: "Ouvrir",
  ouvrirSuite: " dans un nouvel onglet",
  ouvrirAide: "Ouvrir dans un nouvel onglet",
  iframe: (titre: string) => `${titre} — Cours complet`,
  indisponible: "Impossible de charger le cours pour le moment. Réessaie dans un instant.",
  sansAudio: "L'audio de ce cours n'est pas disponible pour le moment.",
} as const;

/** Les retours des sous-pages de Réviser (EnTeteSousPage) : le nom de la vraie page parente. */
export const RETOUR = {
  reviser: { href: "/reviser", label: "Réviser" },
  fiches: { href: "/fiches", label: "Fiches" },
  cours: { href: "/courses", label: "Cours complets" },
  flashcards: { href: "/flashcards", label: "Flashcards" },
  pageBlanche: { href: "/page-blanche", label: "La page blanche" },
} as const;

export type KindListe = "fiche" | "cours" | "cartes";

/** Le « lieu » de chaque liste : nom (légende de la peinture), l'illustration et son cadrage, le titre et la ligne de l'en-tête. */
export const LIEUX: Record<KindListe, { nom: string; illustration: IllustrationNom; position: string; titre: string; desc: string }> = {
  fiche: {
    nom: "Les carnets",
    illustration: "reviser-carnets",
    position: "50% 45%",
    titre: "Fiches de révision",
    desc: "Une synthèse par thème, puis son quiz corrigé. Tes erreurs restent de côté jusqu'à ce que tu les réussisses.",
  },
  cours: {
    nom: "Le pupitre",
    illustration: "reviser-pupitre",
    position: "50% 55%",
    titre: "Cours complets",
    desc: "Le cours intégral par matière, à lire ou à écouter : environ une heure, découpée par module.",
  },
  cartes: {
    nom: "Le casier",
    illustration: "reviser-casier",
    position: "50% 50%",
    titre: "Flashcards",
    desc: "Répétition espacée : termes, formules, pièges. Les cartes à revoir passent en premier.",
  },
};
