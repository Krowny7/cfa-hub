// Géométrie de l'encre, calculée à la volée : l'anneau du logo (même tracé que
// scripts/ink/ink-lib.cjs), des coups de pinceau effilés et des traits de
// crayon. Sert aux éléments dont la forme dépend d'une donnée (l'anneau du
// jour s'arrête au nombre de traits, avec une vraie fin de pinceau) ; les
// tracés fixes restent dans paths.ts et passent par <use> (InkDefs).
//
// Module neutre et déterministe (graines fixes) : le même tracé sort côté
// serveur et dans le navigateur. Aucun antislash ici (piège Tailwind).

export type Pt = [number, number];

const f = (n: number) => n.toFixed(1);

/** Générateur pseudo-aléatoire à graine (mulberry32), identique à ink-lib. */
export function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexPts(cx: number, cy: number, R: number): Pt[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as Pt;
  });
}

function roundedHex(h: Pt[], k = 0.15): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const v = h[i], p = h[(i + 5) % 6], n = h[(i + 1) % 6];
    const a: Pt = [v[0] + (p[0] - v[0]) * k, v[1] + (p[1] - v[1]) * k];
    const b: Pt = [v[0] + (n[0] - v[0]) * k, v[1] + (n[1] - v[1]) * k];
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      out.push([
        (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * v[0] + t * t * b[0],
        (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * v[1] + t * t * b[1],
      ]);
    }
  }
  return out;
}

/** Hexagone aux coins arrondis, départ au sommet du haut, sens horaire. */
export function ringPts(cx: number, cy: number, R: number): Pt[] {
  const c = roundedHex(hexPts(cx, cy, R));
  const minY = Math.min(...c.map((q) => q[1]));
  const i = c.findIndex((p) => p[1] === minY);
  return c.slice(i).concat(c.slice(0, i));
}

export type Sample = { x: number; y: number; tx: number; ty: number };

/** Point et tangente à la fraction t (0–1) d'un contour fermé. */
export function sampler(pts: Pt[], closed = true) {
  const P = closed ? pts.concat([pts[0]]) : pts;
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = L[L.length - 1];
  const at = (t: number): Sample => {
    const d = Math.max(0, Math.min(1, t)) * total;
    let i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    const a = P[i - 1], b = P[i];
    const seg = L[i] - L[i - 1] || 1;
    const u = (d - L[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, tx: (b[0] - a[0]) / seg, ty: (b[1] - a[1]) / seg };
  };
  return at;
}

const poly = (pts: Pt[], close = true) => "M " + pts.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + (close ? " Z" : "");

type BrushOpts = { inT?: number; outT?: number; var?: number; wobble?: number; n?: number };

/** Coup de pinceau à épaisseur variable le long d'un contour, de t0 à t1. */
export function brush(pts: Pt[], t0: number, t1: number, W: number, seed: number, o: BrushOpts = {}, closed = true): string {
  const r = mulberry(seed), S = sampler(pts, closed), N = o.n ?? 240;
  const Lp: Pt[] = [], Rp: Pt[] = [];
  const ph1 = r() * 6, ph2 = r() * 6;
  const v = o.var ?? 0.12;
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = S(t0 + (t1 - t0) * u), nx = -p.ty, ny = p.tx;
    const w =
      W *
      Math.pow(Math.min(1, u / (o.inT ?? 0.05)), 0.55) *
      Math.pow(Math.min(1, (1 - u) / (o.outT ?? 0.16)), 0.9) *
      (1 + v * Math.sin(u * 17 + ph1) + v * 0.6 * Math.sin(u * 41 + ph2));
    const off = (o.wobble ?? 1.2) * Math.sin(u * 9 + ph2);
    Lp.push([p.x + nx * (w / 2 + off), p.y + ny * (w / 2 + off)]);
    Rp.push([p.x - nx * (w / 2 - off), p.y - ny * (w / 2 - off)]);
  }
  return "M " + Lp.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " L " + Rp.reverse().map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " Z";
}

/** Fibres de pinceau sec (fin de trait). */
export function bristles(pts: Pt[], t0: number, t1: number, W: number, seed: number, count: number): string {
  const r = mulberry(seed), S = sampler(pts);
  let d = "";
  for (let k = 0; k < count; k++) {
    const o = (r() - 0.5) * W * 0.85, end = t1 - r() * 0.07 * (t1 - t0) * 6;
    let t = t0 + r() * 0.02;
    while (t < end) {
      const te = Math.min(end, t + 0.015 + r() * 0.05), w = 0.7 + r() * 1.7;
      const Lp: Pt[] = [], Rp: Pt[] = [];
      for (let i = 0; i <= 12; i++) {
        const tt = t + ((te - t) * i) / 12;
        const p = S(tt), nx = -p.ty, ny = p.tx;
        const prog = (tt - t0) / (t1 - t0), oo = o * (1 - prog * 0.5), ww = w * Math.sin((Math.PI * i) / 12) * 0.5 + 0.25;
        Lp.push([p.x + nx * (oo + ww), p.y + ny * (oo + ww)]);
        Rp.push([p.x + nx * (oo - ww), p.y + ny * (oo - ww)]);
      }
      d += "M " + Lp.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " L " + Rp.reverse().map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " Z ";
      t = te + 0.004 + r() * 0.03 * ((te - t0) / (t1 - t0));
    }
  }
  return d;
}

