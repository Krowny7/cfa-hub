import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanTopic } from "@/components/session/review";
import { getMockExamEloDeltas } from "@/lib/rating";

// Ta progression d'un examen blanc à l'autre (héros de /mock-exams, « La
// Grande Salle ») : ta dernière copie rendue (score, place, ELO), celle d'avant
// pour l'écart, et tes matières les plus faibles sur la dernière. Tout vient
// des copies déjà en base (mock_exam_results, la ventilation par matière, les
// événements d'ELO) ; une lecture qui échoue donne null ou une liste vide,
// jamais une erreur.

export type Parcours = {
  last: { id: string; score: number; total: number; pct: number; mois: string; rang: number | null; joueurs: number; elo: number | null };
  prev: { score: number; total: number; mois: string } | null;
  faibles: { topic: string; pct: number }[];
};

type Exam = { id: string; scheduled_at: string };
type Res = { exam_id: string; score: number; total: number };

const mois = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { month: "long", timeZone: "Europe/Paris" });

export async function getParcours(supabase: SupabaseClient, userId: string, exams: Exam[], eloEnabled: boolean): Promise<Parcours | null> {
  try {
    const { data, error } = await supabase
      .from("mock_exam_results")
      .select("exam_id,score,total,completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(10);
    if (error || !data) return null;
    const byId = new Map(exams.map((e) => [e.id, e]));
    const mine = (data as Res[]).filter((r) => byId.has(r.exam_id));
    const last = mine[0];
    if (!last || !(last.total > 0)) return null;
    const prev = mine.find((r) => r.exam_id !== last.exam_id && r.total > 0) ?? null;

    const [all, deltas, breakdown] = await Promise.all([
      supabase.from("mock_exam_results").select("score").eq("exam_id", last.exam_id),
      eloEnabled ? getMockExamEloDeltas(supabase, last.exam_id).catch(() => ({}) as Record<string, number>) : Promise.resolve({} as Record<string, number>),
      supabase.rpc("get_mock_exam_topic_breakdown_all", { p_exam_id: last.exam_id }),
    ]);
    const scores = ((all.data ?? []) as { score: number }[]).map((r) => r.score);
    const rang = scores.length > 0 ? 1 + scores.filter((s) => s > last.score).length : null;
    const faibles = ((breakdown.data ?? []) as { user_id: string; topic: string | null; pct: number }[])
      .filter((r) => r.user_id === userId)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3)
      .map((r) => ({ topic: cleanTopic(r.topic), pct: Math.round(r.pct) }));

    return {
      last: {
        id: last.exam_id,
        score: last.score,
        total: last.total,
        pct: Math.round((last.score / last.total) * 100),
        mois: mois(byId.get(last.exam_id)!.scheduled_at),
        rang,
        joueurs: scores.length,
        elo: typeof deltas[userId] === "number" ? deltas[userId] : null,
      },
      prev: prev ? { score: prev.score, total: prev.total, mois: mois(byId.get(prev.exam_id)!.scheduled_at) } : null,
      faibles,
    };
  } catch {
    return null;
  }
}
