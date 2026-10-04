// L'insigne de rang (V2, validé le 2026-10-04) : la géométrie de chaque
// palier (repère 200 × 200), ses métaux, son liquide marbré et son aura
// électrique. Module neutre : le composant (components/ui/RankBadge.tsx),
// l'animation (components/ui/rank-badge-anim.ts) et les outils de rendu des
// images figées (petites tailles, textures du liquide) le partagent.

export type Pt = [number, number];
export type Forme = Pt[];

const C = (y: number, h: number, w: number, p: number): Forme => [
  [100 - w, y],
  [100, y + p],
  [100 + w, y],
  [100 + w, y + h],
  [100, y + p + h],
  [100 - w, y + h],
];
const miroir = (a: Forme): Forme => a.map(([x, y]) => [200 - x, y] as Pt);
const sym = (list: Forme[]): Forme[] => [...list, ...list.map(miroir)];

const chevOr = C(92, 28, 64, 44);
const piliersOr = sym([[[60, 38], [84, 50], [84, 126], [60, 110]]]);
const ailesP = sym([[[36, 98], [8, 54], [50, 70], [62, 106]]]);

const chevH = C(100, 26, 66, 44);
const piliersH = sym([[[58, 46], [82, 58], [82, 134], [58, 118]]]);
const colonne: Forme = [[88, 42], [100, 30], [112, 42], [112, 128], [100, 140], [88, 128]];
const fleuron: Forme = [[89, 38], [92, 18], [98, 30], [100, 10], [102, 30], [108, 18], [111, 38], [100, 44]];
const lames2 = sym([[[58, 94], [12, 50], [32, 78], [58, 106]], [[58, 110], [16, 92], [36, 104], [58, 120]]]);
const lames3 = sym([[[58, 90], [8, 40], [30, 70], [58, 102]], [[58, 104], [4, 76], [32, 92], [58, 114]], [[58, 118], [12, 112], [36, 118], [58, 128]]]);
// de gros traits en arrière, parallèles aux bras du chevron (Grand Maître : un de chaque côté ; Top 10 : deux)
const brasChevron = (x0: number, y0: number, x1: number, ep: number): Forme => {
  const y1 = y0 + (x1 - x0) * (44 / 66);
  return [[x0, y0], [x1, y1], [x1, y1 + ep], [x0, y0 + ep]];
};
const trait1 = brasChevron(20, 62, 80, 24);
const trait2 = brasChevron(6, 34, 72, 22);

export type Elec = {
  /** couleur de l'aura (et des arcs) ; c2 : seconde couleur d'arcs */
  c: string;
  c2?: string;
  /** épaisseur, déformation, opacité de l'aura */
  l: number;
  d: number;
  op: number;
  /** arcs : intervalle moyen (ms, 0 = aucun) et nombre par rafale */
  arcs: number;
  n?: number;
};

export type InsigneDef = {
  /** le corps (devant), les pièces d'arrière-plan, le cimier */
  corps: Forme[];
  arriere?: Forme[];
  cimier?: Forme;
  /** liseré [clair, moyen, sombre] */
  metal: [string, string, string];
  /** liquide [fond, principal, bandes, traînées claires] */
  liquide: [string, string, string, string];
  /** un filet de lumière court le long du contour */
  course?: boolean;
  elec?: Elec;
};

