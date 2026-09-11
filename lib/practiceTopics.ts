// Poids officiels du curriculum CFA Level I (milieu de chaque fourchette),
// mêmes valeurs et mêmes topics que publish_mock_exam — voir
// migration_mock_exam_weighted_selection.sql / migration_practice_sessions.sql.
// Module partagé (pas de "use client") pour être importable aussi bien par
// components/PracticeSession.tsx que par des Server Components
// (app/people/[id]/page.tsx) sans dupliquer la liste des topics.
export const TOPICS = [
  { key: "ethics", label: "Éthique et Standards Professionnels", weight: 17.5 },
  { key: "quant", label: "Méthodes Quantitatives", weight: 7.5 },
  { key: "economics", label: "Économie", weight: 7.5 },
  { key: "fsa", label: "Analyse des États Financiers", weight: 12.5 },
  { key: "corporate", label: "Finance d'Entreprise", weight: 7.5 },
  { key: "equity", label: "Investissements en Actions", weight: 12.5 },
  { key: "fixed_income", label: "Fixed Income", weight: 12.5 },
  { key: "derivatives", label: "Instruments Dérivés", weight: 6.5 },
  { key: "alternatives", label: "Investissements Alternatifs", weight: 8.5 },
  { key: "portfolio", label: "Gestion de Portefeuille", weight: 10.0 },
] as const;

export const TOPIC_LABELS: Record<string, string> = Object.fromEntries(TOPICS.map((t) => [t.key, t.label]));

export function topicLabel(key: string) {
  return TOPIC_LABELS[key] ?? key;
}

export type TrophyTier = { key: string; label: string; className: string };

// Trophée coloré selon le nombre de sujets choisis pour la session — plus on
// couvre de topics à la fois, plus le trophée "monte en grade".
export function trophyTier(topicCount: number): TrophyTier {
  if (topicCount >= 7) return { key: "diamond", label: "Diamant", className: "text-cyan-300" };
  if (topicCount >= 4) return { key: "gold", label: "Or", className: "text-yellow-400" };
  if (topicCount >= 2) return { key: "silver", label: "Argent", className: "text-slate-300" };
  return { key: "bronze", label: "Bronze", className: "text-amber-600" };
}

export const TROPHY_TIER_ORDER: TrophyTier[] = [
  { key: "bronze", label: "Bronze", className: "text-amber-600" },
  { key: "silver", label: "Argent", className: "text-slate-300" },
  { key: "gold", label: "Or", className: "text-yellow-400" },
  { key: "diamond", label: "Diamant", className: "text-cyan-300" },
];
