"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import type { ExerciseQuestion } from "@/lib/types";

function StatusMsg({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="mt-2 text-sm break-words [overflow-wrap:anywhere]">{msg}</div>
  );
}

// Outils de création/gestion des exercices — même découpage que QuizSetManage
// (chargé uniquement pour le propriétaire via dynamic import côté appelant).
export function ExerciseSetManage({
  setId,
  questions,
  onQuestionsChange,
}: {
  setId: string;
  questions: ExerciseQuestion[];
  onQuestionsChange: (next: ExerciseQuestion[]) => void;
}) {
  const supabase = useState(() => createClient())[0];
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);
  const [editorMsg, setEditorMsg] = useState<string | null>(null);
  const [manageMsg, setManageMsg] = useState<string | null>(null);

  // Add exercise form
  const [prompt, setPrompt] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [tolerance, setTolerance] = useState("0.01");
  const [unit, setUnit] = useState("");
  const [explanation, setExplanation] = useState("");

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editCorrectAnswer, setEditCorrectAnswer] = useState("");
  const [editTolerance, setEditTolerance] = useState("0.01");
  const [editUnit, setEditUnit] = useState("");
  const [editExplanation, setEditExplanation] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function fetchQuestions(): Promise<ExerciseQuestion[]> {
    const { data, error } = await supabase
      .from("exercise_questions")
      .select("id,set_id,prompt,correct_answer,tolerance,unit,explanation,position")
      .eq("set_id", setId)
      .order("position", { ascending: true });

    if (error) return questions;
    return (data ?? []) as ExerciseQuestion[];
  }

  async function refreshQuestions() {
    onQuestionsChange(await fetchQuestions());
  }

  async function reindexPositions(rows: ExerciseQuestion[]) {
    const tasks = rows
      .map((q, idx) => {
        if (q.position === idx) return null;
        return supabase.from("exercise_questions").update({ position: idx }).eq("id", q.id).eq("set_id", setId);
      })
      .filter((t) => t !== null);

    if (tasks.length > 0) {
      const results = await Promise.all(tasks);
      const firstErr = results.find((r) => r?.error)?.error;
      if (firstErr) throw new Error(firstErr.message);
    }
  }

  async function addQuestion() {
    setEditorMsg(null);
    setBusy(true);
    try {
      if (!prompt.trim()) throw new Error(t("common.error"));
      const answer = Number(correctAnswer);
      if (!Number.isFinite(answer)) throw new Error(t("exercises.answerError"));
      const tol = Number(tolerance);

      const { error } = await supabase.from("exercise_questions").insert({
        set_id: setId,
        prompt: prompt.trim(),
        correct_answer: answer,
        tolerance: Number.isFinite(tol) && tol >= 0 ? tol : 0.01,
        unit: unit.trim() || null,
        explanation: explanation.trim() || null,
        position: questions.length,
      });
      if (error) throw new Error(error.message);

      setPrompt("");
      setCorrectAnswer("");
      setTolerance("0.01");
      setUnit("");
      setExplanation("");
      await refreshQuestions();
      setEditorMsg(t("common.saved"));
    } catch (e: unknown) {
      setEditorMsg(friendlyError(e, t("common.error")));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(q: ExerciseQuestion) {
    setManageMsg(null);
    setConfirmDeleteId(null);
    setEditingId(q.id);
    setEditPrompt(q.prompt);
    setEditCorrectAnswer(String(q.correct_answer));
    setEditTolerance(String(q.tolerance));
    setEditUnit(q.unit ?? "");
    setEditExplanation(q.explanation ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPrompt("");
    setEditCorrectAnswer("");
    setEditTolerance("0.01");
    setEditUnit("");
    setEditExplanation("");
  }

  async function saveEdit() {
    if (!editingId) return;
    setManageMsg(null);
    setBusy(true);
    try {
      if (!editPrompt.trim()) throw new Error(t("common.error"));
      const answer = Number(editCorrectAnswer);
      if (!Number.isFinite(answer)) throw new Error(t("exercises.answerError"));
      const tol = Number(editTolerance);

      const { error } = await supabase
        .from("exercise_questions")
        .update({
          prompt: editPrompt.trim(),
          correct_answer: answer,
          tolerance: Number.isFinite(tol) && tol >= 0 ? tol : 0.01,
          unit: editUnit.trim() || null,
          explanation: editExplanation.trim() || null,
        })
        .eq("id", editingId)
        .eq("set_id", setId);
      if (error) throw new Error(error.message);

      await refreshQuestions();
      cancelEdit();
      setManageMsg(t("common.saved"));
    } catch (e: unknown) {
      setManageMsg(friendlyError(e, t("common.error")));
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(id: string) {
    setManageMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("exercise_questions").delete().eq("id", id).eq("set_id", setId);
      if (error) throw new Error(error.message);

      const updated = await fetchQuestions();
      await reindexPositions(updated);
      await refreshQuestions();

      setConfirmDeleteId(null);
      setManageMsg(t("common.saved"));
    } catch (e: unknown) {
      setManageMsg(friendlyError(e, t("common.error")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-4">
      {/* Add exercise form */}
      <div className="rounded-xl border border-white/10 p-4">
        <h2 className="font-semibold">{t("exercises.addTitle")}</h2>

        <div className="mt-4 grid gap-3">
          <textarea
            className="box-border w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("exercises.promptPlaceholder")}
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs opacity-70">{t("exercises.correctAnswerLabel")}</label>
              <input
                type="number"
                step="any"
                className="input mt-1"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs opacity-70">{t("exercises.toleranceLabel")}</label>
              <input
                type="number"
                step="any"
                min={0}
                className="input mt-1"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs opacity-70">{t("exercises.unitLabel")}</label>
              <input
                className="input mt-1"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, $, ans…"
              />
            </div>
          </div>

          <textarea
            className="box-border w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={t("exercises.explanationPlaceholder")}
          />

          <button
            type="button"
            className="box-border w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50 sm:w-auto"
            disabled={busy}
            onClick={addQuestion}
          >
            {busy ? t("common.saving") : t("exercises.addQuestion")}
          </button>

          <StatusMsg msg={editorMsg} />
        </div>
      </div>

      {/* Manage existing exercises */}
      <div className="rounded-xl border border-white/10 p-4">
        <div className="font-semibold">{t("exercises.manageTitle")}</div>

        <div className="mt-4 grid gap-2">
          {questions.length === 0 ? (
            <div className="text-sm opacity-70">{t("exercises.empty")}</div>
          ) : (
            questions.map((q, idx) => {
              const isEditing = editingId === q.id;
              const isConfirmingDelete = confirmDeleteId === q.id;

              return (
                <div key={q.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium break-words sm:truncate">
                        Q{idx + 1}. {q.prompt}
                      </div>
                      <div className="mt-1 text-xs opacity-70">
                        {t("exercises.correctAnswerLabel")}: {q.correct_answer}{q.unit ? ` ${q.unit}` : ""} (± {q.tolerance})
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                      {!isEditing ? (
                        <button
                          type="button"
                          className="box-border w-full rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto"
                          onClick={() => startEdit(q)}
                        >
                          {t("qcm.editQuestion")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="box-border w-full rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto"
                          onClick={cancelEdit}
                        >
                          {t("common.cancel")}
                        </button>
                      )}

                      {isConfirmingDelete ? (
                        <div className="flex w-full gap-2 sm:w-auto">
                          <button
                            type="button"
                            className="box-border flex-1 rounded-xl border border-red-500/50 bg-red-500/20 px-3 py-2 text-sm text-red-100 hover:bg-red-500/30 sm:flex-none"
                            disabled={busy}
                            onClick={() => deleteQuestion(q.id)}
                          >
                            {t("common.confirm")}
                          </button>
                          <button
                            type="button"
                            className="box-border flex-1 rounded-xl border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 sm:flex-none"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="box-border w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20 sm:w-auto"
                          disabled={busy}
                          onClick={() => {
                            setConfirmDeleteId(q.id);
                            cancelEdit();
                          }}
                        >
                          {t("qcm.deleteQuestion")}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-3 grid gap-2">
                      <textarea
                        className="box-border w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
                        rows={4}
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <input
                          type="number"
                          step="any"
                          className="input"
                          value={editCorrectAnswer}
                          onChange={(e) => setEditCorrectAnswer(e.target.value)}
                        />
                        <input
                          type="number"
                          step="any"
                          min={0}
                          className="input"
                          value={editTolerance}
                          onChange={(e) => setEditTolerance(e.target.value)}
                        />
                        <input
                          className="input"
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                        />
                      </div>
                      <textarea
                        className="box-border w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm"
                        rows={4}
                        value={editExplanation}
                        onChange={(e) => setEditExplanation(e.target.value)}
                      />
                      <button
                        type="button"
                        className="box-border w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50 sm:w-auto"
                        disabled={busy}
                        onClick={saveEdit}
                      >
                        {busy ? t("common.saving") : t("common.save")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <StatusMsg msg={manageMsg} />
      </div>
    </div>
  );
}
