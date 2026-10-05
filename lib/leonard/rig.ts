/* leonard-rig.ts — Léonard, mascotte animée par déformation de maillage (PixiJS v8). Portage de rig-b/leonard-rig.js.
   - Rien ne s'exécute au chargement du module (compatible rendu serveur) : pixi.js n'est importé qu'à l'appel, en mode animé.
   - Mode fixe (anime: false ou prefers-reduced-motion) : simple canevas 2D, sans WebGL ni boucle ; seules les poses changent.
   - Mode animé : respiration, clignements, regard, bouches selon les voyelles, geste du pinceau, ressorts (barbe, mèches),
     poses en fondu croisé de 150 ms, réactions ; 60 i/s, en pause si l'onglet est caché ou le canevas retiré / hors écran.
   - Ne touche qu'à `conteneur` (y ajoute son canevas, transparent, sans clic). Aucun son.
   Coordonnées internes : px de l'image source 1024×1024 (leonard.json). */
import type { Buffer as PBuffer, Container, Graphics, Mesh, MeshGeometry, Renderer, Texture } from "pixi.js";

export type Pose = "base" | "fier" | "moqueur" | "decu" | "etonne";
export type LeonardRig = {
  /** taille utile (px CSS) une fois chargé, marges des poses comprises */
  encombrement(): { largeur: number; hauteur: number };
  /** parle pendant `dureeMs` en suivant les voyelles de `texte` */
  parler(texte: string, dureeMs: number): void;
  /** change de pose (fondu 150 ms) ; null = base */
  pose(p: Pose | null): void;
  /** petit geste de célébration (touche de pinceau) ou de surprise */
  reagir(type: "bravo" | "surprise" | "rire"): void;
  pause(): void; reprendre(): void;
  detruire(): void; // libère le contexte WebGL et les textures
};

// ---------- données (leonard.json) ----------
type V2 = [number, number];
type B4 = [number, number, number, number];
type Reperes = {
  taille: V2; pivots: Record<string, V2>; coupe_bas: number; couleurs?: Record<string, string>;
  yeux: { gauche: { centre: V2; rx: number; ry: number }; droite: { centre: V2; rx: number; ry: number } };
  sourcils?: { gauche?: V2[]; droite?: V2[] }; bouche: { centre: V2; largeur?: number };
  boites: Record<string, B4>; cadres: Record<string, B4>;
};
type Doc = {
  reperes: Reperes;
  calque: { pivot: V2; pinceau: { a: V2; b: V2; prise: V2 } };
  couches: { boite: B4; taille: V2; fichiers: Record<string, string> };
  etats: Record<string, { fichier: string; boite: B4 }>;
  masques: { fichier: string; taille: number; ordre: string[] };
  silhouettes: { base: B4; bras: B4; poses: B4[] };
};


// ---------- outils ----------
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const eOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const eIn = (t: number) => Math.pow(clamp(t, 0, 1), 3);
const eIO = (t: number) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const env = (t: number, a: number, d: number, r: number) => (t < 0 || t > d ? 0 : t < a ? eIO(t / a) : t > d - r ? eIO((d - t) / r) : 1);
function rng(seed: number): () => number {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
class Ressort { // a = -k(x-cible) - c v ; k=(2πf)², c=2ζ(2πf)
  k = 0; c = 0; v = 0; x: number;
  constructor(f: number, z: number, x = 0) { const w = TAU * f; this.k = w * w; this.c = 2 * z * w; this.x = x; }
  pas(c: number, dt: number) { this.v += (-this.k * (this.x - c) - this.c * this.v) * dt; this.x += this.v * dt; return this.x; }
}
const hex = (h: string) => parseInt(h.replace("#", ""), 16);
const mixHex = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); let o = 0; for (let s = 16; s >= 0; s -= 8) o |= Math.round(lerp((A >> s) & 255, (B >> s) & 255, t)) << s; return o; };

// caches partagés (créés vides : aucun effet au chargement)
const CACHE = new Map<string, Promise<unknown>>();
function memo<T>(cle: string, f: () => Promise<T>): Promise<T> {
  let p = CACHE.get(cle) as Promise<T> | undefined;
  if (!p) { p = f(); CACHE.set(cle, p); p.catch(() => CACHE.delete(cle)); }
  return p;
}
const chargerImage = (src: string) => memo(src, () => new Promise<HTMLImageElement>((ok, ko) => {
  const im = new Image(); im.decoding = "async"; im.onload = () => ok(im); im.onerror = () => ko(new Error("Léonard : image introuvable " + src)); im.src = src;
}));
const chargerDoc = (url: string) => memo(url, async () => { const r = await fetch(url); if (!r.ok) throw new Error("Léonard : " + url + " " + r.status); return (await r.json()) as Doc; });

type Echant = (u: number, v: number) => number;
async function chargerMasques(src: string, ordre: string[], S: number): Promise<Record<string, Echant>> {
  const im = await chargerImage(src), h = im.naturalHeight;
  const c = document.createElement("canvas"); c.width = S; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true }); if (!x) return {};
  x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, S, h).data; const out: Record<string, Echant> = {};
  ordre.forEach((nom, i) => {
    const v = new Float32Array(S * S), oy = Math.floor(i / 3) * S, ch = i % 3;
    for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) v[j * S + k] = d[((oy + j) * S + k) * 4 + ch] / 255;
    out[nom] = (u, w) => {
      const fx = clamp(u * S - 0.5, 0, S - 1.001), fy = clamp(w * S - 0.5, 0, S - 1.001), ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy, q = iy * S + ix;
      return (v[q] * (1 - ax) + v[q + 1] * ax) * (1 - ay) + (v[q + S] * (1 - ax) + v[q + S + 1] * ax) * ay;
    };
  });
  return out;
}

