// Le logo vivant suit la journée sans recharger la barre du haut (rendue une
// fois par le layout) : les écrans qui comptent une réponse le lui disent.
// Module neutre : constantes et fonctions sans état, appelables depuis un
// composant client (les fonctions ne font rien côté serveur).

/** Objectif du jour : 40 questions, une petite heure au rythme de l'examen. */
export const OBJECTIF_DU_JOUR = 40;

/** Une réponse vient d'être donnée : detail = { n } (nombre de traits ajoutés). */
export const EVT_TRAIT = "rl:trait";
/** Valeur fraîche du jour : detail = { repondues }. */
export const EVT_ANNEAU = "rl:anneau";

/**
 * À appeler côté client après chaque réponse comptée (quiz de fiche, QCM,
 * session, duel, examen) : le logo avance d'une touche. Pour une copie rendue
 * d'un bloc, passer le nombre de questions.
 */
export function poserTrait(n = 1): void {
  if (typeof window === "undefined" || n <= 0) return;
  window.dispatchEvent(new CustomEvent(EVT_TRAIT, { detail: { n } }));
}

/** Recale le logo sur une valeur fraîche (ex. l'accueil, qui relit la journée). */
export function caleAnneau(repondues: number): void {
  if (typeof window === "undefined" || repondues < 0) return;
  window.dispatchEvent(new CustomEvent(EVT_ANNEAU, { detail: { repondues } }));
}
