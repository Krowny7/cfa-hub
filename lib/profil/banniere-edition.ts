// L'édition de la bannière composée (components/profil/EditeurBanniere.tsx) :
// ce qui se calcule sans navigateur. La géométrie du glisser (déplacer un
// calque), du redimensionner (huit poignées, ou les quatre coins quand les
// proportions sont verrouillées) et du clavier (flèches, + et −), l'ordre
// d'empilement (un cran devant ou derrière), et les changements de
// composition de l'éditeur (une image mise, retirée, une réinitialisation, le
// verrou des proportions).
// Tout part d'un calque de départ et d'un déplacement du pointeur, en % de la
// bannière (pointDeScene : l'écran → la scène), et rend un calque BORNÉ
// (bornerCalque : largeur et hauteur dans leurs limites, tout le calque dans la
// zone de débordement). Rien ne sort jamais de la scène, quelle que soit la
// poignée ou la valeur tapée. Le calque de départ reste intact (on repart de lui
// à chaque mouvement, jamais du résultat précédent : pas de dérive).
// Module neutre (client et serveur), sans état.

import {
  BANNIERE_H,
  BANNIERE_L,
  CALQUE_H_MIN,
  CALQUE_L_MAX,
  CALQUE_L_MIN,
  SCENE,
  SCENE_H,
  SCENE_L,
  bornerCalque,
  bornerRatio,
  hauteurCalque,
  poserCalque,
  prereglageDe,
  ratioPrereglage,
  type Calque,
  type CleCalque,
  type CleImage,
  type CleOrdre,
  type Composition,
} from "@/lib/profil/banniere";

/** 1 % de largeur de bannière vaut K % de sa hauteur (voir lib/profil/banniere.ts) */
const K = BANNIERE_L / BANNIERE_H;

// ── Du pointeur à la scène ──────────────────────────────────────────────
export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; width: number; height: number };

/** Un point de l'écran en coordonnées de la bannière (% de sa largeur et de sa hauteur ; la scène va de SCENE.x0 à SCENE.x1, de SCENE.y0 à SCENE.y1). `r` : la boîte de la scène à l'écran. */
export function pointDeScene(clientX: number, clientY: number, r: Rect): Point {
  const l = r.width > 0 ? r.width : 1;
  const h = r.height > 0 ? r.height : 1;
  return { x: SCENE.x0 + ((clientX - r.left) / l) * SCENE_L, y: SCENE.y0 + ((clientY - r.top) / h) * SCENE_H };
}

