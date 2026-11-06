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
 * tirent leurs questions, plus les mocks officiels) ; `examen` = un ou
 * plusieurs mocks officiels choisis session par session (voir SalleMock).
 * Sans effet pour les calculs.
 */
export type SalleSource = "banque" | "mocks" | "examen";

export type SalleDifficulte = "facile" | "moyen" | "difficile" | "melange";

/** Les questions d'origine du mock, ses variantes, ou les deux. */
export type SalleMockVersion = "base" | "variantes" | "tout";
/** Dans l'ordre de l'examen (les variantes après, par matière) ou mélangées. */
export type SalleMockOrdre = "examen" | "melange";

/** Les réglages d'une partie sur mocks officiels (source `examen`). */
export type SalleMock = {
  /** les sessions choisies : « Mock A — Session 1 »… (au moins une) */
  examens: string[];
  version: SalleMockVersion;
  /** toute la sélection, ou `nombre` questions tirées au hasard */
  complet: boolean;
  ordre: SalleMockOrdre;
};

/** Ce qu'offre une session de mock dans une matière (écran de réglages). */
export type MockDisponible = {
  /** « Mock A — Session 1 » */
  examen: string;
  topic: TopicKey;
  base: number;
  variantes: number;
};

/**
 * Le chrono d'une partie : `question` = une question à la fois, son temps et
 * sa correction tout de suite (le mode d'origine) ; `global` = comme les 30 du
 * jour, toutes les questions ouvertes d'un coup, un seul chrono (nombre ×
 * temps), la correction et le classement à la fin.
 */
export type SalleChrono = "question" | "global";

/** Les réglages qu'un admin choisit pour une partie. */
export type SalleParams = {
  type: SalleType;
  /** nombre total de questions (questions + calculs), de 5 à 50 */
  nombre: number;
  source: SalleSource;
  /** au moins une matière, sans doublon, dans l'ordre du programme */
  topics: TopicKey[];
  difficulte: SalleDifficulte;
  /** secondes par question, de 15 à 120 (en chrono global : le temps moyen, le chrono total vaut nombre × temps) */
  temps: number;
  /** part des calculs en %, de 10 à 90 (type « mixte » seulement ; 0 pour questions, 100 pour calculs) */
  partCalculs: number;
  /** source `examen` seulement : quels mocks, et comment */
  mock?: SalleMock;
  /** par question (défaut) ou global ; absent = par question */
  chrono?: SalleChrono;
  /** le choix par notion : les questions sont tirées là, à parts égales ; absent = toutes celles des matières */
  notions?: string[];
  concepts?: string[];
  /** la partie découpée en rounds, que l'admin lance un par un ; absent : une seule partie */
  rounds?: number;
};

/** Les réglages tels que le serveur les a gardés : avec ce qui a vraiment été tiré. */
export type SalleParamsStockes = SalleParams & {
  nbQuestions: number;
  nbCalculs: number;
  /** le round que joue cette partie, si elle en a */
  round?: number;
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
  /** ceux qui sont sur la page en ce moment ; à zéro, la salle est inactive */
  nbPresents: number;
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
  nbPresents: number;
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
 *  - question   : le temps de répondre court (chrono global : toutes les questions sont ouvertes)
 *  - revelation : le temps est écoulé, on montre la correction (puis la pause) ; jamais en chrono global
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
  /** -1 pendant le décompte, 0..nb-1 la question en cours, nb à la fin (chrono global : 0 tant que la partie court) */
  index: number;
  phase: SallePhase;
  /** nombre de questions dont l'énoncé est révélé */
  nbVisibles: number;
  /** nombre de questions closes (correction publique, points comptés) ; chrono global : 0 jusqu'à la fin, puis nb */
  nbFermees: number;
  /** combien de joueurs ont déjà répondu à la question en cours */
  reponduCourante: number;
  nbJoueurs: number;
  /** par question ou global (lu dans la session ; « question » pour une partie d'avant le réglage) */
  chrono: SalleChrono;
  /**
   * chrono global : combien de réponses chaque joueur a données (jamais lesquelles) et s'il a
   * rendu sa copie (migration_salles_rendre_copie.sql) ; null en chrono par question
   */
  avancement: { userId: string; n: number; rendu: boolean }[] | null;
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
  /** la question d'origine, pour la marquer ; rien pour un calcul */
  questionId?: string | null;
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
  /** null : chrono global, partie pas finie (la justesse reste cachée jusqu'à la fin) */
  juste: boolean | null;
  /** null : chrono global, partie pas finie */
  points: number | null;
  /** millisecondes entre l'ouverture de la question (chrono global : le départ) et ma réponse */
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

/** Une ligne du classement général d'une partie en rounds. */
export type SalleSerieLigne = SalleClassementLigne & {
  /** sa place avant le dernier round joué */
  rangAvant: number;
  /** ses points du dernier round joué */
  pointsRound: number;
  pointsAvant: number;
  /** ses points, round par round */
  parRound: Record<number, number>;
};

/** Une partie en rounds : chaque round est une partie, leurs points s'additionnent. */
export type SalleSerie = {
  id: string;
  /** le round de la dernière partie */
  round: number;
  rounds: number;
  /** plus de round à lancer : le dernier est parti, ou l'admin s'est arrêté là */
  finie: boolean;
  /** quand l'admin s'est arrêté là */
  termineeAt: string | null;
  /** les rounds finis où j'ai répondu : de quoi rouvrir leur copie */
  parties: { round: number; sessionId: string }[];
  /** combien de questions compte le round suivant */
  prochain: number;
  /** combien de questions ont été jouées, tous rounds confondus */
  total: number;
  /** à la fin d'un round ; pendant le décompte du suivant, celui d'avant ; vide pendant le jeu */
  classement: SalleSerieLigne[];
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
  /** la partie en rounds de la dernière partie, s'il y en a une */
  serie?: SalleSerie | null;
};

/** Résultat de repondre_salle. */
export type ReponseResultat =
  | {
      ok: true;
      /** la réponse avait déjà été enregistrée : c'est elle qui est rendue */
      deja: boolean;
      /**
       * chrono global : la réponse est enregistrée mais rien n'est révélé
       * (juste vaut false, points 0, aucune correction) avant la fin de la partie
       */
      masque?: boolean;
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

/**
 * Ce que renvoie rendre_copie (chrono global) : combien de membres de la salle
 * ont rendu leur copie, sur combien ; `terminee` : tout le monde l'a rendue, la
 * partie est finie (la prochaine lecture d'etat_salle ouvre la correction).
 */
export type CopieRendue = {
  rendus: number;
  membres: number;
  terminee: boolean;
};

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

/** Une ligne de l'aperçu de S'affronter. `mienne` : le joueur en est membre. */
export type ApercuSalle = {
  id: string;
  nom: string;
  nbPresents: number;
  enCours: boolean;
  mienne: boolean;
};

/**
 * Ce que la carte « Les Salles » de S'affronter reçoit. `pret` faux : la
 * migration n'est pas appliquée (la carte dit que les salles arrivent).
 * `apercu` : les salles du moment, pour la carte d'aperçu ; absent : lecture en échec.
 */
export type EntreeSalles = {
  pret: boolean;
  apercu?: { salles: ApercuSalle[]; total: number; enCours: number } | null;
};
