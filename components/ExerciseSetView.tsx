"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import type { ExerciseQuestion, AwardXpResult } from "@/lib/types";

const ExerciseSetManage = dynamic(
  () => import("@/components/ExerciseSetManage").then((m) => m.ExerciseSetManage),
  { loading: () => <div className="mt-4 text-sm opacity-60">…</div> }
);

function StatusMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div className="mt-2 text-sm break-words [overflow-wrap:anywhere]">{msg}</div>;
}

export function ExerciseSetView({
  setId,
  isOwner,
  initialQuestions,
}: {
  setId: string;
  isOwner: boolean;
  initialQuestions: ExerciseQuestion[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [questions, setQuestions] = useState<ExerciseQuestion[]>(initialQuestions);
  const [runnerMsg, setRunnerMsg] = useState<string | null>(null);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);

  const current = questions[questionIndex] ?? null;
  const canRun = questions.length > 0;

  function handleQuestionsChange(next: ExerciseQuestion[]) {
    setQuestions(next);
    setQuestionIndex(0);
    setAnswerInput("");
    setChecked(false);
    setFinished(false);
    setScore(0);
    setStarted(false);
  }

  function resetRun() {
    setQuestionIndex(0);
    setAnswerInput("");
    setChecked(false);
    setScore(0);
    setFinished(false);
    setRunnerMsg(null);
    setStarted(true);
  }

  async function checkAnswer() {
    if (!current) return;
    const answer = Number(answerInput);
    if (!Number.isFinite(answer)) {
      setRunnerMsg(t("exercises.answerError"));
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("award_exercise_xp", {
        p_set_id: setId,
        p_question_id: current.id,
        p_answer: answer,
      });

      if (error) {
        setRunnerMsg(`XP error: ${error.message}`);
        setChecked(true);
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as AwardXpResult | null;
      const correct = Boolean(row?.is_correct);
      const xp = Number(row?.xp_awarded ?? 0) || 0;

      setIsCorrect(correct);
      if (correct) setScore((s) => s + 1);
      setRunnerMsg(xp > 0 ? `+${xp} XP` : correct ? t("exercises.correctNoXp") : null);
      setChecked(true);
    } catch (e: unknown) {
      setRunnerMsg(friendlyError(e, "unknown"));
      setChecked(true);
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    const isLast = questionIndex >= questions.length - 1;
    if (isLast) {
      setFinished(true);
    } else {
      setQuestionIndex((v) => v + 1);
      setAnswerInput("");
      setChecked(false);
      setRunnerMsg(null);
    }
  }

  return (
    <div className="grid gap-4 min-w-0 max-w-full overflow-x-hidden">
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">{t("exercises.title")}</div>
            <div className="text-xs opacity-70">
              {questions.length} exercice{questions.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            type="button"
            className="box-border rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            disabled={!canRun}
            onClick={resetRun}
          >
            {t("exercises.start")}
          </button>
        </div>

        <StatusMsg msg={runnerMsg} />

        {!canRun && <div className="mt-4 text-sm opacity-70">{t("exercises.empty")}</div>}

        {started && canRun && current && !finished && (
          <div className="mt-4">
            <div className="text-xs opacity-70">
              {questionIndex + 1}/{questions.length}
            </div>

            <div className="mt-2 whitespace-pre-wrap text-base font-medium">{current.prompt}</div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="number"
                step="any"
                className="input w-full sm:w-48"
                value={answerInput}
                disabled={checked}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder={t("exercises.answerPlaceholder")}
              />
              {current.unit && <span className="text-sm opacity-60">{current.unit}</span>}
            </div>

            {checked && (
              <div
                className={`mt-4 rounded-xl border p-4 text-sm ${
                  isCorrect ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className={`font-semibold ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                  {isCorrect ? t("exercises.correct") : t("exercises.incorrect")}
                </div>
                <div className="mt-1 opacity-90">
                  {t("exercises.correctAnswerLabel")}: {current.correct_answer}
                  {current.unit ? ` ${current.unit}` : ""}
                </div>
                {current.explanation && (
                  <div className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] opacity-80">
                    {current.explanation}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm opacity-70">
                {t("exercises.score")}: {score}
              </div>
              {!checked ? (
                <button
                  type="button"
                  className="box-border w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50 sm:w-auto"
                  disabled={busy || !answerInput.trim()}
                  onClick={checkAnswer}
                >
                  {busy ? t("common.saving") : t("exercises.check")}
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm hover:bg-white/5"
                  onClick={goNext}
                >
                  {questionIndex < questions.length - 1 ? t("exercises.next") : t("exercises.finish")}
                </button>
              )}
            </div>
          </div>
        )}

        {finished && (
          <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
            <div className="text-sm opacity-70">{t("exercises.score")}</div>
            <div className="mt-1 text-2xl font-semibold">
              {score}/{questions.length}
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm hover:bg-white/5"
                onClick={resetRun}
              >
                {t("exercises.restart")}
              </button>
            </div>
          </div>
        )}
      </div>

      {isOwner && (
        <details className="rounded-2xl border p-4">
          <summary className="cursor-pointer select-none font-semibold">{t("exercises.manageTitle")}</summary>
          <ExerciseSetManage setId={setId} questions={questions} onQuestionsChange={handleQuestionsChange} />
        </details>
      )}
    </div>
  );
}
