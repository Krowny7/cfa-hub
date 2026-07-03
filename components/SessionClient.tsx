"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { saveAnswerResult } from "@/lib/session-stats";
import type { QuizQuestion, Flashcard, AwardXpResult } from "@/lib/types";

export type SetOption = { id: string; title: string; isOfficial: boolean };

type Mode = "qcm" | "flashcards";
type Phase = "setup" | "active" | "done";

const SESSION_SECONDS = 15 * 60;

// ── SRS (SM-2 simplified) ──────────────────────────────────────────────────

type CardSRS = {
  interval: number; // days until next review
  ef: number;       // ease factor (1.3–2.5)
  due: number;      // unix timestamp (ms)
  reps: number;     // successful repetitions
};

function srsKey(setId: string) {
  return `cfa_srs_${setId}`;
}

function loadSRS(setId: string): Record<string, CardSRS> {
  try {
    const raw = localStorage.getItem(srsKey(setId));
    return raw ? (JSON.parse(raw) as Record<string, CardSRS>) : {};
  } catch {
    return {};
  }
}

function saveSRS(setId: string, state: Record<string, CardSRS>) {
  try {
    localStorage.setItem(srsKey(setId), JSON.stringify(state));
  } catch {}
}

function applyReview(
  state: Record<string, CardSRS>,
  cardId: string,
  gotIt: boolean
): Record<string, CardSRS> {
  const now = Date.now();
  const prev = state[cardId] ?? { interval: 0, ef: 2.5, due: now, reps: 0 };

  if (gotIt) {
    const newReps = prev.reps + 1;
    let newInterval: number;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 6;
    else newInterval = Math.round(prev.interval * prev.ef);
    const newEf = Math.min(2.5, Math.max(1.3, prev.ef + 0.05));
    return {
      ...state,
      [cardId]: {
        interval: newInterval,
        ef: newEf,
        due: now + newInterval * 86_400_000,
        reps: newReps,
      },
    };
  } else {
    return {
      ...state,
      [cardId]: {
        interval: 1,
        ef: Math.max(1.3, prev.ef - 0.2),
        due: now + 86_400_000,
        reps: 0,
      },
    };
  }
}

function sortBySRS(cards: Flashcard[], state: Record<string, CardSRS>): Flashcard[] {
  const now = Date.now();
  return [...cards].sort((a, b) => {
    const sa = state[a.id];
    const sb = state[b.id];
    const aDue = sa?.due ?? now;
    const bDue = sb?.due ?? now;
    const aNew = !sa;
    const bNew = !sb;
    const aOver = aDue <= now;
    const bOver = bDue <= now;
    // Order: overdue → new → upcoming
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    if (!aOver && !bOver) {
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
    }
    return aDue - bDue;
  });
}

