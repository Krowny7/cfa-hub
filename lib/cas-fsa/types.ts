// Les cas pratiques de FSA : les vrais états financiers d'une entreprise, et des questions
// pour y appliquer le programme, avec ou sans tuto guidé. Module neutre (pas de "use client").

/** Une ligne d'un état financier, chiffres de l'exercice et de l'exercice précédent. */
export type LigneEtat = {
  /** le libellé du document, en anglais */
  libelle: string;
  /** dans l'unité de l'état ; null : rien à cette ligne (titre de section) */
  n: number | null;
  n1: number | null;
  /** décalage dans le tableau : 0 (défaut), 1, 2 */
  niveau?: 0 | 1 | 2;
  /** ligne de total ou de sous-total */
  total?: boolean;
};

export type EtatFinancier = {
  titre: string;
  /** « millions USD », « millions EUR » */
  unite: string;
  lignes: LigneEtat[];
};

/** Un passage du vrai document : note annexe, commentaire de la direction. */
export type Extrait = {
  id: string;
  titre: string;
  /** citation exacte, courte */
  texte: string;
  /** où le retrouver dans le document : « Note 7 — Inventories, p. 62 » */
  ou: string;
};

/** Une question du cas. Énoncé en anglais, tout le reste en français. */
export type EtapeCas = {
  id: string;
  /** le thème du programme : « Inventory turnover » */
  notion: string;
  enonce: string;
  /** réponse chiffrée attendue, et tolérance absolue ; null : question à réponse rédigée */
  reponse: number | null;
  tolerance?: number;
  /** « % », « x », « jours », « millions USD » */
  unite?: string;
  /** réponse rédigée attendue, pour une question sans chiffre */
  reponseTexte?: string;
  /** le tuto guidé : où chercher, quelle formule, sans donner le résultat */
  guide: string;
  /** le corrigé pas à pas, avec les lignes des états utilisées */
  corrige: string;
  /** ce que le chiffre veut dire pour cette entreprise */
  lecture: string;
};

export type CasFsa = {
  id: string;
  societe: string;
  /** « Exercice clos le 26 janvier 2025 » */
  exercice: string;
  referentiel: "US GAAP" | "IFRS";
  /** le vrai document, pour aller le lire */
  source: { titre: string; url: string };
  /** pourquoi ce cas est intéressant, deux phrases */
  accroche: string;
  etats: { resultat: EtatFinancier; bilan: EtatFinancier; flux: EtatFinancier };
  extraits: Extrait[];
  etapes: EtapeCas[];
};
