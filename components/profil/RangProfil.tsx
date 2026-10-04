import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { fmtInt, ordinal } from "@/components/classement/format";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";

// Le rang en grand, à droite de l'en-tête du profil : la même carte sombre
// que dans Moi, mais l'insigne y prend la place d'un trophée (grand, animé,
// sur un halo à la couleur de son métal). À côté : le palier, la marche
// vers le palier suivant (ou les parties de placement, le rang étant alors
// provisoire), puis ELO, place et maîtrise. Mène au classement. Sans état.

export function RangProfil({
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
  /** « Ton rang », « Son rang » (suivi du domaine) */
  surTitre?: string;
  className?: string;
}) {
  const rank = rankFor(elo, mastery, place);
  const metal = TIERS[rank.tierIndex].metal;
  const joues = Math.min(gamesPlayed, PLACEMENT_GAMES);
  const placement = gamesPlayed < PLACEMENT_GAMES;
  const nom = `${rank.tier.name}${rank.division ? " " + rank.division : ""}`;

  return (
    <Link
      href="/classement"
      className={"card-ink rl-lift rl-in group relative isolate flex flex-col gap-3.5 overflow-hidden p-5 " + className}
      style={{ animationDelay: ".08s" }}
      aria-label={`${surTitre} : ${placement ? `placement ${joues} sur ${PLACEMENT_GAMES}, rang provisoire ${nom}` : nom}. Voir le classement`}
    >
      {/* le halo du métal, derrière l'insigne */}
      <span
        aria-hidden
        className="pointer-events-none absolute -z-[1] h-[240px] w-[240px] rounded-full opacity-60 blur-[2px] max-sm:-left-[60px] max-sm:-top-[50px] sm:-left-[50px] sm:-top-[30px]"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${metal[1]} 42%, transparent), transparent)` }}
      />

      <span className="flex items-center justify-between gap-3 text-[12px] font-semibold text-[rgba(255,255,255,.62)]">
        <span>
          {surTitre} · {CURRENT_DOMAIN.name}
        </span>
        <span className="inline-flex items-center gap-0.5 transition-transform group-hover:translate-x-0.5">
          Classement <ChevronRight size={15} aria-hidden />
        </span>
      </span>

      <span className="flex items-center gap-4 sm:gap-6">
        <span className="w-[92px] shrink-0 sm:w-[112px] lg:w-[124px]">
          <RankBadge tier={rank.tierIndex} size={124} mastery={mastery ?? 0} division={placement ? null : rank.division} onDark anime className="w-full" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-[26px] font-extrabold leading-none tracking-[-0.03em] sm:text-[30px]" style={{ color: metal[0] }}>
            {nom}
          </span>
          {placement ? (
            <span className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[rgba(255,255,255,.85)]">
                Placement {joues}/{PLACEMENT_GAMES} · rang provisoire
              </span>
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: PLACEMENT_GAMES }, (_, i) => (
                  <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < joues ? metal[1] : "rgba(255,255,255,.14)" }} />
                ))}
              </span>
            </span>
          ) : rank.next && rank.pointsToNext !== null ? (
            <span className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[rgba(255,255,255,.85)]">
                {rank.tier.name} → {rank.next.name} · {fmtInt(rank.pointsToNext)} ELO
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,.14)]" aria-hidden>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(4, rank.progress)}%`, background: `linear-gradient(90deg, ${metal[2]}, ${metal[1]}, ${metal[0]})` }} />
              </span>
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-[rgba(255,255,255,.85)]">{rank.lockedBy ? `${rank.lockedBy.name} à portée : la maîtrise le débloque` : "Le sommet du classement"}</span>
          )}
        </span>
      </span>

      {/* ELO, place, maîtrise */}
      <span className="grid grid-cols-3 border-t border-[rgba(255,255,255,.1)] pt-3">
        {[
          ["ELO", fmtInt(elo)],
          ["Place", place !== null ? ordinal(place) : "—"],
          ["Maîtrise", mastery !== null ? `${mastery} %` : "—"],
        ].map(([l, v], i) => (
          <span key={l} className={"flex min-w-0 flex-col gap-0.5 " + (i ? "border-l border-[rgba(255,255,255,.1)] pl-3.5" : "")}>
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-[rgba(255,255,255,.5)]">{l}</span>
            <span className="truncate font-mono text-[15px] font-semibold tabular-nums">{v}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}
