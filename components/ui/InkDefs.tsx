// Filtre SVG partagé « bord d'encre » (#rl-ink) : légère irrégularité de
// pinceau sur les anneaux, le radar et le remplissage des boutons clairs.
// Posé une seule fois dans le layout ; les composants s'y réfèrent par
// filter="url(#rl-ink)".
export function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <filter id="rl-ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={2.4} />
        </filter>
      </defs>
    </svg>
  );
}
