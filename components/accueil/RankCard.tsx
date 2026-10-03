import Link from "next/link";
import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import { InkRing } from "@/components/ink/InkRing";
import { RankBadge } from "@/components/ui/RankBadge";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import type { AccueilData } from "@/components/accueil/types";

const SOURCE_LABEL = { duel: "au dernier duel", mock_exam: "au dernier examen blanc", placement: "en placement" } as const;

// Rang compact (la seule carte sombre de l'accueil) : badge (halo = maîtrise),
// palier, ELO, barre vers le palier suivant et une ligne qui dit ce qu'il
// reste à faire. Pendant les parties de placement, le badge est grisé et la
// barre compte les parties jouées. Le détail vit sur /classement.
export function RankCard({ rating, mastery }: { rating: AccueilData["rating"]; mastery: number }) {
  const r = rankFor(rating.elo, mastery, rating.leaderboardRank);
  const placement = rating.gamesPlayed < PLACEMENT_GAMES;
  const [hi, mid] = r.tier.metal;
  const barPct = placement ? Math.round((rating.gamesPlayed / PLACEMENT_GAMES) * 100) : r.progress;
  const last = rating.last;
  const name = placement ? "En placement" : `${r.tier.name}${r.division ? " " + r.division : ""}`;
  // Palier bloqué par la maîtrise : c'est le verrou du palier juste au-dessus qui compte.
  const blocker = r.lockedBy ? (r.next ?? r.lockedBy) : null;

  return (
    <Link
      href="/classement"
      aria-label={`Ton rang : ${name}, ${rating.elo} ELO. Voir le classement`}
      className="card-ink rl-lift flex flex-col justify-center p-5 sm:p-7"
      // lueur de la carte teintée par le métal du palier (grise en placement)
      style={{ "--tier-glow": placement ? "#ffffff" : mid } as React.CSSProperties}
    >
      <span aria-hidden className="pointer-events-none absolute -bottom-16 -right-12 hidden text-[#fff] opacity-[.06] sm:block">
        <InkRing size={180} />
      </span>

      <span className="relative flex items-center gap-4 sm:gap-6">
        <RankBadge
          tier={r.tierIndex}
          size={96}
          mastery={mastery}
          division={placement ? null : r.division}
          onDark
          gray={placement}
          className="h-auto w-[60px] flex-none sm:w-[96px]"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12px] font-semibold text-[rgba(255,255,255,.55)]">Ton rang · Finance</span>
          <span className="mt-0.5 truncate text-[19px] font-extrabold leading-tight tracking-[-.025em] sm:text-[22px]">{name}</span>
          <span className="mt-2 flex items-baseline gap-2">
            <span className="t-num text-[28px] sm:text-[36px]">{rating.elo}</span>
            <span className="font-mono text-[12px] text-[rgba(255,255,255,.6)]">ELO</span>
            {last && last.delta !== 0 && (
              <span className="ml-auto inline-flex items-center gap-0.5 font-mono text-[12px] text-[rgba(255,255,255,.6)]" title={`${last.delta > 0 ? "+" : "−"}${Math.abs(last.delta)} ${SOURCE_LABEL[last.source] ?? ""}`}>
                {last.delta > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {Math.abs(last.delta)}
              </span>
            )}
          </span>
          <span
            className="mt-2.5 block h-1.5 overflow-hidden rounded-lg bg-[rgba(255,255,255,.14)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={barPct}
            aria-label={placement ? "Parties de placement jouées" : "Progression dans le palier"}
          >
            <span className="rl-grow block h-full rounded-lg" style={{ width: `${barPct}%`, background: placement ? "#fff" : `linear-gradient(90deg, ${hi}, ${mid})`, animationDelay: ".4s" }} />
          </span>
          <span className="mt-2 flex items-center gap-1.5 truncate text-[12px] text-[rgba(255,255,255,.6)]">
            {placement ? (
              <>{rating.gamesPlayed}/{PLACEMENT_GAMES} parties de placement jouées</>
            ) : blocker ? (
              <>
                <Lock size={12} className="flex-none" /> Maîtrise {blocker.lock} % requise pour {blocker.name}
              </>
            ) : r.next && r.pointsToNext !== null ? (
              <>
                {r.pointsToNext} {r.pointsToNext > 1 ? "points" : "point"} avant {r.next.name}
                {r.next.lock !== null && mastery < r.next.lock ? ` · maîtrise ${r.next.lock} % requise` : ""}
              </>
            ) : (
              <>Tu es au sommet du classement.</>
            )}
          </span>
        </span>
      </span>
    </Link>
  );
}
