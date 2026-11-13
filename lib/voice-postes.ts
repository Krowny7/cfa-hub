import { nombre } from "@/lib/voice";

// Les mots des postes de travail de Réviser (2026-11-12, repris le 2026-11-13) : ce qui reste de
// l'ancien cadre à zones (l'aside du mémo de /flashcards/<id>, les copies de /page-blanche/<matière>),
// puis les scènes de Réviser A, « le lieu, puis l'objet ».

/** Les flashcards : l'aside du mémo d'un paquet (/flashcards/<id>). */
export const POSTE_CARTES = {
  memo: "Le mémo",
} as const;

/** La page blanche : les copies de la matière (la barre des cases) et le bilan d'un tour. */
export const POSTE_PB = {
  copies: "Tes copies",
  rendue: "rendue",
  aRendre: "à rendre",
  bilan: "Le bilan",
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
