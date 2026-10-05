"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Minus, X } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { segThumbStyle } from "@/components/classement/Seg";
import { DefiAiCopy } from "@/components/defi/DefiAiCopy";
import { BackLink, Filigrane, Ticks, reviewMarks } from "@/components/defi/parts";
import { clock, duelTopicLabel } from "@/lib/duels";
import { DAILY_HREF, dayHref, dayLabel, rankLine, type DailyInfo, type DailyReviewItem } from "@/lib/daily";
import { DEFI, verdictCopie } from "@/lib/voice-z2c";
import { MarqueQuestion } from "@/components/MarqueQuestion";

type Filter = "errors" | "all";

type Props = {
  /** le défi, avec ma copie rendue */
  info: DailyInfo;
  review: DailyReviewItem[];
  /** ?revue=tout ouvre directement sur « Tout » */
  initialFilter?: Filter;
};

const LETTERS = ["A", "B", "C", "D", "E"];
const letter = (i: number) => LETTERS[i] ?? String(i + 1);
/** La réussite des joueurs n'a de sens qu'à partir de 3 copies. */
const MIN_PLAYERS_FOR_RATE = 3;

// Revue de ma copie du jour (/defi/<jour>?revue=1) : mes coches, la question
// qui a le plus résisté aux joueurs, « Copier pour l'IA » en carte sombre,
// puis chaque question avec ma réponse, la bonne, l'explication et la part
// des joueurs qui l'ont trouvée.
export function DefiReview({ info, review, initialFilter }: Props) {
  const me = info.me;
  const total = me?.total ?? (review.length || info.questionCount);
  const score = me?.score ?? review.filter((r) => r.isCorrect).length;
  const errors = review.filter((r) => !r.isCorrect);
  const [filter, setFilter] = useState<Filter>(initialFilter ?? (errors.length > 0 ? "errors" : "all"));
  const items = filter === "all" ? review : errors;
  const players = review[0]?.players ?? info.players;
  const showRates = players >= MIN_PLAYERS_FOR_RATE;
  const hardest = showRates
    ? [...review].filter((r) => r.successRate !== null).sort((a, b) => (a.successRate ?? 0) - (b.successRate ?? 0) || a.position - b.position)[0] ?? null
    : null;
  const backHref = info.isToday ? DAILY_HREF : dayHref(info.day);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const place = rankLine(me?.rank ?? null, players);

  function jump(position: number) {
    const target = review.find((r) => r.position === position);
    if (!target) return;
    if (filter === "errors" && target.isCorrect) setFilter("all");
    requestAnimationFrame(() => {
      document.getElementById(`q-${position + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Lien direct vers une question (#q-7, depuis les coches du résultat) :
  // une question juste n'est que dans « Tout ».
  useEffect(() => {
    const m = /^#q-([0-9]+)$/.exec(window.location.hash);
    if (!m) return;
    const position = Number(m[1]) - 1;
    const target = review.find((r) => r.position === position);
    if (!target) return;
    if (target.isCorrect) setFilter("all");
    const t = setTimeout(() => document.getElementById(`q-${position + 1}`)?.scrollIntoView({ block: "start" }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (review.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-[760px] gap-6">
        <BackLink href={backHref}>{DEFI.retourDefi}</BackLink>
        <section className="card-hero grid gap-3 p-6 md:p-8">
          <p className="kicker m-0">{DEFI.revueKicker(dayLabel(info.day, "long", info.today))}</p>
          <h1 className="t-h1 m-0">{DEFI.correctionIndispo}</h1>
          <p className="t-body m-0 max-w-[540px] text-muted">{DEFI.reviewEmpty}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[880px] gap-7 md:gap-9">
      {/* En-tête */}
      <div className="grid gap-4">
        <BackLink href={backHref}>{info.isToday ? DEFI.tuile.label : DEFI.retourJour(dayLabel(info.day, "day", info.today))}</BackLink>
        <div className="grid gap-2">
          <p className="kicker m-0">{DEFI.revueKicker(dayLabel(info.day, "long", info.today))}</p>
          <h1 className="t-h1 m-0">{DEFI.revueTitre(dayLabel(info.day, "day", info.today))}</h1>
          <p className="t-small m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={"rounded-[7px] px-2 py-0.5 text-[12.5px] font-bold " + (pct >= 70 ? "bg-white text-black" : "bg-surface-2 text-white")}>
              {verdictCopie(score, total).replace(/[.]$/, "")}
            </span>
            <span>
              <b className="font-mono font-semibold tabular-nums text-white">{score}</b> sur {total}
            </span>
            {place && (
              <>
                <span aria-hidden>·</span>
                <span>{place}</span>
              </>
            )}
            {me?.seconds != null && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono tabular-nums">{clock(me.seconds)}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Ma copie, question par question */}
      <section className="card-quiet grid gap-4 p-5 md:p-6" aria-label={DEFI.coches}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-semibold">{DEFI.taCopie}</span>
          <span className="font-mono text-[13px] tabular-nums">
            <b className="font-semibold">{score}</b>
            <span className="text-muted">/{total}</span>
          </span>
        </div>
        <Ticks marks={reviewMarks(review)} label={DEFI.coches} numbered onPick={jump} />
        {hardest && (
          <div className="border-t border-line pt-3.5">
            <button type="button" onClick={() => jump(hardest.position)} className="group flex w-fit max-w-full items-center gap-2.5 text-left text-[13.5px] leading-snug">
              <span className="inline-flex shrink-0 items-center rounded-[7px] bg-white px-2 py-0.5 text-[12px] font-bold text-black">{DEFI.hardest}</span>
              <span className="min-w-0">
                <b className="font-mono font-semibold">Q{hardest.position + 1}</b> · {duelTopicLabel(hardest.topic)} :{" "}
                <span className="text-muted">{DEFI.foundBy(hardest.successRate ?? 0, hardest.isCorrect)}</span>
              </span>
              <ArrowRight size={14} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>
        )}
      </section>

      {/* Copier pour l'IA : le point focal */}
      <section className="card-ink p-6 md:p-8" aria-label={DEFI.iaTout}>
        <Filigrane size={280} className="-right-14 top-1/2 -translate-y-1/2" />
        <DefiAiCopy review={review} ctx={{ day: info.day, score, total, rank: me?.rank ?? null, players }} layout="block" />
      </section>

      {/* Questions */}
      <section className="grid gap-5" aria-label="Questions du jour">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filtrer les questions" className="seg" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <span aria-hidden className="seg-thumb" style={segThumbStyle(filter === "errors" ? 0 : 1, 2)} />
            {(
              [
                ["errors", DEFI.mesRatures, errors.length],
                ["all", DEFI.tout, review.length],
              ] as const
            ).map(([key, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className="seg-item px-4 sm:px-5">
                {label} <span className="font-mono text-[12px] tabular-nums opacity-70">{n}</span>
              </button>
            ))}
          </div>
          {showRates && <p className="t-micro m-0">{DEFI.copiesCeJour(players)}</p>}
        </div>

        {items.length === 0 ? (
          <div className="card-quiet grid gap-1 p-6 text-center">
            <p className="t-h3 m-0">{DEFI.pagePropre}</p>
            <p className="t-small m-0">{DEFI.pagePropreTexte}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((q) => (
              <ReviewCard key={q.position} q={q} total={total} showRate={showRates} />
            ))}
          </div>
        )}
      </section>

      {/* Pied : copier à nouveau, sans remonter */}
      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-start sm:justify-between">
        <DefiAiCopy review={review} ctx={{ day: info.day, score, total, rank: me?.rank ?? null, players }} layout="buttons" />
        <a href={DAILY_HREF} className="inline-flex w-fit items-center gap-1.5 pt-2.5 text-[13.5px] font-semibold text-muted hover:text-white">
          {DEFI.aujourdhui} <ArrowRight size={14} aria-hidden />
        </a>
      </div>
    </div>
  );
}

function Tag({ tone, children }: { tone: "ink" | "pen"; children: React.ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-[6px] px-1.5 py-px text-[11.5px] font-semibold leading-[1.5] " +
        (tone === "ink" ? "bg-white text-black" : "bg-pen/12 text-pen")
      }
    >
      {children}
    </span>
  );
}

/** Une question corrigée : ma réponse, la bonne, l'explication, la réussite des joueurs. */
function ReviewCard({ q, total, showRate }: { q: DailyReviewItem; total: number; showRate: boolean }) {
  const mine = q.isCorrect ? "ok" : q.selectedIndex !== null ? "ko" : "none";
  return (
    <article id={`q-${q.position + 1}`} className="card rl-in min-w-0 scroll-mt-28 p-5 md:p-7" aria-label={`Question ${q.position + 1} sur ${total}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="t-micro m-0 min-w-0 truncate font-mono">
          Q{q.position + 1}
          <span className="font-sans"> · {duelTopicLabel(q.topic)}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <MarqueQuestion questionId={q.questionId} source="defi" />
          <span
            className={
              "inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 text-[12px] font-semibold " +
              (mine === "ok" ? "bg-surface-2 text-white" : mine === "ko" ? "bg-pen/10 text-pen" : "bg-surface-2 text-muted")
            }
          >
            {mine === "ok" ? <Check size={13} aria-hidden /> : mine === "ko" ? <X size={13} aria-hidden /> : <Minus size={13} aria-hidden />}
            {DEFI.etiquette(mine)}
          </span>
          {showRate && q.successRate !== null && (
            <span
              className="inline-flex items-center gap-1 rounded-[8px] px-2 py-0.5 font-mono text-[12px] font-medium tabular-nums text-muted shadow-[inset_0_0_0_1px_var(--line)]"
              title={`${q.successCount} joueur${q.successCount > 1 ? "s" : ""} sur ${q.players} ont trouvé`}
            >
              <span className="font-sans">{DEFI.trouveePar}</span> {q.successRate}&nbsp;%
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
                (state === "correct" ? "border-white bg-surface font-semibold" : state === "wrong" ? "border-pen/60 bg-pen/[0.04] text-pen" : "border-line text-muted")
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
                {correct && <span className="t-micro hidden pr-1 font-semibold text-white sm:inline">{DEFI.bonneReponse}</span>}
                {picked && <Tag tone={correct ? "ink" : "pen"}>{DEFI.toiEtiquette}</Tag>}
              </span>
            </li>
          );
        })}
      </ul>

      {q.explanation &&
        (q.isCorrect ? (
          <details className="group mt-4 rounded-[12px] bg-surface-2/60">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold text-muted hover:text-white [&::-webkit-details-marker]:hidden md:px-5">
              {DEFI.voirExplication}
              <ArrowRight size={13} className="transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="px-4 pb-4 md:px-5">
              <Explanation text={q.explanation} />
            </div>
          </details>
        ) : (
          <div className="mt-4 rounded-[12px] bg-surface-2/60 p-4 md:px-5">
            <p className="t-eyebrow m-0">{DEFI.explication}</p>
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
