import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { fmtInt, ordinal } from "@/components/classement/format";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { placement as enPlacement } from "@/lib/voice";

// La carte du rang : la seule carte sombre de l'en-tête (Moi, profils).
// L'insigne avec son halo de maîtrise, le palier (ou « Placement 3/5 »),
// puis ELO, place et maîtrise ; elle mène au classement. Sans état.
export function CarteRang({
  elo,
  mastery,
  place,
  gamesPlayed,
  surTitre = "Ton rang",
  className = "",
}: {
  elo: number;
  mastery: number | null;
  place: number | null;
  gamesPlayed: number;
  /** « Ton rang », « Son rang »… (suivi du domaine) */
  surTitre?: string;
  className?: string;
}) {
  const rank = rankFor(elo, mastery, place);
  const placement = gamesPlayed < PLACEMENT_GAMES;
  return (
    <Link
      href="/classement"
      className={"card-ink rl-lift rl-in group flex items-center gap-4 py-4 pl-4 pr-5 " + className}
      style={{ animationDelay: ".08s", "--tier-glow": TIERS[rank.tierIndex].metal[1] } as React.CSSProperties}
      aria-label={`${surTitre} : voir le classement`}
    >
      <RankBadge tier={rank.tierIndex} size={56} mastery={mastery ?? 0} division={placement ? null : rank.division} onDark gray={placement} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12px] font-semibold text-[rgba(255,255,255,.6)]">
          {surTitre} · {CURRENT_DOMAIN.name}
        </span>
        <span className="truncate text-[19px] font-extrabold leading-tight tracking-[-0.02em]">
          {placement ? enPlacement(gamesPlayed, PLACEMENT_GAMES).split(" · ")[0] : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
        </span>
        <span className="truncate font-mono text-[12px] text-[rgba(255,255,255,.7)]">
          {fmtInt(elo)} ELO{place !== null ? ` · ${ordinal(place)}` : ""}
          {mastery !== null ? ` · maîtrise ${mastery} %` : ""}
        </span>
      </span>
      <ChevronRight size={18} aria-hidden className="shrink-0 text-[rgba(255,255,255,.6)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
