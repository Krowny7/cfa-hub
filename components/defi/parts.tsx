import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { PageHero } from "@/components/ui/Titles";
import { InkBarCoches } from "@/components/adn/InkBarCoches";
import { InkRing } from "@/components/ink/InkRing";
import { Avatar } from "@/components/classement/Avatar";
import { clock } from "@/lib/duels";
import {
  DAILY_QUESTIONS,
  DAILY_REVIEW_DAYS,
  dayHref,
  dayLabel,
  daysBetween,
  reviewHref,
  reviewLeftLabel,
  timeLeftLabel,
  type DailyBoard,
  type DailyBoardRow,
  type DailyHistoryEntry,
} from "@/lib/daily";
import { DEFI, joueurs, rangOrdinal, raturesOuPropre } from "@/lib/voice-z2c";

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
          <Icone nom="examen" size={15} /> {DEFI.kicker(dayLabel(day, "long", today))}
        </span>
      }
      title={isToday ? DEFI.title : DEFI.titleDay(dayLabel(day, "day", today))}
    />
  );
}

/** Filigrane de l'anneau dans une carte sombre (décor, à poser en absolu). */
export function Filigrane({ size = 300, className = "-bottom-16 -right-10" }: { size?: number; className?: string }) {
  return <InkRing size={size} className={"rl-deco pointer-events-none absolute text-[#fff] opacity-[0.08] " + className} />;
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
// Coches (Épure, InkBarCoches du kit) : une coche par question. Un trait
// d'encre par bonne réponse, la croix du correcteur (stylo rouge) par
// rature, un trait de crayon pour ce qui reste.
//   ok : juste ; ko : rature ; none : sans réponse (crayon) ; done : répondue
//   pendant la partie (justesse inconnue : un trait d'encre, rien de plus) ;
//   current : la question affichée ; todo : à faire, au crayon.
// Chaque coche peut mener à sa question (lien ou bouton posé par-dessus).
// `entoure` : une coche entourée au stylo rouge (la question décisive d'un
// duel : la main du correcteur, règle 3).

export type TickMark = "ok" | "ko" | "none" | "done" | "current" | "todo";

const MARK_TEXT: Record<TickMark, string> = {
  ok: "juste",
  ko: "rature",
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
  height = 30,
  entoure = null,
  entoureTexte = "question décisive",
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
  /** hauteur des coches en px (la largeur suit) */
  height?: number;
  /** index de la coche à entourer au stylo rouge */
  entoure?: number | null;
  entoureTexte?: string;
  className?: string;
}) {
  const items = marks.map((m) => (m === "ok" || m === "done" ? true : m === "ko" ? false : null));
  const cur = marks.indexOf("current");
  const interactive = !!hrefFor || !!onPick;
  const done = marks.filter((m) => m !== "todo" && m !== "current").length;
  const ko = marks.filter((m) => m === "ko").length;
  const summary = `${label} : ${done} sur ${marks.length}${ko ? ` · ${ko} rature${ko > 1 ? "s" : ""}` : ""}`;
  return (
    <div className={"min-w-0 " + className}>
      <div className="relative inline-block max-w-full align-top">
        <span aria-hidden={interactive || undefined} className="block">
          <InkBarCoches items={items} height={height} courante={cur >= 0 ? cur : undefined} label={summary} />
        </span>
        {interactive && (
          <ol aria-label={label} className="absolute inset-x-0 top-0 m-0 flex list-none p-0" style={{ height }}>
            {marks.map((m, i) => {
              const text = `Question ${i + 1} : ${MARK_TEXT[m]}${i === entoure ? `, ${entoureTexte}` : ""}`;
              const cell = "block h-full w-full rounded-[4px] transition-colors hover:bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]";
              return (
                <li key={i} className="min-w-0 flex-1">
                  {hrefFor ? (
                    <Link href={hrefFor(i)} aria-label={text} title={text} className={cell} />
                  ) : onPick && (!canPick || canPick(i)) ? (
                    <button type="button" onClick={() => onPick(i)} aria-label={`Aller à la question ${i + 1}`} title={text} className={cell} />
                  ) : (
                    <span className="sr-only">{text}</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {entoure !== null && entoure >= 0 && entoure < marks.length && (
          <svg
            aria-hidden
            width={1}
            height={1}
            className="pointer-events-none absolute overflow-visible"
            style={{ left: `${((entoure * 17 + 6) / (marks.length * 17 + 2)) * 100}%`, top: height / 2 }}
          >
            <ellipse cx={0} cy={0} rx={height * 0.34} ry={height * 0.6} fill="none" stroke="var(--pen)" strokeWidth={1.6} transform="rotate(-14)" />
          </svg>
        )}
        {numbered && (
          <div aria-hidden className="mt-1 flex font-mono text-[10px] leading-none text-muted tabular-nums">
            {marks.map((_, i) => (
              <span key={i} className="min-w-0 flex-1 text-center">
                {i === 0 || (i + 1) % 5 === 0 ? i + 1 : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Coches d'une copie corrigée. */
export function reviewMarks(review: { isCorrect: boolean; selectedIndex: number | null }[]): TickMark[] {
  return review.map((r) => (r.isCorrect ? "ok" : r.selectedIndex !== null ? "ko" : "none"));
}

// ---------------------------------------------------------------------------
// Classement du jour

function BoardRow({ row, total }: { row: DailyBoardRow; total: number }) {
  const podium = row.rank <= 3;
  return (
    <li
      className={
        "grid grid-cols-[22px_24px_minmax(0,1fr)_auto_48px] items-center gap-x-2.5 rounded-[10px] px-2 py-2 sm:gap-x-3 sm:px-2.5 " +
        (row.isMe ? "bg-surface-2 shadow-[inset_0_0_0_1px_var(--line)]" : "")
      }
      aria-label={`${rangOrdinal(row.rank)} : ${row.isMe ? DEFI.toi : row.username ?? "Joueur"}, ${row.score} sur ${row.total || total}, en ${clock(row.seconds)}`}
    >
      <span className={"font-mono text-[13px] tabular-nums " + (podium ? "font-bold text-white" : "text-muted")}>{row.rank}</span>
      <Avatar src={row.avatarUrl} name={row.username ?? "Joueur"} size={24} />
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate text-[14.5px] font-semibold">{row.username ?? "Joueur"}</span>
        {row.isMe && <span className="t-micro shrink-0 font-semibold">{DEFI.toi}</span>}
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
    ? [board?.playing ? DEFI.enCours(board.playing) : null, left ? DEFI.seFigeDans(left) : null].filter(Boolean).join(" · ")
    : DEFI.boardFrozen;

  return (
    <section className={"card min-w-0 p-5 md:p-6 " + className} aria-label={DEFI.classement}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="t-h3 m-0">{DEFI.classement}</h2>
        <span className="t-micro shrink-0">{joueurs(players)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="t-small m-0 mt-4 max-w-[360px]">{isToday ? DEFI.boardEmpty : DEFI.boardEmptyPast}</p>
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
        <p className="t-micro m-0 mt-2 px-2.5">{DEFI.autres(rows.length - shown.length)}</p>
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
  // Ligne courte (mobile), complétée sur ordinateur
  const [main, extra] = played
    ? [
        [e.rank !== null && e.players > 1 ? `${rangOrdinal(e.rank)} sur ${e.players}` : null, errors !== null ? raturesOuPropre(errors) : null]
          .filter(Boolean)
          .join(" · "),
        left ? DEFI.revue(left) : null,
      ]
    : open
      ? [DEFI.copieEnCours, null]
      : [DEFI.pasDeCopie(e.players), e.topScore !== null ? DEFI.meilleur(e.topScore, e.questionCount) : null];

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
          {DEFI.revoirCourt}
        </Link>
      ) : open ? (
        <Link href={dayHref(e.day)} className="btn btn-sm btn-primary shrink-0">
          {DEFI.reprendreCourt}
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
    <section className="rl-section" aria-label={DEFI.joursPasses}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-h2 m-0">{DEFI.joursPasses}</h2>
        <span className="t-micro">{toReview > 0 ? DEFI.aRevoir(toReview, DAILY_REVIEW_DAYS) : DEFI.seRevoit(DAILY_REVIEW_DAYS)}</span>
      </div>
      {past.length === 0 ? (
        <p className="t-small m-0">{DEFI.historyEmpty}</p>
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
                {DEFI.voirPlus(more.length)}
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
