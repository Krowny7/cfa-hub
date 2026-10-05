"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { MarqueQuestion } from "@/components/MarqueQuestion";
import { Ticks, type TickMark } from "@/components/defi/parts";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { clock, duelTopicLabel } from "@/lib/duels";
import { answerEclair, finishEclair, startEclair, type EclairFinish, type EclairQuestion } from "@/lib/eclair";
import { ECLAIR, verdictCopie } from "@/lib/voice-z2c";

// Une série éclair : 5 questions de cours, une à la fois, corrigée tout de
// suite (on apprend en route), puis le bilan et « Encore 5 ». La série vit
// côté serveur (eclair_start / eclair_answer / eclair_finish) : on la
// retrouve en revenant, réponses et corrections comprises.

const LETTERS = ["A", "B", "C", "D", "E"];
const letter = (i: number) => LETTERS[i] ?? String(i + 1);

type Phase = "loading" | "play" | "finishing" | "done" | "soon" | "error";

export type EclairDemo = { questions: EclairQuestion[]; current?: number; result?: EclairFinish & { marks: TickMark[] } };

export function EclairRunner({ todayDone, cinqAFaire, demo }: { todayDone: number; cinqAFaire: boolean; demo?: EclairDemo }) {
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const [phase, setPhase] = useState<Phase>(demo ? (demo.result ? "done" : "play") : "loading");
  const [serieId, setSerieId] = useState<string | null>(demo ? "demo" : null);
  const [questions, setQuestions] = useState<EclairQuestion[]>(demo?.questions ?? []);
  const [current, setCurrent] = useState(demo?.current ?? 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(EclairFinish & { marks: TickMark[] }) | null>(demo?.result ?? null);
  const [done, setDone] = useState(todayDone);
  const finishingRef = useRef(false);

  const n = questions.length || 5;
  const q = questions[current] ?? null;
  const answered = q !== null && q.selectedIndex !== null;
  const justes = questions.filter((x) => x.selectedIndex !== null && x.selectedIndex === x.correctIndex).length;
  const marks: TickMark[] = questions.map((x, i) =>
    x.selectedIndex !== null ? (x.selectedIndex === x.correctIndex ? "ok" : "ko") : i === current && phase === "play" ? "current" : "todo",
  );

  const finish = useCallback(
    async (id: string, qs: EclairQuestion[]) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setPhase("finishing");
      const m: TickMark[] = qs.map((x) => (x.selectedIndex === null ? "none" : x.selectedIndex === x.correctIndex ? "ok" : "ko"));
      try {
        const r = supabase ? await finishEclair(supabase, id) : { score: 0, total: 0, seconds: 0, xpAwarded: 0, today: done + 1 };
        // la série rendue : autant de traits que de réponses (anneau du jour)
        if (r.total > 0) poserTrait(r.total);
        setResult({ ...r, marks: m });
        setDone(r.today);
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        finishingRef.current = false;
        setPhase("play");
      }
    },
    [done, supabase],
  );

  const start = useCallback(async () => {
    if (!supabase) return;
    setPhase("loading");
    setError(null);
    setResult(null);
    setSelected(null);
    finishingRef.current = false;
    const r = await startEclair(supabase);
    if (r.kind === "soon") return setPhase("soon");
    if (r.kind === "error") {
      setError(r.message);
      return setPhase("error");
    }
    setSerieId(r.serie.id);
    setQuestions(r.serie.questions);
    const first = r.serie.questions.findIndex((x) => x.selectedIndex === null);
    // série reprise déjà toute répondue : on la rend
    if (first < 0) {
      setCurrent(r.serie.questions.length - 1);
      setPhase("play");
      void finish(r.serie.id, r.serie.questions);
      return;
    }
    // reprise : on rouvre la dernière question répondue si on l'a quittée corrigée
    setCurrent(first);
    setPhase("play");
  }, [finish, supabase]);

  useEffect(() => {
    if (!demo) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = useCallback(async () => {
    if (!q || selected === null || answered || sending || phase !== "play" || !serieId) return;
    setSending(true);
    setError(null);
    try {
      const r = supabase
        ? await answerEclair(supabase, serieId, q.position, selected)
        : { selectedIndex: selected, correctIndex: 0, explanation: "Exemple d'explication.", isCorrect: selected === 0 };
      setQuestions((prev) =>
        prev.map((x) => (x.position === q.position ? { ...x, selectedIndex: r.selectedIndex, correctIndex: r.correctIndex, explanation: r.explanation } : x)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [answered, phase, q, selected, sending, serieId, supabase]);

  const next = useCallback(() => {
    if (!answered || phase !== "play") return;
    const reste = questions.findIndex((x, i) => i > current && x.selectedIndex === null);
    const avant = questions.findIndex((x) => x.selectedIndex === null);
    const suivante = reste >= 0 ? reste : avant;
    setSelected(null);
    // sur téléphone, la correction a fait descendre la page : la question suivante repart d'en haut
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (suivante < 0) {
      if (serieId) void finish(serieId, questions);
      return;
    }
    setCurrent(suivante);
  }, [answered, current, finish, phase, questions, serieId]);

  // Clavier : 1/2/3 ou A/B/C pour choisir, Entrée pour valider puis passer à la suite
  const actions = useRef({ validate, next });
  useEffect(() => {
    actions.current = { validate, next };
  }, [validate, next]);
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
      if (!answered && ix >= 0 && ix < q.choices.length) {
        setSelected(ix);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (answered) actions.current.next();
        else void actions.current.validate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, phase, q]);

  // ---------------------------------------------------------------------------

  if (phase === "soon") {
    return (
      <section className="card rl-in grid max-w-[760px] gap-3 p-6 md:p-8">
        <h2 className="t-h2 m-0">{ECLAIR.soonTitle}</h2>
        <p className="t-body m-0 text-muted">{ECLAIR.soonText}</p>
        <Link href="/entrainement" className="ink-link w-fit">
          {ECLAIR.retour}
        </Link>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="card rl-in grid max-w-[760px] gap-4 p-6 md:p-8">
        <h2 className="t-h2 m-0">{ECLAIR.erreurTitre}</h2>
        {error && (
          <p role="alert" className="t-small m-0 text-muted">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-primary w-fit" onClick={() => void start()}>
          {ECLAIR.reessayer}
        </button>
      </section>
    );
  }

  if (phase === "done" && result) {
    return <Bilan result={result} done={done} cinqAFaire={cinqAFaire} onEncore={() => void start()} />;
  }

  return (
    <div className="grid gap-5 md:gap-6">
      {/* En-tête : la série / ses coches / justes */}
      <header className="sticky top-[72px] z-30 rounded-[18px] border border-line bg-surface/90 px-4 py-3 shadow-[var(--shadow-1)] backdrop-blur-md md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-[14px] font-bold md:text-[16px]">
              <Zap size={15} aria-hidden className="shrink-0" /> {ECLAIR.nom}
            </div>
            <div className="t-micro truncate">{ECLAIR.serieN(done + 1)}</div>
          </div>
          <Ticks marks={questions.length ? marks : Array.from({ length: 5 }, () => "todo" as TickMark)} label="Ta série" height={26} />
          <div className="min-w-0 text-right">
            <div className="font-mono text-[14px] font-semibold tabular-nums md:text-[16px]">
              {justes}
              <span className="font-normal text-muted">/{n}</span>
            </div>
            <div className="t-micro truncate">{ECLAIR.justesEnCours}</div>
          </div>
        </div>
      </header>

      {phase === "loading" || !q ? (
        <section className="card rl-in mx-auto grid w-full max-w-[820px] gap-4 p-6 md:p-8" aria-busy>
          <p className="kicker m-0">{ECLAIR.preparation}</p>
          <div className="grid gap-2.5" aria-hidden>
            <span className="block h-5 w-4/5 rounded-[8px] bg-surface-2" />
            <span className="block h-5 w-3/5 rounded-[8px] bg-surface-2" />
            <span className="mt-3 block h-12 rounded-[14px] border border-dashed border-line-2" />
            <span className="block h-12 rounded-[14px] border border-dashed border-line-2" />
            <span className="block h-12 rounded-[14px] border border-dashed border-line-2" />
          </div>
        </section>
      ) : (
        <div className="mx-auto grid w-full max-w-[820px] gap-4">
          <div className="flex min-h-[26px] items-center justify-between gap-3">
            <p className="kicker m-0 min-w-0 truncate">{ECLAIR.question(q.position + 1, n, duelTopicLabel(q.topic))}</p>
            {answered && <MarqueQuestion questionId={q.id} source="eclair" />}
          </div>

          <section className="card flex min-w-0 flex-col gap-5 p-5 md:gap-6 md:p-7">
            <div key={q.position} className="rl-in">
              <QuestionPrompt
                text={q.prompt}
                className="text-[17px] font-semibold leading-normal tracking-[-0.01em] break-words [overflow-wrap:anywhere] md:text-[20px]"
              />
            </div>

            {answered ? (
              <Corrigee q={q} />
            ) : (
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
                      <span className={"grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] font-mono text-[13px] " + (on ? "bg-black/20" : "bg-surface-2 text-white")}>
                        {letter(i)}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{c}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <p role="alert" className="m-0 text-sm text-pen">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              {answered ? (
                <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={next} disabled={phase !== "play"} autoFocus>
                  {questions.every((x) => x.selectedIndex !== null) ? ECLAIR.bilan : ECLAIR.suivante}
                  <ArrowRight size={16} aria-hidden />
                </button>
              ) : (
                <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={selected === null || sending} onClick={() => void validate()}>
                  {sending ? ECLAIR.envoi : ECLAIR.valider}
                  <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-muted">
            <span>{ECLAIR.regle}</span>
            {questions.some((x) => x.selectedIndex !== null) && !questions.every((x) => x.selectedIndex !== null) && (
              <button type="button" onClick={() => serieId && void finish(serieId, questions)} className="font-semibold transition-colors hover:text-white">
                {ECLAIR.arreter}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** La question tout juste corrigée : ma réponse, la bonne, l'explication. */
function Corrigee({ q }: { q: EclairQuestion }) {
  const ok = q.selectedIndex === q.correctIndex;
  return (
    <div className="grid gap-4">
      <ul className="m-0 grid list-none gap-2 p-0" aria-label="Correction">
        {q.choices.map((c, ci) => {
          const correct = ci === q.correctIndex;
          const picked = ci === q.selectedIndex;
          const state = correct ? "correct" : picked ? "wrong" : "dim";
          return (
            <li
              key={ci}
              className={
                "flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[15px] leading-[1.5] md:text-base " +
                (state === "correct" ? "border-white bg-surface font-semibold" : state === "wrong" ? "border-pen/60 bg-pen/[0.04] text-pen" : "border-line text-muted")
              }
            >
              <span
                className={
                  "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] font-mono text-[12.5px] font-semibold " +
                  (state === "correct" ? "bg-white text-black" : state === "wrong" ? "bg-pen text-black" : "bg-surface-2")
                }
                aria-label={state === "correct" ? `${letter(ci)}, bonne réponse` : letter(ci)}
              >
                {state === "correct" ? <Check size={14} strokeWidth={2.6} aria-hidden /> : state === "wrong" ? <X size={14} strokeWidth={2.6} aria-hidden /> : letter(ci)}
              </span>
              <span className="min-w-0 flex-1 pt-[1px] break-words [overflow-wrap:anywhere]">{c}</span>
            </li>
          );
        })}
      </ul>
      <div className={"rounded-[12px] p-4 md:px-5 " + (ok ? "bg-surface-2/60" : "bg-pen/[0.06]")} role="status">
        <p className={"m-0 text-[14.5px] font-bold " + (ok ? "" : "text-pen")}>{ok ? ECLAIR.juste : ECLAIR.rate(letter(q.correctIndex ?? 0))}</p>
        {q.explanation && <Explication text={q.explanation} />}
      </div>
    </div>
  );
}

/** Explication : retours à la ligne gardés ; un tableau (tabulations) passe par QuestionPrompt. */
function Explication({ text }: { text: string }) {
  const cls = "mt-1.5 text-[14px] leading-[1.6] text-body break-words [overflow-wrap:anywhere]";
  if (text.includes("\t")) return <QuestionPrompt text={text} compact className={cls} />;
  return <p className={"m-0 whitespace-pre-wrap " + cls}>{text}</p>;
}

/** Le bilan d'une série : le score, le temps, l'XP, et « Encore 5 ». */
function Bilan({ result, done, cinqAFaire, onEncore }: { result: EclairFinish & { marks: TickMark[] }; done: number; cinqAFaire: boolean; onEncore: () => void }) {
  const total = result.total || result.marks.length;
  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-4">
      <section className="card-hero rl-in grid gap-5 p-6 md:p-8" aria-label={ECLAIR.rendue}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="t-micro m-0 flex items-center gap-1.5 font-semibold">
              <Zap size={13} aria-hidden /> {ECLAIR.serieDuJour(done)}
            </p>
            <h2 className="t-h1 m-0 mt-1.5">{verdictCopie(result.score, total)}</h2>
          </div>
          <p className="m-0 shrink-0 text-right leading-none" aria-label={`${result.score} sur ${total}`}>
            <span className="t-num text-[52px] sm:text-[60px] md:text-[76px]">{result.score}</span>
            <span className="font-mono text-[15px] text-muted">/{total}</span>
          </p>
        </div>
        <Ticks marks={result.marks} label="Ta série" />
        <p className="t-small m-0 flex flex-wrap gap-x-3 gap-y-1 font-mono">
          <span>{clock(result.seconds)}</span>
          <span aria-hidden>·</span>
          <span>{ECLAIR.xp(result.xpAwarded)}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" className="btn btn-primary" onClick={onEncore} autoFocus>
            <Zap size={16} aria-hidden /> {ECLAIR.encore}
          </button>
          <Link href="/entrainement" className="btn btn-secondary">
            {ECLAIR.retour}
          </Link>
        </div>
      </section>
      {cinqAFaire && (
        <Link href="/defi/cinq" className="rl-row group flex items-center gap-3 rounded-[14px] border border-line px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-2">
            <Zap size={17} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">{ECLAIR.cinqAFaire}</span>
            <span className="t-micro block">{ECLAIR.cinqAFaireSous}</span>
          </span>
          <ArrowRight size={15} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
