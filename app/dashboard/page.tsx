import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { levelInfoFromXp, calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { TOPICS, topicLabel } from "@/lib/practiceTopics";
import { DashboardView } from "@/components/DashboardView";
import { TOPIC_SHORT } from "@/components/TopicMap";
import type { Profile, Rating } from "@/lib/types";

type ProfileRow = (Pick<Profile, "xp_total" | "username"> & { exam_date?: string | null }) | null;

type PracticeAggregate = { total_sessions: number; total_correct: number; total_answered: number };

// Un thème n'est retenu (carte, points faibles) que s'il vient de sessions
// mono-thème (topics.length === 1) — une session à plusieurs thèmes ne dit
// pas lequel a fait chuter le score, donc on ne devine pas — et seulement
// avec un minimum de questions répondues, pour ne pas classer un thème sur
// un seul essai malchanceux.
const MIN_QUESTIONS_FOR_SIGNAL = 5;
const WEAK_TOPICS_SHOWN = 4;

function greetingFor(name: string | null) {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));
  const hello = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
  return name ? `${hello}, ${name}.` : `${hello}.`;
}

export default async function Dashboard() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const xpDailyCall = (async () => {
    try {
      return await supabase.rpc("get_xp_daily", { p_days: 30 });
    } catch {
      return { data: null };
    }
  })();

  const practiceAggCall = (async () => {
    try {
      const { data } = await supabase.from("practice_sessions").select("correct,total").eq("user_id", user.id);
      if (!data) return null;
      const total_sessions = data.length;
      const total_correct = data.reduce((s, r) => s + (r.correct ?? 0), 0);
      const total_answered = data.reduce((s, r) => s + (r.total ?? 0), 0);
      return { total_sessions, total_correct, total_answered } as PracticeAggregate;
    } catch {
      return null;
    }
  })();

  const topicResultsCall = (async () => {
    try {
      const { data } = await supabase
        .from("practice_session_results")
        .select("topics,score,total")
        .eq("user_id", user.id)
        .limit(200);
      return data ?? [];
    } catch {
      return [];
    }
  })();

  const [{ data: ratingRow }, { data: profileRow }, xpDailyResult, practiceAgg, topicResults] = await Promise.all([
    supabase.from("ratings").select("elo,games_played").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("xp_total,username,exam_date").eq("id", user.id).maybeSingle(),
    xpDailyCall,
    practiceAggCall,
    topicResultsCall,
  ]);

  const profile = profileRow as ProfileRow;
  const rating = ratingRow as (Pick<Rating, "elo"> & { games_played?: number | null }) | null;
  const elo = rating?.elo ?? 1200;
  const gamesPlayed = Number(rating?.games_played ?? 0) || 0;
  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const username = profile?.username ?? null;
  const examDate = profile?.exam_date ?? null;

  const daysUntilExam = examDate ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000) : null;
  const examLabel =
    daysUntilExam === null ? null : daysUntilExam > 0 ? `J-${daysUntilExam}` : daysUntilExam === 0 ? "Jour J" : `+${Math.abs(daysUntilExam)} j`;
  const examDateLabel = examDate
    ? `le ${new Date(examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
    : null;

  const agg = practiceAgg;
  const globalAccuracy = agg && agg.total_answered > 0 ? Math.round((agg.total_correct / agg.total_answered) * 100) : null;

  const xpDays = Array.isArray(xpDailyResult.data) ? (xpDailyResult.data as XpDay[]) : [];
  const { streak } = calcStreakAndToday(xpDays);

  const topicAgg = new Map<string, { correct: number; total: number }>();
  for (const r of topicResults as { topics: string[] | null; score: number | null; total: number | null }[]) {
    const topics = r.topics ?? [];
    if (topics.length !== 1) continue;
    const key = topics[0];
    const a = topicAgg.get(key) ?? { correct: 0, total: 0 };
    a.correct += r.score ?? 0;
    a.total += r.total ?? 0;
    topicAgg.set(key, a);
  }
  const pctOf = (key: string) => {
    const a = topicAgg.get(key);
    return a && a.total >= MIN_QUESTIONS_FOR_SIGNAL ? Math.round((a.correct / a.total) * 100) : null;
  };

  const topics = TOPICS.map((t) => ({ key: t.key, short: TOPIC_SHORT[t.key] ?? t.label, label: t.label, pct: pctOf(t.key) }));
  const weakTopics = topics
    .filter((t) => t.pct !== null)
    .map((t) => ({ key: t.key, label: topicLabel(t.key), pct: t.pct as number }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, WEAK_TOPICS_SHOWN);

  return (
    <DashboardView
      d={{
        greeting: greetingFor(username),
        kicker: daysUntilExam !== null && daysUntilExam > 0 ? `Tableau de bord · J-${daysUntilExam} avant l'examen` : "Tableau de bord",
        streak,
        elo,
        gamesPlayed,
        level: lvl.level,
        levelPct: Math.round(lvl.progressPct * 100),
        xpIntoLevel: lvl.xpIntoLevel,
        xpForNextLevel: lvl.xpForNextLevel,
        xpToNextLevel: lvl.xpToNextLevel,
        xpTotal,
        examLabel,
        examDateLabel,
        globalAccuracy,
        topics,
        weakTopics,
        xpDays,
      }}
    />
  );
}
