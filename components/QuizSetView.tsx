"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import type { QuizQuestion, AwardXpResult } from "@/lib/types";

// Chargé uniquement pour le propriétaire (voir isOwner plus bas) : les
// formulaires de création/édition/import et leurs dépendances (TopicSelector)
// ne sont ainsi jamais téléchargés par un visiteur qui vient juste répondre
// au quiz.
const QuizSetManage = dynamic(
  () => import("@/components/QuizSetManage").then((m) => m.QuizSetManage),
  { loading: () => <div className="mt-4 text-sm opacity-60">…</div> }
);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="mt-2 text-sm break-words [overflow-wrap:anywhere]">{msg}</div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function QuizSetView({
  setId,
  isOwner,
  initialQuestions,
}: {
  setId: string;
  isOwner: boolean;
  initialQuestions: QuizQuestion[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);

  const [runnerMsg, setRunnerMsg] = useState<string | null>(null);

  // Exam runner
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  const current = questions[questionIndex] ?? null;
  const canRun = questions.length > 0;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // Appelé par QuizSetManage après une création/édition/suppression/import —
  // met à jour la liste ET réinitialise le runner puisque le contenu sous-jacent
  // a changé (index de question, sélection, score n'ont plus de sens).
  function handleQuestionsChange(next: QuizQuestion[]) {
    setQuestions(next);
    setQuestionIndex(0);
    setSelected(null);
    setShowCorrection(false);
    setFinished(false);
    setScore(0);
    setExamStarted(false);
  }

  function resetRun() {
    setQuestionIndex(0);
    setSelected(null);
    setShowCorrection(false);
    setScore(0);
    setStartedAt(Date.now());
    setFinished(false);
    setRunnerMsg(null);
    setExamStarted(true);
  }

  // ---------------------------------------------------------------------------
  // Exam runner
  // ---------------------------------------------------------------------------

  async function submitAttempt(finalScore: number) {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const duration = startedAt
        ? Math.round((Date.now() - startedAt) / 1000)
        : null;
      await supabase.from("quiz_attempts").insert({
        user_id: auth.user.id,
        set_id: setId,
        score: finalScore,
        total: questions.length,
        duration_seconds: duration,
      });
    } catch {
      // Non-critical: swallow silently
    }
  }

  async function awardXpForAnswer(questionId: string, selectedIndex: number) {
    try {
      const { data, error } = await supabase.rpc("award_quiz_question_xp", {
        p_set_id: setId,
        p_question_id: questionId,
        p_selected_index: selectedIndex,
      });

      if (error) {
        setRunnerMsg(`XP error: ${error.message}`);
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as AwardXpResult | null;
      const xp = Number(row?.xp_awarded ?? 0) || 0;

      if (xp > 0) setRunnerMsg(`+${xp} XP`);
      else setRunnerMsg(`ℹ️ ${t("qcm.noXp")}`);
    } catch (e: unknown) {
      setRunnerMsg(
        `XP exception: ${friendlyError(e, "unknown")}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="grid gap-4 min-w-0 max-w-full overflow-x-hidden">

      {/* ---- Exam runner — usage quotidien, premier contenu visible ---- */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">{t("qcm.title")}</div>
            <div className="text-xs opacity-70">
              {questions.length} question{questions.length !== 1 ? "s" : ""} · {t("qcm.runnerHint")}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canRun}
            onClick={resetRun}
          >
            {t("qcm.start")}
          </button>
        </div>

        <StatusMsg msg={runnerMsg} />

        {!canRun && (
          <div className="mt-4 text-sm opacity-70">{t("qcm.noQuestions")}</div>
        )}

        {examStarted && canRun && current && !finished && (
          <div className="mt-4">
            <div className="text-xs opacity-70">
              {questionIndex + 1}/{questions.length}
            </div>

            <div className="mt-2 whitespace-pre-wrap text-base font-medium">
              {current.prompt}
            </div>

            <div className="mt-4 grid gap-2">
              {current.choices.map((choice, idx) => {
                const picked = selected === idx;
                const isCorrect = idx === current.correct_index;
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
                      {choice}
                    </span>
                  </button>
                );
              })}
            </div>

            {showCorrection && (
              <div className="mt-4 card-soft p-4 text-sm">
                <div className="font-semibold">{t("qcm.correction")}</div>
                <div className="mt-2 opacity-90">
                  {current.choices[current.correct_index]}
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
                {t("qcm.score")}: {score}
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                {!showCorrection ? (
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    disabled={selected == null}
                    onClick={() => {
                      if (selected == null) return;
                      if (selected === current.correct_index) {
                        setScore((s) => s + 1);
                        void awardXpForAnswer(current.id, selected);
                      } else {
                        setRunnerMsg(`${t("qcm.wrongAnswer")}`);
                      }
                      setShowCorrection(true);
                    }}
                  >
                    {t("qcm.validate")}
                  </button>
                ) : questionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setQuestionIndex((v) => v + 1);
                      setSelected(null);
                      setShowCorrection(false);
                      setRunnerMsg(null);
                    }}
                  >
                    {t("qcm.next")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      setFinished(true);
                      await submitAttempt(score);
                    }}
                  >
                    {t("qcm.finish")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {finished && (
          <div className="mt-4 card-soft p-4">
            <div className="text-sm opacity-70">{t("qcm.score")}</div>
            <div className="mt-1 text-2xl font-semibold">
              {score}/{questions.length}
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetRun}
              >
                {t("qcm.restart")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Outils de création/gestion — repliés, réservés au propriétaire.
          Chargés à la demande (dynamic import) : leur JS n'est jamais envoyé
          aux visiteurs qui viennent juste répondre au quiz. ---- */}
      {isOwner && (
        <details className="card p-4">
          <summary className="cursor-pointer select-none font-semibold">
            {t("qcm.manageTitle")}
          </summary>
          <QuizSetManage setId={setId} questions={questions} onQuestionsChange={handleQuestionsChange} />
        </details>
      )}
    </div>
  );
}
