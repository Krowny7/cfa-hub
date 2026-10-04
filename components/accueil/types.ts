import type { RatingSource } from "@/lib/rating";
import type { TodayDaily } from "@/lib/daily";
import type { EtatJour } from "@/lib/voice";
import type { EtatObjectif } from "@/lib/objectif";

export type { TodayDaily } from "@/lib/daily";

/** Un duel terminé, à revoir (lib/duels getReviewableDuels). */
export type ReviewDuel = {
  id: string;
  opponentName: string | null;
  myScore: number | null;
  theirScore: number | null;
  total: number;
  myDelta: number | null;
  /** true : gagné · false : perdu · null : nulle */
  won: boolean | null;
  finishedAt: string;
};

// Données de l'accueil, chargées par app/dashboard/page.tsx et passées telles
// quelles aux composants de présentation (aussi rendus par l'aperçu
// app/preview-da/accueil avec des données d'exemple).

export type WeekDay = { key: string; label: string; count: number; correct: number; isToday: boolean; future: boolean };
/** `activeDays` : jours (Paris) avec au moins une réponse, sur les 8 derniers jours au moins (série). */
export type ActivityWeek = { today: number; days: WeekDay[]; activeDays?: string[] };

export type ErrorsSummary = {
  /** false si le journal des réponses n'est pas lisible (migration absente) */
  available: boolean;
  total: number;
  /** questions de fiches déjà tentées (0 : jamais joué, « page propre » n'a pas de sens) */
  answered?: number;
  bySubject: { key: string; short: string; count: number; href: string }[];
};

export type ResumeItem = {
  kind: "fiche" | "qcm" | "flashcards" | "practice";
  /** « Equity · fiche page 3 » (le domaine et le programme sont implicites) */
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

export type TopicStat = {
  key: string;
  name: string;
  /** nom court (téléphone) */
  short: string;
  code: string;
  /** ta maîtrise, null = pas assez de questions */
  pct: number | null;
  /** moyenne des joueurs, null = inconnue */
  avg: number | null;
};

export type AccueilData = {
  /** pseudo (null si pas encore choisi) */
  name: string | null;
  /** « Bonjour » ou « Bonsoir » (repli : le titre suit l'anneau du jour, voir titreAccueil) */
  hello: string;
  /** « Samedi 3 octobre » */
  dateLabel: string;
  /** jour de Paris, « AAAA-MM-JJ » (sceau du jour) */
  dayKey: string;
  /** heure de Paris, 0–23 (l'encre qui sèche le soir) */
  hour: number;
  examDaysLeft: number | null;
  examDateLabel: string | null;
  /** jours d'encre : aujourd'hui compris s'il est fait, sinon jusqu'à hier (calcStreakAndToday) */
  streak: number;
  /** le bâton du jour : fait, en attente, ou sec le soir (etatDuJour) */
  dayState: EtatJour;
  /** déjà venu au moins une fois (une série perdue se dit « l'encre a séché ») */
  seenBefore: boolean;
  /** variante « retour » : JOURS_RETOUR jours ou plus sans activité */
  returning: boolean;
  /** défi du jour (lib/daily getTodayDaily) ; null : non chargé */
  daily: TodayDaily | null;
  /** le dernier duel terminé, encore frais (à revoir) */
  reviewDuel: ReviewDuel | null;
  /** instant du rendu (ISO), pour les échéances des tuiles */
  nowIso: string;
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
  /** l'objectif de questions d'ici l'examen (onglet « Objectif » de « Ta progression ») */
  objectif: EtatObjectif;
  errors: ErrorsSummary;
  /** prochain examen blanc classé (l'accueil ne le montre qu'à 7 jours ou moins) */
  mockExam: MockExamCard | null;
  topics: TopicStat[];
  /** maîtrise du programme (lib/mastery programMastery) */
  mastery: number;
  /** maîtrise moyenne des joueurs sur le programme */
  masteryAvg: number | null;
};
