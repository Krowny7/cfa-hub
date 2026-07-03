"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

type Question = {
  id: string;
  position: number;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
};

type Props = {
  examId: string;
  durationMinutes: number;
  questions: Question[];
  alreadyDone: boolean;
};

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function MockExamRunner({ examId, durationMinutes, questions, alreadyDone }: Props) {
  const supabase = useMemo(() => createClient(), []);

  type Phase = "ready" | "active" | "done";
  const [phase, setPhase] = useState<Phase>(alreadyDone ? "done" : "ready");
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
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
    if (timerRef.current) clearInterval(timerRef.current);

    const finalAnswers = answers;
    const finalScore = questions.reduce((acc, q, i) => acc + (finalAnswers[i] === q.correct_index ? 1 : 0), 0);
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("mock_exam_results").insert({
          exam_id: examId,
          user_id: auth.user.id,
          score: finalScore,
          total: questions.length,
          duration_seconds: duration,
        });
      }
    } catch {}

    setScore(finalScore);
    setPhase("done");
    setSubmitting(false);
  }

  const answered = answers.filter((a) => a !== null).length;
  const current = questions[idx];

  // ── READY ──
  if (phase === "ready") {
    return (
      <div className="card p-6 text-center">
        <div className="text-4xl">📝</div>
        <h2 className="mt-3 text-xl font-semibold">Prêt à commencer ?</h2>
        <div className="mt-2 text-sm text-white/55">
          {questions.length} questions · {durationMinutes} minutes
        </div>
        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          ⚠️ Pas de correction pendant l'examen. Tu verras tes résultats à la fin.
        </div>
        <button
          type="button"
          className="btn btn-primary mx-auto mt-6 px-8 py-3 text-base"
          onClick={start}
        >
          Commencer l'examen
        </button>
      </div>
    );
  }

  // ── DONE ──
  if (phase === "done") {
    const pct = score !== null && questions.length > 0
      ? Math.round((score / questions.length) * 100)
      : null;

    return (
      <div className="grid gap-4">
        <div className="card p-6 text-center">
          <div className="text-5xl">{pct !== null && pct >= 60 ? "🎉" : "📊"}</div>
          <h2 className="mt-3 text-2xl font-semibold">
            {alreadyDone && score === null ? "Examen déjà passé" : `${score ?? "?"} / ${questions.length}`}
          </h2>
          {pct !== null && (
            <div className={`mt-1 text-3xl font-bold ${pct >= 70 ? "text-green-400" : pct >= 60 ? "text-yellow-400" : "text-red-400"}`}>
              {pct}%
            </div>
          )}
          <div className="mt-2 text-sm text-white/50">
            {pct !== null && pct >= 60 ? "Au-dessus de la barre de passage" : pct !== null ? "En dessous de la barre de passage" : ""}
          </div>
          <button
            type="button"
            className="btn btn-secondary mx-auto mt-5"
            onClick={() => setShowReview((v) => !v)}
          >
            {showReview ? "Masquer la correction" : "Voir la correction"}
          </button>
        </div>

        {showReview && (
          <div className="grid gap-3">
            {questions.map((q, i) => {
              const sel = answers[i];
              const isCorrect = sel === q.correct_index;
              return (
                <div key={q.id} className={`card p-4 border-l-2 ${isCorrect ? "border-l-green-500/50" : sel === null ? "border-l-white/10" : "border-l-red-500/50"}`}>
                  <div className="text-xs text-muted mb-1">Q{i + 1}</div>
                  <div className="text-sm font-medium whitespace-pre-wrap break-words">{q.prompt}</div>
                  <div className="mt-3 grid gap-1.5">
                    {q.choices.map((c, ci) => (
                      <div key={ci} className={`rounded-lg border px-3 py-2 text-sm ${
                        ci === q.correct_index
                          ? "border-green-500/40 bg-green-500/10 text-green-300"
                          : ci === sel && sel !== q.correct_index
                          ? "border-red-500/40 bg-red-500/10 text-red-300"
                          : "border-white/10 text-white/60"
                      }`}>
                        {ci === q.correct_index ? "✓ " : ci === sel ? "✗ " : ""}{c}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-2 text-xs text-white/50 whitespace-pre-wrap break-words">{q.explanation}</div>
                  )}
                </div>
              );
            })}
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
