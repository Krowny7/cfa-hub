"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Layers, ListChecks, Repeat, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { saveAnswerResult } from "@/lib/session-stats";
import { type CardSRS, loadSRS, saveSRS, applyReview, sortBySRS, getSRSCounts } from "@/lib/srs";
import type { QuizQuestion, Flashcard, AwardXpResult } from "@/lib/types";
import { RichText } from "@/components/RichText";
import { PageHead } from "@/components/session/ui";
import {
  ChoiceButton,
  CopyForAi,
  Explanation,
  PauseCard,
  PauseToggle,
  QuestionCard,
  ReviewSection,
  RunnerBar,
  Seg,
} from "@/components/session/parts";
import { cleanTopic, type ReviewQuestion } from "@/components/session/review";
import { FinDeSession } from "@/components/session/FinDeSession";
import { FinDePasse } from "@/components/session/FinDePasse";
import { useTraitsDuJour } from "@/components/session/useTraitsDuJour";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { Icone } from "@/components/adn/icons";
import { Batons } from "@/components/adn/Batons";
import { joursEncre, surTitreSession, type EtatJour } from "@/lib/voice";
import { COPIE_BLANCHE, EPREUVE, REPONSE, serieSession } from "@/lib/voice-z3";

// Session du jour : 15 minutes, QCM mélangés (corrigés à chaque question) ou
// flashcards ordonnées par la répétition espacée.

export type SetOption = { id: string; title: string; isOfficial: boolean };

type Mode = "qcm" | "flashcards";
type Phase = "setup" | "active" | "done";

/** Données d'exemple pour app/preview-da (aucun appel réseau, chrono figé). */
export type SessionDemo = {
  phase: Phase;
  mode: Mode;
  questions?: QuizQuestion[];
  cards?: Flashcard[];
  selectedChoice?: number | null;
  showCorr?: boolean;
  lastXpGain?: number | null;
  totalAnswered?: number;
  totalCorrect?: number;
  xpEarned?: number;
  flipped?: boolean;
  totalReviewed?: number;
  totalAgain?: number;
  secondsLeft?: number;
  paused?: boolean;
  log?: ReviewQuestion[];
  /** durée de la session (s), pour le sur-titre de la copie */
  duree?: number;
};

const SESSION_SECONDS = 15 * 60;

// ── Mémoire du dernier choix (mode + set) ───────────────────────────────────
// Évite de repartir de zéro (mode="qcm" + premier set) à chaque ouverture de
// /session — friction identifiée comme le principal frein à l'usage quotidien.
const LAST_SESSION_KEY = "cfahub:lastSession";

function loadLastSession(): { mode: Mode; setId: string } | null {
  try {
    const raw = localStorage.getItem(LAST_SESSION_KEY);
    return raw ? (JSON.parse(raw) as { mode: Mode; setId: string }) : null;
  } catch {
    return null;
  }
}

