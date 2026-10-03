"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ArrowRight, ListRestart, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/errors";
import {
  ChoiceButton,
  CopyForAi,
  QuestionCard,
  QuestionMap,
  QuestionNav,
  ReadyCard,
  ResultHero,
  ReviewSection,
  RunnerBar,
  TopicBreakdown,
} from "@/components/session/parts";
import { SectionHead } from "@/components/session/ui";
import { PASS_THRESHOLD, fmtMinutes, pctOf, type ReviewQuestion } from "@/components/session/review";

// Rejouer un examen blanc déjà passé, en entraînement : en entier ou
// seulement ses erreurs. Ne compte ni pour le classement ni pour l'ELO ; seul
// le score est gardé (submit_mock_exam_attempt).

type RetakeQuestion = { id: string; position: number; prompt: string; choices: string[] };

type PastAttempt = {
  id: string;
  mode: "full" | "wrong_only";
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
};

type Props = {
  examId: string;
  durationMinutes: number;
  wrongCount: number;
  totalCount: number;
  pastAttempts: PastAttempt[];
};

export function MockExamRetake({ examId, durationMinutes, wrongCount, totalCount, pastAttempts: initialPast }: Props) {
  const supabase = useMemo(() => createClient(), []);

  type Phase = "menu" | "ready" | "active" | "done";
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<"full" | "wrong_only">("full");
  const [loadingMode, setLoadingMode] = useState<"full" | "wrong_only" | null>(null);
  const [questions, setQuestions] = useState<RetakeQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [review, setReview] = useState<ReviewQuestion[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>(initialPast);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const submittingRef = useRef(false);
  const rootRef = useRef<HTMLElement>(null);
  // Le timeout auto-submit garde une closure figée sur `answers` tel qu'il
  // était au montage du timer — sans ce ref à jour, l'auto-submit renvoyait
  // toujours le tableau initial (tout à null), écrasant les vraies réponses
  // par un score de 0.
  const answersRef = useRef<(number | null)[]>(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  useEffect(() => {
    if (phase !== "active") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          void submit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // L'essai se joue au milieu de la page : on l'amène en haut de l'écran à
  // chaque étape.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  async function startMode(m: "full" | "wrong_only") {
    setBusy(true);
    setLoadingMode(m);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_mock_exam_retake_questions", {
        p_exam_id: examId,
        p_mode: m,
      });
      if (rpcError) throw new Error(rpcError.message);
      const qs = (data ?? []) as RetakeQuestion[];
      if (qs.length === 0) {
        setError("Aucune question disponible pour ce mode.");
        return;
      }
      setQuestions(qs);
      setAnswers(qs.map(() => null));
      setMode(m);
      const scaledMinutes = Math.max(5, Math.round(durationMinutes * (qs.length / totalCount)));
      setSecondsLeft(scaledMinutes * 60);
      setPhase("ready");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors du chargement"));
    } finally {
      setBusy(false);
      setLoadingMode(null);
    }
  }

  function start() {
    setIdx(0);
    setConfirmEnd(false);
    startedAtRef.current = Date.now();
    setPhase("active");
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    setConfirmEnd(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    const payload = questions.map((q, i) => ({ question_id: q.id, selected_index: answersRef.current[i] }));

    try {
      const { data, error: rpcError } = await supabase.rpc("submit_mock_exam_attempt", {
        p_exam_id: examId,
        p_mode: mode,
        p_answers: payload,
        p_duration_seconds: duration,
      });
      if (rpcError) throw new Error(rpcError.message);
      setReview((data?.review ?? []) as ReviewQuestion[]);
      setScore(data?.score ?? 0);
      setTotal(data?.total ?? 0);
      setPastAttempts((prev) => [
        { id: crypto.randomUUID(), mode, score: data?.score ?? 0, total: data?.total ?? 0, duration_seconds: duration, completed_at: new Date().toISOString() },
        ...prev,
      ]);
      setPhase("done");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de la soumission"));
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  }

  function backToMenu() {
    setPhase("menu");
    setReview([]);
    setQuestions([]);
    setError(null);
  }

  const modeLabel = mode === "full" ? "Essai complet" : "Essai · mes erreurs";

  // ── CHOIX DE L'ESSAI ──
  if (phase === "menu") {
    const option = (m: "full" | "wrong_only", icon: React.ReactNode, title: string, meta: string, disabled: boolean) => (
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => void startMode(m)}
        className="group flex items-center gap-3.5 rounded-[14px] border border-line-2 bg-surface px-4 py-3.5 text-left transition-[border-color,box-shadow] duration-200 hover:border-white/45 hover:shadow-[var(--shadow-1)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-surface-2">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold">{loadingMode === m ? "Préparation…" : title}</span>
          <span className="t-micro mt-0.5 block">{meta}</span>
        </span>
        <ArrowRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </button>
    );

    return (
      <section ref={rootRef} id="rejouer" className="rl-section scroll-mt-24" aria-label="Rejouer cet examen">
        <SectionHead title="Rejouer cet examen" meta="entraînement · hors classement et ELO" />
        <div className="card-quiet grid grid-cols-1 gap-5 p-5 md:p-6">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {option("full", <RotateCcw size={16} aria-hidden />, "Tout l'examen", `${totalCount} questions · ${fmtMinutes(durationMinutes)}`, totalCount === 0)}
            {option(
              "wrong_only",
              <ListRestart size={16} aria-hidden />,
              "Seulement mes erreurs",
              wrongCount === 0 ? "aucune erreur à rejouer" : `${wrongCount} question${wrongCount > 1 ? "s" : ""} · ${fmtMinutes(Math.max(5, Math.round(durationMinutes * (wrongCount / Math.max(totalCount, 1)))))}`,
              wrongCount === 0,
            )}
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-pen">
              {error}
            </p>
          )}
          <p className="t-micro m-0">Seul le score de ces essais est gardé, pas les réponses.</p>

          {pastAttempts.length > 0 && (
            <div className="border-t border-line pt-4">
              <p className="t-eyebrow m-0 mb-1.5">Tes essais</p>
              <ul className="m-0 list-none divide-y divide-line p-0">
                {pastAttempts.map((a) => {
                  const pct = pctOf(a.score, a.total);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="t-small min-w-0 truncate">
                        <span className="font-semibold text-white">{a.mode === "full" ? "Tout l'examen" : "Mes erreurs"}</span>
                        {" · "}
                        {new Date(a.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        {a.duration_seconds ? ` · ${fmtMinutes(Math.max(1, Math.round(a.duration_seconds / 60)))}` : ""}
                      </span>
                      <span className="shrink-0 text-right text-[14px] tabular-nums">
                        <span className={"font-semibold " + (pct < 50 ? "text-pen" : "")}>{pct} %</span>
                        <span className="t-micro ml-2 tabular-nums">
                          {a.score}/{a.total}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ── PRÊT ──
  if (phase === "ready") {
    return (
      <section ref={rootRef} id="rejouer" className="scroll-mt-24 py-2" aria-label="Rejouer cet examen">
        <ReadyCard
          eyebrow="Rejouer cet examen · entraînement"
          title={mode === "full" ? "Tout l'examen" : "Tes erreurs"}
          meta={`${questions.length} questions · ${fmtMinutes(Math.round(secondsLeft / 60))}`}
          rules={[
            "Ne compte ni pour le classement ni pour l'ELO.",
            "Correction complète à la fin ; seul le score est gardé ensuite.",
          ]}
          onCancel={backToMenu}
          cancelLabel="Retour"
          onStart={start}
        />
      </section>
    );
  }

  // ── RÉSULTAT ──
  if (phase === "done") {
    const pct = total > 0 ? Math.round((score / total) * 100) : null;
    const passed = pct !== null && pct >= PASS_THRESHOLD;

    return (
      <section ref={rootRef} id="rejouer" className="rl-page scroll-mt-24" aria-label="Résultat de l'essai">
        <ResultHero
          eyebrow={`${modeLabel} · entraînement`}
          verdict={passed ? "Réussi" : "Pas encore : vise 70 %"}
          pct={pct}
          score={score}
          total={total}
          meta={`${score} bonne${score > 1 ? "s" : ""} réponse${score > 1 ? "s" : ""} sur ${total}`}
          actions={
            <button type="button" className="ink-link" onClick={backToMenu}>
              Retour aux essais
            </button>
          }
        >
          {total > 0 && <CopyForAi review={review} score={score} total={total} kind="retake" onError={setError} />}
          {error && (
            <p role="alert" className="m-0 text-sm text-pen">
              {error}
            </p>
          )}
        </ResultHero>

        <TopicBreakdown review={review} />

        <ReviewSection review={review} />
      </section>
    );
  }

  // ── PENDANT L'ESSAI ──
  const answered = answers.filter((a) => a !== null).length;
  const current = questions[idx];
  const last = idx === questions.length - 1;
  const unanswered = questions.length - answered;
  function askEnd() {
    if (unanswered > 0) setConfirmEnd(true);
    else void submit();
  }

  return (
    <section ref={rootRef} id="rejouer" className="mx-auto grid w-full max-w-[820px] scroll-mt-24 gap-5 md:gap-6" aria-label={modeLabel}>
      <RunnerBar
        label={modeLabel}
        index={idx}
        total={questions.length}
        answered={answered}
        secondsLeft={secondsLeft}
        actions={
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={askEnd}>
            {busy ? "Envoi…" : "Terminer"}
          </button>
        }
      />

      {confirmEnd && (
        <div role="alert" className="card-quiet rl-in flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="m-0 text-[14px]">
            Encore <b>{unanswered}</b> question{unanswered > 1 ? "s" : ""} sans réponse. Terminer quand même ?
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(false)}>
              Continuer
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void submit()}>
              Terminer
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 text-sm text-pen">
          {error}
        </p>
      )}

      {current && (
        <QuestionCard
          index={idx}
          total={questions.length}
          prompt={current.prompt}
          footer={
            <QuestionNav
              onPrev={() => setIdx((i) => i - 1)}
              prevDisabled={idx === 0}
              next={
                last ? (
                  <button type="button" className="btn btn-primary rl-press" disabled={busy} onClick={askEnd}>
                    Terminer <ArrowRight size={16} aria-hidden />
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary rl-press" onClick={() => setIdx((i) => i + 1)}>
                    Suivante <ArrowRight size={16} aria-hidden />
                  </button>
                )
              }
            />
          }
        >
          {current.choices.map((c, ci) => (
            <ChoiceButton
              key={ci}
              index={ci}
              text={c}
              state={answers[idx] === ci ? "picked" : "idle"}
              onClick={() => {
                setAnswers((prev) => {
                  const next = [...prev];
                  next[idx] = ci;
                  return next;
                });
              }}
            />
          ))}
        </QuestionCard>
      )}

      <QuestionMap total={questions.length} current={idx} isAnswered={(i) => answers[i] !== null && answers[i] !== undefined} onJump={setIdx} />
    </section>
  );
}
