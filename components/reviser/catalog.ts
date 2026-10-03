import { COURSES } from "@/lib/courses";

// Catalogue des 10 matières du CFA Niveau I, dans l'ordre officiel : nom
// anglais (celui des fiches et des cours), code court (axes du radar) et
// où trouver chaque format. La clé est celle de lib/practiceTopics.ts.
// Les fiches sont celles qui existent sous app/fiches/ ; les cours sont lus
// dans lib/courses.ts (un cours ajouté là apparaît tout seul) ; les
// flashcards sont comptées en base, par dossier « (Système) ».
// Module neutre (pas de "use client").

export type Subject = {
  key: string;
  name: string;
  /** code court pour les axes du radar */
  code: string;
  /** libellé court pour les pastilles (« FSA · 5 ») */
  short: string;
  /** slug de /fiches/<slug>, null si pas encore de fiche */
  fiche: string | null;
  /** début du titre des quiz de fiche : « <prefix> — Drill Fiche Page N (thème) » */
  drillPrefix: string | null;
  /** slug du cours complet (lib/courses.ts), null si pas encore de cours */
  course: string | null;
  /** dossiers de flashcards officielles possibles pour la matière */
  flashcardFolders: string[];
};

type Def = Omit<Subject, "course"> & { courseTitle: string };

const DEFS: Def[] = [
  { key: "ethics", name: "Ethics", code: "ETH", short: "Ethics", fiche: null, drillPrefix: null, courseTitle: "Ethical and Professional Standards", flashcardFolders: ["Éthique et Standards Professionnels (Système)", "Ethics (Système)"] },
  { key: "quant", name: "Quantitative Methods", code: "QM", short: "Quant", fiche: null, drillPrefix: null, courseTitle: "Quantitative Methods", flashcardFolders: ["Méthodes Quantitatives (Système)", "Quantitative Methods (Système)"] },
  { key: "economics", name: "Economics", code: "ECO", short: "Economics", fiche: null, drillPrefix: null, courseTitle: "Economics", flashcardFolders: ["Économie (Système)", "Economics (Système)"] },
  { key: "corporate", name: "Corporate Issuers", code: "CI", short: "Corporate", fiche: null, drillPrefix: null, courseTitle: "Corporate Issuers", flashcardFolders: ["Finance d'Entreprise (Système)", "Corporate Issuers (Système)"] },
  { key: "fsa", name: "Financial Statement Analysis", code: "FSA", short: "FSA", fiche: "financial-statement-analysis", drillPrefix: "Financial Statement Analysis", courseTitle: "Financial Statement Analysis", flashcardFolders: ["Financial Statement Analysis (Système)", "Analyse des États Financiers (Système)"] },
  { key: "equity", name: "Equity Investments", code: "EQ", short: "Equity", fiche: "equity", drillPrefix: "Equity", courseTitle: "Equity Investments", flashcardFolders: ["Equity (Système)", "Investissements en Actions (Système)"] },
  { key: "fixed_income", name: "Fixed Income", code: "FI", short: "Fixed Income", fiche: "fixed-income", drillPrefix: "Fixed Income", courseTitle: "Fixed Income", flashcardFolders: ["Fixed Income (Système)"] },
  { key: "derivatives", name: "Derivatives", code: "DER", short: "Derivatives", fiche: "derivatives", drillPrefix: null, courseTitle: "Derivatives", flashcardFolders: ["Instruments Dérivés (Système)", "Derivatives (Système)"] },
  { key: "alternatives", name: "Alternative Investments", code: "ALT", short: "Alternatives", fiche: null, drillPrefix: null, courseTitle: "Alternative Investments", flashcardFolders: ["Investissements Alternatifs (Système)", "Alternative Investments (Système)"] },
  { key: "portfolio", name: "Portfolio Management", code: "PM", short: "Portfolio", fiche: "portfolio-management", drillPrefix: "Portfolio Management", courseTitle: "Portfolio Management", flashcardFolders: ["Portfolio Management (Système)", "Gestion de Portefeuille (Système)"] },
];

export const SUBJECTS: Subject[] = DEFS.map(({ courseTitle, ...d }) => ({
  ...d,
  course: COURSES.find((c) => c.title === courseTitle)?.slug ?? null,
}));

export function subjectByKey(key: string) {
  return SUBJECTS.find((s) => s.key === key) ?? null;
}

/** Matière d'un quiz de fiche, d'après le début de son titre. */
export function subjectByDrillTitle(title: string) {
  return SUBJECTS.find((s) => s.drillPrefix && title.startsWith(s.drillPrefix + " — ")) ?? null;
}

/** Découpe « <matière> — Drill Fiche Page N (thème) ». */
export function parseDrillTitle(title: string): { page: number | null; theme: string | null } {
  const m = /Page ([0-9]+)(?: \((.+)\))?/.exec(title);
  return { page: m ? Number(m[1]) : null, theme: m?.[2] ?? null };
}

/** Matière d'un dossier de flashcards officielles. */
export function subjectByFlashcardFolder(folder: string) {
  return SUBJECTS.find((s) => s.flashcardFolders.includes(folder)) ?? null;
}

/** Disponibilité réelle de chaque format pour une matière (comptée par la page). */
export type SubjectAvailability = {
  key: string;
  name: string;
  /** maîtrise 0–100, null = pas assez de questions */
  pct: number | null;
  fiche: string | null;
  course: string | null;
  /** lien vers les flashcards officielles de la matière, null si aucune */
  flashcards: string | null;
  flashcardSets: number;
};