function saveLastSession(mode: Mode, setId: string) {
  try {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ mode, setId }));
  } catch {}
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SessionClient({
  qcmSets,
  flashSets,
  streak = 0,
  etatJour = "attente",
  traitsJour = null,
  demo,
}: {
  qcmSets: SetOption[];
  flashSets: SetOption[];
  /** jours d'encre (même calcul que l'accueil) */
  streak?: number;
  /** le trait du jour : fait, en attente, ou encre sèche (le soir, rien encore) */
  etatJour?: EtatJour;
  /** traits du jour lus par le serveur (anneau du jour sous la copie) ; null : inconnu */
  traitsJour?: number | null;
  demo?: SessionDemo;
}) {
  const supabase = useMemo(() => createClient(), []);
  const traits = useTraitsDuJour(traitsJour);

  const [phase, setPhase] = useState<Phase>(demo?.phase ?? "setup");
  const [mode, setMode] = useState<Mode>(demo?.mode ?? "qcm");
  const [selSetId, setSelSetId] = useState(() => (demo?.mode === "flashcards" ? flashSets[0]?.id : qcmSets[0]?.id) ?? "");

  const [questions, setQuestions] = useState<QuizQuestion[]>(demo?.questions ?? []);
  const [cards, setCards] = useState<Flashcard[]>(demo?.cards ?? []);
  const [loadingContent, setLoadingContent] = useState(false);

  // SRS state for current flash set
  const [srsState, setSrsState] = useState<Record<string, CardSRS>>({});

  // Active queues
  const [qQueue, setQQueue] = useState<QuizQuestion[]>(demo?.questions ?? []);
  const [fQueue, setFQueue] = useState<Flashcard[]>(demo?.cards ?? []);
  // Repeat pile: "reviewAgain" cards re-queued for this session
  const [fRepeat, setFRepeat] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);

  const [secondsLeft, setSecondsLeft] = useState(demo?.secondsLeft ?? SESSION_SECONDS);
  const [isPaused, setIsPaused] = useState(demo?.paused ?? false);

  // QCM state
  const [selectedChoice, setSelectedChoice] = useState<number | null>(demo?.selectedChoice ?? null);
  const [showCorr, setShowCorr] = useState(demo?.showCorr ?? false);
  const [totalAnswered, setTotalAnswered] = useState(demo?.totalAnswered ?? 0);
  const [totalCorrect, setTotalCorrect] = useState(demo?.totalCorrect ?? 0);
  const [xpEarned, setXpEarned] = useState(demo?.xpEarned ?? 0);
  const [lastXpGain, setLastXpGain] = useState<number | null>(demo?.lastXpGain ?? null);
  // Questions répondues pendant la session : correction et « Copier pour l'IA » à la fin
  const [log, setLog] = useState<ReviewQuestion[]>(demo?.log ?? []);

  // Flashcard state
  const [flipped, setFlipped] = useState(demo?.flipped ?? false);
  const [totalReviewed, setTotalReviewed] = useState(demo?.totalReviewed ?? 0);
  const [totalAgain, setTotalAgain] = useState(demo?.totalAgain ?? 0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  // durée réelle de la session, figée à la fin (sur-titre de la copie)
  const [dureeS, setDureeS] = useState<number | null>(demo?.duree ?? null);
  // un trait tracé ici aujourd'hui : la ligne de série le dit au retour à « Préparer »
  const [traceIci, setTraceIci] = useState(false);
  const jourIci: EtatJour = traceIci ? "fait" : etatJour;
  const serieIci = traceIci && etatJour !== "fait" ? streak + 1 : streak;

  const activeSets = mode === "qcm" ? qcmSets : flashSets;
  const isOfficial = qcmSets.find((s) => s.id === selSetId)?.isOfficial ?? false;
  const setTitle = activeSets.find((s) => s.id === selSetId)?.title ?? "";

  // Persist session stats to Supabase when session ends
  const savePracticeSession = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const setTitle = activeSets.find((s) => s.id === selSetId)?.title ?? "";
      const correct = mode === "qcm" ? totalCorrect : totalReviewed;
      const total = mode === "qcm" ? totalAnswered : totalReviewed + totalAgain;
      if (total === 0) return;
      const duration = sessionStartRef.current
        ? Math.round((Date.now() - sessionStartRef.current) / 1000)
        : null;
      await supabase.from("practice_sessions").insert({
        user_id: authData.user.id,
        set_id: selSetId,
        set_title: setTitle,
        mode,
        correct,
        total,
        duration_seconds: duration,
      });
    } catch {
      // Non-critical: don't block UI
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selSetId, mode, totalCorrect, totalAnswered, totalReviewed, totalAgain]);

  useEffect(() => {
    if (phase === "done" && !demo) {
      void savePracticeSession();
    }
  }, [phase, savePracticeSession, demo]);

  // Restaure le dernier mode utilisé au montage (une seule fois) — évite de
  // repartir sur "qcm" par défaut si l'utilisateur révise habituellement en
  // flashcards.
  useEffect(() => {
    if (demo) return;
    const last = loadLastSession();
    if (last) setMode(last.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sélectionne le dernier set utilisé pour ce mode s'il est toujours
  // disponible, sinon le premier de la liste.
  useEffect(() => {
    if (demo) return;
    const list = mode === "qcm" ? qcmSets : flashSets;
    const last = loadLastSession();
    const remembered = last && last.mode === mode ? last.setId : null;
    const nextId = remembered && list.some((s) => s.id === remembered) ? remembered : (list[0]?.id ?? "");
    setSelSetId(nextId);
  }, [mode, qcmSets, flashSets, demo]);

  // Mémorise le choix courant pour la prochaine ouverture de /session.
  useEffect(() => {
    if (phase === "setup" && selSetId && !demo) saveLastSession(mode, selSetId);
  }, [mode, selSetId, phase, demo]);

  // Fetch content + load SRS state
  useEffect(() => {
    if (!selSetId || phase !== "setup" || demo) return;
    setLoadingContent(true);

    const load = async () => {
      if (mode === "qcm") {
        const { data } = await supabase
          .from("quiz_questions")
          .select("id,set_id,prompt,choices,correct_index,explanation,position")
          .eq("set_id", selSetId)
          .order("position");
        const qs = (data ?? []).map((q) => ({
          ...q,
          choices: Array.isArray(q.choices) ? (q.choices as string[]) : [],
        })) as QuizQuestion[];
        setQuestions(qs);
      } else {
        const { data } = await supabase
          .from("flashcards")
          .select("id,set_id,front,back,position")
          .eq("set_id", selSetId)
          .order("position");
        const fetchedCards = (data ?? []) as Flashcard[];
        setCards(fetchedCards);
        setSrsState(loadSRS(selSetId));
      }
      setLoadingContent(false);
    };

    load().catch(() => setLoadingContent(false));
  }, [selSetId, mode, phase, supabase, demo]);

  // Timer
  useEffect(() => {
    if (phase !== "active" || isPaused || demo) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finir();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, isPaused, demo]);

  // Chaque changement d'écran repart du haut de la page.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase]);

  function startSession() {
    const shuffledQ = shuffleArr(questions);
    // SRS-ordered flashcards: due first, then new, then upcoming
    const orderedF = mode === "flashcards" ? sortBySRS(cards, srsState) : shuffleArr(cards);
    setQQueue(shuffledQ);
    setFQueue(orderedF);
    setFRepeat([]);
    setIdx(0);
    setSecondsLeft(SESSION_SECONDS);
    setIsPaused(false);
    setSelectedChoice(null);
    setShowCorr(false);
    setTotalAnswered(0);
    setTotalCorrect(0);
    setXpEarned(0);
    setLog([]);
    setFlipped(false);
    setTotalReviewed(0);
    setTotalAgain(0);
    sessionStartRef.current = Date.now();
    setPhase("active");
  }

  // La fin : la durée réelle est figée dans le même rendu que la copie.
  function finir() {
    setDureeS(sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : null);
    setPhase("done");
  }

  function endSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    finir();
  }

  async function validateChoice() {
    if (selectedChoice === null) return;
    const currentQ = qQueue[idx % Math.max(qQueue.length, 1)];
    if (!currentQ) return;

    const isCorrect = selectedChoice === currentQ.correct_index;
    if (isCorrect) setTotalCorrect((c) => c + 1);
    setTotalAnswered((a) => a + 1);
    setShowCorr(true);
    setLog((prev) => [
      ...prev,
      {
        question_id: currentQ.id,
        prompt: currentQ.prompt,
        choices: currentQ.choices,
        correct_index: currentQ.correct_index ?? -1,
        explanation: currentQ.explanation ?? null,
        topic: setTitle || null,
        selected_index: selectedChoice,
        is_correct: isCorrect,
      },
    ]);

    saveAnswerResult(selSetId, setTitle, "qcm", isCorrect ? 1 : 0, 1);
    // une réponse corrigée = un trait (le logo vivant avance)
    if (!demo) poserTrait(1);
    setTraceIci(true);

    if (isOfficial) {
      try {
        // La RPC vérifie elle-même la bonne réponse côté serveur (p_selected_index) —
        // ne jamais se fier au seul isCorrect calculé ici pour décider de l'XP.
        const { data } = await supabase.rpc("award_quiz_question_xp", {
          p_set_id: selSetId,
          p_question_id: currentQ.id,
          p_selected_index: selectedChoice,
        });
        const result = data as AwardXpResult | null;
        if (result && result.xp_awarded > 0) {
          setXpEarned((x) => x + result.xp_awarded);
          setLastXpGain(result.xp_awarded);
        }
      } catch {}
    }
  }

  function nextQCM() {
    const newIdx = idx + 1;
    if (newIdx >= qQueue.length) {
      setQQueue(shuffleArr(questions));
      setIdx(0);
    } else {
      setIdx(newIdx);
    }
    setSelectedChoice(null);
    setShowCorr(false);
    setLastXpGain(null);
  }

  function markFlashcard(gotIt: boolean) {
    const current = fQueue[idx] ?? fRepeat[idx - fQueue.length];
    if (!current) return;

    // Update SRS state and persist to localStorage
    const newState = applyReview(srsState, current.id, gotIt);
    setSrsState(newState);
    saveSRS(selSetId, newState);

    if (gotIt) {
      setTotalReviewed((r) => r + 1);
    } else {
      // Re-queue card for later in this session
      setTotalAgain((a) => a + 1);
      setFRepeat((prev) => [...prev, current]);
    }

    saveAnswerResult(selSetId, setTitle, "flashcards", gotIt ? 1 : 0, 1);

    const nextIdx = idx + 1;
    const totalAvailable = fQueue.length + fRepeat.length + (gotIt ? 0 : 1);
    if (nextIdx >= totalAvailable) {
      // Exhausted — if there are repeat cards, loop them
      if (fRepeat.length > 0 || !gotIt) {
        setFQueue([]);
        setFRepeat((prev) => {
          const pile = gotIt ? prev : [...prev, current];
          // Keep cycling repeat pile until session ends
          return pile;
        });
        setIdx(0);
      } else {
        // All cards reviewed — reshuffle full set
        setFQueue(shuffleArr(cards));
        setFRepeat([]);
        setIdx(0);
      }
    } else {
      setIdx(nextIdx);
    }

    setFlipped(false);
  }

  // ── PRÉPARER ─────────────────────────────────────────────────────────────

  if (phase === "setup") {
    const contentCount = mode === "qcm" ? questions.length : cards.length;
    const canStart = selSetId !== "" && !loadingContent && contentCount > 0;
    const srsCounts = mode === "flashcards" ? getSRSCounts(cards, srsState) : null;

    return (
      <div className="rl-page">
        <PageHead
          back={{ href: "/entrainement", label: "S'entraîner" }}
          title="Session du jour"
          sub="Quinze minutes, contenu mélangé. Les flashcards suivent ta répétition espacée."
        />

        <section className="card-hero rl-in grid grid-cols-1 gap-7 p-5 md:p-8" style={{ animationDelay: ".06s" }} aria-label="Préparer la session">
          <div className="grid gap-2.5">
            <p className="t-eyebrow m-0">Format</p>
            <Seg
              label="Format"
              value={mode}
              onChange={setMode}
              className="w-full sm:w-auto sm:min-w-[340px] sm:justify-self-start"
              options={[
                { key: "qcm", label: <><ListChecks size={15} aria-hidden /> QCM</> },
                { key: "flashcards", label: <><Layers size={15} aria-hidden /> Flashcards</> },
              ]}
            />
            <p className="t-micro m-0">{mode === "qcm" ? "Questions à choix multiples, corrigées à chaque réponse." : "Recto, verso : tu dis si tu savais, la carte revient au bon moment."}</p>
          </div>

          <div className="grid gap-2.5">
            <label htmlFor="session-set" className="t-eyebrow">
              {mode === "qcm" ? "Banque de questions" : "Paquet de cartes"}
            </label>
            {activeSets.length === 0 ? (
              <p className="t-small m-0">
                Aucun set disponible dans ce format.{" "}
                <Link href={mode === "qcm" ? "/qcm" : "/flashcards"} className="ink-link">
                  En créer un
                </Link>
              </p>
            ) : (
              <>
                <select id="session-set" className="select" value={selSetId} onChange={(e) => setSelSetId(e.target.value)}>
                  {activeSets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                      {s.isOfficial ? " ★" : ""}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="t-micro">
                    {loadingContent ? "Chargement…" : contentCount > 0 ? `${contentCount} ${mode === "qcm" ? "questions" : "cartes"}` : "Ce set est vide."}
                  </span>
                  {mode === "qcm" && isOfficial && <span className="chip chip-quiet chip-sm">Système · rapporte de l&apos;XP</span>}
                  {srsCounts && !loadingContent && contentCount > 0 && (
                    <>
                      {srsCounts.due > 0 && (
                        <span className="chip chip-quiet chip-sm">
                          <Repeat size={12} aria-hidden /> {srsCounts.due} à réviser
                        </span>
                      )}
                      {srsCounts.newCount > 0 && (
                        <span className="chip chip-quiet chip-sm">
                          <Sparkles size={12} aria-hidden /> {srsCounts.newCount} nouvelles
                        </span>
                      )}
                      {srsCounts.due === 0 && srsCounts.newCount === 0 && (
                        <span className="chip chip-quiet chip-sm">
                          <CheckCircle2 size={12} aria-hidden /> Tout à jour
                        </span>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
            <p className="t-small m-0 inline-flex items-center gap-2.5">
              {(serieIci > 0 || jourIci === "fait") && <Batons jours={serieIci} jour={jourIci} height={18} max={2} />}
              {serieSession(serieIci, jourIci)}
            </p>
            <button type="button" className="btn btn-primary btn-lg rl-press w-full sm:w-auto" disabled={!canStart} onClick={startSession}>
              Démarrer · 15 min <ArrowRight size={17} aria-hidden />
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ── RÉSUMÉ : la copie corrigée (QCM), la fin de passe (flashcards) ──

  if (phase === "done") {
    const flashTotal = totalReviewed + totalAgain;
    const minutes = dureeS ? Math.max(1, Math.round(dureeS / 60)) : null;
    const liens = (
      <>
        <button type="button" className="ink-link" onClick={() => setPhase("setup")}>
          Relancer une session
        </button>
        <Link href="/dashboard" className="text-[13.5px] font-semibold text-muted transition-colors hover:text-white">
          Retour à l&apos;accueil
        </Link>
      </>
    );

    // rien de répondu : pas de copie, une page blanche et la relance
    if (mode === "qcm" ? totalAnswered === 0 : flashTotal === 0) {
      return (
        <section className="card-quiet rl-in mx-auto grid w-full max-w-[660px] gap-4 px-6 py-10 text-center" aria-label="Session terminée">
          <p className="t-eyebrow m-0">{EPREUVE.daily}</p>
          <h2 className="t-h1 m-0">{COPIE_BLANCHE.titre}</h2>
          <p className="t-small m-0">{COPIE_BLANCHE.ligne}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">{liens}</div>
        </section>
      );
    }

    if (mode === "qcm") {
      return (
        <div className="rl-page">
          <FinDeSession
            epreuve={surTitreSession(EPREUVE.daily, totalAnswered, minutes)}
            titre={setTitle ? cleanTopic(setTitle) : EPREUVE.qcm}
            meta={xpEarned > 0 ? `+${xpEarned} XP` : undefined}
            score={totalCorrect}
            total={totalAnswered}
            review={log}
            jour={traits}
            ajoutes={totalAnswered}
            ia={log.length > 0 ? <CopyForAi review={log} score={totalCorrect} total={totalAnswered} kind="daily" size="action" /> : null}
            liens={liens}
          >
            <ReviewSection review={log} />
          </FinDeSession>
        </div>
      );
    }

    return (
      <div className="rl-page">
        <FinDePasse
          surTitre={`${EPREUVE.daily} · ${setTitle ? cleanTopic(setTitle) : "Flashcards"}`}
          sues={totalReviewed}
          total={flashTotal}
          aRevoir={totalAgain}
          jour={traits}
          className="mx-auto w-full max-w-[660px]"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">{liens}</div>
        </FinDePasse>
      </div>
    );
  }

  // ── EN COURS ──────────────────────────────────────────────────────────────

  const elapsedPct = Math.round(((SESSION_SECONDS - secondsLeft) / SESSION_SECONDS) * 100);
  const bar = (label: string, status: React.ReactNode) => (
    <RunnerBar
      label={label}
      index={0}
      total={0}
      answered={0}
      secondsLeft={secondsLeft}
      paused={isPaused}
      barPct={elapsedPct}
      status={status}
      actions={
        <>
          {serieIci > 0 && (
            <span className="t-micro hidden items-center gap-1 font-semibold sm:inline-flex" title={joursEncre(serieIci)}>
              <Icone nom="serie" size={14} /> {serieIci}
            </span>
          )}
          <PauseToggle paused={isPaused} onToggle={() => setIsPaused((p) => !p)} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={endSession}>
            Terminer
          </button>
        </>
      }
    />
  );

  // QCM
  if (mode === "qcm") {
    const currentQ = qQueue[idx % Math.max(qQueue.length, 1)];
    if (!currentQ) return null;
    const right = selectedChoice === currentQ.correct_index;

    return (
      <div className="mx-auto grid w-full max-w-[820px] gap-5 md:gap-6">
        {bar(
          "Session du jour · QCM",
          totalAnswered > 0 ? `${totalCorrect}/${totalAnswered} justes · ${Math.round((totalCorrect / totalAnswered) * 100)} %` : setTitle,
        )}

        {isPaused ? (
          <PauseCard onResume={() => setIsPaused(false)} />
        ) : (
          <QuestionCard
            index={totalAnswered - (showCorr ? 1 : 0)}
            prompt={currentQ.prompt}
            badge={isOfficial ? <span className="chip chip-quiet chip-sm shrink-0">Système · XP</span> : undefined}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                {showCorr ? (
                  <p className={"m-0 inline-flex items-center gap-2 text-[15px] font-semibold " + (right ? "" : "text-pen")} aria-live="polite">
                    {right ? <Check size={17} aria-hidden /> : <X size={17} aria-hidden />}
                    {right ? REPONSE.juste : REPONSE.rature}
                    {lastXpGain !== null && lastXpGain > 0 && <span className="chip chip-quiet chip-sm ml-1 text-white">+{lastXpGain} XP</span>}
                  </p>
                ) : (
                  <span className="t-micro">Choisis une réponse, puis valide.</span>
                )}
                {!showCorr ? (
                  <button type="button" className="btn btn-primary rl-press" disabled={selectedChoice === null || isPaused} onClick={() => void validateChoice()}>
                    Valider
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary rl-press" onClick={nextQCM}>
                    Suivante <ArrowRight size={16} aria-hidden />
                  </button>
                )}
              </div>
            }
          >
            {currentQ.choices.map((choice, i) => (
              <ChoiceButton
                key={i}
                index={i}
                text={choice}
                disabled={showCorr || isPaused}
                state={
                  showCorr
                    ? i === currentQ.correct_index
                      ? "correct"
                      : i === selectedChoice
                        ? "wrong"
                        : "dim"
                    : i === selectedChoice
                      ? "picked"
                      : "idle"
                }
                onClick={() => setSelectedChoice(i)}
              />
            ))}
            {showCorr && currentQ.explanation && <Explanation text={currentQ.explanation} className="mt-2 rl-in" />}
          </QuestionCard>
        )}
      </div>
    );
  }

  // Flashcards
  const allFCards = [...fQueue, ...fRepeat];
  const currentF = allFCards[idx % Math.max(allFCards.length, 1)];
  if (!currentF) return null;

  const cardSRS = srsState[currentF.id];
  const isDue = cardSRS ? cardSRS.due <= Date.now() : true;
  const isNew = !cardSRS;

  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-5 md:gap-6">
      {bar("Session du jour · flashcards", totalReviewed + totalAgain > 0 ? `${totalReviewed} sues · ${totalAgain} à revoir` : setTitle)}

      {isPaused ? (
        <PauseCard onResume={() => setIsPaused(false)} />
      ) : (
        <section className="card flex flex-col gap-5 p-5 md:p-8" aria-label="Carte">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-quiet chip-sm">
              {isNew ? <Sparkles size={12} aria-hidden /> : isDue ? <Repeat size={12} aria-hidden /> : <CheckCircle2 size={12} aria-hidden />}
              {isNew ? "Nouvelle" : isDue ? "À réviser" : "Maîtrisée"}
            </span>
            {cardSRS && <span className="t-micro">intervalle {cardSRS.interval} j</span>}
          </div>

          <button
            type="button"
            disabled={isPaused}
            onClick={() => setFlipped((f) => !f)}
            className={
              "grid min-h-[240px] w-full place-items-center rounded-[18px] px-6 py-10 text-center transition-colors duration-300 md:min-h-[280px] " +
              (flipped ? "bg-surface-2/70 shadow-[inset_0_0_0_1px_var(--line-2)]" : "bg-surface shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-surface-2/40")
            }
          >
            <span key={flipped ? "verso" : "recto"} className="rl-in grid max-w-[560px] gap-4">
              <span className="t-eyebrow">{flipped ? "Verso" : "Recto"}</span>
              <RichText text={flipped ? currentF.back : currentF.front} className="text-[17px] font-medium leading-relaxed md:text-[19px]" />
              {!flipped && <span className="t-micro">Touche la carte pour la retourner</span>}
            </span>
          </button>

          {flipped ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" className="btn btn-secondary btn-lg" disabled={isPaused} onClick={() => markFlashcard(false)}>
                <Repeat size={16} aria-hidden /> À revoir
              </button>
              <button type="button" className="btn btn-primary btn-lg rl-press" disabled={isPaused} onClick={() => markFlashcard(true)}>
                <Check size={16} aria-hidden /> Je savais
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary btn-lg rl-press w-full" disabled={isPaused} onClick={() => setFlipped(true)}>
              Voir la réponse
            </button>
          )}
        </section>
      )}
    </div>
  );
}
