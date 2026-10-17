"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { MarqueQuestion } from "@/components/MarqueQuestion";
import { Ticks, type TickMark } from "@/components/defi/parts";
import { poserTrait } from "@/components/adn/AnneauDuJourEvents";
import { AnnonceTrophee } from "@/components/trophees/AnnonceTrophee";
import { duelTopicLabel } from "@/lib/duels";
import { finishEclair, type EclairFinish } from "@/lib/eclair";
import { verdictCopie } from "@/lib/voice-z2c";
import PctScore from "@/components/adn/PctScore";
import {
  REVOIR,
  lancerRevoir,
  ligneRevisions,
  lireMesRevisions,
  pastilleRevision,
  repondreRevoir,
  type EffetRature,
  type QuestionRevoir,
  type Revisions,
} from "@/lib/revisions";

// La séance « À revoir » (V3 §5.2) : la file du jour (ratures sèches, puis
// rappels), une question à la fois, corrigée tout de suite, comme une série
// éclair (mêmes cartes ; la série vit côté serveur : revoir_lancer,
// revoir_repondre, eclair_finish, on la retrouve en revenant). Une rature
// réussie se raye sous les yeux, ou reste à l'encre fraîche si elle a été
// manquée il y a moins de 24 h. Le bilan dit combien reviendront demain, puis
// « C'est assez pour aujourd'hui ».

const LETTERS = ["A", "B", "C", "D", "E"];
const letter = (i: number) => LETTERS[i] ?? String(i + 1);
/** Une séance a besoin d'au moins 5 questions dues. */
const MIN_SEANCE = 5;

type Phase = "depart" | "loading" | "play" | "finishing" | "done" | "vide" | "error";
type Question = QuestionRevoir & { effet?: EffetRature };
type Resultat = EclairFinish & { marks: TickMark[]; demain: number | null; depuis: string };

