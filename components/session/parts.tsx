"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Minus, Pause, Play, Sparkles, X } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { InkProgressRing } from "@/components/ui/InkRings";
import { SectionHead } from "@/components/session/ui";
import {
  buildAiExportText,
  cleanTopic,
  fmtClock,
  letter,
  topicStats,
  type AiExportKind,
  type ReviewQuestion,
} from "@/components/session/review";
import { IA, ratures as nRatures } from "@/lib/voice";
import { COPIE_IA, CORRECTION, PAR_MATIERE } from "@/lib/voice-z3";

// Écrans partagés des sessions et des examens, dans le langage V3 : un seul
// point focal, des écrans de question et de correction calmes et nets.
// - pendant l'épreuve : RunnerBar (barre collante), QuestionCard, QuestionMap ;
// - avant : ReadyCard ; pendant une pause : PauseCard ;
// - après : ResultHero (avec « Copier pour l'IA »), TopicBreakdown, ReviewSection.

// ── Contrôle segmenté ─────────────────────────────────────────────────────

export function Seg<K extends string>({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: K;
  onChange: (k: K) => void;
  options: { key: K; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  const ix = Math.max(0, options.findIndex((o) => o.key === value));
  const n = options.length;
  return (
    <div role="tablist" aria-label={label} className={"seg " + className} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${ix} * (100% - 8px) / ${n})`, width: `calc((100% - 8px) / ${n})` }} />
      {options.map((o) => (
        <button key={o.key} type="button" role="tab" aria-selected={o.key === value} className="seg-item" onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Pendant l'épreuve ──────────────────────────────────────────────────────

/** Barre collante : où on en est, le chrono au centre, les actions à droite. */
export function RunnerBar({
  label,
  index,
  total,
  answered,
  secondsLeft,
  lowAt = 60,
  paused = false,
  actions,
  status,
  barPct,
}: {
  label: string;
  index: number;
  total: number;
  answered: number;
  secondsLeft: number;
  lowAt?: number;
  paused?: boolean;
  actions?: React.ReactNode;
  /** remplace la ligne « Q7/23 · 6 répondues » (session sans fin) */
  status?: React.ReactNode;
  /** remplace l'avancement (ex. temps écoulé) */
  barPct?: number;
}) {
  const low = !paused && secondsLeft <= lowAt;
  const pct = barPct ?? (total > 0 ? Math.round((answered / total) * 100) : 0);
  return (
    <header className="sticky top-[72px] z-30 rounded-[18px] border border-line bg-surface/90 px-4 py-3 shadow-[var(--shadow-1)] backdrop-blur-md md:px-5 md:py-3.5">
      {/* Téléphone : le chrono passe à gauche, au-dessus de l'état ; à partir
          de sm, il est centré entre l'état et les actions. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="t-eyebrow hidden truncate sm:block">{label}</p>
          <span role="timer" aria-live="off" aria-label={`Temps restant ${fmtClock(secondsLeft)}`} className={"t-num block text-[24px] tabular-nums sm:hidden " + (paused ? "opacity-35 " : "") + (low ? "text-pen" : "")}>
            {fmtClock(secondsLeft)}
          </span>
          <p className="t-micro mt-1 truncate tabular-nums">
            {paused && <span className="font-semibold sm:hidden">En pause · </span>}
            {status ?? (
              <>
                <span className="font-semibold text-white">Q{index + 1}</span>/{total}
                <span> · {answered} répondue{answered > 1 ? "s" : ""}</span>
              </>
            )}
          </p>
        </div>
        <div className="hidden flex-col items-center sm:flex">
          <span
            role="timer"
            aria-live="off"
            aria-label={`Temps restant ${fmtClock(secondsLeft)}`}
            className={"t-num text-[28px] tabular-nums md:text-[32px] " + (paused ? "opacity-35 " : "") + (low ? "text-pen" : "")}
          >
            {fmtClock(secondsLeft)}
          </span>
          {paused && <span className="t-micro mt-1">en pause</span>}
        </div>
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">{actions}</div>
      </div>
      <div className="ink-bar mt-3 h-[5px]" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
    </header>
  );
}

/** Bouton pause / reprise de la barre (icône seule sur téléphone). */
export function PauseToggle({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm px-2.5" onClick={onToggle} aria-label={paused ? "Reprendre le chrono" : "Mettre en pause"}>
      {paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
      <span className="hidden sm:inline">{paused ? "Reprendre" : "Pause"}</span>
    </button>
  );
}

export type ChoiceState = "idle" | "picked" | "correct" | "wrong" | "dim";

/** Une réponse : la lettre dans une pastille, le texte, et l'état en clair. */
export function ChoiceButton({
  index,
  text,
  state,
  onClick,
  disabled,
}: {
  index: number;
  text: string;
  state: ChoiceState;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const box =
    state === "picked"
      ? "border-white bg-surface shadow-[0_0_0_1px_var(--ink),var(--shadow-1)]"
      : state === "correct"
        ? "border-white bg-surface shadow-[0_0_0_1px_var(--ink)]"
        : state === "wrong"
          ? "border-pen/70 bg-pen/[0.05] text-pen"
          : state === "dim"
            ? "border-line bg-transparent text-muted"
            : "border-line-2 bg-surface hover:border-white/45 hover:bg-surface-2/40";
  const chip =
    state === "picked" || state === "correct"
      ? "bg-white text-black"
      : state === "wrong"
        ? "bg-pen text-black"
        : "bg-surface-2 text-muted group-hover:text-white";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={state === "picked"}
      onClick={onClick}
      disabled={disabled}
      className={
        "group flex w-full items-start gap-3.5 rounded-[14px] border px-3.5 py-3 text-left text-[15px] leading-[1.5] transition-[border-color,background-color,box-shadow] duration-200 disabled:cursor-default md:px-[18px] md:py-3.5 md:text-[15.5px] " +
        box
      }
    >
      <span className={"grid h-7 w-7 shrink-0 place-items-center rounded-[8px] font-mono text-[13px] font-semibold transition-colors " + chip}>
        {state === "correct" ? <Check size={15} strokeWidth={2.6} aria-hidden /> : state === "wrong" ? <X size={15} strokeWidth={2.6} aria-hidden /> : letter(index)}
      </span>
      <span className="min-w-0 flex-1 pt-[2px] break-words [overflow-wrap:anywhere]">{text}</span>
      {state === "correct" && <span className="t-micro hidden shrink-0 pt-[5px] font-semibold text-white sm:inline">Bonne réponse</span>}
      {state === "wrong" && <span className="t-micro hidden shrink-0 pt-[5px] font-semibold text-pen sm:inline">Ta réponse</span>}
    </button>
  );
}

/** La carte de la question : un énoncé lisible, les réponses, puis le pied. */
export function QuestionCard({
  index,
  total,
  topic,
  prompt,
  badge,
  children,
  footer,
}: {
  index: number;
  /** absent : session sans fin (pas de « / total ») */
  total?: number;
  topic?: string | null;
  prompt: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="card flex min-w-0 flex-col gap-6 p-5 md:gap-7 md:p-8" aria-label={total ? `Question ${index + 1} sur ${total}` : `Question ${index + 1}`}>
      <div key={index} className="rl-in flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="t-eyebrow m-0">
            Question {index + 1}
            {total ? <span className="font-medium normal-case tracking-normal"> / {total}</span> : null}
            {topic ? <span className="font-medium normal-case tracking-normal"> · {cleanTopic(topic)}</span> : null}
          </p>
          {badge}
        </div>
        <QuestionPrompt
          text={prompt}
          className="text-[16.5px] font-semibold leading-[1.6] tracking-[-0.01em] break-words [overflow-wrap:anywhere] md:text-[18.5px]"
        />
      </div>
      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Réponses">
        {children}
      </div>
      {footer}
    </section>
  );
}

/** Pied de la question : précédente à gauche, la suite à droite. */
export function QuestionNav({
  onPrev,
  prevDisabled,
  next,
}: {
  onPrev?: () => void;
  prevDisabled?: boolean;
  next: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
      {onPrev ? (
        <button type="button" className="btn btn-ghost px-3" disabled={prevDisabled} onClick={onPrev}>
          <ArrowLeft size={16} aria-hidden /> <span className="hidden sm:inline">Précédente</span>
        </button>
      ) : (
        <span />
      )}
      {next}
    </div>
  );
}

/** Le plan de la copie : une case par question, pour sauter où l'on veut. */
export function QuestionMap({
  total,
  current,
  isAnswered,
  onJump,
}: {
  total: number;
  current: number;
  isAnswered: (i: number) => boolean;
  onJump: (i: number) => void;
}) {
  let answered = 0;
  for (let i = 0; i < total; i++) if (isAnswered(i)) answered++;
  const firstOpen = Array.from({ length: total }, (_, i) => i).find((i) => !isAnswered(i) && i !== current);
  return (
    <details className="card-quiet group px-4 py-3.5 md:px-5" open={total <= 60}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="text-[14px] font-semibold">Plan de la copie</span>
        <span className="t-micro inline-flex items-center gap-2 tabular-nums">
          {answered}/{total} répondues
          <ChevronDown size={15} aria-hidden className="transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(34px,1fr))] gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const on = i === current;
          const done = isAnswered(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Question ${i + 1}${done ? ", répondue" : ", sans réponse"}`}
              aria-current={on ? "step" : undefined}
              className={
                "h-[34px] rounded-[9px] font-mono text-[12px] font-semibold tabular-nums transition-colors " +
                (on
                  ? "bg-white text-black"
                  : done
                    ? "bg-surface text-white shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-surface-2"
                    : "text-muted shadow-[inset_0_0_0_1px_var(--line)] hover:text-white")
              }
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      {firstOpen !== undefined && (
        <button type="button" onClick={() => onJump(firstOpen)} className="ink-link mt-4 inline-block text-[13px]">
          Aller à la prochaine sans réponse
        </button>
      )}
    </details>
  );
}

