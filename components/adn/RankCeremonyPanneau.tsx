import { RankBadge } from "@/components/ui/RankBadge";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { placement as lignePlacement, pointsAvant, SOMMET } from "@/lib/voice";
import s from "./RankCeremony.module.css";

// Le panneau du rang (moment 3 de la direction Geste), version figée : une
// surface peinte au pinceau, bords irréguliers, qui remplace la carte sombre
// du rang. Encre pleine, chiffres en réserve ; en nuit, la même en gouache
// claire. Un seul panneau par écran.
//
//   <PanneauRang elo={1312} maitrise={54} domaine="Finance" />
//
// Props
//   elo, maitrise (0–100), place (classement, pour le Top 10)
//   domaine            « Finance » par défaut
//   joues              parties jouées : en placement (< 5), « Placement 3/5 »
//   children           emplacement libre sous la ligne (un lien, un bouton)
// Sans état ni « use client » : utilisable côté serveur.

export function PanneauRang({
  elo,
  maitrise = null,
  place = null,
  domaine = "Finance",
  joues = null,
  children,
  className = "",
}: {
  elo: number;
  maitrise?: number | null;
  place?: number | null;
  domaine?: string;
  joues?: number | null;
  children?: React.ReactNode;
  className?: string;
}) {
  const r = rankFor(elo, maitrise, place);
  const enPlacement = joues !== null && joues < PLACEMENT_GAMES;
  const rang = `${r.tier.name}${r.division ? ` ${r.division}` : ""}`;
  const prog = Math.max(3, Math.min(97, r.progress));
  const ligne = enPlacement
    ? lignePlacement(joues as number, PLACEMENT_GAMES)
    : r.lockedBy
      ? `${r.lockedBy.name} demande ${r.lockedBy.lock} % de maîtrise`
      : r.next && r.pointsToNext !== null
        ? pointsAvant(r.pointsToNext, r.next.name)
        : SOMMET;
  return (
    <div className={`${s.panneau} ${className}`} role="group" aria-label={`Ton rang : ${enPlacement ? "en placement" : rang}, ${Math.round(elo)} ELO. ${ligne}`}>
      <RankBadge tier={r.tierIndex} division={enPlacement ? null : r.division} size={84} onDark gray={enPlacement} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className={s.panneauK}>
          {enPlacement ? "En placement" : rang} · {domaine}
        </div>
        <div className={s.panneauElo}>
          {Math.round(elo)}
          <small>ELO</small>
        </div>
        {/* la progression dans le palier, au trait du pinceau (BAR du site) */}
        <div className={s.barre} aria-hidden>
          <i />
          <i style={{ clipPath: `inset(0 ${100 - (enPlacement ? ((joues as number) / PLACEMENT_GAMES) * 100 : prog)}% 0 0)` }} />
        </div>
        <div className={s.panneauS}>{ligne}</div>
        {children}
      </div>
    </div>
  );
}
