"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { QuizSetView } from "@/components/QuizSetView";
import { completeDailyIfReady, markDailyStepDone } from "@/lib/dailySessionClient";

type Question = {
  id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  position: number;
};

export function DailyQcmRunner({
  setId,
  canEdit,
  initialQuestions
}: {
  setId: string;
  canEdit: boolean;
  initialQuestions: Question[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [returning, setReturning] = useState(false);

  function handleDone() {
    markDailyStepDone("qcm");
    completeDailyIfReady();
    setReturning(true);
    setTimeout(() => router.push("/dashboard?daily_done=qcm"), 700);
  }

  return (
    <div className="grid gap-4">
      <div className="card-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold opacity-70">{t("daily.title")}</div>
            <div className="mt-1 text-sm opacity-90">{t("daily.stepQcm")}</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard")} disabled={returning}>
            {t("common.close")}
          </button>
        </div>
        {returning ? <div className="mt-2 text-xs opacity-70">✅ {t("daily.done")}</div> : null}
      </div>

      <QuizSetView setId={setId} isOwner={canEdit} initialQuestions={initialQuestions as any} dailyMode onDailyComplete={handleDone} />
    </div>
  );
}
