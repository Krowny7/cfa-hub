import { HAUTEUR, LARGEUR, PLATEFORMES } from "@/lib/salles/jeu-combat";
import { RAYON_TETE, type Pantin, type Point, type PortFourreau, type Trace } from "@/lib/salles/jeu-pantin";

// Le dessin du mini-jeu : l'arène est une peinture (public/salles/arene.webp), les personnages
// sont peints au canevas à chaque image depuis les points du squelette (lib/salles/jeu-pantin).
// Ils reprennent les combattants des peintures du site : de vraies silhouettes d'encre, sans
// visage, élancées, le sabre fin et le fourreau à la hanche. Sur le bois sombre de l'arène, le
// noir disparaîtrait : tout le corps est d'abord tracé en clair, puis rempli, ce qui laisse un
// fin liseré autour de la silhouette et aucune ligne à l'intérieur.

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type Coiffe = "crochet" | "boule" | "queue" | "bouchon" | "capuche" | "meche" | "sac";
type Coupe = "hakama" | "serre" | "jupe";

export type Tenue = {
  corps: string;
  bras: string;
  jambe: string;
  jambeArriere: string;
  ceinture: string;
  lisere: string;
  echarpe: string;
  echarpeOmbre: string;
  /** combien de pans dépassent, et jusqu'où */
  pans: number;
  pansCourts: boolean;
  /** l'écharpe serrée cache le cou */
  col: boolean;
  coiffe: Coiffe;
  coupe: Coupe;
  /** sans fourreau ni sabre : le mannequin */
  fourreau: PortFourreau | null;
};

const LISERE = 2.2;
const ACIER = "#b9c1cc";
const CONTOUR_ACIER = "#0c0e18";

const ENCRE = {
  corps: "#171c29",
  bras: "#1f2431",
  jambe: "#1b2130",
  jambeArriere: "#121622",
  ceinture: "#666a76",
  lisere: "#8d7256",
} as const;

/** Toi : le combattant à l'écharpe rouge des peintures. Personne d'autre ne porte ce rouge. */
const TOI: Tenue = { ...ENCRE, echarpe: "#d8432a", echarpeOmbre: "#8c2c26", pans: 2, pansCourts: false, col: true, coiffe: "crochet", coupe: "hakama", fourreau: "hanche" };

/** Les autres : une silhouette chacun, puis un accent pris dans les couleurs du site. */
const AUTRES: Tenue[] = [
  { ...ENCRE, echarpe: "#d6a13f", echarpeOmbre: "#94702a", pans: 1, pansCourts: true, col: true, coiffe: "capuche", coupe: "serre", fourreau: "dos" },
  { ...ENCRE, echarpe: "#6fa595", echarpeOmbre: "#4a7468", pans: 2, pansCourts: false, col: true, coiffe: "queue", coupe: "jupe", fourreau: "travers" },
  { ...ENCRE, echarpe: "#efe6d2", echarpeOmbre: "#b5a88d", pans: 1, pansCourts: false, col: false, coiffe: "bouchon", coupe: "serre", fourreau: "travers" },
  { ...ENCRE, echarpe: "#8fa8c4", echarpeOmbre: "#62788f", pans: 2, pansCourts: true, col: true, coiffe: "meche", coupe: "jupe", fourreau: "dos" },
  { ...ENCRE, echarpe: "#000000", echarpeOmbre: "#000000", pans: 0, pansCourts: false, col: false, coiffe: "boule", coupe: "hakama", fourreau: "hanche" },
];

/** La tenue d'un joueur : la sienne pour soi, sinon celle de la place qu'il occupe dans le combat. */
export const tenueDe = (rang: number | null): Tenue => (rang === null ? TOI : AUTRES[rang % AUTRES.length]);