/** Un insigne par palier, dans l'ordre de TIERS (lib/ranks.ts). */
export const INSIGNES: InsigneDef[] = [
  { corps: [C(56, 38, 68, 50)], metal: ["#FFD7B8", "#C9834F", "#6B3518"], liquide: ["#7A1F10", "#F06A2A", "#E8406E", "#FFD9A3"] },
  { corps: [C(80, 30, 66, 46), C(42, 22, 48, 34)], metal: ["#FFFFFF", "#C2C9D2", "#535B66"], liquide: ["#5A6B84", "#D5E1EF", "#8FB2DE", "#FFFFFF"] },
  { corps: [chevOr, ...piliersOr], metal: ["#FFF3C4", "#DDAE45", "#6F4C0E"], liquide: ["#8A4E05", "#FFB81F", "#FF7A1F", "#FFF4B0"] },
  {
    corps: [chevOr, ...piliersOr, ...ailesP],
    metal: ["#FFFFFF", "#CFD8E3", "#5F6B7A"],
    liquide: ["#13708C", "#7FE3F5", "#2FA9D8", "#F2FEFF"],
    elec: { c: "#9FF0FF", l: 3, d: 6, op: 0.55, arcs: 0 },
  },
  {
    corps: [chevH, ...piliersH],
    arriere: lames2,
    metal: ["#FFFFFF", "#CFD8E3", "#5F6B7A"],
    liquide: ["#1A239A", "#4F74FF", "#8A3CF0", "#B5E0FF"],
    elec: { c: "#58B6FF", l: 4.5, d: 9, op: 0.8, arcs: 2600, n: 1 },
  },
  {
    corps: [chevH, ...piliersH, colonne],
    arriere: lames3,
    metal: ["#FFF3C4", "#DDAE45", "#6F4C0E"],
    liquide: ["#5A0614", "#E8193E", "#FF6A3A", "#FFC0A6"],
    course: true,
    elec: { c: "#FF6A3D", l: 5, d: 10, op: 0.85, arcs: 1800, n: 2 },
  },
  {
    corps: [chevH, ...piliersH, colonne],
    arriere: sym([trait1]),
    cimier: fleuron,
    metal: ["#FFF6D2", "#E2B64D", "#6F4C0E"],
    liquide: ["#060508", "#17120A", "#5E4210", "#F2C55A"],
    course: true,
    elec: { c: "#FFC94A", l: 5.5, d: 11, op: 0.9, arcs: 1200, n: 2 },
  },
  {
    corps: [chevH, ...piliersH, colonne],
    arriere: sym([trait2, trait1]),
    cimier: fleuron,
    metal: ["#FFF6D2", "#E2B64D", "#6F4C0E"],
    liquide: ["#16063A", "#6424E0", "#B56BFF", "#7FEAF8"],
    course: true,
    elec: { c: "#B57CFF", c2: "#67E8F9", l: 6, d: 12, op: 1, arcs: 750, n: 3 },
  },
];

/** Toutes les formes d'un insigne, de l'arrière vers l'avant. */
export const formesDe = (d: InsigneDef): Forme[] => [...(d.arriere ?? []), ...(d.cimier ? [d.cimier] : []), ...d.corps];

export const pts = (a: Forme) => a.map(([x, y]) => `${+x.toFixed(1)},${+y.toFixed(1)}`).join(" ");
export const chemin = (a: Forme) => "M" + a.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L") + " Z";

/** Le liquide figé : instant et graine fixes par palier (le même partout). */
export const liquideFige = (i: number) => ({ t: 6 + i * 2.3, graine: (i * 7.3 + 5.1) % 40 });

/** Le fluide marbré (WebGL) : bruit fractal déformé en cascade, bandes qui s'y enroulent. */
export const LIQUIDE_FRAG = `
precision highp float;
uniform vec2 res; uniform float t; uniform float graine;
uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int k = 0; k < 5; k++) { v += a * bruit(p); p = m * p; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  vec2 p = uv * 1.7 + vec2(graine, graine * 0.7);
  float tt = t * 0.32;
  vec2 q = vec2(fbm(p + vec2(0.0, tt * 0.5)), fbm(p + vec2(5.2, 1.3) - vec2(tt * 0.4, 0.0)));
  vec2 r = vec2(fbm(p + 4.2 * q + vec2(1.7, 9.2) + vec2(tt * 0.35, -tt * 0.2)), fbm(p + 4.2 * q + vec2(8.3, 2.8) - vec2(0.0, tt * 0.3)));
  float f = fbm(p + 4.2 * r);
  float champ = f * 2.2 + r.x * 0.9 + q.y * 0.6;
  float bandes = 0.5 + 0.5 * sin(champ * 7.5 - tt * 2.2);
  vec3 col = mix(c0, c1, smoothstep(0.15, 0.75, f + 0.15 * q.x));
  col = mix(col, c2, smoothstep(0.32, 0.7, bandes) * 0.8);
  col = mix(col, c3, pow(smoothstep(0.72, 1.0, bandes), 1.6) * 0.9);
  col *= 0.78 + 0.22 * smoothstep(0.02, 0.18, bandes);
  gl_FragColor = vec4(col, 1.0);
}`;
export const LIQUIDE_VERT = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;
