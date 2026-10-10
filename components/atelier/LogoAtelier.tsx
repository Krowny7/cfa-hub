// Le logo de l'Atelier : sa marque, à côté de son nom (carte de S'entraîner).
// Un petit SVG en repère 32 × 32, couleurs en jetons (--pen, --ink, --paper :
// juste en clair comme en nuit), lisible de 16 à 64 px. Trois variantes :
//   "lanterne" / "plume" / "propre" / "sablier"  le tampon rond à l'encre rouge
//             (filet intérieur), un motif neutre en réserve couleur papier :
//             la lanterne à huile du bureau de Léonard, une pointe de plume,
//             la ligne raturée remise au propre, le sablier des 30 minutes
//   "sceau"   l'ancien tampon, marteau et plume croisés (gardé pour comparer)
//   "outil"   la plume-marteau à l'encre noire : la plume dont le bout est un marteau
//   "barre"   le A de l'Atelier, sa barre posée au stylo rouge (le trait qui
//             remet au propre, plutôt qu'une rature qu'on ne lirait pas à 16 px)
// Décoratif par défaut (le nom est écrit à côté) ; `titre` le rend lisible.

export type VarianteLogo = "lanterne" | "plume" | "propre" | "sablier" | "sceau" | "outil" | "barre";
const MOTIFS_SCEAU = ["lanterne", "plume", "propre", "sablier", "sceau"] as const;

/** les lettres des aperçus (?logo=a|b|c) */
export const VARIANTES_LOGO: Record<string, VarianteLogo> = {
  a: "sceau", b: "outil", c: "barre",
  s1: "lanterne", s2: "plume", s3: "propre", s4: "sablier",
};

// Les motifs des sceaux, en repère 32 × 32, dans le filet (rayon ~11 utile).
// Pleins couleur papier ; les détails creusés dedans reprennent le rouge.
function Lanterne() {
  return (
    <g transform="translate(16 16) scale(1.12) translate(-16 -16.3)">
      {/* l'anse */}
      <path d="M13.6 9.6A2.4 2.4 0 0 1 18.4 9.6" fill="none" stroke="var(--paper)" strokeWidth="1.3" strokeLinecap="round" />
      {/* le chapeau */}
      <path d="M11.6 10h8.8l-1.3 1.8h-6.2Z" fill="var(--paper)" />
      {/* le verre, plein ; la flamme creusée en rouge */}
      <rect x="12.2" y="12.3" width="7.6" height="8.4" rx="1.4" fill="var(--paper)" />
      <path d="M16 13.6C17.7 15.5 18 16.9 17.5 18.1A1.7 1.7 0 0 1 14.5 18.1C14 16.9 14.3 15.5 16 13.6Z" fill="var(--sceau, var(--pen))" />
      {/* le pied */}
      <rect x="11" y="21.3" width="10" height="1.9" rx="0.6" fill="var(--paper)" />
    </g>
  );
}
function Plume() {
  return (
    <g transform="rotate(40 16 16)">
      {/* la pointe métallique, bec en bas */}
      <path d="M16 26.4 11.6 17.2C11.1 14.2 11.4 11.6 12.2 9.6H19.8C20.6 11.6 20.9 14.2 20.4 17.2Z" fill="var(--paper)" />
      {/* la bague du haut */}
      <rect x="11.9" y="6.4" width="8.2" height="2.2" rx="0.6" fill="var(--paper)" />
      {/* l'œillet et la fente, creusés */}
      <circle cx="16" cy="16.4" r="1.35" fill="var(--sceau, var(--pen))" />
      <path d="M16 17.6V25.4" stroke="var(--sceau, var(--pen))" strokeWidth="1.05" strokeLinecap="round" />
    </g>
  );
}
function Propre() {
  return (
    <g fill="none" stroke="var(--paper)" strokeLinecap="round" strokeLinejoin="round">
      {/* la ligne nette, au-dessus */}
      <path d="M9 11.8H23" strokeWidth="2.6" />
      {/* la ligne raturée : un trait ondulé, barré */}
      <path d="M8.8 20.2c1.8-2.6 3.6-2.6 3.6 0s3.6 2.6 3.6 0 3.6-2.6 3.6 0 1.8 1.4 3.6-0.2" strokeWidth="1.6" />
      <path d="M8.6 23.6 23.4 16.6" strokeWidth="1.6" />
    </g>
  );
}
function Sablier() {
  return (
    <g>
      <rect x="10" y="7.4" width="12" height="2" rx="0.6" fill="var(--paper)" />
      <rect x="10" y="22.6" width="12" height="2" rx="0.6" fill="var(--paper)" />
      {/* le verre, plein */}
      <path d="M11.4 9.4H20.6C20.6 13.2 17.1 14.6 17.1 16 17.1 17.4 20.6 18.8 20.6 22.6H11.4C11.4 18.8 14.9 17.4 14.9 16 14.9 14.6 11.4 13.2 11.4 9.4Z" fill="var(--paper)" />
      {/* le vide creusé : haut de l'ampoule du dessus, haut de celle du dessous */}
      <path d="M13 10.7H19C18.9 11.6 18.6 12.2 18.1 12.7H13.9C13.4 12.2 13.1 11.6 13 10.7Z" fill="var(--sceau, var(--pen))" />
      <path d="M16 17.6C16.6 18.6 18.4 19.4 19 21.2 17.2 20.1 14.8 20.1 13 21.2 13.6 19.4 15.4 18.6 16 17.6Z" fill="var(--sceau, var(--pen))" />
    </g>
  );
}

