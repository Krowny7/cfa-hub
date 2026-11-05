import { HAUTEUR, LARGEUR, PLATEFORMES } from "@/lib/salles/jeu-combat";
import { RAYON_TETE, VIE_SILLAGE, type Pantin, type Point, type PortFourreau, type Trace } from "@/lib/salles/jeu-pantin";

// Le dessin du mini-jeu : l'arène est une peinture (public/salles/arene.webp), les personnages
// sont peints au canevas à chaque image depuis les points du squelette (lib/salles/jeu-pantin).
// Ils reprennent les combattants des peintures du site : une seule masse noire aux contours
// souples, sans aucune couleur ni ligne dure, que quelques touches claires au couteau font
// tenir (épaules, plis, taille). Tous sont noirs, seule l'écharpe change. Chaque morceau du
// corps est une courbe lisse, et comme tous ont le même noir, on ne voit que la silhouette.

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type Coiffe = "capuche" | "chignon" | "queue" | "sac";

export type Tenue = {
  corps: string;
  /** la lumière froide sur le haut de la silhouette */
  rim: string;
  /** les touches au couteau : la lumière, puis le second plan */
  clair: string;
  sombre: string;
  echarpe: string;
  echarpeOmbre: string;
  echarpeClair: string;
  /** combien de pans dépassent */
  pans: number;
  coiffe: Coiffe;
  /** la demi-largeur du pantalon */
  ample: number;
  /** sans fourreau ni sabre : le mannequin */
  fourreau: PortFourreau | null;
};

const ACIER = "#c4ccd6";
const CONTOUR_ACIER = "#0c0e18";

const NOIR = { corps: "#0b0b0f", rim: "#6f7e92", clair: "#d6dfe8", sombre: "#5f6e83", pans: 2, ample: 6.9 } as const;

/** Toi : le combattant à l'écharpe rouge des peintures. Personne d'autre ne porte ce rouge. */
const TOI: Tenue = { ...NOIR, echarpe: "#d8432a", echarpeOmbre: "#8c2c26", echarpeClair: "#f4917a", coiffe: "capuche", fourreau: "hanche" };

/** Les autres : la même encre, une écharpe chacun prise dans les couleurs du site. */
const AUTRES: Tenue[] = [
  { ...NOIR, echarpe: "#d6a13f", echarpeOmbre: "#94702a", echarpeClair: "#f2d48c", coiffe: "chignon", fourreau: "dos" },
  { ...NOIR, echarpe: "#6fa595", echarpeOmbre: "#4a7468", echarpeClair: "#add6c9", coiffe: "queue", fourreau: "travers" },
  { ...NOIR, echarpe: "#efe6d2", echarpeOmbre: "#b5a88d", echarpeClair: "#fffbf1", coiffe: "chignon", fourreau: "travers" },
  { ...NOIR, echarpe: "#8fa8c4", echarpeOmbre: "#62788f", echarpeClair: "#c6d7e9", coiffe: "capuche", fourreau: "dos" },
  { ...NOIR, echarpe: "#a97da6", echarpeOmbre: "#785576", echarpeClair: "#d6b6d3", coiffe: "queue", fourreau: "hanche" },
];

/** La tenue d'un joueur : la sienne pour soi, sinon celle de la place qu'il occupe dans le combat. */
export const tenueDe = (rang: number | null): Tenue => (rang === null ? TOI : AUTRES[rang % AUTRES.length]);

export const TENUE_MANNEQUIN: Tenue = {
  corps: "#b4945d",
  rim: "#e0c999",
  clair: "#e6d2a6",
  sombre: "#7c5f36",
  echarpe: "#000000",
  echarpeOmbre: "#000000",
  echarpeClair: "#000000",
  pans: 0,
  coiffe: "sac",
  ample: 5.6,
  fourreau: null,
};