export function RevoirRunner({ taille, file, destination }: { taille: number; file: Revisions; destination: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [phase, setPhase] = useState<Phase>("depart");
  const [serie, setSerie] = useState<{ id: string; startedAt: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vide, setVide] = useState<{ aujourdhui: number; demain: number }>({ aujourdhui: file.aujourdhui, demain: file.demain });
  const [result, setResult] = useState<Resultat | null>(null);
  const finishingRef = useRef(false);

  const n = questions.length;
  const q = questions[current] ?? null;
  const answered = q !== null && q.selectedIndex !== null;
  const justes = questions.filter((x) => x.selectedIndex !== null && x.selectedIndex === x.correctIndex).length;
  const marks: TickMark[] = questions.map((x, i) =>
    x.selectedIndex !== null ? (x.selectedIndex === x.correctIndex ? "ok" : "ko") : i === current && phase === "play" ? "current" : "todo",
  );

  const finish = useCallback(
    async (id: string, startedAt: string, qs: Question[]) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setPhase("finishing");
      const m: TickMark[] = qs.map((x) => (x.selectedIndex === null ? "none" : x.selectedIndex === x.correctIndex ? "ok" : "ko"));
      try {
        const r = await finishEclair(supabase, id);
        // la séance rendue : autant de traits que de réponses (anneau du jour)
        if (r.total > 0) poserTrait(r.total);
        const apres = await lireMesRevisions(supabase).catch(() => null);
        setResult({ ...r, marks: m, demain: apres?.complet ? apres.demain : null, depuis: startedAt });
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        finishingRef.current = false;
        setPhase("play");
      }
    },
    [supabase],
  );

  /** Lance la séance du jour, ou la reprend ; « auto » : seulement pour savoir s'il y en a une en cours. */
  const start = useCallback(
    async (auto = false) => {
      if (!auto) setPhase("loading");
      setError(null);
      setSelected(null);
      finishingRef.current = false;
      const r = await lancerRevoir(supabase, taille);
      if (r.kind === "vide") {
        setVide({ aujourdhui: r.aujourdhui, demain: r.demain });
        return setPhase("vide");
      }
      if (r.kind === "soon" || r.kind === "error") {
        if (auto) return setPhase("vide");
        setError(r.kind === "error" ? r.message : null);
        return setPhase("error");
      }
      setSerie({ id: r.serie.id, startedAt: r.serie.startedAt });
      setQuestions(r.serie.questions);
      if (auto) return setPhase("depart");
      const first = r.serie.questions.findIndex((x) => x.selectedIndex === null);
      // séance reprise déjà toute répondue : on la rend
      if (first < 0) {
        setCurrent(r.serie.questions.length - 1);
        setPhase("play");
        void finish(r.serie.id, r.serie.startedAt, r.serie.questions);
        return;
      }
      setCurrent(first);
      setPhase("play");
    },
    [finish, supabase, taille],
  );

  // Trop peu de questions dues : une séance du jour peut quand même être en cours.
  const sonde = useRef(false);
  useEffect(() => {
    if (sonde.current || file.aujourdhui >= MIN_SEANCE) return;
    sonde.current = true;
    void start(true);
  }, [file.aujourdhui, start]);

  const validate = useCallback(async () => {
    if (!q || selected === null || answered || sending || phase !== "play" || !serie) return;
    setSending(true);
    setError(null);
    try {
      const r = await repondreRevoir(supabase, serie.id, q.position, selected);
      setQuestions((prev) =>
        prev.map((x) =>
          x.position === q.position ? { ...x, selectedIndex: r.selectedIndex, correctIndex: r.correctIndex, explanation: r.explanation, effet: r.rature } : x,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [answered, phase, q, selected, sending, serie, supabase]);

  const next = useCallback(() => {
    if (!answered || phase !== "play") return;
    const reste = questions.findIndex((x, i) => i > current && x.selectedIndex === null);
    const avant = questions.findIndex((x) => x.selectedIndex === null);
    const suivante = reste >= 0 ? reste : avant;
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (suivante < 0) {
      if (serie) void finish(serie.id, serie.startedAt, questions);
      return;
    }
    setCurrent(suivante);
  }, [answered, current, finish, phase, questions, serie]);

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

  if (phase === "depart") {
    const enCours = questions.length > 0;
    const aFaire = enCours ? questions.filter((x) => x.selectedIndex === null).length : Math.min(taille, file.aujourdhui);
    const ligne = ligneRevisions(file);
    return (
      <section data-depart className="card rl-in mx-auto grid w-full max-w-[680px] gap-4 p-6 md:p-8">
        <div className="grid gap-1.5">
          <p className="kicker m-0 flex items-center gap-1.5">
            <RotateCcw size={13} aria-hidden /> {REVOIR.kicker}
          </p>
          <h1 className="t-h1 m-0">{REVOIR.titre}</h1>
          <p className="t-body m-0 text-muted">{REVOIR.promesse}</p>
        </div>
        {ligne && <p className="t-num m-0 text-[17px]">{ligne}</p>}
        {!enCours && REVOIR.depart(file) && <p className="t-micro m-0">{REVOIR.depart(file)}</p>}
        {(enCours || file.aujourdhui >= MIN_SEANCE) && (
          <button type="button" className="btn btn-primary min-h-[44px] w-full sm:w-fit" onClick={() => void start()} autoFocus>
            {enCours ? REVOIR.reprendre(aFaire) : REVOIR.lancer(aFaire)}
            <ArrowRight size={16} aria-hidden />
          </button>
        )}
      </section>
    );
  }

  if (phase === "vide") {
    return (
      <section className="card rl-in mx-auto grid w-full max-w-[680px] gap-3 p-6 md:p-8">
        <p className="kicker m-0 flex items-center gap-1.5">
          <RotateCcw size={13} aria-hidden /> {REVOIR.nom}
        </p>
        <h1 className="t-h2 m-0">{REVOIR.videTitre}</h1>
        <p className="t-body m-0 text-muted">{REVOIR.videTexte(vide.aujourdhui, vide.demain)}</p>
        <Link href={destination} className="btn btn-secondary min-h-[44px] w-full sm:w-fit">
          {REVOIR.assez}
        </Link>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="card rl-in mx-auto grid w-full max-w-[680px] gap-4 p-6 md:p-8">
        <h2 className="t-h2 m-0">{REVOIR.erreurTitre}</h2>
        {error && (
          <p role="alert" className="t-small m-0 text-muted">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-primary min-h-[44px] w-fit" onClick={() => void start()}>
          {REVOIR.reessayer}
        </button>
      </section>
    );
  }

  if (phase === "done" && result) return <Bilan result={result} destination={destination} />;

  return (
    <div className="grid gap-5 md:gap-6">
      {/* En-tête : « À revoir · 7/15 », les justes, puis les coches */}
      <header className="sticky top-[72px] z-30 rounded-[18px] border border-line bg-surface/90 px-4 py-3 shadow-[var(--shadow-1)] backdrop-blur-md md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-[14px] font-bold md:text-[16px]">
              <RotateCcw size={15} aria-hidden className="shrink-0" /> {n > 0 ? REVOIR.enTete(Math.min(current + 1, n), n) : REVOIR.nom}
            </div>
          </div>
          {n > 0 && (
            <div className="min-w-0 text-right">
              <div className="font-mono text-[14px] font-semibold tabular-nums md:text-[16px]">
                {justes}
                <span className="font-normal text-muted">/{n}</span>
              </div>
              <div className="t-micro truncate">{REVOIR.justes}</div>
            </div>
          )}
        </div>
        {/* jusqu'à 25 coches : sur leur propre ligne, comme les 30 du jour */}
        {n > 0 && <Ticks className="mt-3" marks={marks} label="Ta séance" height={26} />}
      </header>

      {phase === "loading" || !q ? (
        <section className="card rl-in mx-auto grid w-full max-w-[820px] gap-4 p-6 md:p-8" aria-busy>
          <p className="kicker m-0">{REVOIR.preparation}</p>
          <div className="grid gap-2.5" aria-hidden>
            <span className="block h-5 w-4/5 rounded-[8px] bg-surface-2" />
            <span className="block h-5 w-3/5 rounded-[8px] bg-surface-2" />
            <span className="mt-3 block h-12 rounded-[14px] border border-dashed border-line-2" />
            <span className="block h-12 rounded-[14px] border border-dashed border-line-2" />
          </div>
        </section>
      ) : (
        <div className="mx-auto grid w-full max-w-[820px] gap-4">
          <div className="flex min-h-[26px] flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <p className="kicker m-0 min-w-0 truncate">{REVOIR.question(q.position + 1, n, duelTopicLabel(q.topic))}</p>
            <div className="flex items-center gap-2">
              <span className="t-micro rounded-full border border-line px-2.5 py-0.5">{pastilleRevision(q.genre, q.palier)}</span>
              {answered && <MarqueQuestion questionId={q.id} source="eclair" />}
            </div>
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
                  {questions.every((x) => x.selectedIndex !== null) ? REVOIR.bilan : REVOIR.suivante}
                  <ArrowRight size={16} aria-hidden />
                </button>
              ) : (
                <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={selected === null || sending} onClick={() => void validate()}>
                  {sending ? REVOIR.envoi : REVOIR.valider}
                  <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-muted">
            <span>{REVOIR.regle}</span>
            {questions.some((x) => x.selectedIndex !== null) && !questions.every((x) => x.selectedIndex !== null) && serie && (
              <button type="button" onClick={() => void finish(serie.id, serie.startedAt, questions)} className="min-h-[44px] font-semibold transition-colors hover:text-white">
                {REVOIR.arreter}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Ce que la réponse juste a fait au carnet : rayée, encre fraîche, scellée. */
function texteJuste(effet: EffetRature | undefined): string {
  if (effet === "rayee") return REVOIR.rayee;
  if (effet === "fraiche") return REVOIR.fraiche;
  if (effet === "scellee") return REVOIR.scellee;
  return REVOIR.juste;
}

/** La question tout juste corrigée (les cartes de la série éclair), avec l'effet sur le carnet. */
function Corrigee({ q }: { q: Question }) {
  const ok = q.selectedIndex === q.correctIndex;
  return (
    <div className="grid gap-4">
      <ul className="m-0 grid grid-cols-[minmax(0,1fr)] list-none gap-2 p-0" aria-label="Correction">
        {q.choices.map((c, ci) => {
          const state = ci === q.correctIndex ? "correct" : ci === q.selectedIndex ? "wrong" : "dim";
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
        <p className={"m-0 text-[14.5px] font-bold " + (ok ? "" : "text-pen")}>
          {ok && q.effet === "rayee" ? <s className="decoration-2">{texteJuste(q.effet)}</s> : ok ? texteJuste(q.effet) : REVOIR.rate(letter(q.correctIndex ?? 0))}
        </p>
        {q.explanation && <p className="m-0 mt-1.5 whitespace-pre-wrap text-[14px] leading-[1.6] text-body break-words [overflow-wrap:anywhere]">{q.explanation}</p>}
      </div>
    </div>
  );
}

/** Le bilan : « 15 revues · 13 justes · demain 22 », l'XP, les trophées, et « C'est assez pour aujourd'hui ». */
function Bilan({ result, destination }: { result: Resultat; destination: string }) {
  const total = result.total || result.marks.length;
  return (
    <div className="mx-auto grid w-full max-w-[820px] gap-4">
      <section className="card-hero rl-in grid gap-5 p-6 md:p-8" aria-label={REVOIR.rendue}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="t-micro m-0 flex items-center gap-1.5 font-semibold">
              <RotateCcw size={13} aria-hidden /> {REVOIR.nom} · {REVOIR.rendue.toLowerCase()}
            </p>
            <h2 className="t-h1 m-0 mt-1.5">{verdictCopie(result.score, total)}</h2>
          </div>
          <p className="m-0 shrink-0 text-right leading-none" aria-label={`${result.score} sur ${total}`}>
            <span className="t-num text-[52px] sm:text-[60px] md:text-[76px]">{result.score}</span>
            <span className="font-mono text-[15px] text-muted">/{total}</span>
            <PctScore justes={result.score} total={total} sep={false} className="mt-1.5 block text-[13px]" />
          </p>
        </div>
        <Ticks marks={result.marks} label="Ta séance" />
        <p className="t-small m-0 font-mono">
          {REVOIR.resume(total, result.score, result.demain)}
          {result.xpAwarded > 0 ? ` · ${REVOIR.xp(result.xpAwarded)}` : ""}
        </p>
        <AnnonceTrophee depuis={result.depuis} />
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={destination} className="btn btn-primary min-h-[44px]" autoFocus>
            {REVOIR.assez}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
