"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { StatusMsg } from "@/components/StatusMsg";
import type { ExerciseQuestion, AwardXpResult } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const ExerciseSetManage = dynamic(
  () => import("@/components/ExerciseSetManage").then((m) => m.ExerciseSetManage),
  { loading: () => <div className="mt-4 text-sm opacity-60">…</div> }
);

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
  const [selected, setSelected] = useState<number | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  // La bonne réponse n'est connue qu'APRÈS soumission (voir
  // migration_fix_answer_leak.sql) — révélée par award_exercise_xp, jamais
  // lue depuis current.correct_index qui peut être undefined.
  const [revealed, setRevealed] = useState<{ correctIndex: number; explanation: string | null } | null>(null);

  const current = questions[questionIndex] ?? null;
  const canRun = questions.length > 0;

  function handleQuestionsChange(next: ExerciseQuestion[]) {
    setQuestions(next);
    setQuestionIndex(0);
    setSelected(null);
    setShowCorrection(false);
    setFinished(false);
    setScore(0);
    setStarted(false);
    setRevealed(null);
  }

  function resetRun() {
    setQuestionIndex(0);
    setSelected(null);
    setShowCorrection(false);
    setScore(0);
    setFinished(false);
    setRunnerMsg(null);
    setStarted(true);
    setRevealed(null);
  }

  // Soumet la réponse au serveur, qui la corrige ET renvoie la bonne réponse
  // (correct_index/explanation) — le client ne les connaît jamais avant cet
  // appel (voir migration_fix_answer_leak.sql).
  async function submitAnswer(questionId: string, selectedIndex: number) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("award_exercise_xp", {
        p_set_id: setId,
        p_question_id: questionId,
        p_selected_index: selectedIndex,
      });

      if (error) {
        setRunnerMsg(friendlyError(error, "unknown"));
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as AwardXpResult | null;
      const xp = Number(row?.xp_awarded ?? 0) || 0;
      const isCorrect = Boolean(row?.is_correct);
      const correctIndex = row?.correct_index;

      if (typeof correctIndex === "number") {
        setRevealed({ correctIndex, explanation: row?.explanation ?? null });
      }
      if (isCorrect) setScore((s) => s + 1);
      setRunnerMsg(isCorrect ? (xp > 0 ? `+${xp} XP` : t("exercises.correctNoXp")) : t("exercises.incorrect"));
      setShowCorrection(true);
    } catch (e: unknown) {
      setRunnerMsg(friendlyError(e, "unknown"));
      setShowCorrection(true);
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
      setSelected(null);
      setShowCorrection(false);
      setRunnerMsg(null);
      setRevealed(null);
    }
  }

  return (
    <div className="grid gap-4 min-w-0 max-w-full overflow-x-hidden">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">{t("exercises.title")}</div>
            <div className="text-xs opacity-70">
              {questions.length} exercice{questions.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
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

            <div className="mt-4 grid gap-2">
              {current.choices.map((choice, idx) => {
                const picked = selected === idx;
                const isCorrect = showCorrection && idx === revealed?.correctIndex;
                const show = showCorrection;

                const bg =
                  show && picked
                    ? isCorrect
                      ? "bg-green-500/15"
                      : "bg-red-500/15"
                    : show && isCorrect
                      ? "bg-green-500/10"
                      : "bg-neutral-900/40";

                return (
                  <button
                    key={idx}
                    type="button"
                    className={`w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm hover:bg-white/5 ${bg}`}
                    onClick={() => {
                      if (showCorrection) return;
                      setSelected(idx);
                    }}
                  >
                    <span className="opacity-90 break-words [overflow-wrap:anywhere]">
                      <span className="mr-2 font-semibold opacity-60">{LETTERS[idx]}.</span>
                      {choice}
                    </span>
                  </button>
                );
              })}
            </div>

            {showCorrection && revealed && (
              <div className="mt-4 card-soft p-4 text-sm">
                <div className="font-semibold">{t("exercises.correction")}</div>
                <div className="mt-2 opacity-90">
                  {LETTERS[revealed.correctIndex]}. {current.choices[revealed.correctIndex]}
                </div>
                {revealed.explanation && (
                  <div className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] opacity-80">
                    {revealed.explanation}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm opacity-70">
                {t("exercises.score")}: {score}
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                {!showCorrection ? (
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    disabled={selected == null || busy}
                    onClick={() => {
                      if (selected == null) return;
                      void submitAnswer(current.id, selected);
                    }}
                  >
                    {busy ? t("common.saving") : t("exercises.check")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={goNext}
                  >
                    {questionIndex < questions.length - 1 ? t("exercises.next") : t("exercises.finish")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {finished && (
          <div className="mt-4 card-soft p-4">
            <div className="text-sm opacity-70">{t("exercises.score")}</div>
            <div className="mt-1 text-2xl font-semibold">
              {score}/{questions.length}
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetRun}
              >
                {t("exercises.restart")}
              </button>
            </div>
          </div>
        )}
      </div>

      {isOwner && (
        <details className="card p-4">
          <summary className="cursor-pointer select-none font-semibold">{t("exercises.manageTitle")}</summary>
          <ExerciseSetManage setId={setId} questions={questions} onQuestionsChange={handleQuestionsChange} />
        </details>
      )}
    </div>
  );
}
