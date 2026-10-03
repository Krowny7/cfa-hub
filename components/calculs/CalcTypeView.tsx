"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ClipboardCheck, Copy, RotateCcw } from "lucide-react";
import { CopieCorrigee } from "@/components/adn/CopieCorrigee";
import { Cote } from "@/components/adn/Cote";
import { InkBarCoches } from "@/components/adn/InkBarCoches";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { drawCalcRound, submitCalcAnswer, type DrawResult, type LocalSeen, type SubmitResult } from "@/app/calculs/actions";
import {
  ROUND_SIZE,
  UNIT_FIELD,
  checkCalcInput,
  correctionSteps,
  decimalsOf,
  formatCalc,
  historyFrom,
  levelState,
  nextLevel,
  parseCalcCandidates,
  parseCalcInput,
  pickRound,
  publicQuestion,
  suggestedLevel,
  type AllProgress,
  type CalcQuestionPublic,
  type LevelStat,
} from "@/lib/calc/engine";
import type { CalcTypeMeta } from "@/lib/calc/index";
import { CALC_LEVELS, type CalcLevel, type CalcTopic, type CalcType } from "@/lib/calc/types";
import { IA, prochainBout, questions as nQuestions } from "@/lib/voice";
import { buildCalcAiText, copyText } from "./export";
import { appendLocal, readLocal } from "./local";
import { BackLink, DataSheet, PenMark } from "./parts";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, NIVEAU, ligneNiveau, nbQuestions } from "./voice";

/** Une question du round, avant puis après la réponse. */
export type RoundItem = {
  q: CalcQuestionPublic;
  /** la saisie, telle que tapée */
  raw: string | null;
  value: number | null;
  status: "juste" | "faux" | null;
  /** la bonne réponse et la correction, reçues après la réponse */
  answer: number | null;
  solution: string[];
};

type Phase = "choix" | "tirage" | "round" | "fin";

type Api = {
  draw: (level: CalcLevel, local: LocalSeen[]) => Promise<DrawResult>;
  submit: (q: CalcQuestionPublic, raw: string) => Promise<SubmitResult>;
};

type Props = {
  subject: { topic: CalcTopic; slug: string; name: string };
  meta: CalcTypeMeta;
  /** le type suivant dans l'ordre du programme (après le Difficile tenu) */
  next: { key: string; name: string } | null;
  /** progression lue en base ; null = repli local */
  progress: AllProgress | null;
  db: boolean;
  owner: string;
  /** ?niveau= */
  initialLevel?: CalcLevel | null;
  /** ?go=1 : lance le round dès l'arrivée */
  autoStart?: boolean;
  /** aperçu sans contenu en ligne : tirage et correction dans le navigateur */
  demo?: CalcType;
  /** aperçu figé : un round en cours ou rendu */
  preset?: { phase: "round" | "fin"; level: CalcLevel; items: RoundItem[]; idx?: number };
};

/**
 * /calculs/[matiere]/[type] : le rappel des formules, le choix du niveau,
 * puis un round de 5 questions (champ numérique, correction immédiate pas à
 * pas) et la copie corrigée (« Refaire ce niveau », « Niveau suivant »,
 * « Copier pour l'IA »). La bonne réponse n'arrive qu'après la réponse
 * (actions serveur de app/calculs/actions.ts).
 */
