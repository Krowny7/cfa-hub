import { LOGO_BRISTLES, LOGO_BRUSH, LOGO_SPLAT, LOGO_TRACK, RING_FULL, RING_FULL_AXIS, SWASH } from "@/components/ink/paths";
import { CROSS, TALLY, TALLY_BAR } from "@/components/ink/strokes";
import { SEAL_HEX, SEAL_HEX_IN } from "@/components/adn/paths-moments";

// Définitions SVG partagées, posées une seule fois dans le layout :
// - le filtre « bord d'encre » (#rl-ink), légère irrégularité de pinceau sur
//   les anneaux, le radar et le remplissage des boutons clairs ;
// - les tracés d'encre lourds (logo, anneau, trait de pinceau : 6 à 13 Ko
//   chacun), que les composants réutilisent par <use href="#…">. Recopiés à
//   chaque logo ou badge, ils alourdissaient les pages de plusieurs centaines
//   de Ko — assez pour que React commence l'hydratation avant la fin de la
//   lecture du HTML (erreur #418, thème réinitialisé).
export const INK = {
  logoTrack: "#rl-logo-track",
  logoBrush: "#rl-logo-brush",
  logoBristles: "#rl-logo-bristles",
  logoSplat: "#rl-logo-splat",
  ring: "#rl-ring",
  ringAxis: "#rl-ring-axis",
  swash: "#rl-swash",
  /** bâtons de la série : 5 variantes (0 0 14 48), barre en travers (0 0 54 48) */
  tally: ["#rl-tally-0", "#rl-tally-1", "#rl-tally-2", "#rl-tally-3", "#rl-tally-4"],
  tallyBar: ["#rl-tally-bar-0", "#rl-tally-bar-1"],
  /** croix du correcteur (0 0 14 14) */
  cross: "#rl-cross",
  /** sceau hexagonal, contour et filet intérieur (0 0 120 120) : la collection du profil en pose 16 */
  sealHex: "#rl-seal-hex",
  sealHexIn: "#rl-seal-hex-in",
  /** filtres : pinceau sec (traînées verticales), mine de crayon (grain) */
  dry: "url(#rl-dry)",
  pencil: "url(#rl-pencil)",
  /** tache d'encre bue par le papier : bord irrégulier, adouci (la bannière « Encre vivante ») */
  tache: "url(#rl-tache)",
  /** le halo de cette tache, fondu dans le papier */
  tacheHalo: "url(#rl-tache-halo)",
} as const;

export function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <filter id="rl-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2.4} />
        </filter>
        {/* Pinceau sec : l'encre manque par traînées, dans le sens d'un trait vertical */}
        <filter id="rl-dry" x="-20%" y="-5%" width="140%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85 0.025" numOctaves={2} seed={5} result="t" />
          <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5.5 0 0 0 3.3" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" />
        </filter>
        {/* Mine de crayon : le trait gris se casse en grains */}
        <filter id="rl-pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={1} seed={4} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.85" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" />
        </filter>
        {/* Tache : le cercle se déchire au bord, puis l'encre boit dans le papier */}
        <filter id="rl-tache" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={3} seed={7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={22} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.4} />
        </filter>
        {/* Son halo : l'encre qui a bu dans le papier, déchirée plus large, fondue */}
        <filter id="rl-tache-halo" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={3} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={34} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={6} />
        </filter>
        {TALLY.map((d, i) => (
          <path key={i} id={`rl-tally-${i}`} d={d} />
        ))}
        {TALLY_BAR.map((d, i) => (
          <path key={i} id={`rl-tally-bar-${i}`} d={d} />
        ))}
        <path id="rl-cross" d={CROSS} />
        <path id="rl-seal-hex" d={SEAL_HEX} />
        <path id="rl-seal-hex-in" d={SEAL_HEX_IN} />
        <path id="rl-logo-track" d={LOGO_TRACK} />
        <path id="rl-logo-brush" d={LOGO_BRUSH} />
        <path id="rl-logo-bristles" d={LOGO_BRISTLES} />
        <path id="rl-logo-splat" d={LOGO_SPLAT} />
        <path id="rl-ring" d={RING_FULL} />
        {/* pathLength : les pourcentages de tracé (halo, enso, objectif) s'appliquent tels quels */}
        <path id="rl-ring-axis" d={RING_FULL_AXIS} pathLength={100} />
        <path id="rl-swash" d={SWASH} />
        {/* le signe « conseillé » des sous-pages : un cercle tracé à la main (repère 120 × 160, étiré
            par preserveAspectRatio="none", trait constant), commencé en haut à droite ; et une ligne
            d'écriture (repère 100 × 10) pour les feuilles de la page blanche qui se remplissent */}
        <path id="rl-cercle-main" vectorEffect="non-scaling-stroke" d="M100 9c11 6 15 32 14 72-1 40-3 60-15 70-13 8-69 8-85 0C4 145 3 110 4 76 5 36 3 13 16 7 36 1 80 3 108 13" />
        <path id="rl-trait-ecrit" vectorEffect="non-scaling-stroke" d="M1 6c4-3 6 2 10 0s5-4 9-1 6 2 9-1 5-2 8 1 7 1 10-1 5-3 9 0 6 2 10-1 4-2 8 1 6 1 9-1 5-1 8 0" />
      </defs>
    </svg>
  );
}