export const TENUE_MANNEQUIN: Tenue = {
  corps: "#bb9c64",
  bras: "#a98a56",
  jambe: "#a4844f",
  jambeArriere: "#8e7246",
  ceinture: "#5d4526",
  lisere: "#2a1c10",
  echarpe: "#000000",
  echarpeOmbre: "#000000",
  pans: 0,
  pansCourts: false,
  col: false,
  coiffe: "sac",
  coupe: "serre",
  fourreau: null,
};

const BLANC = "#fff6e4";
/** La même tenue toute blanche : le flash d'un coup reçu. */
const flashDe = (t: Tenue): Tenue => ({ ...t, corps: BLANC, bras: BLANC, jambe: BLANC, jambeArriere: BLANC, ceinture: BLANC, lisere: BLANC, echarpe: BLANC, echarpeOmbre: BLANC });

type Forme = { chemin: Path2D; couleur: string };

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

/** Ce que la tête porte, dessiné de profil vers la droite, le centre de la tête en (0, 0). */
function coiffure(coiffe: Coiffe): Path2D {
  const p = new Path2D();
  const r = RAYON_TETE;
  switch (coiffe) {
    case "crochet":
      p.addPath(rond({ x: -1.8, y: -r - 1.4 }, 3.3));
      p.addPath(capsule({ x: -3, y: -r - 2.2 }, { x: -9.5, y: -r - 1.6 }, 2, 1.5));
      p.addPath(capsule({ x: -9.5, y: -r - 1.6 }, { x: -12.5, y: -r + 2.2 }, 1.5, 0.7));
      break;
    case "boule":
      p.addPath(capsule({ x: -2.4, y: -r + 1 }, { x: -5.4, y: -r - 2.4 }, 1.3, 1));
      p.addPath(rond({ x: -6.2, y: -r - 4.2 }, 3.3));
      break;
    case "queue":
      p.addPath(capsule({ x: -4, y: -r + 1.6 }, { x: -9.4, y: -r + 0.6 }, 2.2, 1.9));
      p.addPath(capsule({ x: -9.4, y: -r + 0.6 }, { x: -14.2, y: -r + 8.4 }, 1.9, 0.7));
      break;
    case "bouchon":
      p.addPath(capsule({ x: -2, y: -r + 0.8 }, { x: -4.4, y: -r - 4.4 }, 2.3, 2.5));
      break;
    case "capuche":
      p.addPath(rond({ x: -0.8, y: -0.6 }, r + 1.4));
      p.moveTo(-3, r + 0.6);
      p.lineTo(-14.4, 3);
      p.lineTo(-3, -r - 0.6);
      p.closePath();
      break;
    case "meche":
      p.addPath(rond({ x: -2.8, y: -r - 0.6 }, 2.2));
      p.addPath(capsule({ x: -6, y: -2.4 }, { x: -11.6, y: 7.4 }, 2.8, 0.8));
      break;
    case "sac":
      break;
  }
  return p;
}

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

