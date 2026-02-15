"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { FlashcardReview } from "@/components/FlashcardReview";
import { completeDailyIfReady, markDailyStepDone } from "@/lib/dailySessionClient";

type Card = { id: string; front: string; back: string };

export function DailyFlashcardsRunner({ cards }: { cards: Card[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [returning, setReturning] = useState(false);

  function handleDone() {
    markDailyStepDone("flashcards");
    completeDailyIfReady();
    setReturning(true);
    // Small delay so the user gets a clear feedback.
    setTimeout(() => router.push("/dashboard?daily_done=flashcards"), 600);
  }

  return (
    <div className="grid gap-4">
      <div className="card-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold opacity-70">{t("daily.title")}</div>
            <div className="mt-1 text-sm opacity-90">{t("daily.stepFlashcards")}</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard")}
            disabled={returning}
          >
            {t("common.close")}
          </button>
        </div>
        {returning ? <div className="mt-2 text-xs opacity-70">✅ {t("daily.done")}</div> : null}
      </div>

      <FlashcardReview cards={cards as any} dailyMode dailyGoal={10} onDailyComplete={handleDone} />
    </div>
  );
}
