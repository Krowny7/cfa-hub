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
import { getEclairStats } from "@/lib/eclair";
import { getAnswerStats } from "@/lib/answer-stats";
import { construirePointsFaibles, lireBanqueQcm, lireBasePointsFaibles } from "@/components/moi/points-faibles-data";
import { avecAtelier, lireEtatAtelier } from "@/app/atelier/donnees";

// Espace « S'entraîner » : point d'entrée unique vers les façons de
// s'entraîner. Chacune garde sa page et ses routes (QCM, entraînement ciblé,
// calculs, examens officiels, examens blancs, duels, défi du jour) ; la page
// met en avant une session (la matière la plus faible, sinon la dernière),
// pose le défi du jour à côté et range le reste. Avec un point faible net
// (réponses de toutes sources et ratures par thème), c'est lui qui est mis
// en avant.
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

  const now = Date.now();
  const [mastery, practice, mockExam, rating, open, daily, eclair, answers, basePointsFaibles, banqueQcm, atelier] = await Promise.all([
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
    getEclairStats(supabase, userId),
    // « Tes points faibles » : les réponses (client admin, toujours filtrées sur ce joueur), les notions (sinon les ratures par thème) et les QCM de la banque
    getAnswerStats(admin ?? supabase, userId, { privileged: !!admin, now }),
    lireBasePointsFaibles(supabase),
    lireBanqueQcm(admin ?? supabase),
    // l'Atelier : ouvert (migration_atelier.sql) et, s'il y en a un, celui en cours
    lireEtatAtelier(supabase, userId),
  ]);

  const pct = new Map(mastery.map((t) => [t.key, t.pct]));
  const d: EntrainementData = {
    practice,
    mockExam,
    rating,
    incomingDuels: open.filter((c) => c.incoming && c.status === "pending").length,
    subjects: SUBJECTS.map((s) => ({ key: s.key, name: s.name, pct: pct.get(s.key) ?? null })),
    daily,
    // séries éclair rendues aujourd'hui (null tant que migration_series_eclair.sql manque)
    eclair: eclair?.today ?? null,
    nowIso: new Date(now).toISOString(),
    pointsFaibles: avecAtelier(construirePointsFaibles(answers, basePointsFaibles, banqueQcm, now), atelier),
  };

  return <EntrainementView d={d} />;
}
