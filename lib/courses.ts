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
  {
    slug: "equity",
    title: "Equity Investments",
    file: "equity",
    pages: 82,
    minutes: 65,
    chapters: [
      { title: "Market Organization and Structure", start: 0 },
      { title: "Security Market Indexes", start: 782.7 },
      { title: "Market Efficiency", start: 1296 },
      { title: "Overview of Equity Securities", start: 1722.2 },
      { title: "Company Analysis: Past and Present", start: 2155.6 },
      { title: "Industry and Competitive Analysis", start: 2490 },
      { title: "Company Analysis: Forecasting", start: 2910.7 },
      { title: "Equity Valuation: Concepts and Basic Tools", start: 3210.6 },
    ],
  },
  {
    slug: "derivatives",
    title: "Derivatives",
    file: "derivatives",
    pages: 72,
    minutes: 63,
    chapters: [
      { title: "Derivative Instrument and Derivative Market Features", start: 0 },
      { title: "Forward Commitment and Contingent Claim Features and Instruments", start: 360.6 },
      { title: "Derivative Benefits, Risks, and Issuer and Investor Uses", start: 840.2 },
      { title: "Arbitrage, Replication, and the Cost of Carry in Pricing Derivatives", start: 1195.7 },
      { title: "Pricing and Valuation of Forward Contracts and for an Underlying with Varying Maturities", start: 1624.1 },
      { title: "Pricing and Valuation of Futures Contracts", start: 1996.3 },
      { title: "Pricing and Valuation of Interest Rate and Other Swaps", start: 2295 },
      { title: "Pricing and Valuation of Options", start: 2646.8 },
      { title: "Option Replication Using Put–Call Parity", start: 3006.7 },
      { title: "Valuing a Derivative Using a One-Period Binomial Model", start: 3401.2 },
    ],
  },
  {
    slug: "portfolio-management",
    title: "Portfolio Management",
    file: "portfolio-management",
    pages: 71,
    minutes: 64,
    chapters: [
      { title: "Portfolio Risk and Return: Part I", start: 0 },
      { title: "Portfolio Risk and Return: Part II", start: 863.6 },
      { title: "Portfolio Management: An Overview", start: 1621.7 },
      { title: "Basics of Portfolio Planning and Construction", start: 2159.3 },
      { title: "The Behavioral Biases of Individuals", start: 2743.6 },
      { title: "Introduction to Risk Management", start: 3243 },
    ],
  },
  {
    slug: "ethics",
    title: "Ethical and Professional Standards",
    file: "ethics",
    pages: 63,
    minutes: 65,
    chapters: [
      { title: "Ethics and Trust in the Investment Profession", start: 0 },
      { title: "Code of Ethics and Standards of Professional Conduct", start: 537.7 },
      { title: "Guidance for Standards I–VII", start: 995.3 },
      { title: "Introduction to the Global Investment Performance Standards (GIPS)", start: 2905.6 },
      { title: "Ethics Application", start: 3326.4 },
    ],
  },
  {
    slug: "quantitative-methods",
    title: "Quantitative Methods",
    file: "quantitative-methods",
    pages: 90,
    minutes: 66,
    chapters: [
      { title: "Rates and Returns", start: 0 },
      { title: "Time Value of Money in Finance", start: 493.2 },
      { title: "Statistical Measures of Asset Returns", start: 986.8 },
      { title: "Probability Trees and Conditional Expectations", start: 1475.8 },
      { title: "Portfolio Mathematics", start: 1820.1 },
      { title: "Simulation Methods", start: 2134.7 },
      { title: "Estimation and Inference", start: 2344.7 },
      { title: "Hypothesis Testing", start: 2633.9 },
      { title: "Parametric and Non-Parametric Tests of Independence", start: 3033.6 },
      { title: "Simple Linear Regression", start: 3317.8 },
      { title: "Introduction to Big Data Techniques", start: 3728.3 },
    ],
  },
  {
    slug: "alternative-investments",
    title: "Alternative Investments",
    file: "alternative-investments",
    pages: 52,
    minutes: 65,
    chapters: [
      { title: "Alternative Investment Features, Methods, and Structures", start: 0 },
      { title: "Alternative Investment Performance and Returns", start: 638.6 },
      { title: "Investments in Private Capital: Equity and Debt", start: 1374.3 },
      { title: "Real Estate and Infrastructure", start: 1887 },
      { title: "Natural Resources", start: 2411.5 },
      { title: "Hedge Funds", start: 2895.3 },
      { title: "Introduction to Digital Assets", start: 3348.8 },
    ],
  },
  {
    slug: "economics",
    title: "Economics",
    file: "economics",
    pages: 70,
    minutes: 66,
    chapters: [
      { title: "The Firm and Market Structures", start: 0 },
      { title: "Understanding Business Cycles", start: 836.7 },
      { title: "Fiscal Policy", start: 1233.4 },
      { title: "Monetary Policy", start: 1698.4 },
      { title: "Introduction to Geopolitics", start: 2185 },
      { title: "International Trade", start: 2623.5 },
      { title: "Capital Flows and the FX Market", start: 3002.2 },
      { title: "Exchange Rate Calculations", start: 3427.1 },
    ],
  },
  {
    slug: "corporate-issuers",
    title: "Corporate Issuers",
    file: "corporate-issuers",
    pages: 60,
    minutes: 66,
    chapters: [
      { title: "Organizational Forms, Corporate Issuer Features, and Ownership", start: 0 },
      { title: "Investors and Other Stakeholders", start: 523.3 },
      { title: "Corporate Governance: Conflicts, Mechanisms, Risks, and Benefits", start: 898.9 },
      { title: "Working Capital and Liquidity", start: 1382.9 },
      { title: "Capital Investments and Capital Allocation", start: 2017.5 },
      { title: "Capital Structure", start: 2689.1 },
      { title: "Business Models", start: 3445.1 },
    ],
  },
];

export function getCourse(slug: string) {
  return COURSES.find((c) => c.slug === slug) ?? null;
}
