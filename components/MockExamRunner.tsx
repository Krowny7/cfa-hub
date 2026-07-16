"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ClipboardList, Trophy, XCircle, AlertTriangle, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/errors";

// Reçu pendant l'examen — jamais correct_index/explanation (voir
// migration_mock_exam_secure_submit.sql, correction entièrement serveur).
type ActiveQuestion = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
};

// Reçu uniquement après soumission (via submit_mock_exam ou
// get_mock_exam_review) — c'est la SEULE source de correct_index côté client.
type ReviewQuestion = {
  question_id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
  selected_index: number | null;
  is_correct: boolean;
};

type Props = {
  examId: string;
  durationMinutes: number;
  questions: ActiveQuestion[];
  review: ReviewQuestion[];
  alreadyDone: boolean;
};

const PASS_THRESHOLD = 70;

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function MockExamRunner({ examId, durationMinutes, questions, review: initialReview, alreadyDone }: Props) {
  const supabase = useMemo(() => createClient(), []);

  type Phase = "ready" | "active" | "done";
  const [phase, setPhase] = useState<Phase>(alreadyDone ? "done" : "ready");
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [review, setReview] = useState<ReviewQuestion[]>(initialReview);
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

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

  function start() {
    startedAtRef.current = Date.now();
    setPhase("active");
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);

    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    const payload = questions.map((q, i) => ({ question_id: q.id, selected_index: answers[i] }));

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

  // ── READY ──
  if (phase === "ready") {
    return (
      <div className="card p-6 text-center">
        <ClipboardList size={36} className="mx-auto text-white/70" />
        <h2 className="mt-3 text-xl font-semibold">Prêt à commencer ?</h2>
        <div className="mt-2 text-sm text-white/55">
          {questions.length} questions · {durationMinutes} minutes
        </div>
        <div className="mx-auto mt-4 flex max-w-sm items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle size={16} className="shrink-0" />
          Pas de correction pendant l&apos;examen. Tu verras tes résultats à la fin.
        </div>
        <button
          type="button"
          className="btn btn-primary mx-auto mt-6 px-8 py-3 text-base"
          onClick={start}
        >
          Commencer l&apos;examen
        </button>
      </div>
    );
  }

  // ── DONE ──
  if (phase === "done") {
    const total = review.length;
    const score = review.filter((r) => r.is_correct).length;
    const pct = total > 0 ? Math.round((score / total) * 100) : null;
    const passed = pct !== null && pct >= PASS_THRESHOLD;

    return (
      <div className="grid gap-4">
        <div className="card p-6 text-center">
          {passed ? (
            <Trophy size={40} className="mx-auto text-yellow-400" />
          ) : (
            <XCircle size={40} className="mx-auto text-red-400/80" />
          )}
          <h2 className={`mt-3 text-2xl font-semibold ${passed ? "text-green-400" : "text-red-400"}`}>
            {total > 0 ? (passed ? "PASS" : "DID NOT PASS") : "Résultats indisponibles"}
          </h2>
          {pct !== null && (
            <>
              <div className="mt-1 text-3xl font-bold tabular-nums">{pct}%</div>
              <div className="mt-1 text-sm text-white/50">{score} / {total} bonnes réponses</div>
              <div className="mt-1 text-xs text-muted">Seuil de passage (indicatif) : {PASS_THRESHOLD}%</div>
            </>
          )}
          {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
          {total > 0 && (
            <button
              type="button"
              className="btn btn-secondary mx-auto mt-5"
              onClick={() => setShowReview((v) => !v)}
            >
              {showReview ? "Masquer la correction" : "Voir la correction"}
            </button>
          )}
        </div>

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
  const timeIsLow = secondsLeft <= 300;

  return (
    <div className="grid gap-4">
      {/* Timer + progress */}
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
          <button
            type="button"
            className="btn btn-secondary shrink-0 text-sm"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "…" : "Remettre la copie"}
          </button>
        </div>
        {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
        {/* Progress bar */}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${Math.round((answered / questions.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Question */}
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
                    picked
                      ? "border-blue-400/60 bg-blue-500/15 text-white"
                      : "border-white/10 hover:bg-white/5 text-white/80"
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

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={idx === 0}
          onClick={() => setIdx((i) => i - 1)}
        >
          ← Précédente
        </button>

        {/* Question dots (mini map) */}
        <div className="flex flex-wrap justify-center gap-1">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-5 w-5 rounded text-[9px] font-bold transition ${
                i === idx
                  ? "bg-blue-500 text-white"
                  : answers[i] !== null
                  ? "bg-white/20 text-white/70"
                  : "bg-white/[0.06] text-white/30"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={idx === questions.length - 1}
          onClick={() => setIdx((i) => i + 1)}
        >
          Suivante →
        </button>
      </div>
    </div>
  );
}
