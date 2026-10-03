"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
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
import { EloDelta } from "@/components/session/ui";
import { PASS_THRESHOLD, fmtMinutes, type ReviewQuestion } from "@/components/session/review";

// Reçu pendant l'examen — jamais correct_index/explanation (voir
// migration_mock_exam_secure_submit.sql, correction entièrement serveur).
type ActiveQuestion = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
};

// La correction (ReviewQuestion) n'arrive qu'après soumission (via
// submit_mock_exam ou get_mock_exam_review) — c'est la SEULE source de
// correct_index côté client.

type Props = {
  examId: string;
  durationMinutes: number;
  questions: ActiveQuestion[];
  review: ReviewQuestion[];
  alreadyDone: boolean;
  /** examen blanc classé : variation d'ELO une fois appliquée, sinon une note (ex. « à la clôture ») */
  elo?: { delta: number | null; note: string | null } | null;
  /** aperçu (app/preview-da) : écran et réponses de départ, chrono figé */
  demo?: { phase: "ready" | "active"; answers?: (number | null)[]; idx?: number; secondsLeft?: number };
};

export function MockExamRunner({ examId, durationMinutes, questions, review: initialReview, alreadyDone, elo = null, demo }: Props) {
  const supabase = useMemo(() => createClient(), []);

  type Phase = "ready" | "active" | "done";
  const [phase, setPhase] = useState<Phase>(alreadyDone ? "done" : demo?.phase ?? "ready");
  const [answers, setAnswers] = useState<(number | null)[]>(() => demo?.answers ?? questions.map(() => null));
  const [idx, setIdx] = useState(demo?.idx ?? 0);
  const [secondsLeft, setSecondsLeft] = useState(demo?.secondsLeft ?? durationMinutes * 60);
  const [review, setReview] = useState<ReviewQuestion[]>(initialReview);
  const [submitting, setSubmitting] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  // Le timeout auto-submit est capturé au montage du timer (effet [phase]) et
  // garde donc une closure figée sur `answers` tel qu'il était à ce moment —
  // sans ce ref à jour, l'auto-submit renvoyait toujours le tableau initial
  // (tout à null), écrasant les vraies réponses par un score de 0.
  const answersRef = useRef<(number | null)[]>(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  useEffect(() => {
    if (phase !== "active" || demo) return;
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

  // Chaque changement d'écran repart du haut de la page.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  function start() {
    startedAtRef.current = Date.now();
    setPhase("active");
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setConfirmEnd(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    const payload = questions.map((q, i) => ({ question_id: q.id, selected_index: answersRef.current[i] }));

    try {
      const { data, error: rpcError } = await supabase.rpc("submit_mock_exam", {
        p_exam_id: examId,
        p_answers: payload,
        p_duration_seconds: duration,
      });
      if (rpcError) throw new Error(rpcError.message);
      setReview((data?.review ?? []) as ReviewQuestion[]);
      setPhase("done");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de la soumission"));
    } finally {
      setSubmitting(false);
    }
  }

  const answered = answers.filter((a) => a !== null).length;
  const current = questions[idx];

  // ── AVANT DE COMMENCER ──
  if (phase === "ready") {
    return (
      <ReadyCard
        eyebrow="Examen blanc · ta copie"
        title="Prêt à commencer ?"
        meta={`${questions.length} questions · ${fmtMinutes(durationMinutes)}`}
        rules={[
          "Pas de correction pendant l'examen : résultats et explications à la fin.",
          "Pas de pause : à la fin du chrono, ta copie est remise automatiquement.",
          "Garde la page ouverte : tes réponses partent quand tu remets ta copie.",
        ]}
        onStart={start}
        startLabel="Commencer l'examen"
        wide
      />
    );
  }

  // ── RÉSULTAT ──
  if (phase === "done") {
    const total = review.length;
    const score = review.filter((r) => r.is_correct).length;
    const pct = total > 0 ? Math.round((score / total) * 100) : null;
    const passed = pct !== null && pct >= PASS_THRESHOLD;

    return (
      <div className="rl-page">
        <ResultHero
          eyebrow={`Examen blanc · seuil indicatif ${PASS_THRESHOLD} %`}
          verdict={total > 0 ? (passed ? "Réussi" : "Pas encore") : "Résultats indisponibles"}
          pct={pct}
          score={score}
          total={total}
          meta={
            total > 0 ? (
              <>
                {score} bonne{score > 1 ? "s" : ""} réponse{score > 1 ? "s" : ""} sur {total}
                {elo?.note ? <> · {elo.note}</> : null}
              </>
            ) : (
              elo?.note ?? undefined
            )
          }
          chips={elo && elo.delta !== null ? <EloDelta delta={elo.delta} /> : undefined}
          actions={
            total > 0 ? (
              <a href="#rejouer" className="ink-link">
                Rejouer en entraînement
              </a>
            ) : undefined
          }
        >
          {total > 0 && <CopyForAi review={review} score={score} total={total} kind="mock" onError={setError} />}
          {error && (
            <p role="alert" className="m-0 text-sm text-pen">
              {error}
            </p>
          )}
        </ResultHero>

        <TopicBreakdown review={review} />

        <ReviewSection review={review} defaultOpen={false} />
      </div>
    );
  }

  // ── PENDANT L'EXAMEN ──
  const last = idx === questions.length - 1;
  const unanswered = questions.length - answered;
  function askEnd() {
    if (unanswered > 0) setConfirmEnd(true);
    else void submit();
  }

  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-5 md:gap-6">
      <RunnerBar
        label="Examen blanc"
        index={idx}
        total={questions.length}
        answered={answered}
        secondsLeft={secondsLeft}
        lowAt={300}
        actions={
          <button type="button" className="btn btn-secondary btn-sm" disabled={submitting} onClick={askEnd}>
            {submitting ? "Envoi…" : "Remettre"}
          </button>
        }
      />

      {confirmEnd && (
        <div role="alert" className="card-quiet rl-in flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="m-0 text-[14px]">
            Encore <b>{unanswered}</b> question{unanswered > 1 ? "s" : ""} sans réponse. Remettre ta copie quand même ?
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(false)}>
              Continuer
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={submitting} onClick={() => void submit()}>
              Remettre ma copie
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
                  <button type="button" className="btn btn-primary rl-press" disabled={submitting} onClick={askEnd}>
                    Remettre ma copie <ArrowRight size={16} aria-hidden />
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
    </div>
  );
}
