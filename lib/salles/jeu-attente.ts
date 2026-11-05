// Le mini-jeu de la salle d'attente : l'intérieur du dojo (public/salles/dojo.webp), vu de
// haut en perspective. Chacun promène son samouraï et ramasse les rouleaux ; le premier à
// MANCHE gagne la manche. Rien en base : les positions et les scores passent par un canal
// Realtime (components/salles/JeuAttente). Ce module ne garde que les règles, sans navigateur,
// pour les tester. Toutes les coordonnées sont celles de l'image, pieds du joueur compris.

export const LARGEUR = 1024;
export const HAUTEUR = 572;

/** Pixels d'image par seconde ; en profondeur, on avance moins vite à l'écran. */
export const VITESSE = 170;
const PROFONDEUR = 0.72;
export const ROULEAUX_MAX = 3;
/** Les rouleaux à ramasser pour gagner la manche. */
export const MANCHE = 10;
/** La distance à laquelle les pieds du joueur ramassent un rouleau. */
const PORTEE = 34;
/** La place que prennent les pieds : on ne frôle ni les murs ni les poteaux. */
const PIEDS = 13;

export type Direction = "bas" | "haut" | "gauche" | "droite";
export type Point = { x: number; y: number };
export type Rouleau = { id: string; x: number; y: number };

const miroir = (p: Point): Point => ({ x: LARGEUR - p.x, y: p.y });

/** Le sol où l'on marche : le fond est étroit, le devant large. */
const SOL_HAUT = 215;
const SOL_BAS = 448;
const bordGauche = (y: number) => 255 - ((y - SOL_HAUT) / (SOL_BAS - SOL_HAUT)) * 130;

/** Les meubles : [gauche, haut, droite, bas]. */
const MEUBLES: [number, number, number, number][] = [
  [270, 0, 345, 232],
  [680, 0, 750, 232],
  [745, 0, 800, 238],
  [860, 425, 930, 500],
  [110, 395, 170, 500],
  [805, 255, 870, 345],
];

/** Les deux rangées de poteaux à bannières : on en fait le tour par le devant de la salle. */
const BARRIERE_GAUCHE: [Point, Point] = [
  { x: 378, y: 205 },
  { x: 323, y: 412 },
];
const BARRIERES: [Point, Point][] = [BARRIERE_GAUCHE, [miroir(BARRIERE_GAUCHE[0]), miroir(BARRIERE_GAUCHE[1])]];

function distanceAuSegment(p: Point, [a, b]: [Point, Point]): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function estBloquee(x: number, y: number): boolean {
  if (y < SOL_HAUT || y > SOL_BAS) return true;
  const g = bordGauche(y);
  if (x < g || x > LARGEUR - g) return true;
  if (MEUBLES.some(([l, h, r, b]) => x > l && x < r && y > h && y < b)) return true;
  return BARRIERES.some((s) => distanceAuSegment({ x, y }, s) < PIEDS);
}

/** Un pas : chaque axe à part, pour glisser le long d'un obstacle au lieu de s'y coller. */
export function avancer(p: Point, dx: number, dy: number, dt: number): Point {
  const n = Math.hypot(dx, dy);
  if (n === 0) return p;
  const pas = (VITESSE * dt) / n;
  const enX = { x: p.x + dx * pas, y: p.y };
  const apresX = estBloquee(enX.x, enX.y) ? p : enX;
  const enY = { x: apresX.x, y: apresX.y + dy * pas * PROFONDEUR };
  return estBloquee(enY.x, enY.y) ? apresX : enY;
}

/** Vers où regarde un joueur qui se déplace ainsi. */
export function directionDe(dx: number, dy: number, avant: Direction): Direction {
  if (dx === 0 && dy === 0) return avant;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "droite" : "gauche";
  return dy > 0 ? "bas" : "haut";
}

/** La perspective : les personnages rapetissent vers le fond de la salle. */
export const echelle = (y: number): number => 0.78 + (Math.max(0, Math.min(1, (y - SOL_HAUT) / (SOL_BAS - SOL_HAUT))) * 0.36);

const POINTS_LIBRES: Point[] = [];
for (let y = SOL_HAUT + 10; y < SOL_BAS; y += 24) {
  for (let x = 130; x < LARGEUR - 130; x += 34) {
    if (!estBloquee(x, y)) POINTS_LIBRES.push({ x, y });
  }
}

