"use client";

import { useRef, useState } from "react";
import { Check, ClipboardCheck, Copy, RotateCcw, X } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { friendlyError } from "@/lib/errors";
import type { FicheApi } from "@/lib/ficheApi";
import {
  buildRunExport,
  type AnswerMode,
  type AnswerRow,
  type DrillQuestion,
  type ReviewItem,
} from "@/lib/ficheLog";

export type RunItem = { q: DrillQuestion; page: number };

const LETTERS = ["A", "B", "C", "D", "E"];

// Une série de questions (quiz d'une page, erreurs à revoir, bilan mixte).
// Chaque question est corrigée côté serveur avec SON propre set_id, ce qui
// permet de mélanger des questions de pages différentes dans la même série.
export function FicheQuizRunner({
  items,
  mode,
  title,
  api,
  initialRunId,
  initialDone,
  onProgress,
  onAnswered,
  onPause,
  onClose,
  onReplay,
}: {
  items: RunItem[];
  mode: AnswerMode;
  title: string;
  api: FicheApi;
  // Reprise d'une série sauvegardée : même run_id (pour que le graphique la
  // compte comme une seule série) et réponses déjà données.
  initialRunId?: string;
  initialDone?: ReviewItem[];
  onProgress: (done: ReviewItem[], runId: string) => void;
  onAnswered: (row: AnswerRow) => void;
  // Quitter en gardant la série (reprenable) / la clore définitivement.
  onPause: () => void;
  onClose: () => void;
  onReplay: (items: RunItem[]) => void;
}) {
  const runId = useRef(initialRunId ?? crypto.randomUUID());
  const startDone = initialDone ?? [];
  const [idx, setIdx] = useState(Math.min(startDone.length, items.length - 1));
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ correctIndex: number | null; explanation: string | null; isCorrect: boolean; xp: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ReviewItem[]>(startDone);
  const [finished, setFinished] = useState(startDone.length >= items.length);
  const [copied, setCopied] = useState(false);

  const current = items[idx];
  const score = done.filter((d) => d.isCorrect).length;

  async function validate() {
    if (selected === null || !current) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.submitAnswer(current.q.set_id, current.q.id, selected);
      setResult(r);
      const nextDone: ReviewItem[] = [
        ...done,
        {
          prompt: current.q.prompt,
          choices: current.q.choices,
          selectedIndex: selected,
          correctIndex: r.correctIndex,
          explanation: r.explanation,
          isCorrect: r.isCorrect,
          tag: `Page ${current.page}`,
        },
      ];
      setDone(nextDone);
      onProgress(nextDone, runId.current);
      const row = {
        set_id: current.q.set_id,
        question_id: current.q.id,
        is_correct: r.isCorrect,
        selected_index: selected,
        run_id: runId.current,
        mode,
      };
      // Le journal est secondaire : un échec d'écriture (migration pas encore
      // appliquée, réseau) ne doit jamais bloquer la correction.
      api
        .logAnswer({ ...row, correct_index: r.correctIndex, explanation: r.explanation })
        .catch((e) => console.error("logAnswer failed:", e));
      onAnswered({ ...row, answered_at: new Date().toISOString() });
    } catch (e) {
      setError(friendlyError(e, "Impossible de valider cette réponse."));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (idx < items.length - 1) {
      setIdx((i) => i + 1);
      setSelected(null);
      setResult(null);
    } else {
      setFinished(true);
    }
  }

  async function copyForAi() {
    try {
      await navigator.clipboard.writeText(buildRunExport(title, done, score, done.length));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Impossible de copier automatiquement.");
    }
  }

  if (finished) {
    const wrong = done
      .map((d, i) => ({ d, item: items[i] }))
      .filter(({ d }) => d.isCorrect === false);
    const pct = done.length > 0 ? Math.round((score / done.length) * 100) : 0;
    return (
      <div className="grid gap-4">
        <div className="card-soft p-4">
          <div className="text-xs text-white/50">{title}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">
              {score}/{done.length}
            </span>
            <span className={`text-sm ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-300" : "text-red-400"}`}>
              {pct}%
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs" onClick={copyForAi}>
              {copied ? <ClipboardCheck size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? "Copié !" : "Copier pour l'IA"}
            </button>
            {wrong.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs"
                onClick={() => onReplay(wrong.map(({ item }) => item))}
              >
                <RotateCcw size={14} /> Rejouer les {wrong.length} ratée{wrong.length > 1 ? "s" : ""}
              </button>
            )}
            <button type="button" className="btn btn-primary text-xs" onClick={onClose}>
              Terminer
            </button>
          </div>
          {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
        </div>

        {wrong.length > 0 && (
          <div className="grid gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50">À retenir</div>
            {wrong.map(({ d }, i) => (
              <details key={i} className="card-soft p-3 text-sm">
                <summary className="cursor-pointer select-none">
                  <span className="text-white/40">{d.tag} · </span>
                  {d.prompt.length > 110 ? d.prompt.slice(0, 110) + "…" : d.prompt}
                </summary>
                <div className="mt-2 grid gap-1.5 text-[13px]">
                  <div className="text-red-300">
                    Ta réponse : {d.selectedIndex !== null ? `${LETTERS[d.selectedIndex]}) ${d.choices[d.selectedIndex]}` : "—"}
                  </div>
                  {d.correctIndex !== null && (
                    <div className="text-green-300">
                      Bonne réponse : {LETTERS[d.correctIndex]}) {d.choices[d.correctIndex]}
                    </div>
                  )}
                  {d.explanation && <div className="whitespace-pre-wrap text-white/70">{d.explanation}</div>}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!current) return <div className="text-sm text-white/50">Aucune question.</div>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-white/50">
        <span>
          {title} · {idx + 1}/{items.length}
        </span>
        <span>
          Page {current.page} · Score : {score}
        </span>
      </div>
      <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-blue-400/70 transition-[width]"
          style={{ width: `${((idx + (result ? 1 : 0)) / items.length) * 100}%` }}
        />
      </div>

      <QuestionPrompt text={current.q.prompt} className="text-base font-medium leading-relaxed" />

      <div className="mt-4 grid gap-2">
        {current.q.choices.map((choice, i) => {
          const picked = selected === i;
          const isRight = result && i === result.correctIndex;
          const isWrongPick = result && picked && !result.isCorrect;
          return (
            <button
              key={i}
              type="button"
              disabled={!!result}
              onClick={() => setSelected(i)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                isRight
                  ? "border-green-400/40 bg-green-500/10"
                  : isWrongPick
                    ? "border-red-400/40 bg-red-500/15"
                    : picked
                      ? "border-blue-400/50 bg-blue-500/10"
                      : "border-white/10 bg-neutral-900/40 hover:bg-white/5"
              }`}
            >
              <span className="mt-px shrink-0 text-xs font-semibold text-white/40">{LETTERS[i]}</span>
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] opacity-90">{choice}</span>
              {isRight && <Check size={15} className="mt-0.5 shrink-0 text-green-400" />}
              {isWrongPick && <X size={15} className="mt-0.5 shrink-0 text-red-400" />}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="mt-4 card-soft p-4 text-sm">
          <div className={`font-semibold ${result.isCorrect ? "text-green-400" : "text-red-400"}`}>
            {result.isCorrect ? "Correct" : "Incorrect"}
            {result.xp > 0 && <span className="ml-2 text-xs font-normal text-white/50">+{result.xp} XP</span>}
          </div>
          {!result.isCorrect && result.correctIndex !== null && (
            <div className="mt-1.5 opacity-90">
              Bonne réponse : {LETTERS[result.correctIndex]}) {current.q.choices[result.correctIndex]}
            </div>
          )}
          {result.explanation && (
            <div className="mt-2 whitespace-pre-wrap break-words text-white/70 [overflow-wrap:anywhere]">
              {result.explanation}
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-3 text-xs text-red-300">{error}</div>}

      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" className="text-xs text-white/40 hover:text-white/70" onClick={onPause}>
          Mettre en pause
        </button>
        {!result ? (
          <button type="button" className="btn btn-primary" disabled={selected === null || busy} onClick={validate}>
            {busy ? "…" : "Valider"}
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={next}>
            {idx < items.length - 1 ? "Suivante" : "Voir le bilan"}
          </button>
        )}
      </div>
    </div>
  );
}
