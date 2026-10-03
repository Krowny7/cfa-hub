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
  {
    slug: "fixed-income",
    title: "Fixed Income",
    file: "fixed-income",
    pages: 122,
    minutes: 74,
    chapters: [
      { title: "Fixed-Income Instrument Features", start: 0 },
      { title: "Fixed-Income Cash Flows and Types", start: 175 },
      { title: "Fixed-Income Issuance and Trading", start: 484.8 },
      { title: "Fixed-Income Markets for Corporate Issuers", start: 665.6 },
      { title: "Fixed-Income Markets for Government Issuers", start: 911.2 },
      { title: "Fixed-Income Bond Valuation: Prices and Yields", start: 1112.8 },
      { title: "Yield and Yield Spread Measures for Fixed-Rate Bonds", start: 1408.8 },
      { title: "Yield and Yield Spread Measures for Floating-Rate Instruments", start: 1660.4 },
      { title: "The Term Structure of Interest Rates: Spot, Par, and Forward Curves", start: 1885.9 },
      { title: "Interest Rate Risk and Return", start: 2141.3 },
      { title: "Yield-Based Bond Duration Measures and Properties", start: 2383.8 },
      { title: "Yield-Based Bond Convexity and Portfolio Properties", start: 2618.9 },
      { title: "Curve-Based and Empirical Fixed-Income Risk Measures", start: 2840.8 },
      { title: "Credit Risk", start: 3099.9 },
      { title: "Credit Analysis for Government Issuers", start: 3344.4 },
      { title: "Credit Analysis for Corporate Issuers", start: 3489 },
      { title: "Fixed-Income Securitization", start: 3696.6 },
      { title: "Asset-Backed Security (ABS) Instrument and Market Features", start: 3864.4 },
      { title: "Mortgage-Backed Security (MBS) Instrument and Market Features", start: 4098.4 },
    ],
  },
];

export function getCourse(slug: string) {
  return COURSES.find((c) => c.slug === slug) ?? null;
}
