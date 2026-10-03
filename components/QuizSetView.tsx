"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Check, Copy, ListChecks, RotateCcw, X } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { InkProgressRing } from "@/components/ui/InkRings";
import { DisclosureRow, plural } from "@/components/ContentDetailHeader";
import type { QuizQuestion, AwardXpResult } from "@/lib/types";
import { QuestionPrompt } from "@/components/QuestionPrompt";

// Chargé uniquement pour le propriétaire (voir isOwner plus bas) : les
// formulaires de création/édition/import et leurs dépendances (TopicSelector)
// ne sont ainsi jamais téléchargés par un visiteur qui vient juste répondre
// au quiz.
const QuizSetManage = dynamic(() => import("@/components/QuizSetManage").then((m) => m.QuizSetManage), {
  loading: () => <p className="t-small">Chargement…</p>,
});

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type Reveal = { correctIndex: number; explanation: string | null };
export type QuizResult = { questionId: string; picked: number; correct: boolean; reveal: Reveal | null };
type Feedback = { tone: "xp" | "info" | "error"; text: string } | null;

/** Aperçu uniquement : corrige sans serveur et ouvre le QCM dans un état donné. */
export type QuizDemo = {
  answers?: Record<string, Reveal>;
  stage?: "intro" | "run" | "done";
  index?: number;
  picked?: number | null;
  results?: QuizResult[];
  xp?: number;
};

function verdict(pct: number) {
  if (pct >= 100) return "Sans faute.";
  if (pct >= 80) return "Solide.";
  if (pct >= 60) return "En bonne voie.";
  if (pct >= 40) return "À consolider.";
  return "On reprend les bases.";
}

/** Même format que l'export des sessions (PracticeSession), que l'utilisateur connaît. */
function buildAiExportText(title: string, questions: QuizQuestion[], results: QuizResult[]) {
  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const header =
    `QCM CFA — ${title} — ${score}/${total} (${pct}%)\n` +
    `Voici mes réponses à un QCM CFA Level I. Pour chaque question : l'énoncé, les choix, ma réponse, la bonne réponse et l'explication. ` +
    `Peux-tu me faire un bilan de mes points faibles, et m'expliquer plus en détail les questions où je me suis trompé ?\n\n`;
  const body = results
    .map((r, i) => {
      const q = questions.find((x) => x.id === r.questionId);
      if (!q) return "";
      const choicesText = q.choices.map((c, ci) => `${LETTERS[ci]}) ${c}`).join("\n");
      const mine = `${LETTERS[r.picked]}) ${q.choices[r.picked]}`;
      const ci = r.reveal?.correctIndex;
      const right = typeof ci === "number" ? `${LETTERS[ci]}) ${q.choices[ci]}` : "inconnue";
      return (
        `Q${i + 1} — ${r.correct ? "CORRECT" : "INCORRECT"}\n` +
        `${q.prompt}\n${choicesText}\n` +
        `Ma réponse : ${mine}\n` +
        `Bonne réponse : ${right}\n` +
        (r.reveal?.explanation ? `Explication : ${r.reveal.explanation}\n` : "")
      );
    })
    .filter(Boolean)
    .join("\n");
  return header + body;
}

// ---------------------------------------------------------------------------
// Une réponse proposée
// ---------------------------------------------------------------------------

