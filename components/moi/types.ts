// Données reçues par les composants de l'espace Moi (props sérialisables).
import type { MyRank } from "@/components/classement/types";
import type { AnswerStats } from "@/lib/answer-stats";
import type { EtatObjectif } from "@/lib/objectif";
import type { EtatJour } from "@/lib/voice";
import type { Marquees } from "@/components/moi/marquees-data";
import type { Ratures } from "@/components/moi/ratures-data";
import type { PointsFaiblesData } from "@/lib/points-faibles";

export type FicheErrorItem = {
  questionId: string;
  setId: string;
  prompt: string;
  fiche: string;
  href: string;
  page: number | null;
  /** nombre de fois manquée */
  wrong: number;
  lastWrongAt: string;
  /** rayée : date de la dernière rayure (sortie du carnet) ; absent pour une rature à reprendre */
  clearedAt?: string | null;
};

export type FicheErrorGroup = { fiche: string; href: string; count: number; pages: number[] };

export type FicheErrors = {
  /** false : journal pas encore activé sur le compte (réponses gardées dans le navigateur) */
  available: boolean;
  /** questions à revoir, toutes fiches confondues */
  total: number;
  /** questions de fiches déjà tentées */
  answered: number;
  groups: FicheErrorGroup[];
  /** les plus récentes d'abord (liste tronquée) */
  items: FicheErrorItem[];
  /** les dernières questions rayées (sorties du carnet), la plus récente d'abord : on raye, on n'efface pas */
  rayees: FicheErrorItem[];
  /** rayures (une question peut être rayée plusieurs fois) : ces 7 derniers jours, et depuis le début */
  reprises: { semaine: number; total: number };
};

export type TopicStat = {
  key: string;
  label: string;
  /** libellé court (radar) */
  short: string;
  pct: number | null;
  answered: number;
  /** moyenne des joueurs, null si inconnue */
  avg: number | null;
};

/** Une session terminée (QCM, flashcards ou entraînement ciblé). */
export type SessionItem = {
  id: string;
  kind: "qcm" | "flashcards" | "practice" | "eclair";
  title: string;
  correct: number;
  total: number;
  at: string;
  /** « il y a 2 h », calculé côté serveur (évite un écart à l'hydratation) */
  ago: string;
  href: string | null;
};

export type MoiData = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** date d'examen (AAAA-MM-JJ), null si pas fixée */
  examDate: string | null;
  /** jours d'encre (aujourd'hui compris s'il est fait, sinon jusqu'à hier) */
  streak: number;
  /** le bâton du jour : fait, en attente, ou sec le soir (etatDuJour) */
  dayState: EtatJour;
  xpTotal: number;
  level: number;
  /** progression dans le niveau, 0–100 */
  levelPct: number;
  xpToNextLevel: number;
  xpWeek: number;
  /** XP et jours actifs sur les 30 derniers jours */
  xp30: number;
  activeDays30: number;
  xpDays: { day: string; xp: number }[];
  me: MyRank;
  topics: TopicStat[];
  errors: FicheErrors;
  /** le carnet de ratures, toutes sources (available : false tant que la migration manque : l'onglet garde `errors`) */
  ratures: Ratures;
  /** dernières sessions, les plus récentes d'abord (vide : repli sur le navigateur) */
  sessions: SessionItem[];
  /** questions répondues, toutes sources, matière → thème → passage (lib/answer-stats) */
  answers: AnswerStats;
  /** l'objectif de questions d'ici l'examen (courbe, ou proposition d'en fixer un) */
  objectif: EtatObjectif;
  /** les questions marquées (Moi › Marquées) */
  marquees: Marquees;
  /** « Tes points faibles » (en tête de Stats ; absent : pas de carte) */
  pointsFaibles?: PointsFaiblesData;
};