function getSRSCounts(cards: Flashcard[], state: Record<string, CardSRS>) {
  const now = Date.now();
  let due = 0;
  let newCount = 0;
  for (const c of cards) {
    const s = state[c.id];
    if (!s) { newCount++; }
    else if (s.due <= now) { due++; }
  }
  return { due, newCount };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

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
}: {
  qcmSets: SetOption[];
  flashSets: SetOption[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<Mode>("qcm");
  const [selSetId, setSelSetId] = useState(() => qcmSets[0]?.id ?? "");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // SRS state for current flash set
  const [srsState, setSrsState] = useState<Record<string, CardSRS>>({});

  // Active queues
  const [qQueue, setQQueue] = useState<QuizQuestion[]>([]);
  const [fQueue, setFQueue] = useState<Flashcard[]>([]);
  // Repeat pile: "reviewAgain" cards re-queued for this session
  const [fRepeat, setFRepeat] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);

  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [isPaused, setIsPaused] = useState(false);

  // QCM state
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showCorr, setShowCorr] = useState(false);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [lastXpGain, setLastXpGain] = useState<number | null>(null);

  // Flashcard state
  const [flipped, setFlipped] = useState(false);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [totalAgain, setTotalAgain] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const activeSets = mode === "qcm" ? qcmSets : flashSets;
  const isOfficial = qcmSets.find((s) => s.id === selSetId)?.isOfficial ?? false;

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
    if (phase === "done") {
      void savePracticeSession();
    }
  }, [phase, savePracticeSession]);

  // Restaure le dernier mode utilisé au montage (une seule fois) — évite de
  // repartir sur "qcm" par défaut si l'utilisateur révise habituellement en
  // flashcards.
  useEffect(() => {
    const last = loadLastSession();
    if (last) setMode(last.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sélectionne le dernier set utilisé pour ce mode s'il est toujours
  // disponible, sinon le premier de la liste.
  useEffect(() => {
    const list = mode === "qcm" ? qcmSets : flashSets;
    const last = loadLastSession();
    const remembered = last && last.mode === mode ? last.setId : null;
    const nextId = remembered && list.some((s) => s.id === remembered) ? remembered : (list[0]?.id ?? "");
    setSelSetId(nextId);
  }, [mode, qcmSets, flashSets]);

  // Mémorise le choix courant pour la prochaine ouverture de /session.
  useEffect(() => {
    if (phase === "setup" && selSetId) saveLastSession(mode, selSetId);
  }, [mode, selSetId, phase]);

  // Fetch content + load SRS state
  useEffect(() => {
    if (!selSetId || phase !== "setup") return;
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
  }, [selSetId, mode, phase, supabase]);

  // Timer
  useEffect(() => {
    if (phase !== "active" || isPaused) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, isPaused]);

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
    setFlipped(false);
    setTotalReviewed(0);
    setTotalAgain(0);
    sessionStartRef.current = Date.now();
    setPhase("active");
  }

  function endSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("done");
  }

  async function validateChoice() {
    if (selectedChoice === null) return;
    const currentQ = qQueue[idx % Math.max(qQueue.length, 1)];
    if (!currentQ) return;

    const isCorrect = selectedChoice === currentQ.correct_index;
    if (isCorrect) setTotalCorrect((c) => c + 1);
    setTotalAnswered((a) => a + 1);
    setShowCorr(true);

    const setTitle = activeSets.find(s => s.id === selSetId)?.title ?? "";
    saveAnswerResult(selSetId, setTitle, "qcm", isCorrect ? 1 : 0, 1);

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

    const flashTitle = activeSets.find(s => s.id === selSetId)?.title ?? "";
    saveAnswerResult(selSetId, flashTitle, "flashcards", gotIt ? 1 : 0, 1);

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

  // ── SETUP PHASE ──────────────────────────────────────────────────────────

  if (phase === "setup") {
    const contentCount = mode === "qcm" ? questions.length : cards.length;
    const canStart = selSetId !== "" && !loadingContent && contentCount > 0;
    const srsCounts = mode === "flashcards" ? getSRSCounts(cards, srsState) : null;

    return (
      <div className="grid gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("session.title")}</h1>
          <p className="mt-1 text-sm text-white/60">{t("session.subtitle")}</p>
        </div>

        {/* Mode picker */}
        <div className="card p-5">
          <div className="mb-3 text-sm font-semibold">{t("session.modeTitle")}</div>
          <div className="grid grid-cols-2 gap-3">
            {(["qcm", "flashcards"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`card-soft rounded-2xl p-4 text-left transition ${
                  mode === m ? "ring-2 ring-blue-400" : "hover:bg-white/[0.04]"
                }`}
                onClick={() => setMode(m)}
              >
                <div className="font-semibold">
                  {t(m === "qcm" ? "session.modeQcm" : "session.modeFlash")}
                </div>
                <div className="mt-1 text-xs text-white/55">
                  {t(m === "qcm" ? "session.modeQcmDesc" : "session.modeFlashDesc")}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Set picker */}
        <div className="card p-5">
          <div className="mb-3 text-sm font-semibold">{t("session.setTitle")}</div>
          {activeSets.length === 0 ? (
            <p className="text-sm text-white/55">{t("session.noSets")}</p>
          ) : (
            <>
              <select
                className="select"
                value={selSetId}
                onChange={(e) => setSelSetId(e.target.value)}
              >
                {activeSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}{s.isOfficial ? " ★" : ""}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-xs text-white/50">
                {loadingContent
                  ? t("session.loading")
                  : contentCount > 0
                  ? t(mode === "qcm" ? "session.questionsCount" : "session.cardsCount", { n: contentCount })
                  : t("session.noSets")}
              </div>

              {/* SRS status badge for flashcards */}
              {mode === "flashcards" && srsCounts && !loadingContent && contentCount > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {srsCounts.due > 0 && (
                    <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-300">
                      🔁 {srsCounts.due} à réviser
                    </span>
                  )}
                  {srsCounts.newCount > 0 && (
                    <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-300">
                      ✨ {srsCounts.newCount} nouvelles
                    </span>
                  )}
                  {srsCounts.due === 0 && srsCounts.newCount === 0 && (
                    <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-300">
                      ✅ Tout à jour
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary w-full py-4 text-base font-semibold"
          disabled={!canStart}
          onClick={startSession}
        >
          {t("session.start")}
        </button>
      </div>
    );
  }

  // ── DONE PHASE ────────────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <div className="grid gap-5">
        <div className="card p-8 text-center">
          <div className="text-5xl">🎉</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">{t("session.summaryTitle")}</h2>

          <div className="mx-auto mt-6 grid max-w-sm gap-3">
            {mode === "qcm" ? (
              <>
                <div className="card-soft p-4">
                  <div className="text-3xl font-bold">{totalAnswered}</div>
                  <div className="mt-1 text-sm text-white/60">
                    {t("session.summaryQcm", { n: totalAnswered })}
                  </div>
                </div>
                {totalAnswered > 0 && (
                  <div className="card-soft p-4">
                    <div className="text-3xl font-bold">
                      {Math.round((totalCorrect / totalAnswered) * 100)}%
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      {t("session.summaryScore", { score: totalCorrect, total: totalAnswered })}
                    </div>
                  </div>
                )}
                {xpEarned > 0 && (
                  <div className="card-soft p-4 ring-2 ring-yellow-400/40">
                    <div className="text-3xl font-bold text-yellow-400">+{xpEarned}</div>
                    <div className="mt-1 text-sm text-white/60">
                      {t("session.summaryXp", { n: xpEarned })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="card-soft p-4">
                  <div className="text-3xl font-bold text-green-400">{totalReviewed}</div>
                  <div className="mt-1 text-sm text-white/60">
                    {t("session.summaryFlash", { n: totalReviewed })}
                  </div>
                </div>
                {totalAgain > 0 && (
                  <div className="card-soft p-4">
                    <div className="text-3xl font-bold text-orange-400">{totalAgain}</div>
                    <div className="mt-1 text-sm text-white/60">cartes à revoir demain</div>
                  </div>
                )}
                {totalReviewed > 0 && (
                  <div className="card-soft p-4">
                    <div className="text-3xl font-bold">
                      {Math.round((totalReviewed / (totalReviewed + totalAgain)) * 100)}%
                    </div>
                    <div className="mt-1 text-sm text-white/60">maîtrisées cette session</div>
                  </div>
                )}
              </>
            )}
          </div>

          <Link href="/dashboard" className="btn btn-secondary mt-8 px-8 py-3">
            {t("session.backDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  // ── ACTIVE PHASE ──────────────────────────────────────────────────────────

  const timeIsLow = secondsLeft <= 60;
  const timerBarPct = Math.round((secondsLeft / SESSION_SECONDS) * 100);

  const TimerBar = () => (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-white/50">{t("session.timer")}</div>
          <div className={`font-mono text-3xl font-bold tabular-nums ${timeIsLow ? "text-red-400" : ""}`}>
            {fmtTime(secondsLeft)}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost text-xs" onClick={() => setIsPaused((p) => !p)}>
            {isPaused ? t("session.resumeTimer") : t("session.pauseTimer")}
          </button>
          <button type="button" className="btn btn-ghost text-xs" onClick={endSession}>
            {t("session.finish")}
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all ${timeIsLow ? "bg-red-400/80" : "bg-blue-400/80"}`}
          style={{ width: `${timerBarPct}%` }}
        />
      </div>
    </div>
  );

  // QCM mode
  if (mode === "qcm") {
    const currentQ = qQueue[idx % Math.max(qQueue.length, 1)];
    if (!currentQ) return null;

    return (
      <div className="grid gap-4">
        <TimerBar />
        <div className="card p-6">
          {isPaused && (
            <div className="mb-5 rounded-xl bg-white/[0.04] p-4 text-center text-sm text-white/60">
              ⏸ {t("session.pauseTimer")}
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-medium leading-relaxed">{currentQ.prompt}</p>
            {isOfficial && (
              <span className="badge badge-shared shrink-0">{t("session.officialBadge")}</span>
            )}
          </div>

          <div className="mt-5 grid gap-2">
            {currentQ.choices.map((choice, i) => {
              let cls = "w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm transition ";
              if (showCorr) {
                if (i === currentQ.correct_index) cls += "ring-2 ring-green-400 bg-green-400/10 ";
                else if (i === selectedChoice) cls += "ring-2 ring-red-400 bg-red-400/10 ";
                else cls += "opacity-40 ";
              } else if (i === selectedChoice) {
                cls += "ring-2 ring-blue-400 bg-blue-400/10 ";
              } else {
                cls += "bg-white/[0.02] hover:bg-white/[0.05] ";
              }
              return (
                <button key={i} type="button" className={cls} disabled={showCorr || isPaused} onClick={() => setSelectedChoice(i)}>
                  {choice}
                </button>
              );
            })}
          </div>

          {showCorr && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${selectedChoice === currentQ.correct_index ? "text-green-400" : "text-red-400"}`}>
                {selectedChoice === currentQ.correct_index ? t("session.correct") : t("session.wrong")}
              </span>
              {lastXpGain !== null && lastXpGain > 0 && (
                <span className="rounded-full bg-yellow-400/15 px-2.5 py-0.5 text-xs font-semibold text-yellow-300">
                  +{lastXpGain} XP
                </span>
              )}
            </div>
          )}

          {showCorr && currentQ.explanation && (
            <div className="mt-3 rounded-xl bg-white/[0.04] p-4 text-sm">
              <span className="font-semibold text-blue-300">{t("session.explanation")} : </span>
              {currentQ.explanation}
            </div>
          )}

          <div className="mt-5">
            {!showCorr ? (
              <button type="button" className="btn btn-secondary w-full py-3" disabled={selectedChoice === null || isPaused} onClick={validateChoice}>
                {t("session.validate")}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary w-full py-3" onClick={nextQCM}>
                {t("session.next")} →
              </button>
            )}
          </div>

          <div className="mt-3 text-center text-xs text-white/40">
            {totalAnswered > 0 && `${totalCorrect}/${totalAnswered} · ${Math.round((totalCorrect / totalAnswered) * 100)}%`}
          </div>
        </div>
      </div>
    );
  }

  // Flashcard mode
  const allFCards = [...fQueue, ...fRepeat];
  const currentF = allFCards[idx % Math.max(allFCards.length, 1)];
  if (!currentF) return null;

  const cardSRS = srsState[currentF.id];
  const isDue = cardSRS ? cardSRS.due <= Date.now() : true;
  const isNew = !cardSRS;

  return (
    <div className="grid gap-4">
      <TimerBar />
      <div className="card p-6">
        {isPaused && (
          <div className="mb-5 rounded-xl bg-white/[0.04] p-4 text-center text-sm text-white/60">
            ⏸ {t("session.pauseTimer")}
          </div>
        )}

        {/* SRS badge */}
        <div className="mb-3 flex items-center gap-2">
          {isNew && (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">✨ Nouvelle</span>
          )}
          {!isNew && isDue && (
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-300">🔁 À réviser</span>
          )}
          {!isNew && !isDue && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-300">✅ Maîtrisée</span>
          )}
          {cardSRS && (
            <span className="text-[10px] text-white/30">intervalle {cardSRS.interval}j</span>
          )}
        </div>

        <button
          type="button"
          className={`w-full rounded-2xl border border-white/10 p-8 text-center transition ${
            flipped ? "bg-white/[0.07] ring-1 ring-white/20" : "bg-white/[0.02] hover:bg-white/[0.04]"
          }`}
          disabled={isPaused}
          onClick={() => setFlipped((f) => !f)}
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            {flipped ? t("flashcards.back") : t("flashcards.front")}
          </div>
          <p className="text-base leading-relaxed">{flipped ? currentF.back : currentF.front}</p>
          {!flipped && <div className="mt-5 text-xs text-white/30">{t("session.showAnswer")}</div>}
        </button>

        <div className="mt-4">
          {flipped ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn border border-red-500/30 bg-red-500/10 py-3 text-red-300 hover:bg-red-500/15"
                disabled={isPaused}
                onClick={() => markFlashcard(false)}
              >
                {t("session.reviewAgain")}
              </button>
              <button
                type="button"
                className="btn border border-green-500/30 bg-green-500/10 py-3 text-green-300 hover:bg-green-500/15"
                disabled={isPaused}
                onClick={() => markFlashcard(true)}
              >
                {t("session.gotIt")}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary w-full py-3" disabled={isPaused} onClick={() => setFlipped(true)}>
              {t("session.showAnswer")}
            </button>
          )}
        </div>

        <div className="mt-3 text-center text-xs text-white/40">
          {totalReviewed > 0 && `${totalReviewed} maîtrisées · ${totalAgain} à revoir`}
        </div>
      </div>
    </div>
  );
}
