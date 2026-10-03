import Link from "next/link";
import { Swords } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { Avatar } from "@/components/classement/Avatar";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";

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
// ELO. « Défier » apparaît au survol (toujours visible sur téléphone), comme
// dans le classement.
export function PlayerRow({ p }: { p: PlayerLite }) {
  const rk = rankFor(p.elo, p.mastery);
  const placement = p.gamesPlayed < PLACEMENT_GAMES;
  return (
    <li className={"rl-row group flex items-center gap-1 rounded-[14px] pr-1.5 " + (p.isMe ? "border border-line bg-surface shadow-[var(--shadow-1)]" : "")}>
      <Link href={`/people/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] px-2.5 py-2">
        <Avatar src={p.avatarUrl} name={p.name} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold">
            {p.name}
            {p.isMe && <span className="ml-1.5 text-[12.5px] font-medium text-muted">· toi</span>}
          </span>
          <span className="t-micro block truncate">
            Niveau {p.level} · {placement ? `placement ${p.gamesPlayed}/${PLACEMENT_GAMES}` : `${p.gamesPlayed} parties`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <RankBadge tier={rk.tierIndex} size={26} glow={false} gray={placement} />
          <span className="hidden w-[40px] text-right font-mono text-[14px] font-semibold tabular-nums sm:block">{p.elo}</span>
        </span>
      </Link>
      {p.isMe ? (
        <span className="w-[34px] shrink-0" aria-hidden />
      ) : (
        <Link
          href={`/duel?adversaire=${encodeURIComponent(p.id)}`}
          aria-label={`Défier ${p.name}`}
          title={`Défier ${p.name}`}
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-muted transition hover:bg-surface-2 hover:text-white focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <Swords size={15} aria-hidden />
        </Link>
      )}
    </li>
  );
}