// marteau et plume croisés, centrés sur (16, 16)
function MarteauPlume({ couleur }: { couleur: string }) {
  return (
    <g fill={couleur} stroke={couleur} strokeLinecap="round" strokeLinejoin="round">
      {/* la plume : barbes en haut à gauche, bec en bas à droite */}
      <path d="M5.5 5.5C11 6 15.6 10.2 16 16 10.2 15.6 6 11 5.5 5.5Z" strokeWidth="0.8" />
      <path d="M12 12 23.6 23.6" fill="none" strokeWidth="1.7" />
      <path d="M22.7 24.6 26.8 26.8 24.6 22.7Z" strokeWidth="0.9" />
      {/* le marteau : manche en bas à gauche, tête en haut à droite */}
      <path d="M8.2 23.8 19.4 12.6" fill="none" strokeWidth="2.5" />
      <rect x="15.6" y="9.4" width="10.4" height="4.6" rx="0.9" transform="rotate(45 20.8 11.7)" strokeWidth="0" />
    </g>
  );
}

export function LogoAtelier({
  variante = "plume",
  taille = 32,
  titre,
  teinte = "brun",
  className = "",
}: {
  variante?: VarianteLogo;
  /** le sceau à l'encre rouge des corrections, ou en brun (le bois de l'illustration) */
  teinte?: "rouge" | "brun";
  taille?: number;
  titre?: string;
  className?: string;
}) {
  const a11y = titre ? { role: "img", "aria-label": titre } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 32 32" width={taille} height={taille} className={"shrink-0 " + className} data-logo-atelier style={teinte === "brun" ? ({ "--sceau": "var(--atelier-brun)" } as React.CSSProperties) : undefined} {...a11y}>
      {(MOTIFS_SCEAU as readonly string[]).includes(variante) && (
        <>
          <circle cx="16" cy="16" r="15.2" fill="var(--sceau, var(--pen))" />
          <circle cx="16" cy="16" r="12.9" fill="none" stroke="var(--paper)" strokeWidth="1.1" />
          {variante === "lanterne" && <Lanterne />}
          {variante === "plume" && <Plume />}
          {variante === "propre" && <Propre />}
          {variante === "sablier" && <Sablier />}
          {variante === "sceau" && (
            <g transform="translate(16 16) scale(0.62) translate(-16 -16)">
              <MarteauPlume couleur="var(--paper)" />
            </g>
          )}
        </>
      )}
      {variante === "outil" && (
        <g fill="var(--ink)" stroke="var(--ink)" strokeLinecap="round" strokeLinejoin="round">
          {/* les barbes de la plume, en haut à droite */}
          <path d="M27.5 4.5C27.6 11 22.5 16.4 16.2 16.8 16.6 10.4 21.6 4.8 27.5 4.5Z" strokeWidth="0.8" />
          <path d="M18.4 14.6 25.4 7" fill="none" stroke="var(--paper)" strokeWidth="0.9" />
          {/* le tuyau, qui devient manche */}
          <path d="M21 11 8.6 23.4" fill="none" strokeWidth="2.4" />
          {/* la tête du marteau, au bout */}
          <rect x="2.4" y="20.6" width="12" height="5" rx="1" transform="rotate(45 8.4 23.1)" strokeWidth="0" />
        </g>
      )}
      {variante === "barre" && (
        <>
          <path d="M13.2 4h5.6L28 28h-5.4L16 10.6 9.4 28H4Z" fill="var(--ink)" />
          <path d="M4.6 21.6C11.4 19.4 19.8 18.6 27.6 18.8" fill="none" stroke="var(--sceau, var(--pen))" strokeWidth="3.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