function Choice({
  index,
  text,
  picked,
  right,
  wrong,
  locked,
  onPick,
}: {
  index: number;
  text: string;
  picked: boolean;
  right: boolean;
  wrong: boolean;
  locked: boolean;
  onPick?: () => void;
}) {
  const faded = locked && !right && !wrong;
  const frame = right
    ? "border-white bg-surface font-semibold shadow-[inset_0_0_0_1px_var(--ink)]"
    : wrong
      ? "border-pen bg-surface shadow-[inset_0_0_0_1px_var(--pen)]"
      : picked
        ? "border-white bg-surface shadow-[inset_0_0_0_1px_var(--ink)]"
        : "border-line-2 bg-surface/60 hover:border-[color-mix(in_oklab,var(--ink)_32%,transparent)] hover:bg-surface";
  const letter = right
    ? "bg-white text-black"
    : wrong
      ? "bg-pen text-black"
      : picked
        ? "bg-white text-black"
        : "bg-surface-2 text-muted group-hover:text-white";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={picked}
      disabled={locked}
      onClick={onPick}
      className={
        "group flex w-full items-start gap-3.5 rounded-[14px] border px-4 py-3.5 text-left text-[15px] leading-snug transition-[background-color,border-color,box-shadow,opacity] duration-200 disabled:cursor-default " +
        frame +
        (faded ? " opacity-50" : "")
      }
    >
      <span className={"grid h-7 w-7 shrink-0 place-items-center rounded-[9px] text-[13px] font-semibold transition-colors " + letter}>
        {right ? <Check size={15} strokeWidth={2.6} aria-hidden /> : wrong ? <X size={15} strokeWidth={2.6} aria-hidden /> : LETTERS[index]}
      </span>
      <span className="min-w-0 flex-1 break-words pt-[3px] [overflow-wrap:anywhere]">{text}</span>
      {right && <span className="sr-only"> (bonne réponse)</span>}
      {wrong && <span className="sr-only"> (ta réponse, fausse)</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Le QCM
// ---------------------------------------------------------------------------

export function QuizSetView({
  setId,
  isOwner,
  initialQuestions,
  title = "QCM",
  official = false,
  done = null,
  settingsSlot,
  demo,
}: {
  setId: string;
  isOwner: boolean;
  initialQuestions: QuizQuestion[];
  /** titre du QCM (bilan, export pour l'IA) */
  title?: string;
  /** QCM Système : les bonnes réponses rapportent de l'XP */
  official?: boolean;
  /** questions déjà réussies par le joueur */
  done?: number | null;
  /** réglages du QCM (propriétaire), rangés avec la gestion des questions */
  settingsSlot?: React.ReactNode;
  demo?: QuizDemo;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [stage, setStage] = useState<"intro" | "run" | "done">(demo?.stage ?? "intro");
  const [index, setIndex] = useState(demo?.index ?? 0);
  const [selected, setSelected] = useState<number | null>(demo?.picked ?? null);
  const [results, setResults] = useState<QuizResult[]>(demo?.results ?? []);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // La bonne réponse n'est connue qu'APRÈS soumission (voir
  // migration_fix_answer_leak.sql) — révélée par award_quiz_question_xp,
  // jamais lue depuis current.correct_index qui peut être undefined.
  const n = questions.length;
  const current = stage === "run" ? questions[index] ?? null : null;
  const answer = current ? results.find((r) => r.questionId === current.id) ?? null : null;
  const revealed = answer?.reveal ?? null;
  const answered = Boolean(answer);
  const score = results.filter((r) => r.correct).length;
  const isLast = index >= n - 1;

  // Appelé par QuizSetManage après une création/édition/suppression/import —
  // met à jour la liste ET réinitialise le QCM puisque le contenu sous-jacent
  // a changé (index de question, sélection, score n'ont plus de sens).
  function handleQuestionsChange(next: QuizQuestion[]) {
    setQuestions(next);
    setStage("intro");
    setIndex(0);
    setSelected(null);
    setResults([]);
    setFeedback(null);
  }

  function start() {
    setStage("run");
    setIndex(0);
    setSelected(null);
    setResults([]);
    setFeedback(null);
    setCopied(false);
    setStartedAt(Date.now());
  }

  async function submitAttempt(finalScore: number) {
    if (demo) return;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
      await supabase.from("quiz_attempts").insert({
        user_id: auth.user.id,
        set_id: setId,
        score: finalScore,
        total: questions.length,
        duration_seconds: duration,
      });
    } catch (e) {
      // Non-critical pour l'utilisateur (le score reste affiché localement),
      // mais on log pour ne pas perdre le signal en cas de bug silencieux.
      console.error("submitAttempt failed:", e);
    }
  }

  // Soumet la réponse au serveur, qui la corrige ET renvoie la bonne réponse
  // (correct_index/explanation) — le client ne les connaît jamais avant cet
  // appel (voir migration_fix_answer_leak.sql).
  async function submitAnswer(questionId: string, selectedIndex: number) {
    setBusy(true);
    setFeedback(null);
    try {
      let row: AwardXpResult | null;
      if (demo?.answers) {
        const r = demo.answers[questionId];
        row = r
          ? { is_correct: r.correctIndex === selectedIndex, xp_awarded: r.correctIndex === selectedIndex ? demo.xp ?? 10 : 0, xp_total: 0, correct_index: r.correctIndex, explanation: r.explanation }
          : null;
      } else {
        const { data, error } = await supabase.rpc("award_quiz_question_xp", {
          p_set_id: setId,
          p_question_id: questionId,
          p_selected_index: selectedIndex,
        });
        if (error) {
          setFeedback({ tone: "error", text: friendlyError(error, t("qcm.noXp")) });
          return;
        }
        row = (Array.isArray(data) ? data[0] : data) as AwardXpResult | null;
      }

      const xp = Number(row?.xp_awarded ?? 0) || 0;
      const isCorrect = Boolean(row?.is_correct);
      const correctIndex = row?.correct_index;
      const reveal = typeof correctIndex === "number" ? { correctIndex, explanation: row?.explanation ?? null } : null;
      setResults((prev) => [...prev.filter((r) => r.questionId !== questionId), { questionId, picked: selectedIndex, correct: isCorrect, reveal }]);
      if (isCorrect && xp > 0) setFeedback({ tone: "xp", text: `+${xp} XP` });
      else if (isCorrect && official) setFeedback({ tone: "info", text: "Déjà réussie : pas d'XP cette fois." });
    } catch (e: unknown) {
      // Réseau coupé : on note la réponse sans correction pour pouvoir avancer.
      setResults((prev) => [...prev.filter((r) => r.questionId !== questionId), { questionId, picked: selectedIndex, correct: false, reveal: null }]);
      setFeedback({ tone: "error", text: friendlyError(e, "Correction indisponible pour cette question.") });
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    if (isLast) {
      setStage("done");
      void submitAttempt(score);
      return;
    }
    setIndex((v) => v + 1);
    setSelected(null);
    setFeedback(null);
  }

  function primary() {
    if (!current || busy) return;
    if (answered) goNext();
    else if (selected !== null) void submitAnswer(current.id, selected);
  }

  async function copyForAi() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(buildAiExportText(title, questions, results));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("Impossible de copier automatiquement.");
    }
  }

  // Clavier : 1–6 ou A–F pour choisir, Entrée pour valider puis avancer.
  useEffect(() => {
    if (stage !== "run") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const choices = current?.choices.length ?? 0;
      let pick = -1;
      if (/^[1-6]$/.test(k)) pick = Number(k) - 1;
      else if (/^[a-f]$/.test(k)) pick = k.charCodeAt(0) - 97;
      if (pick >= 0) {
        if (pick < choices && !answered && !busy) {
          setSelected(pick);
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        primary();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const maxChoices = Math.max(2, ...questions.map((q) => q.choices.length));

  // ---------------------------------------------------------------------------
  // Écrans
  // ---------------------------------------------------------------------------

  const intro = (
    <section className="card-hero rl-in p-6 sm:p-8 md:p-9" aria-label="Commencer le QCM">
      {n === 0 ? (
        <div className="grid gap-2">
          <p className="t-eyebrow">QCM vide</p>
          <p className="t-h2 m-0">Aucune question pour l&apos;instant.</p>
          {isOwner && <p className="t-small">Ajoute-en dans « Questions », juste en dessous.</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="t-eyebrow">Prêt ?</p>
              <p className="mt-3 flex items-baseline gap-3">
                <span className="t-num text-[56px] md:text-[68px]">{n}</span>
                <span className="t-h3 text-muted">question{n > 1 ? "s" : ""}</span>
              </p>
              <p className="t-small mt-3 max-w-[440px]">
                Corrigées une à une, sans chrono.{official ? " Chaque première bonne réponse rapporte de l'XP." : ""}
              </p>
              {done ? (
                <div className="mt-4 flex max-w-[320px] items-center gap-3">
                  <div className="ink-bar flex-1">
                    <span style={{ width: `${Math.min(100, Math.round((100 * done) / n))}%` }} />
                  </div>
                  <span className="t-micro shrink-0 font-mono tabular-nums">
                    {Math.min(done, n)}/{n} <span className="font-sans">déjà réussies</span>
                  </span>
                </div>
              ) : null}
            </div>
            <button type="button" className="btn btn-primary btn-lg rl-press w-full shrink-0 sm:w-auto" onClick={start}>
              Commencer <ArrowRight size={17} aria-hidden />
            </button>
          </div>
          <p className="t-micro mt-8 hidden flex-wrap items-center gap-1.5 sm:flex">
            Au clavier : <span className="kbd">1</span>–<span className="kbd">{Math.min(maxChoices, 6)}</span> pour choisir,
            <span className="kbd">Entrée</span> pour valider.
          </p>
        </>
      )}
    </section>
  );

  const run = current && (
    <section className="flex flex-col gap-5" aria-label={`Question ${index + 1} sur ${n}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="t-micro shrink-0 font-mono font-semibold tabular-nums text-white">
          {index + 1}
          <span className="font-medium text-muted"> / {n}</span>
        </span>
        <div className="ink-bar flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={index + (answered ? 1 : 0)} aria-label="Avancement">
          <span style={{ width: `${((index + (answered ? 1 : 0)) / Math.max(1, n)) * 100}%` }} />
        </div>
        <span className="t-micro shrink-0 tabular-nums">
          {score} juste{score > 1 ? "s" : ""}
        </span>
        <button type="button" className="icon-btn h-8 w-8 rounded-[10px]" onClick={start} aria-label="Recommencer le QCM" title="Recommencer">
          <RotateCcw size={14} aria-hidden />
        </button>
      </div>

      <article key={current.id} className="card-hero rl-in p-5 sm:p-7 md:p-8">
        <QuestionPrompt text={current.prompt} className="text-[17px] font-semibold leading-relaxed tracking-[-0.01em] md:text-[18px]" />
        <div className="mt-6 grid gap-2.5" role="radiogroup" aria-label="Réponses">
          {current.choices.map((choice, idx) => (
            <Choice
              key={idx}
              index={idx}
              text={choice}
              picked={answered ? answer?.picked === idx : selected === idx}
              right={Boolean(revealed) && idx === revealed?.correctIndex}
              wrong={Boolean(revealed) && answer?.picked === idx && idx !== revealed?.correctIndex}
              locked={answered || busy}
              onPick={() => setSelected(idx)}
            />
          ))}
        </div>

        {answered && revealed && (
          <div className="rl-in mt-7 border-t border-line pt-6">
            <p className={"t-eyebrow " + (answer?.correct ? "" : "text-pen")}>{answer?.correct ? "Bonne réponse" : "Pas cette fois"}</p>
            {!answer?.correct && (
              <p className="mt-2.5 text-[15px] font-semibold leading-snug">
                La bonne réponse : {LETTERS[revealed.correctIndex]}) {current.choices[revealed.correctIndex]}
              </p>
            )}
            {revealed.explanation && (
              <p className="t-body text-body mt-2.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{revealed.explanation}</p>
            )}
          </div>
        )}
      </article>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={
            "min-h-[20px] text-[13.5px] " +
            (feedback?.tone === "xp" ? "font-semibold" : feedback?.tone === "error" ? "text-pen" : "text-muted")
          }
        >
          {feedback?.text ?? ""}
        </p>
        <button
          type="button"
          className="btn btn-primary btn-lg rl-press w-full sm:w-auto sm:min-w-[200px]"
          disabled={busy || (!answered && selected === null)}
          onClick={primary}
        >
          {busy ? "Correction…" : !answered ? "Valider" : isLast ? "Voir le bilan" : "Question suivante"}
          {!busy && answered && <ArrowRight size={17} aria-hidden />}
        </button>
      </div>
    </section>
  );

  const pct = results.length ? Math.round((100 * score) / results.length) : 0;
  const mistakes = results.filter((r) => !r.correct);

  const summary = (
    <>
      <section className="card-hero rl-in p-6 sm:p-8 md:p-10" aria-label="Bilan du QCM">
        <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:gap-10 sm:text-left">
          <InkProgressRing pct={pct} size={156}>
            <div>
              <div className="t-num text-[38px]">
                {score}
                <span className="text-[20px] text-muted">/{results.length}</span>
              </div>
              <div className="t-micro mt-1.5 font-mono tabular-nums">{pct} %</div>
            </div>
          </InkProgressRing>
          <div className="min-w-0 flex-1">
            <p className="t-eyebrow">Bilan</p>
            <h2 className="t-h1 mt-2.5">{verdict(pct)}</h2>
            <p className="t-small mt-2.5">
              {mistakes.length === 0 ? "Aucune erreur sur ce QCM." : `${plural(mistakes.length, "erreur", "erreurs")} à revoir, juste en dessous.`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button type="button" className="btn btn-primary rl-press" onClick={start}>
                <RotateCcw size={16} aria-hidden /> Recommencer
              </button>
              <button type="button" className="btn btn-secondary" onClick={copyForAi} disabled={results.length === 0}>
                {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                {copied ? "Copié" : "Copier pour l'IA"}
              </button>
              <Link href="/qcm" className="btn btn-ghost">
                Autres QCM
              </Link>
            </div>
            {copyError && <p className="t-micro mt-2 text-pen">{copyError}</p>}
          </div>
        </div>
      </section>

      {mistakes.length > 0 && (
        <section className="rl-section" aria-labelledby="qcm-erreurs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="qcm-erreurs" className="t-h2 m-0">
              Tes erreurs
            </h2>
            <span className="t-micro font-mono tabular-nums">{mistakes.length}</span>
          </div>
          <ol className="card m-0 list-none divide-y divide-line overflow-hidden p-0">
            {mistakes.map((r) => {
              const q = questions.find((x) => x.id === r.questionId);
              if (!q) return null;
              const pos = questions.indexOf(q) + 1;
              const ci = r.reveal?.correctIndex;
              return (
                <li key={r.questionId} className="flex flex-col gap-3.5 px-5 py-6 md:px-7">
                  <p className="t-micro font-mono font-semibold">Question {pos}</p>
                  <QuestionPrompt text={q.prompt} compact className="text-[15px] font-semibold leading-relaxed" />
                  <div className="grid gap-2 text-[14px] leading-snug">
                    <p className="flex gap-2.5">
                      <X size={16} aria-hidden className="mt-0.5 shrink-0 text-pen" />
                      <span>
                        <span className="text-muted">Ta réponse · </span>
                        {LETTERS[r.picked]}) {q.choices[r.picked]}
                      </span>
                    </p>
                    {typeof ci === "number" && (
                      <p className="flex gap-2.5 font-semibold">
                        <Check size={16} aria-hidden className="mt-0.5 shrink-0" />
                        <span>
                          <span className="font-normal text-muted">Bonne réponse · </span>
                          {LETTERS[ci]}) {q.choices[ci]}
                        </span>
                      </p>
                    )}
                  </div>
                  {r.reveal?.explanation && <p className="t-small whitespace-pre-wrap break-words">{r.reveal.explanation}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );

  return (
    <div className="flex min-w-0 flex-col gap-12 md:gap-16">
      {stage === "intro" && intro}
      {stage === "run" && run}
      {stage === "done" && summary}

      {/* ---- Gestion — réservée au propriétaire. Chargée à la demande
          (dynamic import) : son JS n'est jamais envoyé aux visiteurs qui
          viennent juste répondre au quiz. ---- */}
      {(isOwner || settingsSlot) && (
        <section className="rl-section" aria-labelledby="qcm-gerer">
          <h2 id="qcm-gerer" className="t-h3 m-0">
            Gérer ce QCM
          </h2>
          <div className="card divide-y divide-line overflow-hidden">
            {isOwner && (
              <DisclosureRow
                icon={<ListChecks size={18} aria-hidden />}
                title="Questions"
                sub={`${plural(n, "question", "questions")} · ajouter, modifier, importer, exporter`}
              >
                <QuizSetManage setId={setId} questions={questions} onQuestionsChange={handleQuestionsChange} />
              </DisclosureRow>
            )}
            {settingsSlot}
          </div>
        </section>
      )}
    </div>
  );
}
