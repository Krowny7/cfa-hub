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
  ReviewSection,
  RunnerBar,
  TopicBreakdown,
} from "@/components/session/parts";
import { fmtMinutes, type ReviewQuestion } from "@/components/session/review";
import { FinDeSession } from "@/components/session/FinDeSession";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { surTitreSession } from "@/lib/voice";
import { ELO_COPIE, EPREUVE } from "@/lib/voice-z3";
import { AVANT_EXAMEN, INDISPONIBLE, REJOUER, REMETTRE } from "@/lib/voice-z3b";

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
  /** titre de l'examen (en-tête de la copie) */
  title?: string;
  durationMinutes: number;
  questions: ActiveQuestion[];
  review: ReviewQuestion[];
  alreadyDone: boolean;
  /** examen blanc classé : variation d'ELO une fois appliquée, sinon une note (ex. « à la clôture ») */
  elo?: { delta: number | null; note: string | null } | null;
  /** traits du jour lus par le serveur (anneau du jour sous la copie) ; null : inconnu */
  traitsJour?: number | null;
  /** aperçu (app/preview-da) : écran et réponses de départ, chrono figé ; "rendue" : la copie juste remise */
  demo?: { phase: "ready" | "active" | "rendue"; answers?: (number | null)[]; idx?: number; secondsLeft?: number; duree?: number };
};

export function MockExamRunner({ examId, title, durationMinutes, questions, review: initialReview, alreadyDone, elo = null, traitsJour = null, demo }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const jour = useTraitsDuJour(traitsJour);
  // copie remise pendant cette visite : la copie se corrige sous tes yeux et
  // l'anneau du jour avance ; à la revisite, elle est posée
  const [rendue, setRendue] = useState<{ ajoutes: number; duree: number } | null>(
    demo?.phase === "rendue" ? { ajoutes: initialReview.filter((r) => r.selected_index !== null).length, duree: demo.duree ?? 0 } : null,
  );

  type Phase = "ready" | "active" | "done";
  const [phase, setPhase] = useState<Phase>(alreadyDone || demo?.phase === "rendue" ? "done" : demo?.phase ?? "ready");
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
      const rv = (data?.review ?? []) as ReviewQuestion[];
      setReview(rv);
      // la copie remise d'un bloc : autant de traits que de questions (comme l'anneau du jour)
      const n = rv.length || questions.length;
      setRendue({ ajoutes: n, duree: duration });
      poserTrait(n);
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
        eyebrow={AVANT_EXAMEN.surTitreMock}
        title={AVANT_EXAMEN.titre}
        meta={`${questions.length} questions · ${fmtMinutes(durationMinutes)}`}
        rules={[...AVANT_EXAMEN.reglesMock]}
        onStart={start}
        startLabel={AVANT_EXAMEN.commencer}
        wide
      />
    );
  }

  // ── RÉSULTAT : la copie corrigée ──
  if (phase === "done") {
    const total = review.length;
    const score = review.filter((r) => r.is_correct).length;
    const minutes = rendue?.duree ? Math.max(1, Math.round(rendue.duree / 60)) : null;
    const eloLigne = elo ? (elo.delta !== null ? ELO_COPIE.applique(elo.delta) : elo.note) : null;

    if (total === 0) {
      return (
        <section className="card-quiet rl-in grid gap-2 px-6 py-8 text-center" aria-label="Résultat">
          <p className="t-eyebrow m-0">{EPREUVE.mock}</p>
          <p className="t-h3 m-0">{INDISPONIBLE}</p>
          {eloLigne && <p className="t-small m-0">{eloLigne}</p>}
        </section>
      );
    }

    return (
      <>
        <FinDeSession
          epreuve={surTitreSession(EPREUVE.mock, total, minutes)}
          titre={title ?? EPREUVE.mock}
          meta={eloLigne ?? undefined}
          score={score}
          total={total}
          review={review}
          jour={jour}
          ajoutes={rendue?.ajoutes ?? 0}
          anime={rendue !== null}
          ia={<CopyForAi review={review} score={score} total={total} kind="mock" size="action" onError={setError} />}
          notes={
            error ? (
              <p role="alert" className="m-0 text-sm text-pen">
                {error}
              </p>
            ) : null
          }
          liens={
            <a href="#rejouer" className="ink-link">
              {REJOUER.lien}
            </a>
          }
        >
          <TopicBreakdown review={review} />
          <ReviewSection review={review} defaultOpen={false} />
        </FinDeSession>
      </>
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
        label={EPREUVE.mock}
        index={idx}
        total={questions.length}
        answered={answered}
        secondsLeft={secondsLeft}
        lowAt={300}
        actions={
          <button type="button" className="btn btn-secondary btn-sm" disabled={submitting} onClick={askEnd}>
            {submitting ? REMETTRE.envoi : REMETTRE.court}
          </button>
        }
      />

      {confirmEnd && (
        <div role="alert" className="card-quiet rl-in flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="m-0 text-[14px]">{REMETTRE.confirmer(unanswered)}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(false)}>
              {REMETTRE.continuer}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={submitting} onClick={() => void submit()}>
              {REMETTRE.bouton}
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
                    {REMETTRE.bouton} <ArrowRight size={16} aria-hidden />
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
