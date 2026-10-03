import Link from "next/link";
import { ArrowRight, CalendarClock, Flame, Sparkles } from "lucide-react";
import { PageHero } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { InkRing } from "@/components/ink/InkRing";
import { Avatar } from "@/components/classement/Avatar";
import { daysUntil, fmtInt, ordinal } from "@/components/classement/format";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import type { MoiData } from "@/components/moi/types";

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex min-h-[32px] items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-semibold shadow-[var(--shadow-1)]">{children}</span>;
}

// En-tête de l'espace Moi : avatar, pseudo, compte à rebours de l'examen,
// série de jours, niveau · XP, et le rang en version compacte (carte sombre).
export function MoiHeader({ d }: { d: MoiData }) {
  const rank = rankFor(d.me.elo, d.me.mastery, d.me.leaderboardRank);
  const placement = d.me.gamesPlayed < PLACEMENT_GAMES;
  const j = d.examDate ? daysUntil(d.examDate) : null;
  const examDateLabel = d.examDate ? new Date(d.examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

  return (
    <div className="grid items-center gap-6 lg:grid-cols-12">
      <div className="flex min-w-0 items-center gap-5 lg:col-span-8">
        <div className="rl-pop hidden sm:block">
          <Avatar src={d.avatarUrl} name={d.name} size={84} className="shadow-[var(--shadow-2)]" />
        </div>
        <PageHero kicker={`Moi · ${CURRENT_DOMAIN.name} · ${CURRENT_PROGRAM.name}`} title={<span className="[overflow-wrap:anywhere]">{d.name}</span>} className="min-w-0 flex-1">
          {j === null ? (
            <Link href="#reglages" className="rl-press inline-flex min-h-[32px] items-center gap-1.5 rounded-[10px] border border-dashed border-line-2 px-3 text-[13px] font-semibold text-muted hover:text-white">
              <CalendarClock size={14} aria-hidden /> Fixe ta date d&apos;examen
            </Link>
          ) : (
            <Pill>
              <CalendarClock size={14} aria-hidden />
              <span title={examDateLabel ?? undefined}>{j > 0 ? `J-${j} avant l'examen` : j === 0 ? "Jour J" : "Examen passé"}</span>
            </Pill>
          )}
          <Pill>
            <Flame size={14} aria-hidden />
            {d.streak > 0 ? `${d.streak} jour${d.streak > 1 ? "s" : ""} d'affilée` : "Pas de série en cours"}
          </Pill>
          <Pill>
            <Sparkles size={14} aria-hidden />
            Niveau {d.level} · {fmtInt(d.xpTotal)} XP
          </Pill>
        </PageHero>
      </div>

      <Link href="/classement" className="card-ink rl-lift rl-in flex items-center gap-4 p-5 lg:col-span-4" style={{ animationDelay: ".1s" }} aria-label="Voir mon rang et le classement">
        <InkRing size={170} className="pointer-events-none absolute -bottom-14 -right-10 text-[rgba(255,255,255,.06)]" />
        <span className="relative shrink-0">
          <RankBadge tier={rank.tierIndex} size={78} mastery={d.me.mastery} division={placement ? null : rank.division} onDark animate gray={placement} />
        </span>
        <span className="relative flex min-w-0 flex-col gap-1">
          <span className="text-[12.5px] font-semibold text-[rgba(255,255,255,.6)]">Ton rang · {CURRENT_DOMAIN.name}</span>
          <span className="text-[22px] font-extrabold leading-none tracking-[-0.02em]">
            {placement ? `En placement ${d.me.gamesPlayed}/${PLACEMENT_GAMES}` : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="rl-count font-brand text-[26px] leading-tight" style={{ "--rl-to": Math.max(0, Math.round(d.me.elo)) } as React.CSSProperties} aria-label={`${d.me.elo} ELO`} />
            <span className="font-mono text-[12px] text-[rgba(255,255,255,.7)]">
              ELO{d.me.leaderboardRank !== null ? ` · ${ordinal(d.me.leaderboardRank)}` : ""} · maîtrise {d.me.mastery} %
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[rgba(255,255,255,.8)]">
            Voir le classement <ArrowRight size={13} aria-hidden />
          </span>
        </span>
      </Link>
    </div>
  );
}
