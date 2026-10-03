// Données reçues par les composants de l'espace Moi (props sérialisables).
import type { MyRank } from "@/components/classement/types";
import type { AnswerStats } from "@/lib/answer-stats";

export type FicheErrorItem = {
  questionId: string;
  setId: string;
  prompt: string;
  fiche: string;
  href: string;
  page: number | null;
  /** nombre de fois ratée */
  wrong: number;
  lastWrongAt: string;
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
  kind: "qcm" | "flashcards" | "practice";
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
  streak: number;
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
  /** dernières sessions, les plus récentes d'abord (vide : repli sur le navigateur) */
  sessions: SessionItem[];
  /** questions répondues, toutes sources, matière → thème → passage (lib/answer-stats) */
  answers: AnswerStats;
};