// ---------- géométrie du personnage (d'après les repères) ----------
type Pt = { x: number; y: number };
type Zone = { cx: number; cy: number; rx: number; ry: number; x0: number; y0: number; x1: number; y1: number; y1m?: number };
type Oeil = { c: Pt; rx: number; ry: number };
type Geo = {
  W: number; H: number; E: number; M: Pt; eg: Oeil; ed: Oeil; sg: Pt; sd: Pt; Mo: Pt; mw: number; haut: Pt; pieds: Pt; coupe: number;
  cou: Pt; es: Pt; ec: Pt; beret: Zone | null; barbe: Zone; chG: Zone; chD: Zone; codex: Zone; Hb: number; menton: Pt; ceinture: number;
  couleurs: Record<string, string>; mq: Record<string, Echant>; pivBras: Pt; pin: { a: Pt; b: Pt; prise: Pt }; cadre: B4;
};
function moyenne(p: V2 | V2[] | undefined): Pt | null {
  if (!p) return null;
  if (Array.isArray(p[0])) { const q = p as V2[]; let x = 0, y = 0; for (const a of q) { x += a[0]; y += a[1]; } return { x: x / q.length, y: y / q.length }; }
  const a = p as V2; return { x: a[0], y: a[1] };
}
function lireGeo(doc: Doc): Geo {
  const r = doc.reperes, W = r.taille[0], H = r.taille[1];
  const oeil = (o: { centre: V2; rx: number; ry: number }): Oeil => ({ c: { x: o.centre[0], y: o.centre[1] }, rx: o.rx, ry: o.ry });
  const eg = oeil(r.yeux.gauche), ed = oeil(r.yeux.droite);
  const E = Math.hypot(ed.c.x - eg.c.x, ed.c.y - eg.c.y), M = { x: (eg.c.x + ed.c.x) / 2, y: (eg.c.y + ed.c.y) / 2 };
  const sg = moyenne(r.sourcils?.gauche) ?? { x: eg.c.x, y: eg.c.y - 0.35 * E }, sd = moyenne(r.sourcils?.droite) ?? { x: ed.c.x, y: ed.c.y - 0.35 * E };
  const Mo = moyenne(r.bouche.centre) ?? { x: M.x, y: M.y + 1.3 * E }, mw = r.bouche.largeur ?? 0.9 * E;
  const boite = (n: string): Zone | null => { const b = r.boites[n]; return b ? { cx: b[0] + b[2] / 2, cy: b[1] + b[3] / 2, rx: b[2] / 2, ry: b[3] / 2, x0: b[0], y0: b[1], x1: b[0] + b[2], y1: b[1] + b[3] } : null; };
  const piv = (n: string, d: Pt): Pt => { const p = r.pivots[n]; return p ? { x: p[0], y: p[1] } : d; };
  const zone = (cx: number, cy: number, rx: number, ry: number): Zone => ({ cx, cy, rx, ry, x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry });
  const beret = boite("beret"), coupe = r.coupe_bas;
  const haut = beret ? { x: beret.cx, y: beret.y0 } : { x: M.x + 0.5 * E, y: M.y - 3.0 * E };
  let cou = piv("cou", { x: M.x + 0.3 * E, y: Mo.y + 1.0 * E }); if (cou.y < Mo.y + 0.6 * E) cou = { x: cou.x, y: Mo.y + 0.9 * E };
  const buste = piv("buste", { x: M.x + 0.5 * E, y: M.y + 5.6 * E }), hanches = piv("hanches", { x: M.x + 0.5 * E, y: M.y + 9 * E });
  const ec = piv("epaule_codex", { x: M.x + 5 * E, y: M.y + 3.6 * E }), bc = boite("bras_codex");
  const Hb = coupe - haut.y;
  let ceinture = buste.y + 0.55 * (hanches.y - buste.y); ceinture = Math.min(ceinture, coupe - 0.1 * (coupe - haut.y));
  const c = doc.calque, P2 = (v: V2): Pt => ({ x: v[0], y: v[1] });
  const cd = r.cadres.buste ?? [0, 0, W, H];
  return {
    W, H, E, M, eg, ed, sg, sd, Mo, mw, haut, pieds: { x: M.x, y: coupe }, coupe, cou,
    es: piv("epaule_pinceau", { x: M.x - 2.9 * E, y: M.y + 3.5 * E }), ec, beret,
    barbe: boite("barbe") ?? zone(Mo.x + 0.13 * E, Mo.y + 1.3 * E, 1.6 * E, 2.0 * E),
    chG: boite("cheveux_g") ?? zone(M.x - 1.24 * E, M.y + 1.7 * E, 0.85 * E, 1.75 * E),
    chD: boite("cheveux_d") ?? zone(M.x + 2.37 * E, M.y + 1.45 * E, 1.2 * E, 1.8 * E),
    codex: bc ? zone(bc.cx + 0.1 * bc.rx, bc.cy + 0.15 * bc.ry, bc.rx * 0.85, bc.ry * 0.75) : zone(ec.x - 1.9 * E, ec.y + 5.3 * E, 2.9 * E, 2.9 * E),
    Hb, menton: { x: Mo.x, y: Mo.y + 0.45 * E }, ceinture,
    couleurs: Object.assign({ peau: "#f2b99b", peau_ombre: "#c28a70", trait: "#231515" }, r.couleurs ?? {}), mq: {},
    pivBras: P2(c.pivot), pin: { a: P2(c.pinceau.a), b: P2(c.pinceau.b), prise: P2(c.pinceau.prise) },
    cadre: [cd[0], cd[1], cd[0] + cd[2], coupe],
  };
}
/** boîte (px source) de tout ce qui peut être dessiné : silhouettes, poses, bras à ±13°, éclat, saut */
function boiteTotale(P: Geo, s: Doc["silhouettes"]): B4 {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const U = (a: number, b: number, c: number, d: number) => { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); };
  for (const b of [s.base, ...s.poses]) U(b[0], b[1], b[2], b[3]);
  const b = s.bras, pv = P.pivBras;
  for (const ang of [-13 * DEG, 13 * DEG]) for (const [px, py] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) {
    const c = Math.cos(ang), sn = Math.sin(ang), dx = px - pv.x, dy = py - pv.y, X = pv.x + c * dx - sn * dy, Y = pv.y + sn * dx + c * dy; U(X, Y, X, Y);
  }
  const E = P.E, R0 = Math.max(3.0 * E, (P.M.y - P.haut.y) * 1.25), hc = { x: P.M.x + 0.4 * E, y: P.M.y - 0.6 * E };
  U(hc.x - 1.15 * 1.95 * R0, hc.y - 1.95 * R0, hc.x + 1.15 * 1.95 * R0, hc.y + 0.4 * 1.95 * R0);
  y0 -= 0.085 * P.Hb * 0.32; y1 = Math.min(y1, P.coupe);
  return [x0, y0, x1, y1];
}

// ---------- poids d'un point (au repos) ----------
const NW = 19;
function ell(x: number, y: number, z: Zone, a = 0.82, b = 1.08) { const dx = (x - z.cx) / z.rx, dy = (y - z.cy) / z.ry; return 1 - sstep(a, b, Math.sqrt(dx * dx + dy * dy)); }
function gauss(x: number, y: number, cx: number, cy: number, sx: number, sy: number) { const dx = (x - cx) / sx, dy = (y - cy) / sy, d = dx * dx + dy * dy; return d > 9 ? 0 : Math.exp(-d); }
function poids(P: Geo, x: number, y: number, w: Float32Array) {
  const E = P.E, M = P.M, Mo = P.Mo, mq = P.mq, u = x / P.W, v = y / P.H;
  const xl = P.beret ? P.beret.x0 - 0.15 * E : M.x - 3.0 * E, xr = P.beret ? P.beret.x1 + 0.15 * E : M.x + 3.6 * E;
  const wT = (1 - sstep(P.menton.y - 0.15 * E, P.menton.y + 0.75 * E, y)) * sstep(xl - 0.6 * E, xl + 0.2 * E, x) * (1 - sstep(xr - 0.2 * E, xr + 0.6 * E, x));
  const eB = mq.barbe ? mq.barbe(u, v) : ell(x, y, P.barbe);
  const eG = mq.cheveux_g ? mq.cheveux_g(u, v) : ell(x, y, P.chG);
  const eD = mq.cheveux_d ? mq.cheveux_d(u, v) : ell(x, y, P.chD);
  const suit = Math.max(eB, eG, eD) * (1 - wT);
  const yTip = P.barbe.y1m || P.barbe.cy + P.barbe.ry, yMid = lerp(P.menton.y, yTip, 0.45);
  const wB1 = eB * sstep(P.menton.y - 0.1 * E, yMid, y), wB2 = eB * sstep(yMid, yTip, y);
  const wHG = eG * sstep(M.y + 0.2 * E, P.chG.cy + P.chG.ry, y), wHD = eD * sstep(M.y + 0.2 * E, P.chD.cy + P.chD.ry, y);
  const wJaw = sstep(Mo.y - 0.03 * E, Mo.y + 0.11 * E, y) * gauss(x, 0, Mo.x, 0, 0.42 * P.mw, 1) * (1 - sstep(Mo.y + 0.5 * E, Mo.y + 2.6 * E, y));
  const wBrG = gauss(x, y, P.sg.x, P.sg.y, 0.42 * E, 0.24 * E), wBrD = gauss(x, y, P.sd.x, P.sd.y, 0.42 * E, 0.24 * E);
  const wEyG = gauss(x, y, P.eg.c.x, P.eg.c.y, 0.55 * P.eg.rx, 0.8 * P.eg.ry), wEyD = gauss(x, y, P.ed.c.x, P.ed.c.y, 0.55 * P.ed.rx, 0.8 * P.ed.ry);
  const fc = { x: M.x, y: M.y + 0.75 * E };
  const bu = Math.max(0, 1 - Math.pow((x - fc.x) / (2.0 * E), 2) - Math.pow((y - fc.y) / (2.3 * E), 2));
  const wF3 = wT * bu * bu * (3 - 2 * bu);
  const wS = mq.bras_pinceau ? mq.bras_pinceau(u, v) * (1 - wT) * (1 - Math.max(eB, eG, eD)) : 0;
  const wC = (mq.bras_codex ? mq.bras_codex(u, v) : ell(x, y, P.codex, 0.75, 1.1)) * (1 - wT) * (1 - suit) * (1 - wS);
  const wTo = 1 - sstep(P.ceinture, P.ceinture + 0.16 * P.Hb, y);
  const fBr = wTo * clamp((P.ceinture - y) / (P.ceinture - P.haut.y), 0, 1);
  const wEp = gauss(x, y, (P.es.x + P.ec.x) / 2, (P.es.y + P.ec.y) / 2, 3.6 * E, 1.5 * E) * (1 - wT);
  const wJo = gauss(x, y, P.eg.c.x, P.eg.c.y + 2.2 * P.eg.ry, 0.4 * E, 0.25 * E) + gauss(x, y, P.ed.c.x, P.ed.c.y + 2.2 * P.ed.ry, 0.4 * E, 0.25 * E);
  w[0] = wT; w[1] = suit; w[2] = wB1; w[3] = wB2; w[4] = wHG; w[5] = wHD; w[6] = wJaw; w[7] = wBrG; w[8] = wBrD;
  w[9] = wEyG; w[10] = wEyD; w[11] = wF3; w[12] = wS; w[13] = 0; w[14] = wC; w[15] = wTo; w[16] = fBr; w[17] = wEp; w[18] = wJo;
}
function axe(len: number, f0: number, f1: number, cs: number, fs: number) { const a = [0]; let x = 0; while (x < len) { x = Math.min(len, x + (x >= f0 && x < f1 ? fs : cs)); a.push(x); } return a; }

