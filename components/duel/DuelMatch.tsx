"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { DuelSide, StakeTile } from "@/components/duel/parts";
import {
  answerDuel,
  clock,
  duelErrorMessage,
  duelTopicLabel,
  finishDuel,
  getDuelState,
  respondDuel,
  signed,
  stakesAgainst,
  startDuel,
  timeLeftLabel,
  type DuelQuestion,
  type DuelState,
} from "@/lib/duels";

const LETTERS = ["A", "B", "C", "D", "E"];

type Props = {
  state: DuelState;
  /** maîtrise du programme du joueur (halo et verrous de son badge) */
  myMastery?: number | null;
  /** aperçu : questions d'exemple, aucune requête */
  demo?: {
    questions: DuelQuestion[];
    answered: Record<number, number>;
    theirAnswered: number;
    secondsLeft: number;
    /** commencer par l'écran « Prêt ? » */
    intro?: boolean;
  };
};

type Phase = "intro" | "loading" | "play" | "done";

// Le match (maquette V2-Duel-match) : en-tête « toi contre l'adversaire »,
// chrono, avancement des deux joueurs, une question à la fois. La correction
// et le score restent côté serveur jusqu'à la fin du duel.
export function DuelMatch({ state, myMastery = null, demo }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => (demo ? null : createClient()), [demo]);
  const n = state.questionCount;

  const [phase, setPhase] = useState<Phase>(demo && !demo.intro ? "play" : "intro");
  const [questions, setQuestions] = useState<DuelQuestion[]>(demo?.questions ?? []);
  const [answers, setAnswers] = useState<Record<number, number>>(demo?.answered ?? {});
  const [current, setCurrent] = useState<number | null>(() => {
    if (!demo) return null;
    const first = demo.questions.find((q) => demo.answered[q.position] === undefined);
    return first ? first.position : null;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [them, setThem] = useState(state.them);
  const [theirAnswered, setTheirAnswered] = useState(demo ? demo.theirAnswered : state.them?.answered ?? 0);
  const [deadline, setDeadline] = useState<number | null>(demo && !demo.intro ? Date.now() + demo.secondsLeft * 1000 : null);
  const [now, setNow] = useState(() => Date.now());
  const offsetRef = useRef(0);
  const finishingRef = useRef(false);

  const answeredCount = Object.keys(answers).length;
  const remaining = deadline === null ? state.timeLimitSeconds : Math.max(0, Math.ceil((deadline - (now + offsetRef.current)) / 1000));

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
      await finishDuel(supabase, state.id);
    } catch {
      // le serveur rend la copie de toute façon à la fin du chrono
    }
    router.refresh();
  }, [router, state.id, supabase]);

  const start = useCallback(async () => {
    if (!supabase) {
      if (demo) {
        setDeadline(Date.now() + demo.secondsLeft * 1000);
        setPhase("play");
      }
      return;
    }
    setPhase("loading");
    setError(null);
    try {
      const r = await startDuel(supabase, state.id);
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
      setDeadline(new Date(r.startedAt).getTime() + r.timeLimitSeconds * 1000);
      const first = r.questions.find((q) => ans[q.position] === undefined);
      setCurrent(first ? first.position : null);
      setPhase("play");
      if (!first) void finish();
    } catch (e) {
      setError(duelErrorMessage(e));
      setPhase("intro");
    }
  }, [demo, finish, router, state.id, supabase]);

  // Partie déjà commencée (rechargement) : on reprend directement.
  useEffect(() => {
    if (!demo && state.me.startedAt) void start();
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

  // Avancement de l'adversaire (et arrivée d'un adversaire en duel au hasard)
  useEffect(() => {
    if (!supabase || phase !== "play") return;
    const t = setInterval(async () => {
      const s = await getDuelState(supabase, state.id);
      if (!s) return;
      setThem(s.them);
      setTheirAnswered(s.them?.answered ?? 0);
    }, 20000);
    return () => clearInterval(t);
  }, [phase, state.id, supabase]);

  const validate = useCallback(async () => {
    if (selected === null || current === null || sending || phase !== "play") return;
    setSending(true);
    setError(null);
    try {
      const nextAnswers = { ...answers, [current]: selected };
      if (supabase) {
        const res = await answerDuel(supabase, state.id, current, selected);
        setTheirAnswered(res.opponentAnswered);
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
      setError(duelErrorMessage(e, "Ta réponse n'est pas partie — réessaie."));
    } finally {
      setSending(false);
    }
  }, [answers, current, finish, nextUnanswered, phase, router, selected, sending, state.id, supabase]);

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

  async function cancelChallenge() {
    if (!supabase) return;
    if (!window.confirm("Annuler ce défi ? Il ne comptera pas.")) return;
    try {
      await respondDuel(supabase, state.id, false);
      router.push("/duel");
    } catch (e) {
      setError(duelErrorMessage(e));
    }
  }

  async function handIn() {
    if (!window.confirm("Rendre ta copie maintenant ? Les questions sans réponse compteront fausses.")) return;
    await finish();
  }

  const theirName = them?.username ?? (state.mode === "random" ? "Adversaire à trouver" : "Adversaire");
  const stakes = them ? stakesAgainst(state.me.elo, state.me.gamesPlayed, them.elo) : null;
  const unanswered = n - answeredCount;
  const low = phase === "play" && remaining <= 300;

  return (
    <div className="grid gap-6 md:gap-8">
      {/* En-tête : toi / chrono / adversaire */}
      <header className="sticky top-[72px] z-30 rounded-[18px] border border-line bg-surface/90 px-3.5 py-3 shadow-[var(--shadow-1)] backdrop-blur-md md:px-6 md:py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-5">
          <DuelSide name="Toi" elo={state.me.elo} mastery={myMastery} badgeSize={40} extra={`${answeredCount}/${n}`} />
          <div className="flex flex-col items-center">
            <span
              className={"t-num text-[26px] md:text-[38px] " + (low ? "text-pen" : "")}
              role="timer"
              aria-live="off"
              aria-label={`Temps restant ${clock(remaining)}`}
            >
              {clock(remaining)}
            </span>
          </div>
          <DuelSide name={theirName} elo={them ? them.elo : null} align="right" badgeSize={40} extra={them ? `${theirAnswered}/${n}` : undefined} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 md:gap-10" aria-hidden>
          <Segments total={n} filled={answeredCount} />
          <Segments total={n} filled={them ? theirAnswered : 0} />
        </div>
      </header>

      {phase === "intro" || phase === "loading" ? (
        <section className="card-hero rl-in mx-auto grid w-full max-w-[760px] gap-6 p-6 md:p-9">
          <div>
            <p className="kicker m-0">
              {state.mode === "random" && !them ? "Duel au hasard" : `Contre ${theirName}`}
              {" · expire dans "}
              {timeLeftLabel(state.expiresAt, state.serverNow)}
            </p>
            <h2 className="t-h1 m-0 mt-1.5">Prêt ?</h2>
          </div>
          <ul className="m-0 grid list-none gap-1.5 p-0 text-[15px] leading-normal text-muted">
            <li>
              <b className="text-white">{n} questions</b>, les mêmes et dans le même ordre pour vous deux.
            </li>
            <li>
              <b className="text-white">{Math.round(state.timeLimitSeconds / 60)} min</b> : le chrono ne s&apos;arrête plus, même si tu fermes la page.
            </li>
            <li>
              <b className="text-white">Réponses définitives</b> ; tu peux passer et revenir. Scores cachés jusqu&apos;à la fin.
            </li>
          </ul>
          {stakes ? (
            <div className="grid grid-cols-3 gap-2">
              <StakeTile label="Si tu gagnes" value={signed(stakes.win)} />
              <StakeTile label="Match nul" value={signed(stakes.draw)} />
              <StakeTile label="Si tu perds" value={signed(stakes.loss)} />
            </div>
          ) : (
            <p className="t-small m-0">Tu joues d&apos;abord : le prochain joueur qui cherche un duel au hasard passera les mêmes questions. L&apos;enjeu dépendra de son ELO.</p>
          )}
          {state.status === "pending" && them && (
            <p className="t-small m-0">{theirName} n&apos;a pas encore accepté : tu peux jouer dès maintenant. S&apos;il refuse, le défi ne compte pas.</p>
          )}
          {error && (
            <p role="alert" className="m-0 text-sm text-pen">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {state.status === "pending" && state.iAmChallenger && (
              <button type="button" className="btn btn-ghost" onClick={cancelChallenge}>
                Annuler le défi
              </button>
            )}
            <button type="button" className="btn btn-primary" disabled={phase === "loading"} onClick={() => void start()}>
              {phase === "loading" ? "Préparation…" : state.me.startedAt ? "Reprendre" : "Commencer"}
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </section>
      ) : phase === "done" || !q ? (
        <section className="card rl-in mx-auto grid w-full max-w-[820px] place-items-center gap-2 p-8 text-center">
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">Copie rendue</h2>
          <p className="m-0 text-sm text-muted">Calcul du résultat…</p>
        </section>
      ) : (
        <div className="mx-auto grid w-full max-w-[820px] gap-[22px]">
          <p className="kicker m-0">
            Question {q.position + 1} sur {n} · {duelTopicLabel(q.topic)}
          </p>

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
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={skip}
                disabled={unanswered <= 1}
                className="text-[14px] font-semibold text-muted transition-colors hover:text-white disabled:opacity-40"
              >
                Passer pour l&apos;instant
              </button>
              <button type="button" className="btn btn-primary" disabled={selected === null || sending} onClick={() => void validate()}>
                {sending ? "Envoi…" : "Valider et continuer"}
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-muted">
            <span className="font-mono tabular-nums">
              {answeredCount}/{n} répondues
            </span>
            <button type="button" onClick={() => void handIn()} className="font-semibold transition-colors hover:text-white">
              Rendre ma copie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Barre d'avancement en segments (une case par question). */
function Segments({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex gap-[2px] md:gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={"h-2 min-w-0 flex-1 rounded-[3px] transition-colors " + (i < filled ? "bg-white" : "bg-surface-2")} />
      ))}
    </div>
  );
}