const BLANC = "#fff6e4";
/** La même tenue toute blanche : le flash d'un coup reçu. */
const flashDe = (t: Tenue): Tenue => ({ ...t, corps: BLANC, rim: BLANC, clair: BLANC, sombre: BLANC, echarpe: BLANC, echarpeOmbre: BLANC, echarpeClair: BLANC });

/** Un segment du corps : une forme qui s'affine entre deux points. */
function capsule(a: Point, b: Point, ra: number, rb: number): Path2D {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const demi = Math.PI / 2;
  const p = new Path2D();
  p.arc(a.x, a.y, ra, angle + demi, angle - demi);
  p.arc(b.x, b.y, rb, angle - demi, angle + demi);
  p.closePath();
  return p;
}

function rond(q: Point, r: number): Path2D {
  const p = new Path2D();
  p.arc(q.x, q.y, r, 0, Math.PI * 2);
  return p;
}

const entre = (a: Point, b: Point, k: number): Point => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

/** Le pied, petit et pointu : à plat au sol, il suit un peu le tibia quand la jambe se lève. */
function pied(genou: Point, cheville: Point, face: number): Path2D {
  const sx = cheville.x - genou.x;
  const sy = cheville.y - genou.y;
  const d = Math.hypot(sx, sy) || 1;
  const signe = face >= 0 ? 1 : -1;
  const dx = (sy / d) * signe * 0.5 + signe * 0.5;
  const dy = (-sx / d) * signe * 0.5;
  const n = Math.hypot(dx, dy) || 1;
  return capsule({ x: cheville.x - (dx / n) * 1.5, y: cheville.y - 1.6 }, { x: cheville.x + (dx / n) * 7, y: cheville.y + (dy / n) * 7 - 1.1 }, 2.6, 1.3);
}

/** Un pan de l'écharpe : un ruban qui s'affine, lissé entre les maillons. */
function ruban(m: Point[], largeur: number): Path2D {
  const n = m.length;
  const g: Point[] = [];
  const d: Point[] = [];
  m.forEach((q, i) => {
    const a = m[Math.max(0, i - 1)];
    const b = m[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const large = largeur * (1 - (i / (n - 1)) * 0.4);
    g.push({ x: q.x - (dy / l) * large, y: q.y + (dx / l) * large });
    d.push({ x: q.x + (dy / l) * large, y: q.y - (dx / l) * large });
  });
  const p = new Path2D();
  p.moveTo(g[0].x, g[0].y);
  for (let i = 1; i < n; i++) p.quadraticCurveTo(g[i - 1].x, g[i - 1].y, (g[i - 1].x + g[i].x) / 2, (g[i - 1].y + g[i].y) / 2);
  p.lineTo(g[n - 1].x, g[n - 1].y);
  p.lineTo(d[n - 1].x, d[n - 1].y);
  for (let i = n - 2; i >= 0; i--) p.quadraticCurveTo(d[i + 1].x, d[i + 1].y, (d[i + 1].x + d[i].x) / 2, (d[i + 1].y + d[i].y) / 2);
  p.closePath();
  return p;
}

/** Une courbe lisse qui passe par tous les points. */
function courbe(pts: Point[]): Path2D {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n];
  const p = new Path2D();
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const a = at(i - 1);
    const b = at(i);
    const d = at(i + 1);
    const e = at(i + 2);
    p.bezierCurveTo(b.x + (d.x - a.x) / 6, b.y + (d.y - a.y) / 6, d.x - (e.x - b.x) / 6, d.y - (e.y - b.y) / 6, d.x, d.y);
  }
  p.closePath();
  return p;
}

