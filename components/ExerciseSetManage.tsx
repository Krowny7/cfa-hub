"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { StatusMsg } from "@/components/StatusMsg";
import type { ExerciseQuestion } from "@/lib/types";

const LETTERS = ["A", "B", "C"];

function parseChoices(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampCorrectIndex(value: number, choices: string[]): number {
  return Math.max(0, Math.min(choices.length - 1, value - 1));
}

// Outils de création/gestion des exercices — même découpage que QuizSetManage
// (chargé uniquement pour le propriétaire via dynamic import côté appelant).
// Format QCM à 3 options (A/B/C), fidèle au format CFA réel, au lieu d'une
// réponse numérique libre à taper.
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
  const [choicesText, setChoicesText] = useState("");
  const [correct, setCorrect] = useState(1);
  const [explanation, setExplanation] = useState("");

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editChoicesText, setEditChoicesText] = useState("");
  const [editCorrect, setEditCorrect] = useState(1);
  const [editExplanation, setEditExplanation] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function fetchQuestions(): Promise<ExerciseQuestion[]> {
    const { data, error } = await supabase
      .from("exercise_questions")
      .select("id,set_id,prompt,choices,correct_index,explanation,position")
      .eq("set_id", setId)
      .order("position", { ascending: true });

    if (error) return questions;
    return (data ?? []).map((q) => ({
      ...q,
      choices: Array.isArray(q.choices) ? q.choices : [],
    })) as ExerciseQuestion[];
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
      const lines = parseChoices(choicesText);
      if (lines.length !== 3) throw new Error(t("exercises.choicesError"));

      const idx0 = clampCorrectIndex(correct, lines);

      const { error } = await supabase.from("exercise_questions").insert({
        set_id: setId,
        prompt: prompt.trim(),
        choices: lines,
        correct_index: idx0,
        explanation: explanation.trim() || null,
        position: questions.length,
      });
      if (error) throw new Error(error.message);

      setPrompt("");
      setChoicesText("");
      setCorrect(1);
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
    setEditChoicesText(q.choices.join("\n"));
    setEditCorrect((q.correct_index ?? 0) + 1);
    setEditExplanation(q.explanation ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPrompt("");
    setEditChoicesText("");
    setEditCorrect(1);
    setEditExplanation("");
  }

  async function saveEdit() {
    if (!editingId) return;
    setManageMsg(null);
    setBusy(true);
    try {
      if (!editPrompt.trim()) throw new Error(t("common.error"));
      const lines = parseChoices(editChoicesText);
      if (lines.length !== 3) throw new Error(t("exercises.choicesError"));

      const idx0 = clampCorrectIndex(editCorrect, lines);

      const { error } = await supabase
        .from("exercise_questions")
        .update({
          prompt: editPrompt.trim(),
          choices: lines,
          correct_index: idx0,
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
      <div className="card-soft p-4">
        <h2 className="font-semibold">{t("exercises.addTitle")}</h2>

        <div className="mt-4 grid gap-3">
          <textarea
            className="input box-border w-full min-w-0 max-w-full"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("exercises.promptPlaceholder")}
          />

          <textarea
            className="input box-border w-full min-w-0 max-w-full font-mono text-sm"
            rows={3}
            value={choicesText}
            onChange={(e) => setChoicesText(e.target.value)}
            placeholder={t("exercises.choicePlaceholder")}
          />

          <div>
            <label className="text-xs opacity-70">{t("exercises.correctChoiceLabel")}</label>
            <select
              className="select mt-1"
              value={correct}
              onChange={(e) => setCorrect(Number(e.target.value))}
            >
              {LETTERS.map((letter, idx) => (
                <option key={letter} value={idx + 1}>
                  {letter}
                </option>
              ))}
            </select>
          </div>

          <textarea
            className="input box-border w-full min-w-0 max-w-full"
            rows={4}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={t("exercises.explanationPlaceholder")}
          />

          <button
            type="button"
            className="btn btn-primary w-full sm:w-auto"
            disabled={busy}
            onClick={addQuestion}
          >
            {busy ? t("common.saving") : t("exercises.addQuestion")}
          </button>

          <StatusMsg msg={editorMsg} />
        </div>
      </div>

      {/* Manage existing exercises */}
      <div className="card-soft p-4">
        <div className="font-semibold">{t("exercises.manageTitle")}</div>

        <div className="mt-4 grid gap-2">
          {questions.length === 0 ? (
            <div className="text-sm opacity-70">{t("exercises.empty")}</div>
          ) : (
            questions.map((q, idx) => {
              const isEditing = editingId === q.id;
              const isConfirmingDelete = confirmDeleteId === q.id;

              return (
                <div key={q.id} className="card-soft p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium break-words sm:truncate">
                        Q{idx + 1}. {q.prompt}
                      </div>
                      <div className="mt-1 text-xs opacity-70">
                        {t("exercises.correctChoiceLabel")}: {LETTERS[q.correct_index ?? 0]}
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                      {!isEditing ? (
                        <button
                          type="button"
                          className="btn btn-secondary w-full sm:w-auto"
                          onClick={() => startEdit(q)}
                        >
                          {t("qcm.editQuestion")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary w-full sm:w-auto"
                          onClick={cancelEdit}
                        >
                          {t("common.cancel")}
                        </button>
                      )}

                      {isConfirmingDelete ? (
                        <div className="flex w-full gap-2 sm:w-auto">
                          <button
                            type="button"
                            className="btn btn-danger flex-1 sm:flex-none"
                            disabled={busy}
                            onClick={() => deleteQuestion(q.id)}
                          >
                            {t("common.confirm")}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary flex-1 sm:flex-none"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger w-full sm:w-auto"
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
                        className="input box-border w-full min-w-0 max-w-full"
                        rows={4}
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                      />
                      <textarea
                        className="input box-border w-full min-w-0 max-w-full font-mono text-sm"
                        rows={3}
                        value={editChoicesText}
                        onChange={(e) => setEditChoicesText(e.target.value)}
                      />
                      <select
                        className="select"
                        value={editCorrect}
                        onChange={(e) => setEditCorrect(Number(e.target.value))}
                      >
                        {LETTERS.map((letter, i) => (
                          <option key={letter} value={i + 1}>
                            {letter}
                          </option>
                        ))}
                      </select>
                      <textarea
                        className="input box-border w-full min-w-0 max-w-full"
                        rows={4}
                        value={editExplanation}
                        onChange={(e) => setEditExplanation(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary w-full sm:w-auto"
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