// ---------- parole : voyelles du texte → formes de bouche ----------
type Vis = "a" | "o" | "e" | "fermee" | "pause" | "pause2";
function visemes(txt: string): Vis[] | null {
  const s = String(txt || "").toLowerCase(), out: Vis[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1]; let v: Vis | null = null;
    if ("aàâä".includes(c)) v = "a";
    else if (c === "o" && n === "u") { v = "o"; i++; }
    else if ("oôöuùûü".includes(c)) v = "o";
    else if ("eéèêëiîïy".includes(c)) v = c === "e" && (n === undefined || /[\s.,!?;:…'’]/.test(n)) ? null : "e";
    else if ("mbp".includes(c)) v = "fermee";
    else if (/\s/.test(c)) v = "pause";
    else if (/[.,!?;:…]/.test(c)) v = "pause2";
    if (v && out[out.length - 1] !== v) out.push(v);
  }
  return out.some((v) => v === "a" || v === "o" || v === "e") ? out : null;
}
const OUVERTURE: Record<Vis, number> = { a: 1, o: 0.72, e: 0.5, fermee: 0.02, pause: 0, pause2: 0 };
const LARGEUR: Record<Vis, number> = { a: 1, o: 0.72, e: 1.15, fermee: 1, pause: 1, pause2: 1 };

// ---------- humeurs (portées par les poses) et réactions ----------
const CLES = ["tilt", "bG", "bD", "cG", "cD", "joue", "rieur", "tx", "ty", "gx", "gy", "lean", "jaw"] as const;
type Cle = (typeof CLES)[number];
const SOUS_POSE = new Set<Cle>(["cG", "cD", "joue", "rieur", "bG", "bD", "jaw"]); // atténués ×0,1 quand une pose entière est affichée
const HUMEURS: Record<string, Partial<Record<Cle, number>>> = {
  neutre: {},
  bravo: { tilt: 3 * DEG, bG: 0.55, bD: 0.55, cG: 0.22, cD: 0.22, joue: 1, rieur: 0.7, ty: -0.25, lean: -0.8 * DEG },
  taquin: { tilt: -3.5 * DEG, bG: -0.3, bD: 0.85, cG: 0.33, cD: 0.1, joue: 0.5, rieur: 0.3, tx: 0.3, ty: 0.05, lean: 0.6 * DEG },
  surpris: { tilt: -1.5 * DEG, bG: 1, bD: 1, jaw: 0.3, ty: -0.3, lean: -1.2 * DEG },
  decu: { tilt: -2 * DEG, bG: -0.35, bD: -0.35, cG: 0.45, cD: 0.45, ty: 0.35, lean: 0.9 * DEG },
};
const POSE_HUMEUR: Record<Pose, string> = { base: "neutre", fier: "bravo", moqueur: "taquin", decu: "decu", etonne: "surpris" };
const POSES = ["decu", "etonne", "fier", "moqueur"] as const; // ordre d'empilement de la démo

type Accu = { tilt: number; hy: number; jaw: number; rieur: number; cG: number; cD: number; bG: number; bD: number; tx: number; ty: number; lean: number; sh: number; aS: number; aDir: number; joue: number; jumpY: number; sqx: number; sqy: number; rireOuvert: number };
type Reac = { nom: string; t0: number; dur: number; eclat: boolean; f: (x: Reac, t: number, o: Accu, R: RigAnime) => void };
const REACTIONS: Record<string, { dur: number; f: Reac["f"] }> = {
  saut: { dur: 1.05, f(x, t, o, R) { // bord bas collé : le saut devient un étirement depuis la coupe
    const H = R.P.Hb * 0.32, q = 0.5; let y = 0, sx = 1, sy = 1;
    if (t < 0.13) { const u = eIO(t / 0.13); sy = 1 - 0.06 * u; sx = 1 + 0.035 * u; }
    else if (t < 0.38) { const u = (t - 0.13) / 0.25; y = -0.085 * H * eOut(u); sy = lerp(1.05, 1.0, eIO(u)); sx = lerp(0.975, 1, eIO(u)); }
    else if (t < 0.6) { const u = (t - 0.38) / 0.22; y = -0.085 * H * (1 - eIn(u)); sy = lerp(1.0, 1.035, u); sx = lerp(1, 0.985, u); }
    else if (t < 0.7) { const u = (t - 0.6) / 0.1; sy = lerp(1.035, 0.95, eOut(u)); sx = lerp(0.985, 1.035, eOut(u)); }
    else { const u = (t - 0.7) / 0.35, s = Math.sin(u * Math.PI * 1.5) * (1 - u); sy = 1 - 0.05 * (1 - eOut(u)) + 0.012 * s; sx = 1 + 0.035 * (1 - eOut(u)) - 0.008 * s; }
    o.jumpY += y; o.sqx *= 1 + (sx - 1) * q; o.sqy *= 1 + (sy - 1) * q;
    const e = env(t, 0.15, 1.05, 0.3); o.bG += 0.5 * e; o.bD += 0.5 * e; o.jaw += 0.35 * env(t, 0.12, 0.8, 0.25); o.tilt -= 2 * DEG * e;
    if (t >= 0.3 && !x.eclat) { x.eclat = true; R.fx.push({ t0: R.t, n: 9, rot: R.alea() * TAU, pointe: false }); }
  } },
  rire: { dur: 1.5, f(_x, t, o, R) {
    const e = env(t, 0.12, 1.5, 0.4), s = Math.abs(Math.sin(TAU * 4.0 * t));
    o.hy -= e * s * 0.07 * R.P.E; o.jaw += e * (0.3 + 0.55 * s); o.rieur += e * 0.9; o.cG += e * 0.5; o.cD += e * 0.5;
    o.tilt += e * (2.5 * DEG + 1.2 * DEG * Math.sin(TAU * 1.8 * t)); o.lean -= e * 1.2 * DEG; o.sh += e * s * 0.6; o.ty -= e * 0.15;
    o.aS += e * 2 * DEG * s; o.rireOuvert = Math.max(o.rireOuvert, e * s);
  } },
  sourcil: { dur: 1.9, f(_x, t, o) { const e = env(t, 0.16, 1.9, 0.5); o.bD += e * 1.0; o.bG -= e * 0.35; o.cG += e * 0.3; o.tilt -= e * 3 * DEG; o.tx += e * 0.25; } },
  touche: { dur: 1.5, f(x, t, o, R) { // touche dans l'air : anticipation, coup rapide, retour amorti
    let v: number;
    if (t < 0.2) v = 3.5 * eIO(t / 0.2);
    else if (t < 0.32) v = lerp(3.5, -11, eOut((t - 0.2) / 0.12));
    else v = -11 * Math.exp(-(t - 0.32) * 4.2) * Math.cos(TAU * 1.3 * (t - 0.32));
    o.aDir += v * DEG; o.bG += 0.3 * env(t, 0.15, 1.5, 0.5); o.bD += 0.3 * env(t, 0.15, 1.5, 0.5); o.tilt += 1.5 * DEG * env(t, 0.2, 1.4, 0.5);
    if (t >= 0.3 && !x.eclat) { x.eclat = true; R.fx.push({ t0: R.t, n: 0, rot: 0, pointe: true }); }
  } },
  sursaut: { dur: 1.0, f(_x, t, o, R) { // surprise sans pose : mouvement de recul bref (mêmes réglages que l'humeur « surpris »)
    const e = env(t, 0.08, 1.0, 0.45), k = R.poseNom ? 0.1 : 1;
    o.bG += e * k; o.bD += e * k; o.jaw += 0.3 * e * k; o.ty -= 0.3 * e; o.lean -= 1.2 * DEG * e; o.tilt -= 1.5 * DEG * e;
  } },
};

// ---------- point d'entrée ----------
export async function creerLeonard(conteneur: HTMLElement, opts: { base: string; hauteur: number; anime: boolean }): Promise<LeonardRig> {
  const base = opts.base.replace(/\/?$/, "/");
  const doc = await chargerDoc(base + "leonard.json");
  const calme = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!opts.anime || calme) return RigFixe.creer(conteneur, doc, base, opts.hauteur);
  return RigAnime.creer(conteneur, doc, base, opts.hauteur);
}

/** Prépare une apparition à venir (fichiers, et PixiJS s'il est animé) : il entrera aussitôt. */
export function prechauffer(base: string, anime: boolean): Promise<unknown> {
  const b = base.replace(/\/?$/, "/");
  return chargerDoc(b + "leonard.json")
    .then((doc) => {
      const f = doc.couches.fichiers;
      const fichiers = anime
        ? [...["corps", "bras", "manchette", ...POSES.map((p) => "pose-" + p)].map((n) => f[n]), ...Object.values(doc.etats).map((e) => e.fichier), doc.masques.fichier]
        : [f.corps, f.bras, f.manchette];
      return Promise.all([...fichiers.map((n) => chargerImage(b + n)), anime ? import("pixi.js") : null]);
    })
    .catch(() => {});
}

