"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { TopicSelector, TopicBadge } from "@/components/TopicSelector";
import { StatusMsg } from "@/components/StatusMsg";
import type { QuizQuestion } from "@/lib/types";

function parseChoices(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampCorrectIndex(value: number, choices: string[]): number {
  return Math.max(0, Math.min(choices.length - 1, value - 1));
}

// Outils de création/gestion des questions — extraits de QuizSetView pour que
// leur JS (formulaires, TopicSelector, logique d'import/export) ne soit
// chargé que pour le propriétaire du set (dynamic import côté appelant),
// pas envoyé à chaque visiteur qui vient simplement répondre au quiz.
export function QuizSetManage({
  setId,
  questions,
  onQuestionsChange,
}: {
  setId: string;
  questions: QuizQuestion[];
  onQuestionsChange: (next: QuizQuestion[]) => void;
}) {
  const supabase = useState(() => createClient())[0];
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);

  // Per-section feedback messages
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [editorMsg, setEditorMsg] = useState<string | null>(null);
  const [manageMsg, setManageMsg] = useState<string | null>(null);

  // Add question form
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [choicesText, setChoicesText] = useState("");
  const [correct, setCorrect] = useState(1);
  const [explanation, setExplanation] = useState("");
  const [topicId, setTopicId] = useState<number | null>(null);

  // Edit question form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editChoicesText, setEditChoicesText] = useState("");
  const [editCorrect, setEditCorrect] = useState(1);
  const [editExplanation, setEditExplanation] = useState("");
  const [editTopicId, setEditTopicId] = useState<number | null>(null);

  // Delete confirmation (inline — no window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Import JSON (textarea — no window.prompt)
  const [showImportInput, setShowImportInput] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async function fetchQuestions(): Promise<QuizQuestion[]> {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("id,prompt,choices,correct_index,explanation,position")
      .eq("set_id", setId)
      .order("position", { ascending: true });

    if (error) return questions;

    return (data ?? []).map((q) => ({
      ...q,
      choices: Array.isArray(q.choices) ? q.choices : [],
    })) as QuizQuestion[];
  }

  async function refreshQuestions() {
    const next = await fetchQuestions();
    onQuestionsChange(next);
  }

  async function reindexPositions(rows: QuizQuestion[]) {
    const tasks = rows
      .map((q, idx) => {
        if (q.position === idx) return null;
        return supabase
          .from("quiz_questions")
          .update({ position: idx })
          .eq("id", q.id)
          .eq("set_id", setId);
      })
      .filter((t) => t !== null);

    if (tasks.length > 0) {
      const results = await Promise.all(tasks);
      const firstErr = results.find((r) => r?.error)?.error;
      if (firstErr) throw new Error(firstErr.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Add question
  // ---------------------------------------------------------------------------

  async function addQuestion() {
    setEditorMsg(null);
    setBusy(true);
    try {
      if (!questionPrompt.trim()) throw new Error(t("common.error"));
      const lines = parseChoices(choicesText);
      if (lines.length < 2 || lines.length > 6) throw new Error(t("qcm.choicesError"));

      const idx0 = clampCorrectIndex(correct, lines);

      const { error } = await supabase.from("quiz_questions").insert({
        set_id: setId,
        prompt: questionPrompt.trim(),
        choices: lines,
        correct_index: idx0,
        explanation: explanation.trim() || null,
        position: questions.length,
        topic_id: topicId,
      });

      if (error) throw new Error(error.message);

      setQuestionPrompt("");
      setChoicesText("");
      setCorrect(1);
      setExplanation("");
      setTopicId(null);
      await refreshQuestions();
      setEditorMsg(t("common.saved"));
    } catch (e: unknown) {
      setEditorMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit question
  // ---------------------------------------------------------------------------

  function startEdit(q: QuizQuestion & { topic_id?: number | null }) {
    setManageMsg(null);
    setConfirmDeleteId(null);
    setEditingId(q.id);
    setEditPrompt(q.prompt);
    setEditChoicesText(q.choices.join("\n"));
    setEditCorrect((q.correct_index ?? 0) + 1);
    setEditExplanation(q.explanation ?? "");
    setEditTopicId(q.topic_id ?? null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPrompt("");
    setEditChoicesText("");
    setEditCorrect(1);
    setEditExplanation("");
    setEditTopicId(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setManageMsg(null);
    setBusy(true);
    try {
      if (!editPrompt.trim()) throw new Error(t("common.error"));
      const lines = parseChoices(editChoicesText);
      if (lines.length < 2 || lines.length > 6) throw new Error(t("qcm.choicesError"));

      const idx0 = clampCorrectIndex(editCorrect, lines);

      const { error } = await supabase
        .from("quiz_questions")
        .update({
          prompt: editPrompt.trim(),
          choices: lines,
          correct_index: idx0,
          explanation: editExplanation.trim() || null,
          topic_id: editTopicId,
        })
        .eq("id", editingId)
        .eq("set_id", setId);

      if (error) throw new Error(error.message);

      await refreshQuestions();
      cancelEdit();
      setManageMsg(t("common.saved"));
    } catch (e: unknown) {
      setManageMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete question
  // ---------------------------------------------------------------------------

  async function deleteQuestion(id: string) {
    setManageMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", id)
        .eq("set_id", setId);

      if (error) throw new Error(error.message);

      const updated = await fetchQuestions();
      await reindexPositions(updated);
      await refreshQuestions();

      setConfirmDeleteId(null);
      setManageMsg(t("common.saved"));
    } catch (e: unknown) {
      setManageMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Import / Export JSON
  // ---------------------------------------------------------------------------

  async function exportJson() {
    const payload = {
      version: 1,
      questions: questions.map((q) => ({
        prompt: q.prompt,
        choices: q.choices,
        correct_index: q.correct_index,
        explanation: q.explanation,
      })),
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setImportMsg("Copié dans le presse-papier");
  }

  async function importJson() {
    setBusy(true);
    setImportMsg(null);
    try {
      const text = importJsonText.trim();
      if (!text) return;

      const obj = JSON.parse(text) as { questions?: unknown[] };
      const arr = Array.isArray(obj?.questions) ? obj.questions : [];
      if (arr.length === 0) throw new Error(t("qcm.noQuestions"));

      const { error: delError } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("set_id", setId);
      if (delError) throw new Error(delError.message);

      const rows = arr.map((q: unknown, k: number) => {
        const question = q as Record<string, unknown>;
        return {
          set_id: setId,
          prompt: String(question.prompt ?? "").trim(),
          choices: Array.isArray(question.choices)
            ? question.choices.map((x) => String(x))
            : [],
          correct_index: Number(question.correct_index ?? 0),
          explanation: question.explanation ? String(question.explanation) : null,
          position: k,
        };
      });

      const { error: insError } = await supabase.from("quiz_questions").insert(rows);
      if (insError) throw new Error(insError.message);

      await refreshQuestions();
      setImportJsonText("");
      setShowImportInput(false);
      setImportMsg(t("common.saved"));
    } catch (e: unknown) {
      setImportMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mt-4 grid gap-4">
      {/* Import / Export */}
      <div className="card-soft p-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">{t("qcm.importExport")}</div>
            <div className="text-xs opacity-70">{t("qcm.importExportHint")}</div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn btn-secondary w-full sm:w-auto"
              onClick={exportJson}
            >
              {t("qcm.exportJson")}
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full sm:w-auto"
              onClick={() => {
                setShowImportInput((v) => !v);
                setImportMsg(null);
              }}
            >
              {t("qcm.importJson")}
            </button>
          </div>
        </div>

        {showImportInput && (
          <div className="mt-3 grid gap-2">
            <textarea
              className="input box-border w-full min-w-0 max-w-full font-mono"
              rows={6}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={t("qcm.importJsonPlaceholder")}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !importJsonText.trim()}
                onClick={importJson}
              >
                {busy ? t("common.saving") : t("qcm.importConfirm")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportInput(false);
                  setImportJsonText("");
                  setImportMsg(null);
                }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        <StatusMsg msg={importMsg} />
      </div>

      {/* Add question form */}
      <div className="card-soft p-4">
        <h2 className="font-semibold">{t("qcm.addQuestionTitle")}</h2>

        <div className="mt-4 grid gap-3">
          <textarea
            className="input box-border w-full min-w-0 max-w-full"
            rows={3}
            value={questionPrompt}
            onChange={(e) => setQuestionPrompt(e.target.value)}
            placeholder={t("qcm.promptPlaceholder")}
          />

          <textarea
            className="input box-border w-full min-w-0 max-w-full"
            rows={4}
            value={choicesText}
            onChange={(e) => setChoicesText(e.target.value)}
            placeholder={t("qcm.choicesPlaceholder")}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-sm opacity-80">{t("qcm.correctIndexLabel")}</label>
            <input
              type="number"
              min={1}
              max={6}
              className="input box-border w-full sm:w-24"
              value={correct}
              onChange={(e) => setCorrect(Number(e.target.value))}
            />
          </div>

          <input
            className="input box-border w-full min-w-0 max-w-full"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={t("qcm.explanationPlaceholder")}
          />

          <TopicSelector value={topicId} onChange={setTopicId} disabled={busy} />

          <button
            type="button"
            className="btn btn-primary w-full sm:w-auto"
            disabled={busy}
            onClick={addQuestion}
          >
            {busy ? t("common.saving") : t("qcm.addQuestion")}
          </button>

          <StatusMsg msg={editorMsg} />
        </div>
      </div>

      {/* Manage existing questions */}
      <div className="card-soft p-4">
        <div className="font-semibold">{t("qcm.manageTitle")}</div>
        <div className="mt-1 text-xs opacity-70">{t("qcm.manageDesc")}</div>

        <div className="mt-4 grid gap-2">
          {questions.length === 0 ? (
            <div className="text-sm opacity-70">{t("qcm.noQuestions")}</div>
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
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-70">
                        <span>{t("qcm.choiceCount", { n: q.choices.length })} • {t("qcm.correctAnswerN", { n: (q.correct_index ?? 0) + 1 })}</span>
                        <TopicBadge topicId={(q as QuizQuestion & { topic_id?: number | null }).topic_id ?? null} />
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
                        rows={3}
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder={t("qcm.promptPlaceholder")}
                      />

                      <textarea
                        className="input box-border w-full min-w-0 max-w-full"
                        rows={4}
                        value={editChoicesText}
                        onChange={(e) => setEditChoicesText(e.target.value)}
                        placeholder={t("qcm.choicesPlaceholder")}
                      />

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="text-sm opacity-80">
                          {t("qcm.correctIndexLabel")}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          className="input box-border w-full sm:w-24"
                          value={editCorrect}
                          onChange={(e) => setEditCorrect(Number(e.target.value))}
                        />
                      </div>

                      <input
                        className="input box-border w-full min-w-0 max-w-full"
                        value={editExplanation}
                        onChange={(e) => setEditExplanation(e.target.value)}
                        placeholder={t("qcm.explanationPlaceholder")}
                      />

                      <TopicSelector value={editTopicId} onChange={setEditTopicId} disabled={busy} />

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
