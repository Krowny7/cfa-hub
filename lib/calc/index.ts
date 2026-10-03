// Registre des exercices de calcul pur : les 10 matières du CFA Niveau I
// (dans l'ordre du programme), leur adresse sous /calculs, et le catalogue
// de chaque matière ouverte (lib/calc/<matière>.ts).
//
// Côté serveur seulement : ce module importe les catalogues complets, avec
// les réponses et les corrections. Les écrans (composants client) ne
// reçoivent que des résumés (typeMeta) et des questions sans réponse
// (publicQuestion, dans engine.ts). Pas de « use client » ici, et aucun
// composant client ne doit l'importer.

import type { CalcCatalog, CalcLevel, CalcQuestion, CalcTopic, CalcType } from "./types";
import { CALC_LEVELS } from "./types";
import { EQUITY_CALC } from "./equity";
import { PORTFOLIO_CALC } from "./portfolio";

export type CalcSubject = {
  topic: CalcTopic;
  /** segment d'URL : /calculs/<slug> */
  slug: string;
  /** nom du site (anglais, comme Réviser) */
  name: string;
  short: string;
};

export const CALC_SUBJECTS: CalcSubject[] = [
  { topic: "ethics", slug: "ethics", name: "Ethics", short: "Ethics" },
  { topic: "quant", slug: "quant", name: "Quantitative Methods", short: "Quant" },
  { topic: "economics", slug: "economics", name: "Economics", short: "Economics" },
  { topic: "corporate", slug: "corporate-issuers", name: "Corporate Issuers", short: "Corporate" },
  { topic: "fsa", slug: "fsa", name: "Financial Statement Analysis", short: "FSA" },
  { topic: "equity", slug: "equity", name: "Equity Investments", short: "Equity" },
  { topic: "fixed_income", slug: "fixed-income", name: "Fixed Income", short: "Fixed Income" },
  { topic: "derivatives", slug: "derivatives", name: "Derivatives", short: "Derivatives" },
  { topic: "alternatives", slug: "alternatives", name: "Alternative Investments", short: "Alternatives" },
  { topic: "portfolio", slug: "portfolio-management", name: "Portfolio Management", short: "Portfolio" },
];

// Les catalogues ouverts. Une matière sans catalogue s'affiche « bientôt ».
const CATALOGS: Partial<Record<CalcTopic, CalcCatalog>> = {
  equity: EQUITY_CALC,
  portfolio: PORTFOLIO_CALC,
};

export const calcSubject = (topic: CalcTopic) => CALC_SUBJECTS.find((s) => s.topic === topic) ?? null;
export const calcSubjectBySlug = (slug: string) => CALC_SUBJECTS.find((s) => s.slug === slug) ?? null;

/** Le catalogue d'une matière, sans types vides. */
export function calcCatalog(topic: CalcTopic): CalcCatalog | null {
  const c = CATALOGS[topic];
  if (!c) return null;
  const types = c.types.filter((t) => t.questions.length > 0);
  return types.length ? { topic, types } : null;
}

export const isCalcOpen = (topic: CalcTopic) => calcCatalog(topic) !== null;

export function calcType(topic: CalcTopic, key: string): CalcType | null {
  return calcCatalog(topic)?.types.find((t) => t.key === key) ?? null;
}

// Index des questions par matière, type et id (construit une fois par instance).
const INDEX = new Map<string, CalcQuestion>();
const qKey = (topic: string, type: string, id: string) => `${topic}|${type}|${id}`;
function buildIndex() {
  if (INDEX.size) return;
  for (const [topic, c] of Object.entries(CATALOGS)) {
    for (const t of c?.types ?? []) for (const q of t.questions) INDEX.set(qKey(topic, t.key, q.id), q);
  }
}

export function calcQuestion(topic: CalcTopic, typeKey: string, id: string): CalcQuestion | null {
  buildIndex();
  return INDEX.get(qKey(topic, typeKey, id)) ?? null;
}

/** Les ids d'un niveau (le vivier du tirage). */
export function levelPool(t: CalcType, level: CalcLevel): string[] {
  return t.questions.filter((q) => q.level === level).map((q) => q.id);
}

/** Ce qu'un écran reçoit d'un type : tout sauf les questions. */
export type CalcTypeMeta = {
  key: string;
  name: string;
  tier: CalcType["tier"];
  formulas: string[];
  traps: string[];
  source: string | null;
  /** nombre de questions par niveau */
  counts: Record<CalcLevel, number>;
};

export function typeMeta(t: CalcType): CalcTypeMeta {
  const counts = { facile: 0, moyen: 0, difficile: 0 } as Record<CalcLevel, number>;
  for (const q of t.questions) if (CALC_LEVELS.includes(q.level)) counts[q.level] += 1;
  return {
    key: t.key,
    name: t.name,
    tier: t.tier,
    formulas: [...t.formulas],
    traps: [...(t.traps ?? [])],
    source: t.source ?? null,
    counts,
  };
}

/** Une matière pour la page /calculs : ouverte (avec ses types) ou « bientôt ». */
export type CalcSubjectCard = CalcSubject & {
  open: boolean;
  types: { key: string; name: string; tier: CalcType["tier"] }[];
  questions: number;
};

export function calcSubjectCards(): CalcSubjectCard[] {
  return CALC_SUBJECTS.map((s) => {
    const c = calcCatalog(s.topic);
    return {
      ...s,
      open: !!c,
      types: (c?.types ?? []).map((t) => ({ key: t.key, name: t.name, tier: t.tier })),
      questions: (c?.types ?? []).reduce((n, t) => n + t.questions.length, 0),
    };
  });
}
