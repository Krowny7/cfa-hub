import { LOGO_BRISTLES, LOGO_BRUSH, LOGO_SPLAT, LOGO_TRACK, RING_FULL, RING_FULL_AXIS, SWASH } from "@/components/ink/paths";
import { CROSS, TALLY, TALLY_BAR } from "@/components/ink/strokes";

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
  /** filtres : pinceau sec (traînées verticales), mine de crayon (grain) */
  dry: "url(#rl-dry)",
  pencil: "url(#rl-pencil)",
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
        {TALLY.map((d, i) => (
          <path key={i} id={`rl-tally-${i}`} d={d} />
        ))}
        {TALLY_BAR.map((d, i) => (
          <path key={i} id={`rl-tally-bar-${i}`} d={d} />
        ))}
        <path id="rl-cross" d={CROSS} />
        <path id="rl-logo-track" d={LOGO_TRACK} />
        <path id="rl-logo-brush" d={LOGO_BRUSH} />
        <path id="rl-logo-bristles" d={LOGO_BRISTLES} />
        <path id="rl-logo-splat" d={LOGO_SPLAT} />
        <path id="rl-ring" d={RING_FULL} />
        {/* pathLength : les pourcentages de tracé (halo, enso, objectif) s'appliquent tels quels */}
        <path id="rl-ring-axis" d={RING_FULL_AXIS} pathLength={100} />
        <path id="rl-swash" d={SWASH} />
      </defs>
    </svg>
  );
}
