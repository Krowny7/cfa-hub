import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { levelInfoFromXp, calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { getTopicAverages, getTopicMastery, programMastery } from "@/lib/mastery";
import { getLeaderboard, getLeaderboardRank, getMyRating, getOpenChallenges, getRatingHistory } from "@/lib/rating";
import { DashboardView } from "@/components/DashboardView";
import { PracticeHistory } from "@/components/PracticeHistory";
import { SUBJECTS } from "@/components/reviser/catalog";
import { getProgramAverage, loadActivity, loadErrors, loadNextMockExam, loadResume } from "@/components/accueil/queries";
import { helloFor, longDay } from "@/components/accueil/format";
import type { AccueilData, BoardRow } from "@/components/accueil/types";

// Objectif du jour : 40 questions, l'équivalent d'une petite heure au rythme
// de l'examen (90 s par question).
const DAILY_GOAL = 40;
const BOARD_TOP = 3;

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

  const [profileRes, xpDailyRes, practiceAgg, topics, topicAvg, programAvg, rating, history, open, board, myRank, activity, errors, resume, mockExam] =
    await Promise.all([
      supabase.from("profiles").select("xp_total,username,exam_date").eq("id", user.id).maybeSingle(),
      (async () => {
        try {
          return await supabase.rpc("get_xp_daily", { p_days: 30 });
        } catch {
          return { data: null };
        }
      })(),
      (async () => {
        try {
          const { data } = await supabase.from("practice_sessions").select("correct,total").eq("user_id", user.id);
          if (!data) return null;
          return {
            correct: data.reduce((s, r) => s + (r.correct ?? 0), 0),
            answered: data.reduce((s, r) => s + (r.total ?? 0), 0),
          };
        } catch {
          return null;
        }
      })(),
      getTopicMastery(supabase, user.id),
      admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
      getProgramAverage(admin),
      getMyRating(supabase, user.id),
      getRatingHistory(supabase, user.id, 1),
      getOpenChallenges(supabase, user.id),
      getLeaderboard(supabase, BOARD_TOP),
      getLeaderboardRank(supabase, user.id),
      loadActivity(supabase, user.id, now),
      loadErrors(supabase, admin, user.id),
      loadResume(supabase, admin, user.id),
      loadNextMockExam(supabase, admin, user.id, now),
    ]);

  const profile = profileRes.data as { xp_total?: number | null; username?: string | null; exam_date?: string | null } | null;
  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const examDate = profile?.exam_date ?? null;
  const examDaysLeft = examDate ? Math.ceil((new Date(examDate).getTime() - now.getTime()) / 86_400_000) : null;

  const xpDays = Array.isArray(xpDailyRes.data) ? (xpDailyRes.data as XpDay[]) : [];
  const { streak } = calcStreakAndToday(xpDays);

  // Matières dans l'ordre officiel du programme (celui du radar et des tuiles).
  const byKey = new Map(topics.map((t) => [t.key, t]));
  const topicStats = SUBJECTS.map((s) => ({
    key: s.key,
    name: s.name,
    code: s.code,
    pct: byKey.get(s.key)?.pct ?? null,
    avg: topicAvg[s.key] ?? null,
  }));
  const mastery = programMastery(topics);

  // Mini classement : le podium, puis toi si tu n'y es pas.
  const rows: BoardRow[] = board.map((r) => ({ userId: r.userId, name: r.username ?? "Joueur", elo: r.elo, rank: r.rank, me: r.userId === user.id }));
  if (rows.length && !rows.some((r) => r.me) && myRank !== null) {
    rows.push({ userId: user.id, name: profile?.username ?? "Toi", elo: rating.elo, rank: myRank, me: true });
  }

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
    board: rows,
    topics: topicStats,
    mastery,
    masteryAvg: programAvg,
    level: {
      level: lvl.level,
      pct: Math.round(lvl.progressPct * 100),
      into: lvl.xpIntoLevel,
      forNext: lvl.xpForNextLevel,
      toNext: lvl.xpToNextLevel,
      xpTotal,
    },
    xpDays,
    globalAccuracy: practiceAgg && practiceAgg.answered > 0 ? Math.round((practiceAgg.correct / practiceAgg.answered) * 100) : null,
  };

  return <DashboardView d={d} now={now.getTime()} historySlot={<PracticeHistory />} />;
}
