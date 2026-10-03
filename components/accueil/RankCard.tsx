import Link from "next/link";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { InkRing } from "@/components/ink/InkRing";
import { RankBadge } from "@/components/ui/RankBadge";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import type { AccueilData } from "@/components/accueil/types";

const SOURCE_LABEL = { duel: "au dernier duel", mock_exam: "au dernier examen blanc", placement: "en placement" } as const;

// Carte sombre du rang : badge (halo = maîtrise), palier et division, ELO en
// grand avec compteur, barre vers le palier suivant. Pendant les 5 parties de
// placement, le palier est grisé et la barre compte les parties jouées.
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
      aria-label={`Ton rang : ${name}, ${rating.elo} ELO, maîtrise ${mastery} %. Voir le classement`}
      className="card-ink rl-lift rl-in flex h-full flex-col gap-4 p-5 sm:p-6"
    >
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -right-16 h-[260px] w-[260px] rounded-full" style={{ background: `radial-gradient(circle, ${mid}33, transparent 70%)` }} />
      <span aria-hidden className="pointer-events-none absolute right-[18px] top-[46px] hidden text-[#fff] opacity-[.07] sm:block">
        <InkRing size={150} />
      </span>

      <span className="relative hidden items-center justify-between gap-3 sm:flex">
        <span className="text-[13px] font-semibold text-[rgba(255,255,255,.6)]">Ton rang · Finance</span>
        {last && last.delta !== 0 && (
          <span className="flex items-center gap-1 text-[12px] font-semibold text-[rgba(255,255,255,.6)]">
            {last.delta > 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {last.delta > 0 ? "+" : "−"}
            {Math.abs(last.delta)} {SOURCE_LABEL[last.source] ?? ""}
          </span>
        )}
      </span>

      <span className="relative flex items-center gap-4 sm:gap-[18px]">
        <span className="rl-pop block" style={{ animationDelay: ".2s" }}>
          <RankBadge
            tier={r.tierIndex}
            size={104}
            mastery={mastery}
            division={placement ? null : r.division}
            onDark
            animate
            gray={placement}
            className="h-auto w-[64px] sm:w-[104px]"
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[21px] font-extrabold leading-tight tracking-[-.03em] sm:text-[26px]">
            {name}
            <span className="text-[13px] font-semibold tracking-normal text-[rgba(255,255,255,.6)] sm:hidden"> · Finance</span>
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-brand text-[28px] leading-none sm:text-[38px]">
              <span className="rl-count" role="img" aria-label={`${rating.elo}`} style={{ "--rl-to": Math.max(0, Math.round(rating.elo)) } as React.CSSProperties} />
            </span>
            <span className="font-mono text-[12.5px] text-[rgba(255,255,255,.7)] sm:text-[13px]">ELO · maîtrise {mastery} %</span>
          </span>
          <span className="mt-1 block h-2 overflow-hidden rounded-lg bg-[rgba(255,255,255,.14)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={barPct} aria-label={placement ? "Parties de placement jouées" : "Progression dans le palier"}>
            <span
              className="rl-grow block h-full rounded-lg"
              style={{ width: `${barPct}%`, background: placement ? "#fff" : `linear-gradient(90deg, ${hi}, ${mid})`, animationDelay: ".5s" }}
            />
          </span>
          <span className="hidden items-center gap-1.5 text-[13px] text-[rgba(255,255,255,.6)] sm:flex">
            {placement ? (
              <>
                {rating.gamesPlayed}/{PLACEMENT_GAMES} parties de placement · ton rang se fixe après la 5ᵉ
              </>
            ) : blocker ? (
              <>
                <Lock size={13} /> Maîtrise {blocker.lock} % requise pour {blocker.name}
              </>
            ) : r.next && r.pointsToNext !== null ? (
              <>
                {r.pointsToNext} {r.pointsToNext > 1 ? "points" : "point"} avant
                <RankBadge tier={r.tierIndex + 1} size={16} glow={false} />
                {r.next.name}
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
