// Ce que les lectures de components/accueil/queries.ts rendent (l'activité de la
// semaine et le prochain examen blanc), lues par l'accueil « Le lobby »
// (components/accueil/lobby) et par la page de séance (app/session). Le contrat
// de la page elle-même est dans components/accueil/lobby/types.ts.

export type WeekDay = { key: string; label: string; count: number; correct: number; isToday: boolean; future: boolean };
/** `activeDays` : jours (Paris) avec au moins une réponse, sur les 8 derniers jours au moins (série). */
export type ActivityWeek = { today: number; days: WeekDay[]; activeDays?: string[] };

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