/** Où un joueur apparaît : un point libre qui dépend de lui, pour ne pas s'empiler. */
export function depart(userId: string): Point {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return POINTS_LIBRES[h % POINTS_LIBRES.length];
}

/** Un point libre pour un nouveau rouleau, loin des autres ; `hasard` : entre 0 et 1. */
export function lieuDeRouleau(rouleaux: Rouleau[], hasard: number): Point | null {
  const points = POINTS_LIBRES.filter((p) => rouleaux.every((r) => Math.hypot(r.x - p.x, r.y - p.y) > 70));
  return points.length ? points[Math.min(points.length - 1, Math.floor(hasard * points.length))] : null;
}

/** Le rouleau à portée de ces pieds, s'il y en a un. */
export function rouleauAPortee(p: Point, rouleaux: Rouleau[]): Rouleau | null {
  return rouleaux.find((r) => Math.hypot(r.x - p.x, r.y - p.y) <= PORTEE) ?? null;
}

/**
 * Ce qui passe devant un joueur placé derrière : le contour de chaque groupe de poteaux, à
 * repeindre par-dessus quand les pieds du joueur sont plus haut que `base`.
 */
const POTEAUX_GAUCHE: { base: number; contour: Point[] }[] = [
  {
    base: 262,
    contour: [
      { x: 368, y: 105 },
      { x: 385, y: 105 },
      { x: 385, y: 222 },
      { x: 376, y: 224 },
      { x: 376, y: 262 },
      { x: 353, y: 262 },
      { x: 353, y: 146 },
    ],
  },
  {
    base: 350,
    contour: [
      { x: 333, y: 207 },
      { x: 353, y: 200 },
      { x: 363, y: 262 },
      { x: 362, y: 292 },
      { x: 352, y: 298 },
      { x: 352, y: 350 },
      { x: 334, y: 350 },
    ],
  },
  {
    base: 412,
    contour: [
      { x: 313, y: 257 },
      { x: 334, y: 250 },
      { x: 342, y: 346 },
      { x: 336, y: 412 },
      { x: 309, y: 412 },
    ],
  },
];

export const POTEAUX = [...POTEAUX_GAUCHE, ...POTEAUX_GAUCHE.map((p) => ({ base: p.base, contour: p.contour.map(miroir) }))];

/** Le meneur de jeu : le plus petit identifiant présent. Lui seul pose les rouleaux et tient les scores. */
export const meneur = (ids: string[]): string | null => [...ids].sort()[0] ?? null;

export type EtatJeu = { rouleaux: Rouleau[]; scores: Record<string, number>; gagnant: string | null };

export const ETAT_VIDE: EtatJeu = { rouleaux: [], scores: {}, gagnant: null };

/** Le meneur compte une prise : un rouleau déjà ramassé ne compte pas deux fois. */
export function prendre(e: EtatJeu, joueur: string, rouleau: string): EtatJeu {
  if (e.gagnant || !e.rouleaux.some((r) => r.id === rouleau)) return e;
  const score = (e.scores[joueur] ?? 0) + 1;
  return { rouleaux: e.rouleaux.filter((r) => r.id !== rouleau), scores: { ...e.scores, [joueur]: score }, gagnant: score >= MANCHE ? joueur : null };
}

/** Un état reçu du canal, s'il a la bonne forme ; `ids` : les joueurs de la salle. */
export function etatLu(p: unknown, ids: ReadonlySet<string>): EtatJeu | null {
  const e = p as Partial<EtatJeu> | null;
  if (!e || !Array.isArray(e.rouleaux) || typeof e.scores !== "object" || e.scores === null) return null;
  const rouleaux = e.rouleaux.filter((r): r is Rouleau => !!r && typeof r.id === "string" && Number.isFinite(r.x) && Number.isFinite(r.y) && !estBloquee(r.x, r.y)).slice(0, ROULEAUX_MAX);
  const scores = Object.fromEntries(Object.entries(e.scores).filter(([id, n]) => ids.has(id) && Number.isFinite(n)));
  return { rouleaux, scores, gagnant: typeof e.gagnant === "string" && ids.has(e.gagnant) ? e.gagnant : null };
}

/** Le classement à afficher, du meilleur au moins bon. */
export const classement = (scores: Record<string, number>): [string, number][] => Object.entries(scores).sort((a, b) => b[1] - a[1]);