/** Ligne médiane d'un contour de t0 à t1 (axe d'un masque tracé). */
export function centerline(pts: Pt[], t0: number, t1: number, n = 120): string {
  const S = sampler(pts);
  return poly(
    Array.from({ length: n + 1 }, (_, i) => {
      const p = S(t0 + ((t1 - t0) * i) / n);
      return [p.x, p.y] as Pt;
    }),
    false,
  );
}

/** Trait parallèle au contour, décalé de `off` (vers l'extérieur si off > 0), légèrement tremblé (crayon). */
export function offsetLine(pts: Pt[], t0: number, t1: number, off: number, seed: number, jitter = 0, n = 90): string {
  const S = sampler(pts), r = mulberry(seed);
  return poly(
    Array.from({ length: n + 1 }, (_, i) => {
      const p = S(t0 + ((t1 - t0) * i) / n);
      // normale extérieure d'un contour horaire (repère SVG, y vers le bas) : (ty, -tx)
      return [p.x + p.ty * off + (r() - 0.5) * jitter, p.y - p.tx * off + (r() - 0.5) * jitter] as Pt;
    }),
    false,
  );
}

// ---------------------------------------------------------------------------
// L'anneau du logo : repère 0 0 240 240, hexagone de rayon 92. Le trait du logo
// couvre 74,5 % du contour (LOGO_EXTENT) ; le reste est le bout à conquérir.

export const LOGO_EXTENT = 0.745;
let logoCache: Pt[] | null = null;
export function logoPts(): Pt[] {
  if (!logoCache) logoCache = ringPts(120, 120, 92);
  return logoCache;
}

/** Point du contour du logo à la fraction t, avec sa normale extérieure. */
export function logoAt(t: number): { x: number; y: number; nx: number; ny: number; tx: number; ty: number } {
  const p = sampler(logoPts())(t);
  return { x: p.x, y: p.y, nx: p.ty, ny: -p.tx, tx: p.tx, ty: p.ty };
}

// ---------------------------------------------------------------------------
// Petits coups de pinceau libres (icônes, bâtons, coches)

/** Courbe lissée (Catmull-Rom) passant par les points, échantillonnée. */
function smooth(points: Pt[], per = 10): Pt[] {
  if (points.length < 3) {
    const [a, b] = points;
    return Array.from({ length: per + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / per, a[1] + ((b[1] - a[1]) * i) / per] as Pt);
  }
  const out: Pt[] = [];
  const P = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export type StrokeOpts = {
  /** épaisseur à l'appui */
  w: number;
  /** épaisseur relative à la levée (0 = pointe fine) */
  end?: number;
  /** part du trait où le pinceau se pose (attaque ronde) */
  attack?: number;
  /** irrégularité de l'épaisseur (0–0.3) */
  jitter?: number;
  seed?: number;
  /** échantillons par segment */
  per?: number;
};

/**
 * Un coup de pinceau qui passe par `points` : attaque appuyée et arrondie,
 * puis l'épaisseur décroît jusqu'à la levée. Renvoie un contour fermé (fill).
 */
export function stroke(points: Pt[], o: StrokeOpts): string {
  const line = smooth(points, o.per ?? 8);
  const r = mulberry(o.seed ?? 7);
  const n = line.length;
  const L: Pt[] = [], R: Pt[] = [];
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = cum[n - 1] || 1;
  const attack = o.attack ?? 0.12;
  const end = o.end ?? 0.35;
  const jit = o.jitter ?? 0.08;
  const ph = r() * 6;
  for (let i = 0; i < n; i++) {
    const u = cum[i] / total;
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
    const dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / dl, ny = (b[0] - a[0]) / dl;
    const press = u < attack ? 0.55 + 0.45 * Math.sin((u / attack) * (Math.PI / 2)) : 1 - (1 - end) * Math.pow((u - attack) / (1 - attack), 1.15);
    const w = (o.w / 2) * press * (1 + jit * Math.sin(u * 13 + ph) + jit * 0.5 * Math.sin(u * 29 + ph * 2));
    L.push([line[i][0] + nx * w, line[i][1] + ny * w]);
    R.push([line[i][0] - nx * w, line[i][1] - ny * w]);
  }
  // bout arrondi à l'attaque (le pinceau se pose), pointe à la levée
  const s0 = line[0], s1 = line[1] ?? line[0];
  const dl = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 1;
  const bx = -(s1[0] - s0[0]) / dl, by = -(s1[1] - s0[1]) / dl;
  const w0 = Math.hypot(L[0][0] - s0[0], L[0][1] - s0[1]);
  const cap: Pt[] = [];
  for (let k = 1; k < 6; k++) {
    const a = Math.PI * (k / 6);
    const cx = Math.cos(a), sx = Math.sin(a);
    // demi-cercle de R[0] à L[0], du côté opposé au trait
    const vx = R[0][0] - s0[0], vy = R[0][1] - s0[1];
    cap.push([s0[0] + vx * cx + bx * w0 * sx, s0[1] + vy * cx + by * w0 * sx]);
  }
  const outline = [...L, ...R.reverse(), ...cap];
  return "M " + outline.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " Z";
}
