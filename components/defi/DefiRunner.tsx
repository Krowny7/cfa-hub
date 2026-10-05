"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { Ticks, type TickMark } from "@/components/defi/parts";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { clock, duelTopicLabel } from "@/lib/duels";
import { voixDefi } from "@/lib/voice-z2c";
import {
  answerDaily,
  dailyErrorMessage,
  dayLabel,
  finishDaily,
  startDaily,
  type FormatDefi,
  type DailyQuestion,
} from "@/lib/daily";

const LETTERS = ["A", "B", "C", "D", "E"];

type Props = {
  /** jour du défi (« AAAA-MM-JJ ») */
  day: string;
  today: string;
  questionCount: number;
  timeLimitSeconds: number;
  /** aperçu : questions d'exemple, aucune requête */
  demo?: {
    questions: DailyQuestion[];
    answered: Record<number, number>;
    secondsLeft: number;
  };
  /** les 30 du jour (défaut) ou les 5 du jour */
  format?: FormatDefi;
};

type Phase = "loading" | "play" | "done" | "error";

// La copie du jour : chrono serveur, une question à la fois, coches
// d'avancement (à l'encre ce qui est répondu, au crayon ce qui reste). La
// correction reste côté serveur jusqu'à la copie rendue. Démarre (ou
// reprend) la copie dès son affichage.
export function DefiRunner({ day, today, questionCount, timeLimitSeconds, format = "trente", demo }: Props) {
  // la voix de ce défi : les 30 du jour ou les 5 du jour
  const DEFI = voixDefi(format);
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);

  const [phase, setPhase] = useState<Phase>(demo ? "play" : "loading");
  const [questions, setQuestions] = useState<DailyQuestion[]>(demo?.questions ?? []);
  const [answers, setAnswers] = useState<Record<number, number>>(demo?.answered ?? {});
  const [current, setCurrent] = useState<number | null>(() => {
    if (!demo) return null;
    const first = demo.questions.find((q) => demo.answered[q.position] === undefined);
    return first ? first.position : null;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(demo ? Date.now() + demo.secondsLeft * 1000 : null);
  const [now, setNow] = useState(() => Date.now());
  const offsetRef = useRef(0);
  const finishingRef = useRef(false);

  const n = questions.length || questionCount;
  const answeredCount = Object.keys(answers).length;
  const remaining = deadline === null ? timeLimitSeconds : Math.max(0, Math.ceil((deadline - (now + offsetRef.current)) / 1000));

  const nextUnanswered = useCallback(
    (ans: Record<number, number>, from: number | null): number | null => {
      const positions = questions.map((q) => q.position);
      if (!positions.length) return null;
      const start = from === null ? -1 : positions.indexOf(from);
      for (let k = 1; k <= positions.length; k++) {
        const p = positions[(start + k + positions.length) % positions.length];
        if (ans[p] === undefined) return p;
      }
      return null;
    },
    [questions],
  );

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase("done");
    if (!supabase) return;
    try {
      await finishDaily(supabase, day, format);
    } catch {
      // le serveur rend la copie de toute façon à la fin du chrono
    }
    router.refresh();
  }, [day, router, supabase]);

  const start = useCallback(async () => {
    if (!supabase) return;
    setPhase("loading");
    setFatal(null);
    try {
      const r = await startDaily(supabase, day, format);
      if (r.finished) {
        router.refresh();
        return;
      }
      offsetRef.current = new Date(r.serverNow).getTime() - Date.now();
      const ans: Record<number, number> = {};
      r.answers.forEach((a) => {
        if (a.selectedIndex !== null) ans[a.position] = a.selectedIndex;
      });
      setQuestions(r.questions);
      setAnswers(ans);
      setDeadline(new Date(r.deadline).getTime());
      const first = r.questions.find((q) => ans[q.position] === undefined);
      setCurrent(first ? first.position : null);
      setPhase("play");
      if (!first) void finish();
    } catch (e) {
      setFatal(dailyErrorMessage(e));
      setPhase("error");
    }
  }, [day, finish, router, supabase]);

  // Commence ou reprend la copie dès l'affichage.
  useEffect(() => {
    if (!demo) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chrono
  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!demo && phase === "play" && deadline !== null && remaining <= 0) void finish();
  }, [demo, deadline, finish, phase, remaining]);

  const validate = useCallback(async () => {
    if (selected === null || current === null || sending || phase !== "play") return;
    setSending(true);
    setError(null);
    try {
      const nextAnswers = { ...answers, [current]: selected };
      if (supabase) {
        const res = await answerDaily(supabase, day, current, selected, format);
        // un trait de plus sur l'anneau du jour (logo vivant de la barre du haut)
        if (res.ok) poserTrait(1);
        if (!res.ok || res.finished) {
          setAnswers(nextAnswers);
          finishingRef.current = true;
          setPhase("done");
          router.refresh();
          return;
        }
      }
      setAnswers(nextAnswers);
      setSelected(null);
      const next = nextUnanswered(nextAnswers, current);
      if (next === null) {
        await finish();
        return;
      }
      setCurrent(next);
    } catch (e) {
      setError(dailyErrorMessage(e, DEFI.pasPartie));
    } finally {
      setSending(false);
    }
  }, [answers, current, day, finish, nextUnanswered, phase, router, selected, sending, supabase]);

  const goTo = useCallback(
    (position: number) => {
      if (answers[position] !== undefined || position === current) return;
      setSelected(null);
      setError(null);
      setCurrent(position);
    },
    [answers, current],
  );

  const skip = useCallback(() => {
    const next = nextUnanswered(answers, current);
    if (next !== null && next !== current) {
      setSelected(null);
      setCurrent(next);
    }
  }, [answers, current, nextUnanswered]);

  // Clavier : 1/2/3 ou A/B/C pour choisir, Entrée pour valider
  const validateRef = useRef(validate);
  useEffect(() => {
    validateRef.current = validate;
  }, [validate]);
  const q = questions.find((x) => x.position === current) ?? null;
  useEffect(() => {
    if (phase !== "play" || !q) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const byNumber = k.length === 1 ? "12345".indexOf(k) : -1;
      const byLetter = k.length === 1 ? "abcde".indexOf(k) : -1;
      const ix = byNumber >= 0 ? byNumber : byLetter;
      if (ix >= 0 && ix < q.choices.length) {
        setSelected(ix);
      } else if (e.key === "Enter") {
        e.preventDefault();
        void validateRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, q]);

  async function handIn() {
    const left = n - answeredCount;
    if (!window.confirm(DEFI.confirmHandIn(left))) return;
    await finish();
  }

  const unanswered = n - answeredCount;
  // l'encre rouge : les 5 dernières minutes des 30, la dernière minute des 5
  const low = phase === "play" && remaining <= Math.min(300, Math.round(timeLimitSeconds / 5));
  const marks: TickMark[] = Array.from({ length: n }, (_, i) =>
    answers[i] !== undefined ? "done" : i === current && phase === "play" ? "current" : "todo",
  );

  return (
    <div className="grid gap-6 md:gap-8">
      {/* En-tête : le jour / chrono / avancement */}
      <header className="sticky top-[72px] z-30 rounded-[18px] border border-line bg-surface/90 px-4 py-3 shadow-[var(--shadow-1)] backdrop-blur-md md:px-6 md:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-5">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold md:text-[16px]">{DEFI.tuile.titre}</div>
            <div className="t-micro truncate first-letter:uppercase">{dayLabel(day, "short", today)}</div>
          </div>
          <span
            className={"t-num text-[26px] md:text-[38px] " + (low ? "text-pen" : "")}
            role="timer"
            aria-live="off"
            aria-label={`Temps restant ${clock(remaining)}`}
          >
            {clock(remaining)}
          </span>
          <div className="min-w-0 text-right">
            <div className="font-mono text-[14px] font-semibold tabular-nums md:text-[16px]">
              {answeredCount}
              <span className="font-normal text-muted">/{n}</span>
            </div>
            <div className="t-micro truncate">{DEFI.repondues}</div>
          </div>
        </div>
        <Ticks
          className="mt-3"
          marks={marks}
          label={DEFI.avancement}
          onPick={phase === "play" ? goTo : undefined}
          canPick={(p) => answers[p] === undefined}
        />
      </header>

      {phase === "loading" ? (
        <section className="card rl-in mx-auto grid w-full max-w-[820px] gap-4 p-6 md:p-8" aria-busy>
          <p className="kicker m-0">{DEFI.preparation}</p>
          <div className="grid gap-2.5" aria-hidden>
            <span className="block h-5 w-4/5 rounded-[8px] bg-surface-2" />
            <span className="block h-5 w-3/5 rounded-[8px] bg-surface-2" />
            <span className="mt-3 block h-12 rounded-[14px] border border-dashed border-line-2" />
            <span className="block h-12 rounded-[14px] border border-dashed border-line-2" />
            <span className="block h-12 rounded-[14px] border border-dashed border-line-2" />
          </div>
        </section>
      ) : phase === "error" ? (
        <section className="card-hero rl-in mx-auto grid w-full max-w-[760px] gap-4 p-6 md:p-8">
          <p className="kicker m-0">{DEFI.tuile.label}</p>
          <h2 className="t-h2 m-0">{DEFI.neSouvrePas}</h2>
          <p role="alert" className="t-body m-0 text-muted">
            {fatal}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className="btn btn-primary" onClick={() => void start()}>
              {DEFI.reessayer}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.refresh()}>
              {DEFI.recharger}
            </button>
          </div>
        </section>
      ) : phase === "done" || !q ? (
        <section className="card rl-in mx-auto grid w-full max-w-[820px] place-items-center gap-2 p-8 text-center">
          <h2 className="t-h2 m-0">{DEFI.handedIn}</h2>
          <p className="t-small m-0">{DEFI.counting}</p>
        </section>
      ) : (
        <div className="mx-auto grid w-full max-w-[820px] gap-[22px]">
          <p className="kicker m-0">{DEFI.question(q.position + 1, n, duelTopicLabel(q.topic))}</p>

          <section className="card flex min-w-0 flex-col gap-6 p-5 md:p-7">
            <div key={q.position} className="rl-in">
              <QuestionPrompt
                text={q.prompt}
                className="text-[17px] font-semibold leading-normal tracking-[-0.01em] break-words [overflow-wrap:anywhere] md:text-[20px]"
              />
            </div>
            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Réponses">
              {q.choices.map((c, i) => {
                const on = selected === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSelected(i)}
                    className={
                      "btn w-full justify-start gap-3.5 rounded-[14px] px-4 py-3.5 text-left text-[15px] md:px-[18px] md:py-4 md:text-base " +
                      (on ? "btn-primary" : "btn-secondary")
                    }
                  >
                    <span
                      className={
                        "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] font-mono text-[13px] " +
                        (on ? "bg-black/20" : "bg-surface-2 text-white")
                      }
                    >
                      {LETTERS[i] ?? i + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words">{c}</span>
                  </button>
                );
              })}
            </div>
            {error && (
              <p role="alert" className="m-0 text-sm text-pen">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={skip}
                disabled={unanswered <= 1}
                className="self-center py-1 text-[14px] font-semibold text-muted transition-colors hover:text-white disabled:opacity-40 sm:self-auto"
              >
                {DEFI.passer}
              </button>
              <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={selected === null || sending} onClick={() => void validate()}>
                {sending ? DEFI.envoi : DEFI.valider}
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-muted">
            <span>{DEFI.definitif}</span>
            <button type="button" onClick={() => void handIn()} className="font-semibold transition-colors hover:text-white">
              {DEFI.rendre}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