/** mise en page commune : échelle, taille du canevas, origine (le bord coupé colle au bas du canevas) */
function cadrage(P: Geo, doc: Doc, hauteur: number) {
  const bb = boiteTotale(P, doc.silhouettes), s = Math.max(1, hauteur) / (P.cadre[3] - P.cadre[1]);
  const largeur = Math.ceil((bb[2] - bb[0]) * s), haut = Math.ceil((bb[3] - bb[1]) * s);
  return { s, largeur, hauteur: haut, ox: (largeur - (bb[2] - bb[0]) * s) / 2 - bb[0] * s, oy: haut - bb[3] * s };
}
function styleCanevas(c: HTMLCanvasElement, l: number, h: number) {
  Object.assign(c.style, { display: "block", width: l + "px", height: h + "px", pointerEvents: "none", userSelect: "none" });
  c.setAttribute("aria-hidden", "true");
}
const dprMax = () => Math.min((typeof devicePixelRatio === "number" && devicePixelRatio) || 1, 3);

// ---------- mode fixe : canevas 2D, aucune boucle ----------
class RigFixe implements LeonardRig {
  private canvas!: HTMLCanvasElement; private ctx!: CanvasRenderingContext2D; private cad!: ReturnType<typeof cadrage>;
  private imgs: Record<string, HTMLImageElement> = {}; private courante: Pose | null = null; private detruit = false;
  private constructor(private doc: Doc, private base: string) {}
  static async creer(el: HTMLElement, doc: Doc, base: string, hauteur: number) {
    const r = new RigFixe(doc, base), f = doc.couches.fichiers;
    const [c, b, m] = await Promise.all([f.corps, f.bras, f.manchette].map((n) => chargerImage(base + n)));
    r.imgs = { corps: c, bras: b, manchette: m };
    r.cad = cadrage(lireGeo(doc), doc, hauteur);
    const cv = (r.canvas = document.createElement("canvas")), k = dprMax();
    cv.width = Math.round(r.cad.largeur * k); cv.height = Math.round(r.cad.hauteur * k);
    styleCanevas(cv, r.cad.largeur, r.cad.hauteur);
    const ctx = cv.getContext("2d"); if (!ctx) throw new Error("Léonard : canevas 2D indisponible");
    r.ctx = ctx; el.appendChild(cv); r.dessiner();
    for (const p of POSES) chargerImage(base + f["pose-" + p]).then((im) => { r.imgs["pose-" + p] = im; }, () => {}); // préchargement
    return r;
  }
  private dessiner() {
    if (this.detruit) return;
    const c = this.ctx, k = dprMax(), { s, ox, oy } = this.cad, R = this.doc.couches.boite;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(k * s, 0, 0, k * s, k * ox, k * oy); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    const tracer = (im: HTMLImageElement) => c.drawImage(im, R[0], R[1], R[2] - R[0], R[3] - R[1]);
    const ip = this.courante ? this.imgs["pose-" + this.courante] : null;
    if (ip) tracer(ip); else { tracer(this.imgs.corps); tracer(this.imgs.bras); tracer(this.imgs.manchette); }
  }
  encombrement() { return { largeur: this.cad.largeur, hauteur: this.cad.hauteur }; }
  parler() {} reagir() {} pause() {} reprendre() {}
  pose(p: Pose | null) {
    const q = p && p !== "base" ? p : null; this.courante = q;
    if (!q || this.imgs["pose-" + q]) { this.dessiner(); return; }
    chargerImage(this.base + this.doc.couches.fichiers["pose-" + q]).then((im) => { this.imgs["pose-" + q] = im; if (this.courante === q) this.dessiner(); }, () => {});
  }
  detruire() { if (this.detruit) return; this.detruit = true; this.canvas.width = this.canvas.height = 0; this.canvas.remove(); }
}

// ---------- mode animé : PixiJS ----------
type Sortie = Record<"gx" | "gy" | "jaw" | "larg" | "rireOuvert" | "thH" | "tx" | "ty" | "hx" | "hy" | "bG" | "bD" | "joue" | "rieur" | "blink" | "sqG" | "sqD" | "cG" | "cD" | "breath" | "breathT" | "lean" | "sh" | "aS" | "aB" | "aC" | "aP" | "jumpY" | "sqx" | "sqy" | "b1" | "b2" | "hG" | "hD" | "by" | "hyH", number> & { vis: Vis | null };
type Couche = { mesh: Mesh; a: number };
type SousGrille = { i0: number; j0: number; ni: number; nj: number; pos: Float32Array; buf: PBuffer; geom: MeshGeometry; meshes: Mesh[] };

class RigAnime implements LeonardRig {
  P!: Geo; t = 0; alea = rng(7); poseNom: string | null = null;
  fx: { t0: number; n: number; rot: number; pointe: boolean }[] = [];
  private renderer!: Renderer; private stage!: Container; private root!: Container; private groupe!: Container;
  private canvas!: HTMLCanvasElement; private cad!: ReturnType<typeof cadrage>;
  private gFx!: Graphics; private gFx2!: Graphics; private gPaup!: Graphics;
  private nx = 0; private ny = 0; private rest!: Float32Array; private pos!: Float32Array; private posA!: Float32Array; private Wt!: Float32Array; private wPin!: Float32Array;
  private posBuf!: PBuffer; private posBufA!: PBuffer; private sousGrilles: SousGrille[] = [];
  private etats: Record<string, Couche> = {}; private poses: Record<string, Couche> = {};
  private textures: Texture[] = []; private geometries: MeshGeometry[] = [];
  private humeur = "neutre"; private poseVoulue: Pose | null = null; private poseDes = 0;
  private hs = {} as Record<Cle, Ressort>;
  private rs = {
    tete: new Ressort(2.6, 0.62), tx: new Ressort(2.4, 0.8), ty: new Ressort(2.4, 0.8), gx: new Ressort(9, 1), gy: new Ressort(9, 1),
    b1: new Ressort(1.9, 0.5), b2: new Ressort(2.1, 0.45), by: new Ressort(2.4, 0.45), hG: new Ressort(3.0, 0.42), hD: new Ressort(2.7, 0.4), hy: new Ressort(3.2, 0.45),
    lean: new Ressort(1.6, 0.7), poignet: new Ressort(2.2, 0.35), jaw: new Ressort(11, 0.75), respTete: new Ressort(2.5, 1),
    bras: new Ressort(1.7, 0.5), larg: new Ressort(11, 0.8, 1), pin: new Ressort(3.2, 0.3),
  };
  private reac: Reac[] = []; private timers: { at: number; f: () => void }[] = [];
  private regard = { prochain: 1.5, autoX: 0, autoY: 0 };
  private parle = false; private finParole = 0; private visTxt: Vis[] | null = null;
  private syl = { fin: 0, cible: 0, vis: null as Vis | null, i: 0, n: 0, emph: -9 };
  private prochainGeste = 0; private gesteT: number | null = null; private gesteA = 1; private talkE = 0;
  private cligne = { prochain: 0, debut: -9, double: false };
  private resp = 0; private prevHead = 0; private prevJumpY = 0; private acc = 0;
  private o: Sortie = { gx: 0, gy: 0, jaw: 0, larg: 1, rireOuvert: 0, thH: 0, tx: 0, ty: 0, hx: 0, hy: 0, bG: 0, bD: 0, joue: 0, rieur: 0, blink: 0, sqG: 0, sqD: 0, cG: 0, cD: 0, breath: 0, breathT: 0, lean: 0, sh: 0, aS: 0, aB: 0, aC: 0, aP: 0, jumpY: 0, sqx: 1, sqy: 1, b1: 0, b2: 0, hG: 0, hD: 0, by: 0, hyH: 0, vis: null };
  private K = { jawPx: 0, brG: 0, brD: 0, gx: 0, gy: 0, joue: 0, mbx: 0, mby: 0, tx3: 0, ty3: 0, dcx: 0, dcy: 0, brPx: 0, shPx: 0 };
  private tw = new Float32Array(NW);
  private raf = 0; private last = 0; private dernierRendu = -1e9; private enPause = false; private visible = true; private detruit = false;
  private io: IntersectionObserver | null = null;
  private surVisibilite = () => { if (!document.hidden) this.demarrer(); };

  static async creer(el: HTMLElement, doc: Doc, base: string, hauteur: number) { const r = new RigAnime(); await r.init(el, doc, base, hauteur); return r; }