/** Les deux bords d'une forme le long d'un axe, de demi-largeur `larges[i]` à chaque point. */
function bords(axe: Point[], larges: number[]): { g: Point[]; d: Point[] } {
  const n = axe.length;
  const g: Point[] = [];
  const d: Point[] = [];
  axe.forEach((q, i) => {
    const a = axe[Math.max(0, i - 1)];
    const b = axe[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    g.push({ x: q.x - (dy / l) * larges[i], y: q.y + (dx / l) * larges[i] });
    d.push({ x: q.x + (dy / l) * larges[i], y: q.y - (dx / l) * larges[i] });
  });
  return { g, d };
}

/** Un membre ou un pan de tissu : un seul contour souple autour de son axe. */
function membre(axe: Point[], larges: number[]): Path2D {
  const { g, d } = bords(axe, larges);
  return courbe([...g, ...d.reverse()]);
}

/** Une touche au couteau : elle naît en pointe, s'épaissit, et meurt en pointe. */
function touche(axe: Point[], large: number): Path2D {
  const n = axe.length;
  const { g, d } = bords(axe, axe.map((_, i) => large * Math.sin((i / (n - 1)) * Math.PI) ** 0.8));
  return courbe([...g, ...d.slice(1, -1).reverse()]);
}

const decale = (q: Point, v: Point, d: number): Point => ({ x: q.x + v.x * d, y: q.y + v.y * d });

/** Le bras et sa manche, qui pend sous l'avant-bras. */
function bras(e: Point, coude: Point, main: Point): Path2D[] {
  const a = entre(coude, main, 0.08);
  const b = entre(coude, main, 0.86);
  const bas = Math.max(a.y, b.y);
  return [
    membre([e, entre(e, coude, 0.5), coude, entre(coude, main, 0.55), main], [6.2, 5.6, 5, 4.2, 2.8]),
    courbe([a, { x: entre(a, b, 0.32).x, y: bas + 8 }, { x: entre(a, b, 0.78).x, y: bas + 6 }, b]),
    rond(main, 3),
  ];
}

/** La jambe du pantalon, ample jusqu'à l'ourlet. */
function jambe(h: Point, g: Point, p: Point, ample: number): Path2D {
  return membre([h, entre(h, g, 0.5), g, entre(g, p, 0.55), entre(g, p, 0.93)], [ample * 0.95, ample, ample * 0.84, ample * 0.8, ample * 0.92]);
}

/** Le crâne, de profil vers la droite, le centre de la tête en (0, 0) : un œuf, pas un rond. */
const CRANE: [number, number][] = [[6.2, 2], [6.8, -2.4], [4.7, -6.2], [-0.2, -7.8], [-5.4, -6.4], [-7.6, -1.6], [-6.8, 3.6], [-2.4, 6.8], [3.2, 6.8]];

/** Le crâne vu de face, et ce que la tête porte vu de face. */
const CRANE_FACE: [number, number][] = [[6.6, 1], [6.4, -3], [4, -6.6], [0, -7.8], [-4, -6.6], [-6.4, -3], [-6.6, 1], [-4.4, 5.2], [0, 7.2], [4.4, 5.2]];
const COIFFES_FACE: Record<Coiffe, [number, number][][]> = {
  capuche: [],
  chignon: [[[-2.4, -7.4], [-3.2, -10.6], [-1.2, -13.2], [1.2, -13.2], [3.2, -10.6], [2.4, -7.4]]],
  queue: [[[-4.4, -6], [-8.6, -5.4], [-10.6, 0], [-10, 6.4], [-7.6, 3], [-6.2, -1.4]]],
  sac: [],
};

/** Ce que la tête porte, dans le même repère. */
const COIFFES: Record<Coiffe, [number, number][][]> = {
  capuche: [[[-5.6, -5.4], [-9.8, -1.2], [-10.4, 4], [-7, 7.2], [-3.4, 6.2]]],
  chignon: [[[-3.8, -7.4], [-4.6, -10.4], [-2.6, -13.2], [0.8, -12.6], [1.6, -9.6], [0.4, -7.4]]],
  queue: [[[-4.8, -6.4], [-9.8, -7.8], [-14.6, -4.6], [-16.6, 2.4], [-15.2, 8.6], [-13.4, 3.4], [-11, -1.2], [-6.6, -1.8]]],
  sac: [],
};

/** La lame : fine, courbe, plus large près de la garde. */
function lame(garde: Point, bout: Point, face: number): Path2D {
  const dx = bout.x - garde.x;
  const dy = bout.y - garde.y;
  const l = Math.hypot(dx, dy) || 1;
  const signe = face >= 0 ? 1 : -1;
  const nx = (-dy / l) * signe;
  const ny = (dx / l) * signe;
  const milieu = entre(garde, bout, 0.55);
  const p = new Path2D();
  p.moveTo(garde.x - nx * 1.4, garde.y - ny * 1.4);
  p.quadraticCurveTo(milieu.x + nx * 2.6, milieu.y + ny * 2.6, bout.x, bout.y);
  p.quadraticCurveTo(milieu.x + nx * 5.4, milieu.y + ny * 5.4, garde.x + nx * 1.4, garde.y + ny * 1.4);
  p.closePath();
  return p;
}

/** Les silhouettes laissées par un dash, à la couleur du joueur. */
export function peindreSillage(c: Ctx, p: Pantin, tenue: Tenue) {
  c.fillStyle = tenue.pans > 0 ? tenue.echarpe : tenue.rim;
  for (const { s, age } of p.sillage) {
    const g = new Path2D();
    g.addPath(capsule(s.hanche, s.cou, 7, 9));
    g.addPath(rond(s.tete, RAYON_TETE));
    g.addPath(capsule(s.hanche, s.genouAvant, 6, 5));
    g.addPath(capsule(s.genouAvant, s.piedAvant, 5, 3));
    g.addPath(capsule(s.hanche, s.genouArriere, 6, 5));
    g.addPath(capsule(s.genouArriere, s.piedArriere, 5, 3));
    g.addPath(capsule(s.epauleAvant, s.mainAvant, 4.4, 3));
    c.globalAlpha = 0.42 * (1 - age / VIE_SILLAGE);
    c.fill(g);
  }
  c.globalAlpha = 1;
}

/** Le personnage. `clignote` : il vient de réapparaître et ne craint rien pour l'instant. */
export function peindrePantin(c: Ctx, p: Pantin, tenue: Tenue, clignote: boolean) {
  const flash = p.flash > 0;
  const t = flash ? flashDe(tenue) : tenue;
  const s = p.squelette;
  const paille = t.coiffe === "sac";
  const sens = s.face >= 0 ? 1 : -1;
  const deFace = s.deFace > 0.5;

  // le repère du buste : `a` le long du dos (0 le bassin, 1 le cou), `b` en pixels vers l'avant
  const hx = s.cou.x - s.hanche.x;
  const hy = s.cou.y - s.hanche.y;
  const hl = Math.hypot(hx, hy) || 1;
  const ux = hx / hl;
  const uy = hy / hl;
  const B = (a: number, b: number): Point => ({ x: s.hanche.x + hx * a - uy * sens * b, y: s.hanche.y + hy * a + ux * sens * b });
  // le repère de la tête
  const cos = Math.cos(s.angleTete);
  const sin = Math.sin(s.angleTete);
  const T = ([x, y]: [number, number]): Point => ({ x: s.tete.x + x * s.face * cos - y * sin, y: s.tete.y + x * s.face * sin + y * cos });
  /** le côté d'un segment qui reçoit la lumière, venue d'en haut et de devant */
  const cote = (a: Point, b: Point): Point => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = dy / l;
    const ny = -dx / l;
    return nx * sens * 0.5 - ny >= 0 ? { x: nx, y: ny } : { x: -nx, y: -ny };
  };

  const formes: Path2D[] = [];
  const clairs: Path2D[] = [];
  const sombres: Path2D[] = [];

  formes.push(...bras(s.epauleArriere, s.coudeArriere, s.mainArriere));

  // le bas : deux jambes amples, et le tissu qui les relie
  const ourletAvant = entre(s.genouAvant, s.piedAvant, 0.62);
  const ourletArriere = entre(s.genouArriere, s.piedArriere, 0.62);
  const creux = entre(entre(ourletAvant, ourletArriere, 0.5), s.hanche, 0.42);
  formes.push(jambe(s.hanche, s.genouArriere, s.piedArriere, t.ample), pied(s.genouArriere, s.piedArriere, s.face));
  formes.push(jambe(s.hanche, s.genouAvant, s.piedAvant, t.ample), pied(s.genouAvant, s.piedAvant, s.face));
  formes.push(courbe([B(0.08, -8.6), ourletArriere, creux, ourletAvant, B(0.08, 8.6)]));

  // le buste, d'un seul contour, et le bas de la veste
  formes.push(
    courbe(
      deFace
        ? [B(1.03, 3.6), B(0.88, 11), B(0.56, 9.6), B(0.24, 6.8), B(0, 7.6), B(-0.28, 9), B(-0.32, 0), B(-0.28, -9), B(0, -7.6), B(0.24, -6.8), B(0.56, -9.6), B(0.88, -11), B(1.03, -3.6)]
        : [B(1.03, 3.2), B(0.86, 7.8), B(0.56, 8.2), B(0.24, 6.2), B(0, 7.4), B(-0.28, 8.8), B(-0.32, 0), B(-0.28, -8.8), B(0, -7.4), B(0.26, -6.4), B(0.6, -9.2), B(0.9, -9), B(1.05, -3.4)],
    ),
  );
  formes.push(courbe((deFace ? CRANE_FACE : CRANE).map(T)));
  for (const f of (deFace ? COIFFES_FACE : COIFFES)[t.coiffe]) formes.push(courbe(f.map(T)));

  const devant = bras(s.epauleAvant, s.coudeAvant, s.mainAvant);

  const fourreauPts = t.fourreau ? s.fourreau[t.fourreau] : null;
  const dansLeDos = t.fourreau === "dos";
  const fourreau = fourreauPts ? membre([fourreauPts[0], entre(fourreauPts[0], fourreauPts[1], 0.5), fourreauPts[1]], [2.1, 2.2, 1.5]) : null;

  // les pans passent derrière le corps, avec leur ombre et leur lumière
  const pans = p.pans.slice(0, t.pans);
  for (const m of pans) {
    c.fillStyle = t.echarpe;
    c.fill(ruban(m, 3.3));
    c.fillStyle = t.echarpeOmbre;
    c.fill(touche(m.slice(1).map((q) => ({ x: q.x, y: q.y + 1.5 })), 1.1));
    c.fillStyle = t.echarpeClair;
    c.fill(touche(m.slice(1, -1).map((q) => ({ x: q.x, y: q.y - 1.4 })), 0.9));
  }

  // la silhouette : une lumière froide déborde sur le haut, puis tout est rempli du même noir
  c.lineJoin = "round";
  c.lineCap = "round";
  const tout = fourreau ? [fourreau, ...formes, ...devant] : [...formes, ...devant];
  c.save();
  if (!clignote) c.translate(-0.45 * sens, -0.85);
  c.strokeStyle = clignote ? BLANC : t.rim;
  c.lineWidth = clignote ? 3.4 : 1;
  for (const f of tout) c.stroke(f);
  c.restore();
  c.fillStyle = t.corps;
  if (fourreau && dansLeDos) c.fill(fourreau);
  for (const f of formes) c.fill(f);
  if (fourreau && !dansLeDos) c.fill(fourreau);

  // les touches au couteau : le dos ou le col en V, la veste, la taille, les plis
  if (deFace) {
    clairs.push(touche([B(0.9, 3.8), B(0.62, 1.8), B(0.32, 0)], 1.05));
    clairs.push(touche([B(0.9, -3.8), B(0.62, -1.8), B(0.32, 0)], 1.05));
    sombres.push(touche([B(0.74, 8.6), B(0.5, 7.4), B(0.3, 5.6)], 0.9));
    sombres.push(touche([B(0.74, -8.6), B(0.5, -7.4), B(0.3, -5.6)], 0.9));
  } else {
    sombres.push(touche([B(0.94, -8.2), B(0.7, -9.2), B(0.44, -8), B(0.24, -6.2)], 1.2));
    clairs.push(touche([B(0.86, 4.8), B(0.62, 1.4), B(0.38, -2.4), B(0.2, -5)], 1.05));
    sombres.push(touche([B(0.66, 7.4), B(0.46, 6.8), B(0.3, 5.4)], 0.9));
  }
  clairs.push(touche([B(0.2, 7), B(0.15, 2.4), B(0.16, -2.6), B(0.22, -6.8)], 1.3));
  sombres.push(touche([B(0.05, 7.8), B(0.02, 2.4), B(0.04, -3), B(0.1, -7.4)], 1.1));
  clairs.push(touche([B(-0.24, 8.6), B(-0.29, 2), B(-0.27, -4), B(-0.22, -8.4)], 0.9));
  const nv = cote(s.hanche, s.genouAvant);
  const nb = cote(s.genouAvant, s.piedAvant);
  clairs.push(touche([decale(entre(s.hanche, s.genouAvant, 0.2), nv, 6.4), decale(entre(s.hanche, s.genouAvant, 0.65), nv, 7.2), decale(s.genouAvant, nb, 6.8), decale(entre(s.genouAvant, s.piedAvant, 0.45), nb, 6.6)], 1.3));
  sombres.push(touche([decale(entre(s.hanche, s.genouAvant, 0.45), nv, 0.6), decale(s.genouAvant, nb, 1), decale(entre(s.genouAvant, s.piedAvant, 0.5), nb, 1.6), decale(entre(s.genouAvant, s.piedAvant, 0.86), nb, 2.2)], 1));
  const na = cote(s.genouArriere, s.piedArriere);
  sombres.push(touche([decale(s.genouArriere, na, 6), decale(entre(s.genouArriere, s.piedArriere, 0.5), na, 6.2), decale(entre(s.genouArriere, s.piedArriere, 0.88), na, 6.4)], 1));
  if (deFace && !paille) {
    // il nous regarde : le bord de la capuche ou du masque, et deux éclats pour les yeux
    const tete = (pts: [number, number][]) => pts.map(T);
    clairs.push(touche(tete([[-5.8, -2.8], [-3.4, -6], [0, -6.9], [3.4, -6], [5.8, -2.8]]), 0.9));
    sombres.push(touche(tete([[-5, 0.6], [-3, 4.4], [0, 5.6], [3, 4.4], [5, 0.6]]), 0.8));
    clairs.push(touche(tete([[-4.4, -2], [-2.8, -1.1], [-1.2, -0.7]]), 0.95));
    clairs.push(touche(tete([[4.4, -2], [2.8, -1.1], [1.2, -0.7]]), 0.95));
  } else if (t.coiffe === "capuche") {
    clairs.push(touche(([[-6, -3.6], [-3.4, -6.2], [0.4, -6.9], [3.4, -5.4]] as [number, number][]).map(T), 1));
    sombres.push(touche(([[3.6, -5.2], [1.9, -0.8], [2.4, 3.2], [3.8, 6]] as [number, number][]).map(T), 0.9));
  } else if (!paille) {
    clairs.push(touche(([[-5.6, -3.4], [-3, -6], [0.6, -6.6], [3.6, -4.8]] as [number, number][]).map(T), 0.8));
    sombres.push(touche(([[-3.6, -7.6], [-1.6, -8.3], [0.6, -7.7]] as [number, number][]).map(T), 0.8));
  }
  if (fourreauPts) {
    const n = cote(fourreauPts[0], fourreauPts[1]);
    sombres.push(touche([decale(fourreauPts[0], n, 1.2), decale(entre(fourreauPts[0], fourreauPts[1], 0.5), n, 1.4), decale(fourreauPts[1], n, 1)], 0.7));
  }
  if (!flash) {
    c.fillStyle = t.sombre;
    for (const f of sombres) c.fill(f);
    c.fillStyle = t.clair;
    for (const f of clairs) c.fill(f);
  }

  if (paille) {
    // le mannequin : un sac de toile, une croix pour l'œil
    c.save();
    c.translate(s.tete.x, s.tete.y);
    c.rotate(s.angleTete);
    c.scale(s.face, 1);
    c.strokeStyle = t.sombre;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(1.6, -3.4);
    c.lineTo(5.4, 0.4);
    c.moveTo(5.4, -3.4);
    c.lineTo(1.6, 0.4);
    c.stroke();
    c.restore();
  }

  // l'écharpe autour du cou, épaisse, avec son ombre et sa lumière
  if (t.pans > 0) {
    const a = B(1.02, -8.2);
    const m = B(0.93, -0.6);
    const b = B(1.05, 7.2);
    c.fillStyle = t.echarpe;
    c.fill(membre([a, m, b], [3.3, 4.8, 3]));
    c.fillStyle = t.echarpeOmbre;
    c.fill(touche([decale(a, { x: ux, y: uy }, -2.4), decale(m, { x: ux, y: uy }, -3), decale(b, { x: ux, y: uy }, -2)], 1.1));
    c.fillStyle = t.echarpeClair;
    c.fill(touche([decale(a, { x: ux, y: uy }, 1.8), decale(m, { x: ux, y: uy }, 2.4), decale(b, { x: ux, y: uy }, 1.4)], 0.9));
    if (deFace) {
      // le nœud sur la poitrine
      c.fillStyle = t.echarpe;
      c.fill(rond(B(0.86, 1.2), 3.4));
      c.fill(membre([B(0.86, 1.2), B(0.66, 2.6), B(0.5, 1.2)], [2.2, 2.6, 1.2]));
      c.fillStyle = t.echarpeClair;
      c.fill(touche([B(0.92, -0.6), B(0.72, 1.6), B(0.54, 1.6)], 0.7));
    }
  }

  if (t.fourreau) {
    const signe = s.face >= 0 ? 1 : -1;
    const l2 = Math.hypot(s.bout.x - s.mainAvant.x, s.bout.y - s.mainAvant.y) || 1;
    const lx = (s.bout.x - s.mainAvant.x) / l2;
    const ly = (s.bout.y - s.mainAvant.y) / l2;
    const pommeau = { x: s.mainAvant.x - lx * 7, y: s.mainAvant.y - ly * 7 };
    const fer = lame(s.garde, s.bout, signe);
    c.strokeStyle = CONTOUR_ACIER;
    c.lineWidth = 1.6;
    c.stroke(fer);
    c.fillStyle = flash ? BLANC : ACIER;
    c.fill(fer);
    c.fillStyle = flash ? BLANC : CONTOUR_ACIER;
    c.fill(capsule(pommeau, s.garde, 2, 2));
    c.fillStyle = t.sombre;
    c.fill(rond(s.garde, 2.5));
  }

  c.fillStyle = t.corps;
  for (const f of devant) c.fill(f);
  if (!flash) {
    const n1 = cote(s.epauleAvant, s.coudeAvant);
    const n2 = cote(s.coudeAvant, s.mainAvant);
    c.fillStyle = t.clair;
    c.fill(touche([B(0.99, -5.4), decale(s.epauleAvant, n1, 6), decale(entre(s.epauleAvant, s.coudeAvant, 0.55), n1, 5.3), decale(s.coudeAvant, n2, 4.8), decale(entre(s.coudeAvant, s.mainAvant, 0.55), n2, 3.8)], 1.4));
    c.fillStyle = t.sombre;
    c.fill(touche([decale(entre(s.coudeAvant, s.mainAvant, 0.2), n2, -3), decale(entre(s.coudeAvant, s.mainAvant, 0.5), n2, -6), decale(entre(s.coudeAvant, s.mainAvant, 0.8), n2, -4.6)], 0.8));
  }
}

