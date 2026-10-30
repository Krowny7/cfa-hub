// PLACEHOLDERS — les effets de la partie à brancher plus tard.
//
// L'écran de partie (PartieSalle) émet un événement à chaque moment fort :
// un chiffre du décompte, l'ouverture de la première question, un verdict
// (juste / faux / temps écoulé), l'arrivée du podium. Pour l'instant RIEN
// n'écoute : `effetsParDefaut.surEvenement` ne fait rien. Les animations CSS de
// base (rebond du « juste », secousse du « faux », points qui montent, podium
// qui se dresse) sont déjà dans Partie.module.css ; ce qui reste à brancher ici :
//
//   - SONS : un tic par chiffre du décompte, un « gong » à l'ouverture, une
//     note claire pour « juste », une note sourde pour « faux », une fanfare
//     au podium (Web Audio, comme l'intro « L'Ascension » ; muet par défaut,
//     réglage dans Moi › Réglages).
//   - CONFETTIS : une pluie de copeaux métal + vermillon sur le podium (canvas
//     plein écran, coupé en mouvement réduit).
//   - LÉONARD, la mascotte : une réaction par événement (hausse les sourcils
//     sur « faux », lève le poing sur « juste », applaudit au podium). Il
//     s'accroche au gabarit `data-leonard-slot="partie"` posé dans la carte de
//     question (CarteQuestion) ; voir components/leonard.
//
// Pour brancher : passer un objet `Effets` à <PartieSalle effets={…} />, ou
// remplacer `effetsParDefaut` ci-dessous. Rien d'autre à toucher.

export type EvenementPartie =
  | { type: "decompte"; chiffre: 1 | 2 | 3 }
  | { type: "go" }
  | { type: "juste"; points: number }
  | { type: "faux" }
  | { type: "temps_ecoule" }
  | { type: "fin"; place: number | null; nbJoueurs: number };

export type Effets = {
  surEvenement: (e: EvenementPartie) => void;
};

/** PLACEHOLDER : ne fait rien (ni son, ni confetti, ni Léonard). */
export const effetsParDefaut: Effets = {
  surEvenement() {},
};
