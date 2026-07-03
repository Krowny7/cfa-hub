import Link from "next/link";
import { redirect } from "next/navigation";
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
  const games = (ratingRow as Pick<Rating, "games_played"> | null)?.games_played ?? 0;
  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvlInfo = levelInfoFromXp(xpTotal);
  const username = profile?.username ?? null;
  const examDate = (profile as { exam_date?: string | null } | null)?.exam_date ?? null;

  // Days until exam
  const daysUntilExam = examDate
    ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const agg = practiceAgg;
  const globalAccuracy =
    agg && agg.total_answered > 0
      ? Math.round((agg.total_correct / agg.total_answered) * 100)
      : null;

  const xpDays = Array.isArray(xpDailyResult.data) ? (xpDailyResult.data as XpDay[]) : [];
  const { streak, xpToday } = calcStreakAndToday(xpDays);

  const hasUsername = Boolean(username);
  const hasGroup = (groupCount ?? 0) > 0;
  const hasContent = (docsCount ?? 0) > 0 || (setsCount ?? 0) > 0 || (qcmCount ?? 0) > 0;
  const onboardingDone = hasUsername && hasGroup;

  const greeting = username
    ? t(locale, "dashboard.greeting", { name: username })
    : t(locale, "dashboard.greetingAnon");

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_220px] md:items-start">
      {/* ── Left column ── */}
      <div className="grid gap-4">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-white/60">{t(locale, "dashboard.subtitle")}</p>
        </div>

        {/* Session CTA — action principale de la page : signal visuel fort au
            repos (pas seulement au survol, inutile sur mobile sans hover) */}
        <Link
          href="/session"
          className="card group flex items-center gap-4 overflow-hidden border-blue-400/25 bg-blue-500/[0.06] p-5 transition hover:border-blue-400/50 hover:bg-blue-500/[0.10]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/25 text-xl transition group-hover:bg-blue-500/35">
            ⏱
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{t(locale, "dashboard.sessionCta")}</div>
            <div className="mt-0.5 text-sm text-white/55">{t(locale, "dashboard.sessionDesc")}</div>
          </div>
          <div className="text-blue-300/60 transition group-hover:text-blue-200">→</div>
        </Link>

        {/* Exam countdown */}
        {daysUntilExam !== null && (
          <div className={`card p-4 flex items-center gap-4 ${daysUntilExam <= 30 ? "border-orange-500/30" : ""}`}>
            <div className="text-2xl">🎓</div>
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {daysUntilExam > 0
                  ? `J-${daysUntilExam} avant l'examen`
                  : daysUntilExam === 0
                  ? "L'examen est aujourd'hui !"
                  : `Examen passé il y a ${Math.abs(daysUntilExam)}j`}
              </div>
              <div className="text-xs text-white/45">{examDate}</div>
            </div>
            {globalAccuracy !== null && (
              <div className="text-right">
                <div className={`text-xl font-bold ${globalAccuracy >= 70 ? "text-green-400" : globalAccuracy >= 55 ? "text-yellow-400" : "text-red-400"}`}>
                  {globalAccuracy}%
                </div>
                <div className="text-[10px] text-white/40">{agg?.total_sessions} sessions</div>
              </div>
            )}
          </div>
        )}

        {/* Practice aggregate (when no exam date) */}
        {daysUntilExam === null && globalAccuracy !== null && agg && (
          <div className="card-soft flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Précision globale</div>
              <div className="text-xs text-white/45">{agg.total_sessions} sessions · {agg.total_answered} réponses</div>
            </div>
            <div className={`text-2xl font-bold ${globalAccuracy >= 70 ? "text-green-400" : globalAccuracy >= 55 ? "text-yellow-400" : "text-red-400"}`}>
              {globalAccuracy}%
            </div>
          </div>
        )}

        {/* Streak + XP today */}
        <div className="flex flex-wrap gap-3">
          <div className="card-soft flex items-center gap-3 px-4 py-2.5">
            <span className="text-lg leading-none">🔥</span>
            <div>
              <div className="text-sm font-semibold">
                {streak > 0
                  ? t(locale, "dashboard.streakN", { n: streak })
                  : t(locale, "dashboard.streakZero")}
              </div>
              <div className="text-xs opacity-55">{t(locale, "dashboard.streak")}</div>
            </div>
          </div>
          {xpToday > 0 && (
            <div className="card-soft flex items-center gap-3 px-4 py-2.5">
              <span className="text-lg leading-none">⚡</span>
              <div>
                <div className="text-sm font-semibold">+{xpToday} XP</div>
                <div className="text-xs opacity-55">{t(locale, "dashboard.xpToday")}</div>
              </div>
            </div>
          )}
        </div>

        {/* XP progress bar */}
        <div className="card-soft px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t(locale, "common.levelN", { n: lvlInfo.level })}</span>
            <span className="text-xs opacity-55">{xpTotal} XP</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.round(lvlInfo.progressPct * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-white/45">
            {t(locale, "common.xpToNextLevelN", { n: lvlInfo.xpToNextLevel })}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card-soft p-4">
            <div className="text-xs opacity-55">{t(locale, "dashboard.elo")}</div>
            <div className="mt-1 text-2xl font-semibold">{elo}</div>
            <div className="text-xs opacity-55">{t(locale, "dashboard.games", { n: games })}</div>
          </div>
          <div className="card-soft p-4">
            <div className="text-xs opacity-55">{t(locale, "dashboard.pdfs")}</div>
            <div className="mt-1 text-2xl font-semibold">{docsCount ?? 0}</div>
          </div>
          <div className="card-soft p-4">
            <div className="text-xs opacity-55">{t(locale, "dashboard.sets")}</div>
            <div className="mt-1 text-2xl font-semibold">{setsCount ?? 0}</div>
          </div>
          <div className="card-soft p-4">
            <div className="text-xs opacity-55">{t(locale, "qcm.title")}</div>
            <div className="mt-1 text-2xl font-semibold">{qcmCount ?? 0}</div>
          </div>
        </div>

        {/* Quick links when setup complete */}
        {onboardingDone && (
          <div className="flex flex-wrap gap-2">
            <Link href="/library" className="card-soft px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white/90">
              📚 {t(locale, "nav.library")}
            </Link>
            <Link href="/flashcards" className="card-soft px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white/90">
              🗂 {t(locale, "nav.flashcards")}
            </Link>
            <Link href="/qcm" className="card-soft px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white/90">
              📝 {t(locale, "nav.qcm")}
            </Link>
            <Link href="/people" className="card-soft px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white/90">
              👥 {t(locale, "nav.people")}
            </Link>
          </div>
        )}

        {/* Practice history (localStorage) */}
        <PracticeHistory />

        {/* Onboarding checklist */}
        {!onboardingDone && (
          <div className="card p-5">
            <div className="font-semibold">{t(locale, "dashboard.onboardingTitle")}</div>
            <div className="mt-4 grid gap-1.5">
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
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                    step.done ? "opacity-50" : "bg-white/[0.02]"
                  }`}
                >
                  <span className="text-base">{step.done ? "✅" : "⬜"}</span>
                  <span className="flex-1">{step.label}</span>
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
      </div>

      {/* ── Right column: activity heatmap ── */}
      <div className="hidden md:block">
        <div className="card-soft sticky top-20 p-4">
          <div className="mb-1 text-xs font-semibold text-white/40">Activité — 5 semaines</div>
          <ActivityHeatmap days={xpDays} />
          <div className="mt-4 grid gap-1.5 text-xs text-white/50">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-[3px] bg-white/[0.06]" />
              <span>Aucun XP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-[3px] bg-blue-500/30" />
              <span>{"< 50 XP"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-[3px] bg-blue-500/60" />
              <span>50–149 XP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-[3px] bg-blue-500" />
              <span>150+ XP</span>
            </div>
          </div>
          <div className="mt-4 border-t border-white/[0.07] pt-3 text-xs text-white/40">
            Elo {elo} · {games} parties
          </div>
        </div>
      </div>
    </div>
  );
}