/** L'ombre au sol : elle rétrécit et s'efface quand on monte. */
export function peindreOmbre(c: Ctx, x: number, y: number) {
  let sol: number | null = null;
  for (const p of PLATEFORMES) {
    if (x >= p.x - 6 && x <= p.x + p.l + 6 && p.y >= y - 3 && (sol === null || p.y < sol)) sol = p.y;
  }
  if (sol === null) return;
  const k = Math.max(0.3, 1 - (sol - y) / 240);
  c.fillStyle = `rgba(8, 5, 3, ${0.55 * k})`;
  c.beginPath();
  c.ellipse(x, sol + 2, 8 + 22 * k, 2 + 4 * k, 0, 0, Math.PI * 2);
  c.fill();
}

/** La trace de la lame : un croissant qui s'efface vite. */
export function peindreTrace(c: Ctx, trace: Trace[], vie: number) {
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1];
    const b = trace[i];
    if (a.type !== b.type) continue;
    const ka = Math.max(0, 1 - a.age / vie);
    const kb = Math.max(0, 1 - b.age / vie);
    c.fillStyle = b.type === "fort" || b.type === "final" ? `rgba(226, 74, 42, ${0.92 * kb})` : `rgba(255, 244, 220, ${0.85 * kb})`;
    // plus la trace est vieille, plus elle s'affine : un croissant qui finit en pointe
    c.beginPath();
    c.moveTo(a.bx, a.by);
    c.lineTo(b.bx, b.by);
    c.lineTo(b.bx + (b.ix - b.bx) * kb, b.by + (b.iy - b.by) * kb);
    c.lineTo(a.bx + (a.ix - a.bx) * ka, a.by + (a.iy - a.by) * ka);
    c.closePath();
    c.fill();
  }
}

