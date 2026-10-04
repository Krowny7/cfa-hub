import Link from "next/link";
import { CalendarClock, ChevronRight, Sparkles } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { Avatar } from "@/components/classement/Avatar";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { Icone } from "@/components/adn/icons";
import { daysUntil, fmtInt, ordinal } from "@/components/classement/format";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { joursEncre, jourJ, placement as enPlacement } from "@/lib/voice";
import { MOI } from "@/lib/voice-z1";
import type { MoiData } from "@/components/moi/types";

// En-tête compact de l'espace Moi : la photo, ou à défaut le sceau
// d'initiales (jamais un rond gris), le pseudo, une ligne de repères (jour J,
// jours d'encre, niveau) et, à droite, le rang en une ligne (la seule carte
// sombre de la page) qui mène au classement.
export function MoiHeader({ d, now }: { d: MoiData; now?: number }) {
  const rank = rankFor(d.me.elo, d.me.mastery, d.me.leaderboardRank);
  const placement = d.me.gamesPlayed < PLACEMENT_GAMES;
  const j = d.examDate ? daysUntil(d.examDate, now) : null;
  const jj = jourJ(j);
  const examDateLabel = d.examDate ? new Date(d.examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

  return (
    <header className="grid items-center gap-5 lg:grid-cols-12">
      <div className="flex min-w-0 items-center gap-4 md:gap-5 lg:col-span-8">
        {d.avatarUrl ? (
          <Avatar src={d.avatarUrl} name={d.name} size={64} className="rl-pop shadow-[var(--shadow-1)]" />
        ) : (
          <SceauPerso nom={d.name} taille={64} className="rl-pop shrink-0" />
        )}
        <div className="min-w-0">
          <p className="t-eyebrow">
            Moi · {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
          </p>
          <h1 className="t-h1 rl-in m-0 mt-1 [overflow-wrap:anywhere]">{d.name}</h1>
          <p className="t-small mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {j === null ? (
              <Link href="?onglet=reglages#date" className="inline-flex items-center gap-1.5 font-semibold text-white underline decoration-line-2 underline-offset-4 hover:decoration-current">
                <CalendarClock size={14} aria-hidden /> {MOI.fixeJourJ}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-white" title={examDateLabel ?? undefined}>
                <CalendarClock size={14} aria-hidden />
                {jj ?? MOI.examenPasse}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icone nom="serie" size={15} />
              {d.streak > 0 ? joursEncre(d.streak) : MOI.serieVide}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={14} aria-hidden />
              Niveau {d.level}
            </span>
          </p>
        </div>
      </div>

      <Link href="/classement" className="card-ink rl-lift rl-in group flex items-center gap-4 py-4 pl-4 pr-5 lg:col-span-4" style={{ animationDelay: ".08s", "--tier-glow": TIERS[rank.tierIndex].metal[1] } as React.CSSProperties} aria-label="Voir mon rang et le classement">
        <RankBadge tier={rank.tierIndex} size={56} mastery={d.me.mastery} division={placement ? null : rank.division} onDark gray={placement} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-semibold text-[rgba(255,255,255,.6)]">Ton rang · {CURRENT_DOMAIN.name}</span>
          <span className="truncate text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
            {placement ? enPlacement(d.me.gamesPlayed, PLACEMENT_GAMES).split(" · ")[0] : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
          </span>
          <span className="truncate font-mono text-[12px] text-[rgba(255,255,255,.7)]">
            {fmtInt(d.me.elo)} ELO{d.me.leaderboardRank !== null ? ` · ${ordinal(d.me.leaderboardRank)}` : ""} · maîtrise {d.me.mastery} %
          </span>
        </span>
        <ChevronRight size={18} aria-hidden className="shrink-0 text-[rgba(255,255,255,.6)] transition-transform group-hover:translate-x-0.5" />
      </Link>
    </header>
  );
}
