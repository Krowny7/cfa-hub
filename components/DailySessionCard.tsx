"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { getLastPath } from "@/components/RouteTracker";
import { readDaily, readStreak, type DailyState, type StreakState } from "@/lib/dailySessionClient";

type Suggestion = {
  href: string;
  label: string;
  hint?: string | null;
};

type Props = {
  flashcardsSuggestion: Suggestion;
  qcmSuggestion: Suggestion;
};

// NOTE: Daily state + streak are handled by lib/dailySessionClient.

export function DailySessionCard({ flashcardsSuggestion, qcmSuggestion }: Props) {
  const { t } = useI18n();
  const router = useRouter();

  const [daily, setDaily] = useState<DailyState | null>(null);
  const [streak, setStreak] = useState<StreakState>({ lastCompletedDate: null, streak: 0 });
  const [lastPath, setLastPath] = useState<string | null>(null);

  useEffect(() => {
    setDaily(readDaily());
    setStreak(readStreak());
    try {
      setLastPath(getLastPath());
    } catch {
      setLastPath(null);
    }
  }, []);

  const progress = useMemo(() => {
    if (!daily) return { done: 0, total: 2 };
    const done = Number(daily.stepFlashcards) + Number(daily.stepQcm);
    return { done, total: 2 };
  }, [daily]);

  // Auto-validate: steps are marked done by the activity runners.
  // This card is just a launcher + status display.

  const streakLabel = streak.streak > 0 ? `🔥 ${streak.streak}` : "—";

  // Defensive: ensure we always have a valid href. If a suggestion is missing,
  // we still let the user reach the list page.
  const flashHref = flashcardsSuggestion?.href || "/flashcards";
  const qcmHref = qcmSuggestion?.href || "/qcm";

  function withDailyParams(href: string, step: "flashcards" | "qcm") {
    // Preserve existing query params.
    const u = new URL(href, "http://local");
    u.searchParams.set("daily", "1");
    u.searchParams.set("step", step);
    return u.pathname + u.search;
  }

  function goTo(kind: "flashcards" | "qcm") {
    const href = kind === "flashcards" ? withDailyParams(flashHref, "flashcards") : withDailyParams(qcmHref, "qcm");
    router.push(href);
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{t("daily.title")}</h2>
          <p className="mt-1 max-w-[72ch] text-sm text-white/80">{t("daily.subtitle")}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80">
            {t("daily.streak")} {streakLabel}
          </div>
          {lastPath ? (
            <button
              type="button"
              className="btn btn-ghost whitespace-nowrap"
              onClick={() => router.push(lastPath)}
            >
              {t("daily.continue")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="card-soft p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium opacity-70">{t("daily.session")}</div>
              <div className="mt-1 text-base font-semibold">{t("daily.sessionDuration")}</div>
            </div>
            <div className="text-xs opacity-70">
              {t("daily.progress", { done: progress.done, total: progress.total })}
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-base" aria-hidden>
                  {daily?.stepFlashcards ? "✅" : "⬜"}
                </span>
                <span className="opacity-90 truncate">{t("daily.stepFlashcards")}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary whitespace-nowrap shrink-0"
                onClick={() => goTo("flashcards")}
              >
                {t("daily.go")}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-base" aria-hidden>
                  {daily?.stepQcm ? "✅" : "⬜"}
                </span>
                <span className="opacity-90 truncate">{t("daily.stepQcm")}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary whitespace-nowrap shrink-0"
                onClick={() => goTo("qcm")}
              >
                {t("daily.go")}
              </button>
            </div>
          </div>

          <div className="mt-3 text-xs opacity-70">
            {daily?.completed ? t("daily.done") : t("daily.hint")}
          </div>
        </div>

        <div className="card-soft p-4">
          <div className="text-xs font-medium opacity-70">{t("daily.smartPick")}</div>
          <div className="mt-2 grid gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-sm font-semibold">{t("daily.pickFlashcards")}</div>
              <div className="mt-1 text-xs opacity-70 truncate">{flashcardsSuggestion.label}</div>
              {flashcardsSuggestion.hint ? <div className="mt-1 text-xs opacity-70">{flashcardsSuggestion.hint}</div> : null}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-sm font-semibold">{t("daily.pickQcm")}</div>
              <div className="mt-1 text-xs opacity-70 truncate">{qcmSuggestion.label}</div>
              {qcmSuggestion.hint ? <div className="mt-1 text-xs opacity-70">{qcmSuggestion.hint}</div> : null}
            </div>
          </div>

          <div className="mt-3 text-xs opacity-70">
            {t("daily.localNote")}
          </div>
        </div>
      </div>
    </div>
  );
}
