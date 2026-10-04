"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/errors";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPICS, TOPIC_LABELS, trophyTier } from "@/lib/practiceTopics";
import { PageHead, SectionHead } from "@/components/session/ui";
import {
  ChoiceButton,
  CopyForAi,
  PauseCard,
  PauseToggle,
  QuestionCard,
  QuestionMap,
  QuestionNav,
  ReadyCard,
  ReviewSection,
  RunnerBar,
  Seg,
  TopicBreakdown,
} from "@/components/session/parts";
import { PASS_THRESHOLD, fmtMinutes, pctOf, subjectName, topicsSummary, type ReviewQuestion } from "@/components/session/review";
import { FinDeSession } from "@/components/session/FinDeSession";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { surTitreSession } from "@/lib/voice";
import { EPREUVE } from "@/lib/voice-z3";

// Entraînement ciblé : on choisit ses matières, on reçoit le nombre de
// questions qu'elles pèsent dans un vrai examen, chronométré, corrigé à la fin
// (correction entièrement serveur : submit_practice_session).

type ActiveQuestion = { id: string; position: number; prompt: string; choices: string[] };

type PastSession = {
  id: string;
  topics: string[];
  format: number;
  question_count: number;
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
};

type Phase = "builder" | "ready" | "active" | "done";

/** Données d'exemple pour app/preview-da (aucun appel réseau, chrono figé). */
export type PracticeDemo = {
  phase: Phase;
  selected?: string[];
  format?: 90 | 180;
  questions?: ActiveQuestion[];
  answers?: (number | null)[];
  idx?: number;
  secondsLeft?: number;
  paused?: boolean;
  review?: ReviewQuestion[];
  score?: number;
  total?: number;
  xp?: number;
  duration?: number;
  historyReviews?: Record<string, ReviewQuestion[]>;
  expandedHistoryId?: string;
  tab?: "history" | "progress";
};

