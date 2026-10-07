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
  ReviewSection,
  RunnerBar,
  TopicBreakdown,
} from "@/components/session/parts";
import { SectionHead } from "@/components/session/ui";
import { fmtMinutes, pctOf, type ReviewQuestion } from "@/components/session/review";
import { FinDeSession } from "@/components/session/FinDeSession";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { surTitreSession } from "@/lib/voice";
import { AVANT_EXAMEN, REJOUER, REMETTRE } from "@/lib/voice-z3b";

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
  /** titre de l'examen (en-tête de la copie) */
  title?: string;
  durationMinutes: number;
  wrongCount: number;
  totalCount: number;
  pastAttempts: PastAttempt[];
  /** traits du jour lus par le serveur (anneau du jour sous la copie) ; null : inconnu */
  traitsJour?: number | null;
  /** aperçu (app/preview-da) : un essai rendu */
  demo?: { mode: "full" | "wrong_only"; review: ReviewQuestion[]; duree?: number };
};

export function MockExamRetake({ examId, title, durationMinutes, wrongCount, totalCount, pastAttempts: initialPast, traitsJour = null, demo }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const jour = useTraitsDuJour(traitsJour);

  type Phase = "menu" | "ready" | "active" | "done";
  const [phase, setPhase] = useState<Phase>(demo ? "done" : "menu");
  const [mode, setMode] = useState<"full" | "wrong_only">(demo?.mode ?? "full");
  const [loadingMode, setLoadingMode] = useState<"full" | "wrong_only" | null>(null);
  const [questions, setQuestions] = useState<RetakeQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [review, setReview] = useState<ReviewQuestion[]>(demo?.review ?? []);
  const [score, setScore] = useState(demo ? demo.review.filter((r) => r.is_correct).length : 0);
  const [total, setTotal] = useState(demo?.review.length ?? 0);
  const [duree, setDuree] = useState<number | null>(demo?.duree ?? null);
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
        setError(REJOUER.aucune);
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
      // le carnet de ratures : erreurs et blancs de la reprise (correction refaite côté serveur ; sans la migration : rien)
      void supabase.rpc("noter_reponses", { p_items: payload, p_source: "blanc" }).then(() => undefined);
      setReview((data?.review ?? []) as ReviewQuestion[]);
      setScore(data?.score ?? 0);
      setTotal(data?.total ?? 0);
      setDuree(duration);
      // l'essai remis d'un bloc : autant de traits que de questions (comme l'anneau du jour)
      poserTrait(Number(data?.total ?? 0) || 0);
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

  const modeLabel = REJOUER.enCours(mode);

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
        <SectionHead title={REJOUER.titre} meta={REJOUER.meta} />
        <div className="card-quiet grid grid-cols-1 gap-5 p-5 md:p-6">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {option("full", <RotateCcw size={16} aria-hidden />, REJOUER.tout, `${totalCount} questions · ${fmtMinutes(durationMinutes)}`, totalCount === 0)}
            {option(
              "wrong_only",
              <ListRestart size={16} aria-hidden />,
              REJOUER.mesRatures,
              wrongCount === 0 ? REJOUER.pagePropre : `${wrongCount} question${wrongCount > 1 ? "s" : ""} · ${fmtMinutes(Math.max(5, Math.round(durationMinutes * (wrongCount / Math.max(totalCount, 1)))))}`,
              wrongCount === 0,
            )}
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-pen">
              {error}
            </p>
          )}
          <p className="t-micro m-0">{REJOUER.scoreSeul}</p>

          {pastAttempts.length > 0 && (
            <div className="border-t border-line pt-4">
              <p className="t-eyebrow m-0 mb-1.5">{REJOUER.tesEssais}</p>
              <ul className="m-0 list-none divide-y divide-line p-0">
                {pastAttempts.map((a) => {
                  const pct = pctOf(a.score, a.total);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="t-small min-w-0 truncate">
                        <span className="font-semibold text-white">{a.mode === "full" ? REJOUER.essaiTout : REJOUER.essaiRatures}</span>
                        {" · "}
                        {new Date(a.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}
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
          eyebrow={AVANT_EXAMEN.surTitreRetake}
          title={mode === "full" ? REJOUER.tout : REJOUER.tesRatures}
          meta={`${questions.length} questions · ${fmtMinutes(Math.round(secondsLeft / 60))}`}
          rules={[...AVANT_EXAMEN.reglesRetake]}
          onCancel={backToMenu}
          cancelLabel="Retour"
          onStart={start}
        />
      </section>
    );
  }

  // ── RÉSULTAT : la copie corrigée ──
  if (phase === "done") {
    const minutes = duree ? Math.max(1, Math.round(duree / 60)) : null;

    return (
      <section ref={rootRef} id="rejouer" className="rl-page scroll-mt-24" aria-label="Résultat de l'essai">
        <FinDeSession
          epreuve={surTitreSession(REJOUER.surTitre(mode), total, minutes)}
          titre={title ?? REJOUER.titre}
          meta={REJOUER.horsClassement}
          score={score}
          total={total}
          review={review}
          jour={jour}
          ajoutes={total}
          ia={total > 0 ? <CopyForAi review={review} score={score} total={total} kind="retake" size="action" onError={setError} /> : null}
          notes={
            error ? (
              <p role="alert" className="m-0 text-sm text-pen">
                {error}
              </p>
            ) : null
          }
          liens={
            <button type="button" className="ink-link" onClick={backToMenu}>
              {REJOUER.retour}
            </button>
          }
        >
          <TopicBreakdown review={review} />
          <ReviewSection review={review} source="examen" />
        </FinDeSession>
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
            {busy ? REMETTRE.envoi : REMETTRE.court}
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
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void submit()}>
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
                  <button type="button" className="btn btn-primary rl-press" disabled={busy} onClick={askEnd}>
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
    </section>
  );
}
