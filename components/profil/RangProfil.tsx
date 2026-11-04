import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { InkRing } from "@/components/ink/InkRing";
import { RankBadge } from "@/components/ui/RankBadge";
import { fmtInt, ordinal } from "@/components/classement/format";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { ENTETE } from "@/lib/voice-profil";
import { heuresRondes } from "@/lib/voice";

// Le rang, à droite de l'en-tête du profil : une carte sombre et basse, l'anneau du logo en
// fond. L'insigne animé sur le halo de son métal, le palier et sa marche (ou le placement),
// puis une seule ligne de chiffres : ELO, place, temps, saison. Toute la carte mène au
// classement. En pied (`pied`), le bilan du face-à-face sur le profil d'un autre. Sans état.

const LIBELLE = "truncate text-[11px] font-semibold uppercase tracking-[.08em] text-[rgba(255,255,255,.5)]";
const SEPARE = "border-l border-[rgba(255,255,255,.1)] pl-3.5";

export function RangProfil({
  elo,
  mastery,
  place,
  gamesPlayed,
  surTitre = "Ton rang",
  pic = null,
  saison = null,
  pied = null,
  temps,
  className = "",
}: {
  elo: number;
  mastery: number | null;
  /** le temps sur le site en secondes (null : inconnu) ; absent : la maîtrise à sa place */
  temps?: number | null;
  place: number | null;
  gamesPlayed: number;
  /** « Ton rang », « Son rang » : dit par le lien de la carte */
  surTitre?: string;
  /** meilleur palier atteint (index dans TIERS) ; dit par le lien s'il dépasse l'actuel */
  pic?: number | null;
  /** la dernière case de la ligne : la saison et son compte à rebours (SaisonRang) */
  saison?: React.ReactNode;
  /** pied de carte (le bilan du face-à-face) */
  pied?: React.ReactNode;
  className?: string;
}) {
  const rank = rankFor(elo, mastery, place);
  const metal = TIERS[rank.tierIndex].metal;
  const joues = Math.min(gamesPlayed, PLACEMENT_GAMES);
  const placement = gamesPlayed < PLACEMENT_GAMES;
  const nom = `${rank.tier.name}${rank.division ? " " + rank.division : ""}`;
  const picNom = pic !== null && pic > rank.tierIndex ? TIERS[pic].name : null;

  return (
    // toute la carte mène au classement (lien étiré), sauf son pied
    <div className={"card-ink rl-lift rl-in group relative isolate flex flex-col gap-4 overflow-hidden p-5 " + className} style={{ animationDelay: ".08s" }}>
      <InkRing size={270} className="rl-deco pointer-events-none absolute -right-[56px] top-1/2 -z-[1] -translate-y-1/2 text-[#fff] opacity-[0.08]" />
      {/* le halo du métal, derrière l'insigne */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-[50px] -top-[50px] -z-[1] h-[210px] w-[210px] rounded-full opacity-60 blur-[2px]"
        style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${metal[1]} 42%, transparent), transparent)` }}
      />

      <span className="flex items-center gap-4">
        <span className="w-[84px] shrink-0">
          <RankBadge tier={rank.tierIndex} size={84} mastery={mastery ?? 0} division={placement ? null : rank.division} onDark anime className="w-full" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2.5">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-brand truncate text-[26px] leading-none" style={{ color: metal[0] }}>
              {nom}
            </span>
            <Link
              href="/classement"
              className="shrink-0 text-[12px] font-semibold text-[rgba(255,255,255,.62)] after:absolute after:inset-0"
              aria-label={`${surTitre} · ${CURRENT_DOMAIN.name} : ${placement ? `placement ${joues} sur ${PLACEMENT_GAMES}, rang provisoire ${nom}` : nom}${picNom ? `, ${ENTETE.pic(picNom)}` : ""}. Voir le classement`}
            >
              <span className="inline-flex items-center gap-0.5 transition-transform group-hover:translate-x-0.5">
                Classement <ChevronRight size={15} aria-hidden />
              </span>
            </Link>
          </span>
          {placement ? (
            <span className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[rgba(255,255,255,.85)]">
                Placement {joues}/{PLACEMENT_GAMES}
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
                {rank.next.name} dans {fmtInt(rank.pointsToNext)} ELO
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

      {/* ELO, place, temps sur le site (la maîtrise sans lui), saison */}
      <span className={"grid border-t border-[rgba(255,255,255,.1)] pt-3 " + (saison ? "grid-cols-[1fr_1fr_1fr_1.45fr]" : "grid-cols-3")}>
        {[
          ["ELO", fmtInt(elo)],
          ["Place", place !== null ? ordinal(place) : "—"],
          temps !== undefined ? ["Temps", temps ? heuresRondes(temps) : "—"] : ["Maîtrise", mastery !== null ? `${mastery} %` : "—"],
        ].map(([l, v], i) => (
          <span key={l} className={"flex min-w-0 flex-col gap-0.5 " + (i ? SEPARE : "")}>
            <span className={LIBELLE}>{l}</span>
            <span className="truncate font-mono text-[15px] font-semibold tabular-nums">{v}</span>
          </span>
        ))}
        {saison && <span className={"flex min-w-0 flex-col gap-0.5 " + SEPARE}>{saison}</span>}
      </span>
      {pied && <div className="relative z-[1] border-t border-[rgba(255,255,255,.1)] pt-3">{pied}</div>}
    </div>
  );
}
