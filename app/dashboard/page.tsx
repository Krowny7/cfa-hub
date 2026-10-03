import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { getTopicAverages, getTopicMastery, programMastery } from "@/lib/mastery";
import { getLeaderboardRank, getMyRating, getOpenChallenges, getRatingHistory } from "@/lib/rating";
import { DashboardView } from "@/components/DashboardView";
import { SUBJECTS } from "@/components/reviser/catalog";
import { getProgramAverage, loadActivity, loadErrors, loadNextMockExam, loadResume } from "@/components/accueil/queries";
import { helloFor, longDay } from "@/components/accueil/format";
import type { AccueilData } from "@/components/accueil/types";

// Objectif du jour : 40 questions, l'équivalent d'une petite heure au rythme
// de l'examen (90 s par question).
const DAILY_GOAL = 40;

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // Client admin : moyennes des joueurs, titres des quiz officiels, inscrits
  // aux examens blancs. Absent (variables d'environnement) → on s'en passe.
  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const now = new Date();

  const [profileRes, xpDailyRes, topics, topicAvg, programAvg, rating, history, open, myRank, activity, errors, resume, mockExam] = await Promise.all([
    supabase.from("profiles").select("username,exam_date").eq("id", user.id).maybeSingle(),
    // XP par jour : sert seulement à la série (le détail est sur /moi).
    (async () => {
      try {
        return await supabase.rpc("get_xp_daily", { p_days: 30 });
      } catch {
        return { data: null };
      }
    })(),
    getTopicMastery(supabase, user.id),
    admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
    getProgramAverage(admin),
    getMyRating(supabase, user.id),
    getRatingHistory(supabase, user.id, 1),
    getOpenChallenges(supabase, user.id),
    // Rang au classement : seulement pour le palier Top 10 du badge.
    getLeaderboardRank(supabase, user.id),
    loadActivity(supabase, user.id, now),
    loadErrors(supabase, admin, user.id),
    loadResume(supabase, admin, user.id),
    loadNextMockExam(supabase, admin, user.id, now),
  ]);

  const profile = profileRes.data as { username?: string | null; exam_date?: string | null } | null;
  const examDate = profile?.exam_date ?? null;
  const examDaysLeft = examDate ? Math.ceil((new Date(examDate).getTime() - now.getTime()) / 86_400_000) : null;

  const xpDays = Array.isArray(xpDailyRes.data) ? (xpDailyRes.data as XpDay[]) : [];
  const { streak } = calcStreakAndToday(xpDays);

  // Matières dans l'ordre officiel du programme (celui du radar et des barres).
  const byKey = new Map(topics.map((t) => [t.key, t]));
  const topicStats = SUBJECTS.map((s) => ({
    key: s.key,
    name: s.name,
    short: s.short,
    code: s.code,
    pct: byKey.get(s.key)?.pct ?? null,
    avg: topicAvg[s.key] ?? null,
  }));
  const mastery = programMastery(topics);

  // Un défi reçu passe avant un duel en cours (il attend une réponse).
  const pendingIn = open.find((c) => c.incoming && c.status === "pending");
  const active = open.find((c) => c.status === "active");
  const duel = pendingIn ? { c: pendingIn, kind: "incoming" as const } : active ? { c: active, kind: "active" as const } : null;
  const last = history.length ? history[history.length - 1] : null;

  const d: AccueilData = {
    name: profile?.username ?? null,
    hello: helloFor(now),
    dateLabel: longDay(now),
    examDaysLeft,
    examDateLabel: examDate ? `le ${new Date(examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : null,
    streak,
    rating: {
      elo: rating.elo,
      gamesPlayed: rating.gamesPlayed,
      leaderboardRank: myRank,
      last: last ? { delta: last.delta, source: last.source } : null,
    },
    incomingDuel: duel ? { id: duel.c.id, from: duel.c.opponentName, kind: duel.kind } : null,
    resume,
    activity,
    dailyGoal: DAILY_GOAL,
    errors,
    mockExam,
    topics: topicStats,
    mastery,
    masteryAvg: programAvg,
  };

  return <DashboardView d={d} now={now.getTime()} />;
}
