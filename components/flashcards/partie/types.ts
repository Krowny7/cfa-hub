import type { CarteJeu, Partie, Verdicts } from "@/lib/flashcards/partie";

// Ce que l'orchestrateur (PartieDeCartes) donne aux deux écrans qui suivent
// les réglages : la table de jeu (TableDeJeu) et le bilan (BilanPartie).
// Remplacer l'un ou l'autre composant ne touche rien d'autre : tant qu'il
// respecte ces propriétés, l'enregistrement, la progression et les réglages
// suivent.

/** Un état de la table figé d'avance, pour les aperçus (app/preview-da/partie-cartes) et les tests de rendu : jamais utilisé en jeu. */
export type ApercuTable = {
  /** la main affichée (à partir de 0) */
  main?: number;
  /** les cartes déjà jugées, dans l'ordre */
  jugees?: { id: string; ok: boolean }[];
  /** la carte soulevée (recto ou verso) */
  ouverte?: { id: string; face: "recto" | "verso" } | null;
  /** les jetons déjà arrivés sur la plaque (par défaut : un par « Maîtrisée » jugée) */
  gagnes?: number;
  /** un jeton en plein vol depuis cette colonne du rack (0, 1, 2), figé à mi-chemin */
  vol?: { col: number } | null;
};

export type PropsTable = {
  /** la partie distribuée : ses mains de cartes (texte compris), un jeton par carte */
  partie: Partie;
  /**
   * « Maîtrisée » (true) ou « Pas encore » (false) pour une carte : écrit sa
   * maîtrise comme le reste du site (boucle du paquet sur l'appareil et le
   * compte, répétition espacée, Codex). À appeler une fois par carte, au
   * moment du verdict ; ne bloque jamais, ne lève jamais.
   */
  juger: (carte: CarteJeu, maitrisee: boolean) => void;
  /** la dernière main est jugée (ou le joueur s'arrête là) : les verdicts par id de carte, et l'historique dans l'ordre des verdicts (pour la série) ; ouvre le bilan */
  terminer: (verdicts: Verdicts, historique: boolean[]) => void;
  /** quitter la partie sans bilan : retour aux réglages */
  abandonner: () => void;
  /** aperçus et tests seulement : part d'un état figé, sans distribution animée */
  apercu?: ApercuTable;
};

export type PropsBilan = {
  partie: Partie;
  verdicts: Verdicts;
  historique: boolean[];
  /** retour aux réglages */
  nouvellePartie: () => void;
  /** redistribue les cartes « Pas encore » de cette partie (rien s'il n'y en a pas) */
  rejouer: () => void;
};