/** Écran d'avant-départ : ce qui attend le joueur, et un seul bouton. */
export function ReadyCard({
  eyebrow,
  title,
  meta,
  rules,
  onCancel,
  cancelLabel = "Annuler",
  onStart,
  startLabel = "Commencer",
  busy,
  error,
  wide = false,
}: {
  /** pleine largeur (dans une page qui a d'autres sections), sinon centrée */
  wide?: boolean;
  eyebrow: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  rules: React.ReactNode[];
  onCancel?: () => void;
  cancelLabel?: string;
  onStart: () => void;
  startLabel?: string;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <section className={"card-hero rl-in grid w-full grid-cols-1 gap-6 p-6 md:p-9 " + (wide ? "" : "mx-auto max-w-[640px]")}>
      <div>
        <p className="t-eyebrow m-0">{eyebrow}</p>
        <h2 className="t-h1 m-0 mt-2">{title}</h2>
        {meta && <p className="t-small m-0 mt-2">{meta}</p>}
      </div>
      <ul className="m-0 grid list-none gap-2.5 p-0">
        {rules.map((r, i) => (
          <li key={i} className="flex items-start gap-3 text-[15px] leading-normal text-muted">
            <span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-white" aria-hidden />
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="m-0 text-sm text-pen">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
        <button type="button" className="btn btn-primary btn-lg rl-press" disabled={busy} onClick={onStart}>
          {busy ? "Préparation…" : startLabel} <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </section>
  );
}

/** Pendant une pause : la question est masquée, le chrono arrêté. */
export function PauseCard({ onResume }: { onResume: () => void }) {
  return (
    <section className="card rl-in grid place-items-center gap-4 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2">
        <Pause size={20} aria-hidden />
      </span>
      <div>
        <h2 className="t-h2 m-0">En pause</h2>
        <p className="t-small m-0 mt-1.5">Le chrono est arrêté. La question revient quand tu reprends.</p>
      </div>
      <button type="button" className="btn btn-primary rl-press" onClick={onResume}>
        <Play size={16} aria-hidden /> Reprendre
      </button>
    </section>
  );
}

// ── Après l'épreuve ────────────────────────────────────────────────────────

/**
 * « Copier pour l'IA » en action de fin de session (slot `actions` de la
 * copie corrigée) : un bouton en deux parts, « Copier pour l'IA · toute la
 * copie | mes N ratures », pour qu'on ne le confonde pas avec « Reprendre
 * mes N ratures » juste à côté. Le texte vient de `texte`, le format
 * d'export de chaque écran, inchangé.
 * `variantes={false}` : un seul bouton (écran dont l'export n'a qu'une forme).
 */
export function CopierPourIA({
  texte,
  ratures,
  total,
  variantes = true,
  onError,
}: {
  texte: (seulementRatures: boolean) => string;
  ratures: number;
  total: number;
  variantes?: boolean;
  onError?: (msg: string) => void;
}) {
  const [copied, setCopied] = useState<"all" | "errors" | null>(null);

  async function copy(which: "all" | "errors") {
    try {
      await navigator.clipboard.writeText(texte(which === "errors"));
      setCopied(which);
      setTimeout(() => setCopied((v) => (v === which ? null : v)), 2500);
    } catch {
      onError?.("Impossible de copier automatiquement. Sélectionne la correction et copie-la à la main.");
    }
  }

  const deux = variantes && ratures > 0 && ratures < total;
  return (
    <div role="group" aria-label={IA.label} className="flex w-full items-stretch sm:w-auto">
      <button
        type="button"
        className={"btn btn-secondary btn-lg rl-press min-w-0 flex-1 whitespace-nowrap hover:z-10 focus-visible:z-10 sm:flex-none " + (deux ? "rounded-r-none" : "")}
        aria-label={deux ? `${IA.label} : ${COPIE_IA.tout}` : undefined}
        onClick={() => void copy("all")}
      >
        {copied === "all" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {copied === "all" ? "Copié" : IA.label}
        {copied !== "all" && deux && <span className="hidden text-[12.5px] font-medium opacity-60 sm:inline">· {COPIE_IA.tout}</span>}
      </button>
      {deux && (
        <button
          type="button"
          className="btn btn-secondary btn-lg -ml-px shrink-0 whitespace-nowrap rounded-l-none px-4 text-[13.5px] font-medium hover:z-10 focus-visible:z-10"
          aria-label={`${IA.label} : ${COPIE_IA.seulement(ratures)}`}
          onClick={() => void copy("errors")}
        >
          {copied === "errors" ? <Check size={15} aria-hidden /> : null}
          {copied === "errors" ? "Copié" : COPIE_IA.seulement(ratures)}
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? IA.copie : ""}
      </span>
    </div>
  );
}

/** « Copier pour l'IA » : tout, ou seulement les erreurs (même format). */
export function CopyForAi({
  review,
  score,
  total,
  kind,
  size = "lg",
  onError,
}: {
  review: ReviewQuestion[];
  score: number;
  total: number;
  kind: AiExportKind;
  /** action : le bouton de la copie corrigée (fin de session) */
  size?: "lg" | "sm" | "action";
  onError?: (msg: string) => void;
}) {
  const [copied, setCopied] = useState<"all" | "errors" | null>(null);
  const errors = review.filter((q) => !q.is_correct).length;

  if (size === "action") {
    return (
      <CopierPourIA
        texte={(onlyErrors) => buildAiExportText(review, score, total, kind, { onlyErrors })}
        ratures={errors}
        total={review.length}
        onError={onError}
      />
    );
  }

  async function copy(which: "all" | "errors") {
    const text = buildAiExportText(review, score, total, kind, { onlyErrors: which === "errors" });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((v) => (v === which ? null : v)), 2500);
    } catch {
      onError?.("Impossible de copier automatiquement. Sélectionne la correction et copie-la à la main.");
    }
  }

  if (size === "sm") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void copy("all")}>
          {copied === "all" ? <Check size={14} aria-hidden /> : <Sparkles size={14} aria-hidden />}
          {copied === "all" ? "Copié" : "Copier pour l'IA"}
        </button>
        {errors > 0 && errors < review.length && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy("errors")}>
            {copied === "errors" ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied === "errors" ? "Copié" : COPIE_IA.mesRatures(errors)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-surface-2/55 p-4 shadow-[inset_0_0_0_1px_var(--line)] md:p-5">
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-black shadow-[var(--shadow-btn)]">
          <Sparkles size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="t-h3 m-0">Comprends tes ratures avec une IA</p>
          <p className="t-small m-0 mt-1" aria-live="polite">
            {copied
              ? "Copié. Colle-le dans ChatGPT, Claude… : il t'explique chaque rature."
              : "Énoncés, tes réponses, les bonnes et les explications, prêts à coller."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary rl-press" onClick={() => void copy("all")}>
          {copied === "all" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copied === "all" ? "Copié" : IA.label}
        </button>
        {errors > 0 && errors < review.length && (
          <button type="button" className="btn btn-ghost" onClick={() => void copy("errors")}>
            {copied === "errors" ? <Check size={16} aria-hidden /> : null}
            {copied === "errors" ? "Copié" : `Seulement mes ${nRatures(errors)}`}
          </button>
        )}
      </div>
    </div>
  );
}

/** Le résultat : l'anneau de réussite, le verdict, et ce qu'on en fait. */
export function ResultHero({
  eyebrow,
  verdict,
  pct,
  score,
  total,
  meta,
  chips,
  children,
  actions,
}: {
  eyebrow: string;
  verdict: React.ReactNode;
  pct: number | null;
  score: number;
  total: number;
  meta?: React.ReactNode;
  chips?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="card-hero rl-in grid grid-cols-1 gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-10 md:p-9" aria-label="Résultat">
      {pct !== null && (
        <div className="flex items-center gap-4 md:block">
          <span className="block md:hidden">
            <InkProgressRing pct={pct} size={112}>
              <span className="t-num text-[19px]">
                {pct}
                <span className="text-[0.6em]">%</span>
              </span>
            </InkProgressRing>
          </span>
          <span className="hidden md:block">
            <InkProgressRing pct={pct} size={168}>
              <span className="flex flex-col items-center gap-1">
                <span className="t-num text-[38px]">
                  {pct}
                  <span className="text-[0.55em]">%</span>
                </span>
                <span className="t-micro font-mono tabular-nums">
                  {score}/{total}
                </span>
              </span>
            </InkProgressRing>
          </span>
          <div className="min-w-0 md:hidden">
            <p className="t-eyebrow m-0">{eyebrow}</p>
            <h2 className="t-h2 m-0 mt-1.5">{verdict}</h2>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-5">
        <div className={pct !== null ? "hidden md:block" : ""}>
          <p className="t-eyebrow m-0">{eyebrow}</p>
          <h2 className="t-h1 m-0 mt-2">{verdict}</h2>
        </div>
        {(meta || chips) && (
          <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            {meta && <p className="t-small m-0">{meta}</p>}
            {chips}
          </div>
        )}
        {children}
        {actions && <div className="flex flex-wrap items-center gap-x-5 gap-y-2">{actions}</div>}
      </div>
    </section>
  );
}

/** Réussite par matière, de la plus faible à la plus forte. */
export function TopicBreakdown({ review, title = "Par matière" }: { review: ReviewQuestion[]; title?: string }) {
  const stats = topicStats(review);
  if (stats.length === 0) return null;
  const two = stats.length > 4;
  return (
    <section className="rl-section" aria-label={title}>
      <SectionHead title={title} meta={PAR_MATIERE.meta(stats[0])} />
      <div className={"card grid grid-cols-1 gap-x-10 px-5 py-2 md:px-7 md:py-3 " + (two ? "md:grid-cols-2" : "")}>
        {stats.map((t, i) => (
          <div
            key={t.topic}
            className={
              "border-b border-line py-3.5 last:border-0 " +
              (two && i >= stats.length - (stats.length % 2 === 0 ? 2 : 1) ? "md:border-0" : "")
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[14.5px] font-semibold">{t.topic}</span>
              <span className={"t-micro shrink-0 tabular-nums " + (t.pct < 50 ? "text-pen" : "")}>
                {t.pct} % · {t.correct}/{t.total}
              </span>
            </div>
            <div className={"ink-bar mt-2.5 h-[5px] " + (t.pct < 50 ? "is-pen" : "")}>
              <span style={{ width: `${t.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** L'explication officielle, posée en retrait sous les réponses. */
export function Explanation({ text, compact = false, className = "" }: { text: string; compact?: boolean; className?: string }) {
  return (
    <div className={"rounded-[12px] bg-surface-2/60 " + (compact ? "p-3 " : "p-4 md:px-5 ") + className}>
      <p className="t-eyebrow m-0">Explication</p>
      <p className={"m-0 mt-1.5 whitespace-pre-wrap break-words leading-[1.6] text-body " + (compact ? "text-[12.5px]" : "text-[14px]")}>{text}</p>
    </div>
  );
}

/** Une question corrigée : l'énoncé, les réponses annotées, l'explication. */
export function ReviewItem({ q, n, compact = false }: { q: ReviewQuestion; n: number; compact?: boolean }) {
  const status = q.is_correct ? "ok" : q.selected_index === null ? "skip" : "ko";
  return (
    <article className={(compact ? "card-quiet p-4" : "card p-5 md:p-7") + " min-w-0"}>
      <div className="flex items-center justify-between gap-3">
        <p className="t-micro m-0 min-w-0 truncate">
          <span className="font-semibold text-white tabular-nums">Q{n}</span>
          {q.topic ? <> · {cleanTopic(q.topic)}</> : null}
        </p>
        <span
          className={
            "inline-flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-0.5 text-[12px] font-semibold " +
            (status === "ok" ? "bg-surface-2 text-white" : status === "ko" ? "bg-pen/10 text-pen" : "bg-surface-2 text-muted")
          }
        >
          {status === "ok" ? <Check size={13} aria-hidden /> : status === "ko" ? <X size={13} aria-hidden /> : <Minus size={13} aria-hidden />}
          {status === "ok" ? CORRECTION.juste : status === "ko" ? CORRECTION.rature : CORRECTION.sansReponse}
        </span>
      </div>
      <QuestionPrompt
        text={q.prompt}
        compact={compact}
        className={
          "mt-3 font-semibold leading-[1.6] tracking-[-0.006em] break-words [overflow-wrap:anywhere] " +
          (compact ? "text-[14px]" : "text-[15.5px] md:text-[16px]")
        }
      />
      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {q.choices.map((c, ci) => {
          const correct = ci === q.correct_index;
          const mine = ci === q.selected_index;
          const state = correct ? "correct" : mine ? "wrong" : "dim";
          return (
            <li
              key={ci}
              className={
                "flex items-start gap-3 rounded-[12px] border px-3 py-2.5 leading-[1.5] " +
                (compact ? "text-[13px] " : "text-[14.5px] ") +
                (state === "correct"
                  ? "border-white bg-surface font-semibold"
                  : state === "wrong"
                    ? "border-pen/60 bg-pen/[0.04] text-pen"
                    : "border-line text-muted")
              }
            >
              <span
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded-[7px] font-mono text-[12px] font-semibold " +
                  (state === "correct" ? "bg-white text-black" : state === "wrong" ? "bg-pen text-black" : "bg-surface-2")
                }
              >
                {state === "correct" ? <Check size={13} strokeWidth={2.6} aria-hidden /> : state === "wrong" ? <X size={13} strokeWidth={2.6} aria-hidden /> : letter(ci)}
              </span>
              <span className="min-w-0 flex-1 pt-[1px] break-words [overflow-wrap:anywhere]">{c}</span>
              {state === "correct" && (
                <span className="t-micro hidden shrink-0 pt-[3px] font-semibold text-white sm:inline">{mine ? "Ta réponse · juste" : "Bonne réponse"}</span>
              )}
              {state === "wrong" && <span className="t-micro hidden shrink-0 pt-[3px] font-semibold text-pen sm:inline">Ta réponse</span>}
            </li>
          );
        })}
      </ul>
      {q.explanation && <Explanation text={q.explanation} compact={compact} className="mt-4" />}
    </article>
  );
}

/** La correction : filtre « Mes erreurs / Tout », puis les questions. */
export function ReviewSection({
  review,
  title = CORRECTION.titre,
  defaultOpen = true,
  compact = false,
  action,
}: {
  review: ReviewQuestion[];
  title?: string;
  /** false : repliée derrière un bouton (pages où d'autres sections suivent) */
  defaultOpen?: boolean;
  compact?: boolean;
  action?: React.ReactNode;
}) {
  const errors = review.filter((q) => !q.is_correct).length;
  const [filter, setFilter] = useState<"errors" | "all">(errors > 0 ? "errors" : "all");
  const [open, setOpen] = useState(defaultOpen);
  const items = review.map((q, i) => ({ q, n: i + 1 })).filter(({ q }) => filter === "all" || !q.is_correct);

  if (review.length === 0) return null;

  return (
    <section className={compact ? "flex flex-col gap-3" : "rl-section"} aria-label={title}>
      {!compact && (
        <SectionHead
          title={title}
          action={
            open ? (
              <Seg
                label="Filtrer la correction"
                value={filter}
                onChange={setFilter}
                options={[
                  { key: "errors", label: <>{CORRECTION.mesRatures} <span className="text-[12.5px] tabular-nums opacity-60">{errors}</span></> },
                  { key: "all", label: <>{CORRECTION.tout} <span className="text-[12.5px] tabular-nums opacity-60">{review.length}</span></> },
                ]}
              />
            ) : undefined
          }
        />
      )}
      {compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Seg
            label="Filtrer la correction"
            value={filter}
            onChange={setFilter}
            className="text-[13px]"
            options={[
              { key: "errors", label: `${CORRECTION.mesRatures} · ${errors}` },
              { key: "all", label: `${CORRECTION.tout} · ${review.length}` },
            ]}
          />
          {action}
        </div>
      )}
      {!open ? (
        <div className="card-quiet flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="t-small m-0">
            {CORRECTION.repliee(errors, review.length)}
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
            {CORRECTION.voir} <ChevronDown size={14} aria-hidden />
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="card-quiet px-5 py-6 text-center">
          <p className="t-small m-0">{CORRECTION.pagePropre}</p>
        </div>
      ) : (
        <div className={"grid grid-cols-1 " + (compact ? "gap-2.5" : "gap-3 md:gap-4")}>
          {items.map(({ q, n }) => (
            <ReviewItem key={q.question_id + "-" + n} q={q} n={n} compact={compact} />
          ))}
        </div>
      )}
    </section>
  );
}
