import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { levelInfoFromXp, calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { PracticeHistory } from "@/components/PracticeHistory";
import type { Profile, Rating } from "@/lib/types";

type ProfileRow = Pick<Profile, "xp_total" | "username" | "active_group_id"> & { exam_date?: string | null } | null;

type PracticeAggregate = { total_sessions: number; total_correct: number; total_answered: number };

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

  const [
    { data: ratingRow },
    { data: profileRow },
    { count: docsCount },
    { count: setsCount },
    { count: qcmCount },
    { count: groupCount },
    xpDailyResult,
    practiceAgg,
  ] = await Promise.all([
    supabase.from("ratings").select("elo,games_played").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("xp_total,username,active_group_id,exam_date").eq("id", user.id).maybeSingle(),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("flashcard_sets").select("*", { count: "exact", head: true }),
    supabase.from("quiz_sets").select("*", { count: "exact", head: true }),
    supabase.from("group_memberships").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    xpDailyCall,
    practiceAggCall,
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

  const hasUsername = Boolean(username);
  const hasGroup = (groupCount ?? 0) > 0;
  const hasContent = (docsCount ?? 0) > 0 || (setsCount ?? 0) > 0 || (qcmCount ?? 0) > 0;
  const onboardingDone = hasUsername && hasGroup;

  const greeting = username
    ? t(locale, "dashboard.greeting", { name: username })
    : t(locale, "dashboard.greetingAnon");

  const summaryParts = [
    daysUntilExam !== null
      ? daysUntilExam > 0
        ? `J-${daysUntilExam} avant l'examen`
        : daysUntilExam === 0
        ? "Examen aujourd'hui"
        : `Examen passé il y a ${Math.abs(daysUntilExam)}j`
      : null,
    globalAccuracy !== null ? `${globalAccuracy}% de précision` : null,
    streak > 0 ? `série ${streak}j` : "série à démarrer",
    `Elo ${elo}`,
  ].filter(Boolean);

  return (
    <div className="grid gap-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <p className="mt-1 text-sm text-muted">{t(locale, "dashboard.subtitle")}</p>
      </div>

      <Link
        href="/session"
        className="group flex items-center justify-between gap-4 border-y border-white/[0.08] py-4 mt-6"
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">{t(locale, "dashboard.sessionCta")}</div>
          <div className="mt-0.5 text-xs text-faint">{t(locale, "dashboard.sessionDesc")}</div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-faint transition group-hover:text-body" />
      </Link>

      <div className="mt-5 flex items-center justify-between text-xs text-muted">
        <span>{t(locale, "common.levelN", { n: lvlInfo.level })}</span>
        <span>{xpTotal} XP</span>
      </div>
      <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-white/40 transition-all"
          style={{ width: `${Math.round(lvlInfo.progressPct * 100)}%` }}
        />
      </div>

      <div className="mt-4 text-xs text-faint">{summaryParts.join(" · ")}</div>

      {!onboardingDone && (
        <div className="mt-8">
          <div className="text-sm font-medium">{t(locale, "dashboard.onboardingTitle")}</div>
          <div className="mt-2 grid">
            {[
              {
                done: hasUsername,
                label: t(locale, "dashboard.onboardingUsername"),
                href: "/settings",
                linkLabel: t(locale, "nav.settings"),
              },
              {
                done: hasGroup,
                label: t(locale, "dashboard.onboardingGroup"),
                href: "/settings",
                linkLabel: t(locale, "nav.settings"),
              },
              {
                done: hasContent,
                label: t(locale, "dashboard.onboardingContent"),
                href: "/library",
                linkLabel: t(locale, "nav.library"),
              },
            ].map((step) => (
              <div
                key={step.label}
                className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 text-sm last:border-0"
              >
                {step.done ? (
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                ) : (
                  <Circle size={15} className="shrink-0 text-faint" />
                )}
                <span className={`flex-1 ${step.done ? "text-faint" : ""}`}>{step.label}</span>
                {!step.done && (
                  <Link href={step.href} className="shrink-0 text-xs text-blue-400 hover:underline">
                    {step.linkLabel} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-xs font-medium uppercase tracking-wide text-faint">Activité</div>
      <div className="mt-2.5">
        <ActivityHeatmap days={xpDays} />
      </div>

      <div className="mt-8">
        <PracticeHistory />
      </div>
    </div>
  );
}