const MIN_PER_QUESTION_MINUTES = 135 / 90; // même ratio que l'examen officiel (135min/90Q)
const WEAK_BELOW = 50;

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export function PracticeSession({
  pastSessions: initialPast,
  mastery = {},
  traitsJour = null,
  demo,
}: {
  pastSessions: PastSession[];
  /** maîtrise par matière (clé → %, null si pas assez de réponses) */
  mastery?: Record<string, number | null>;
  /** traits du jour lus par le serveur (anneau du jour sous la copie) ; null : inconnu */
  traitsJour?: number | null;
  demo?: PracticeDemo;
}) {
  const supabase = useMemo(() => createClient(), []);
  const traits = useTraitsDuJour(traitsJour);

  const [phase, setPhase] = useState<Phase>(demo?.phase ?? "builder");
  // Pré-sélectionne le thème passé en query param (ex: lien "S'entraîner sur
  // X" depuis le panneau Points faibles du dashboard) — sans forcer le choix,
  // l'utilisateur peut toujours l'enlever ou en ajouter d'autres.
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (demo?.selected) return new Set(demo.selected);
    const fromUrl = searchParams.get("topic");
    return fromUrl && TOPICS.some((x) => x.key === fromUrl) ? new Set([fromUrl]) : new Set();
  });
  const [format, setFormat] = useState<90 | 180>(demo?.format ?? 90);
  const [questions, setQuestions] = useState<ActiveQuestion[]>(demo?.questions ?? []);
  const [answers, setAnswers] = useState<(number | null)[]>(demo?.answers ?? (demo?.questions ?? []).map(() => null));
  const [idx, setIdx] = useState(demo?.idx ?? 0);
  const [secondsLeft, setSecondsLeft] = useState(demo?.secondsLeft ?? 0);
  const [review, setReview] = useState<ReviewQuestion[]>(demo?.review ?? []);
  const [score, setScore] = useState(demo?.score ?? 0);
  const [total, setTotal] = useState(demo?.total ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState(demo?.xp ?? 0);
  const [lastDuration, setLastDuration] = useState<number | null>(demo?.duration ?? null);
  // traits posés par la copie rendue (l'anneau du jour sous la copie)
  const [ajoutes, setAjoutes] = useState(demo?.phase === "done" ? demo?.total ?? 0 : 0);
  const [pastSessions, setPastSessions] = useState<PastSession[]>(initialPast);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(demo?.expandedHistoryId ?? null);
  const [historyReviews, setHistoryReviews] = useState<Record<string, ReviewQuestion[]>>(demo?.historyReviews ?? {});
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<"history" | "progress">(demo?.tab ?? "history");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [paused, setPaused] = useState(demo?.paused ?? false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  // Le timeout auto-submit garde une closure figée sur `answers` tel qu'il
  // était au montage du timer — sans ce ref à jour, l'auto-submit renvoyait
  // toujours le tableau initial (tout à null), écrasant les vraies réponses
  // par un score de 0.
  const answersRef = useRef<(number | null)[]>(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  // Durée réellement passée sur la session, incrémentée uniquement quand ce
  // n'est pas en pause — sert de source pour duration_seconds au lieu d'un
  // simple Date.now() - début, qui compterait aussi le temps de pause.
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (phase !== "active" || demo) return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      elapsedRef.current += 1;
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

  function toggleTopic(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const previewCount = [...selected].reduce((sum, key) => {
    const w = TOPICS.find((t) => t.key === key)?.weight ?? 0;
    return sum + Math.round((w / 100) * format);
  }, 0);
  const previewMinutes = Math.max(5, Math.round(previewCount * MIN_PER_QUESTION_MINUTES));

  async function generate() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("generate_practice_session", {
        p_topics: [...selected],
        p_format: format,
      });
      if (rpcError) throw new Error(rpcError.message);
      const qs = (data ?? []) as ActiveQuestion[];
      if (qs.length === 0) {
        setError("Aucune question disponible pour cette sélection.");
        return;
      }
      setQuestions(qs);
      setAnswers(qs.map(() => null));
      setSecondsLeft(Math.max(5, Math.round(qs.length * MIN_PER_QUESTION_MINUTES)) * 60);
      setPhase("ready");
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de la génération"));
    } finally {
      setBusy(false);
    }
  }

  function start() {
    setIdx(0);
    elapsedRef.current = 0;
    setPaused(false);
    setConfirmEnd(false);
    setPhase("active");
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    setConfirmEnd(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const duration = elapsedRef.current;
    const payload = questions.map((q, i) => ({ question_id: q.id, selected_index: answersRef.current[i] }));
    const topicsArr = [...selected];

    try {
      const { data, error: rpcError } = await supabase.rpc("submit_practice_session", {
        p_topics: topicsArr,
        p_format: format,
        p_answers: payload,
        p_duration_seconds: duration,
      });
      if (rpcError) throw new Error(rpcError.message);
      setReview((data?.review ?? []) as ReviewQuestion[]);
      setScore(data?.score ?? 0);
      setTotal(data?.total ?? 0);
      setXpAwarded(data?.xp_awarded ?? 0);
      setLastDuration(duration);
      // la copie rendue d'un bloc : autant de traits que de questions (comme l'anneau du jour)
      const n = Number(data?.total ?? 0) || 0;
      setAjoutes(n);
      poserTrait(n);
      setPastSessions((prev) => [
        { id: data?.id ?? crypto.randomUUID(), topics: topicsArr, format, question_count: data?.total ?? 0, score: data?.score ?? 0, total: data?.total ?? 0, duration_seconds: duration, completed_at: new Date().toISOString() },
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

  function backToBuilder() {
    setPhase("builder");
    setReview([]);
    setQuestions([]);
    setError(null);
    setXpAwarded(0);
  }

  async function toggleHistoryReview(sessionId: string) {
    if (expandedHistoryId === sessionId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(sessionId);
    if (historyReviews[sessionId] || historyErrors[sessionId]) return;
    setLoadingHistoryId(sessionId);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_practice_session_review", {
        p_session_id: sessionId,
      });
      if (rpcError) throw new Error(rpcError.message);
      setHistoryReviews((prev) => ({ ...prev, [sessionId]: (data ?? []) as ReviewQuestion[] }));
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      const msg = raw.toLowerCase().includes("no stored answers")
        ? "Session réalisée avant l'activation de la sauvegarde des corrections — indisponible pour celle-ci."
        : friendlyError(e, "Erreur lors du chargement de la correction.");
      setHistoryErrors((prev) => ({ ...prev, [sessionId]: msg }));
    } finally {
      setLoadingHistoryId(null);
    }
  }

  // ── COMPOSER LA SESSION ──
  if (phase === "builder") {
    const measured = TOPICS.filter((t) => mastery[t.key] !== null && mastery[t.key] !== undefined);
    const weak = measured.filter((t) => (mastery[t.key] as number) < WEAK_BELOW).map((t) => t.key);
    const tier = trophyTier(selected.size);
    const allOn = selected.size === TOPICS.length;
    const history = showAllHistory ? pastSessions : pastSessions.slice(0, 6);
    const canChart = pastSessions.length >= 2;

    return (
      <div className="rl-page">
        <PageHead
          back={{ href: "/entrainement", label: "S'entraîner" }}
          title="Entraînement ciblé"
          sub="Choisis tes matières : le nombre de questions suit leur poids à l'examen. Corrigé à la fin."
        />

        <section className="card-hero rl-in grid grid-cols-1 gap-6 p-5 md:gap-7 md:p-8" style={{ animationDelay: ".06s" }} aria-label="Composer la session">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 className="t-h2 m-0">Tes matières</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold text-muted">
              <button type="button" className="transition-colors hover:text-white" onClick={() => setSelected(allOn ? new Set() : new Set(TOPICS.map((t) => t.key)))}>
                {allOn ? "Tout retirer" : "Tout l'examen"}
              </button>
              {weak.length > 0 && (
                <button type="button" className="transition-colors hover:text-white" onClick={() => setSelected(new Set(weak))}>
                  Mes points faibles
                </button>
              )}
              {selected.size > 0 && !allOn && (
                <button type="button" className="transition-colors hover:text-white" onClick={() => setSelected(new Set())}>
                  Effacer
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TOPICS.map((t) => {
              const on = selected.has(t.key);
              const m = mastery[t.key];
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTopic(t.key)}
                  className={
                    "group flex items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-200 " +
                    (on ? "border-white bg-surface shadow-[0_0_0_1px_var(--ink)]" : "border-line-2 bg-surface hover:border-white/45")
                  }
                >
                  <span
                    aria-hidden
                    className={
                      "grid h-5 w-5 shrink-0 place-items-center rounded-[6px] transition-colors " +
                      (on ? "bg-white text-black" : "shadow-[inset_0_0_0_1.5px_var(--line-2)] group-hover:shadow-[inset_0_0_0_1.5px_var(--ink-3)]")
                    }
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold leading-tight">{subjectName(t.key)}</span>
                    <span className="t-micro mt-1 block">
                      {String(t.weight).replace(".", ",")} % de l&apos;examen
                      {m !== null && m !== undefined && (
                        <>
                          {" · "}
                          <span className={m < WEAK_BELOW ? "text-pen" : ""}>maîtrise {m} %</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rule" />

          <div className="grid grid-cols-1 items-end gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-8">
            <div>
              <p className="t-eyebrow m-0 mb-2">Base de calcul</p>
              <Seg
                label="Format"
                value={String(format) as "90" | "180"}
                onChange={(v) => setFormat(Number(v) as 90 | 180)}
                options={[
                  { key: "90", label: "Demi-examen · 90" },
                  { key: "180", label: "Complet · 180" },
                ]}
              />
            </div>
            <div className="min-w-0" aria-live="polite">
              {selected.size > 0 ? (
                <>
                  <p className="m-0 flex items-baseline gap-2">
                    <span className="t-num text-[40px]">{previewCount}</span>
                    <span className="text-[15px] font-semibold">questions</span>
                    <span className="t-small">· {fmtMinutes(previewMinutes)}</span>
                  </p>
                  <p className="t-micro m-0 mt-1.5 inline-flex items-center gap-1.5">
                    <Trophy size={13} aria-hidden /> Trophée {tier.label} à 70 % ou plus
                  </p>
                </>
              ) : (
                <p className="t-small m-0">Choisis au moins une matière.</p>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-lg rl-press w-full md:w-auto" disabled={selected.size === 0 || busy} onClick={generate}>
              {busy ? "Préparation…" : "Générer la session"} {!busy && <ArrowRight size={17} aria-hidden />}
            </button>
          </div>
          {error && (
            <p role="alert" className="m-0 -mt-2 text-sm text-pen">
              {error}
            </p>
          )}
        </section>

        {pastSessions.length > 0 && (
          <section className="rl-section" aria-label="Tes sessions">
            <SectionHead
              title="Tes sessions"
              action={
                canChart ? (
                  <Seg
                    label="Affichage"
                    value={historyTab}
                    onChange={setHistoryTab}
                    options={[
                      { key: "history", label: "Historique" },
                      { key: "progress", label: "Progression" },
                    ]}
                  />
                ) : undefined
              }
              meta={`${pastSessions.length} session${pastSessions.length > 1 ? "s" : ""}`}
            />

            {historyTab === "progress" && canChart ? (
              <PracticeProgressChart pastSessions={pastSessions} topicLabels={TOPIC_LABELS} />
            ) : (
              <div className="card overflow-hidden">
                <ul className="m-0 list-none divide-y divide-line p-0">
                  {history.map((s) => {
                    const pct = pctOf(s.score, s.total);
                    const passed = pct >= PASS_THRESHOLD;
                    const tierS = trophyTier(s.topics.length);
                    const expanded = expandedHistoryId === s.id;
                    const rev = historyReviews[s.id];
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => void toggleHistoryReview(s.id)}
                          className="rl-row flex w-full items-center gap-3.5 px-4 py-3.5 text-left md:px-5"
                        >
                          <span
                            className={"grid h-9 w-9 shrink-0 place-items-center rounded-[11px] " + (passed ? "bg-white text-black" : "bg-surface-2 text-muted")}
                            title={passed ? `Trophée ${tierS.label}` : "Sous 70 %"}
                          >
                            <Trophy size={16} aria-hidden strokeWidth={passed ? 2.2 : 1.6} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14.5px] font-semibold">{topicsSummary(s.topics, 2)}</span>
                            <span className="t-micro mt-0.5 block">
                              {dayLabel(s.completed_at)} · {s.total} questions
                              {s.duration_seconds ? ` · ${fmtMinutes(Math.max(1, Math.round(s.duration_seconds / 60)))}` : ""}
                              {passed ? ` · trophée ${tierS.label}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className={"block text-[15px] font-semibold tabular-nums " + (pct < 50 ? "text-pen" : "")}>{pct} %</span>
                            <span className="t-micro block tabular-nums">
                              {s.score}/{s.total}
                            </span>
                          </span>
                          <ChevronDown size={16} aria-hidden className={"shrink-0 text-muted transition-transform " + (expanded ? "rotate-180" : "")} />
                        </button>
                        {expanded && (
                          <div className="border-t border-line bg-surface-2/30 px-4 py-4 md:px-5">
                            {loadingHistoryId === s.id && <p className="t-small m-0">Chargement de la correction…</p>}
                            {historyErrors[s.id] && <p className="t-small m-0">{historyErrors[s.id]}</p>}
                            {rev && (
                              <ReviewSection
                                review={rev}
                                compact
                                action={<CopyForAi review={rev} score={s.score} total={s.total} kind="practice" size="sm" onError={setError} />}
                              />
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {pastSessions.length > history.length && (
                  <div className="border-t border-line px-4 py-3 md:px-5">
                    <button type="button" className="text-[13px] font-semibold text-muted transition-colors hover:text-white" onClick={() => setShowAllHistory(true)}>
                      {pastSessions.length - history.length > 1 ? `Voir les ${pastSessions.length - history.length} autres` : "Voir la dernière"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  const topicNames = topicsSummary([...selected], 3);
  const topicShort = topicsSummary([...selected], 1);

  // ── PRÊTE ──
  if (phase === "ready") {
    return (
      <div className="grid gap-6 py-2 md:py-8">
        <ReadyCard
          eyebrow="Entraînement ciblé · session prête"
          title={`${questions.length} questions`}
          meta={`${fmtMinutes(Math.round(secondsLeft / 60))} · ${topicNames}`}
          rules={[
            "Pas de correction pendant la session : tout arrive à la fin, avec les explications.",
            "Tu peux revenir sur une question et changer ta réponse jusqu'à la fin.",
            "Pause possible : le chrono s'arrête et la question se cache.",
          ]}
          onCancel={backToBuilder}
          cancelLabel="Changer les matières"
          onStart={start}
        />
      </div>
    );
  }

  // ── RÉSULTAT : la copie corrigée ──
  if (phase === "done") {
    const pct = total > 0 ? Math.round((score / total) * 100) : null;
    const passed = pct !== null && pct >= PASS_THRESHOLD;
    const tier = trophyTier(selected.size);
    const many = new Set(review.map((q) => q.topic ?? "")).size > 1;
    const minutes = lastDuration ? Math.max(1, Math.round(lastDuration / 60)) : null;
    const meta = [passed ? `trophée ${tier.label}` : null, xpAwarded > 0 ? `+${xpAwarded} XP` : null].filter(Boolean).join(" · ");

    return (
      <div className="rl-page">
        <FinDeSession
          epreuve={surTitreSession(EPREUVE.practice, total, minutes)}
          titre={topicsSummary([...selected], 2) || EPREUVE.practice}
          meta={meta || undefined}
          score={score}
          total={total}
          review={review}
          jour={traits}
          ajoutes={ajoutes}
          ia={total > 0 ? <CopyForAi review={review} score={score} total={total} kind="practice" size="action" onError={setError} /> : null}
          liens={
            <>
              <button type="button" className="ink-link" onClick={backToBuilder}>
                Nouvelle session
              </button>
              <Link href="/entrainement" className="text-[13.5px] font-semibold text-muted transition-colors hover:text-white">
                Retour à S&apos;entraîner
              </Link>
            </>
          }
          notes={
            error ? (
              <p role="alert" className="m-0 text-sm text-pen">
                {error}
              </p>
            ) : null
          }
        >
          {many && <TopicBreakdown review={review} />}
          <ReviewSection review={review} />
        </FinDeSession>
      </div>
    );
  }

  // ── EN COURS ──
  const answered = answers.filter((a) => a !== null).length;
  const current = questions[idx];
  const last = idx === questions.length - 1;
  const unanswered = questions.length - answered;

  function askEnd() {
    if (unanswered > 0) setConfirmEnd(true);
    else void submit();
  }

  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-5 md:gap-6">
      <RunnerBar
        label="Entraînement ciblé"
        index={idx}
        total={questions.length}
        answered={answered}
        secondsLeft={secondsLeft}
        paused={paused}
        actions={
          <>
            <PauseToggle paused={paused} onToggle={() => setPaused((v) => !v)} />
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={askEnd}>
              {busy ? "Envoi…" : "Terminer"}
            </button>
          </>
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
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void submit()}>
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

      {paused ? (
        <PauseCard onResume={() => setPaused(false)} />
      ) : (
        current && (
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
        )
      )}

      {!paused && (
        <QuestionMap total={questions.length} current={idx} isAnswered={(i) => answers[i] !== null && answers[i] !== undefined} onJump={setIdx} />
      )}
    </div>
  );
}
