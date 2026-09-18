import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { levelInfoFromXp, calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { PracticeHistory } from "@/components/PracticeHistory";
import { topicLabel } from "@/lib/practiceTopics";
import type { Profile, Rating } from "@/lib/types";

type ProfileRow = Pick<Profile, "xp_total" | "username"> & { exam_date?: string | null } | null;

type PracticeAggregate = { total_sessions: number; total_correct: number; total_answered: number };

// Un thème n'est retenu comme "point faible" que s'il vient de sessions
// mono-thème (topics.length === 1) — une session à plusieurs thèmes ne dit
// pas lequel a fait chuter le score, donc on ne devine pas — et seulement
// avec un minimum de questions répondues, pour ne pas classer un thème sur
// un seul essai malchanceux.
const MIN_QUESTIONS_FOR_SIGNAL = 5;
const WEAK_TOPICS_SHOWN = 4;

export default async function Dashboard() {
  const locale = await getLocale();
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
      const { data } = await supabase
        .from("practice_sessions")
        .select("correct,total")
        .eq("user_id", user.id);
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

  const [
    { data: ratingRow },
    { data: profileRow },
    xpDailyResult,
    practiceAgg,
    topicResults,
  ] = await Promise.all([
    supabase.from("ratings").select("elo,games_played").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("xp_total,username,exam_date").eq("id", user.id).maybeSingle(),
    xpDailyCall,
    practiceAggCall,
    topicResultsCall,
  ]);

  const profile = profileRow as ProfileRow;
  const elo = (ratingRow as Pick<Rating, "elo"> | null)?.elo ?? 1200;
  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvlInfo = levelInfoFromXp(xpTotal);
  const username = profile?.username ?? null;
  const examDate = (profile as { exam_date?: string | null } | null)?.exam_date ?? null;

  const daysUntilExam = examDate
    ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const agg = practiceAgg;
  const globalAccuracy =
    agg && agg.total_answered > 0
      ? Math.round((agg.total_correct / agg.total_answered) * 100)
      : null;

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
  const weakTopics = [...topicAgg.entries()]
    .filter(([, a]) => a.total >= MIN_QUESTIONS_FOR_SIGNAL)
    .map(([key, a]) => ({ key, label: topicLabel(key), pct: Math.round((a.correct / a.total) * 100) }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, WEAK_TOPICS_SHOWN);

  const greeting = username
    ? t(locale, "dashboard.greeting", { name: username })
    : t(locale, "dashboard.greetingAnon");

  const examLabel =
    daysUntilExam === null
      ? null
      : daysUntilExam > 0
      ? `J-${daysUntilExam}`
      : daysUntilExam === 0
      ? "Auj."
      : `+${Math.abs(daysUntilExam)}j`;

  return (
    <div className="grid gap-8">
      <div>
        <div className="kicker mb-1">
          {daysUntilExam !== null ? `${examLabel} avant l'examen` : "Tableau de bord"}
        </div>
        <h1 className="font-display text-2xl font-medium tracking-tight">{greeting}</h1>
        <p className="mt-1 text-sm text-muted">{t(locale, "dashboard.subtitle")}</p>
      </div>

      <Link
        href="/entrainement"
        className="card plate group flex items-center justify-between gap-4 p-6"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.02))" }}
      >
        <div className="min-w-0">
          <div className="kicker mb-1 text-blue-300/80">Reprendre</div>
          <div className="font-display text-lg font-medium">{t(locale, "dashboard.sessionCta")}</div>
          <div className="mt-0.5 text-xs text-faint">{t(locale, "dashboard.sessionDesc")}</div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-blue-300/70 transition group-hover:text-blue-200" />
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card plate p-4">
          <div className="kicker">Elo</div>
          <div className="font-display mt-1.5 text-xl font-medium">{elo}</div>
        </div>
        <div className="card plate p-4">
          <div className="kicker">Série</div>
          <div className="font-display mt-1.5 text-xl font-medium">{streak > 0 ? `${streak} j` : "—"}</div>
        </div>
        <div className="card plate p-4">
          <div className="kicker">Précision</div>
          <div className="font-display mt-1.5 text-xl font-medium">
            {globalAccuracy !== null ? `${globalAccuracy}%` : "—"}
          </div>
        </div>
        <div className="card plate p-4">
          <div className="kicker">Examen</div>
          <div className="font-display mt-1.5 text-xl font-medium">{examLabel ?? "—"}</div>
        </div>
      </div>

      {weakTopics.length > 0 && (
        <div className="card plate p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="kicker text-blue-300/80">Points faibles</div>
            <div className="kicker">Sessions mono-thème</div>
          </div>
          <div className="grid gap-3.5">
            {weakTopics.map((topic) => (
              <div key={topic.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{topic.label}</span>
                  <span className="text-muted">{topic.pct}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${topic.pct}%`,
                      backgroundColor: topic.pct < 70 ? "#f0a94e" : "rgb(59 130 246)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            href={`/practice?topic=${weakTopics[0].key}`}
            className="ghost-btn mt-4 inline-block"
          >
            S&apos;entraîner sur {weakTopics[0].label} →
          </Link>
        </div>
      )}

      <div>
        <div className="kicker mb-2.5">Activité</div>
        <ActivityHeatmap days={xpDays} />
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>{t(locale, "common.levelN", { n: lvlInfo.level })}</span>
          <span>{xpTotal} XP</span>
        </div>
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-white/40 transition-all"
            style={{ width: `${Math.round(lvlInfo.progressPct * 100)}%` }}
          />
        </div>
      </div>

      <PracticeHistory />
    </div>
  );
}
