import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { INK } from "@/components/ui/InkDefs";
import { Icone } from "@/components/adn/icons";
import { Avatar } from "@/components/classement/Avatar";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { CLASSEMENT, RIVALITE, joueursDomaine } from "@/lib/voice-z2a";
import { signed } from "@/components/classement/format";
import type { BoardRow } from "@/components/classement/types";

const VISIBLE = 10;

const ROW_GRID = "grid-cols-[22px_30px_minmax(0,1fr)_auto_34px] sm:grid-cols-[26px_32px_minmax(0,1fr)_auto_48px_34px]";

function badgeOf(r: BoardRow) {
  return rankFor(r.elo, r.mastery, r.rank);
}

/**
 * Une place du podium, posée sur le papier (sans socle) : la place en grand
 * chiffre, le sceau du joueur (ou sa photo), son nom, son ELO et son rang.
 * La première place est soulignée d'un coup de pinceau.
 */
function Place({ r, place }: { r: BoardRow; place: 1 | 2 | 3 }) {
  const first = place === 1;
  const rk = badgeOf(r);
  const placement = r.gamesPlayed < PLACEMENT_GAMES;
  return (
    <Link
      href={`/people/${r.userId}`}
      className={"group flex min-w-0 flex-col items-center text-center " + (first ? "pb-7 sm:pb-9" : "")}
      aria-label={`${place}${first ? "er" : "e"} : ${r.isMe ? "toi" : r.name}, ${r.elo} ELO`}
    >
      <span className={"relative font-brand leading-none tabular-nums " + (first ? "text-[54px] sm:text-[64px]" : "text-[34px] text-muted sm:text-[40px]")}>
        {place}
        {first && (
          <svg aria-hidden viewBox="0 0 400 64" preserveAspectRatio="none" className="absolute -bottom-2 left-1/2 h-[9px] w-[74px] -translate-x-1/2">
            <use href={INK.swash} fill="currentColor" />
          </svg>
        )}
      </span>
      <span className={"mt-4 transition-transform duration-300 group-hover:-translate-y-0.5 " + (first ? "" : "mt-3")}>
        <Avatar src={r.avatarUrl} name={r.name} size={first ? 56 : 44} />
      </span>
      <span className={"mt-2.5 w-full truncate px-1 text-[14px] sm:text-[15px] " + (first || r.isMe ? "font-bold" : "font-semibold")}>{r.isMe ? "Toi" : r.name}</span>
      <span className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums text-muted">
        <RankBadge tier={rk.tierIndex} size={18} glow={false} gray={placement} />
        {r.elo}
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
      <Avatar src={r.avatarUrl} name={r.name} size={28} />
      <span className="flex min-w-0 items-center gap-2">
        <Link href={`/people/${r.userId}`} className={"truncate text-[14.5px] hover:underline " + (r.isMe ? "font-bold" : "font-medium")}>
          {r.isMe ? "Toi" : r.name}
        </Link>
        {placement && <span className="hidden shrink-0 text-[11.5px] text-muted sm:inline">placement {r.gamesPlayed}/{PLACEMENT_GAMES}</span>}
      </span>
      <span className="inline-flex items-center justify-end gap-2">
        <RankBadge tier={rk.tierIndex} size={22} glow={false} gray={placement} title={placement ? "En placement" : rk.tier.name} />
        <span className="w-[40px] text-right font-mono text-[14px] font-semibold tabular-nums">{r.elo}</span>
      </span>
      {/* dernier mouvement : le chiffre seul, à l'encre s'il monte (pas de flèches) */}
      <span
        className={"hidden justify-end font-mono text-[12px] tabular-nums sm:inline-flex " + (r.lastDelta !== null && r.lastDelta > 0 ? "font-semibold text-white" : "text-muted")}
        title={r.lastDelta ? `Dernier match : ${signed(r.lastDelta)}` : undefined}
      >
        {r.lastDelta === null || r.lastDelta === 0 ? "—" : signed(r.lastDelta)}
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
          <Icone nom="duel" size={17} />
        </Link>
      )}
    </li>
  );
}

