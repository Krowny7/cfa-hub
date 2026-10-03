import { isMastered, suggestedLevel, type AllProgress, type TopicProgress } from "@/lib/calc/engine";
import type { CalcLevel, CalcTopic } from "@/lib/calc/types";

// Le prochain calcul à proposer (le point focal des listes) : d'abord le
// dernier type travaillé s'il n'est pas maîtrisé (« Reprendre »), sinon le
// premier essentiel non maîtrisé dans l'ordre du programme, puis le premier
// annexe. Module neutre.

export type TypeLite = { key: string; name: string; tier: "essentiel" | "annexe" };
export type SubjectLite = { topic: CalcTopic; slug: string; name: string; types: TypeLite[] };

export type Suggestion = {
  topic: CalcTopic;
  slug: string;
  subject: string;
  typeKey: string;
  typeName: string;
  level: CalcLevel;
  reprise: boolean;
};

function lastWorked(subjects: SubjectLite[], all: AllProgress) {
  let best: { s: SubjectLite; t: TypeLite; at: number } | null = null;
  for (const s of subjects)
    for (const t of s.types) {
      const at = all[s.topic]?.[t.key]?.lastAt ?? null;
      if (at !== null && (!best || at > best.at)) best = { s, t, at };
    }
  return best;
}

function firstOpen(s: SubjectLite, progress: TopicProgress | undefined) {
  for (const tier of ["essentiel", "annexe"] as const)
    for (const t of s.types) if (t.tier === tier && !isMastered(progress?.[t.key])) return t;
  return null;
}

export function suggest(subjects: SubjectLite[], all: AllProgress): Suggestion | null {
  const make = (s: SubjectLite, t: TypeLite, reprise: boolean): Suggestion => ({
    topic: s.topic,
    slug: s.slug,
    subject: s.name,
    typeKey: t.key,
    typeName: t.name,
    level: suggestedLevel(all[s.topic]?.[t.key]),
    reprise,
  });
  const last = lastWorked(subjects, all);
  if (last && !isMastered(all[last.s.topic]?.[last.t.key])) return make(last.s, last.t, true);
  for (const s of subjects) {
    const t = firstOpen(s, all[s.topic]);
    if (t) return make(s, t, false);
  }
  return null;
}

/** Lien qui lance directement un round. */
export const roundHref = (slug: string, typeKey: string, level: CalcLevel) => `/calculs/${slug}/${typeKey}?niveau=${level}&go=1`;