export type Poussiere = { x: number; y: number; vx: number; vy: number; r: number; vie: number; max: number };

export function peindrePoussiere(c: Ctx, liste: Poussiere[]) {
  for (const p of liste) {
    const k = p.vie / p.max;
    c.fillStyle = `rgba(214, 186, 142, ${0.42 * k})`;
    c.beginPath();
    c.arc(p.x, p.y, p.r * (1.7 - k * 0.7), 0, Math.PI * 2);
    c.fill();
  }
}

export type Eclat = { x: number; y: number; vie: number; max: number; fort: boolean; tourne: number };

/** L'étoile d'encre au point d'impact, le temps de quelques images. */
export function peindreEclat(c: Ctx, e: Eclat) {
  const k = 1 - e.vie / e.max;
  const r = (e.fort ? 58 : 36) * (0.55 + k * 0.6);
  const branches = e.fort ? 9 : 7;
  c.beginPath();
  for (let i = 0; i < branches * 2; i++) {
    const a = e.tourne + (i / (branches * 2)) * Math.PI * 2;
    const d = i % 2 === 0 ? r : r * 0.38;
    if (i === 0) c.moveTo(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d);
    else c.lineTo(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d);
  }
  c.closePath();
  c.fillStyle = e.fort ? "#e24a2a" : "#fff4dc";
  c.fill();
  c.strokeStyle = "#140d08";
  c.lineWidth = 3;
  c.lineJoin = "round";
  c.stroke();
}

let decor: HTMLImageElement | null = null;

/** L'arène. Tant que la peinture n'est pas chargée, un fond sombre et les plateformes. */
export function peindreArene(c: Ctx) {
  if (!decor && typeof Image !== "undefined") {
    decor = new Image();
    decor.src = "/salles/arene.webp";
  }
  c.fillStyle = "#0d0906";
  c.fillRect(-20, -20, LARGEUR + 40, HAUTEUR + 40);
  if (decor?.complete && decor.naturalWidth > 0) {
    c.drawImage(decor, 0, 0, LARGEUR, HAUTEUR);
    return;
  }
  for (const p of PLATEFORMES) {
    c.fillStyle = "#6b4a2f";
    c.fillRect(p.x, p.y, p.l, p.traversable ? 12 : 30);
  }
}
