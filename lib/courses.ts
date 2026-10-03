import type { Chapter } from "@/components/CourseAudioPlayer";

// Cours complets : un deck PDF + un audio narré (un seul fichier compilé,
// voix edge-tts « Rémy », ~1 h) par matière, dans le bucket privé
// "courses" sous `<file>.pdf` et `<file>.mp3` (envoi : scripts/upload-course.mjs).
// Les chapitres sont les débuts (en secondes) de chaque Learning Module dans
// l'audio compilé, calculés à partir de la durée exacte de chaque module au
// moment de la génération.
export type Course = {
  slug: string;
  title: string;
  file: string;
  pages: number;
  minutes: number;
  chapters: Chapter[];
};

// Ordre officiel des matières du CFA Level I
export const COURSE_TOPICS = [
  "Ethical and Professional Standards",
  "Quantitative Methods",
  "Economics",
  "Corporate Issuers",
  "Financial Statement Analysis",
  "Equity Investments",
  "Fixed Income",
  "Derivatives",
  "Alternative Investments",
  "Portfolio Management",
] as const;

export const COURSES: Course[] = [
  {
    slug: "financial-statement-analysis",
    title: "Financial Statement Analysis",
    file: "financial-statement-analysis",
    pages: 100,
    minutes: 61,
    chapters: [
      { title: "Introduction to Financial Statement Analysis", start: 0 },
      { title: "Analyzing Income Statements", start: 371.6 },
      { title: "Analyzing Balance Sheets", start: 735.6 },
      { title: "Analyzing Statements of Cash Flows I", start: 1026.5 },
      { title: "Analyzing Statements of Cash Flows II", start: 1278.4 },
      { title: "Analysis of Inventories", start: 1536.6 },
      { title: "Analysis of Long-Term Assets", start: 1804.1 },
      { title: "Topics in Long-Term Liabilities and Equity", start: 2138.1 },
      { title: "Analysis of Income Taxes", start: 2458.6 },
      { title: "Financial Reporting Quality", start: 2728.3 },
      { title: "Financial Analysis Techniques", start: 2951.8 },
      { title: "Introduction to Financial Statement Modeling", start: 3366 },
    ],
  },
];

export function getCourse(slug: string) {
  return COURSES.find((c) => c.slug === slug) ?? null;
}
