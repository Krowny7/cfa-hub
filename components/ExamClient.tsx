"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import type { QuizQuestion } from "@/lib/types";
import { PageHead } from "@/components/session/ui";
import {
  ChoiceButton,
  CopyForAi,
  QuestionCard,
  QuestionMap,
  QuestionNav,
  ReviewSection,
  RunnerBar,
  Seg,
  TopicBreakdown,
} from "@/components/session/parts";
import { cleanTopic, fmtMinutes, type ReviewQuestion } from "@/components/session/review";
import { FinDeSession } from "@/components/session/FinDeSession";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { surTitreSession } from "@/lib/voice";
import { EPREUVE, EXAMEN } from "@/lib/voice-z3";
import { MODE_EXAMEN, REMETTRE } from "@/lib/voice-z3b";

// Mode examen : des questions tirées des QCM choisis, mélangées et
// chronométrées, sans correction avant la fin. La copie rendue devient une
// copie corrigée (FinDeSession) et s'enregistre dans quiz_attempts, une ligne
// par QCM source : score = justes, total = répondues, durée au prorata, et
// les réponses données (answers). C'est le format que lit lib/answer-stats
// (score par passage, rangé par set) : ces examens comptent dans les stats.

export type ExamSetOption = { id: string; title: string; isOfficial: boolean };

type ExamPhase = "setup" | "loading" | "active" | "done";

type ExamAnswer = {
  question: QuizQuestion;
  selected: number | null;
};

/** Données d'exemple pour app/preview-da (aucun appel réseau, chrono figé). */
export type ExamDemo = {
  phase: ExamPhase;
  configIdx?: number;
  questions?: QuizQuestion[];
  selected?: (number | null)[];
  idx?: number;
  secondsLeft?: number;
};

const EXAM_CONFIGS = [
  { n: 30, label: "30 questions", minutes: 45 },
  { n: 60, label: "60 questions", minutes: 90 },
  { n: 90, label: "90 questions (format CFA)", minutes: 165 },
];

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Les matières des QCM joués : « Fixed Income, Equity + 2 ». */
function sourcesCourtes(titres: string[], max = 3) {
  const t = [...new Set(titres.map((x) => cleanTopic(x).split(" — ")[0].trim()).filter(Boolean))];
  return t.length <= max ? t.join(", ") : `${t.slice(0, max - 1).join(", ")} + ${t.length - max + 1}`;
}

