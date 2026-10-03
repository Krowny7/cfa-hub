import { LOGO_BRISTLES, LOGO_BRUSH, LOGO_SPLAT, LOGO_TRACK, RING_FULL, RING_FULL_AXIS, SWASH } from "@/components/ink/paths";

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
} as const;

export function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <filter id="rl-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2.4} />
        </filter>
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
