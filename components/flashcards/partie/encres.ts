import type { CSSProperties } from "react";
import { PALETTES, styleDePalette } from "@/lib/palettes";

// Les encres de la partie de cartes : le vrai liquide des insignes
// (components/nav/EncreVive, dans un élément .rl-encre[data-palette] de
// globals.css). Le tapis vert (la table, la carte d'entrée, le panneau du
// bilan, les boutons verts de la table) a ses tons à lui ; les boutons bruns
// et les cartes maîtrisées du bilan, ceux de l'atelier. Le fond CSS propre de
// chaque élément (le vert ou le brun teinté) reste dessous en repli immobile :
// sans WebGL, en mouvement réduit, en mode discret.

/** le liquide du tapis : [fond, principal, bandes, traînées claires], comme `liquide` d'un insigne */
export const TAPIS = ["#0c2618", "#22643f", "#2f8a5a", "#b5e3c4"] as const;

/** le voile du tapis (texte clair dessus) : `haut` et `bas` du dégradé sombre ; pas de texture de repli, le fond vert de l'élément en tient lieu */
export const voileTapis = (haut: number, bas: number) => ({ "--pal-voile-haut": haut, "--pal-voile-bas": bas }) as CSSProperties;

/** la palette de l'atelier (les boutons bruns, les cartes maîtrisées) et ses variables (texture de repli, voile) */
export const ATELIER = PALETTES.atelier;
export const STYLE_ATELIER = styleDePalette(ATELIER);