export function ExamClient({
  sets,
  traitsJour = null,
  demo,
}: {
  sets: ExamSetOption[];
  /** traits du jour lus par le serveur (anneau du jour sous la copie) ; null : inconnu */
  traitsJour?: number | null;
  demo?: ExamDemo;
}) {
  const supabase = useMemo(() => createClient(), []);
  const jour = useTraitsDuJour(traitsJour);

  const defaultSelected = useMemo(() => {
    const official = sets.filter(s => s.isOfficial).map(s => s.id);
    return official.length > 0 ? official : sets.slice(0, 2).map(s => s.id);
  }, [sets]);

  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(defaultSelected);
  const [configIdx, setConfigIdx] = useState(demo?.configIdx ?? 0);
  const [phase, setPhase] = useState<ExamPhase>(demo?.phase ?? "setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>(demo?.questions ?? []);
  const [answers, setAnswers] = useState<ExamAnswer[]>(() =>
    (demo?.questions ?? []).map((q, i) => ({ question: q, selected: demo?.selected?.[i] ?? null })),
  );
  const [idx, setIdx] = useState(demo?.idx ?? 0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(demo?.selected?.[demo?.idx ?? 0] ?? null);
  const [secondsLeft, setSecondsLeft] = useState(demo?.secondsLeft ?? 0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  // une seule écriture par copie (fin du chrono ou bouton « Terminer »)
  const savedRef = useRef(false);
  const [dureeS, setDureeS] = useState<number | null>(null);
  // traits posés par la copie rendue (posés avec elle, pour que l'anneau du jour et la copie restent d'accord)
  const [ajoutes, setAjoutes] = useState(() => (demo?.phase === "done" ? (demo.selected ?? []).filter((x) => x !== null && x !== undefined).length : 0));

  const config = EXAM_CONFIGS[configIdx]!;

  useEffect(() => {
    if (phase !== "active" || demo) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, demo]);

  // Chaque changement d'écran repart du haut de la page.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  async function startExam() {
    if (selectedSetIds.length === 0) return;
    setPhase("loading");
    setError(null);
    const { data, error: qErr } = await supabase
      .from("quiz_questions")
      .select("id,set_id,prompt,choices,correct_index,explanation,position")
      .in("set_id", selectedSetIds);

    const qs = shuffleArr(
      (data ?? []).map(q => ({
        ...q,
        choices: Array.isArray(q.choices) ? (q.choices as string[]) : [],
      })) as QuizQuestion[]
    ).slice(0, config.n);
    if (qErr || qs.length === 0) {
      // rien à jouer : retour au choix des sources, avec un mot
      setError(MODE_EXAMEN.vide);
      setPhase("setup");
      return;
    }

    setQuestions(qs);
    setAnswers(qs.map(q => ({ question: q, selected: null })));
    setIdx(0);
    setSelectedChoice(null);
    setSecondsLeft(config.minutes * 60);
    setConfirmEnd(false);
    setSaveError(null);
    setError(null);
    savedRef.current = false;
    setAjoutes(0);
    startedAtRef.current = Date.now();
    setPhase("active");
  }

  // La copie rendue : un trait par question répondue, et le résultat dans
  // quiz_attempts, au format des QCM joués en entier (lu par lib/answer-stats) :
  // une ligne par QCM source, score = justes, total = répondues (une question
  // laissée sans réponse ne compte pas), plus les réponses données.
  useEffect(() => {
    if (phase !== "done" || demo || savedRef.current) return;
    savedRef.current = true;
    const duration = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : null;
    setDureeS(duration);
    const answeredAll = answers.filter((a) => a.selected !== null);
    if (answeredAll.length === 0) return;
    setAjoutes(answeredAll.length);
    poserTrait(answeredAll.length);

    const bySet = new Map<string, ExamAnswer[]>();
    for (const a of answers) {
      const list = bySet.get(a.question.set_id) ?? [];
      list.push(a);
      bySet.set(a.question.set_id, list);
    }
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const userId = auth.user.id;
        const rows = [...bySet.entries()]
          .map(([setId, list]) => {
            const answered = list.filter((a) => a.selected !== null);
            return {
              user_id: userId,
              set_id: setId,
              score: answered.filter((a) => a.selected === a.question.correct_index).length,
              total: answered.length,
              // la durée de l'examen, au prorata des questions répondues
              duration_seconds: duration !== null ? Math.round((duration * answered.length) / answeredAll.length) : null,
              answers: list.map((a) => ({ question_id: a.question.id, selected_index: a.selected })),
            };
          })
          .filter((r) => r.total > 0);
        const { error: insErr } = await supabase.from("quiz_attempts").insert(rows);
        if (insErr) throw insErr;
      } catch (e) {
        console.error("exam quiz_attempts insert failed:", e);
        setSaveError(EXAMEN.nonEnregistree);
      }
    })();
  }, [phase, demo, answers, supabase]);

  function selectChoice(choice: number) {
    setSelectedChoice(choice);
    setAnswers(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, selected: choice };
      return next;
    });
  }

  function goTo(i: number) {
    setIdx(i);
    setSelectedChoice(answers[i]?.selected ?? null);
  }

  function finish() {
    if (timerRef.current) clearInterval(timerRef.current);
    setConfirmEnd(false);
    setPhase("done");
  }

  function goNext() {
    const isLast = idx >= questions.length - 1;
    if (isLast) askEnd();
    else goTo(idx + 1);
  }

  function goPrev() {
    if (idx > 0) goTo(idx - 1);
  }

  function askEnd() {
    const open = answers.filter(a => a.selected === null).length;
    if (open > 0) setConfirmEnd(true);
    else finish();
  }

  function toggleSet(id: string) {
    setSelectedSetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // ── PRÉPARER ───────────────────────────────────────────────────────────────

  if (phase === "setup") {
    const allOn = sets.length > 0 && selectedSetIds.length === sets.length;
    const officialIds = sets.filter(s => s.isOfficial).map(s => s.id);
    return (
      <div className="rl-page">
        <PageHead back={{ href: "/entrainement", label: "S'entraîner" }} title={MODE_EXAMEN.titre} sub={MODE_EXAMEN.sous} />

        <section className="card-hero rl-in grid grid-cols-1 gap-7 p-5 md:p-8" style={{ animationDelay: ".06s" }} aria-label="Préparer l'examen">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="t-h2 m-0">{MODE_EXAMEN.sources}</h2>
              {sets.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold text-muted">
                  <span className="t-micro tabular-nums">
                    {selectedSetIds.length}/{sets.length}
                  </span>
                  {officialIds.length > 0 && (
                    <button type="button" className="transition-colors hover:text-white" onClick={() => setSelectedSetIds(officialIds)}>
                      {MODE_EXAMEN.systeme}
                    </button>
                  )}
                  <button type="button" className="transition-colors hover:text-white" onClick={() => setSelectedSetIds(allOn ? [] : sets.map(s => s.id))}>
                    {allOn ? MODE_EXAMEN.aucune : MODE_EXAMEN.toutes}
                  </button>
                </div>
              )}
            </div>
            {sets.length === 0 ? (
              <p className="t-small m-0">
                {MODE_EXAMEN.aucunQcm}{" "}
                <Link href="/qcm" className="ink-link">
                  {MODE_EXAMEN.creerQcm}
                </Link>
              </p>
            ) : (
              <ul className="m-0 max-h-[340px] list-none divide-y divide-line overflow-auto rounded-[14px] p-0 shadow-[inset_0_0_0_1px_var(--line-2)]">
                {sets.map(s => {
                  const on = selectedSetIds.includes(s.id);
                  return (
                    <li key={s.id}>
                      <label className="rl-row flex cursor-pointer items-center gap-3 px-4 py-3">
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleSet(s.id)} />
                        <span
                          aria-hidden
                          className={
                            "grid h-5 w-5 shrink-0 place-items-center rounded-[6px] transition-colors " +
                            (on ? "bg-white text-black" : "shadow-[inset_0_0_0_1.5px_var(--line-2)]")
                          }
                        >
                          {on && <Check size={13} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{s.title}</span>
                        {s.isOfficial && (
                          <span className="chip chip-quiet chip-sm shrink-0">
                            <Star size={11} aria-hidden /> Système
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 items-end gap-5 border-t border-line pt-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-8">
            <div>
              <p className="t-eyebrow m-0 mb-2">{MODE_EXAMEN.format}</p>
              <Seg
                label={MODE_EXAMEN.format}
                value={String(configIdx)}
                onChange={(v) => setConfigIdx(Number(v))}
                options={EXAM_CONFIGS.map((c, i) => ({ key: String(i), label: `${c.n} Q` }))}
              />
            </div>
            <div className="min-w-0">
              <p className="m-0 flex items-baseline gap-2">
                <span className="t-num text-[40px]">{config.n}</span>
                <span className="text-[15px] font-semibold">questions</span>
                <span className="t-small">· {fmtMinutes(config.minutes)}</span>
              </p>
              <p className="t-micro m-0 mt-1.5">{configIdx === 2 ? `${MODE_EXAMEN.formatCfa} ` : ""}{MODE_EXAMEN.pasDeCorrection}</p>
            </div>
            <button type="button" className="btn btn-primary btn-lg rl-press w-full md:w-auto" disabled={selectedSetIds.length === 0} onClick={() => void startExam()}>
              {MODE_EXAMEN.demarrer} <ArrowRight size={17} aria-hidden />
            </button>
          </div>
          {error && (
            <p role="alert" className="m-0 -mt-3 text-sm text-pen">
              {error}
            </p>
          )}
        </section>
      </div>
    );
  }

  // ── CHARGEMENT ─────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="mx-auto grid w-full max-w-[820px] gap-5">
        <div className="rl-skel h-[84px]" />
        <div className="rl-skel h-[360px]" />
        <p className="t-small m-0 text-center">{MODE_EXAMEN.preparation}</p>
      </div>
    );
  }

  // ── RÉSULTAT : la copie corrigée ──

  if (phase === "done") {
    const titleOf = new Map(sets.map(s => [s.id, s.title]));
    const review: ReviewQuestion[] = answers.map(a => ({
      question_id: a.question.id,
      prompt: a.question.prompt,
      choices: a.question.choices,
      correct_index: a.question.correct_index ?? -1,
      explanation: a.question.explanation ?? null,
      topic: titleOf.get(a.question.set_id) ?? null,
      selected_index: a.selected,
      is_correct: a.selected !== null && a.selected === a.question.correct_index,
    }));
    const answered = answers.filter(a => a.selected !== null).length;
    const correct = review.filter(r => r.is_correct).length;
    const total = questions.length;
    const many = new Set(review.map(r => r.topic ?? "")).size > 1;
    const sources = [...new Set(answers.map(a => titleOf.get(a.question.set_id)).filter((x): x is string => !!x))];
    const minutes = dureeS ? Math.max(1, Math.round(dureeS / 60)) : null;
    const notes = [saveError, error].filter(Boolean);

    return (
      <div className="rl-page">
        <FinDeSession
          epreuve={surTitreSession(EPREUVE.exam, total, minutes)}
          titre={sourcesCourtes(sources) || EPREUVE.exam}
          meta={EXAMEN.sansReponse(total - answered) ?? undefined}
          score={correct}
          total={total}
          review={review}
          jour={jour}
          ajoutes={ajoutes}
          ia={total > 0 ? <CopyForAi review={review} score={correct} total={total} kind="exam" size="action" onError={setError} /> : null}
          notes={
            notes.length ? (
              <p role="alert" className="m-0 text-sm text-pen">
                {notes.join(" ")}
              </p>
            ) : null
          }
          liens={
            <>
              <button type="button" className="ink-link" onClick={() => setPhase("setup")}>
                {MODE_EXAMEN.nouvel}
              </button>
              <Link href="/entrainement" className="text-[13.5px] font-semibold text-muted transition-colors hover:text-white">
                {MODE_EXAMEN.retour}
              </Link>
            </>
          }
        >
          {many && <TopicBreakdown review={review} title={MODE_EXAMEN.parSource} />}
          <ReviewSection review={review} />
        </FinDeSession>
      </div>
    );
  }

  // ── EN COURS ────────────────────────────────────────────────────────────────

  const currentQ = questions[idx];
  if (!currentQ) return null;

  const isLast = idx >= questions.length - 1;
  const answeredCount = answers.filter(a => a.selected !== null).length;
  const unanswered = questions.length - answeredCount;

  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-5 md:gap-6">
      <RunnerBar
        label={EPREUVE.exam}
        index={idx}
        total={questions.length}
        answered={answeredCount}
        secondsLeft={secondsLeft}
        lowAt={300}
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={askEnd}>
            {REMETTRE.court}
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={finish}>
              {REMETTRE.bouton}
            </button>
          </div>
        </div>
      )}

      <QuestionCard
        index={idx}
        total={questions.length}
        prompt={currentQ.prompt}
        footer={
          <QuestionNav
            onPrev={goPrev}
            prevDisabled={idx === 0}
            next={
              <button type="button" className="btn btn-primary rl-press" onClick={goNext}>
                {isLast ? REMETTRE.bouton : "Suivante"} <ArrowRight size={16} aria-hidden />
              </button>
            }
          />
        }
      >
        {currentQ.choices.map((choice, ci) => (
          <ChoiceButton key={ci} index={ci} text={choice} state={selectedChoice === ci ? "picked" : "idle"} onClick={() => selectChoice(ci)} />
        ))}
      </QuestionCard>

      <QuestionMap total={questions.length} current={idx} isAnswered={(i) => answers[i]?.selected !== null && answers[i]?.selected !== undefined} onJump={goTo} />
    </div>
  );
}
