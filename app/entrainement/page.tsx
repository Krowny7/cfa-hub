import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTopicMastery } from "@/lib/mastery";
import { getMyRating, getOpenChallenges } from "@/lib/rating";
import { getTodayDaily } from "@/lib/daily";
import { SUBJECTS } from "@/components/reviser/catalog";
import { loadNextMockExam } from "@/components/accueil/queries";
import { EntrainementView, type EntrainementData } from "@/components/entrainement/EntrainementView";

// Espace « S'entraîner » : point d'entrée unique vers les façons de
// s'entraîner. Chacune garde sa page et ses routes (QCM, entraînement ciblé,
// calculs, examens officiels, examens blancs, duels, défi du jour) ; la page
// met en avant une session (la matière la plus faible, sinon la dernière),
// pose le défi du jour à côté et range le reste.
export default async function EntrainementPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const userId = auth.user.id;

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const [mastery, practice, mockExam, rating, open, daily, cinq] = await Promise.all([
    getTopicMastery(supabase, userId),
    (async () => {
      try {
        const { data, count, error } = await supabase
          .from("practice_session_results")
          .select("score,total,completed_at,topics", { count: "exact" })
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(1);
        if (error) return { sessions: 0, last: null };
        const row = (data?.[0] ?? null) as { score: number; total: number; completed_at: string; topics: string[] | null } | null;
        return {
          sessions: count ?? 0,
          last: row ? { score: Number(row.score) || 0, total: Number(row.total) || 0, at: row.completed_at, topics: row.topics ?? [] } : null,
        };
      } catch {
        return { sessions: 0, last: null };
      }
    })(),
    loadNextMockExam(supabase, admin, userId),
    getMyRating(supabase, userId),
    getOpenChallenges(supabase, userId),
    // un seul appel, jamais d'exception ; « bientôt » tant que la migration manque
    getTodayDaily(supabase, userId).catch(() => null),
    getTodayDaily(supabase, userId, "cinq").catch(() => null),
  ]);

  const pct = new Map(mastery.map((t) => [t.key, t.pct]));
  const d: EntrainementData = {
    practice,
    mockExam,
    rating,
    incomingDuels: open.filter((c) => c.incoming && c.status === "pending").length,
    subjects: SUBJECTS.map((s) => ({ key: s.key, name: s.name, pct: pct.get(s.key) ?? null })),
    daily,
    cinq,
    nowIso: new Date().toISOString(),
  };

  return <EntrainementView d={d} />;
}
