"use client";

import { useState } from "react";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { TopicSelector, TopicBadge } from "@/components/TopicSelector";
import { Field } from "@/components/ContentDetailHeader";
import type { QuizQuestion } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function parseChoices(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampCorrectIndex(value: number, choices: string[]): number {
  return Math.max(0, Math.min(choices.length - 1, value - 1));
}

function Status({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="status" className="t-small break-words [overflow-wrap:anywhere]">
      {msg}
    </p>
  );
}

type Draft = { prompt: string; choices: string; correct: number; explanation: string; topicId: number | null };

/** Formulaire d'une question (ajout et modification). */
function QuestionForm({
  draft,
  onChange,
  onSubmit,
  submitLabel,
  busy,
  idPrefix,
  extra,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy: boolean;
  idPrefix: string;
  extra?: React.ReactNode;
}) {
  const { t } = useI18n();
  const lines = parseChoices(draft.choices);
  return (
    <div className="grid gap-5">
      <Field label="Énoncé" htmlFor={`${idPrefix}-prompt`}>
        <textarea
          id={`${idPrefix}-prompt`}
          className="input box-border w-full min-w-0"
          rows={3}
          value={draft.prompt}
          onChange={(e) => onChange({ ...draft, prompt: e.target.value })}
          placeholder={t("qcm.promptPlaceholder")}
        />
      </Field>
      <Field label="Choix" hint="un par ligne, de 2 à 6" htmlFor={`${idPrefix}-choices`}>
        <textarea
          id={`${idPrefix}-choices`}
          className="input box-border w-full min-w-0"
          rows={4}
          value={draft.choices}
          onChange={(e) => onChange({ ...draft, choices: e.target.value })}
          placeholder={t("qcm.choicesPlaceholder")}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Bonne réponse" htmlFor={`${idPrefix}-correct`}>
          <select
            id={`${idPrefix}-correct`}
            className="select"
            value={draft.correct}
            onChange={(e) => onChange({ ...draft, correct: Number(e.target.value) })}
            disabled={lines.length === 0}
          >
            {(lines.length ? lines : [""]).map((c, i) => (
              <option key={i} value={i + 1}>
                {LETTERS[i] ?? i + 1}) {c ? (c.length > 60 ? c.slice(0, 60) + "…" : c) : "écris d'abord les choix"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Matière">
          <div>
            <TopicSelector value={draft.topicId} onChange={(v) => onChange({ ...draft, topicId: v })} disabled={busy} />
          </div>
        </Field>
      </div>
      <Field label="Explication" hint="facultative" htmlFor={`${idPrefix}-expl`}>
        <textarea
          id={`${idPrefix}-expl`}
          className="input box-border w-full min-w-0"
          rows={2}
          value={draft.explanation}
          onChange={(e) => onChange({ ...draft, explanation: e.target.value })}
          placeholder={t("qcm.explanationPlaceholder")}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onSubmit}>
          {busy ? t("common.saving") : submitLabel}
        </button>
        {extra}
      </div>
    </div>
  );
}

const EMPTY: Draft = { prompt: "", choices: "", correct: 1, explanation: "", topicId: null };

// Outils de création/gestion des questions — extraits de QuizSetView pour que
// leur JS (formulaires, TopicSelector, logique d'import/export) ne soit
// chargé que pour le propriétaire du set (dynamic import côté appelant),
// pas envoyé à chaque visiteur qui vient simplement répondre au quiz.
// Trois onglets : la liste (modifier, supprimer), l'ajout, l'import/export.
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

  const [tab, setTab] = useState<"list" | "add" | "io">("list");
  const [busy, setBusy] = useState(false);

  // Messages par section
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [editorMsg, setEditorMsg] = useState<string | null>(null);
  const [manageMsg, setManageMsg] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(EMPTY);

  // Suppression : confirmation en ligne (pas de window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Import JSON (zone de texte — pas de window.prompt)
  const [importJsonText, setImportJsonText] = useState("");
  const [copied, setCopied] = useState(false);

  // ---------------------------------------------------------------------------
  // Données
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
        return supabase.from("quiz_questions").update({ position: idx }).eq("id", q.id).eq("set_id", setId);
      })
      .filter((x) => x !== null);

    if (tasks.length > 0) {
      const results = await Promise.all(tasks);
      const firstErr = results.find((r) => r?.error)?.error;
      if (firstErr) throw new Error(firstErr.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Ajout
  // ---------------------------------------------------------------------------

  async function addQuestion() {
    setEditorMsg(null);
    setBusy(true);
    try {
      if (!draft.prompt.trim()) throw new Error("Écris l'énoncé de la question.");
      const lines = parseChoices(draft.choices);
      if (lines.length < 2 || lines.length > 6) throw new Error(t("qcm.choicesError"));

      const { error } = await supabase.from("quiz_questions").insert({
        set_id: setId,
        prompt: draft.prompt.trim(),
        choices: lines,
        correct_index: clampCorrectIndex(draft.correct, lines),
        explanation: draft.explanation.trim() || null,
        position: questions.length,
        topic_id: draft.topicId,
      });
      if (error) throw new Error(error.message);

      setDraft(EMPTY);
      await refreshQuestions();
      setEditorMsg("Question ajoutée.");
    } catch (e: unknown) {
      setEditorMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Modification
  // ---------------------------------------------------------------------------

  function startEdit(q: QuizQuestion & { topic_id?: number | null }) {
    setManageMsg(null);
    setConfirmDeleteId(null);
    setEditingId(q.id);
    setEdit({
      prompt: q.prompt,
      choices: q.choices.join("\n"),
      correct: (q.correct_index ?? 0) + 1,
      explanation: q.explanation ?? "",
      topicId: q.topic_id ?? null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEdit(EMPTY);
  }

  async function saveEdit() {
    if (!editingId) return;
    setManageMsg(null);
    setBusy(true);
    try {
      if (!edit.prompt.trim()) throw new Error("Écris l'énoncé de la question.");
      const lines = parseChoices(edit.choices);
      if (lines.length < 2 || lines.length > 6) throw new Error(t("qcm.choicesError"));

      const { error } = await supabase
        .from("quiz_questions")
        .update({
          prompt: edit.prompt.trim(),
          choices: lines,
          correct_index: clampCorrectIndex(edit.correct, lines),
          explanation: edit.explanation.trim() || null,
          topic_id: edit.topicId,
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
  // Suppression
  // ---------------------------------------------------------------------------

  async function deleteQuestion(id: string) {
    setManageMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id).eq("set_id", setId);
      if (error) throw new Error(error.message);

      const updated = await fetchQuestions();
      await reindexPositions(updated);
      await refreshQuestions();

      setConfirmDeleteId(null);
      setManageMsg("Question supprimée.");
    } catch (e: unknown) {
      setManageMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Import / export JSON
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
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setImportMsg("JSON copié dans le presse-papier.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setImportMsg("Impossible de copier automatiquement.");
    }
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

      const { error: delError } = await supabase.from("quiz_questions").delete().eq("set_id", setId);
      if (delError) throw new Error(delError.message);

      const rows = arr.map((q: unknown, k: number) => {
        const question = q as Record<string, unknown>;
        return {
          set_id: setId,
          prompt: String(question.prompt ?? "").trim(),
          choices: Array.isArray(question.choices) ? question.choices.map((x) => String(x)) : [],
          correct_index: Number(question.correct_index ?? 0),
          explanation: question.explanation ? String(question.explanation) : null,
          position: k,
        };
      });

      const { error: insError } = await supabase.from("quiz_questions").insert(rows);
      if (insError) throw new Error(insError.message);

      await refreshQuestions();
      setImportJsonText("");
      setImportMsg(`${rows.length} question${rows.length > 1 ? "s" : ""} importée${rows.length > 1 ? "s" : ""}.`);
    } catch (e: unknown) {
      setImportMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  const TABS = [
    { key: "list" as const, label: "Questions", short: "Questions", n: questions.length },
    { key: "add" as const, label: "Ajouter", short: "Ajouter" },
    { key: "io" as const, label: "Import / export", short: "Import" },
  ];
  const ix = TABS.findIndex((x) => x.key === tab);

  return (
    <div className="grid gap-6">
      <div role="tablist" aria-label="Gérer les questions" className="seg w-full sm:w-auto sm:justify-self-start" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
        <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${ix} * (100% - 8px) / ${TABS.length})`, width: `calc((100% - 8px) / ${TABS.length})` }} />
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className="seg-item px-2.5 text-[13.5px] sm:px-4"
          >
            <span className="sm:hidden">{x.short}</span>
            <span className="hidden sm:inline">{x.label}</span>
            {x.n !== undefined && <span className="font-mono text-[12px] tabular-nums text-muted">{x.n}</span>}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <div className="grid gap-3">
          {questions.length === 0 ? (
            <p className="t-small">{t("qcm.noQuestions")}</p>
          ) : (
            <ol className="m-0 grid list-none gap-2 p-0">
              {questions.map((q, idx) => {
                const isEditing = editingId === q.id;
                const isConfirmingDelete = confirmDeleteId === q.id;
                const ci = q.correct_index ?? 0;
                return (
                  <li key={q.id} className={"rounded-[14px] border px-4 py-3.5 " + (isEditing ? "border-line-2 bg-surface" : "border-line")}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <span className="t-micro w-8 shrink-0 pt-0.5 font-mono font-semibold">Q{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 break-words text-[14px] font-medium leading-snug">{q.prompt}</p>
                        <div className="t-micro mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>
                            {t("qcm.choiceCount", { n: q.choices.length })} · réponse {LETTERS[ci] ?? ci + 1}
                          </span>
                          <TopicBadge topicId={(q as QuizQuestion & { topic_id?: number | null }).topic_id ?? null} />
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {isConfirmingDelete ? (
                          <>
                            <span className="t-micro self-center pr-1">Supprimer ?</span>
                            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => deleteQuestion(q.id)}>
                              {t("common.confirm")}
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteId(null)}>
                              {t("common.cancel")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => (isEditing ? cancelEdit() : startEdit(q))}
                            >
                              {isEditing ? t("common.cancel") : (
                                <>
                                  <Pencil size={13} aria-hidden /> {t("qcm.editQuestion")}
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-pen"
                              disabled={busy}
                              aria-label={`Supprimer la question ${idx + 1}`}
                              onClick={() => {
                                setConfirmDeleteId(q.id);
                                cancelEdit();
                              }}
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-5 border-t border-line pt-5">
                        <QuestionForm
                          draft={edit}
                          onChange={setEdit}
                          onSubmit={saveEdit}
                          submitLabel={t("common.save")}
                          busy={busy}
                          idPrefix={`q-${q.id}`}
                          extra={
                            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                              {t("common.cancel")}
                            </button>
                          }
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          <Status msg={manageMsg} />
        </div>
      )}

      {tab === "add" && (
        <div className="grid gap-4">
          <QuestionForm draft={draft} onChange={setDraft} onSubmit={addQuestion} submitLabel="Ajouter la question" busy={busy} idPrefix="new" />
          <Status msg={editorMsg} />
        </div>
      )}

      {tab === "io" && (
        <div className="grid gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">Exporter</p>
              <p className="t-micro mt-1">{t("qcm.importExportHint")}</p>
            </div>
            <button type="button" className="btn btn-secondary shrink-0" onClick={exportJson} disabled={questions.length === 0}>
              {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Copié" : "Copier le JSON"}
            </button>
          </div>
          <div className="rule" />
          <Field label="Importer" hint="remplace toutes les questions du QCM" htmlFor="qcm-import">
            <textarea
              id="qcm-import"
              className="input box-border w-full min-w-0 font-mono text-[13px]"
              rows={7}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={t("qcm.importJsonPlaceholder")}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-primary" disabled={busy || !importJsonText.trim()} onClick={importJson}>
              {busy ? t("common.saving") : t("qcm.importConfirm")}
            </button>
            {importJsonText && (
              <button type="button" className="btn btn-ghost" onClick={() => { setImportJsonText(""); setImportMsg(null); }}>
                {t("common.cancel")}
              </button>
            )}
          </div>
          <Status msg={importMsg} />
        </div>
      )}
    </div>
  );
}
