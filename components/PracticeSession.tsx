"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Target, Trophy, XCircle, Check, X, Copy, ClipboardCheck, History } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/errors";

// Poids officiels du curriculum CFA Level I (milieu de chaque fourchette),
// mêmes valeurs et mêmes topics que publish_mock_exam — voir
// migration_mock_exam_weighted_selection.sql / migration_practice_sessions.sql.
const TOPICS = [
  { key: "ethics", label: "Éthique et Standards Professionnels", weight: 17.5 },
  { key: "quant", label: "Méthodes Quantitatives", weight: 7.5 },
  { key: "economics", label: "Économie", weight: 7.5 },
  { key: "fsa", label: "Analyse des États Financiers", weight: 12.5 },
  { key: "corporate", label: "Finance d'Entreprise", weight: 7.5 },
  { key: "equity", label: "Investissements en Actions", weight: 12.5 },
  { key: "fixed_income", label: "Fixed Income", weight: 12.5 },
  { key: "derivatives", label: "Instruments Dérivés", weight: 6.5 },
  { key: "alternatives", label: "Investissements Alternatifs", weight: 8.5 },
  { key: "portfolio", label: "Gestion de Portefeuille", weight: 10.0 },
] as const;

type ActiveQuestion = { id: string; position: number; prompt: string; choices: string[] };

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

const LETTERS = ["A", "B", "C"];
const PASS_THRESHOLD = 70;
const MIN_PER_QUESTION_MINUTES = 135 / 90; // même ratio que l'examen officiel (135min/90Q)

function buildAiExportText(review: ReviewQuestion[], score: number, total: number) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const header = `SESSION D'ENTRAÎNEMENT CFA — ${score}/${total} (${pct}%)\n` +
    `Voici mes réponses à une session d'entraînement CFA Level I ciblée sur certains topics. Pour chaque question : mon énoncé, mes choix, ma réponse, la bonne réponse et l'explication officielle. ` +
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

function topicLabel(key: string) {
  return TOPICS.find((t) => t.key === key)?.label ?? key;
}

export function PracticeSession({ pastSessions: initialPast }: { pastSessions: PastSession[] }) {
  const supabase = useMemo(() => createClient(), []);

  type Phase = "builder" | "ready" | "active" | "done";
  const [phase, setPhase] = useState<Phase>("builder");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<90 | 180>(90);
  const [questions, setQuestions] = useState<ActiveQuestion[]>([]);
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
  const [pastSessions, setPastSessions] = useState<PastSession[]>(initialPast);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const submittingRef = useRef(false);

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
    const payload = questions.map((q, i) => ({ question_id: q.id, selected_index: answers[i] }));
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
      setPastSessions((prev) => [
        { id: crypto.randomUUID(), topics: topicsArr, format, question_count: data?.total ?? 0, score: data?.score ?? 0, total: data?.total ?? 0, duration_seconds: duration, completed_at: new Date().toISOString() },
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

  function backToBuilder() {
    setPhase("builder");
    setShowReview(false);
    setReview([]);
    setQuestions([]);
    setError(null);
  }

  // ── BUILDER ──
  if (phase === "builder") {
    return (
      <div className="grid gap-4">
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Target size={15} /> Choisir les topics
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {TOPICS.map((t) => {
              const on = selected.has(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleTopic(t.key)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    on ? "border-blue-400/50 bg-blue-500/10 text-white" : "border-white/10 text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="shrink-0 text-xs text-white/40">{t.weight}%</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <div className="text-xs text-white/50">Format :</div>
            <button
              type="button"
              onClick={() => setFormat(180)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${format === 180 ? "border-blue-400/50 bg-blue-500/10 text-white" : "border-white/10 text-white/60"}`}
            >
              Complet (180Q)
            </button>
            <button
              type="button"
              onClick={() => setFormat(90)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${format === 90 ? "border-blue-400/50 bg-blue-500/10 text-white" : "border-white/10 text-white/60"}`}
            >
              Demi-session (90Q)
            </button>
          </div>

          {selected.size > 0 && (
            <div className="mt-3 text-xs text-white/50">
              ≈ {previewCount} questions ({[...selected].map((k) => topicLabel(k)).join(", ")})
            </div>
          )}

          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}

          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={selected.size === 0 || busy}
            onClick={generate}
          >
            {busy ? "…" : "Générer la session"}
          </button>
        </div>

        {pastSessions.length > 0 && (
          <div className="card p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-white/50">
              <History size={13} /> Historique
            </div>
            <div className="grid gap-1.5">
              {pastSessions.map((s) => {
                const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                    <span className="text-white/60 truncate">
                      {s.topics.map((k) => topicLabel(k)).join(", ")} · {s.format}Q · {new Date(s.completed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    <span className={`shrink-0 font-semibold tabular-nums ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {pct}% ({s.score}/{s.total})
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
        <Target size={32} className="mx-auto text-white/70" />
        <h2 className="mt-3 text-lg font-semibold">Session prête</h2>
        <div className="mt-2 text-sm text-white/55">
          {questions.length} questions · {Math.round(secondsLeft / 60)} minutes
        </div>
        <div className="mt-1 text-xs text-white/40">
          {[...selected].map((k) => topicLabel(k)).join(", ")}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={backToBuilder}>Annuler</button>
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
          <div className="mt-2 text-xs uppercase tracking-wide text-white/40">Session d&apos;entraînement</div>
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
            <button type="button" className="btn btn-ghost" onClick={backToBuilder}>Nouvelle session</button>
          </div>
        </div>

        {topicStats.length > 1 && (
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
