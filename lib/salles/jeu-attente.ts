// Le mini-jeu de la salle d'attente : la cour du dojo, vue de dessus. Chacun promène son
// samouraï et ramasse les rouleaux ; le premier à MANCHE en gagne la manche. Rien en base :
// les positions et les scores passent par un canal Realtime (components/salles/JeuAttente).
// Ce module ne garde que les règles, sans navigateur, pour les tester.

export const TUILE = 16;

/** T arbre, H dojo, R rocher et ~ eau bloquent ; le reste se traverse. */
export const CARTE = [
  "TTTTTTTTTTTTTTT",
  "T..f....HHH...T",
  "T.......HHH.f.T",
  "T..~~.....=...T",
  "T..~~..=====..T",
  "T.f....=...R..T",
  "T......=....f.T",
  "TTTTTTTTTTTTTTT",
];

export const COLONNES = CARTE[0].length;
export const LIGNES = CARTE.length;
export const LARGEUR = COLONNES * TUILE;
export const HAUTEUR = LIGNES * TUILE;

/** Pixels de carte par seconde. */
export const VITESSE = 62;
export const ROULEAUX_MAX = 3;
/** Les rouleaux à ramasser pour gagner la manche. */
export const MANCHE = 10;
/** La distance à laquelle les pieds du joueur ramassent un rouleau. */
const PORTEE = 11;
/** La demi-largeur et la demi-hauteur de la place que prennent les pieds. */
const PIEDS_X = 5;
const PIEDS_Y = 3;

const BLOQUANT = new Set(["T", "H", "R", "~"]);

export type Direction = "bas" | "haut" | "gauche" | "droite";
export type Point = { x: number; y: number };
export type Rouleau = { id: string; c: number; l: number };

export const estBloquee = (x: number, y: number): boolean => {
  const c = Math.floor(x / TUILE);
  const l = Math.floor(y / TUILE);
  if (l < 0 || l >= LIGNES || c < 0 || c >= COLONNES) return true;
  return BLOQUANT.has(CARTE[l][c]);
};

/** Les pieds tiennent-ils ici ? `p` : le milieu des pieds. */
const libre = (p: Point) =>
  !estBloquee(p.x - PIEDS_X, p.y - PIEDS_Y) && !estBloquee(p.x + PIEDS_X, p.y - PIEDS_Y) && !estBloquee(p.x - PIEDS_X, p.y + PIEDS_Y) && !estBloquee(p.x + PIEDS_X, p.y + PIEDS_Y);

/** Un pas : chaque axe à part, pour glisser le long d'un obstacle au lieu de s'y coller. */
export function avancer(p: Point, dx: number, dy: number, dt: number): Point {
  const n = Math.hypot(dx, dy);
  if (n === 0) return p;
  const pas = (VITESSE * dt) / n;
  const enX = { x: p.x + dx * pas, y: p.y };
  const apresX = libre(enX) ? enX : p;
  const enY = { x: apresX.x, y: apresX.y + dy * pas };
  return libre(enY) ? enY : apresX;
}

/** Vers où regarde un joueur qui se déplace ainsi. */
export function directionDe(dx: number, dy: number, avant: Direction): Direction {
  if (dx === 0 && dy === 0) return avant;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "droite" : "gauche";
  return dy > 0 ? "bas" : "haut";
}

const CASES_LIBRES: { c: number; l: number }[] = CARTE.flatMap((ligne, l) => [...ligne].flatMap((t, c) => (BLOQUANT.has(t) ? [] : [{ c, l }])));

/** Où un joueur apparaît : une case libre qui dépend de lui, pour ne pas s'empiler. */
export function depart(userId: string): Point {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const k = CASES_LIBRES[h % CASES_LIBRES.length];
  return { x: k.c * TUILE + TUILE / 2, y: k.l * TUILE + TUILE / 2 };
}

/** Une case libre pour un nouveau rouleau, loin des rouleaux déjà posés ; `hasard` : entre 0 et 1. */
export function caseDeRouleau(rouleaux: Rouleau[], hasard: number): { c: number; l: number } | null {
  const prises = new Set(rouleaux.map((r) => `${r.c}:${r.l}`));
  const cases = CASES_LIBRES.filter((k) => !prises.has(`${k.c}:${k.l}`));
  return cases.length ? cases[Math.min(cases.length - 1, Math.floor(hasard * cases.length))] : null;
}

export const centreDe = (r: Rouleau): Point => ({ x: r.c * TUILE + TUILE / 2, y: r.l * TUILE + TUILE / 2 });

/** Le rouleau à portée de ces pieds, s'il y en a un. */
export function rouleauAPortee(p: Point, rouleaux: Rouleau[]): Rouleau | null {
  return rouleaux.find((r) => Math.hypot(centreDe(r).x - p.x, centreDe(r).y - p.y) <= PORTEE) ?? null;
}

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
  const rouleaux = e.rouleaux
    .filter((r): r is Rouleau => !!r && typeof r.id === "string" && Number.isInteger(r.c) && Number.isInteger(r.l) && r.l >= 0 && r.l < LIGNES && r.c >= 0 && r.c < COLONNES)
    .slice(0, ROULEAUX_MAX);
  const scores = Object.fromEntries(Object.entries(e.scores).filter(([id, n]) => ids.has(id) && Number.isFinite(n)));
  return { rouleaux, scores, gagnant: typeof e.gagnant === "string" && ids.has(e.gagnant) ? e.gagnant : null };
}

/** Le classement à afficher, du meilleur au moins bon. */
export const classement = (scores: Record<string, number>): [string, number][] => Object.entries(scores).sort((a, b) => b[1] - a[1]);