  private async init(el: HTMLElement, doc: Doc, base: string, hauteur: number) {
    const PIXI = await import("pixi.js");
    const P = (this.P = lireGeo(doc)), f = doc.couches.fichiers, E = P.E;
    const noms = ["corps", "bras", "manchette", ...POSES.map((p) => "pose-" + p)];
    const etatsNoms = ["bouche-a", "bouche-e", "bouche-fermee", "bouche-o", "yeux-fermes"].filter((n) => doc.etats[n]); // ordre d'empilement de la démo
    const [imgs, imgsE, mq] = await Promise.all([
      Promise.all(noms.map((n) => chargerImage(base + f[n]))),
      Promise.all(etatsNoms.map((n) => chargerImage(base + doc.etats[n].fichier))),
      chargerMasques(base + doc.masques.fichier, doc.masques.ordre, doc.masques.taille),
    ]);
    P.mq = mq;
    if (mq.barbe) { // pointe réelle de la barbe d'après le masque
      let y1 = P.barbe.cy;
      for (let yy = P.Mo.y; yy < P.H; yy += P.H / 256) { let m = 0; for (let xx = P.barbe.x0; xx < P.barbe.x1; xx += P.W / 128) m = Math.max(m, mq.barbe(xx / P.W, yy / P.H)); if (m > 0.5) y1 = yy; }
      P.barbe.y1m = y1;
    }
    const cad = (this.cad = cadrage(P, doc, hauteur)), dpr = dprMax();
    // L'horloge globale de Pixi (Ticker.system, qui ne sert qu'à son planificateur de ramasse-miettes) tournerait en rAF
    // permanent, même en pause : on la coupe, notre boucle pilote tout. Ramasse-miettes coupés : textures libérées par detruire().
    PIXI.Ticker.system.autoStart = false; PIXI.Ticker.system.stop();
    this.renderer = await PIXI.autoDetectRenderer({
      preference: "webgl", width: cad.largeur, height: cad.hauteur, backgroundAlpha: 0, antialias: true, resolution: dpr, autoDensity: true,
      manageImports: false, // pas d'extensions « navigateur » (accessibilité, événements) : rien hors du conteneur
      gcActive: false,
    });
    PIXI.Ticker.system.stop();
    this.canvas = this.renderer.canvas as HTMLCanvasElement;
    styleCanevas(this.canvas, cad.largeur, cad.hauteur);

    // textures, réduites à la taille utile comme dans la démo (≥ 512 px pour 1024 px source)
    const p2 = (v: number) => Math.pow(2, Math.ceil(Math.log2(Math.max(1, v))));
    const echelleUtile = Math.max(512, p2(hauteur * dpr * 1.25)) / 1024; // px de texture par px source
    const echelleFichier = doc.couches.taille[1] / (doc.couches.boite[3] - doc.couches.boite[1]);
    const tex = (im: HTMLImageElement): Texture => {
      const k = echelleUtile / echelleFichier; let t: Texture;
      if (k < 0.999) {
        const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        const x = c.getContext("2d"); if (x) { x.imageSmoothingQuality = "high"; x.drawImage(im, 0, 0, c.width, c.height); }
        t = new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: c, autoGenerateMipmaps: true, scaleMode: "linear" }) });
      } else t = new PIXI.Texture({ source: new PIXI.ImageSource({ resource: im, autoGenerateMipmaps: true, scaleMode: "linear" }) });
      this.textures.push(t); return t;
    };

    // maillage : grille tensorielle, fine (≈0,09 E) sur le visage, ≈0,28 E ailleurs
    const xs = axe(P.W, P.M.x - 1.9 * E, P.M.x + 2.0 * E, 0.28 * E, 0.09 * E), ys = axe(P.H, P.M.y - 1.3 * E, P.Mo.y + 0.9 * E, 0.28 * E, 0.09 * E);
    const nx = (this.nx = xs.length), ny = (this.ny = ys.length), n = nx * ny, R = doc.couches.boite;
    const rest = (this.rest = new Float32Array(n * 2)), uv = new Float32Array(n * 2), pos = (this.pos = new Float32Array(n * 2));
    const Wt = (this.Wt = new Float32Array(n * NW)), tmp = new Float32Array(NW);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = j * nx + i; rest[v * 2] = xs[i]; rest[v * 2 + 1] = ys[j];
      uv[v * 2] = (xs[i] - R[0]) / (R[2] - R[0]); uv[v * 2 + 1] = (ys[j] - R[1]) / (R[3] - R[1]); // hors boîte : bord transparent (clamp)
      poids(P, xs[i], ys[j], tmp); Wt.set(tmp, v * NW);
    }
    pos.set(rest);
    const indices = (gx: number, gy: number) => { const idx = new Uint32Array((gx - 1) * (gy - 1) * 6); let q = 0;
      for (let j = 0; j < gy - 1; j++) for (let i = 0; i < gx - 1; i++) { const a = j * gx + i, b = a + 1, c = a + gx, d = c + 1; idx[q++] = a; idx[q++] = b; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = c; }
      return idx; };
    const idx = indices(nx, ny);
    const geometrie = (positions: Float32Array, uvs: Float32Array, ind: Uint32Array) => { const g = new PIXI.MeshGeometry({ positions, uvs, indices: ind }); this.geometries.push(g); return g; };
    const geom = geometrie(pos, uv, idx); this.posBuf = geom.getBuffer("aPosition");

    const I: Record<string, HTMLImageElement> = {}; noms.forEach((nm, i) => (I[nm] = imgs[i]));
    this.stage = new PIXI.Container(); this.root = new PIXI.Container(); this.stage.addChild(this.root);
    this.root.scale.set(cad.s); this.root.position.set(cad.ox, cad.oy);
    const corps = new PIXI.Container(); this.root.addChild(corps);
    this.gFx = new PIXI.Graphics(); corps.addChild(this.gFx); // l'éclat passe DERRIÈRE le personnage
    this.groupe = new PIXI.Container(); corps.addChild(this.groupe);
    this.groupe.addChild(new PIXI.Mesh({ geometry: geom, texture: tex(I.corps) }));
    // états (vignettes recadrées) : sous-grilles du maillage, mêmes sommets que la base
    const parBoite = new Map<string, SousGrille>();
    etatsNoms.forEach((nom, k) => {
      const B = doc.etats[nom].boite, cle = B.join(",");
      let sg = parBoite.get(cle);
      if (!sg) {
        let i0 = 0, i1 = nx - 1, j0 = 0, j1 = ny - 1;
        while (i0 < nx - 1 && xs[i0 + 1] <= B[0]) i0++; while (i1 > 0 && xs[i1 - 1] >= B[2]) i1--;
        while (j0 < ny - 1 && ys[j0 + 1] <= B[1]) j0++; while (j1 > 0 && ys[j1 - 1] >= B[3]) j1--;
        const ni = i1 - i0 + 1, nj = j1 - j0 + 1, sp = new Float32Array(ni * nj * 2), su = new Float32Array(ni * nj * 2);
        for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) { const q = (j * ni + i) * 2; su[q] = (xs[i0 + i] - B[0]) / (B[2] - B[0]); su[q + 1] = (ys[j0 + j] - B[1]) / (B[3] - B[1]); }
        const g = geometrie(sp, su, indices(ni, nj));
        sg = { i0, j0, ni, nj, pos: sp, buf: g.getBuffer("aPosition"), geom: g, meshes: [] }; parBoite.set(cle, sg); this.sousGrilles.push(sg);
      }
      const me = new PIXI.Mesh({ geometry: sg.geom, texture: tex(imgsE[k]) }); me.alpha = 0; me.visible = false;
      sg.meshes.push(me); this.groupe.addChild(me); this.etats[nom] = { mesh: me, a: 0 };
    });
    this.gPaup = new PIXI.Graphics(); this.groupe.addChild(this.gPaup);
    // calque main + pinceau : 2e maillage qui tourne au poignet, manchette reposée par-dessus
    const posA = (this.posA = new Float32Array(n * 2)); posA.set(rest);
    const geomA = geometrie(posA, uv.slice(), idx.slice()); this.posBufA = geomA.getBuffer("aPosition");
    this.groupe.addChild(new PIXI.Mesh({ geometry: geomA, texture: tex(I.bras) }));
    this.groupe.addChild(new PIXI.Mesh({ geometry: geom, texture: tex(I.manchette) }));
    this.wPin = new Float32Array(n);
    { // rotation secondaire du pinceau autour de la prise (pas les doigts)
      const A0 = P.pin.a, B0 = P.pin.b, Lp = Math.hypot(B0.x - A0.x, B0.y - A0.y), dx = (B0.x - A0.x) / Lp, dy = (B0.y - A0.y) / Lp, aPr = (P.pin.prise.x - A0.x) * dx + (P.pin.prise.y - A0.y) * dy;
      for (let v = 0; v < n; v++) { const qx = rest[v * 2] - A0.x, qy = rest[v * 2 + 1] - A0.y, al = qx * dx + qy * dy, pe = -qx * dy + qy * dx;
        this.wPin[v] = (1 - sstep(0.17 * E, 0.32 * E, Math.abs(pe))) * sstep(0.35 * E, 0.95 * E, Math.abs(al - aPr)) * (al > -0.3 * E && al < Lp + 0.3 * E ? 1 : 0); }
    }
    for (const p of POSES) { const me = new PIXI.Mesh({ geometry: geom, texture: tex(I["pose-" + p]) }); me.alpha = 0; me.visible = false; corps.addChild(me); this.poses[p] = { mesh: me, a: 0 }; }
    this.gFx2 = new PIXI.Graphics(); corps.addChild(this.gFx2); // étincelle au bout du pinceau, devant

    for (const c of CLES) this.hs[c] = new Ressort(2.2, 1, 0);
    this.cligne.prochain = 1.2 + this.alea() * 2;
    el.appendChild(this.canvas);
    this.poser(); this.renderer.render(this.stage);
    document.addEventListener("visibilitychange", this.surVisibilite);
    if (typeof IntersectionObserver === "function") {
      this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; if (this.visible) this.demarrer(); }, { rootMargin: "64px" });
      this.io.observe(this.canvas);
    }
    this.demarrer();
  }

  // ---------- API ----------
  encombrement() { return { largeur: this.cad.largeur, hauteur: this.cad.hauteur }; }
  parler(texte: string, dureeMs: number) {
    if (this.detruit) return;
    if (!(dureeMs > 0)) { this.parle = false; return; }
    this.parle = true; this.visTxt = visemes(texte); this.syl.i = 0; this.syl.fin = 0; this.prochainGeste = this.t + 0.3;
    this.finParole = performance.now() + dureeMs; this.demarrer();
  }
  pose(p: Pose | null) { const q = p && p !== "base" ? p : null; this.poseVoulue = q; this.humeur = POSE_HUMEUR[q ?? "base"]; this.demarrer(); }
  reagir(type: "bravo" | "surprise" | "rire") {
    if (this.detruit) return;
    if (type === "bravo") { // touche de pinceau, saut + éclat ; une pose demandée n'arrive qu'après le geste (0,85 s)
      this.reaction("touche"); this.apres(0.38, () => this.reaction("saut"));
      if (Math.max(...Object.values(this.poses).map((s) => s.a)) < 0.5) this.poseDes = this.t + 0.85;
    } else if (type === "surprise") { this.impulsion(0, -1); this.cligner(); this.reaction("sursaut"); }
    else { this.reaction("sourcil"); this.apres(1.2, () => this.reaction("rire")); } // comme « taquin » dans la démo
    this.demarrer();
  }
  pause() { this.enPause = true; }
  reprendre() { this.enPause = false; this.demarrer(); }
  detruire() {
    if (this.detruit) return; this.detruit = true;
    if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0;
    document.removeEventListener("visibilitychange", this.surVisibilite); this.io?.disconnect(); this.io = null;
    // le moteur d'abord (son shader de maillage référence encore la dernière texture), puis la scène, les textures, les géométries
    this.renderer.destroy(true); // retire le canevas et perd le contexte WebGL (WEBGL_lose_context)
    this.stage.destroy({ children: true });
    for (const t of this.textures) t.destroy(true);
    for (const g of this.geometries) g.destroy();
    this.textures = []; this.geometries = [];
  }

  // ---------- boucle ----------
  private tourne() { return !this.detruit && !this.enPause && this.visible && !document.hidden && this.canvas.isConnected; }
  private demarrer() { if (this.raf || !this.tourne()) return; this.last = performance.now(); this.raf = requestAnimationFrame(this.image); }
  private image = () => {
    this.raf = 0; if (!this.tourne()) return;
    this.raf = requestAnimationFrame(this.image);
    const now = performance.now(); if (now - this.dernierRendu < 1000 / 60 - 2) return; // 60 i/s au plus
    this.dernierRendu = now;
    const dt = Math.min((now - this.last) / 1000, 0.1); this.last = now;
    const pas = 1 / 120; this.acc += dt;
    while (this.acc >= pas) { this.pas(pas); this.acc -= pas; }
    this.poser(); this.renderer.render(this.stage);
  };
  private apres(d: number, f: () => void) { this.timers.push({ at: this.t + d, f }); }
  private reaction(nom: string) { const R = REACTIONS[nom]; this.reac = this.reac.filter((r) => r.nom !== nom); this.reac.push({ nom, t0: this.t, dur: R.dur, f: R.f, eclat: false }); }
  private impulsion(vx: number, vy: number) {
    const r = this.rs;
    r.b1.v += vx * 0.9; r.b2.v += vx * 1.2; r.hG.v += vx * 1.3; r.hD.v += vx * 1.1; r.poignet.v += vx * 0.6; r.bras.v += vx * 0.15;
    r.by.v += vy * 1.6 * this.P.E; r.hy.v += vy * 1.4 * this.P.E; r.lean.v += vx * 0.08; r.tete.v += vx * 0.12;
  }
  private cligner() { if (this.t - this.cligne.debut > 0.45) { this.cligne.debut = this.t; this.cligne.double = false; } }

  private pas(dt: number) {
    this.t += dt; const t = this.t, P = this.P, E = P.E, r = this.rs, al = this.alea, o = this.o;
    if (this.timers.length) { const dus = this.timers.filter((tm) => t >= tm.at); if (dus.length) { this.timers = this.timers.filter((tm) => t < tm.at); for (const tm of dus) tm.f(); } }
    if (this.parle && performance.now() >= this.finParole) this.parle = false;
    const poseNom = this.poseVoulue && t >= this.poseDes ? this.poseVoulue : null; this.poseNom = poseNom;
    const H = HUMEURS[this.humeur] ?? {}, hv = {} as Record<Cle, number>;
    for (const c of CLES) { let cible = H[c] ?? 0; if (poseNom && SOUS_POSE.has(c)) cible *= 0.1; hv[c] = this.hs[c].pas(cible, dt); }
    // respiration : inspiration 40 % / expiration 60 %, période ~3,6 s légèrement variable
    this.resp += dt / (3.6 + 0.25 * Math.sin(t * 0.37));
    const ph = this.resp % 1, br = ph < 0.4 ? eIO(ph / 0.4) : 1 - eIO((ph - 0.4) / 0.6), brT = r.respTete.pas(br, dt);
    // regard : saccades rapides, la tête suit
    const Rg = this.regard;
    if (t > Rg.prochain) { Rg.prochain = t + 1.2 + al() * 2.6; const k = al(); Rg.autoX = k < 0.35 ? 0 : (al() - 0.5) * 0.9; Rg.autoY = (al() - 0.5) * 0.5; if (al() < 0.3) this.cligner(); }
    const gxT = Rg.autoX, gyT = Rg.autoY;
    o.gx = r.gx.pas(clamp(gxT + hv.gx, -1, 1), dt); o.gy = r.gy.pas(clamp(gyT + hv.gy, -1, 1), dt);
    const drift = 1.1 * DEG * Math.sin((TAU * t) / 4.7) + 0.7 * DEG * Math.sin((TAU * t) / 7.3 + 1.3) + 0.5 * DEG * Math.sin((TAU * t) / 11.1 + 2.1);
    const a: Accu = { tilt: 0, hy: 0, jaw: 0, rieur: 0, cG: 0, cD: 0, bG: 0, bD: 0, tx: 0, ty: 0, lean: 0, sh: 0, aS: 0, aDir: 0, joue: 0, jumpY: 0, sqx: 1, sqy: 1, rireOuvert: 0 };
    this.reac = this.reac.filter((x) => t - x.t0 <= x.dur);
    for (const x of this.reac) x.f(x, t - x.t0, a, this);
    // parole : formes tirées des voyelles du texte (≈11 Hz) ou syllabes aléatoires
    const S = this.syl;
    if (this.parle) {
      if (t >= S.fin) {
        const L = this.visTxt;
        if (L) {
          const v = L[S.i % L.length]; S.i++; S.vis = v; S.cible = OUVERTURE[v] * (0.85 + 0.15 * al());
          S.fin = t + (v === "pause2" ? 0.24 : v === "pause" ? 0.06 : v === "fermee" ? 0.065 : 0.091);
          if (v === "pause2" && al() < 0.4) this.cligner();
        } else {
          S.n++;
          if (S.n % (3 + Math.floor(al() * 4)) === 0) { S.cible = 0; S.vis = "pause"; S.fin = t + 0.12 + al() * 0.16; if (al() < 0.25) this.cligner(); }
          else { const k = al(); S.vis = k < 0.4 ? "a" : k < 0.7 ? "e" : "o"; S.cible = OUVERTURE[S.vis] * (0.6 + 0.4 * al()); S.fin = t + 0.08 + al() * 0.06; }
        }
        if (al() < 0.12) S.emph = t;
      }
      if (t >= this.prochainGeste) { this.prochainGeste = t + 1.4 + al() * 1.8; this.gesteT = t; this.gesteA = 0.6 + 0.4 * al(); }
    } else { S.cible = 0; S.vis = null; }
    const emph = this.parle ? Math.exp(-Math.pow((t - S.emph) / 0.18, 2)) : 0;
    o.jaw = clamp(r.jaw.pas(poseNom ? 0 : clamp(S.cible + hv.jaw + a.jaw, 0, 1.1), dt), 0, 1.15);
    o.larg = r.larg.pas(S.vis ? LARGEUR[S.vis] : 1, dt); o.vis = S.vis; o.rireOuvert = a.rireOuvert;
    // tête
    const talkNod = this.parle ? 0.6 * DEG * Math.sin(t * 9.3) * S.cible : 0;
    o.thH = r.tete.pas(drift + hv.tilt + a.tilt - 1.0 * DEG * o.gx + talkNod, dt);
    o.tx = r.tx.pas(clamp(0.55 * gxT + hv.tx + a.tx + 0.12 * Math.sin((TAU * t) / 7.3), -1, 1), dt);
    o.ty = r.ty.pas(clamp(0.45 * gyT + hv.ty + a.ty + 0.1 * Math.sin((TAU * t) / 4.7 + 0.7) + 0.4 * emph, -1, 1), dt);
    o.hx = 0; o.hy = a.hy;
    o.bG = hv.bG + a.bG + 0.35 * emph; o.bD = hv.bD + a.bD + 0.35 * emph;
    o.joue = clamp(hv.joue + a.joue, 0, 1.2); o.rieur = clamp(hv.rieur + a.rieur, 0, 1);
    // clignements (fermeture 0,10 s, fermé 0,05 s, ouverture 0,15 s ; intervalle 1,5-7 s ; 18 % de doubles)
    const C = this.cligne;
    if (t >= C.prochain) { C.debut = t; C.double = al() < 0.18; C.prochain = t + Math.max(1.5, al() * 7); }
    const unC = (u: number) => (u < 0 ? 0 : u < 0.1 ? eIn(u / 0.1) : u < 0.15 ? 1 : u < 0.3 ? 1 - eOut((u - 0.15) / 0.15) : 0);
    let bl = unC(t - C.debut); if (C.double) bl = Math.max(bl, unC(t - C.debut - 0.32)); if (poseNom) bl = 0;
    o.blink = bl; o.sqG = clamp(hv.cG + a.cG, 0, 1); o.sqD = clamp(hv.cD + a.cD, 0, 1);
    o.cG = Math.max(bl, o.sqG); o.cD = Math.max(bl, o.sqD);
    // corps et geste du pinceau
    o.breath = br; o.breathT = brT;
    o.lean = r.lean.pas(hv.lean + a.lean + 0.45 * DEG * Math.sin((TAU * t) / 11.1), dt);
    o.sh = a.sh;
    const geste = this.gesteT != null ? -2.2 * DEG * this.gesteA * env(t - this.gesteT, 0.25, 0.9, 0.45) : 0;
    this.talkE += ((this.parle ? 1 : 0) - this.talkE) * (1 - Math.exp(-dt / 0.25));
    const vivant = -this.talkE * (1.6 + 0.9 * Math.sin((TAU * t) / 1.9) + 0.7 * Math.sin((TAU * t) / 0.83 + 1)) * DEG; // 2-4° irréguliers
    const aPrev = o.aS;
    o.aS = r.bras.pas(poseNom ? 0 : a.aS + geste + vivant + 0.9 * DEG * Math.sin((TAU * t) / 7.3 + 0.5) - 0.6 * DEG * br, dt) + (poseNom ? 0 : a.aDir);
    r.pin.v += -((o.aS - aPrev) / dt) * 6 * dt;
    o.aB = clamp(r.pin.pas(this.talkE * 1.2 * DEG * Math.sin((TAU * t) / 0.47), dt), -7 * DEG, 7 * DEG);
    o.aC = 0.6 * DEG * Math.sin((TAU * t) / 4.7 + 2) + 0.4 * DEG * br;
    o.jumpY = a.jumpY; o.sqx = a.sqx; o.sqy = a.sqy;
    // physique secondaire : entrée = vitesse de la tête / du corps
    const headVel = (o.thH - this.prevHead) / dt; this.prevHead = o.thH;
    const jv = (o.jumpY - this.prevJumpY) / dt; this.prevJumpY = o.jumpY;
    const lim = (v: number) => clamp(v, -10 * DEG, 10 * DEG);
    r.b1.v += -headVel * 4.4 * dt; r.b2.v += -headVel * 2.8 * dt;
    o.b1 = lim(r.b1.pas(0.35 * o.thH + 0.5 * o.lean, dt)); o.b2 = lim(r.b2.pas(o.b1 * 0.6, dt));
    r.hG.v += -headVel * 4 * dt; r.hD.v += -headVel * 4 * dt;
    o.hG = lim(r.hG.pas(0.3 * o.thH, dt)); o.hD = lim(r.hD.pas(0.3 * o.thH, dt));
    o.by = clamp(r.by.pas(clamp(-jv * 0.012, -0.35 * E, 0.35 * E), dt), -0.4 * E, 0.4 * E);
    o.hyH = clamp(r.hy.pas(clamp(-jv * 0.01, -0.3 * E, 0.3 * E), dt), -0.35 * E, 0.35 * E);
    o.aP = lim(r.poignet.pas(-0.6 * o.aS + 0.4 * o.lean, dt));
    this.fx = this.fx.filter((fx) => t - fx.t0 < 0.75);
    // états : fondus courts (yeux ~40 ms, bouches ~50 ms) ; poses : fondu croisé linéaire 150 ms
    const k50 = 1 - Math.exp(-dt / 0.018), k40 = 1 - Math.exp(-dt / 0.013);
    for (const [nom, s] of Object.entries(this.etats)) {
      let cible = 0, kk = k50;
      if (nom === "yeux-fermes") { cible = sstep(0.35, 0.75, bl); kk = k40; }
      else {
        let v: string | null = null;
        if (this.parle) v = o.vis === "a" || o.vis === "o" || o.vis === "e" ? o.vis : "fermee";
        if (o.rireOuvert > 0.35) v = "a";
        cible = v && nom === "bouche-" + v ? 1 : 0;
      }
      if (poseNom) cible = 0;
      s.a += (cible - s.a) * kk;
    }
    for (const [nom, s] of Object.entries(this.poses)) { const c = nom === poseNom ? 1 : 0; s.a += clamp(c - s.a, -dt / 0.15, dt / 0.15); }
  }

  private deformer(x0: number, y0: number, w: Float32Array, base: number, out: number[], bras = false, wp = 0) {
    const o = this.o, P = this.P, k = this.K;
    let x = x0, y = y0, a: number, c: number, s: number, dx: number, dy: number;
    y += w[base + 6] * k.jawPx;
    y -= w[base + 7] * k.brG + w[base + 8] * k.brD;
    const we = w[base + 9] + w[base + 10]; x += we * k.gx; y += we * k.gy;
    y -= w[base + 18] * k.joue;
    const rot = (px: number, py: number, ang: number) => { c = Math.cos(ang); s = Math.sin(ang); dx = x - px; dy = y - py; x = px + c * dx - s * dy; y = py + s * dx + c * dy; };
    if ((a = w[base + 2]) > 0.001) rot(P.menton.x, P.menton.y, a * o.b1);
    if ((a = w[base + 3]) > 0.001) rot(k.mbx, k.mby, a * o.b2);
    y += (w[base + 2] * 0.6 + w[base + 3] * 0.4) * o.by;
    if ((a = w[base + 4]) > 0.001) { rot(P.chG.cx, P.M.y, a * o.hG); y += a * o.hyH; }
    if ((a = w[base + 5]) > 0.001) { rot(P.chD.cx, P.M.y, a * o.hD); y += a * o.hyH; }
    const wT = w[base], f3 = w[base + 11];
    x += f3 * k.tx3 - wT * (1 - f3) * k.tx3 * 0.18; y += f3 * k.ty3;
    if (wT > 0.001) { rot(P.cou.x, P.cou.y, wT * o.thH); x += wT * o.hx; y += wT * o.hy; }
    const ws = w[base + 1]; x += ws * k.dcx; y += ws * k.dcy;
    if (bras) { if (wp > 0.001) rot(P.pin.prise.x, P.pin.prise.y, wp * o.aB); rot(P.pivBras.x, P.pivBras.y, o.aS); }
    if ((a = w[base + 14]) > 0.001) rot(P.ec.x, P.ec.y, a * o.aC);
    const wT2 = Math.min(1, wT + ws);
    y -= w[base + 16] * k.brPx * lerp(o.breath, o.breathT, wT2);
    y -= w[base + 17] * (k.shPx * o.breath + o.sh * 0.06 * P.E);
    x += w[base + 17] * (x0 - P.cou.x) * 0.004 * o.breath;
    if ((a = w[base + 15]) > 0.001) rot(P.cou.x, P.ceinture, a * o.lean);
    // saut = étirement depuis la coupe ; le bord bas ne décolle jamais
    const wj = sstep(P.coupe, P.cou.y, y0);
    y += o.jumpY * wj;
    x = P.pieds.x + (x - P.pieds.x) * (1 + (o.sqx - 1) * wj);
    y = P.coupe - (P.coupe - y) * o.sqy;
    const pin = sstep(P.coupe - 0.07 * (P.coupe - P.haut.y), P.coupe, y0);
    out[0] = lerp(x, x0, pin); out[1] = lerp(y, y0, pin);
  }
  private point(x: number, y: number): number[] { poids(this.P, x, y, this.tw); const out = [0, 0]; this.deformer(x, y, this.tw, 0, out); return out; }

  private poser() {
    const P = this.P, E = P.E, o = this.o;
    const mid = lerp(P.menton.y, P.barbe.y1m || P.barbe.cy + P.barbe.ry, 0.45);
    const C = P.menton, N = P.cou, cth = Math.cos(o.thH), sth = Math.sin(o.thH), dxC = C.x - N.x, dyC = C.y - N.y;
    Object.assign(this.K, {
      jawPx: 0.05 * E * o.jaw, brG: 0.14 * E * o.bG, brD: 0.14 * E * o.bD, gx: 0.22 * P.eg.rx * o.gx, gy: 0.25 * P.eg.ry * o.gy,
      joue: 0.06 * E * o.joue, mbx: P.barbe.cx, mby: mid, tx3: 0.15 * E * o.tx, ty3: 0.12 * E * o.ty,
      dcx: N.x + cth * dxC - sth * dyC - C.x + o.hx + 0.15 * E * o.tx * 0.5, dcy: N.y + sth * dxC + cth * dyC - C.y + o.hy,
      brPx: 0.012 * (P.ceinture - P.haut.y), shPx: 0.05 * E,
    });
    const n = this.nx * this.ny, rest = this.rest, pos = this.pos, Wt = this.Wt, out = [0, 0];
    for (let v = 0; v < n; v++) { this.deformer(rest[v * 2], rest[v * 2 + 1], Wt, v * NW, out); pos[v * 2] = out[0]; pos[v * 2 + 1] = out[1]; }
    this.posBuf.update();
    const pa = this.posA;
    for (let v = 0; v < n; v++) { this.deformer(rest[v * 2], rest[v * 2 + 1], Wt, v * NW, out, true, this.wPin[v]); pa[v * 2] = out[0]; pa[v * 2 + 1] = out[1]; }
    this.posBufA.update();
    for (const s of Object.values(this.etats)) { s.mesh.alpha = clamp(s.a, 0, 1); s.mesh.visible = s.a > 0.004; }
    for (const sg of this.sousGrilles) {
      if (!sg.meshes.some((m) => m.visible)) continue;
      for (let j = 0; j < sg.nj; j++) for (let i = 0; i < sg.ni; i++) { const q = (j * sg.ni + i) * 2, v = ((sg.j0 + j) * this.nx + sg.i0 + i) * 2; sg.pos[q] = pos[v]; sg.pos[q + 1] = pos[v + 1]; }
      sg.buf.update();
    }
    let A = 0; for (const s of Object.values(this.poses)) { const al = eIO(s.a); s.mesh.alpha = al; s.mesh.visible = al > 0.003; A = Math.max(A, al); }
    this.groupe.alpha = 1 - sstep(0.5, 1, A); this.groupe.visible = this.groupe.alpha > 0.003;
    this.paupieres(); this.eclats();
  }

  private cadreLocal(cx: number, cy: number, hw: number) {
    const c = this.point(cx, cy), L = this.point(cx - hw, cy), R = this.point(cx + hw, cy);
    let ux = R[0] - L[0], uy = R[1] - L[1]; const len = Math.hypot(ux, uy) || 1; ux /= len; uy /= len;
    return { c, ux, uy, vx: -uy, vy: ux, hw: len / 2 };
  }

  private paupieres() { // avec l'image « yeux fermés », le clignement passe par elle ; la paupière peinte ne sert qu'aux plissements
    const g = this.gPaup, P = this.P, E = P.E, o = this.o, col = P.couleurs; g.clear();
    const peau = mixHex(col.peau, col.peau_ombre, 0.28), trait = hex(col.trait), lw = 0.075 * E;
    const iaYeux = !!this.etats["yeux-fermes"], fondu = iaYeux ? 1 - sstep(0.35, 0.75, o.blink) : 1;
    for (const [oe, cTot, sq] of [[P.eg, o.cG, o.sqG], [P.ed, o.cD, o.sqD]] as [Oeil, number, number][]) {
      const c = iaYeux ? Math.min(sq, 0.6) * fondu : cTot, rieur = o.rieur * 0.5 * fondu;
      if (c < 0.03 && rieur < 0.05) continue;
      const F = this.cadreLocal(oe.c.x, oe.c.y, oe.rx * 1.3), ry = oe.ry * (F.hw / (oe.rx * 1.3));
      const N = 14, up: number[] = [], lo: number[] = [], edge: number[] = [], edgeL: number[] = [];
      const ce = eIO(c), ferme = 0.55, low = Math.max(sstep(0.55, 1, c), 0.45 * rieur);
      const P2 = (uu: number, vv: number) => [F.c[0] + F.ux * uu * F.hw + F.vx * vv, F.c[1] + F.uy * uu * F.hw + F.vy * vv];
      for (let i = 0; i <= N; i++) {
        const u = -1 + (2 * i) / N, s = Math.sqrt(Math.max(0, 1 - u * u));
        const vTop = -1.22 * ry * s, vEdge = lerp(-1.0 * ry * s, ferme * ry * s - 0.25 * ry * rieur * s, ce);
        const vBot = 1.2 * ry * s, vLow = lerp(1.2 * ry * s, ferme * ry * s - 0.25 * ry * rieur * s, low);
        const A = P2(u, vTop), B = P2(u, vEdge), D = P2(u, vBot), Ee = P2(u, Math.max(vLow, vEdge));
        up.push(A[0], A[1]); edge.push(B[0], B[1]); lo.push(D[0], D[1]); edgeL.push(Ee[0], Ee[1]);
      }
      if (ce > 0.02) { const poly = up.slice(); for (let i = N; i >= 0; i--) poly.push(edge[i * 2], edge[i * 2 + 1]); g.poly(poly).fill({ color: peau }); }
      if (low > 0.02) { const poly = lo.slice(); for (let i = N; i >= 0; i--) poly.push(edgeL[i * 2], edgeL[i * 2 + 1]); g.poly(poly).fill({ color: mixHex(col.peau, col.peau_ombre, 0.12) }); }
      if (ce > 0.02) { g.moveTo(edge[0], edge[1]); for (let i = 1; i <= N; i++) g.lineTo(edge[i * 2], edge[i * 2 + 1]); g.stroke({ width: lw * (0.8 + 0.4 * ce), color: trait, cap: "round", join: "round" }); }
    }
  }

  private eclats() {
    const g = this.gFx, g2 = this.gFx2, P = this.P, E = P.E, o = this.o; g.clear(); g2.clear(); if (!this.fx.length) return;
    for (const f of this.fx) if (f.pointe) { // étincelle au bout du pinceau
      const tp = this.point(P.pin.b.x, P.pin.b.y), pv = this.point(P.pivBras.x, P.pivBras.y), c = Math.cos(o.aS), sn = Math.sin(o.aS);
      const X = pv[0] + c * (tp[0] - pv[0]) - sn * (tp[1] - pv[1]), Y = pv[1] + sn * (tp[0] - pv[0]) + c * (tp[1] - pv[1]);
      const u = (this.t - f.t0) / 0.6; if (u > 1) continue; const e = eOut(u), al = 1 - eIn(u);
      for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.9 + i * Math.PI * 0.3, r0 = 0.28 * E * (1 + 1.2 * e), r1 = r0 + 0.5 * E * (1 - 0.7 * u);
        g2.moveTo(X + Math.cos(a) * r0, Y + Math.sin(a) * r0).lineTo(X + Math.cos(a) * r1, Y + Math.sin(a) * r1); g2.stroke({ width: 0.08 * E, color: i % 2 ? 0xe0a83a : 0xb4412f, alpha: al, cap: "round" }); }
    }
    const c = this.point(P.M.x + 0.4 * E, P.M.y - 0.6 * E), R0 = Math.max(3.0 * E, (P.M.y - P.haut.y) * 1.25);
    for (const f of this.fx) {
      if (f.pointe) continue;
      const u = (this.t - f.t0) / 0.75, e = eOut(u), al = 1 - eIn(u);
      for (let i = 0; i < f.n; i++) {
        const a = Math.PI * (0.88 + (1.24 * (i + 0.5)) / f.n) + 0.08 * Math.sin(i * 7.1 + f.rot), r0 = R0 * (1 + 0.43 * e), r1 = r0 + R0 * (0.3 + 0.17 * (i % 2)) * (1 - 0.6 * u);
        const ca = Math.cos(a) * 1.15, sa = Math.sin(a);
        g.moveTo(c[0] + ca * r0, c[1] + sa * r0).lineTo(c[0] + ca * r1, c[1] + sa * r1);
        g.stroke({ width: R0 * (0.073 - 0.033 * u), color: i % 3 === 0 ? 0xb4412f : 0xe0a83a, alpha: al, cap: "round" });
      }
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * (1.0 + 0.33 * i + 0.1 * Math.sin(f.rot)), r = R0 * (1.3 + 0.4 * e), x = c[0] + Math.cos(a) * r * 1.15, y = c[1] + Math.sin(a) * r, s = 0.14 * R0 * (1 - 0.5 * u);
        g.poly([x, y - s, x + s * 0.28, y - s * 0.28, x + s, y, x + s * 0.28, y + s * 0.28, x, y + s, x - s * 0.28, y + s * 0.28, x - s, y, x - s * 0.28, y - s * 0.28]).fill({ color: 0xe0a83a, alpha: al });
      }
    }
  }
}
