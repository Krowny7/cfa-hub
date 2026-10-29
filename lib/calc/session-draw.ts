// Tirage d'une session ciblée de calculs, côté serveur : il lit les
// catalogues complets (lib/calc/index.ts), donc jamais depuis un composant
// client. Le navigateur ne reçoit que les énoncés (publicQuestion) et le rappel
// des types ; la bonne réponse et la correction n'arrivent qu'après chaque
// réponse (submitCalcAnswer, app/calculs/actions.ts).

import { calcCatalog, calcQuestion, calcSubject, CALC_SUBJECTS } from "./index";
import { publicQuestion } from "./engine";
import {
  SESSION_DEFAUT,
  SESSION_MAX,
  SESSION_MIN,
  melanger,
  normalizeMix,
  pickSpread,
  planSession,
  sessionTypeKey,
  type ParNiveau,
  type SessionItem,
  type SessionPlan,
  type SessionTypeInfo,
} from "./session";
import { CALC_LEVELS, type CalcLevel, type CalcTopic } from "./types";

/** Une matière ouverte pour l'écran de réglage : son vivier par niveau. */
export type SessionSubject = { topic: CalcTopic; slug: string; name: string; short: string; types: number; counts: ParNiveau };

export function calcSessionSubjects(): SessionSubject[] {
  return CALC_SUBJECTS.flatMap((s) => {
    const c = calcCatalog(s.topic);
    if (!c) return [];
    const counts: ParNiveau = { facile: 0, moyen: 0, difficile: 0 };
    for (const t of c.types) for (const q of t.questions) if (CALC_LEVELS.includes(q.level)) counts[q.level] += 1;
    return [{ topic: s.topic, slug: s.slug, name: s.name, short: s.short, types: c.types.length, counts }];
  });
}

export type SessionDraw = { items: SessionItem[]; types: Record<string, SessionTypeInfo>; plan: SessionPlan };

/**
 * Tire une session : le plan (répartition par niveau, ajustée au vivier), puis
 * pour chaque niveau des questions distinctes réparties entre les types des
 * matières choisies, puis le tout mêlé (deux questions d'un même type ne se
 * suivent que faute de mieux). null : aucune matière ouverte dans le choix.
 */
export function drawSession(input: { topics: unknown; count: unknown; mix: unknown }, rand: () => number = Math.random): SessionDraw | null {
  const asked = Array.isArray(input.topics) ? input.topics : [];
  const topics = [...new Set(asked)].filter((t): t is CalcTopic => typeof t === "string" && !!calcSubject(t as CalcTopic) && !!calcCatalog(t as CalcTopic));
  if (!topics.length) return null;
  const n = Number(input.count);
  const count = Number.isFinite(n) ? Math.max(SESSION_MIN, Math.min(SESSION_MAX, Math.round(n))) : SESSION_DEFAUT;
  const mix = normalizeMix((input.mix ?? {}) as Partial<Record<CalcLevel, unknown>>);

  type Ref = { topic: CalcTopic; typeKey: string; id: string };
  const groups: Record<CalcLevel, Ref[][]> = { facile: [], moyen: [], difficile: [] };
  const dispo: ParNiveau = { facile: 0, moyen: 0, difficile: 0 };
  const types: Record<string, SessionTypeInfo> = {};
  const infos = new Map<string, SessionTypeInfo>();
  for (const topic of topics) {
    const subject = calcSubject(topic)!;
    for (const t of calcCatalog(topic)!.types) {
      infos.set(sessionTypeKey(topic, t.key), { topic, typeKey: t.key, name: t.name, subject: subject.short, formulas: [...t.formulas], traps: [...(t.traps ?? [])] });
      for (const l of CALC_LEVELS) {
        const refs = t.questions.filter((q) => q.level === l).map((q) => ({ topic, typeKey: t.key, id: q.id }));
        if (!refs.length) continue;
        groups[l].push(refs);
        dispo[l] += refs.length;
      }
    }
  }

  const plan = planSession(count, mix, dispo);
  const picked: Ref[] = CALC_LEVELS.flatMap((l) => pickSpread(groups[l], plan.retenu[l], rand));
  const items = melanger(picked, (r) => sessionTypeKey(r.topic, r.typeKey), rand).flatMap((r) => {
    const full = calcQuestion(r.topic, r.typeKey, r.id);
    if (!full) return [];
    const k = sessionTypeKey(r.topic, r.typeKey);
    const info = infos.get(k);
    if (info) types[k] = info;
    return [{ topic: r.topic, typeKey: r.typeKey, q: publicQuestion(full) }];
  });
  return { items, types, plan };
}
