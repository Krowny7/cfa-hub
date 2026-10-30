// Salles : les types partagés (réglages, état d'une salle, réponses).
// Module neutre (pas de "use client") : utilisable côté serveur comme dans le
// navigateur. Les RPC de migration_salles.sql parlent en snake_case ; les
// conversions vers ces types sont dans lib/salles/api.ts.

import type { TOPICS } from "@/lib/practiceTopics";

/** Clé d'une des 10 matières (lib/practiceTopics.ts). */
export type TopicKey = (typeof TOPICS)[number]["key"];

// ---------------------------------------------------------------------------
// Réglages d'une partie

/** Questions de cours, calculs, ou les deux mêlés. */
export type SalleType = "questions" | "calculs" | "mixte";

/**
 * D'où viennent les questions : `banque` = toute la banque officielle du
 * site ; `mocks` = questions d'examen (les dossiers dont les examens blancs
 * tirent leurs questions, plus les mocks officiels). Sans effet pour les calculs.
 */
export type SalleSource = "banque" | "mocks";

export type SalleDifficulte = "facile" | "moyen" | "difficile" | "melange";

/** Les réglages qu'un admin choisit pour une partie. */
export type SalleParams = {
  type: SalleType;
  /** nombre total de questions (questions + calculs), de 5 à 50 */
  nombre: number;
  source: SalleSource;
  /** au moins une matière, sans doublon, dans l'ordre du programme */
  topics: TopicKey[];
  difficulte: SalleDifficulte;
  /** secondes par question, de 15 à 120 */
  temps: number;
  /** part des calculs en %, de 10 à 90 (type « mixte » seulement ; 0 pour questions, 100 pour calculs) */
  partCalculs: number;
};

/** Les réglages tels que le serveur les a gardés : avec ce qui a vraiment été tiré. */
export type SalleParamsStockes = SalleParams & {
  nbQuestions: number;
  nbCalculs: number;
};

// ---------------------------------------------------------------------------
// Les salles

/** Une salle dont je suis membre (liste « Mes salles »). */
export type SalleResume = {
  id: string;
  nom: string;
  description: string | null;
  code: string;
  publique: boolean;
  estAdmin: boolean;
  nbMembres: number;
  /** une partie est en attente ou en cours */
  enCours: boolean;
  derniereActivite: string;
};

/** Une salle publique, à rejoindre depuis la liste. */
export type SallePublique = {
  id: string;
  nom: string;
  description: string | null;
  adminUsername: string | null;
  nbMembres: number;
  enCours: boolean;
  derniereActivite: string;
  dejaMembre: boolean;
};

export type SalleMembre = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  role: "admin" | "membre";
  estAdmin: boolean;
  elo: number | null;
  rejointLe: string;
};

