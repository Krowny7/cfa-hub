import Link from "next/link";
import { Swords } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { Avatar } from "@/components/classement/Avatar";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { fmtInt, shortId } from "@/components/classement/format";

export type PlayerLite = {
  id: string;
  name: string;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  level: number;
  xpTotal: number;
  mastery: number | null;
  isMe: boolean;
};

// Ligne de l'annuaire des joueurs : avatar, pseudo, niveau, badge de rang et
// ELO ; un bouton « Défier » pour les autres joueurs.
export function PlayerRow({ p }: { p: PlayerLite }) {
  const rk = rankFor(p.elo, p.mastery);
  const placement = p.gamesPlayed < PLACEMENT_GAMES;
  return (
    <li className={"rl-row flex items-center gap-2 rounded-[14px] pr-2 " + (p.isMe ? "border border-line-2 bg-surface shadow-[var(--shadow-1)]" : "")}>
      <Link href={`/people/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] p-2.5">
        <Avatar src={p.avatarUrl} name={p.name} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold">
            {p.name}
            {p.isMe && <span className="ml-1.5 text-[12px] font-semibold text-muted">· toi</span>}
            <span className="ml-1.5 font-mono text-[11px] font-normal text-muted">{shortId(p.id)}</span>
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-muted">
            Niveau {p.level} · {fmtInt(p.xpTotal)} XP · {placement ? `placement ${p.gamesPlayed}/${PLACEMENT_GAMES}` : `${p.gamesPlayed} parties`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <RankBadge tier={rk.tierIndex} size={28} glow={false} gray={placement} />
          <span className="hidden w-[42px] text-right font-mono text-[14px] font-semibold tabular-nums sm:block">{p.elo}</span>
        </span>
      </Link>
      {!p.isMe && (
        <Link href={`/duel?adversaire=${encodeURIComponent(p.id)}`} aria-label={`Défier ${p.name}`} className="btn btn-ghost min-h-[34px] shrink-0 gap-1.5 px-2.5 text-[12.5px]">
          <Swords size={14} aria-hidden />
          <span className="hidden md:inline">Défier</span>
        </Link>
      )}
    </li>
  );
}
