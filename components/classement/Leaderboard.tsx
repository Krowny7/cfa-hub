import Link from "next/link";
import { ChevronDown, ChevronUp, Search, Swords } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { fmtInt } from "@/components/classement/format";
import type { BoardRow } from "@/components/classement/types";

const VISIBLE = 10;

const ROW_GRID = "grid-cols-[22px_30px_minmax(0,1fr)_auto_auto] sm:grid-cols-[26px_34px_minmax(0,1fr)_52px_60px_48px_auto]";

function badgeOf(r: BoardRow) {
  return rankFor(r.elo, r.mastery, r.rank);
}

function PodiumCard({ r, place }: { r: BoardRow; place: 1 | 2 | 3 }) {
  const first = place === 1;
  const rk = badgeOf(r);
  const height = first ? "h-[196px] sm:h-[230px]" : place === 2 ? "h-[176px] sm:h-[206px]" : "h-[164px] sm:h-[192px]";
  return (
    <Link
      href={`/people/${r.userId}`}
      className={"rl-lift flex min-w-0 flex-col items-center justify-end gap-1.5 px-2 py-4 text-center sm:gap-2 " + height + " " + (first ? "card-ink" : "card")}
      aria-label={`${place}${place === 1 ? "er" : "e"} : ${r.isMe ? "toi" : r.name}, ${r.elo} ELO`}
    >
      <span className="rl-pop" style={{ animationDelay: `${0.1 * place}s` }}>
        <RankBadge tier={rk.tierIndex} size={first ? 60 : 50} onDark={first} glow={first} />
      </span>
      <span className="mt-1 w-full truncate text-[14px] font-bold sm:text-[15px]">{r.isMe ? "Toi" : r.name}</span>
      <span className={"font-mono text-[13px] tabular-nums " + (first ? "text-[rgba(255,255,255,.75)]" : "text-muted")}>{r.elo}</span>
      <span className="text-[22px] font-extrabold leading-none">{place}</span>
    </Link>
  );
}

function Row({ r }: { r: BoardRow }) {
  const rk = badgeOf(r);
  const placement = r.gamesPlayed < PLACEMENT_GAMES;
  return (
    <li
      className={"rl-row grid items-center gap-2.5 rounded-[12px] px-2.5 py-2 sm:gap-3 sm:px-3 " + ROW_GRID + (r.isMe ? " border border-line-2 bg-surface shadow-[var(--shadow-1)]" : "")}
      aria-current={r.isMe ? "true" : undefined}
    >
      <span className="font-mono text-[13px] tabular-nums text-muted">{r.rank}</span>
      <RankBadge tier={rk.tierIndex} size={28} glow={false} gray={placement} title={placement ? "En placement" : undefined} />
      <span className="flex min-w-0 items-center gap-2">
        <Link href={`/people/${r.userId}`} className={"truncate text-[14.5px] hover:underline " + (r.isMe ? "font-extrabold" : "font-semibold")}>
          {r.isMe ? "Toi" : r.name}
        </Link>
        {placement && <span className="hidden shrink-0 rounded-[7px] border border-line-2 px-1.5 py-[1px] text-[10.5px] font-semibold text-muted sm:inline">placement {r.gamesPlayed}/{PLACEMENT_GAMES}</span>}
      </span>
      <span className="hidden font-mono text-[12px] tabular-nums text-muted sm:block" title="Maîtrise du programme">
        {r.mastery !== null ? `${r.mastery} %` : "—"}
      </span>
      <span className="text-right font-mono text-[14px] font-semibold tabular-nums">{r.elo}</span>
      <span className="hidden items-center justify-end gap-0.5 font-mono text-[12px] tabular-nums sm:inline-flex">
        {r.lastDelta === null || r.lastDelta === 0 ? (
          <span className="text-muted">—</span>
        ) : r.lastDelta > 0 ? (
          <>
            <ChevronUp size={13} aria-label="en hausse" />
            {r.lastDelta}
          </>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-muted">
            <ChevronDown size={13} aria-label="en baisse" />
            {Math.abs(r.lastDelta)}
          </span>
        )}
      </span>
      {r.isMe ? (
        <span className="w-[34px] md:w-[86px]" aria-hidden />
      ) : (
        <Link href={`/duel?adversaire=${encodeURIComponent(r.userId)}`} aria-label={`Défier ${r.name}`} className="btn btn-ghost min-h-[32px] w-[34px] gap-1.5 px-0 text-[12.5px] md:w-[86px]">
          <Swords size={14} aria-hidden />
          <span className="hidden md:inline">Défier</span>
        </Link>
      )}
    </li>
  );
}

// Classement général du domaine : podium (dès que les trois premiers ont
// joué), puis la liste, la ligne « Toi » surlignée et un bouton « Défier » par
// joueur. Au-delà des 10 premiers, la suite se déplie.
export function Leaderboard({ board, meRow, totalPlayers }: { board: BoardRow[]; meRow: BoardRow | null; totalPlayers: number | null }) {
  const podium = board.length >= 3 && board.slice(0, 3).every((r) => r.gamesPlayed > 0);
  const list = podium ? board.slice(3) : board;
  const shown = list.filter((r) => r.rank <= VISIBLE || r.isMe);
  const hidden = list.filter((r) => r.rank > VISIBLE && !r.isMe);
  const nobodyPlayed = board.length > 0 && board.every((r) => r.gamesPlayed === 0);

  return (
    <section id="joueurs" className="flex min-w-0 scroll-mt-24 flex-col gap-4" aria-label={`Classement général ${CURRENT_DOMAIN.name}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h2 className="text-[24px] font-bold leading-tight tracking-[-0.02em]">Général · {CURRENT_DOMAIN.name}</h2>
        <Link href="/people" className="ink-link inline-flex items-center gap-1.5">
          <Search size={14} aria-hidden /> Chercher un joueur
        </Link>
      </div>

      {board.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">Le classement se remplit au premier match</p>
          <p className="mt-1 text-[13.5px] text-muted">Lance un duel ou passe un examen blanc classé pour y entrer.</p>
        </div>
      ) : (
        <>
          {podium && (
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
              <PodiumCard r={board[1]} place={2} />
              <PodiumCard r={board[0]} place={1} />
              <PodiumCard r={board[2]} place={3} />
            </div>
          )}
          {nobodyPlayed && (
            <p className="note rounded-[12px] border border-dashed border-line-2 px-3 py-2 text-[13px]">
              Personne n&apos;a encore joué de match classé : tout le monde part de la même ligne. Le premier duel ouvre le bal.
            </p>
          )}
          <ol className="flex flex-col gap-1" aria-label="Joueurs">
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
              <summary className="ink-link mx-auto block w-fit cursor-pointer list-none">
                <span className="group-open:hidden">Voir les {hidden.length} suivants</span>
                <span className="hidden group-open:inline">Replier</span>
              </summary>
              <ol className="mt-2 flex flex-col gap-1">
                {hidden.map((r) => (
                  <Row key={r.userId} r={r} />
                ))}
              </ol>
            </details>
          )}
          {totalPlayers !== null && totalPlayers > board.length && (
            <p className="text-center text-[12.5px] text-muted">
              {fmtInt(totalPlayers)} joueurs au classement · les {board.length} premiers affichés
            </p>
          )}
        </>
      )}
    </section>
  );
}
