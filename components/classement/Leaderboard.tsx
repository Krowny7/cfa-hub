import Link from "next/link";
import { ChevronDown, ChevronUp, Search, Swords } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { fmtInt } from "@/components/classement/format";
import type { BoardRow } from "@/components/classement/types";

const VISIBLE = 10;

const ROW_GRID = "grid-cols-[24px_28px_minmax(0,1fr)_auto_34px] sm:grid-cols-[28px_30px_minmax(0,1fr)_64px_48px_34px]";

function badgeOf(r: BoardRow) {
  return rankFor(r.elo, r.mastery, r.rank);
}

/** Une marche du podium : badge, nom, ELO, puis le socle avec la place. */
function Step({ r, place }: { r: BoardRow; place: 1 | 2 | 3 }) {
  const first = place === 1;
  const rk = badgeOf(r);
  const plinth = first ? "h-[92px] sm:h-[112px]" : place === 2 ? "h-[66px] sm:h-[80px]" : "h-[48px] sm:h-[58px]";
  return (
    <Link
      href={`/people/${r.userId}`}
      className="group flex min-w-0 flex-col items-center text-center"
      aria-label={`${place}${place === 1 ? "er" : "e"} : ${r.isMe ? "toi" : r.name}, ${r.elo} ELO`}
    >
      <span className="transition-transform duration-300 group-hover:-translate-y-1">
        <RankBadge tier={rk.tierIndex} size={first ? 76 : 58} glow={first} />
      </span>
      <span className={"mt-2 w-full truncate px-1 text-[14px] sm:text-[15px] " + (first || r.isMe ? "font-bold" : "font-semibold")}>{r.isMe ? "Toi" : r.name}</span>
      <span className="font-mono text-[12.5px] tabular-nums text-muted">{r.elo}</span>
      <span className={"relative mt-3 flex w-full justify-center overflow-hidden rounded-t-[14px] border border-b-0 border-line bg-surface pt-3 " + plinth}>
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${rk.tier.metal[0]}, ${rk.tier.metal[1]})` }} />
        <span className={"t-num " + (first ? "text-[30px]" : "text-[22px] text-muted")}>{place}</span>
      </span>
    </Link>
  );
}

function Row({ r }: { r: BoardRow }) {
  const rk = badgeOf(r);
  const placement = r.gamesPlayed < PLACEMENT_GAMES;
  return (
    <li
      className={"rl-row group grid items-center gap-2.5 rounded-[12px] px-2 py-2 sm:gap-3 sm:px-3 " + ROW_GRID + (r.isMe ? " border border-line bg-surface shadow-[var(--shadow-1)]" : "")}
      aria-current={r.isMe ? "true" : undefined}
    >
      <span className="font-mono text-[12.5px] tabular-nums text-muted">{r.rank}</span>
      <RankBadge tier={rk.tierIndex} size={26} glow={false} gray={placement} title={placement ? "En placement" : undefined} />
      <span className="flex min-w-0 items-center gap-2">
        <Link href={`/people/${r.userId}`} className={"truncate text-[14.5px] hover:underline " + (r.isMe ? "font-bold" : "font-medium")}>
          {r.isMe ? "Toi" : r.name}
        </Link>
        {placement && <span className="hidden shrink-0 text-[11.5px] text-muted sm:inline">placement {r.gamesPlayed}/{PLACEMENT_GAMES}</span>}
      </span>
      <span className="text-right font-mono text-[14px] font-semibold tabular-nums">{r.elo}</span>
      <span className="hidden items-center justify-end gap-0.5 font-mono text-[12px] tabular-nums text-muted sm:inline-flex">
        {r.lastDelta === null || r.lastDelta === 0 ? (
          "—"
        ) : r.lastDelta > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-white">
            <ChevronUp size={13} aria-label="en hausse" />
            {r.lastDelta}
          </span>
        ) : (
          <>
            <ChevronDown size={13} aria-label="en baisse" />
            {Math.abs(r.lastDelta)}
          </>
        )}
      </span>
      {r.isMe ? (
        <span aria-hidden />
      ) : (
        <Link
          href={`/duel?adversaire=${encodeURIComponent(r.userId)}`}
          aria-label={`Défier ${r.name}`}
          title={`Défier ${r.name}`}
          className="grid h-[34px] w-[34px] place-items-center rounded-[10px] text-muted transition hover:bg-surface-2 hover:text-white focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <Swords size={15} aria-hidden />
        </Link>
      )}
    </li>
  );
}

// Classement général du domaine : le podium posé sur le papier (dès que les
// trois premiers ont joué), puis la liste, la ligne « Toi » surlignée. Le
// bouton « Défier » d'une ligne apparaît au survol (toujours visible sur
// téléphone). Au-delà des 10 premiers, la suite se déplie.
export function Leaderboard({ board, meRow, totalPlayers }: { board: BoardRow[]; meRow: BoardRow | null; totalPlayers: number | null }) {
  const podium = board.length >= 3 && board.slice(0, 3).every((r) => r.gamesPlayed > 0);
  const list = podium ? board.slice(3) : board;
  const shown = list.filter((r) => r.rank <= VISIBLE || r.isMe);
  const hidden = list.filter((r) => r.rank > VISIBLE && !r.isMe);
  const nobodyPlayed = board.length > 0 && board.every((r) => r.gamesPlayed === 0);
  const count = totalPlayers ?? board.length;

  if (board.length === 0) {
    return (
      <div id="joueurs" className="max-w-[560px] scroll-mt-24">
        <p className="t-h3">Le classement se remplit au premier match</p>
        <p className="t-small mt-1">Lance un duel ou passe un examen blanc classé pour y entrer.</p>
        <Link href="/people" className="ink-link mt-4 inline-flex items-center gap-1.5">
          <Search size={14} aria-hidden /> Chercher un joueur
        </Link>
      </div>
    );
  }

  return (
    <div id="joueurs" className={"grid scroll-mt-24 items-start gap-10 lg:grid-cols-12 lg:gap-14 " + (podium ? "" : "max-w-[760px]")}>
      {podium && (
        <div className="lg:col-span-5 lg:pt-2">
          <div className="grid grid-cols-3 items-end gap-2.5 border-b border-line sm:gap-3" aria-label="Podium">
            <Step r={board[1]} place={2} />
            <Step r={board[0]} place={1} />
            <Step r={board[2]} place={3} />
          </div>
        </div>
      )}

      <div className={"flex min-w-0 flex-col gap-3 " + (podium ? "lg:col-span-7" : "lg:col-span-12")}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 sm:px-3">
          <span className="t-micro">
            {fmtInt(count)} joueur{count > 1 ? "s" : ""} · {CURRENT_DOMAIN.name}
          </span>
          <Link href="/people" className="ink-link inline-flex items-center gap-1.5 text-[13px]">
            <Search size={13} aria-hidden /> Chercher un joueur
          </Link>
        </div>

        {nobodyPlayed && <p className="t-small px-2 sm:px-3">Personne n&apos;a encore joué : tout le monde part de la même ligne.</p>}

        <ol className="flex flex-col gap-0.5" aria-label={`Classement général ${CURRENT_DOMAIN.name}`}>
          {shown.map((r) => (
            <Row key={r.userId} r={r} />
          ))}
          {meRow && (
            <>
              <li aria-hidden className="py-0.5 text-center font-mono text-[12px] text-muted">
                ···
              </li>
              <Row r={meRow} />
            </>
          )}
        </ol>

        {hidden.length > 0 && (
          <details className="group">
            <summary className="mx-auto mt-1 flex w-fit cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Voir les {hidden.length} suivants</span>
              <span className="hidden group-open:inline">Replier</span>
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ol className="mt-2 flex flex-col gap-0.5">
              {hidden.map((r) => (
                <Row key={r.userId} r={r} />
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}
