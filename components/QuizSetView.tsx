"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

type Question = {
  id: string;
  prompt: string;
  choices: string[];
  correct_index: number; // 0-based
  explanation: string | null;
  position: number;
};

export function QuizSetView({
  setId,
  isOwner,
  initialQuestions
}: {
  setId: string;
  isOwner: boolean; // used as "canEdit"
  initialQuestions: Question[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const canEdit = isOwner;

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // --- Add state
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [choicesText, setChoicesText] = useState("");
  const [correct, setCorrect] = useState(1); // 1-based in UI
  const [explanation, setExplanation] = useState("");

  // --- Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editChoicesText, setEditChoicesText] = useState("");
  const [editCorrect, setEditCorrect] = useState(1); // 1-based in UI
  const [editExplanation, setEditExplanation] = useState("");

  // --- Runner state
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const current = questions[i] ?? null;
  const canRun = questions.length > 0;

  function resetRun() {
    setI(0);
    setSelected(null);
    setShowCorrection(false);
    setScore(0);
    setStartedAt(Date.now());
    setFinished(false);
  }

  async function fetchQuestions(): Promise<Question[]> {
    const { data, error } = await supabase
      .from("quiz_questions")
      .select("id,prompt,choices,correct_index,explanation,position")
      .eq("set_id", setId)
      .order("position", { ascending: true });

    if (error) return questions;

    return (data ?? []).map((q: any) => ({
      ...q,
      choices: Array.isArray(q.choices) ? q.choices : []
    })) as any;
  }

  async function refreshQuestions() {
    const next = await fetchQuestions();
    setQuestions(next);
  }

  function parseChoices(text: string) {
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function addQuestion() {
    setMsg(null);
    setBusy(true);
    try {
      const lines = parseChoices(choicesText);
      if (!questionPrompt.trim()) throw new Error(t("common.error"));
      if (lines.length < 2 || lines.length > 6) throw new Error(t("qcm.choicesPlaceholder"));

      const idx0 = Math.max(1, Math.min(lines.length, Number(correct) || 1)) - 1;
      const pos = questions.length;

      const ins = await supabase.from("quiz_questions").insert({
        set_id: setId,
        prompt: questionPrompt.trim(),
        choices: lines,
        correct_index: idx0,
        explanation: explanation.trim() ? explanation.trim() : null,
        position: pos
      });

      if (ins.error) throw ins.error;

      setQuestionPrompt("");
      setChoicesText("");
      setCorrect(1);
      setExplanation("");

      await refreshQuestions();
      setMsg("✅");
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(q: Question) {
    setMsg(null);
    setEditingId(q.id);
    setEditPrompt(q.prompt ?? "");
    setEditChoicesText((q.choices ?? []).join("\n"));
    setEditCorrect((q.correct_index ?? 0) + 1); // show 1-based
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
    setMsg(null);
    setBusy(true);

    try {
      const lines = parseChoices(editChoicesText);
      if (!editPrompt.trim()) throw new Error(t("common.error"));
      if (lines.length < 2 || lines.length > 6) throw new Error(t("qcm.choicesPlaceholder"));

      const idx0 = Math.max(1, Math.min(lines.length, Number(editCorrect) || 1)) - 1;

      const upd = await supabase
        .from("quiz_questions")
        .update({
          prompt: editPrompt.trim(),
          choices: lines,
          correct_index: idx0,
          explanation: editExplanation.trim() ? editExplanation.trim() : null
        })
        .eq("id", editingId)
        .eq("set_id", setId);

      if (upd.error) throw upd.error;

      await refreshQuestions();
      cancelEdit();
      setMsg("✅");
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  async function reindexPositions() {
    const rows = await fetchQuestions();
    // if positions have gaps, normalize them
    const tasks = rows.map((q, idx) => {
      if (q.position === idx) return null;
      return supabase.from("quiz_questions").update({ position: idx }).eq("id", q.id).eq("set_id", setId);
    });

    const real = tasks.filter(Boolean) as any[];
    if (real.length > 0) {
      const res = await Promise.all(real);
      const err = res.find((r) => r?.error)?.error;
      if (err) throw err;
    }
  }

  async function deleteQuestion(id: string) {
    const ok = window.confirm("Supprimer cette question ? ( reliably )");
    if (!ok) return;

    setMsg(null);
    setBusy(true);

    try {
      const del = await supabase.from("quiz_questions").delete().eq("id", id).eq("set_id", setId);
      if (del.error) throw del.error;

      await reindexPositions();
      await refreshQuestions();

      // keep runner safe
      setI(0);
      setSelected(null);
      setShowCorrection(false);
      setFinished(false);
      setScore(0);

      setMsg("✅");
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportJson() {
    const payload = {
      version: 1,
      questions: questions.map((q) => ({
        prompt: q.prompt,
        choices: q.choices,
        correct_index: q.correct_index,
        explanation: q.explanation
      }))
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMsg("✅");
  }

  async function importJson() {
    setBusy(true);
    setMsg(null);
    try {
      const text = window.prompt("Colle le JSON ici") ?? "";
      if (!text.trim()) return;
      const obj = JSON.parse(text);
      const arr = Array.isArray(obj?.questions) ? obj.questions : [];
      if (arr.length === 0) throw new Error(t("qcm.noQuestions"));

      // Replace existing questions
      const del = await supabase.from("quiz_questions").delete().eq("set_id", setId);
      if (del.error) throw del.error;

      const rows = arr.map((q: any, k: number) => ({
        set_id: setId,
        prompt: String(q.prompt ?? "").trim(),
        choices: Array.isArray(q.choices) ? q.choices.map((x: any) => String(x)) : [],
        correct_index: Number(q.correct_index ?? 0),
        explanation: q.explanation ? String(q.explanation) : null,
        position: k
      }));

      const ins = await supabase.from("quiz_questions").insert(rows);
      if (ins.error) throw ins.error;

      await refreshQuestions();
      setMsg("✅");
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? t("common.error")}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitAttempt(finalScore: number) {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
      await supabase.from("quiz_attempts").insert({
        user_id: auth.user.id,
        set_id: setId,
        score: finalScore,
        total: questions.length,
        duration_seconds: duration
      });
    } catch {
      // ignore
    }
  }

  return (
    <div className="grid gap-4 min-w-0 max-w-full overflow-x-hidden">
      {canEdit && (
        <div className="rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div>
              <div className="font-semibold">{t("qcm.importExport")}</div>
              <div className="text-xs opacity-70">JSON (copie/coller) — pratique pour partager rapidement.</div>
            </div>
            <div className="flex flex-wrap gap-2 min-w-0">
              <button
                type="button"
                className="w-full sm:w-auto rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5"
                onClick={exportJson}
              >
                {t("qcm.exportJson")}
              </button>
              <button
                type="button"
                className="w-full sm:w-auto rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5"
                onClick={importJson}
              >
                {t("qcm.importJson")}
              </button>
            </div>
          </div>
          {msg && <div className="mt-2 text-sm break-words [overflow-wrap:anywhere]">{msg}</div>}
        </div>
      )}

      {canEdit && (
        <div className="rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <h2 className="font-semibold">{t("qcm.addQuestionTitle")}</h2>
          </div>

          <div className="mt-4 grid gap-3">
            <textarea
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
              rows={3}
              value={questionPrompt}
              onChange={(e) => setQuestionPrompt(e.target.value)}
              placeholder={t("qcm.promptPlaceholder")}
            />

            <textarea
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
              rows={4}
              value={choicesText}
              onChange={(e) => setChoicesText(e.target.value)}
              placeholder={t("qcm.choicesPlaceholder")}
            />

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm opacity-80">{t("qcm.correctIndexLabel")}</label>
              <input
                type="number"
                min={1}
                max={6}
                className="w-24 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
                value={correct}
                onChange={(e) => setCorrect(Number(e.target.value))}
              />
            </div>

            <input
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder={t("qcm.explanationPlaceholder")}
            />

            <button
              type="button"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              disabled={busy}
              onClick={addQuestion}
            >
              {busy ? t("common.saving") : t("qcm.addQuestion")}
            </button>

            {msg && <div className="text-sm">{msg}</div>}
          </div>
        </div>
      )}

      {/* Manage existing questions */}
      {canEdit && (
        <div className="rounded-2xl border p-4">
          <div className="font-semibold">Gestion des questions</div>
          <div className="mt-1 text-xs opacity-70">Modifier / supprimer (autorisé si owner ou membre du groupe).</div>

          <div className="mt-4 grid gap-2">
            {questions.length === 0 ? (
              <div className="text-sm opacity-70">{t("qcm.noQuestions")}</div>
            ) : (
              questions.map((q, idx) => {
                const isEditing = editingId === q.id;
                return (
                  <div key={q.id} className="rounded-xl border border-white/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          Q{idx + 1}. {q.prompt}
                        </div>
                        <div className="mt-1 text-xs opacity-70">
                          {q.choices.length} choix • bonne réponse #{(q.correct_index ?? 0) + 1}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!isEditing ? (
                          <button
                            type="button"
                            className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5"
                            onClick={() => startEdit(q)}
                          >
                            Modifier
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5"
                            onClick={cancelEdit}
                          >
                            Annuler
                          </button>
                        )}

                        <button
                          type="button"
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 hover:bg-red-500/20"
                          disabled={busy}
                          onClick={() => deleteQuestion(q.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 grid gap-2">
                        <textarea
                          className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
                          rows={3}
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                        />

                        <textarea
                          className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
                          rows={4}
                          value={editChoicesText}
                          onChange={(e) => setEditChoicesText(e.target.value)}
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-sm opacity-80">Bonne réponse (1 = 1ère ligne)</label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            className="w-24 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
                            value={editCorrect}
                            onChange={(e) => setEditCorrect(Number(e.target.value))}
                          />
                        </div>

                        <input
                          className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
                          value={editExplanation}
                          onChange={(e) => setEditExplanation(e.target.value)}
                          placeholder="Explication (optionnelle)"
                        />

                        <button
                          type="button"
                          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                          disabled={busy}
                          onClick={saveEdit}
                        >
                          {busy ? t("common.saving") : "Enregistrer"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {msg && <div className="mt-2 text-sm break-words [overflow-wrap:anywhere]">{msg}</div>}
        </div>
      )}

      {/* Runner */}
      <div className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">{t("qcm.title")}</div>
            <div className="text-xs opacity-70">{questions.length} question(s)</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              disabled={!canRun}
              onClick={() => resetRun()}
            >
              {t("qcm.start")}
            </button>
          </div>
        </div>

        {!canRun && <div className="mt-4 text-sm opacity-70">{t("qcm.noQuestions")}</div>}

        {canRun && current && !finished && (
          <div className="mt-4">
            <div className="text-xs opacity-70">
              {i + 1}/{questions.length}
            </div>
            <div className="mt-2 whitespace-pre-wrap text-base font-medium">{current.prompt}</div>

            <div className="mt-4 grid gap-2">
              {current.choices.map((c, idx) => {
                const picked = selected === idx;
                const correctIdx = current.correct_index;
                const isCorrect = idx === correctIdx;
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
                    <div className="opacity-90">{c}</div>
                  </button>
                );
              })}
            </div>

            {showCorrection && (current.explanation || current.correct_index != null) && (
              <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4 text-sm">
                <div className="font-semibold">Correction</div>
                <div className="mt-2 opacity-90">✅ {current.choices[current.correct_index]}</div>
                {current.explanation && <div className="mt-2 whitespace-pre-wrap opacity-80">{current.explanation}</div>}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm opacity-70">
                {t("qcm.score")}: {score}
              </div>
              <div className="flex gap-2">
                {!showCorrection ? (
                  <button
                    type="button"
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                    disabled={selected == null}
                    onClick={() => {
                      if (selected == null) return;
                      const correctIdx = current.correct_index;
                      if (selected === correctIdx) setScore((s) => s + 1);
                      setShowCorrection(true);
                    }}
                  >
                    Valider
                  </button>
                ) : i < questions.length - 1 ? (
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm hover:bg-white/5"
                    onClick={() => {
                      setI((v) => v + 1);
                      setSelected(null);
                      setShowCorrection(false);
                    }}
                  >
                    {t("qcm.next")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm hover:bg-white/5"
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
          <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
            <div className="text-sm opacity-70">{t("qcm.score")}</div>
            <div className="mt-1 text-2xl font-semibold">
              {score}/{questions.length}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm hover:bg-white/5"
                onClick={resetRun}
              >
                Recommencer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}