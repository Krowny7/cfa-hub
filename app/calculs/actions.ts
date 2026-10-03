"use server";

import { createClient } from "@/lib/supabase/server";
import { calcQuestion, calcType, levelPool } from "@/lib/calc/index";
import {
  ROUND_SIZE,
  checkCalcInput,
  correctionSteps,
  historyFrom,
  isCorrectValue,
  mergeHistory,
  pickRound,
  publicQuestion,
  type CalcAttempt,
  type CalcQuestionPublic,
} from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcLevel, type CalcTopic } from "@/lib/calc/types";
import { loadCalcHistory } from "./data";

// Actions serveur des exercices de calcul : tirer un round, corriger une
// réponse, importer l'historique local une fois la migration appliquée.
// La bonne réponse et la correction ne partent vers le navigateur qu'après
// la réponse du joueur. `db` : l'écran a trouvé migration_calc.sql à son
// chargement (sinon on ne tente même pas d'écrire : repli localStorage).

/** Une réponse déjà donnée, connue du navigateur seulement (repli local). */
export type LocalSeen = { q: string; c: boolean; a: number };

export type DrawResult = { ok: true; questions: CalcQuestionPublic[] } | { ok: false; error: string };

export type SubmitResult =
  | { ok: true; status: "format"; hint: string }
  | { ok: true; status: "juste" | "faux"; value: number; answer: number; solution: string[]; stored: boolean }
  | { ok: false; error: string };

const MAX_LOCAL = 3000;

function cleanLocal(list: unknown, pool: Set<string>): LocalSeen[] {
  if (!Array.isArray(list)) return [];
  const out: LocalSeen[] = [];
  for (const x of list.slice(-MAX_LOCAL)) {
    if (!x || typeof x !== "object") continue;
    const { q, c, a } = x as Record<string, unknown>;
    if (typeof q === "string" && pool.has(q) && typeof a === "number" && Number.isFinite(a)) out.push({ q, c: c === true, a });
  }
  return out;
}

/** Tire les 5 questions d'un round : jamais vues, puis ratées, puis les plus anciennes. */
export async function drawCalcRound(input: { topic: CalcTopic; typeKey: string; level: CalcLevel; local?: LocalSeen[]; db?: boolean }): Promise<DrawResult> {
  const t = calcType(input?.topic, String(input?.typeKey ?? ""));
  if (!t || !CALC_LEVELS.includes(input.level)) return { ok: false, error: "Ce calcul n'existe pas (ou plus)." };
  const pool = levelPool(t, input.level);
  if (!pool.length) return { ok: false, error: "Pas encore de questions à ce niveau." };
  const local = cleanLocal(input.local, new Set(pool));
  let history = historyFrom(local.map((l) => ({ questionId: l.q, correct: l.c, at: l.a })));
  if (input.db) {
    try {
      const remote = await loadCalcHistory(await createClient(), t.topic, t.key, input.level);
      if (remote) history = mergeHistory(remote, history);
    } catch {
      // la base ne répond pas : l'historique local suffit
    }
  }
  const byId = new Map(t.questions.map((q) => [q.id, q] as const));
  const questions = pickRound(pool, history, ROUND_SIZE).flatMap((id) => {
    const q = byId.get(id);
    return q ? [publicQuestion(q)] : [];
  });
  return { ok: true, questions };
}

/** Corrige une réponse et l'inscrit au journal (si la migration est là). */
export async function submitCalcAnswer(input: { topic: CalcTopic; typeKey: string; questionId: string; raw: string; db?: boolean }): Promise<SubmitResult> {
  const q = calcQuestion(input?.topic, String(input?.typeKey ?? ""), String(input?.questionId ?? ""));
  if (!q) return { ok: false, error: "Cette question n'existe plus. Relance le round." };
  const r = checkCalcInput(q, String(input.raw ?? "").slice(0, 40));
  if (r === null) return { ok: false, error: "Écris un nombre : 8,5 ou 8.5." };
  if (r.status === "format") return { ok: true, status: "format", hint: r.hint ?? "Vérifie l'unité demandée." };
  const value = r.value;
  let stored = false;
  if (input.db) {
    try {
      const supabase = await createClient();
      // user_id : par défaut auth.uid() (la session du joueur), RLS « chacun ses lignes »
      const { error } = await supabase.from("calc_attempts").insert({
        topic: input.topic,
        type_key: input.typeKey,
        question_id: q.id,
        level: q.level,
        value,
        correct: r.status === "juste",
      });
      stored = !error;
    } catch {
      stored = false;
    }
  }
  return { ok: true, status: r.status, value, answer: q.answer, solution: correctionSteps(q.solution), stored };
}

/**
 * Verse l'historique du navigateur dans calc_attempts (une fois la migration
 * appliquée). La justesse est recalculée ici quand la valeur est connue.
 * Renvoie le nombre de lignes écrites ; null si la base refuse.
 */
export async function importCalcAttempts(input: { attempts: CalcAttempt[] }): Promise<{ imported: number } | null> {
  const list = Array.isArray(input?.attempts) ? input.attempts.slice(0, 2000) : [];
  const now = Date.now();
  const rows = list.flatMap((a) => {
    if (!a || typeof a !== "object") return [];
    const q = calcQuestion(a.topic, String(a.typeKey ?? ""), String(a.questionId ?? ""));
    if (!q || q.level !== a.level) return [];
    const at = Number(a.at);
    if (!Number.isFinite(at) || at > now + 60_000 || at < now - 400 * 86_400_000) return [];
    const value = typeof a.value === "number" && Number.isFinite(a.value) ? a.value : null;
    return [
      {
        topic: a.topic,
        type_key: a.typeKey,
        question_id: q.id,
        level: q.level,
        value,
        correct: value === null ? a.correct === true : isCorrectValue(value, q),
        answered_at: new Date(at).toISOString(),
      },
    ];
  });
  if (!rows.length) return { imported: 0 };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("calc_attempts").insert(rows);
    return error ? null : { imported: rows.length };
  } catch {
    return null;
  }
}