export function CalcTypeView({ subject, meta, next, progress: server, db, owner, initialLevel, autoStart, demo, preset }: Props) {
  const router = useRouter();
  const [bump, setBump] = useState(0);
  useLocalImport(db, owner);
  const { progress, ready } = useCalcProgress(server, owner, bump);
  const p = progress[subject.topic]?.[meta.key];

  const [phase, setPhase] = useState<Phase>(preset?.phase ?? "choix");
  const [level, setLevel] = useState<CalcLevel>(preset?.level ?? initialLevel ?? suggestedLevel(p));
  const touched = useRef(!!initialLevel || !!preset);
  const [items, setItems] = useState<RoundItem[]>(preset?.items ?? []);
  const [idx, setIdx] = useState(preset?.idx ?? 0);
  const [error, setError] = useState<string | null>(null);

  // le niveau proposé suit la progression locale, tant que le joueur n'a pas choisi
  useEffect(() => {
    if (ready && !touched.current) setLevel(suggestedLevel(p));
  }, [ready, p]);

  const api: Api = useMemo(() => {
    if (demo) return demoApi(demo);
    return {
      draw: (l, local) => drawCalcRound({ topic: subject.topic, typeKey: meta.key, level: l, local, db }),
      submit: (q, raw) => submitCalcAnswer({ topic: subject.topic, typeKey: meta.key, questionId: q.id, raw, db }),
    };
  }, [demo, subject.topic, meta.key, db]);

  const start = useCallback(
    async (l: CalcLevel) => {
      touched.current = true;
      setLevel(l);
      setError(null);
      setPhase("tirage");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("go")) {
          url.searchParams.delete("go");
          window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        }
        window.scrollTo({ top: 0 });
      }
      try {
        const local = readLocal(owner)
          .filter((a) => a.topic === subject.topic && a.typeKey === meta.key && a.level === l)
          .map((a) => ({ q: a.questionId, c: a.correct, a: a.at }));
        const r = await api.draw(l, local);
        if (!r.ok || !r.questions.length) {
          setError(r.ok ? CALC.tirageRate : r.error);
          setPhase("choix");
          return;
        }
        setItems(r.questions.map((q) => ({ q, raw: null, value: null, status: null, answer: null, solution: [] })));
        setIdx(0);
        setPhase("round");
      } catch {
        setError(CALC.tirageRate);
        setPhase("choix");
      }
    },
    [api, meta.key, owner, subject.topic],
  );

  // ?go=1 : le round part tout de suite
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoStart && !preset && !autoRef.current) {
      autoRef.current = true;
      void start(initialLevel ?? suggestedLevel(p));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = useCallback(() => {
    setPhase("fin");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    if (demo) setBump((b) => b + 1);
    else if (db) router.refresh();
    else setBump((b) => b + 1);
  }, [db, demo, router]);

  const onAnswered = useCallback(
    (i: number, raw: string, r: Extract<SubmitResult, { ok: true; status: "juste" | "faux" }>) => {
      const it = items[i];
      if (!it) return;
      if (!r.stored)
        appendLocal(owner, [
          { topic: subject.topic, typeKey: meta.key, questionId: it.q.id, level: it.q.level, value: r.value, correct: r.status === "juste", at: Date.now() },
        ]);
      poserTrait(1);
      setItems((list) => list.map((x, k) => (k === i ? { ...x, raw, value: r.value, status: r.status, answer: r.answer, solution: r.solution } : x)));
    },
    [items, meta.key, owner, subject.topic],
  );

  const tier = meta.tier === "annexe" ? "Annexe" : "Essentiel";

  if (phase === "round" || phase === "tirage") {
    return (
      <RoundScreen
        subject={subject}
        meta={meta}
        level={level}
        items={items}
        idx={idx}
        loading={phase === "tirage"}
        api={api}
        onAnswered={onAnswered}
        onNext={() => {
          if (idx < items.length - 1) setIdx(idx + 1);
          else finish();
        }}
        onStop={() => {
          setPhase("choix");
          setItems([]);
          if (!db || demo) setBump((b) => b + 1);
          else router.refresh();
        }}
      />
    );
  }

  if (phase === "fin") {
    return (
      <EndScreen
        subject={subject}
        meta={meta}
        level={level}
        items={items}
        next={next}
        anime={!preset}
        onRestart={(l) => void start(l)}
      />
    );
  }

  // Choix du niveau
  const total = meta.counts[level] ?? 0;
  return (
    <div className="grid gap-8 md:gap-10">
      <header>
        <BackLink href={`/calculs/${subject.slug}`}>{subject.name}</BackLink>
        <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <h1 className="t-h1 min-w-0 [overflow-wrap:anywhere]">{meta.name}</h1>
          <span className="rounded-[8px] border border-line-2 px-2 py-[3px] text-[12px] font-semibold text-muted">{tier}</span>
        </div>
        {meta.source && <p className="t-micro mt-3">{meta.source}</p>}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-8">
        <section className="card-hero p-6 sm:p-7 md:p-8" aria-labelledby="calc-niveau">
          <p id="calc-niveau" className="t-eyebrow">
            {CALC.choisirNiveau}
          </p>
          <div role="radiogroup" aria-labelledby="calc-niveau" className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
            {CALC_LEVELS.map((l) => (
              <LevelOption
                key={l}
                level={l}
                stat={p?.levels[l]}
                count={meta.counts[l] ?? 0}
                selected={l === level}
                onSelect={() => {
                  touched.current = true;
                  setLevel(l);
                }}
              />
            ))}
          </div>
          <p className="t-small mt-3 sm:hidden">{NIVEAU[level].desc}</p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center sm:gap-5">
            <button type="button" className="btn btn-primary btn-lg rl-press justify-center" disabled={total === 0} onClick={() => void start(level)}>
              {CALC.lancer}
              <ArrowRight size={17} aria-hidden />
            </button>
            <span className="t-micro">
              {NIVEAU[level].label} · {total > 0 ? `${nbQuestions(total)} au vivier` : "bientôt"}
            </span>
          </div>
          {error && (
            <p role="alert" className="t-small mt-4 text-pen">
              {error}
            </p>
          )}
        </section>

        <aside className="card-quiet p-6 md:p-7" aria-label={CALC.rappel}>
          <Formulas meta={meta} />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function LevelOption({ level, stat, count, selected, onSelect }: { level: CalcLevel; stat: LevelStat | undefined; count: number; selected: boolean; onSelect: () => void }) {
  const state = levelState(stat);
  const status =
    count === 0
      ? "bientôt"
      : state === "tenu"
        ? `tenu · ${stat!.last5Ok}/${stat!.last5N}`
        : state === "entame"
          ? `${stat!.last5Ok}/${stat!.last5N} récents`
          : "à tracer";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={count === 0}
      onClick={onSelect}
      className={
        "rl-press flex min-h-[86px] min-w-0 flex-col items-start gap-1.5 rounded-[14px] border px-3 py-3 text-left sm:min-h-[112px] sm:px-4 sm:py-3.5 transition-[border-color,background-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50 " +
        (selected ? "border-white bg-surface ring-1 ring-white" : "border-line-2 bg-[var(--control)] hover:border-[color-mix(in_oklab,var(--ink)_40%,transparent)]")
      }
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="t-h3 min-w-0 truncate text-[15px] sm:text-[17px]">{NIVEAU[level].label}</span>
        <span className="hidden sm:block">
          <StateDot state={state} />
        </span>
      </span>
      <span className="hidden text-[12.5px] leading-snug text-muted sm:block">{NIVEAU[level].desc}</span>
      <span className={"mt-auto whitespace-nowrap pt-1 font-mono text-[11px] tabular-nums sm:text-[11.5px] " + (state === "tenu" ? "font-semibold text-white" : "text-muted")}>{status}</span>
    </button>
  );
}

function StateDot({ state }: { state: ReturnType<typeof levelState> }) {
  if (state === "tenu") return <PenMark ok size={18} />;
  if (state === "entame") return <span aria-hidden className="block h-[3px] w-4 rounded-full bg-[color:var(--pencil)]" />;
  return <span aria-hidden className="block h-px w-4 bg-[repeating-linear-gradient(90deg,var(--pencil)_0_3px,transparent_3px_6px)]" />;
}

function Formulas({ meta }: { meta: CalcTypeMeta }) {
  return (
    <>
      <p className="t-eyebrow">{CALC.rappel}</p>
      <ul className="mt-4 grid gap-3">
        {meta.formulas.map((f, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-[1.55] text-body">
            <span aria-hidden className="mt-[11px] h-px w-3 shrink-0 bg-[color:var(--pencil)]" />
            <span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">{f}</span>
          </li>
        ))}
      </ul>
      {meta.traps.length > 0 && (
        <>
          <p className="t-eyebrow mt-7 text-pen">{CALC.pieges}</p>
          <ul className="mt-3 grid gap-2.5">
            {meta.traps.map((t, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-[1.55] text-muted">
                <span aria-hidden className="mt-[10px] h-px w-3 shrink-0 bg-pen opacity-70" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{t}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Le round : une question à la fois

function RoundScreen({
  subject,
  meta,
  level,
  items,
  idx,
  loading,
  api,
  onAnswered,
  onNext,
  onStop,
}: {
  subject: Props["subject"];
  meta: CalcTypeMeta;
  level: CalcLevel;
  items: RoundItem[];
  idx: number;
  loading: boolean;
  api: Api;
  onAnswered: (i: number, raw: string, r: Extract<SubmitResult, { ok: true; status: "juste" | "faux" }>) => void;
  onNext: () => void;
  onStop: () => void;
}) {
  const cur = items[idx];
  const answered = !!cur?.status;
  const n = loading ? ROUND_SIZE : items.length;
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  // nouvelle question : champ vide dès le premier rendu (pas d'ancienne saisie qui clignote)
  const [forId, setForId] = useState(cur?.q.id ?? null);
  if ((cur?.q.id ?? null) !== forId) {
    setForId(cur?.q.id ?? null);
    setInput(cur?.raw ?? "");
    setError(null);
    setHint(null);
  }
  // … et le curseur dedans
  useEffect(() => {
    if (!loading && cur && !cur.status) inputRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, loading, cur?.q.id]);

  // réponse corrigée : la correction se montre (sur mobile, on la fait monter), Entrée passe à la suite
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  useEffect(() => {
    if (!answered) return;
    nextRef.current?.focus({ preventScroll: true });
    const el = feedbackRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const petit = window.innerWidth < 768;
      if (r.top > window.innerHeight * (petit ? 0.4 : 1) - 140) el.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "BUTTON" || t.tagName === "A" || t.tagName === "SUMMARY" || t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      e.preventDefault();
      onNextRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, idx]);

  // question suivante : si l'énoncé est passé au-dessus de l'écran, il redescend
  const cardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }, [idx]);

  const parsed = useMemo(() => parseCalcInput(input), [input]);
  const ambigu = useMemo(() => parseCalcCandidates(input).length > 1, [input]);

  async function submit() {
    if (!cur || answered || pending) return;
    const raw = input.trim();
    if (!raw) return;
    if (parsed === null) {
      setError(CALC.pasUnNombre);
      return;
    }
    setPending(true);
    setError(null);
    setHint(null);
    try {
      const r = await api.submit(cur.q, raw);
      if (!r.ok) setError(r.error);
      else if (r.status === "format") {
        setHint(r.hint);
        inputRef.current?.select();
      } else onAnswered(idx, raw, r);
    } catch {
      setError(CALC.envoiRate);
    } finally {
      setPending(false);
    }
  }

  function flipSign() {
    setInput((s) => {
      const t = s.trim();
      return t.startsWith("-") || t.startsWith(String.fromCharCode(0x2212)) ? t.slice(1) : "-" + t;
    });
    inputRef.current?.focus();
  }

  const coches = Array.from({ length: n }, (_, i) => (items[i]?.status ? items[i].status === "juste" : null));
  const unit = cur ? UNIT_FIELD[cur.q.unit] : "";
  const ok = cur?.status === "juste";
  // « lu : 1 234,5 » quand la saisie a des séparateurs de milliers (pas pour « 16,500 », qui vaut les deux)
  const showRead = !answered && parsed !== null && !ambigu && (input.match(/[,.]/g)?.length ?? 0) >= 2;

  return (
    <div className="mx-auto grid w-full max-w-[780px] gap-5">
      {/* en-tête mince : le calcul, le niveau, les coches */}
      <div className="flex items-center gap-3 px-1">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">{meta.name}</div>
          <div className="t-micro truncate">
            {subject.name} · {NIVEAU[level].label}
          </div>
        </div>
        <InkBarCoches items={coches} courante={answered || loading ? undefined : idx} height={26} label={`Avancement du round : ${coches.filter((c) => c !== null).length} sur ${n}`} />
        <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted">
          <span className="font-semibold text-white">{Math.min(idx + 1, n)}</span>/{n}
        </span>
      </div>

      {loading || !cur ? (
        <section className="card-hero grid gap-4 p-6 sm:p-8 md:p-10" aria-busy>
          <p className="t-eyebrow">Tirage du round…</p>
          <span className="rl-skel block h-8 w-4/5 rounded-[10px]" />
          <span className="rl-skel block h-8 w-1/2 rounded-[10px]" />
          <div className="mt-4 grid gap-3">
            <span className="rl-skel block h-4 w-3/5 rounded-[6px]" />
            <span className="rl-skel block h-4 w-2/5 rounded-[6px]" />
          </div>
          <span className="mt-4 block h-[60px] rounded-[14px] border border-dashed border-line-2" />
        </section>
      ) : (
        <section key={cur.q.id} ref={cardRef} className="card-hero rl-in scroll-mt-24 p-6 sm:p-8 md:p-10">
          <p className="t-eyebrow">
            Question {idx + 1} sur {n}
          </p>
          <h2 className="mt-3 text-[24px] font-[680] leading-[1.14] tracking-[-0.028em] [overflow-wrap:anywhere] sm:text-[28px] md:text-[32px]">{cur.q.prompt}</h2>

          <DataSheet data={cur.q.data} className="mt-7 max-w-[560px]" />

          {!answered && (
            <>
              <form
                className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <div className="flex min-w-0 gap-2">
                  <button
                    type="button"
                    onClick={flipSign}
                    aria-label="Changer le signe"
                    className="btn btn-secondary hidden h-[60px] w-[52px] shrink-0 justify-center px-0 font-mono text-[20px] pointer-coarse:inline-flex"
                  >
                    ±
                  </button>
                  <div className="relative min-w-0 flex-1">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        if (error) setError(null);
                      }}
                      inputMode="decimal"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      placeholder="Ton résultat"
                      aria-label={`Ta réponse${unit ? ` (en ${unit})` : ""}`}
                      aria-invalid={!!error || undefined}
                      aria-describedby="calc-saisie"
                      className={
                        "input h-[60px] rounded-[14px] pl-5 font-mono text-[24px] font-semibold tabular-nums tracking-[-0.01em] placeholder:font-sans placeholder:text-[16px] placeholder:font-medium md:h-[64px] md:text-[26px] " +
                        (unit ? "pr-16" : "pr-5")
                      }
                    />
                    {unit && (
                      <span aria-hidden className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-mono text-[17px] font-semibold text-muted">
                        {unit}
                      </span>
                    )}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg rl-press h-[60px] justify-center px-7 md:h-[64px]" disabled={!input.trim() || pending}>
                  {pending ? "…" : CALC.valider}
                </button>
              </form>
              <p id="calc-saisie" className={"mt-3 text-[12.5px] leading-snug " + (error || hint ? "text-pen" : "text-muted")} role={error || hint ? "alert" : undefined}>
                {error ?? hint ?? (showRead ? `lu : ${formatCalc(parsed!, cur.q.unit, decimalsOf(parsed!))}` : CALC.saisie)}
              </p>
            </>
          )}

          {answered && (
            <div ref={feedbackRef} className="rl-in mt-8 scroll-mt-28 border-t border-line pt-7" role="status">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <PenMark ok={ok} size={28} />
                <span className={"t-h2 " + (ok ? "" : "text-pen")}>{ok ? CALC.juste : CALC.rature}</span>
                {ok && (
                  <span className="ml-auto font-mono text-[20px] font-semibold tabular-nums">{formatCalc(cur.answer ?? 0, cur.q.unit, cur.q.decimals)}</span>
                )}
              </div>
              {!ok && (
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <p className="t-eyebrow">{CALC.taReponse}</p>
                    <p className="mt-1.5 font-mono text-[19px] tabular-nums text-pen line-through decoration-2 [overflow-wrap:anywhere] md:text-[22px]">
                      {formatCalc(cur.value ?? 0, cur.q.unit, decimalsOf(cur.value ?? 0))}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="t-eyebrow">{CALC.bonneReponse}</p>
                    <p className="mt-1.5 font-mono text-[19px] font-bold tabular-nums [overflow-wrap:anywhere] md:text-[22px]">{formatCalc(cur.answer ?? 0, cur.q.unit, cur.q.decimals)}</p>
                  </div>
                </div>
              )}
              {cur.solution.length > 0 &&
                (ok ? (
                  <details className="group mt-5">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-white">
                      {CALC.voirCorrection}
                      <ChevronDown size={15} aria-hidden className="transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <Steps steps={cur.solution} className="mt-4" />
                  </details>
                ) : (
                  <div className="mt-6">
                    <p className="t-eyebrow">{CALC.correction}</p>
                    <Steps steps={cur.solution} className="mt-3" />
                  </div>
                ))}
              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button ref={nextRef} type="button" className="btn btn-primary btn-lg rl-press" onClick={onNext}>
                  {idx < items.length - 1 ? CALC.suivante : CALC.voirCopie}
                  <ArrowRight size={17} aria-hidden />
                </button>
                <span className="t-micro hidden items-center gap-1.5 md:inline-flex" aria-hidden>
                  <kbd className="kbd">Entrée</kbd>
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      <details className="card-quiet group px-5 py-4 md:px-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-semibold text-muted transition-colors hover:text-white">
          {CALC.rappel}
          <ChevronDown size={16} aria-hidden className="ml-auto transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="mt-4">
          <Formulas meta={meta} />
        </div>
      </details>

      <div className="flex justify-center">
        <button type="button" className="btn btn-ghost btn-sm text-muted" onClick={onStop}>
          {CALC.arreter}
        </button>
      </div>
    </div>
  );
}

function Steps({ steps, className = "" }: { steps: string[]; className?: string }) {
  return (
    <ol className={"grid gap-2.5 " + className}>
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-5 shrink-0 pt-[3px] text-right font-mono text-[12px] text-[color:var(--ink-3)] tabular-nums">{i + 1}</span>
          <span className="min-w-0 text-[15px] leading-[1.6] text-body tabular-nums [overflow-wrap:anywhere]">{s}</span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// La copie rendue

function EndScreen({
  subject,
  meta,
  level,
  items,
  next,
  anime,
  onRestart,
}: {
  subject: Props["subject"];
  meta: CalcTypeMeta;
  level: CalcLevel;
  items: RoundItem[];
  next: Props["next"];
  anime: boolean;
  onRestart: (l: CalcLevel) => void;
}) {
  const [copied, setCopied] = useState<"ok" | "ko" | null>(null);
  const score = items.filter((i) => i.status === "juste").length;
  const total = items.length;
  const ligne = ligneNiveau(level, score, total);
  const nl = nextLevel(level);

  async function copyAi() {
    const text = buildCalcAiText({
      subject: subject.name,
      typeName: meta.name,
      level,
      items: items.map((it) => ({
        prompt: it.q.prompt,
        data: it.q.data,
        unit: it.q.unit,
        decimals: it.q.decimals,
        value: it.value,
        correct: it.status === "juste",
        answer: it.answer ?? Number.NaN,
        solution: it.solution,
      })),
    });
    const ok = await copyText(text);
    setCopied(ok ? "ok" : "ko");
    window.setTimeout(() => setCopied(null), 2600);
  }

  const refaire = (primary: boolean) => (
    <button key="refaire" type="button" className={"btn rl-press " + (primary ? "btn-primary" : "btn-secondary")} onClick={() => onRestart(level)}>
      <RotateCcw size={15} aria-hidden />
      {CALC.refaire}
    </button>
  );
  const suivant = (primary: boolean) =>
    nl ? (
      <button key="suivant" type="button" className={"btn rl-press " + (primary ? "btn-primary" : "btn-secondary")} onClick={() => onRestart(nl)}>
        {CALC.niveauSuivant} · {NIVEAU[nl].label}
        <ArrowRight size={15} aria-hidden />
      </button>
    ) : next ? (
      <Link key="suivant" href={`/calculs/${subject.slug}/${next.key}`} className={"btn rl-press " + (primary ? "btn-primary" : "btn-secondary")}>
        {CALC.calculSuivant}
        <ArrowRight size={15} aria-hidden />
      </Link>
    ) : null;

  return (
    <div className="mx-auto grid w-full max-w-[660px] gap-10">
      <BackLink href={`/calculs/${subject.slug}`}>{subject.name}</BackLink>
      <CopieCorrigee
        className="-mt-4"
        surTitre={`${CALC.surTitre} · ${subject.name}`}
        titre={meta.name}
        meta={`${NIVEAU[level].label} · ${nQuestions(total)}`}
        score={score}
        total={total}
        questions={items.map((it) => ({ label: it.q.prompt, ok: it.status === "juste" }))}
        anime={anime}
        anneau={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Cote ton={ligne.tenu ? "encre" : "stylo"} forme="marque" label={ligne.texte} />
            {ligne.tenu && nl && <span className="t-micro">{prochainBout(NIVEAU[nl].label)}</span>}
          </div>
        }
        actions={
          <>
            {ligne.tenu ? [suivant(true), refaire(false)] : [refaire(true), suivant(false)]}
            <button type="button" className="btn btn-secondary rl-press" onClick={() => void copyAi()} aria-live="polite">
              {copied === "ok" ? <ClipboardCheck size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
              {copied === "ok" ? IA.copie : copied === "ko" ? "Copie impossible" : IA.label}
            </button>
          </>
        }
      />

      <section className="rl-section">
        <h2 className="t-h3">{CALC.copieTitre}</h2>
        <div className="grid gap-2.5">
          {items.map((it, i) => (
            <CorrectionCard key={it.q.id} n={i + 1} it={it} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CorrectionCard({ n, it }: { n: number; it: RoundItem }) {
  const ok = it.status === "juste";
  return (
    <details className="card group" open={!ok}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 md:px-5">
        <PenMark ok={ok} size={20} />
        <span className="w-7 shrink-0 font-mono text-[12px] text-[color:var(--ink-3)]">Q{n}</span>
        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium group-open:whitespace-normal">{it.q.prompt}</span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="grid gap-5 border-t border-line px-4 pb-5 pt-4 md:px-5">
        <DataSheet data={it.q.data} className="max-w-[520px] [&_dd]:text-[15px] [&_dt]:text-[14px]" />
        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="t-eyebrow">{CALC.taReponse}</p>
            <p className={"mt-1 font-mono text-[17px] tabular-nums " + (ok ? "font-semibold" : "text-pen line-through decoration-2")}>
              {it.value === null ? "—" : formatCalc(it.value, it.q.unit, decimalsOf(it.value))}
            </p>
          </div>
          <div className="min-w-0">
            <p className="t-eyebrow">{CALC.bonneReponse}</p>
            <p className="mt-1 font-mono text-[17px] font-bold tabular-nums">{it.answer === null ? "—" : formatCalc(it.answer, it.q.unit, it.q.decimals)}</p>
          </div>
        </div>
        {it.solution.length > 0 && <Steps steps={it.solution} />}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Aperçu sans contenu en ligne : la même chose, dans le navigateur

function demoApi(t: CalcType): Api {
  const byId = new Map(t.questions.map((q) => [q.id, q] as const));
  return {
    async draw(level, local) {
      const pool = t.questions.filter((q) => q.level === level).map((q) => q.id);
      const ids = pickRound(pool, historyFrom(local.map((l) => ({ questionId: l.q, correct: l.c, at: l.a }))));
      return { ok: true, questions: ids.flatMap((id) => (byId.has(id) ? [publicQuestion(byId.get(id)!)] : [])) };
    },
    async submit(pq, raw) {
      const q = byId.get(pq.id);
      const r = q ? checkCalcInput(q, raw) : null;
      if (!q || !r) return { ok: false, error: CALC.pasUnNombre };
      if (r.status === "format") return { ok: true, status: "format", hint: r.hint ?? "" };
      return { ok: true, status: r.status, value: r.value, answer: q.answer, solution: correctionSteps(q.solution), stored: false };
    },
  };
}
