"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Star, GraduationCap, BookOpen, Check, X, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import type { QuizQuestion } from "@/lib/types";

export type ExamSetOption = { id: string; title: string; isOfficial: boolean };

type ExamPhase = "setup" | "loading" | "active" | "done";

type ExamAnswer = {
  question: QuizQuestion;
  selected: number | null;
};

const EXAM_CONFIGS = [
  { n: 30, label: "30 questions", minutes: 45 },
  { n: 60, label: "60 questions", minutes: 90 },
  { n: 90, label: "90 questions (format CFA)", minutes: 165 },
];

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function ExamClient({ sets }: { sets: ExamSetOption[] }) {
  const supabase = useMemo(() => createClient(), []);

  const defaultSelected = useMemo(() => {
    const official = sets.filter(s => s.isOfficial).map(s => s.id);
    return official.length > 0 ? official : sets.slice(0, 2).map(s => s.id);
  }, [sets]);

  const [selectedSetIds, setSelectedSetIds] = useState<string[]>(defaultSelected);
  const [configIdx, setConfigIdx] = useState(0);
  const [phase, setPhase] = useState<ExamPhase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [idx, setIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = EXAM_CONFIGS[configIdx]!;

  useEffect(() => {
    if (phase !== "active") return;
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
  }, [phase]);

  async function startExam() {
    if (selectedSetIds.length === 0) return;
    setPhase("loading");
    const { data } = await supabase
      .from("quiz_questions")
      .select("id,set_id,prompt,choices,correct_index,explanation,position")
      .in("set_id", selectedSetIds);

    const qs = shuffleArr(
      (data ?? []).map(q => ({
        ...q,
        choices: Array.isArray(q.choices) ? (q.choices as string[]) : [],
      })) as QuizQuestion[]
    ).slice(0, config.n);

    setQuestions(qs);
    setAnswers(qs.map(q => ({ question: q, selected: null })));
    setIdx(0);
    setSelectedChoice(null);
    setSecondsLeft(config.minutes * 60);
    setShowReview(false);
    setPhase("active");
  }

  function selectChoice(choice: number) {
    setSelectedChoice(choice);
    setAnswers(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, selected: choice };
      return next;
    });
  }

  function goNext() {
    const isLast = idx >= questions.length - 1;
    if (isLast) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("done");
    } else {
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      setSelectedChoice(answers[nextIdx]?.selected ?? null);
    }
  }

  function goPrev() {
    if (idx > 0) {
      const prevIdx = idx - 1;
      setIdx(prevIdx);
      setSelectedChoice(answers[prevIdx]?.selected ?? null);
    }
  }

  function toggleSet(id: string) {
    setSelectedSetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <div className="grid gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mode Examen</h1>
          <p className="mt-1 text-sm text-white/60">
            Simulation d'examen CFA — pas de correction pendant l'examen.
          </p>
        </div>

        <div className="card p-5">
          <div className="mb-3 text-sm font-semibold">Sources de questions</div>
          {sets.length === 0 ? (
            <p className="text-sm text-white/55">
              Aucun QCM disponible.{" "}
              <Link href="/qcm" className="text-blue-400 hover:underline">
                Créer un QCM →
              </Link>
            </p>
          ) : (
            <div className="grid gap-1.5">
              {sets.map(s => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-blue-400"
                    checked={selectedSetIds.includes(s.id)}
                    onChange={() => toggleSet(s.id)}
                  />
                  <span className="flex-1 text-sm">{s.title}</span>
                  {s.isOfficial && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      <Star size={10} /> Officiel
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 text-sm font-semibold">Format</div>
          <div className="grid gap-2">
            {EXAM_CONFIGS.map((c, i) => {
              const h = Math.floor(c.minutes / 60);
              const m = c.minutes % 60;
              const dur = h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${c.minutes}min`;
              return (
                <button
                  key={i}
                  type="button"
                  className={`rounded-xl border p-4 text-left transition ${
                    configIdx === i
                      ? "border-blue-400/60 bg-blue-500/10"
                      : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setConfigIdx(i)}
                >
                  <div className="text-sm font-semibold">{c.label}</div>
                  <div className="mt-0.5 text-xs text-white/50">~{dur} · 1,5 min/question (standard CFA)</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary w-full py-4 text-base font-semibold"
          disabled={selectedSetIds.length === 0}
          onClick={startExam}
        >
          Démarrer l'examen
        </button>
      </div>
    );
  }

  // ── LOADING ────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-white/55">Chargement des questions…</div>
      </div>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────

  if (phase === "done") {
    const answered = answers.filter(a => a.selected !== null).length;
    const correct = answers.filter(a => a.selected === a.question.correct_index).length;
    const total = questions.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const isPassing = pct >= 70;

    return (
      <div className="grid gap-5">
        <div className="card p-8 text-center">
          {isPassing ? (
            <GraduationCap size={40} className="mx-auto text-green-400" />
          ) : (
            <BookOpen size={40} className="mx-auto text-white/60" />
          )}
          <h2 className="mt-4 text-2xl font-semibold">Résultat</h2>

          <div className="mx-auto mt-6 grid max-w-sm gap-3">
            <div className="card-soft p-5">
              <div
                className={`text-5xl font-bold ${
                  isPassing ? "text-green-400" : pct >= 55 ? "text-yellow-400" : "text-red-400"
                }`}
              >
                {pct}%
              </div>
              <div className="mt-2 text-sm text-white/60">{correct} / {total} correctes</div>
            </div>
            <div className={`card-soft flex items-center justify-center gap-1.5 p-3 text-sm font-medium ${isPassing ? "text-green-400" : "text-red-400/80"}`}>
              {isPassing && <Check size={14} />}
              {isPassing ? "Au-dessus du seuil (~70%)" : "En dessous du seuil (~70%)"}
            </div>
            {answered < total && (
              <div className="card-soft p-3 text-xs text-white/50">
                {total - answered} question(s) sans réponse
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/exam" className="btn btn-secondary px-6 py-2.5">
              Nouvel examen
            </Link>
            <button
              type="button"
              className="btn btn-ghost px-6 py-2.5"
              onClick={() => setShowReview(r => !r)}
            >
              {showReview ? "Masquer la correction" : "Voir la correction"}
            </button>
          </div>
        </div>

        {showReview && (
          <div className="grid gap-3">
            <h3 className="text-sm font-semibold text-white/70">
              Correction — {total} questions
            </h3>
            {answers.map((a, i) => {
              const isCorrect = a.selected === a.question.correct_index;
              return (
                <div
                  key={a.question.id}
                  className={`card p-4 border-l-2 ${
                    isCorrect ? "border-l-green-400/70" : "border-l-red-400/70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                      {isCorrect ? <Check size={16} /> : <X size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-snug">
                        {i + 1}. {a.question.prompt}
                      </div>
                      <div className="mt-2 grid gap-1">
                        {a.question.choices.map((choice, ci) => {
                          const isSelected = a.selected === ci;
                          const isCorrectChoice = ci === a.question.correct_index;
                          return (
                            <div
                              key={ci}
                              className={`rounded-xl px-3 py-1.5 text-xs ${
                                isCorrectChoice
                                  ? "bg-green-400/10 text-green-300 font-medium"
                                  : isSelected
                                  ? "bg-red-400/10 text-red-300"
                                  : "text-muted"
                              }`}
                            >
                              {String.fromCharCode(65 + ci)}. {choice}
                              {isCorrectChoice && <Check size={12} className="ml-1 inline" />}
                              {isSelected && !isCorrectChoice && " ← ta réponse"}
                            </div>
                          );
                        })}
                      </div>
                      {a.question.explanation && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/55 leading-relaxed">
                          <Lightbulb size={13} className="mt-0.5 shrink-0" />
                          {a.question.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────────────────

  const currentQ = questions[idx];
  if (!currentQ) return null;

  const isLast = idx >= questions.length - 1;
  const timeIsLow = secondsLeft <= 300;
  const timerPct = (secondsLeft / (config.minutes * 60)) * 100;
  const answeredCount = answers.filter(a => a.selected !== null).length;

  return (
    <div className="grid gap-4">
      {/* Timer header */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted">Question</div>
            <div className="text-sm font-semibold">{idx + 1} / {questions.length}</div>
          </div>
          <div className={`font-mono text-3xl font-bold tabular-nums ${timeIsLow ? "text-red-400" : ""}`}>
            {fmtTime(secondsLeft)}
          </div>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase("done");
            }}
          >
            Terminer
          </button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className={`h-full rounded-full transition-all ${timeIsLow ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
      </div>

      {/* Progress dots — clickable */}
      <div className="flex h-1.5 gap-0.5">
        {questions.map((_, i) => {
          const a = answers[i];
          return (
            <button
              key={i}
              type="button"
              title={`Q${i + 1}`}
              onClick={() => {
                setIdx(i);
                setSelectedChoice(answers[i]?.selected ?? null);
              }}
              className={`flex-1 rounded-sm transition ${
                i === idx
                  ? "bg-blue-400"
                  : a?.selected !== null && a?.selected !== undefined
                  ? "bg-white/35"
                  : "bg-white/[0.06]"
              }`}
            />
          );
        })}
      </div>

      {/* Question */}
      <div className="card p-6">
        <p className="mb-5 text-base font-medium leading-relaxed">{currentQ.prompt}</p>
        <div className="grid gap-2">
          {currentQ.choices.map((choice, ci) => {
            const isSelected = selectedChoice === ci;
            return (
              <button
                key={ci}
                type="button"
                onClick={() => selectChoice(ci)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  isSelected
                    ? "border-blue-400/60 bg-blue-500/10 text-white"
                    : "border-white/[0.07] bg-white/[0.02] text-white/80 hover:bg-white/[0.05] hover:border-white/15"
                }`}
              >
                <span className="mr-2.5 font-semibold text-white/35">
                  {String.fromCharCode(65 + ci)}.
                </span>
                {choice}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-ghost text-sm"
          onClick={goPrev}
          disabled={idx === 0}
        >
          ← Préc.
        </button>
        <span className="text-xs text-muted">
          {answeredCount} / {questions.length} répondues
        </span>
        <button
          type="button"
          className={`btn text-sm ${isLast ? "btn-primary" : "btn-secondary"}`}
          onClick={goNext}
        >
          {isLast ? "Terminer →" : "Suivante →"}
        </button>
      </div>
    </div>
  );
}
