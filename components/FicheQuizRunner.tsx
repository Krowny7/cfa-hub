"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleCheck, CircleX, ClipboardCheck, Copy, Pause, RotateCcw, X } from "lucide-react";
import { InkBar } from "@/components/ink/InkBar";
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

// Fond très léger teinté de rouge correcteur (mauvaise réponse choisie).
const PEN_WASH = "bg-[color-mix(in_oklab,var(--pen)_7%,var(--surface))]";

/** Bouton « Copier pour l'IA » (partagé avec FicheWorkspace). */
export function CopyButton({
  copied,
  onClick,
  disabled,
  className = "",
  children,
}: {
  copied: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`btn btn-secondary ${className}`} onClick={onClick} disabled={disabled}>
      {copied ? <ClipboardCheck size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
      <span aria-live="polite">{copied ? "Copié !" : children}</span>
    </button>
  );
}

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// Une série de questions (quiz d'une page, erreurs à revoir, bilan mixte).
// Chaque question est corrigée côté serveur avec SON propre set_id, ce qui
// permet de mélanger des questions de pages différentes dans la même série.
// Au clavier : A–E (ou 1–5) pour choisir, Entrée pour valider puis continuer.
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
  const [copiedQ, setCopiedQ] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const current = items[idx];
  const score = done.filter((d) => d.isCorrect).length;

  async function validate() {
    if (selected === null || !current || busy || result) return;
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
      setCopiedQ(false);
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

  // La question qu'on vient de corriger, seule (même format que la série).
  async function copyQuestionForAi() {
    const last = done[done.length - 1];
    if (!last) return;
    try {
      await navigator.clipboard.writeText(buildRunExport(`${title} — question ${idx + 1}`, [last], last.isCorrect ? 1 : 0, 1));
      setCopiedQ(true);
      setTimeout(() => setCopiedQ(false), 2500);
    } catch {
      setError("Impossible de copier automatiquement.");
    }
  }

  // Après correction : si l'explication tombe sous la ligne de flottaison
  // (téléphone), on la fait remonter dans la vue.
  useEffect(() => {
    if (!result) return;
    const el = feedbackRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.68) {
      window.scrollBy({ top: top - window.innerHeight * 0.32, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [result]);

  // Question suivante (ou bilan) : on remonte au début de la carte si elle est sortie de la vue.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 72) window.scrollBy({ top: top - 88, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [idx, finished]);

  // Raccourcis clavier (actifs seulement quand la série est visible).
  useEffect(() => {
    if (finished) return;
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const root = rootRef.current;
      if (!root || root.offsetParent === null) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const n = current?.q.choices.length ?? 0;
      if (!result && !busy) {
        const k = e.key.toUpperCase();
        let i = k.length === 1 ? LETTERS.indexOf(k) : -1;
        if (i < 0 && /^[1-9]$/.test(e.key)) i = Number(e.key) - 1;
        if (i >= 0 && i < n) {
          e.preventDefault();
          setSelected(i);
          return;
        }
      }
      if (e.key === "Enter") {
        // Sur un autre bouton (pause, copier, valider…), Entrée garde son rôle.
        if (t && t.closest("button, a") && !t.closest("[data-choice]")) return;
        e.preventDefault();
        if (!result) void validate();
        else next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (finished) {
    const wrong = done
      .map((d, i) => ({ d, item: items[i] }))
      .filter(({ d }) => d.isCorrect === false);
    const pct = done.length > 0 ? Math.round((score / done.length) * 100) : 0;
    return (
      <div ref={rootRef} className="rl-in flex flex-col gap-6">
        <div className="card-hero p-6 md:p-8">
          <p className="t-eyebrow">Série terminée</p>
          <p className="mt-1.5 truncate text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
          <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className="t-num text-[64px] md:text-[80px]" aria-label={`${score} sur ${done.length}`}>
              {score}
              <span className="text-muted">/{done.length}</span>
            </span>
            <span className={`pb-2 text-[22px] font-bold tracking-[-0.02em] tabular-nums ${pct < 50 ? "text-pen" : ""}`}>{pct} %</span>
          </div>
          <p className="t-small mt-3">
            {wrong.length === 0
              ? "Sans faute."
              : `${wrong.length} erreur${wrong.length > 1 ? "s" : ""}, à retrouver dans « Mes erreurs » jusqu'à ce que tu les réussisses.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-lg" onClick={onClose}>
              Terminer
            </button>
            <CopyButton copied={copied} onClick={copyForAi} className="btn-lg">
              Copier pour l&apos;IA
            </CopyButton>
            {wrong.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => onReplay(wrong.map(({ item }) => item))}
              >
                <RotateCcw size={15} aria-hidden /> Rejouer les {wrong.length} ratée{wrong.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
          {error && <p className="t-small mt-3 text-pen">{error}</p>}
        </div>

        {wrong.length > 0 && (
          <section className="flex flex-col gap-3" aria-label="À retenir">
            <h3 className="t-h3">À retenir</h3>
            {wrong.map(({ d }, i) => (
              <details key={i} className="card group" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4 md:px-5">
                  {d.tag && (
                    <span className="mt-px shrink-0 rounded-[7px] bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-muted">
                      {d.tag.replace("Page ", "P")}
                    </span>
                  )}
                  <span className="line-clamp-2 min-w-0 flex-1 text-[14.5px] font-medium leading-snug group-open:line-clamp-none">
                    {d.prompt.replace(/\t/g, " ")}
                  </span>
                  <ChevronDown size={16} className="mt-0.5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
                </summary>
                <div className="grid gap-2.5 border-t border-line px-4 pb-5 pt-4 md:px-5">
                  {d.prompt.includes("\t") && <QuestionPrompt text={d.prompt} compact className="text-[13.5px] text-body" />}
                  <AnswerLine kind="wrong" index={d.selectedIndex} choices={d.choices} />
                  <AnswerLine kind="right" index={d.correctIndex} choices={d.choices} />
                  {d.explanation && (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-[14.5px] leading-[1.65] text-body [overflow-wrap:anywhere]">
                      {d.explanation}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </section>
        )}
      </div>
    );
  }

  if (!current) return <div className="card-quiet p-6 text-center t-small">Aucune question.</div>;

  const n = current.q.choices.length;
  const isLast = idx >= items.length - 1;

  return (
    <div ref={rootRef} className="card-hero p-5 sm:p-6 md:p-7">
      {/* En-tête : page, série, avancement */}
      <div className="flex items-center gap-2.5">
        {mode !== "page" && (
          <span className="shrink-0 rounded-[7px] bg-surface-2 px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-muted">
            P{current.page}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted">{title}</span>
        <span className="shrink-0 font-mono text-[12.5px] text-muted tabular-nums">
          <span className="font-semibold text-white">{idx + 1}</span>/{items.length}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <InkBar className="flex-1" value={((idx + (result ? 1 : 0)) / items.length) * 100} label="Avancement du quiz" />
        <span className="shrink-0 text-[12px] font-medium text-muted tabular-nums">
          Score : <span className="font-semibold text-white">{score}</span>
        </span>
      </div>

      <div key={idx} className="rl-in">
        <QuestionPrompt
          text={current.q.prompt}
          className="mt-6 text-[16px] font-medium leading-[1.6] tracking-[-0.008em] text-white md:text-[17px]"
        />

        <div className="mt-6 grid gap-2.5" role="group" aria-label="Choix de réponse">
          {current.q.choices.map((choice, i) => {
            const picked = selected === i;
            const isRight = !!result && i === result.correctIndex;
            const isWrongPick = !!result && picked && !result.isCorrect;
            const state = !result ? (picked ? "picked" : "idle") : isRight ? "right" : isWrongPick ? "wrong" : "dim";
            return (
              <button
                key={i}
                type="button"
                data-choice={i}
                disabled={!!result || busy}
                aria-pressed={picked}
                onClick={() => setSelected(i)}
                className={`flex w-full items-start gap-3.5 rounded-[14px] border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow,opacity] duration-200 disabled:cursor-default ${
                  state === "idle"
                    ? "border-line-2 bg-[var(--control)] hover:border-[color-mix(in_oklab,var(--ink)_40%,transparent)]"
                    : state === "picked"
                      ? "border-white bg-surface ring-1 ring-white"
                      : state === "right"
                        ? "border-white bg-surface ring-1 ring-white"
                        : state === "wrong"
                          ? `border-pen ring-1 ring-pen ${PEN_WASH}`
                          : "border-line opacity-50"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-[9px] font-mono text-[13px] font-semibold transition-colors ${
                    state === "picked" || state === "right"
                      ? "bg-white text-black"
                      : state === "wrong"
                        ? "bg-pen text-black"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1 pt-[3px] text-[15px] leading-[1.5] text-white break-words [overflow-wrap:anywhere]">
                  {choice}
                </span>
                {state === "right" && (
                  <span className="inline-flex shrink-0 items-center gap-1 pt-[5px] text-[12px] font-semibold">
                    <Check size={15} strokeWidth={2.6} aria-hidden />
                    <span className="hidden sm:inline">Bonne réponse</span>
                  </span>
                )}
                {state === "wrong" && (
                  <span className="inline-flex shrink-0 items-center gap-1 pt-[5px] text-[12px] font-semibold text-pen">
                    <X size={15} strokeWidth={2.6} aria-hidden />
                    <span className="hidden sm:inline">Ta réponse</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {result && (
          <div ref={feedbackRef} className="card-quiet mt-6 p-5 md:p-6" role="status">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {result.isCorrect ? (
                <CircleCheck size={22} className="shrink-0" aria-hidden />
              ) : (
                <CircleX size={22} className="shrink-0 text-pen" aria-hidden />
              )}
              <span className={`t-h3 ${result.isCorrect ? "" : "text-pen"}`}>{result.isCorrect ? "Correct" : "Incorrect"}</span>
              {result.xp > 0 && (
                <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[11.5px] font-semibold text-muted">+{result.xp} XP</span>
              )}
              <button type="button" className="btn btn-ghost btn-sm -mr-2 ml-auto text-muted" onClick={copyQuestionForAi}>
                {copiedQ ? <ClipboardCheck size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copiedQ ? "Copié !" : "Copier pour l'IA"}
              </button>
            </div>
            {!result.isCorrect && result.correctIndex !== null && (
              <div className="mt-4">
                <p className="t-eyebrow">Bonne réponse</p>
                <p className="mt-1.5 text-[15px] font-semibold leading-[1.5] break-words [overflow-wrap:anywhere]">
                  {LETTERS[result.correctIndex]}) {current.q.choices[result.correctIndex]}
                </p>
              </div>
            )}
            {result.explanation && (
              <div className="mt-4">
                <p className="t-eyebrow">Explication</p>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-[1.68] text-body [overflow-wrap:anywhere]">
                  {result.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="t-small mt-4 text-pen">{error}</p>}

      <div className="mt-7 flex items-center gap-3">
        <button type="button" className="btn btn-ghost btn-sm -ml-2 text-muted" onClick={onPause}>
          <Pause size={14} aria-hidden /> Mettre en pause
        </button>
        <span className="t-micro ml-auto hidden items-center gap-1.5 lg:inline-flex" aria-hidden>
          {!result ? (
            <>
              <kbd className="kbd">A</kbd>–<kbd className="kbd">{LETTERS[Math.max(0, n - 1)]}</kbd> puis <kbd className="kbd">Entrée</kbd>
            </>
          ) : (
            <>
              <kbd className="kbd">Entrée</kbd> pour continuer
            </>
          )}
        </span>
        {!result ? (
          <button
            type="button"
            className="btn btn-primary btn-lg ml-auto lg:ml-0"
            disabled={selected === null || busy}
            onClick={validate}
          >
            {busy ? "…" : "Valider"}
          </button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg ml-auto lg:ml-0" onClick={next}>
            {isLast ? "Voir le bilan" : "Suivante"}
            <ArrowRight size={16} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/** Ligne de correction du bilan : ta réponse (rouge correcteur) ou la bonne (encre). */
function AnswerLine({ kind, index, choices }: { kind: "right" | "wrong"; index: number | null; choices: string[] }) {
  const right = kind === "right";
  return (
    <div className={`flex items-start gap-3 rounded-[12px] px-3.5 py-3 ring-1 ${right ? "bg-surface ring-white" : `ring-pen ${PEN_WASH}`}`}>
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] font-mono text-[12px] font-semibold ${
          right ? "bg-white text-black" : "bg-pen text-black"
        }`}
      >
        {index !== null && index !== undefined ? LETTERS[index] ?? index + 1 : "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`t-eyebrow block ${right ? "" : "text-pen"}`}>{right ? "Bonne réponse" : "Ta réponse"}</span>
        <span className="mt-1 block text-[14.5px] leading-snug text-white break-words [overflow-wrap:anywhere]">
          {index !== null && index !== undefined ? choices[index] : "Non disponible"}
        </span>
      </span>
      {right ? (
        <Check size={15} strokeWidth={2.6} className="mt-0.5 shrink-0" aria-hidden />
      ) : (
        <X size={15} strokeWidth={2.6} className="mt-0.5 shrink-0 text-pen" aria-hidden />
      )}
    </div>
  );
}
