// Lectures serveur de l'onglet Stats de Moi : dernières sessions terminées
// (QCM, flashcards, entraînement ciblé) et précision globale. Chaque lecture
// dégrade proprement : table absente ou erreur → liste vide / null.
import type { SupabaseClient } from "@supabase/supabase-js";
import { subjectByKey } from "@/components/reviser/catalog";
import { fmtAgo } from "@/components/classement/format";
import type { SessionItem } from "@/components/moi/types";

const LIMIT = 20;

type SetSession = { id: string; set_id: string; set_title: string | null; mode: string | null; correct: number | null; total: number | null; occurred_at: string };
type PracticeRow = { id: string; topics: string[] | null; score: number | null; total: number | null; completed_at: string };

function topicsTitle(keys: string[]) {
  if (keys.length === 0) return "Toutes matières";
  const names = keys.map((k) => subjectByKey(k)?.name ?? k);
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
}

export async function getSessionHistory(supabase: SupabaseClient, userId: string, now = Date.now()): Promise<SessionItem[]> {
  const out: SessionItem[] = [];
  const [sets, practice] = await Promise.all([
    (async () => {
      try {
        const { data, error } = await supabase
          .from("practice_sessions")
          .select("id,set_id,set_title,mode,correct,total,occurred_at")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(LIMIT);
        return error ? [] : ((data ?? []) as SetSession[]);
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        const { data, error } = await supabase
          .from("practice_session_results")
          .select("id,topics,score,total,completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(LIMIT);
        return error ? [] : ((data ?? []) as PracticeRow[]);
      } catch {
        return [];
      }
    })(),
  ]);

  for (const r of sets) {
    const qcm = r.mode !== "flashcards";
    out.push({
      id: `s-${r.id}`,
      kind: qcm ? "qcm" : "flashcards",
      title: r.set_title || (qcm ? "QCM" : "Flashcards"),
      correct: Number(r.correct) || 0,
      total: Number(r.total) || 0,
      at: r.occurred_at,
      ago: fmtAgo(r.occurred_at, now),
      href: r.set_id ? (qcm ? `/qcm/${r.set_id}` : `/flashcards/${r.set_id}`) : null,
    });
  }
  for (const r of practice) {
    const topics = r.topics ?? [];
    out.push({
      id: `p-${r.id}`,
      kind: "practice",
      title: topicsTitle(topics),
      correct: Number(r.score) || 0,
      total: Number(r.total) || 0,
      at: r.completed_at,
      ago: fmtAgo(r.completed_at, now),
      href: topics.length === 1 ? `/practice?topic=${topics[0]}` : "/practice",
    });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, LIMIT);
}

/** Précision (%) sur toutes les réponses aux QCM et à l'entraînement ciblé. */
export async function getAccuracy(supabase: SupabaseClient, userId: string): Promise<number | null> {
  try {
    const [a, b] = await Promise.all([
      supabase.from("practice_sessions").select("correct,total").eq("user_id", userId).eq("mode", "qcm").limit(5000),
      supabase.from("practice_session_results").select("score,total").eq("user_id", userId).limit(5000),
    ]);
    let correct = 0;
    let total = 0;
    for (const r of (a.error ? [] : a.data ?? []) as { correct: number | null; total: number | null }[]) {
      correct += Number(r.correct) || 0;
      total += Number(r.total) || 0;
    }
    for (const r of (b.error ? [] : b.data ?? []) as { score: number | null; total: number | null }[]) {
      correct += Number(r.score) || 0;
      total += Number(r.total) || 0;
    }
    return total > 0 ? Math.round((correct / total) * 100) : null;
  } catch {
    return null;
  }
}
