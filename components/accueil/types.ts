import type { RatingSource } from "@/lib/rating";

// Données de l'accueil, chargées par app/dashboard/page.tsx et passées telles
// quelles aux composants de présentation (aussi rendus par l'aperçu
// app/preview-da/accueil avec des données d'exemple).

export type WeekDay = { key: string; label: string; count: number; correct: number; isToday: boolean; future: boolean };
export type ActivityWeek = { today: number; days: WeekDay[] };

export type ErrorsSummary = {
  /** false si le journal des réponses n'est pas lisible (migration absente) */
  available: boolean;
  total: number;
  bySubject: { key: string; short: string; count: number; href: string }[];
};

export type ResumeItem = {
  kind: "fiche" | "qcm" | "flashcards" | "practice";
  /** « Finance · CFA I · Equity · fiche page 3 » */
  context: string;
  title: string;
  done: number | null;
  total: number | null;
  /** ce que compte la barre (« questions de la série », « bonnes réponses »…) */
  progressLabel: string;
  /** date ISO de la dernière activité */
  at: string;
  href: string;
  cta: string;
  audio: { href: string; label: string; title: string } | null;
};

export type MockExamCard = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  questionCount: number;
  open: boolean;
  daysLeft: number;
  registered: boolean;
  registrantCount: number;
  /** initiales des premiers inscrits */
  registrants: string[];
};

export type BoardRow = { userId: string; name: string; elo: number; rank: number; me: boolean };

export type TopicStat = {
  key: string;
  name: string;
  code: string;
  /** ta maîtrise, null = pas assez de questions */
  pct: number | null;
  /** moyenne des joueurs, null = inconnue */
  avg: number | null;
};

export type AccueilData = {
  /** pseudo (null si pas encore choisi) */
  name: string | null;
  /** « Bonjour » ou « Bonsoir » */
  hello: string;
  /** « Samedi 3 octobre » */
  dateLabel: string;
  examDaysLeft: number | null;
  examDateLabel: string | null;
  streak: number;
  rating: {
    elo: number;
    gamesPlayed: number;
    leaderboardRank: number | null;
    last: { delta: number; source: RatingSource } | null;
  };
  /** défi reçu en attente (« incoming ») ou duel en cours (« active »), le plus récent */
  incomingDuel: { id: string; from: string | null; kind: "incoming" | "active" } | null;
  resume: ResumeItem | null;
  activity: ActivityWeek;
  dailyGoal: number;
  errors: ErrorsSummary;
  mockExam: MockExamCard | null;
  board: BoardRow[];
  topics: TopicStat[];
  /** maîtrise du programme (lib/mastery programMastery) */
  mastery: number;
  /** maîtrise moyenne des joueurs sur le programme */
  masteryAvg: number | null;
  // Niveau, XP et activité (ancien tableau de bord, gardés plus bas)
  level: { level: number; pct: number; into: number; forNext: number; toNext: number; xpTotal: number };
  xpDays: { day: string; xp: number }[];
  globalAccuracy: number | null;
};
