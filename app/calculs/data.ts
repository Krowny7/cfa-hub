import type { SupabaseClient } from "@supabase/supabase-js";
import { progressFromRows, type AllProgress, type CalcProgressRow, type HistoryMap } from "@/lib/calc/engine";
import type { CalcLevel, CalcTopic } from "@/lib/calc/types";

// Lectures du suivi des calculs (migration_calc.sql), côté serveur. Elles ne
// lèvent jamais : null veut dire « la base ne répond pas » (migration pas
// encore appliquée, ou erreur), et les écrans se replient alors sur
// l'historique du navigateur (localStorage).

/** Résumé par matière, type et niveau ; null : repli local. */
export async function loadCalcProgress(supabase: SupabaseClient, topic: CalcTopic | null): Promise<AllProgress | null> {
  try {
    const { data, error } = await supabase.rpc("calc_progress", { p_topic: topic });
    if (error || !Array.isArray(data)) return null;
    return progressFromRows(data as CalcProgressRow[]);
  } catch {
    return null;
  }
}

type HistoryRow = { question_id: string; seen: number; last_correct: boolean; last_at: string };

/** Historique question par question d'un niveau d'un type ; null : repli local. */
export async function loadCalcHistory(supabase: SupabaseClient, topic: CalcTopic, typeKey: string, level: CalcLevel): Promise<HistoryMap | null> {
  try {
    const { data, error } = await supabase.rpc("calc_history", { p_topic: topic, p_type: typeKey, p_level: level });
    if (error || !Array.isArray(data)) return null;
    const out: HistoryMap = {};
    for (const r of data as HistoryRow[]) {
      const at = new Date(r.last_at).getTime();
      out[r.question_id] = { seen: Number(r.seen) || 1, lastAt: Number.isFinite(at) ? at : 0, lastCorrect: !!r.last_correct };
    }
    return out;
  } catch {
    return null;
  }
}