/** Le personnage. `clignote` : il vient de réapparaître et ne craint rien pour l'instant. */
export function peindrePantin(c: Ctx, p: Pantin, tenue: Tenue, clignote: boolean) {
  const t = p.flash > 0 ? flashDe(tenue) : tenue;
  const s = p.squelette;
  const paille = t.coiffe === "sac";
  const formes: Forme[] = [];
  const pose = (chemin: Path2D, couleur: string) => formes.push({ chemin, couleur });

  const pans = p.pans.slice(0, t.pans).map((m, i) => ruban(t.pansCourts ? m.slice(0, Math.ceil(m.length * 0.6)) : m, i === 0 ? 2.8 : 2.3));

  const fourreau = t.fourreau ? capsule(s.fourreau[t.fourreau][0], s.fourreau[t.fourreau][1], 2, 1.6) : null;
  const dansLeDos = t.fourreau === "dos";
  if (fourreau && !dansLeDos) pose(fourreau, t.jambe);

  pose(capsule(s.epauleArriere, s.coudeArriere, 4.6, 3.8), t.jambeArriere);
  pose(capsule(s.coudeArriere, s.mainArriere, 3.8, 2.6), t.jambeArriere);
  pose(rond(s.mainArriere, 3), t.jambeArriere);

  // le bas du corps : ample, serré ou en jupe, mais toujours une masse pleine depuis la taille
  const cuisse = t.coupe === "serre" ? [6.2, 4.6] : t.coupe === "jupe" ? [6.6, 6.2] : [7.4, 6];
  const tibia = t.coupe === "serre" ? [4.4, 2.6] : t.coupe === "jupe" ? [5.8, 4.4] : [6.2, 3.6];
  pose(capsule(s.hanche, s.genouArriere, cuisse[0], cuisse[1]), t.jambeArriere);
  pose(capsule(s.genouArriere, s.piedArriere, tibia[0], tibia[1]), t.jambeArriere);
  pose(pied(s.genouArriere, s.piedArriere, s.face), t.jambeArriere);
  pose(capsule(s.hanche, s.genouAvant, cuisse[0], cuisse[1]), t.jambe);
  pose(capsule(s.genouAvant, s.piedAvant, tibia[0], tibia[1]), t.jambe);
  pose(pied(s.genouAvant, s.piedAvant, s.face), t.jambe);
  if (t.coupe !== "serre") {
    const jupe = t.coupe === "jupe";
    const a = entre(s.genouAvant, s.piedAvant, jupe ? 0.6 : 0.25);
    const b = entre(s.genouArriere, s.piedArriere, jupe ? 0.6 : 0.25);
    const creux = entre(entre(a, b, 0.5), s.hanche, jupe ? 0.08 : 0.16);
    const sens = a.x >= b.x ? 1 : -1;
    const masse = new Path2D();
    masse.moveTo(s.hanche.x - 6 * sens, s.hanche.y - 2);
    masse.lineTo(s.hanche.x + 6 * sens, s.hanche.y - 2);
    masse.lineTo(a.x, a.y);
    masse.quadraticCurveTo(creux.x, creux.y, b.x, b.y);
    masse.closePath();
    pose(masse, t.jambe);
  }

  const poitrine = entre(s.cou, s.hanche, 0.35);
  pose(capsule(s.hanche, poitrine, 6.2, 9.4), t.corps);
  pose(capsule(poitrine, s.cou, 9.4, 6.4), t.corps);

  // le cou : caché par l'écharpe, ou nu
  const dx = s.tete.x - s.cou.x;
  const dy = s.tete.y - s.cou.y;
  const l = Math.hypot(dx, dy) || 1;
  const ax = -dy / l;
  const ay = dx / l;
  if (!t.col) pose(capsule(s.cou, s.tete, 3, 3), t.corps);

  // la tête et ce qu'elle porte
  const repere = new DOMMatrix().translate(s.tete.x, s.tete.y).rotate((s.angleTete * 180) / Math.PI).scale(s.face, 1);
  const tete = new Path2D();
  tete.addPath(coiffure(t.coiffe), repere);
  pose(tete, t.corps);
  pose(rond(s.tete, RAYON_TETE), t.corps);

  if (t.col) {
    // le col s'amincit vers l'avant, comme un tissu noué derrière la nuque
    const sens = s.face >= 0 ? 1 : -1;
    const bas = { x: s.cou.x - (dx / l) * 1.6, y: s.cou.y - (dy / l) * 1.6 };
    pose(capsule({ x: bas.x - ax * sens * 6.6, y: bas.y - ay * sens * 6.6 }, { x: bas.x + ax * sens * 5.2, y: bas.y + ay * sens * 5.2 }, 3.4, 1.8), t.echarpe);
  }

  const brasAvant = [capsule(s.epauleAvant, s.coudeAvant, 5, 4), capsule(s.coudeAvant, s.mainAvant, 4, 2.8), rond(s.mainAvant, 3.1)];

  // le liseré d'abord, sous toutes les formes : il ne reste visible que sur le bord du corps
  c.lineJoin = "round";
  c.lineCap = "round";
  c.strokeStyle = clignote ? BLANC : t.lisere;
  c.lineWidth = clignote ? LISERE + 2.4 : LISERE;
  if (fourreau && dansLeDos) c.stroke(fourreau);
  for (const pan of pans) c.stroke(pan);
  for (const f of formes) c.stroke(f.chemin);
  for (const f of brasAvant) c.stroke(f);

  // les pans passent derrière le corps, avec leur pli, et devant le fourreau du dos
  if (fourreau && dansLeDos) {
    c.fillStyle = t.jambe;
    c.fill(fourreau);
  }
  c.fillStyle = t.echarpe;
  for (const pan of pans) c.fill(pan);
  c.strokeStyle = t.echarpeOmbre;
  c.lineWidth = 1.1;
  if (t.pans > 0) {
    c.beginPath();
    const m = p.pans[0];
    const fin = t.pansCourts ? Math.ceil(m.length * 0.6) : m.length;
    c.moveTo(m[1].x, m[1].y);
    for (let i = 2; i < fin; i++) c.lineTo(m[i].x, m[i].y);
    c.stroke();
  }

  for (const f of formes) {
    c.fillStyle = f.couleur;
    c.fill(f.chemin);
  }

  // la ceinture : une bande grise en travers de la taille
  const hx = s.cou.x - s.hanche.x;
  const hy = s.cou.y - s.hanche.y;
  const hl = Math.hypot(hx, hy) || 1;
  const ux = hx / hl;
  const uy = hy / hl;
  const bx = s.hanche.x + ux * 3;
  const by = s.hanche.y + uy * 3;
  c.fillStyle = t.ceinture;
  c.fill(capsule({ x: bx - uy * 6, y: by + ux * 6 }, { x: bx + uy * 6, y: by - ux * 6 }, 1.4, 1.4));

  if (paille) {
    // le mannequin : un sac de toile, deux coutures, une croix pour l'œil
    c.save();
    c.translate(s.tete.x, s.tete.y);
    c.rotate(s.angleTete);
    c.scale(s.face, 1);
    c.strokeStyle = t.lisere;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(1.6, -3.4);
    c.lineTo(5.4, 0.4);
    c.moveTo(5.4, -3.4);
    c.lineTo(1.6, 0.4);
    c.stroke();
    c.restore();
  }

  if (t.coiffe === "capuche" && p.flash === 0) {
    // la fente de la capuche, le seul regard de la bande
    c.save();
    c.translate(s.tete.x, s.tete.y);
    c.rotate(s.angleTete);
    c.scale(s.face, 1);
    c.fillStyle = t.echarpe;
    c.fill(capsule({ x: 1.4, y: -1.8 }, { x: 5.4, y: -1.8 }, 1, 1));
    c.restore();
  }

  if (t.fourreau) {
    const signe = s.face >= 0 ? 1 : -1;
    const l2 = Math.hypot(s.bout.x - s.mainAvant.x, s.bout.y - s.mainAvant.y) || 1;
    const lx = (s.bout.x - s.mainAvant.x) / l2;
    const ly = (s.bout.y - s.mainAvant.y) / l2;
    const pommeau = { x: s.mainAvant.x - lx * 7, y: s.mainAvant.y - ly * 7 };
    const fer = lame(s.garde, s.bout, signe);
    c.strokeStyle = CONTOUR_ACIER;
    c.lineWidth = 2;
    c.stroke(fer);
    c.fillStyle = p.flash > 0 ? BLANC : ACIER;
    c.fill(fer);
    c.fillStyle = p.flash > 0 ? BLANC : CONTOUR_ACIER;
    c.fill(capsule(pommeau, s.garde, 2, 2));
    c.fillStyle = t.ceinture;
    c.fill(rond(s.garde, 2.6));
  }

  for (const f of brasAvant) {
    c.fillStyle = t.bras;
    c.fill(f);
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