/**
 * La rivalité, en une ligne : le joueur juste devant (l'écart au stylo
 * rouge : le bout qui reste) et celui qui te talonne. Seulement avec de
 * vrais voisins de classement, une fois au moins une partie jouée.
 */
function Rivalite({ board, meRow }: { board: BoardRow[]; meRow: BoardRow | null }) {
  const ix = board.findIndex((r) => r.isMe);
  const me = ix >= 0 ? board[ix] : meRow;
  if (!me || me.gamesPlayed === 0) return null;
  const last = board[board.length - 1];
  const avant = ix > 0 ? board[ix - 1] : ix < 0 && last && last.rank === me.rank - 1 ? last : null;
  const devant = avant && avant.elo >= me.elo ? avant : null;
  const apres = ix >= 0 && ix < board.length - 1 ? board[ix + 1] : null;
  const derriere = apres && apres.gamesPlayed > 0 && apres.elo <= me.elo ? apres : null;
  if (!devant && !derriere) return null;
  const ecart = devant ? Math.max(0, devant.elo - me.elo) : 0;
  return (
    <p className="t-small m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-2 sm:px-3">
      {devant ? (
        <span>
          <span className="t-micro font-semibold">{RIVALITE.aDepasser}</span>{" "}
          {ecart > 0 ? (
            <>
              <b className="font-semibold text-white">{devant.name}</b>, <span className="font-mono font-semibold tabular-nums text-pen">{RIVALITE.devant(ecart)}</span>
            </>
          ) : (
            <b className="font-semibold text-white">{RIVALITE.egalite(devant.name)}</b>
          )}
        </span>
      ) : (
        <span className="font-semibold text-white">{RIVALITE.enTete}</span>
      )}
      {derriere && (
        <>
          <span aria-hidden className="text-muted">
            ·
          </span>
          <span>{RIVALITE.derriere(derriere.name, Math.max(0, me.elo - derriere.elo))}</span>
        </>
      )}
    </p>
  );
}

// Classement général du domaine : le podium posé sur le papier (dès que les
// trois premiers ont joué : trois places, sans socle, sur une ligne de
// crayon), puis la liste, la ligne « Toi » surlignée. Chaque joueur a son
// sceau (ou sa photo). La rivalité tient en une ligne au-dessus de la liste.
// Le bouton « Défier » d'une ligne apparaît au survol (toujours visible sur
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
        <p className="t-h3">{CLASSEMENT.vide}</p>
        <p className="t-small mt-1">{CLASSEMENT.videTexte}</p>
        <Link href="/people" className="ink-link mt-4 inline-flex items-center gap-1.5">
          <Search size={14} aria-hidden /> {CLASSEMENT.chercher}
        </Link>
      </div>
    );
  }

  return (
    <div id="joueurs" className={"grid scroll-mt-24 items-start gap-10 lg:grid-cols-12 lg:gap-14 " + (podium ? "" : "max-w-[760px]")}>
      {podium && (
        <div className="lg:col-span-5 lg:pt-2">
          <div className="relative grid grid-cols-3 items-end gap-2.5 pb-1 sm:gap-4" aria-label={CLASSEMENT.podium}>
            <Place r={board[1]} place={2} />
            <Place r={board[0]} place={1} />
            <Place r={board[2]} place={3} />
            <span aria-hidden className="pencil-line absolute inset-x-0 bottom-0" />
          </div>
        </div>
      )}

      <div className={"flex min-w-0 flex-col gap-3 " + (podium ? "lg:col-span-7" : "lg:col-span-12")}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 sm:px-3">
          <span className="t-micro">{joueursDomaine(count, CURRENT_DOMAIN.name)}</span>
          <Link href="/people" className="ink-link inline-flex items-center gap-1.5 text-[13px]">
            <Search size={13} aria-hidden /> {CLASSEMENT.chercher}
          </Link>
        </div>

        {nobodyPlayed ? <p className="t-small px-2 sm:px-3">{CLASSEMENT.personne}</p> : <Rivalite board={board} meRow={meRow} />}

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
              <span className="group-open:hidden">{CLASSEMENT.suivants(hidden.length)}</span>
              <span className="hidden group-open:inline">{CLASSEMENT.replier}</span>
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
