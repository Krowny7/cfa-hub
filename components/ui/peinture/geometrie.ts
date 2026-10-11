import type { CSSProperties } from "react";

// Géométrie des calques posés sur une peinture : tout est exprimé en pixels
// de l'image d'origine (largeur L, hauteur H) et converti en % de la scène,
// pour que les effets restent calés sur l'image quel que soit le recadrage.

const pc = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;

/** Rectangle (x0, y0) → (x1, y1) de l'image, en % de la scène. */
export const boite =
  (L: number, H: number) =>
  (x0: number, y0: number, x1: number, y1: number): CSSProperties => ({
    left: pc(x0, L),
    top: pc(y0, H),
    width: pc(x1 - x0, L),
    height: pc(y1 - y0, H),
  });

/**
 * Fond d'un calque qui recopie ce rectangle de l'image (le calque occupe
 * exactement ce rectangle) : même source, donc même pixels que l'image de
 * base. Sert aux flammes qui vacillent, à l'étendard, aux nuages.
 */
export const recopie =
  (L: number, H: number, src: string) =>
  (x0: number, y0: number, x1: number, y1: number): CSSProperties => ({
    backgroundImage: `url("${src}")`,
    backgroundSize: `${((L / (x1 - x0)) * 100).toFixed(3)}% ${((H / (y1 - y0)) * 100).toFixed(3)}%`,
    backgroundPosition: `${((x0 / (L - (x1 - x0))) * 100).toFixed(3)}% ${((y0 / (H - (y1 - y0))) * 100).toFixed(3)}%`,
  });

/** « 50% 60% », « center top »… → fractions (0 à 1) comme object-position. */
export function position(p: string): [number, number] {
  const un = (m: string | undefined) => {
    if (m === "left" || m === "top") return 0;
    if (m === "right" || m === "bottom") return 1;
    const n = m ? parseFloat(m) : NaN;
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n / 100)) : 0.5;
  };
  const mots = p.trim().split(/\s+/);
  return [un(mots[0]), un(mots[1])];
}
