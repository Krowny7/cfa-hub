import { LOGO_EXTENT, bristles, brush, centerline, logoAt, logoPts, mulberry, offsetLine } from "@/components/ink/geometry";

// Géométrie de l'anneau du jour, repère du logo (0 0 240 240, hexagone de
// rayon 92, trait du logo = 74,5 % du contour). Module neutre : partagé par
// l'anneau (carte et Geste) et le logo vivant de la barre du haut.
//
// La part tracée suit les traits du jour : à l'objectif, c'est exactement le
// trait du logo (les tracés partagés d'InkDefs prennent le relais) ; avant, un
// coup de pinceau calculé qui s'effile là où l'on s'est arrêté.

/** Fraction du contour tracée pour `n` traits sur `objectif` (0 → LOGO_EXTENT). */
export function ratioTrace(n: number, objectif: number): number {
  if (n <= 0) return 0;
  return LOGO_EXTENT * Math.min(1, n / Math.max(1, objectif));
}

const cache = new Map<string, string>();
function memo(key: string, make: () => string): string {
  let v = cache.get(key);
  if (v === undefined) {
    v = make();
    if (cache.size > 400) cache.clear();
    cache.set(key, v);
  }
  return v;
}

/** Coup de pinceau de 0 à t (t < LOGO_EXTENT), fin effilée. `geste` : grand
 * format, la fin se défait en fibres sèches comme le bout du logo. */
export function brushTo(t: number, geste = false, n = 200): string {
  const k = t.toFixed(4);
  return memo(`b${geste ? "g" : ""}${n}:${k}`, () => {
    // un premier trait court est plus fin : une touche, pas une tache
    const W = (geste ? 26 : 25) * (0.7 + 0.3 * Math.min(1, t / 0.22));
    const inT = Math.min(0.5, 0.03 / t);
    // effilé sur une longueur fixe du contour, quelle que soit la part tracée
    const outT = Math.min(0.7, (geste ? 0.11 : 0.055) / t);
    const N = Math.max(40, Math.round(n * Math.min(1, t / 0.5)));
    return brush(logoPts(), 0, t, W, geste ? 12 : 7, { inT, outT, var: geste ? 0.06 : 0.1, wobble: geste ? 0.9 : 1.2, n: N });
  });
}

/** Fibres sèches au bout du trait (grand format), comme LOGO_BRISTLES. */
export function bristlesTo(t: number): string {
  const k = t.toFixed(4);
  return memo(`br:${k}`, () => (t < 0.05 ? "" : bristles(logoPts(), Math.max(0.01, t - 0.13), t + 0.006, 26, 13, 10)));
}

/** Axe du trait du logo (0 → LOGO_EXTENT), pour le masque qui se trace (pathLength 100). */
export function axis(n = 100): string {
  return memo(`axis${n}`, () => centerline(logoPts(), 0, LOGO_EXTENT, n));
}

/** Piste au crayon : le contour entier, en deux passes un peu tremblées. */
export function pencilTrack(passes = 2): string {
  return memo(`pencil${passes}`, () => {
    let d = offsetLine(logoPts(), 0, 1, 0, 41, 0.9, 150);
    if (passes > 1) d += " " + offsetLine(logoPts(), 0.004, 0.996, 0.9, 43, 0.8, 150);
    return d;
  });
}

/** Repères de construction (Épure) : cercle au compas et axes, autour du logo. */
export function guides(): string {
  return memo("guides", () => {
    const r = mulberry(5);
    let d = "";
    for (let p = 0; p < 2; p++) {
      const st = r() * Math.PI * 2, ext = Math.PI * 2 * (1.03 + r() * 0.05);
      const R = 124 + p * 1.6;
      const pts: string[] = [];
      for (let i = 0; i <= 72; i++) {
        const a = st + (ext * i) / 72;
        const k = 1 + ((r() - 0.5) * 1.6) / R;
        pts.push(`${(120 + R * k * Math.cos(a)).toFixed(1)} ${(120 + R * k * Math.sin(a)).toFixed(1)}`);
      }
      d += "M " + pts.join(" L ") + " ";
    }
    d += "M -14 120.4 L 254 119.6 M 119.6 -14 L 120.3 254";
    return d;
  });
}

export type CoteGeo = {
  /** ligne de cote parallèle au contour + tirets d'about */
  d: string;
  /** position du libellé, en % de la boîte (repère -20 -20 280 280) */
  x: number;
  y: number;
  /** ancrage du libellé selon la normale : -1 (à gauche du point), 0, 1 */
  ax: -1 | 0 | 1;
  ay: -1 | 0 | 1;
};

/** Boîte du SVG : le logo (240) et une marge pour les cotes. */
export const VIEW = { x: -8, y: -8, w: 256 } as const;
const toPct = (v: number, o: number) => ((v - o) / VIEW.w) * 100;

/** Cote le long du contour, de t0 à t1, à `off` unités à l'extérieur du trait. */
export function coteAlong(t0: number, t1: number, off = 26, labelOff = 13): CoteGeo {
  const key = `c${t0.toFixed(4)}:${t1.toFixed(4)}:${off}`;
  const d = memo(key, () => {
    const line = offsetLine(logoPts(), t0, t1, off, 3, 0, Math.max(8, Math.round((t1 - t0) * 120)));
    const tick = (t: number) => {
      const p = logoAt(t);
      const a = off - 5.5, b = off + 5.5;
      return `M ${(p.x + p.nx * a).toFixed(1)} ${(p.y + p.ny * a).toFixed(1)} L ${(p.x + p.nx * b).toFixed(1)} ${(p.y + p.ny * b).toFixed(1)}`;
    };
    return `${line} ${tick(t0)} ${tick(t1)}`;
  });
  const m = logoAt((t0 + t1) / 2);
  const lx = m.x + m.nx * (off + labelOff);
  const ly = m.y + m.ny * (off + labelOff);
  const ax = m.nx > 0.35 ? 1 : m.nx < -0.35 ? -1 : 0;
  const ay = m.ny > 0.35 ? 1 : m.ny < -0.35 ? -1 : 0;
  return { d, x: toPct(lx, VIEW.x), y: toPct(ly, VIEW.y), ax, ay };
}

/** Centre de l'ouverture du logo (où se pose le sceau « TENU »), en % de la boîte. */
export function opening(off = 4): { x: number; y: number } {
  const p = logoAt((LOGO_EXTENT + 1) / 2);
  return { x: toPct(p.x + p.nx * off, VIEW.x), y: toPct(p.y + p.ny * off, VIEW.y) };
}