// ── Les poignées ────────────────────────────────────────────────────────
export type Poignee = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export const COINS: readonly Poignee[] = ["nw", "ne", "se", "sw"];
export const POIGNEES: readonly Poignee[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
type Sens = { ex: -1 | 0 | 1; ey: -1 | 0 | 1 };
const SENS: Record<Poignee, Sens> = {
  nw: { ex: -1, ey: -1 },
  n: { ex: 0, ey: -1 },
  ne: { ex: 1, ey: -1 },
  e: { ex: 1, ey: 0 },
  se: { ex: 1, ey: 1 },
  s: { ex: 0, ey: 1 },
  sw: { ex: -1, ey: 1 },
  w: { ex: -1, ey: 0 },
};
/** Les poignées proposées : les quatre coins quand les proportions sont verrouillées (h null), les huit sinon. */
export const poigneesDe = (c: Pick<Calque, "h">): readonly Poignee[] => (c.h === null ? COINS : POIGNEES);
export const estPoignee = (v: unknown): v is Poignee => typeof v === "string" && (POIGNEES as readonly string[]).includes(v);

// ── Déplacer, redimensionner ────────────────────────────────────────────
/** Le calque déplacé de (dx, dy), en % de la bannière, ramené dans la scène. */
export function deplacer(depart: Calque, dx: number, dy: number): Calque {
  return bornerCalque({ ...depart, x: depart.x + dx, y: depart.y + dy });
}

/** Le plus grand côté permis entre un point d'ancrage et une limite de la scène (jamais en dessous de `min`). */
const dans = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Le calque redimensionné par la poignée `poignee`, tirée de (dx, dy) % de la
 * bannière. Le bord (ou le coin) opposé reste en place.
 *  - Proportions verrouillées (h null) : le calque garde sa forme ; un coin
 *    le met à l'échelle selon la distance du pointeur au coin opposé
 *    (projection sur la diagonale), un bord (non proposé, mais toléré) selon
 *    son seul axe, centré sur l'autre.
 *  - Sinon : chaque bord tiré bouge seul, largeur et hauteur indépendantes
 *    (h devient un nombre).
 * Dans les deux cas : jamais sous le minimum, jamais hors de la scène (la taille
 * cède avant que le bord opposé ne bouge).
 */
export function redimensionner(depart: Calque, poignee: Poignee, dx: number, dy: number): Calque {
  const { ex, ey } = SENS[poignee];
  const hh0 = hauteurCalque(depart);
  const gauche = depart.x;
  const droite = depart.x + depart.l;
  const haut = depart.y;
  const bas = depart.y + hh0;

  if (depart.h !== null) {
    let g = gauche;
    let d = droite;
    let t = haut;
    let b = bas;
    if (ex > 0) d = dans(d + dx, g + CALQUE_L_MIN, SCENE.x1);
    if (ex < 0) g = dans(g + dx, SCENE.x0, d - CALQUE_L_MIN);
    if (ey > 0) b = dans(b + dy, t + CALQUE_H_MIN, SCENE.y1);
    if (ey < 0) t = dans(t + dy, SCENE.y0, b - CALQUE_H_MIN);
    return bornerCalque({ ...depart, x: g, y: t, l: d - g, h: b - t });
  }

  // proportions verrouillées : une seule échelle s
  const cx = gauche + depart.l / 2;
  const cy = haut + hh0 / 2;
  // le point tenu (coin ou milieu du bord) et l'ancre (son opposé)
  const gx = ex > 0 ? droite : ex < 0 ? gauche : cx;
  const gy = ey > 0 ? bas : ey < 0 ? haut : cy;
  const ax = ex > 0 ? gauche : ex < 0 ? droite : cx;
  const ay = ey > 0 ? haut : ey < 0 ? bas : cy;
  let s: number;
  if (ex !== 0 && ey !== 0) {
    const vx = gx - ax;
    const vy = gy - ay;
    s = ((gx + dx - ax) * vx + (gy + dy - ay) * vy) / (vx * vx + vy * vy || 1);
  } else if (ex !== 0) s = (depart.l + ex * dx) / depart.l;
  else s = (hh0 + ey * dy) / hh0;
  const r = bornerRatio(depart.r);
  let l = depart.l * s;
  // limites de la largeur : ses bornes, celles de la hauteur qui en découle, et la scène à partir de l'ancre
  const lMin = Math.max(CALQUE_L_MIN, Math.ceil(((CALQUE_H_MIN * r) / K) * 10) / 10);
  let lMax = Math.min(CALQUE_L_MAX, SCENE_H * (r / K));
  lMax = Math.min(lMax, ex > 0 ? SCENE.x1 - gauche : ex < 0 ? droite - SCENE.x0 : 2 * Math.min(cx - SCENE.x0, SCENE.x1 - cx));
  lMax = Math.min(lMax, (ey > 0 ? SCENE.y1 - haut : ey < 0 ? bas - SCENE.y0 : 2 * Math.min(cy - SCENE.y0, SCENE.y1 - cy)) * (r / K));
  l = dans(l, lMin, Math.max(lMin, lMax));
  const hh = (l * K) / r;
  const x = ex > 0 ? gauche : ex < 0 ? droite - l : cx - l / 2;
  const y = ey > 0 ? haut : ey < 0 ? bas - hh : cy - hh / 2;
  return bornerCalque({ ...depart, x, y, l, h: null });
}

/** Agrandit (dl > 0) ou réduit le calque de `dl` % de largeur, autour de son centre (le clavier : + et −) ; sa forme est gardée. */
export function agrandir(c: Calque, dl: number): Calque {
  const hh = hauteurCalque(c);
  const l = dans(c.l + dl, CALQUE_L_MIN, CALQUE_L_MAX);
  const echelle = l / c.l;
  const h = c.h === null ? null : c.h * echelle;
  const hh2 = h ?? hauteurCalque({ l, h: null, r: c.r });
  return bornerCalque({ ...c, x: c.x - (l - c.l) / 2, y: c.y - (hh2 - hh) / 2, l, h });
}

/** Un cran du clavier : fin, ou rapide avec Maj (en % de la bannière). */
export const PAS_FIN = 0.5;
export const PAS_VITE = 2;
/**
 * Le calque que la touche donne : les flèches le déplacent (Maj : plus vite),
 * + et − l'agrandissent ou le réduisent autour de son centre ; une autre
 * touche : null (rien à faire, la page garde la touche).
 */
export function parClavier(c: Calque, touche: string, vite: boolean): Calque | null {
  const pas = vite ? PAS_VITE : PAS_FIN;
  switch (touche) {
    case "ArrowLeft":
      return deplacer(c, -pas, 0);
    case "ArrowRight":
      return deplacer(c, pas, 0);
    case "ArrowUp":
      return deplacer(c, 0, -pas);
    case "ArrowDown":
      return deplacer(c, 0, pas);
    case "+":
    case "=":
      return agrandir(c, vite ? 5 : 1);
    case "-":
    case "_":
      return agrandir(c, vite ? -5 : -1);
    default:
      return null;
  }
}

/** Les deux calques disent-ils la même chose ? (un geste sans effet n'enregistre rien) */
export const memeCalque = (a: Calque, b: Calque): boolean => a.image === b.image && a.x === b.x && a.y === b.y && a.l === b.l && a.h === b.h && a.r === b.r;

/** Un calque tient-il tout entier dans la scène, dans ses limites de taille ? (les tests s'en servent) */
export function dansLaScene(c: Calque): boolean {
  const hh = hauteurCalque(c);
  const e = 1e-6;
  return c.x >= SCENE.x0 - e && c.y >= SCENE.y0 - e && c.x + c.l <= SCENE.x1 + e && c.y + hh <= SCENE.y1 + e && c.l >= CALQUE_L_MIN - e && hh >= CALQUE_H_MIN - e;
}

// ── L'ordre d'empilement ────────────────────────────────────────────────
/** L'élément `cle` d'un cran vers l'avant (sens 1) ou vers le fond (−1) ; aux extrémités, l'ordre ne change pas. */
export function pousser(ordre: readonly CleOrdre[], cle: CleOrdre, sens: 1 | -1): CleOrdre[] {
  const out = [...ordre];
  const i = out.indexOf(cle);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
/** L'élément peut-il encore avancer (sens 1) ou reculer (−1) ? */
export const peutPousser = (ordre: readonly CleOrdre[], cle: CleOrdre, sens: 1 | -1): boolean => {
  const j = ordre.indexOf(cle) + sens;
  return ordre.indexOf(cle) >= 0 && j >= 0 && j < ordre.length;
};
/** Le calque est-il devant le cadre de la bannière (sinon derrière) ? */
export const devantLeCadre = (ordre: readonly CleOrdre[], cle: CleCalque): boolean => ordre.indexOf(cle) > ordre.indexOf("cadre");

// ── Les changements de composition de l'éditeur ─────────────────────────
/** La composition avec ce calque remplacé. */
export const avecCalque = (c: Composition, cle: CleCalque, k: Calque): Composition => ({ ...c, [cle]: k });

/**
 * L'image d'un élément mise (adresse envoyée ou « piece:<id> ») ou retirée
 * (null). Le fond : reprend son cadrage au centre. Un calque qui avait déjà
 * une image garde sa place et sa largeur (sa hauteur suit la nouvelle
 * proportion s'il est verrouillé) ; un calque vide est posé à sa place par
 * défaut (poserCalque) ; un calque retiré revient à sa place par défaut. Un
 * préréglage donne sa propre proportion, jamais `ratio`.
 */
export function avecImage(c: Composition, cle: CleImage, image: string | null, ratio?: number): Composition {
  if (cle === "fond") return { ...c, fond: { image, px: 50, py: 50 } };
  const ancien = c[cle];
  if (!image) return avecCalque(c, cle, poserCalque(cle, null, ancien.r));
  const p = prereglageDe(image);
  const r = p ? ratioPrereglage(cle, p) : bornerRatio(ratio ?? ancien.r);
  return avecCalque(c, cle, ancien.image ? bornerCalque({ ...ancien, image, r }) : poserCalque(cle, image, r));
}

/** Un calque (ou le cadrage du fond) remis à sa place par défaut ; son image reste. */
export function reinitialiser(c: Composition, cle: CleImage): Composition {
  if (cle === "fond") return { ...c, fond: { ...c.fond, px: 50, py: 50 } };
  const k = c[cle];
  return avecCalque(c, cle, poserCalque(cle, k.image, k.r));
}

/** Le verrou des proportions : verrouillé, la hauteur suit la largeur (h null) ; déverrouillé, elle est figée à sa valeur du moment. */
export const avecVerrou = (k: Calque, verrouille: boolean): Calque => bornerCalque(verrouille ? { ...k, h: null } : { ...k, h: hauteurCalque(k) });

/** Un champ du calque réglé à la main (curseur ou case) : x, y, largeur ou hauteur, en % de la bannière. La valeur est ramenée dans les bornes. */
export const avecChamp = (k: Calque, champ: "x" | "y" | "l" | "h", v: number): Calque => bornerCalque({ ...k, [champ]: v });

/** Le point de cadrage du fond (0 à 100 ; 50 : centré). */
export const avecCadrage = (c: Composition, px: number, py: number): Composition => ({
  ...c,
  fond: { ...c.fond, px: Math.round(dans(Number.isFinite(px) ? px : 50, 0, 100) * 10) / 10, py: Math.round(dans(Number.isFinite(py) ? py : 50, 0, 100) * 10) / 10 },
});

/** Le premier élément à montrer ouvert : un calque qui a une image (le personnage d'abord), sinon le personnage. */
export function selectionDepart(c: Composition): CleImage {
  return (["perso", "haut", "bas"] as const).find((k) => c[k].image) ?? (c.fond.image ? "fond" : "perso");
}

// ── Un geste du pointeur ────────────────────────────────────────────────
/** Un geste en cours sur un calque : déplacer, ou tirer une poignée. `p0` : où le pointeur a commencé (coordonnées de la bannière) ; `dernier` : le calque au dernier mouvement. */
export type Geste = { id: number; mode: "deplacer" | Poignee; cle: CleCalque; depart: Calque; p0: Point; dernier: Calque };

export const commencerGeste = (id: number, mode: Geste["mode"], cle: CleCalque, depart: Calque, p0: Point): Geste => ({ id, mode, cle, depart, p0, dernier: depart });

/** Le geste quand le pointeur est en `p` : toujours calculé depuis le calque de départ (jamais depuis le mouvement précédent : pas de dérive). */
export function avancerGeste(g: Geste, p: Point): Geste {
  const dx = p.x - g.p0.x;
  const dy = p.y - g.p0.y;
  return { ...g, dernier: g.mode === "deplacer" ? deplacer(g.depart, dx, dy) : redimensionner(g.depart, g.mode, dx, dy) };
}

/** Ce que le relâcher enregistre : le calque final, ou null si le geste n'a rien changé (un simple toucher n'écrit rien dans le brouillon). */
export const finDeGeste = (g: Geste): Calque | null => (memeCalque(g.dernier, g.depart) ? null : g.dernier);
