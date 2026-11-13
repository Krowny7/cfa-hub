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

// ---------------------------------------------------------------------------
// Réviser A, « le lieu, puis l'objet » (2026-11-13) : une scène par page, la donnée écrite sur l'objet.

const s_ = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un);

/** /flashcards : les paquets et Léonard sur la même ligne de sol. */
export const TABLE_CARTES = {
  /** le chiffre-héros de la porte */
  herosLegende: (total: number) => `cartes vues sur ${nombre(total)}`,
  /** la ligne d'état : où en est le programme */
  /** (avec au moins une carte vue ; sinon, la ligne du lieu) */
  ligne: (entamees: number, maitrises: number, paquets: number) =>
    `${nombre(entamees)} ${s_(entamees, "matière entamée", "matières entamées")} sur 10 · ${nombre(maitrises)} ${s_(maitrises, "paquet maîtrisé", "paquets maîtrisés")} sur ${nombre(paquets)}`,
  /** en Mono, sur le paquet de devant */
  vues: (vues: number, total: number) => `${nombre(vues)}/${nombre(total)} vues`,
  neuf: (total: number) => `${nombre(total)} à découvrir`,
  /** le tapis de Léonard */
  tapis: "Partie de cartes",
} as const;

/** /flashcards/matiere/<clé> et /flashcards/<id> : la grille des cartes, celles pas encore vues de dos. */
export const GRILLE_CARTES = {
  herosLegende: (total: number) => `vues sur ${nombre(total)}`,
  paquet: (i: number, theme: string) => `Paquet ${i} · ${theme}`,
  paquetAide: (theme: string) => `Réviser ce paquet seul : ${theme}`,
  /** l'infobulle d'une carte */
  carteVue: (n: number, recto: string) => `Carte ${n} · ${recto}`,
  carteMaitrisee: (n: number, recto: string) => `Carte ${n} · maîtrisée · ${recto}`,
  carteDos: (n: number) => `Carte ${n} · pas encore vue`,
  /** l'action à l'encre */
  reviser: (n: number) => `Réviser les ${nombre(n)} cartes`,
  reprendre: "Reprendre la révision",
  partie: "Partie de cartes",
  memo: "Le mémo",
  memoAide: (n: number) => `Le mémo des ${nombre(n)} cartes (PDF, nouvel onglet)`,
  ficheAide: "La mini-fiche du paquet (PDF, nouvel onglet)",
  fiche: "Mini-fiche",
  grille: "Toutes les cartes",
  /** la légende des cartes, une ligne, au pied de la grille */
  legendeVue: "vue",
  legendeTenue: "maîtrisée",
  legendeDos: "pas encore vue",
} as const;

/** /flashcards/marquees : la révision directement. */
export const GRILLE_MARQUEES = {
  herosLegende: (n: number) => (n > 1 ? "cartes marquées" : "carte marquée"),
} as const;

/** /page-blanche : des feuilles nues, posées sur le fond classique. */
export const FEUILLES_PB = {
  herosLegende: (total: number) => `formules sur ${nombre(total)}`,
  /** la ligne d'état (avec au moins une formule maîtrisée ; sinon, la ligne du lieu) */
  ligne: (entamees: number, finies: number) =>
    `${nombre(entamees)} ${s_(entamees, "matière entamée", "matières entamées")} · ${nombre(finies)} ${s_(finies, "rendue", "rendues")} en entier`,
  compte: (faites: number, total: number) => `${nombre(faites)}/${nombre(total)}`,
  prendre: (code: string) => `Prendre ma copie · ${code}`,
  feuilleAide: (matiere: string, faites: number, total: number) => `${matiere} : ${nombre(faites)} formules maîtrisées sur ${nombre(total)}`,
  /** la séance d'une matière */
  seanceLegende: (total: number) => `maîtrisées sur ${nombre(total)}`,
  /** sous une ligne notée « À revoir » : le calcul concerné (la flèche est ajoutée par la page) */
  calcul: (nom: string) => nom,
  /** au pied de la feuille des oublis : UN lien vers les calculs de la matière */
  calculsMatiere: (nom: string) => `Les calculs de ${nom}`,
  /** le score du tour, écrit sur la feuille du bilan (« 57 / 86 ») */
  scoreLegende: "maîtrisées à ce tour",
  sansFaute: "Sans faute",
  /** « Tes copies » dans la barre : les copies du tour en cases, les rendues regroupées */
  caseCopie: (i: number, titre: string) => `Copie ${i} : ${titre}`,
  rendues: (n: number) => `+${nombre(n)} ${s_(n, "rendue", "rendues")}`,
  oublis: (n: number) => (n === 0 ? "Aucun oubli" : `${nombre(n)} ${s_(n, "oubli", "oublis")}`),
} as const;
