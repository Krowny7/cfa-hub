import { HAUTEUR, LARGEUR, PLATEFORMES } from "@/lib/salles/jeu-combat";
import { RAYON_TETE, type Pantin, type Point, type Squelette, type Trace } from "@/lib/salles/jeu-pantin";

// Le dessin du mini-jeu : l'arène est une peinture (public/salles/arene.webp), les personnages
// sont peints au canevas à chaque image depuis les points du squelette (lib/salles/jeu-pantin).

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type Tenue = {
  peau: string;
  peauOmbre: string;
  cheveux: string;
  haut: string;
  hautOmbre: string;
  hautReflet: string;
  bas: string;
  basOmbre: string;
  ceinture: string;
  tabi: string;
  echarpe: string;
  echarpeOmbre: string;
  /** le mannequin n'a ni cheveux ni sabre */
  paille: boolean;
};

export type Humeur = "calme" | "colere" | "mal";

const CONTOUR = "#140d08";
const TRAIT = 2.4;

const ECHARPES = ["#3f7fb5", "#3d9a6a", "#d9a23a", "#8a5fb0", "#2fa3a3", "#c7608b"];

/** Assombrit une couleur #rrggbb. */
function ombre(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (d: number) => Math.round(((n >> d) & 255) * k);
  return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
}

const SAMOURAI: Omit<Tenue, "echarpe" | "echarpeOmbre"> = {
  peau: "#e9bb8e",
  peauOmbre: "#c08c62",
  cheveux: "#191420",
  haut: "#ece2cb",
  hautOmbre: "#b3a68c",
  hautReflet: "#fff8e6",
  bas: "#2b3556",
  basOmbre: "#1c233d",
  ceinture: "#c08f3e",
  tabi: "#f1e8d4",
  paille: false,
};

/** La tenue : le vermillon pour soi, une écharpe de couleur stable pour les autres. */
export function tenueDe(userId: string, moi: boolean): Tenue {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const echarpe = moi ? "#d8432a" : ECHARPES[h % ECHARPES.length];
  return { ...SAMOURAI, echarpe, echarpeOmbre: ombre(echarpe, 0.68) };
}

export const TENUE_MANNEQUIN: Tenue = {
  peau: "#c9a76d",
  peauOmbre: "#a4844f",
  cheveux: "#8d7144",
  haut: "#bb9c64",
  hautOmbre: "#94784a",
  hautReflet: "#dcc08a",
  bas: "#8e7246",
  basOmbre: "#6f5833",
  ceinture: "#5d4526",
  tabi: "#a4844f",
  echarpe: "#8d8579",
  echarpeOmbre: "#6a6359",
  paille: true,
};

const BLANC = "#fff6e4";
/** La même tenue toute blanche : le flash d'un coup reçu. */
export const flashDe = (t: Tenue): Tenue => ({ ...t, peau: BLANC, peauOmbre: BLANC, cheveux: BLANC, haut: BLANC, hautOmbre: BLANC, hautReflet: BLANC, bas: BLANC, basOmbre: BLANC, ceinture: BLANC, tabi: BLANC, echarpe: BLANC, echarpeOmbre: BLANC });

/** Un segment du corps : une forme qui s'affine entre deux points, cernée de noir. */
function membre(c: Ctx, a: Point, b: Point, ra: number, rb: number, couleur: string, reflet?: string) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const demi = Math.PI / 2;
  c.beginPath();
  c.arc(a.x, a.y, ra, angle + demi, angle - demi);
  c.arc(b.x, b.y, rb, angle - demi, angle + demi);
  c.closePath();
  c.fillStyle = couleur;
  c.fill();
  c.strokeStyle = CONTOUR;
  c.lineWidth = TRAIT;
  c.stroke();
  if (reflet) {
    // la lumière des lanternes vient d'en haut : le reflet longe le côté le plus haut du segment
    const cote = Math.cos(angle) >= 0 ? -1 : 1;
    const nx = -Math.sin(angle) * cote * -1;
    const ny = Math.cos(angle) * cote * -1;
    const sens = ny > 0 ? -1 : 1;
    c.strokeStyle = reflet;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(a.x + nx * sens * ra * 0.55, a.y + ny * sens * ra * 0.55);
    c.lineTo(b.x + nx * sens * rb * 0.55, b.y + ny * sens * rb * 0.55);
    c.stroke();
  }
}

function pied(c: Ctx, genou: Point, cheville: Point, face: number, couleur: string) {
  const sx = cheville.x - genou.x;
  const sy = cheville.y - genou.y;
  const d = Math.hypot(sx, sy) || 1;
  const signe = face >= 0 ? 1 : -1;
  // à plat au sol, et il suit un peu le tibia quand la jambe se lève
  const dx = (sy / d) * signe * 0.5 + signe * 0.5;
  const dy = (-sx / d) * signe * 0.5;
  const n = Math.hypot(dx, dy) || 1;
  membre(c, { x: cheville.x - (dx / n) * 2, y: cheville.y - (dy / n) * 2 - 1 }, { x: cheville.x + (dx / n) * 7, y: cheville.y + (dy / n) * 7 - 1 }, 3.8, 2.9, couleur);
}