export type SalleInfos = {
  id: string;
  nom: string;
  description: string | null;
  /** le code à partager (visible des membres seulement) */
  code: string;
  publique: boolean;
  adminId: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// La partie

export type SalleStatut = "attente" | "en_cours" | "terminee";

/**
 * Où en est la partie :
 *  - decompte   : avant la question 1 (le serveur laisse 8 s pour s'installer)
 *  - question   : le temps de répondre court
 *  - revelation : le temps est écoulé, on montre la correction (puis la pause)
 *  - fin        : la partie est terminée
 */
export type SallePhase = "decompte" | "question" | "revelation" | "fin";

export type SalleSession = {
  id: string;
  /** 1, 2, 3… dans la salle */
  numero: number;
  statut: SalleStatut;
  params: SalleParamsStockes;
  nb: number;
  /** secondes par question */
  temps: number;
  /** secondes de pause entre deux questions */
  pause: number;
  /** instant d'ouverture de la question 1 (dans le futur pendant le décompte) */
  startedAt: string;
  /** fin de la dernière pause */
  finAt: string;
  /** -1 pendant le décompte, 0..nb-1 la question en cours, nb à la fin */
  index: number;
  phase: SallePhase;
  /** nombre de questions dont l'énoncé est révélé */
  nbVisibles: number;
  /** nombre de questions closes (correction publique, points comptés) */
  nbFermees: number;
  /** combien de joueurs ont déjà répondu à la question en cours */
  reponduCourante: number;
  nbJoueurs: number;
};

export type SalleOrigine = "question" | "calcul";
export type SalleNiveau = "facile" | "moyen" | "difficile";

/** Une question telle que les joueurs la reçoivent : jamais la bonne réponse. */
export type SalleItem = {
  position: number;
  origine: SalleOrigine;
  topic: TopicKey | null;
  difficulte: SalleNiveau | null;
  /** calcul : « Quant · Time value of money » */
  libelle: string | null;
  enonce: string;
  /** QCM : les choix, dans l'ordre */
  choix: string[] | null;
  /** calcul : les données, une par ligne */
  donnees: { label: string; value: string }[] | null;
  /** calcul : l'unité à côté du champ ("%", "$", "x", "years", "bp" ou "") */
  unite: string | null;
  decimales: number | null;
};

/** La correction d'une question close. */
export type SalleCorrection = {
  position: number;
  /** QCM : l'indice de la bonne réponse */
  bonneIndex: number | null;
  /** calcul : la bonne valeur */
  bonneValeur: number | null;
  explication: string | null;
  /** calcul : la correction pas à pas */
  etapes: string[];
};

export type SalleMaReponse = {
  position: number;
  choix: number | null;
  valeur: number | null;
  juste: boolean;
  points: number;
  /** millisecondes entre l'ouverture de la question et ma réponse */
  delaiMs: number;
};

export type SalleClassementLigne = {
  rang: number;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  points: number;
  bonnes: number;
  repondues: number;
  /** temps cumulé sur les bonnes réponses (départage les égalités) */
  tempsMs: number;
};

export type SalleHistorique = {
  sessionId: string;
  numero: number;
  nb: number;
  params: SalleParamsStockes;
  startedAt: string;
  finAt: string;
  nbJoueurs: number;
  gagnant: { userId: string; username: string | null; points: number } | null;
  moi: { rang: number; points: number } | null;
};

/** Ce que renvoie etat_salle (voir migration_salles.sql). */
export type EtatSalle = {
  /** heure du serveur à la réponse : sert à caler l'horloge du navigateur (decalageHorloge) */
  serverNow: string;
  salle: SalleInfos;
  moi: { userId: string; estAdmin: boolean };
  nbMembres: number;
  membres: SalleMembre[];
  /** la dernière partie de la salle (en cours ou terminée), ou null */
  session: SalleSession | null;
  /** les énoncés révélés, à partir de la position demandée */
  items: SalleItem[];
  /** les corrections des questions closes, à partir de la position demandée */
  corrections: SalleCorrection[];
  mesReponses: SalleMaReponse[];
  /** les 50 premiers, sur les questions closes */
  classement: SalleClassementLigne[];
  /** ma ligne du classement, même hors des 50 premiers */
  monClassement: Omit<SalleClassementLigne, "userId" | "username" | "avatarUrl"> | null;
  /** les 5 dernières parties terminées */
  historique: SalleHistorique[];
};

/** Résultat de repondre_salle. */
export type ReponseResultat =
  | {
      ok: true;
      /** la réponse avait déjà été enregistrée : c'est elle qui est rendue */
      deja: boolean;
      juste: boolean;
      points: number;
      delaiMs: number;
      choix: number | null;
      valeur: number | null;
      bonneIndex: number | null;
      bonneValeur: number | null;
      explication: string | null;
      etapes: string[];
    }
  // calcul bon mais à la mauvaise échelle : rien n'est compté, on ressaisit
  | { ok: false; raison: "format"; indice: string };

/** Ce que renvoie lancer_session. */
export type SessionLancee = {
  sessionId: string;
  numero: number;
  nb: number;
  nbQuestions: number;
  nbCalculs: number;
  /** la partie est plus courte que demandée (vivier trop court) */
  manque: boolean;
  startedAt: string;
  serverNow: string;
};

/** Combien de questions la banque offre, par matière (écran de réglages). */
export type QuestionsDisponibles = {
  topic: TopicKey;
  total: number;
  facile: number;
  moyen: number;
  difficile: number;
};

/** Lecture qui ne lève jamais : la donnée, ou la raison de l'échec. */
export type Lecture<T> = { ok: true; data: T } | { ok: false; migrationAbsente: boolean; message: string };

/**
 * Un calcul tiré par le serveur du site, tel que lancer_session le reçoit
 * (avec sa réponse : ne jamais envoyer ceci à un navigateur).
 */
export type CalculPourSalle = {
  topic: TopicKey;
  niveau: SalleNiveau;
  /** « Quant · Time value of money » */
  libelle: string;
  enonce: string;
  donnees: { label: string; value: string }[];
  unite: string;
  decimales: number;
  reponse: number;
  /** tolérance absolue (celle de la question, sinon une demi-unité de la dernière décimale) */
  tolerance: number;
  stricte: boolean;
  /** la correction pas à pas, en français */
  etapes: string[];
};

/**
 * Ce que la carte « Les Salles » de S'affronter reçoit. `pret` faux : la
 * migration n'est pas appliquée (la carte dit que les salles arrivent) ;
 * `erreur` : la migration est là mais la lecture a échoué (listes vides).
 */
export type EntreeSalles = {
  pret: boolean;
  erreur?: boolean;
  publiques: SallePublique[];
  mes: SalleResume[];
};
