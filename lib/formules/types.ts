// « La page blanche » : les formules et notions à savoir par cœur, par matière. Une matière
// est découpée en copies (un thème, quelques lignes) que le joueur remplit sur son papier.
// Module neutre (pas de "use client").

/** Une ligne de copie : le nom seul s'affiche d'abord, la réponse se révèle ensuite. */
export type Formule = {
  /** stable, il sert de clé au suivi du joueur : « fsa.current-ratio » */
  id: string;
  /** ce qui s'affiche sur la copie, en anglais comme à l'examen : « Current ratio » */
  nom: string;
  /** la réponse en KaTeX, sans le nom ni le signe égal de tête */
  latex?: string;
  /** la réponse en mots, quand ce n'est pas une formule (Éthique, définitions) */
  texte?: string;
  /** une ligne en français : ce qu'il faut retenir, le piège classique */
  note?: string;
};

/** Une copie à rendre : un thème de la matière. */
export type Copie = {
  id: string;
  titre: string;
  formules: Formule[];
};

/** `matiere` : une clé de TOPICS (lib/practiceTopics.ts). */
export type MatiereFormules = {
  matiere: string;
  copies: Copie[];
};
