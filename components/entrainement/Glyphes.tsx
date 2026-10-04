import { stroke, type Pt } from "@/components/ink/geometry";

/**
 * Deux glyphes de S'entraîner dans la main des icônes maison
 * (components/adn/icons.tsx) : mêmes traits de pinceau, même grille de 24,
 * pour que la liste des formats ne mélange pas deux familles d'icônes.
 *   qcm      une coche, puis trois lignes de réponses
 *   calculs  le pavé + − × =
 * Sans état ni hook : utilisable côté serveur. Tracés calculés une fois.
 */
export type GlypheNom = "qcm" | "calculs";

type S = { p: Pt[]; w: number; end?: number; attack?: number };
const s = (p: Pt[], w = 2.2, end = 0.5, attack = 0.18): S => ({ p, w, end, attack });

const TRAITS: Record<GlypheNom, S[]> = {
  qcm: [
    s([[3.4, 6.4], [5.3, 8.6], [8.8, 4.2]], 2.3, 0.4, 0.14),
    s([[11.2, 6.5], [15.8, 6.4], [20.6, 6.6]], 2, 0.5),
    s([[11.2, 12.2], [15.8, 12.1], [20.6, 12.3]], 2, 0.5),
    s([[11.2, 17.9], [14.4, 17.8], [17.6, 18]], 2, 0.5),
  ],
  calculs: [
    s([[3.6, 7.1], [7, 7], [10.4, 7.2]], 2.2, 0.5),
    s([[7, 3.7], [7.1, 7], [6.9, 10.5]], 2.2, 0.5),
    s([[13.6, 7.1], [17, 7], [20.4, 7.2]], 2.2, 0.5),
    s([[4.2, 14.2], [7, 17], [9.8, 19.8]], 2.1, 0.5),
    s([[9.8, 14.2], [7, 17], [4.2, 19.8]], 2.1, 0.5),
    s([[13.6, 15.3], [17, 15.2], [20.4, 15.4]], 2.1, 0.5),
    s([[13.6, 19], [17, 18.9], [20.4, 19.1]], 2.1, 0.5),
  ],
};

/** Points d'encre ronds (cx, cy, r) en plus des traits. */
const POINTS: Partial<Record<GlypheNom, [number, number, number][]>> = {
  qcm: [
    [5.8, 12.2, 1.35],
    [5.8, 17.9, 1.35],
  ],
};
const rond = ([cx, cy, r]: [number, number, number]) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

const cache = new Map<GlypheNom, string[]>();
function traces(nom: GlypheNom): string[] {
  let d = cache.get(nom);
  if (d) return d;
  d = TRAITS[nom].map((g, i) => stroke(g.p, { w: g.w, end: g.end, attack: g.attack, jitter: 0.06, seed: 29 + i * 11, per: 7 }));
  for (const p of POINTS[nom] ?? []) d.push(rond(p));
  cache.set(nom, d);
  return d;
}

export function Glyphe({ nom, size = 20, className = "" }: { nom: GlypheNom; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden className={"shrink-0 " + className}>
      {traces(nom).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
