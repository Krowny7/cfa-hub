import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, X } from "lucide-react";
import { PageHero } from "@/components/ui/Titles";
import { clock } from "@/lib/duels";
import {
  DAILY_QUESTIONS,
  DAILY_REVIEW_DAYS,
  DAILY_VOICE,
  dayHref,
  dayLabel,
  daysBetween,
  ordinal,
  reviewHref,
  reviewLeftLabel,
  timeLeftLabel,
  type DailyBoard,
  type DailyBoardRow,
  type DailyHistoryEntry,
} from "@/lib/daily";

// Pièces partagées des pages du défi du jour. Sans état : utilisables depuis
// un composant serveur comme depuis un composant client.

/**
 * En-tête : « Défi du jour · samedi 3 octobre », grand titre « Les 30 du
 * jour. » (ou « Les 30 du 2 octobre. » pour un jour passé).
 */
export function DefiHeading({ day, today, isToday }: { day: string; today: string; isToday: boolean }) {
  return (
    <PageHero
      kicker={
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} aria-hidden /> Défi du jour · {dayLabel(day, "long", today)}
        </span>
      }
      title={isToday ? DAILY_VOICE.title : `Les 30 du ${dayLabel(day, "day", today)}.`}
    />
  );
}

/** Lien de retour discret, au-dessus d'un titre. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="t-small inline-flex w-fit items-center gap-1.5 font-semibold hover:text-white">
      <ArrowLeft size={15} aria-hidden /> {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Coches (Épure) : une coche par question, sur un trait de crayon.
//   ok : coche à l'encre ; ko : croix au stylo rouge ; none : sans réponse,
//   au crayon ; done : répondue pendant la partie (justesse inconnue) ;
//   current : la question affichée ; todo : à faire, au crayon.

export type TickMark = "ok" | "ko" | "none" | "done" | "current" | "todo";

function TickGlyph({ mark }: { mark: TickMark }) {
  if (mark === "ko") return <X size={12} strokeWidth={2.8} className="mb-px shrink-0 text-pen" aria-hidden />;
  if (mark === "ok" || mark === "done")
    return <span aria-hidden className="block h-[18px] w-[3px] rounded-[3px_3px_2px_2px] bg-white sm:w-1" />;
  if (mark === "current")
    return <span aria-hidden className="block h-[18px] w-[3px] rounded-[3px_3px_2px_2px] bg-white/30 ring-1 ring-white sm:w-1" />;
  return <span aria-hidden className="block h-[12px] w-px bg-[var(--ink-3)] opacity-70" />;
}

const MARK_TEXT: Record<TickMark, string> = {
  ok: "juste",
  ko: "ratée",
  none: "sans réponse",
  done: "répondue",
  current: "en cours",
  todo: "à faire",
};

export function Ticks({
  marks,
  label,
  numbered = false,
  hrefFor,
  onPick,
  canPick,
  className = "",
}: {
  marks: TickMark[];
  /** nom accessible de la rangée (« Ta copie ») */
  label: string;
  /** numéros 1, 5, 10… sous les coches */
  numbered?: boolean;
  /** chaque coche mène à la question (revue) */
  hrefFor?: (position: number) => string;
  /** chaque coche choisissable ouvre la question (pendant la partie) */
  onPick?: (position: number) => void;
  canPick?: (position: number) => boolean;
  className?: string;
}) {
  return (
    <div className={"min-w-0 " + className}>
      <div className="relative">
        <span aria-hidden className="absolute inset-x-0 bottom-[2px] border-b border-dashed border-line-2" />
        <ol aria-label={label} className="relative m-0 flex list-none items-end gap-[2px] p-0 sm:gap-[3px]">
          {marks.map((m, i) => {
            const text = `Question ${i + 1} : ${MARK_TEXT[m]}`;
            const cell = "flex h-6 min-w-0 flex-1 items-end justify-center pb-[2px]";
            if (hrefFor)
              return (
                <li key={i} className="min-w-0 flex-1">
                  <Link href={hrefFor(i)} aria-label={text} title={text} className={cell + " rounded-[4px] transition-transform hover:-translate-y-0.5"}>
                    <TickGlyph mark={m} />
                  </Link>
                </li>
              );
            if (onPick && (!canPick || canPick(i)))
              return (
                <li key={i} className="min-w-0 flex-1">
                  <button type="button" onClick={() => onPick(i)} aria-label={`Aller à la question ${i + 1}`} title={text} className={cell + " w-full rounded-[4px] transition-transform hover:-translate-y-0.5"}>
                    <TickGlyph mark={m} />
                  </button>
                </li>
              );
            return (
              <li key={i} className={cell} title={text}>
                <span className="sr-only">{text}</span>
                <TickGlyph mark={m} />
              </li>
            );
          })}
        </ol>
      </div>
      {numbered && (
        <div aria-hidden className="mt-1 flex gap-[2px] font-mono text-[10.5px] leading-none text-muted tabular-nums sm:gap-[3px]">
          {marks.map((_, i) => (
            <span key={i} className="min-w-0 flex-1 text-center">
              {i === 0 || (i + 1) % 5 === 0 ? i + 1 : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Coches d'une copie corrigée. */
export function reviewMarks(review: { isCorrect: boolean; selectedIndex: number | null }[]): TickMark[] {
  return review.map((r) => (r.isCorrect ? "ok" : r.selectedIndex !== null ? "ko" : "none"));
}

// ---------------------------------------------------------------------------
// Cote (façon plan d'architecte) : |—— 3 pts ——| 1re place

export function Cote({ value, to, className = "" }: { value: React.ReactNode; to?: React.ReactNode; className?: string }) {
  return (
    <span className={"inline-flex min-w-0 items-center gap-2 font-mono text-[12px] text-muted " + className}>
      <span aria-hidden className="flex w-[clamp(48px,14vw,96px)] shrink items-center">
        <span className="h-2.5 w-px bg-[var(--ink-3)]" />
        <span className="h-px flex-1 bg-[var(--ink-3)] opacity-60" />
      </span>
      <b className="shrink-0 font-semibold text-white">{value}</b>
      <span aria-hidden className="flex w-[clamp(48px,14vw,96px)] shrink items-center">
        <span className="h-px flex-1 bg-[var(--ink-3)] opacity-60" />
        <span className="h-2.5 w-px bg-[var(--ink-3)]" />
      </span>
      {to && <span className="shrink-0">{to}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Classement du jour

function BoardRow({ row, total }: { row: DailyBoardRow; total: number }) {
  const podium = row.rank <= 3;
  return (
    <li
      className={
        "grid grid-cols-[30px_minmax(0,1fr)_auto_52px] items-center gap-x-3 rounded-[10px] px-2.5 py-2 " +
        (row.isMe ? "bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]" : "")
      }
      aria-label={`${ordinal(row.rank)} : ${row.isMe ? "toi" : row.username ?? "Joueur"}, ${row.score} sur ${row.total || total}, en ${clock(row.seconds)}`}
    >
      <span className={"font-mono text-[13px] tabular-nums " + (podium ? "font-bold text-white" : "text-muted")}>{row.rank}</span>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-[14.5px] font-semibold">{row.username ?? "Joueur"}</span>
        {row.isMe && <span className="t-micro shrink-0 font-semibold">toi</span>}
      </span>
      <span className="font-mono text-[13.5px] font-semibold tabular-nums">
        {row.score}
        <span className="font-normal text-muted">/{row.total || total}</span>
      </span>
      <span className="text-right font-mono text-[12.5px] tabular-nums text-muted">{clock(row.seconds)}</span>
    </li>
  );
}

/**
 * Le classement d'un jour : rang, joueur, score, temps. Les premiers
 * `limit`, puis ma ligne si je suis plus bas.
 */
export function DefiBoard({
  board,
  isToday,
  closesAt,
  nowIso,
  limit = 10,
  className = "",
}: {
  board: DailyBoard | null;
  isToday: boolean;
  closesAt: string | null;
  nowIso: string;
  limit?: number;
  className?: string;
}) {
  const rows = board?.rows ?? [];
  const shown = rows.slice(0, limit);
  const me = board?.me ?? null;
  const meHidden = !!me && !shown.some((r) => r.isMe);
  const total = rows[0]?.total || DAILY_QUESTIONS;
  const players = board?.players ?? 0;
  const left = isToday ? timeLeftLabel(closesAt, nowIso) : null;
  const foot = isToday
    ? [board?.playing ? `${board.playing} copie${board.playing > 1 ? "s" : ""} en cours` : null, left ? `se fige à minuit · ${left}` : null]
        .filter(Boolean)
        .join(" · ")
    : DAILY_VOICE.boardFrozen;

  return (
    <section className={"card min-w-0 p-5 md:p-6 " + className} aria-label="Classement du jour">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="t-h3 m-0">Classement du jour</h2>
        <span className="t-micro shrink-0">
          {players} joueur{players > 1 ? "s" : ""}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="t-small m-0 mt-4 max-w-[360px]">{isToday ? DAILY_VOICE.boardEmpty : "Personne n'a rendu de copie ce jour-là."}</p>
      ) : (
        <ol className="m-0 mt-4 grid list-none gap-0.5 p-0">
          {shown.map((r) => (
            <BoardRow key={r.userId} row={r} total={total} />
          ))}
          {meHidden && me && (
            <>
              <li aria-hidden className="px-2.5 font-mono text-[13px] leading-none text-muted">
                ⋯
              </li>
              <BoardRow row={me} total={total} />
            </>
          )}
        </ol>
      )}
      {rows.length > shown.length && (
        <p className="t-micro m-0 mt-2 px-2.5">
          + {rows.length - shown.length} autre{rows.length - shown.length > 1 ? "s" : ""}
        </p>
      )}
      {foot && <p className="t-micro m-0 mt-4 border-t border-line pt-3">{foot}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Jours passés : les plus récents, puis « Voir plus » (la revue reste ouverte
// au-delà des 14 jours ; la fenêtre « à revoir » est rappelée sur chaque ligne)

function HistoryRow({ e, today, nowIso }: { e: DailyHistoryEntry; today: string; nowIso: string }) {
  const played = !!e.finishedAt;
  const open = !!e.startedAt && !e.finishedAt;
  const total = e.total ?? e.questionCount;
  const errors = played && e.score !== null ? total - e.score : null;
  const left = played && e.finishedAt ? reviewLeftLabel(e.finishedAt, nowIso) : null;
  const joueurs = `${e.players} joueur${e.players > 1 ? "s" : ""}`;
  // Ligne courte (mobile), complétée sur ordinateur
  const [main, extra] = played
    ? [
        [e.rank !== null && e.players > 1 ? `${ordinal(e.rank)} sur ${e.players}` : null, errors === 0 ? "page propre" : errors !== null ? `${errors} erreur${errors > 1 ? "s" : ""}` : null]
          .filter(Boolean)
          .join(" · "),
        left ? `revue ${left}` : null,
      ]
    : open
      ? ["copie en cours", null]
      : [`pas joué · ${joueurs}`, e.topScore !== null ? `meilleur ${e.topScore}/${e.questionCount}` : null];

  return (
    <li className="flex items-center gap-3 py-1">
      <Link
        href={dayHref(e.day)}
        className="rl-row grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-[12px] px-2 py-2.5"
        aria-label={`${dayLabel(e.day, "long", today)} : ${played ? `${e.score} sur ${total}, ` : ""}${main}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-semibold first-letter:uppercase">{dayLabel(e.day, "short", today)}</span>
          <span className={"t-micro block truncate " + (open ? "font-semibold text-white" : "")}>
            {main}
            {extra && <span className="hidden sm:inline"> · {extra}</span>}
          </span>
        </span>
        {played && (
          <span className="font-mono text-[14px] font-semibold tabular-nums">
            {e.score}
            <span className="font-normal text-muted">/{total}</span>
          </span>
        )}
      </Link>
      {played ? (
        <Link href={reviewHref(e.day)} className="btn btn-sm btn-secondary shrink-0" aria-label={`Revoir ta copie du ${dayLabel(e.day, "day", today)}`}>
          Revoir
        </Link>
      ) : open ? (
        <Link href={dayHref(e.day)} className="btn btn-sm btn-primary shrink-0">
          Reprendre
        </Link>
      ) : (
        <span className="w-[72px] shrink-0" aria-hidden />
      )}
    </li>
  );
}

export function DefiHistory({
  entries,
  today,
  nowIso,
  visible = 6,
}: {
  entries: DailyHistoryEntry[];
  today: string;
  nowIso: string;
  /** jours affichés avant « Voir plus » */
  visible?: number;
}) {
  const past = entries.filter((e) => e.day < today);
  const shown = past.slice(0, visible);
  const more = past.slice(visible);
  const toReview = past.filter((e) => e.finishedAt && daysBetween(e.day, today) <= DAILY_REVIEW_DAYS).length;

  return (
    <section className="rl-section" aria-label="Jours passés">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-h2 m-0">Jours passés</h2>
        <span className="t-micro">
          {toReview > 0
            ? `${toReview} copie${toReview > 1 ? "s" : ""} à revoir · ${DAILY_REVIEW_DAYS} jours`
            : `chaque copie se revoit ici ${DAILY_REVIEW_DAYS} jours`}
        </span>
      </div>
      {past.length === 0 ? (
        <p className="t-small m-0">{DAILY_VOICE.historyEmpty}</p>
      ) : (
        <div>
          <ul className="m-0 grid list-none divide-y divide-line p-0">
            {shown.map((e) => (
              <HistoryRow key={e.day} e={e} today={today} nowIso={nowIso} />
            ))}
          </ul>
          {more.length > 0 && (
            <details className="group mt-2">
              <summary className="t-small flex w-fit cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 font-semibold hover:text-white [&::-webkit-details-marker]:hidden">
                Voir plus · {more.length} jour{more.length > 1 ? "s" : ""}
                <ArrowRight size={13} className="transition-transform group-open:rotate-90" aria-hidden />
              </summary>
              <ul className="m-0 mt-1 grid list-none divide-y divide-line p-0">
                {more.map((e) => (
                  <HistoryRow key={e.day} e={e} today={today} nowIso={nowIso} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
