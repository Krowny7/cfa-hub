"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, X } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { segThumbStyle } from "@/components/classement/Seg";
import { DuelAiCopy } from "@/components/duel/DuelAiCopy";
import { InkWatermark } from "@/components/duel/parts";
import { CopieCoches, type MarqueDuel } from "@/components/duel/CopieCoches";
import { Icone } from "@/components/adn/icons";
import { CLASSEMENT, PARTIE, motIssue } from "@/lib/voice-z2";
import { clock, decisiveQuestion, duelTopicLabel, reviewHasOpponent, type DuelReviewItem, type DuelState } from "@/lib/duels";

type Filter = "errors" | "all";

type Props = {
  state: DuelState;
  review: DuelReviewItem[];
  /** ?revue=tout ouvre directement sur « Tout » */
  initialFilter?: Filter;
};

const LETTERS = ["A", "B", "C", "D", "E"];
const letter = (i: number) => LETTERS[i] ?? String(i + 1);

/** « Hugo P. » → « Hugo P. », « maximilien_dupont » → « maximilien… » (étiquettes courtes) */
function shortName(name: string) {
  const n = name.trim();
  return n.length <= 12 ? n : `${n.slice(0, 11)}…`;
}

function dayLabel(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

type Mark = MarqueDuel;
const markOf = (answered: boolean, correct: boolean): Mark => (correct ? "ok" : answered ? "ko" : "none");

// « Revoir la partie » (/duel/<id>?revue=1) : les deux copies en coches
// (un trait d'encre par bonne réponse, la croix du correcteur par rature, la
// question décisive entourée au stylo rouge), « Copier pour l'IA » en carte
// sombre, puis les questions avec ta réponse, la bonne, l'explication et la
// réponse de l'adversaire. Voix « Le Trait » : ratures, nulle, page propre.
export function DuelReview({ state, review, initialFilter }: Props) {
  const me = state.me;
  const them = state.them;
  const finished = state.status === "finished";
  const theirName = them?.username ?? "Adversaire";
  const theirTag = shortName(theirName);
  const hasOpp = finished && reviewHasOpponent(review);
  const theyPlayed = hasOpp && review.some((r) => r.theirAnswered);

  const total = state.questionCount || review.length;
  const myScore = finished && me.score !== null ? me.score : review.filter((r) => r.isCorrect).length;
  const theirScore = finished ? them?.score ?? null : null;
  const errors = review.filter((r) => !r.isCorrect);
  const [filter, setFilter] = useState<Filter>(initialFilter ?? (errors.length > 0 ? "errors" : "all"));
  const items = filter === "all" ? review : errors;

  const won = finished && state.winnerId === me.id;
  const draw = finished && state.winnerId === null;
  const verdict = !finished ? (state.status === "declined" ? PARTIE.annule : PARTIE.expireTitre) : motIssue(won ? true : draw ? null : false);
  // Duel clos sans résultat : la date où tu l'as joué (pas celle de l'expiration)
  const day = dayLabel(finished ? state.finishedAt ?? me.finishedAt : me.finishedAt ?? state.finishedAt);

  // Croisement des deux copies (si l'adversaire a joué)
  const both = theyPlayed ? review.filter((r) => !r.isCorrect && !r.theirIsCorrect).length : 0;
  const meOnly = theyPlayed ? review.filter((r) => r.isCorrect && !r.theirIsCorrect).length : 0;
  const themOnly = theyPlayed ? review.filter((r) => !r.isCorrect && r.theirIsCorrect).length : 0;
  const decisive = theyPlayed ? decisiveQuestion(review) : null;
  const decisiveItem = decisive ? review.find((r) => r.position === decisive.position) ?? null : null;
  const decisiveIx = decisive ? review.findIndex((r) => r.position === decisive.position) : -1;

  function jump(position: number) {
    const target = review.find((r) => r.position === position);
    if (!target) return;
    if (filter === "errors" && target.isCorrect) setFilter("all");
    requestAnimationFrame(() => {
      document.getElementById(`q-${position + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const backHref = `/duel/${state.id}`;

  if (review.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-[760px] gap-6">
        <Link href={backHref} className="t-small inline-flex w-fit items-center gap-1.5 font-semibold hover:text-white">
          <ArrowLeft size={15} aria-hidden /> Retour au duel
        </Link>
        <section className="card-hero grid gap-3 p-6 md:p-8">
          <p className="kicker m-0">{PARTIE.revoir}</p>
          <h1 className="t-h1 m-0">{PARTIE.revueVide}</h1>
          <p className="t-body m-0 max-w-[540px] text-muted">{PARTIE.revueVideTexte}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[880px] gap-7 md:gap-9">
      {/* En-tête */}
      <div className="grid gap-4">
        <Link href={backHref} className="t-small inline-flex w-fit items-center gap-1.5 font-semibold hover:text-white">
          <ArrowLeft size={15} aria-hidden /> {finished ? "Résultat du duel" : "Retour au duel"}
        </Link>
        <div className="grid gap-2">
          <p className="kicker m-0 flex items-center gap-1.5">
            <Icone nom="duel" size={14} /> {PARTIE.revoir}
            {day ? ` · ${day}` : ""}
          </p>
          <h1 className="t-h1 m-0">{them ? `Contre ${theirName}` : "Duel au hasard"}</h1>
          <p className="t-small m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={"rounded-[7px] px-2 py-0.5 text-[12.5px] font-bold " + (won ? "bg-white text-black" : "bg-surface-2 text-white")}>{verdict}</span>
            <span>
              <b className="font-mono font-semibold tabular-nums text-white">
                {myScore}
                {theirScore !== null ? ` – ${theirScore}` : ""}
              </b>{" "}
              sur {total}
            </span>
            {finished && me.seconds !== null && (
              <>
                <span aria-hidden>·</span>
                <span>
                  <span className="font-mono tabular-nums">{clock(me.seconds)}</span>
                  {them?.seconds != null && (
                    <>
                      {" "}
                      contre <span className="font-mono tabular-nums">{clock(them.seconds)}</span>
                    </>
                  )}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Les deux copies, question par question */}
      <section className="card-quiet grid gap-4 p-5 md:p-6" aria-label="Les deux copies, question par question">
        <CopieStrip
          label="Toi"
          score={myScore}
          total={total}
          marks={review.map((r) => markOf(r.selectedIndex !== null, r.isCorrect))}
          onPick={(i) => jump(review[i].position)}
          entoure={decisiveIx}
          numbered={!theyPlayed}
        />
        {hasOpp &&
          (theyPlayed ? (
            <CopieStrip
              label={theirName}
              score={theirScore ?? review.filter((r) => r.theirIsCorrect).length}
              total={total}
              marks={review.map((r) => markOf(!!r.theirAnswered, !!r.theirIsCorrect))}
              onPick={(i) => jump(review[i].position)}
              entoure={decisiveIx}
              numbered
            />
          ) : (
            <p className="t-small m-0">{PARTIE.forfaitEux(theirName)}</p>
          ))}
        {theyPlayed && (
          <div className="grid gap-3 border-t border-line pt-3.5">
            <p className="t-micro m-0 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                {PARTIE.communes} <b className="font-mono font-semibold text-white">{both}</b>
              </span>
              <span>
                {PARTIE.justeToi} <b className="font-mono font-semibold text-white">{meOnly}</b>
              </span>
              <span>
                {PARTIE.justeLui(theirTag)} <b className="font-mono font-semibold text-white">{themOnly}</b>
              </span>
            </p>
            {decisive && decisiveItem && (
              <button
                type="button"
                onClick={() => jump(decisive.position)}
                className="group flex w-fit max-w-full items-center gap-2.5 text-left text-[13.5px] leading-snug"
              >
                <DecisiveMark />
                <span className="min-w-0">
                  <b className="font-mono font-semibold">Q{decisive.position + 1}</b> · {duelTopicLabel(decisiveItem.topic)} :{" "}
                  <span className="text-muted">{PARTIE.decisive(decisive.forMe, theirName)}</span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Copier pour l'IA : le point focal */}
      <section className="card-ink p-6 md:p-8" aria-label="Copier pour l'IA">
        <InkWatermark size={280} className="-right-14 top-1/2 -translate-y-1/2" />
        <DuelAiCopy review={review} ctx={{ myScore, theirScore, total }} layout="block" />
      </section>

      {/* Questions */}
      <section className="grid gap-5" aria-label="Questions du duel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filtrer les questions" className="seg" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <span aria-hidden className="seg-thumb" style={segThumbStyle(filter === "errors" ? 0 : 1, 2)} />
            {(
              [
                ["errors", PARTIE.mesRatures, errors.length],
                ["all", PARTIE.tout, review.length],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className="seg-item px-4 sm:px-5"
              >
                {label} <span className="font-mono text-[12px] tabular-nums opacity-70">{n}</span>
              </button>
            ))}
          </div>
          {theyPlayed && (
            <p className="t-micro m-0 flex items-center gap-2">
              <Tag tone="quiet">{theirTag}</Tag> = réponse de {theirName}
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="card-quiet grid gap-1 p-6 text-center">
            <p className="t-h3 m-0">{PARTIE.pagePropre}</p>
            <p className="t-small m-0">{PARTIE.pagePropreTexte}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((q) => (
              <ReviewCard key={q.position} q={q} total={total} theirName={theirName} theirTag={theirTag} showTheirs={theyPlayed} decisive={decisive?.position === q.position} />
            ))}
          </div>
        )}
      </section>

      {/* Pied : copier à nouveau, sans remonter */}
      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-start sm:justify-between">
        <DuelAiCopy review={review} ctx={{ myScore, theirScore, total }} layout="buttons" />
        <Link href="/duel" className="inline-flex w-fit items-center gap-1.5 pt-2.5 text-[13.5px] font-semibold text-muted hover:text-white">
          {CLASSEMENT.tousDuels} <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/** Une copie : nom, une coche par question (chacune mène à sa correction), score. */
function CopieStrip({
  label,
  score,
  total,
  marks,
  onPick,
  entoure = -1,
  numbered = false,
}: {
  label: string;
  score: number;
  total: number;
  marks: Mark[];
  onPick: (index: number) => void;
  /** index de la question décisive (entourée au stylo rouge), -1 sinon */
  entoure?: number;
  numbered?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[120px_minmax(0,1fr)_64px]">
      <span className="truncate text-[14px] font-semibold">{label}</span>
      <span className="text-right font-mono text-[13px] tabular-nums sm:order-3">
        <b className="font-semibold">{score}</b>
        <span className="text-muted">/{total}</span>
      </span>
      <CopieCoches
        className="col-span-2 sm:order-2 sm:col-span-1"
        marks={marks}
        label={`${label}, question par question`}
        onPick={onPick}
        entoure={entoure >= 0 ? entoure : null}
        numbered={numbered}
        height={26}
      />
    </div>
  );
}

/** « Décisive » : la question entourée au stylo rouge, comme dans les coches (la main du correcteur). */
function DecisiveMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center gap-1.5 rounded-[7px] font-sans font-bold text-pen shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--pen)_40%,transparent)] " +
        (small ? "px-1.5 py-px text-[11.5px]" : "px-2 py-0.5 text-[12px]")
      }
    >
      <svg aria-hidden width={small ? 11 : 13} height={small ? 11 : 13} viewBox="-8 -8 16 16" className="overflow-visible">
        <ellipse cx={0} cy={0} rx={5.2} ry={6.6} fill="none" stroke="currentColor" strokeWidth={1.6} transform="rotate(-14)" />
      </svg>
      {PARTIE.decisiveMot}
    </span>
  );
}

function Tag({ tone, children }: { tone: "ink" | "pen" | "quiet"; children: React.ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-[6px] px-1.5 py-px text-[11.5px] font-semibold leading-[1.5] " +
        (tone === "ink" ? "bg-white text-black" : tone === "pen" ? "bg-pen/12 text-pen" : "bg-surface-2 text-muted shadow-[inset_0_0_0_1px_var(--line)]")
      }
    >
      {children}
    </span>
  );
}

/** Une question corrigée : ta réponse, la bonne, la sienne, l'explication. */
function ReviewCard({
  q,
  total,
  theirName,
  theirTag,
  showTheirs,
  decisive = false,
}: {
  q: DuelReviewItem;
  total: number;
  theirName: string;
  theirTag: string;
  showTheirs: boolean;
  /** la question qui a fait basculer le duel */
  decisive?: boolean;
}) {
  const mine = markOf(q.selectedIndex !== null, q.isCorrect);
  const theirs = markOf(!!q.theirAnswered, !!q.theirIsCorrect);
  const theirIdx = showTheirs && q.theirAnswered ? q.theirSelectedIndex ?? null : null;

  return (
    <article id={`q-${q.position + 1}`} className="card rl-in min-w-0 scroll-mt-28 p-5 md:p-7" aria-label={`Question ${q.position + 1} sur ${total}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="t-micro m-0 flex min-w-0 items-center gap-2 font-mono">
          <span className="truncate">
            Q{q.position + 1}
            <span className="font-sans"> · {duelTopicLabel(q.topic)}</span>
          </span>
          {decisive && <DecisiveMark small />}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={
              "inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-[12px] font-semibold " +
              (mine === "ok" ? "bg-surface-2 text-white" : mine === "ko" ? "bg-pen/10 text-pen" : "bg-surface-2 text-muted")
            }
          >
            {mine === "ok" ? <Check size={13} aria-hidden /> : mine === "ko" ? <X size={13} aria-hidden /> : <Minus size={13} aria-hidden />}
            {PARTIE.etiquette(mine)}
          </span>
          {showTheirs && (
            <span className="inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-[12px] font-medium text-muted shadow-[inset_0_0_0_1px_var(--line)]">
              {theirTag} :{" "}
              {PARTIE.marque(theirs)}
            </span>
          )}
        </div>
      </div>

      <QuestionPrompt
        text={q.prompt}
        className="mt-3 text-[15.5px] font-semibold leading-[1.6] tracking-[-0.006em] break-words [overflow-wrap:anywhere] md:text-[16px]"
      />

      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {q.choices.map((c, ci) => {
          const correct = ci === q.correctIndex;
          const picked = ci === q.selectedIndex;
          const state = correct ? "correct" : picked ? "wrong" : "dim";
          return (
            <li
              key={ci}
              className={
                "flex items-start gap-3 rounded-[12px] border px-3 py-2.5 text-[14.5px] leading-[1.5] " +
                (state === "correct"
                  ? "border-white bg-surface font-semibold"
                  : state === "wrong"
                    ? "border-pen/60 bg-pen/[0.04] text-pen"
                    : "border-line text-muted")
              }
            >
              <span
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded-[7px] font-mono text-[12px] font-semibold " +
                  (state === "correct" ? "bg-white text-black" : state === "wrong" ? "bg-pen text-black" : "bg-surface-2")
                }
                aria-label={state === "correct" ? `${letter(ci)}, bonne réponse` : letter(ci)}
              >
                {state === "correct" ? <Check size={13} strokeWidth={2.6} aria-hidden /> : state === "wrong" ? <X size={13} strokeWidth={2.6} aria-hidden /> : letter(ci)}
              </span>
              <span className="min-w-0 flex-1 pt-[1px] break-words [overflow-wrap:anywhere]">{c}</span>
              <span className="flex shrink-0 flex-wrap items-center justify-end gap-1 pt-[1px]">
                {correct && <span className="t-micro hidden pr-1 font-semibold text-white sm:inline">Bonne réponse</span>}
                {picked && <Tag tone={correct ? "ink" : "pen"}>Toi</Tag>}
                {theirIdx === ci && (
                  <span title={`Réponse de ${theirName}`}>
                    <Tag tone="quiet">{theirTag}</Tag>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {q.explanation &&
        (q.isCorrect ? (
          <details className="group mt-4 rounded-[12px] bg-surface-2/60">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-muted hover:text-white [&::-webkit-details-marker]:hidden md:px-5">
              Voir l&apos;explication
              <ArrowRight size={13} className="transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="px-4 pb-4 md:px-5">
              <Explanation text={q.explanation} />
            </div>
          </details>
        ) : (
          <div className="mt-4 rounded-[12px] bg-surface-2/60 p-4 md:px-5">
            <p className="t-eyebrow m-0">Explication</p>
            <Explanation text={q.explanation} className="mt-1.5" />
          </div>
        ))}
    </article>
  );
}

/** Explication : retours à la ligne gardés ; un tableau (tabulations) passe par QuestionPrompt. */
function Explanation({ text, className = "" }: { text: string; className?: string }) {
  const cls = "text-[14px] leading-[1.6] text-body break-words [overflow-wrap:anywhere] " + className;
  if (text.includes("\t")) return <QuestionPrompt text={text} compact className={cls} />;
  return <p className={"m-0 whitespace-pre-wrap " + cls}>{text}</p>;
}
