import Link from "next/link";
import { ArrowLeft, Settings, Swords } from "lucide-react";
import { PageHero } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { InkRing } from "@/components/ink/InkRing";
import { Avatar } from "@/components/classement/Avatar";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { fmtInt, ordinal } from "@/components/classement/format";

export type PlayerHeaderData = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
  level: number;
  xpTotal: number;
  /** avancement dans le niveau, 0–100 */
  levelPct: number;
  xpToNextLevel: number;
  mutualGroups: number;
  elo: number;
  gamesPlayed: number;
  mastery: number | null;
  leaderboardRank: number | null;
};

// En-tête du profil d'un joueur (/people/<id>) : nom, niveau sur une ligne,
// une seule action (Défier, ou Mes réglages sur son propre profil) et, à
// droite, le rang en carte sombre. Composant de présentation.
export function PlayerHeader({ p }: { p: PlayerHeaderData }) {
  const rank = rankFor(p.elo, p.mastery, p.leaderboardRank);
  const placement = p.gamesPlayed < PLACEMENT_GAMES;
  const meta = [`Niveau ${p.level}`, `${fmtInt(p.xpTotal)} XP`, p.mutualGroups > 0 ? `${p.mutualGroups} groupe${p.mutualGroups > 1 ? "s" : ""} en commun` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/people" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white">
        <ArrowLeft size={14} aria-hidden /> Joueurs
      </Link>

      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
        <div className="flex min-w-0 items-start gap-5 lg:col-span-7">
          <div className="hidden pt-7 sm:block">
            <Avatar src={p.avatarUrl} name={p.name} size={80} className="shadow-[var(--shadow-2)]" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <PageHero kicker={p.isMe ? "Ton profil public" : "Joueur"} title={<span className="[overflow-wrap:anywhere]">{p.name}</span>} className="w-fit max-w-full" />
            <div className="flex max-w-[420px] flex-col gap-2">
              <p className="t-small">{meta}</p>
              <div className="ink-bar" role="progressbar" aria-valuenow={p.levelPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Niveau ${p.level} : ${p.levelPct} %`}>
                <span className="rl-grow" style={{ width: `${p.levelPct}%` }} />
              </div>
              <p className="t-micro">
                encore {fmtInt(p.xpToNextLevel)} XP avant le niveau {p.level + 1}
              </p>
            </div>
            <div>
              {p.isMe ? (
                <Link href="/moi?onglet=reglages#reglages" className="btn btn-secondary rl-press">
                  <Settings size={15} aria-hidden /> Mes réglages
                </Link>
              ) : (
                <Link href={`/duel?adversaire=${encodeURIComponent(p.id)}`} className="btn btn-primary rl-press">
                  <Swords size={15} aria-hidden /> Défier {p.name}
                </Link>
              )}
            </div>
          </div>
        </div>

        <section className="card-ink rl-in flex items-center gap-5 p-6 lg:col-span-5" style={{ "--tier-glow": rank.tier.metal[1] } as React.CSSProperties} aria-label={`Rang de ${p.name}`}>
          <InkRing size={170} className="pointer-events-none absolute -bottom-14 -right-10 text-[rgba(255,255,255,.06)]" />
          <span className="relative shrink-0">
            <RankBadge tier={rank.tierIndex} size={92} mastery={p.mastery} division={placement ? null : rank.division} onDark animate gray={placement} />
          </span>
          <span className="relative flex min-w-0 flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-[rgba(255,255,255,.58)]">Rang · {CURRENT_DOMAIN.name}</span>
            <span className="text-[24px] font-extrabold leading-none tracking-[-0.02em]">
              {placement ? `En placement ${p.gamesPlayed}/${PLACEMENT_GAMES}` : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="t-num text-[28px]">{p.elo}</span>
              <span className="font-mono text-[12px] text-[rgba(255,255,255,.62)]">
                ELO{p.leaderboardRank !== null ? ` · ${ordinal(p.leaderboardRank)}` : ""}
                {p.mastery !== null ? ` · maîtrise ${p.mastery} %` : ""}
              </span>
            </span>
            <span className="text-[12.5px] text-[rgba(255,255,255,.58)]">
              {p.gamesPlayed} partie{p.gamesPlayed > 1 ? "s" : ""} classée{p.gamesPlayed > 1 ? "s" : ""}
            </span>
          </span>
        </section>
      </div>
    </div>
  );
}