function peindreEcharpe(c: Ctx, p: Pantin, t: Tenue) {
  const m = p.echarpe;
  const n = m.length;
  const bords: { g: Point; d: Point }[] = m.map((q, i) => {
    const a = m[Math.max(0, i - 1)];
    const b = m[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const large = 6.2 - (i / (n - 1)) * 3.6;
    return { g: { x: q.x - (dy / l) * large, y: q.y + (dx / l) * large }, d: { x: q.x + (dy / l) * large, y: q.y - (dx / l) * large } };
  });
  c.beginPath();
  c.moveTo(bords[0].g.x, bords[0].g.y);
  for (let i = 1; i < n; i++) {
    const a = bords[i - 1].g;
    const b = bords[i].g;
    c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  c.lineTo(bords[n - 1].g.x, bords[n - 1].g.y);
  c.lineTo(bords[n - 1].d.x, bords[n - 1].d.y);
  for (let i = n - 2; i >= 0; i--) {
    const a = bords[i + 1].d;
    const b = bords[i].d;
    c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  c.closePath();
  c.fillStyle = t.echarpe;
  c.fill();
  c.strokeStyle = CONTOUR;
  c.lineWidth = TRAIT;
  c.stroke();
  c.strokeStyle = t.echarpeOmbre;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(m[1].x, m[1].y);
  for (let i = 2; i < n; i++) c.lineTo(m[i].x, m[i].y);
  c.stroke();
}

function peindreSabre(c: Ctx, s: Squelette, t: Tenue) {
  const dx = s.bout.x - s.mainAvant.x;
  const dy = s.bout.y - s.mainAvant.y;
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const pommeau = { x: s.mainAvant.x - ux * 7, y: s.mainAvant.y - uy * 7 };
  c.lineCap = "round";
  c.strokeStyle = CONTOUR;
  c.lineWidth = 6.8;
  c.beginPath();
  c.moveTo(pommeau.x, pommeau.y);
  c.lineTo(s.bout.x, s.bout.y);
  c.stroke();
  c.strokeStyle = "#b98a52";
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(s.garde.x, s.garde.y);
  c.lineTo(s.bout.x, s.bout.y);
  c.stroke();
  c.strokeStyle = "#ecc78e";
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(s.garde.x + ux * 4, s.garde.y + uy * 4);
  c.lineTo(s.bout.x - ux * 3, s.bout.y - uy * 3);
  c.stroke();
  c.strokeStyle = t.basOmbre;
  c.lineWidth = 3.6;
  c.beginPath();
  c.moveTo(pommeau.x, pommeau.y);
  c.lineTo(s.garde.x, s.garde.y);
  c.stroke();
  c.strokeStyle = CONTOUR;
  c.lineWidth = 5.4;
  c.beginPath();
  c.moveTo(s.garde.x - uy * 5, s.garde.y + ux * 5);
  c.lineTo(s.garde.x + uy * 5, s.garde.y - ux * 5);
  c.stroke();
  c.strokeStyle = t.ceinture;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(s.garde.x - uy * 4.4, s.garde.y + ux * 4.4);
  c.lineTo(s.garde.x + uy * 4.4, s.garde.y - ux * 4.4);
  c.stroke();
}

function peindreTete(c: Ctx, s: Squelette, t: Tenue, humeur: Humeur) {
  const r = RAYON_TETE;
  c.save();
  c.translate(s.tete.x, s.tete.y);
  c.rotate(s.angleTete);
  c.scale(s.face, 1);
  c.lineWidth = TRAIT;
  c.strokeStyle = CONTOUR;
  if (!t.paille) {
    c.beginPath();
    c.arc(-9.5, -r + 0.5, 4.8, 0, Math.PI * 2);
    c.fillStyle = t.cheveux;
    c.fill();
    c.stroke();
  }
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fillStyle = t.paille ? t.peau : t.cheveux;
  c.fill();
  c.stroke();
  if (t.paille) {
    // la tête du mannequin : un sac de toile, deux croix cousues
    c.strokeStyle = t.peauOmbre;
    c.lineWidth = 1.3;
    for (const y of [-6, 6]) {
      c.beginPath();
      c.moveTo(-r + 3, y);
      c.lineTo(r - 3, y + 1);
      c.stroke();
    }
    c.strokeStyle = CONTOUR;
    c.lineWidth = 1.8;
    for (const [x, y] of [[8.5, -1.5]]) {
      c.beginPath();
      c.moveTo(x - 2.4, y - 2.4);
      c.lineTo(x + 2.4, y + 2.4);
      c.moveTo(x + 2.4, y - 2.4);
      c.lineTo(x - 2.4, y + 2.4);
      c.stroke();
    }
    c.restore();
    return;
  }
  c.beginPath();
  c.moveTo(0.5, -6.2);
  c.quadraticCurveTo(r + 0.6, -8.4, r + 0.3, 0.8);
  c.quadraticCurveTo(r - 0.6, r - 0.8, 3.4, r - 0.7);
  c.quadraticCurveTo(-3.6, r - 2.2, -2.8, 3);
  c.quadraticCurveTo(-2.4, -3, 0.5, -6.2);
  c.closePath();
  c.fillStyle = t.peau;
  c.fill();
  c.beginPath();
  c.arc(-1.4, 2.6, 2.6, 0, Math.PI * 2);
  c.fillStyle = t.peauOmbre;
  c.fill();
  c.strokeStyle = CONTOUR;
  c.lineCap = "round";
  if (humeur === "mal") {
    c.lineWidth = 1.7;
    c.beginPath();
    c.moveTo(5.4, -3);
    c.lineTo(9, -0.8);
    c.lineTo(5.4, 1.4);
    c.stroke();
  } else {
    c.fillStyle = CONTOUR;
    c.beginPath();
    c.ellipse(7.6, -0.6, 1.5, 2.6, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 1.9;
    c.beginPath();
    c.moveTo(4.4, humeur === "colere" ? -6.2 : -5.2);
    c.lineTo(10.4, humeur === "colere" ? -3.6 : -5);
    c.stroke();
  }
  c.restore();
}

/** Le personnage, de l'arrière vers l'avant. */
export function peindrePantin(c: Ctx, p: Pantin, tenueNormale: Tenue, humeur: Humeur) {
  const t = p.flash > 0 ? flashDe(tenueNormale) : tenueNormale;
  const s = p.squelette;
  c.lineJoin = "round";
  c.lineCap = "round";

  if (!t.paille) peindreEcharpe(c, p, t);

  membre(c, s.epauleArriere, s.coudeArriere, 6, 5.4, t.hautOmbre);
  membre(c, s.coudeArriere, s.mainArriere, 4.6, 3.3, t.peauOmbre);

  membre(c, s.hanche, s.genouArriere, 8, 6.4, t.basOmbre);
  membre(c, s.genouArriere, s.piedArriere, 6.2, 7.2, t.basOmbre);
  pied(c, s.genouArriere, s.piedArriere, s.face, t.tabi);

  membre(c, s.hanche, s.genouAvant, 8.4, 6.8, t.bas);
  membre(c, s.genouAvant, s.piedAvant, 6.6, 7.8, t.bas);
  pied(c, s.genouAvant, s.piedAvant, s.face, t.tabi);

  // le buste, le col croisé et la ceinture
  membre(c, s.hanche, s.cou, 11.4, 10, t.haut, t.hautReflet);
  const dx = s.cou.x - s.hanche.x;
  const dy = s.cou.y - s.hanche.y;
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  c.strokeStyle = t.hautOmbre;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(s.cou.x + uy * s.face * 7, s.cou.y - ux * s.face * 7);
  c.lineTo(s.hanche.x + ux * 7 - uy * s.face * 3, s.hanche.y + uy * 7 + ux * s.face * 3);
  c.stroke();
  const bx = s.hanche.x + ux * 2;
  const by = s.hanche.y + uy * 2;
  c.strokeStyle = CONTOUR;
  c.lineWidth = 7.6;
  c.lineCap = "butt";
  c.beginPath();
  c.moveTo(bx - uy * 11.4, by + ux * 11.4);
  c.lineTo(bx + uy * 11.4, by - ux * 11.4);
  c.stroke();
  c.strokeStyle = t.ceinture;
  c.lineWidth = 4.2;
  c.beginPath();
  c.moveTo(bx - uy * 10.6, by + ux * 10.6);
  c.lineTo(bx + uy * 10.6, by - ux * 10.6);
  c.stroke();
  c.lineCap = "round";

  if (!t.paille) membre(c, { x: s.cou.x - 6, y: s.cou.y + 1 }, { x: s.cou.x + 6, y: s.cou.y + 1 }, 5.2, 5.2, t.echarpe);

  peindreTete(c, s, t, humeur);

  if (!t.paille) peindreSabre(c, s, t);
  membre(c, s.epauleAvant, s.coudeAvant, 6.4, 5.8, t.haut, t.hautReflet);
  membre(c, s.coudeAvant, s.mainAvant, 4.8, 3.5, t.peau);
  c.beginPath();
  c.arc(s.mainAvant.x, s.mainAvant.y, 4, 0, Math.PI * 2);
  c.fillStyle = t.peau;
  c.fill();
  c.strokeStyle = CONTOUR;
  c.lineWidth = TRAIT;
  c.stroke();
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
    c.fillStyle = b.type === "fort" ? `rgba(226, 74, 42, ${0.92 * kb})` : `rgba(255, 244, 220, ${0.85 * kb})`;
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
  c.strokeStyle = CONTOUR;
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
