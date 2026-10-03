// Données reçues par les composants de l'espace Classement (props
// sérialisables : la page serveur les charge, la page d'aperçu les invente).
import type { DuelSummary, RatingEvent } from "@/lib/rating";

export type BoardRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  rank: number;
  /** maîtrise du programme 0–100, null si inconnue */
  mastery: number | null;
  /** variation d'ELO au dernier match, null si aucun */
  lastDelta: number | null;
  isMe: boolean;
};

export type NextExam = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  questionCount: number;
  status: "draft" | "open" | "closed";
  registered: boolean;
  /** nombre d'inscrits (null si inconnu) */
  registrants: number | null;
  /** la fenêtre de passage est ouverte en ce moment */
  windowOpen: boolean;
  windowEnd: string;
};

export type MyRank = {
  elo: number;
  gamesPlayed: number;
  /** maîtrise du programme 0–100 */
  mastery: number;
  /** place au classement (1 = premier), null si pas encore de ligne */
  leaderboardRank: number | null;
  /** joueurs au classement, null si inconnu */
  totalPlayers: number | null;
};

export type ClassementData = {
  me: MyRank;
  history: RatingEvent[];
  board: BoardRow[];
  /** ma ligne si je ne suis pas dans `board` */
  meRow: BoardRow | null;
  exam: NextExam | null;
  openDuels: DuelSummary[];
  recentDuels: DuelSummary[];
};
