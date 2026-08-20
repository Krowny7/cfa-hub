"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { RotateCcw, Trophy, XCircle, Check, X, Copy, ClipboardCheck, History } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/errors";

type RetakeQuestion = { id: string; position: number; prompt: string; choices: string[] };

type ReviewQuestion = {
  question_id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  topic: string | null;
  selected_index: number | null;
  is_correct: boolean;
};

type PastAttempt = {
  id: string;
  mode: "full" | "wrong_only";
  score: number;
  total: number;
  duration_seconds: number | null;
  completed_at: string;
};

const LETTERS = ["A", "B", "C"];
const PASS_THRESHOLD = 70;

function buildAiExportText(review: ReviewQuestion[], score: number, total: number) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const header = `ESSAI D'ENTRAÎNEMENT CFA — ${score}/${total} (${pct}%)\n` +
    `Voici mes réponses à un essai d'entraînement CFA Level I. Pour chaque question : mon énoncé, mes choix, ma réponse, la bonne réponse et l'explication officielle. ` +
    `Peux-tu me faire un bilan de mes points faibles par thème, et m'expliquer plus en détail les questions où je me suis trompé ?\n\n`;
  const body = review.map((q, i) => {
    const choicesText = q.choices.map((c, ci) => `${LETTERS[ci]}) ${c}`).join("\n");
    const myAnswer = q.selected_index === null ? "Non répondue" : `${LETTERS[q.selected_index]}) ${q.choices[q.selected_index]}`;
    const correctAnswer = `${LETTERS[q.correct_index]}) ${q.choices[q.correct_index]}`;
    return (
      `Q${i + 1} [${q.topic ?? "?"}] — ${q.is_correct ? "CORRECT" : "INCORRECT"}\n` +
      `${q.prompt}\n${choicesText}\n` +
      `Ma réponse : ${myAnswer}\n` +
      `Bonne réponse : ${correctAnswer}\n` +
      (q.explanation ? `Explication : ${q.explanation}\n` : "")
    );
  }).join("\n");
  return header + body;
}

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

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
  const [questions, setQuestions] = useState<RetakeQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [review, setReview] = useState<ReviewQuestion[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastAttempts, setPastAttempts] = useState<PastAttempt[]>(initialPast);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const submittingRef = useRef(false);
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

  async function startMode(m: "full" | "wrong_only") {
    setBusy(true);
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
    }
  }

  function start() {
    setIdx(0);
    startedAtRef.current = Date.now();
    setPhase("active");
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
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

  async function copyForAi() {
    const text = buildAiExportText(review, score, total);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Impossible de copier automatiquement.");
    }
  }

  function backToMenu() {
    setPhase("menu");
    setShowReview(false);
    setReview([]);
    setQuestions([]);
    setError(null);
  }

  // ── MENU ──
  if (phase === "menu") {
    return (
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <RotateCcw size={15} /> Repasser cet examen (entraînement)
        </div>
        <div className="mb-4 text-xs text-white/50">
          Ces essais ne comptent pas pour le classement et ne conservent que le score, pas les réponses.
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => startMode("full")}>
            {busy ? "…" : `Repasser la totalité (${totalCount}Q)`}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || wrongCount === 0}
            onClick={() => startMode("wrong_only")}
          >
            {busy ? "…" : `Repasser mes erreurs (${wrongCount}Q)`}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-300">{error}</div>}

        {pastAttempts.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/50">
              <History size={13} /> Historique des essais
            </div>
            <div className="grid gap-1.5">
              {pastAttempts.map((a) => {
                const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                    <span className="text-white/60">
                      {a.mode === "full" ? "Totalité" : "Erreurs seulement"} · {new Date(a.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    <span className={`font-semibold tabular-nums ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {pct}% ({a.score}/{a.total})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── READY ──
  if (phase === "ready") {
    return (
      <div className="card p-6 text-center">
        <RotateCcw size={32} className="mx-auto text-white/70" />
        <h2 className="mt-3 text-lg font-semibold">
          {mode === "full" ? "Essai complet" : "Essai — mes erreurs"}
        </h2>
        <div className="mt-2 text-sm text-white/55">
          {questions.length} questions · {Math.round(secondsLeft / 60)} minutes
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={backToMenu}>Annuler</button>
          <button type="button" className="btn btn-primary px-6" onClick={start}>Commencer</button>
        </div>
      </div>
    );
  }

  // ── DONE ──
  if (phase === "done") {
    const pct = total > 0 ? Math.round((score / total) * 100) : null;
    const passed = pct !== null && pct >= PASS_THRESHOLD;

    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const q of review) {
      const key = q.topic ?? "Autre";
      const entry = byTopic.get(key) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (q.is_correct) entry.correct += 1;
      byTopic.set(key, entry);
    }
    const topicStats = [...byTopic.entries()]
      .map(([topic, s]) => ({ topic, ...s, pct: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.pct - b.pct);

    return (
      <div className="grid gap-4">
        <div className="card p-6 text-center">
          {passed ? <Trophy size={36} className="mx-auto text-yellow-400" /> : <XCircle size={36} className="mx-auto text-red-400/80" />}
          <div className="mt-2 text-xs uppercase tracking-wide text-white/40">
            Essai d&apos;entraînement — {mode === "full" ? "totalité" : "mes erreurs"}
          </div>
          {pct !== null && (
            <>
              <div className="mt-1 text-3xl font-bold tabular-nums">{pct}%</div>
              <div className="mt-1 text-sm text-white/50">{score} / {total} bonnes réponses</div>
            </>
          )}
          {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
          <div className="mx-auto mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setShowReview((v) => !v)}>
              {showReview ? "Masquer la correction" : "Voir la correction"}
            </button>
            <button type="button" className="btn btn-secondary inline-flex items-center gap-1.5" onClick={copyForAi}>
              {copied ? <ClipboardCheck size={15} className="text-green-400" /> : <Copy size={15} />}
              {copied ? "Copié !" : "Copier pour IA"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={backToMenu}>Retour</button>
          </div>
        </div>

        {topicStats.length > 0 && (
          <div className="card p-5">
            <div className="mb-3 text-sm font-semibold">Répartition par thème</div>
            <div className="grid gap-2">
              {topicStats.map((t) => (
                <div key={t.topic} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate text-xs text-white/60">{t.topic}</div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className={`h-full rounded-full ${t.pct >= 70 ? "bg-green-500" : t.pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                  <div className={`w-24 shrink-0 text-right text-xs tabular-nums ${t.pct >= 70 ? "text-green-400" : t.pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {t.pct}% ({t.correct}/{t.total})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showReview && (
          <div className="grid gap-3">
            {review.map((q, i) => (
              <div key={q.question_id} className={`card p-4 border-l-2 ${q.is_correct ? "border-l-green-500/50" : q.selected_index === null ? "border-l-white/10" : "border-l-red-500/50"}`}>
                <div className="text-xs text-muted mb-1">Q{i + 1}</div>
                <div className="text-sm font-medium whitespace-pre-wrap break-words">{q.prompt}</div>
                <div className="mt-3 grid gap-1.5">
                  {q.choices.map((c, ci) => (
                    <div key={ci} className={`rounded-xl border px-3 py-2 text-sm ${
                      ci === q.correct_index
                        ? "border-green-500/40 bg-green-500/10 text-green-300"
                        : ci === q.selected_index && q.selected_index !== q.correct_index
                        ? "border-red-500/40 bg-red-500/10 text-red-300"
                        : "border-white/10 text-white/60"
                    }`}>
                      <span className="inline-flex items-center gap-1.5">
                        {ci === q.correct_index && <Check size={14} className="shrink-0" />}
                        {ci === q.selected_index && ci !== q.correct_index && <X size={14} className="shrink-0" />}
                        {c}
                      </span>
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="mt-2 text-xs text-white/50 whitespace-pre-wrap break-words">{q.explanation}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── ACTIVE ──
  const answered = answers.filter((a) => a !== null).length;
  const current = questions[idx];
  const timeIsLow = secondsLeft <= 60;

  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted">Temps restant</div>
            <div className={`font-mono text-3xl font-bold tabular-nums ${timeIsLow ? "text-red-400" : ""}`}>
              {fmtTime(secondsLeft)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">{answered}/{questions.length} répondues</div>
            <div className="text-sm font-medium">Q{idx + 1}/{questions.length}</div>
          </div>
          <button type="button" className="btn btn-secondary shrink-0 text-sm" disabled={busy} onClick={submit}>
            {busy ? "…" : "Terminer"}
          </button>
        </div>
        {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.round((answered / questions.length) * 100)}%` }} />
        </div>
      </div>

      {current && (
        <div className="card p-5">
          <div className="text-xs text-muted mb-2">Question {idx + 1}</div>
          <div className="text-base font-medium whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {current.prompt}
          </div>
          <div className="mt-4 grid gap-2">
            {current.choices.map((c, ci) => {
              const picked = answers[idx] === ci;
              return (
                <button
                  key={ci}
                  type="button"
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    picked ? "border-blue-400/60 bg-blue-500/15 text-white" : "border-white/10 hover:bg-white/5 text-white/80"
                  }`}
                  onClick={() => {
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[idx] = ci;
                      return next;
                    });
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn btn-ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
          ← Précédente
        </button>
        <div className="flex flex-wrap justify-center gap-1">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-5 w-5 rounded text-[9px] font-bold transition ${
                i === idx ? "bg-blue-500 text-white" : answers[i] !== null ? "bg-white/20 text-white/70" : "bg-white/[0.06] text-white/30"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" disabled={idx === questions.length - 1} onClick={() => setIdx((i) => i + 1)}>
          Suivante →
        </button>
      </div>
    </div>
  );
}
