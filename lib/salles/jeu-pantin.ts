// Le pantin du mini-jeu : un squelette animé par le code, sans aucune image. Chaque image, on
// calcule la pose voulue selon ce que fait le combattant (repos, course, saut, chute, coup,
// coup reçu), on s'en rapproche en douceur, puis les genoux et les coudes se placent tout seuls
// entre le bassin, les pieds et les mains. Les pans de l'écharpe suivent, en chaînes souples.
// Les proportions sont celles des personnages des peintures : un adulte de six têtes.
// Ce module ne dessine rien : il sort des points, components/salles/jeu-dessin les peint.
// Repère local : le personnage regarde vers +x, y descend, l'origine est entre ses pieds.

import { COUPS, type Combattant, type TypeCoup } from "@/lib/salles/jeu-combat";

export type Point = { x: number; y: number };

export type Pose = {
  hanche: Point;
  /** penché en avant quand c'est positif */
  buste: number;
  tete: number;
  piedAvant: Point;
  piedArriere: Point;
  /** les mains, depuis l'épaule */
  mainAvant: Point;
  mainArriere: Point;
  /** l'angle de la lame : 0 devant, -π/2 vers le haut */
  sabre: number;
  /** 1 au repos, moins quand le corps s'écrase, plus quand il s'étire */
  etire: number;
};

export type PortFourreau = "hanche" | "dos" | "travers";

/** Ce qu'il faut savoir d'un combattant pour l'animer. */
export type Vue = Pick<Combattant, "x" | "y" | "vx" | "vy" | "sol" | "dir" | "coup" | "etourdi" | "dash">;

export type Squelette = {
  hanche: Point;
  cou: Point;
  tete: Point;
  /** l'inclinaison de la tête à l'écran */
  angleTete: number;
  epauleAvant: Point;
  epauleArriere: Point;
  coudeAvant: Point;
  coudeArriere: Point;
  mainAvant: Point;
  mainArriere: Point;
  genouAvant: Point;
  genouArriere: Point;
  piedAvant: Point;
  piedArriere: Point;
  /** la garde et le bout du sabre */
  garde: Point;
  bout: Point;
  /** les deux bouts du fourreau, selon où il est porté */
  fourreau: Record<PortFourreau, [Point, Point]>;
  /** de quel côté regarde le pantin : de -1 à 1, il se retourne en une fraction de seconde */
  face: number;
};

/** Un morceau de la trace laissée par la lame : le bord extérieur et le bord intérieur. */
export type Trace = { bx: number; by: number; ix: number; iy: number; age: number; type: TypeCoup };

export type Pantin = {
  base: Pose;
  pose: Pose;
  squelette: Squelette;
  face: number;
  temps: number;
  /** où en est la foulée */
  foulee: number;
  /** la rotation de tout le corps (salto, coup reçu) */
  tour: number;
  salto: number;
  atterrissage: number;
  /** le temps restant du flash quand on reçoit un coup */
  flash: number;
  solAvant: boolean;
  vyAvant: number;
  xAvant: number;
  yAvant: number;
  coupAvant: number;
  /** les pans de l'écharpe, du plus long au plus court */
  pans: Maillon[][];
  reste: number;
  trace: Trace[];
  /** la pose d'où l'on repart quand un coup est enchaîné ou annulé, et le temps de ce raccord */
  relais: Pose | null;
  relaisT: number;
  /** les silhouettes laissées derrière soi pendant un dash */
  sillage: { s: Squelette; age: number }[];
  sillageT: number;
};

type Maillon = { x: number; y: number; px: number; py: number };

/** Ce qui vient de se passer, pour la poussière et les éclats. */
export type Evenements = { atterri: number; decolle: boolean; pas: boolean };

const CUISSE = 20;
const TIBIA = 21.5;
const BRAS = 14;
const AVANT_BRAS = 15;
const DOS = 27;
/** Les poses sont écrites pour des jambes plus courtes : on les agrandit au moment de les poser. */
const JAMBES = 1.12;
export const RAYON_TETE = 6.8;
export const LAME = 50;

const MAILLONS = [8, 6];
const LONGUEUR_MAILLON = 8;
const PAS_ECHARPE = 1 / 60;
/** La force qui ramène un maillon sur sa ligne : plus elle est faible, plus l'écharpe traîne. */
const RAPPEL = 0.2;
export const VIE_TRACE = 0.13;
export const VIE_SILLAGE = 0.2;
const SILLAGE_PAS = 0.026;
const RELAIS_S = 0.07;
const SALTO_S = 0.36;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lisse = (u: number) => {
  const k = clamp(u, 0, 1);
  return k * k * (3 - 2 * k);
};
/** Rapide au début, posé à la fin : la lame part d'un coup. */
const sec = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 3;
const mixN = (a: number, b: number, k: number) => a + (b - a) * k;
const mixP = (a: Point, b: Point, k: number): Point => ({ x: mixN(a.x, b.x, k), y: mixN(a.y, b.y, k) });

export function melanger(a: Pose, b: Pose, k: number): Pose {
  return {
    hanche: mixP(a.hanche, b.hanche, k),
    buste: mixN(a.buste, b.buste, k),
    tete: mixN(a.tete, b.tete, k),
    piedAvant: mixP(a.piedAvant, b.piedAvant, k),
    piedArriere: mixP(a.piedArriere, b.piedArriere, k),
    mainAvant: mixP(a.mainAvant, b.mainAvant, k),
    mainArriere: mixP(a.mainArriere, b.mainArriere, k),
    sabre: mixN(a.sabre, b.sabre, k),
    etire: mixN(a.etire, b.etire, k),
  };
}

/** La garde : les pieds écartés, le sabre devant, à deux mains. Le corps respire. */
function repos(temps: number): Pose {
  const souffle = Math.sin(temps * 2.3);
  return {
    hanche: { x: 1, y: -30 + souffle * 0.9 },
    buste: 0.14 + souffle * 0.012,
    tete: -0.1,
    piedAvant: { x: 16, y: 0 },
    piedArriere: { x: -21, y: 0 },
    mainAvant: { x: 20, y: 14 + souffle * 0.6 },
    mainArriere: { x: 20, y: 19 + souffle * 0.6 },
    sabre: -0.78 + souffle * 0.025,
    etire: 1,
  };
}

/** Un pied dans la foulée : il se lève en repartant vers l'avant. */
function pied(phase: number): Point {
  const leve = Math.max(0, Math.sin(phase));
  return { x: -Math.cos(phase) * 17 + 2, y: -leve * 11 };
}

/** La course : le sabre traîne derrière, l'autre bras balance, le corps plonge vers l'avant. */
function course(foulee: number, vitesse: number): Pose {
  const k = clamp(vitesse / 300, 0, 1);
  const balance = Math.sin(foulee);
  return {
    hanche: { x: 3 * k, y: -30.5 - Math.abs(Math.cos(foulee)) * 2.6 },
    buste: 0.2 + 0.34 * k,
    tete: -0.28 * k,
    piedAvant: pied(foulee),
    piedArriere: pied(foulee + Math.PI),
    mainAvant: { x: -9 - balance * 2, y: 15 },
    mainArriere: { x: 7 + balance * 11, y: 13 - balance * 3 },
    sabre: 2.85 + balance * 0.06,
    etire: 1,
  };
}

function monte(vy: number): Pose {
  return {
    hanche: { x: 0, y: -33 },
    buste: 0.16,
    tete: -0.2,
    piedAvant: { x: 11, y: -15 },
    piedArriere: { x: -9, y: -3 },
    mainAvant: { x: 13, y: 10 },
    mainArriere: { x: 17, y: 12 },
    sabre: -0.72,
    etire: 1 + Math.min(0.1, -vy / 6500),
  };
}

function tombe(vy: number): Pose {
  return {
    hanche: { x: 0, y: -35 },
    buste: 0.04,
    tete: 0.12,
    piedAvant: { x: 10, y: -7 },
    piedArriere: { x: -11, y: -2 },
    mainAvant: { x: 12, y: -3 },
    mainArriere: { x: -13, y: -6 },
    sabre: -0.95,
    etire: 1 + Math.min(0.08, vy / 9000),
  };
}

/** Le coup reçu : `recul` à 1 quand il part dans le dos, à -1 quand on le pousse vers l'avant. */
function touche(recul: number): Pose {
  return {
    hanche: { x: 0, y: -33 },
    buste: -0.6 * recul,
    tete: -0.55 * recul,
    piedAvant: { x: 15 * recul, y: -8 },
    piedArriere: { x: 7 * recul, y: -13 },
    mainAvant: { x: 15 * recul, y: -13 },
    mainArriere: { x: 9 * recul, y: -16 },
    sabre: -0.2,
    etire: 1,
  };
}

/** Le dash : tout le corps part devant, ras du sol, et la lame traîne derrière. */
function fonce(): Pose {
  return {
    hanche: { x: 7, y: -25 },
    buste: 1.02,
    tete: -0.85,
    piedAvant: { x: 27, y: -1 },
    piedArriere: { x: -31, y: -7 },
    mainAvant: { x: -15, y: 9 },
    mainArriere: { x: -20, y: 5 },
    sabre: 2.75,
    etire: 1.04,
  };
}

/** Chaque coup : la pose armée, la pose frappée, ce que font les jambes au sol, et le temps tenu. */
const GESTES: Record<TypeCoup, { arme: Partial<Pose>; coup: Partial<Pose>; solArme: Partial<Pose>; solCoup: Partial<Pose>; tenue: number }> = {
  leger: {
    arme: { buste: 0.02, tete: 0, mainAvant: { x: 4, y: -16 }, mainArriere: { x: 8, y: -11 }, sabre: -1.95 },
    coup: { buste: 0.5, tete: -0.4, mainAvant: { x: 25, y: 4 }, mainArriere: { x: -13, y: 9 }, sabre: 0.42 },
    solArme: { hanche: { x: -2, y: -30 }, piedArriere: { x: -14, y: 0 } },
    solCoup: { hanche: { x: 7, y: -29 }, piedAvant: { x: 24, y: 0 }, piedArriere: { x: -13, y: 0 } },
    tenue: 0.03,
  },
  // le revers : la lame remonte d'où elle vient
  suite: {
    arme: { buste: 0.36, tete: -0.2, mainAvant: { x: 20, y: 6 }, mainArriere: { x: -10, y: 8 }, sabre: 0.7 },
    coup: { buste: 0.12, tete: -0.1, mainAvant: { x: 19, y: -17 }, mainArriere: { x: -12, y: 4 }, sabre: -1.25 },
    solArme: { hanche: { x: 5, y: -28.5 }, piedAvant: { x: 22, y: 0 }, piedArriere: { x: -13, y: 0 } },
    solCoup: { hanche: { x: 3, y: -31 }, piedAvant: { x: 18, y: 0 }, piedArriere: { x: -15, y: 0 } },
    tenue: 0.03,
  },
  // la pointe, de tout le corps
  final: {
    arme: { buste: -0.22, tete: 0.1, mainAvant: { x: 4, y: -21 }, mainArriere: { x: 9, y: -17 }, sabre: -2.5 },
    coup: { buste: 0.72, tete: -0.6, mainAvant: { x: 30, y: -2 }, mainArriere: { x: -16, y: 8 }, sabre: 0.04 },
    solArme: { hanche: { x: -6, y: -27 }, piedArriere: { x: -18, y: 0 } },
    solCoup: { hanche: { x: 16, y: -25 }, piedAvant: { x: 38, y: 0 }, piedArriere: { x: -20, y: 0 } },
    tenue: 0.08,
  },
  fort: {
    arme: { buste: -0.34, tete: 0.14, mainAvant: { x: 11, y: -22 }, mainArriere: { x: 15, y: -19 }, sabre: -2.75 },
    coup: { buste: 0.82, tete: -0.62, mainAvant: { x: 25, y: 10 }, mainArriere: { x: 21, y: 15 }, sabre: 0.98 },
    solArme: { hanche: { x: -7, y: -27.5 }, piedArriere: { x: -17, y: 0 } },
    solCoup: { hanche: { x: 13, y: -26 }, piedAvant: { x: 34, y: 0 }, piedArriere: { x: -16, y: 0 } },
    tenue: 0.09,
  },
};

/** Le coup en cours, posé sur ce que fait déjà le corps : on arme, on frappe, on revient. */
export function frappe(base: Pose, type: TypeCoup, t: number, sol: boolean): Pose {
  const c = COUPS[type];
  const g = GESTES[type];
  const arme: Pose = { ...base, ...g.arme, ...(sol ? g.solArme : {}) };
  const coup: Pose = { ...base, ...g.coup, ...(sol ? g.solCoup : {}) };
  const tenue = g.tenue;
  if (t < c.debut) return melanger(base, arme, lisse(t / c.debut));
  if (t < c.fin) return melanger(arme, coup, sec((t - c.debut) / (c.fin - c.debut)));
  if (t < c.fin + tenue) return coup;
  return melanger(coup, base, lisse((t - c.fin - tenue) / (c.total - c.fin - tenue)));
}

function cible(p: Pantin, e: Vue): Pose {
  if (e.etourdi > 0) return touche(e.vx * e.dir > 0 ? -1 : 1);
  if (e.dash > 0) return fonce();
  if (!e.sol) return e.vy < 0 ? monte(e.vy) : tombe(e.vy);
  const vitesse = Math.abs(e.vx);
  return melanger(repos(p.temps), course(p.foulee, vitesse), lisse(vitesse / 110));
}

/** Le coude ou le genou entre deux points, et le bout réellement atteint si c'est trop loin. */
function plier(a: Point, b: Point, l1: number, l2: number, sens: number): { joint: Point; fin: Point } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const brut = Math.hypot(dx, dy) || 0.001;
  const d = clamp(brut, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const ux = dx / brut;
  const uy = dy / brut;
  const le = (l1 * l1 + d * d - l2 * l2) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - le * le));
  return { joint: { x: a.x + ux * le - uy * h * sens, y: a.y + uy * le + ux * h * sens }, fin: { x: a.x + ux * d, y: a.y + uy * d } };
}

/** Les points du corps à l'écran, pour une pose. */
export function squeletteDe(pose: Pose, x: number, y: number, face: number, tour: number): Squelette {
  const { buste, tete } = pose;
  const hanche = { x: pose.hanche.x * JAMBES, y: pose.hanche.y * JAMBES };
  const piedAvant = { x: pose.piedAvant.x * JAMBES, y: pose.piedAvant.y * JAMBES };
  const piedArriere = { x: pose.piedArriere.x * JAMBES, y: pose.piedArriere.y * JAMBES };
  const sx = Math.sin(buste);
  const sy = -Math.cos(buste);
  const cou = { x: hanche.x + sx * DOS, y: hanche.y + sy * DOS };
  const haut = { x: cou.x - sx * 3, y: cou.y - sy * 3 };
  const epauleAvant = { x: haut.x + 3.5, y: haut.y };
  const epauleArriere = { x: haut.x - 3.5, y: haut.y };
  const angleTete = buste + tete;
  const centreTete = { x: cou.x + Math.sin(angleTete) * (RAYON_TETE + 1), y: cou.y - Math.cos(angleTete) * (RAYON_TETE + 1) };
  const bras = plier(epauleAvant, { x: epauleAvant.x + pose.mainAvant.x, y: epauleAvant.y + pose.mainAvant.y }, BRAS, AVANT_BRAS, 1);
  const autre = plier(epauleArriere, { x: epauleArriere.x + pose.mainArriere.x, y: epauleArriere.y + pose.mainArriere.y }, BRAS, AVANT_BRAS, 1);
  const jambe = plier({ x: hanche.x + 3, y: hanche.y }, piedAvant, CUISSE, TIBIA, -1);
  const seconde = plier({ x: hanche.x - 3, y: hanche.y }, piedArriere, CUISSE, TIBIA, -1);
  const dirLame = { x: Math.cos(pose.sabre), y: Math.sin(pose.sabre) };
  const garde = { x: bras.fin.x + dirLame.x * 4, y: bras.fin.y + dirLame.y * 4 };
  const bout = { x: bras.fin.x + dirLame.x * LAME, y: bras.fin.y + dirLame.y * LAME };
  // les fourreaux suivent le buste : ils partent de la taille, ou barrent le dos
  const taille = { x: hanche.x + sx * 5, y: hanche.y + sy * 5 };
  const penche = (angle: number, l: number, depuis: Point): Point => ({ x: depuis.x + Math.cos(angle) * l, y: depuis.y + Math.sin(angle) * l });
  const incline = buste * 0.6;

  const cosT = Math.cos(tour);
  const sinT = Math.sin(tour);
  const large = 1 / pose.etire;
  const ecran = (p: Point): Point => {
    const rx = p.x - hanche.x;
    const ry = p.y - hanche.y;
    const lx = hanche.x + rx * cosT - ry * sinT;
    const ly = hanche.y + rx * sinT + ry * cosT;
    return { x: x + lx * large * face, y: y + ly * pose.etire };
  };
  const a = angleTete + tour;
  return {
    hanche: ecran(hanche),
    cou: ecran(cou),
    tete: ecran(centreTete),
    angleTete: face >= 0 ? a : -a,
    epauleAvant: ecran(epauleAvant),
    epauleArriere: ecran(epauleArriere),
    coudeAvant: ecran(bras.joint),
    coudeArriere: ecran(autre.joint),
    mainAvant: ecran(bras.fin),
    mainArriere: ecran(autre.fin),
    genouAvant: ecran(jambe.joint),
    genouArriere: ecran(seconde.joint),
    piedAvant: ecran(jambe.fin),
    piedArriere: ecran(seconde.fin),
    garde: ecran(garde),
    bout: ecran(bout),
    fourreau: {
      hanche: [ecran(penche(Math.PI - 0.5 + incline, -5, taille)), ecran(penche(Math.PI - 0.5 + incline, 32, taille))],
      travers: [ecran(penche(Math.PI - 0.12 + incline, -6, taille)), ecran(penche(Math.PI - 0.12 + incline, 30, taille))],
      dos: [ecran(penche(-2.2 + buste, 32, taille)), ecran(penche(-2.2 + buste, -13, taille))],
    },
    face,
  };
}

function poserEcharpe(s: Squelette): Maillon[][] {
  return MAILLONS.map((n, pan) =>
    Array.from({ length: n }, (_, i) => {
      const x = s.cou.x - s.face * i * LONGUEUR_MAILLON;
      const y = s.cou.y + i * (2 + pan * 2);
      return { x, y, px: x, py: y };
    }),
  );
}

export function nouveauPantin(e: Pick<Vue, "x" | "y" | "dir">): Pantin {
  const pose = repos(0);
  const squelette = squeletteDe(pose, e.x, e.y, e.dir, 0);
  return { base: pose, pose, squelette, face: e.dir, temps: 0, foulee: 0, tour: 0, salto: 0, atterrissage: 0, flash: 0, solAvant: true, vyAvant: 0, xAvant: e.x, yAvant: e.y, coupAvant: -1, pans: poserEcharpe(squelette), reste: 0, trace: [], relais: null, relaisT: 0, sillage: [], sillageT: 0 };
}

/**
 * L'écharpe : chaque maillon garde son élan, mais il est rappelé vers une ligne qui file derrière
 * le personnage en ondulant, comme les pans des peintures. La longueur, elle, ne bouge jamais.
 */
function agiterEcharpe(p: Pantin, dt: number) {
  const ancre = p.squelette.cou;
  const arriere = p.face >= 0 ? -1 : 1;
  p.reste += dt;
  while (p.reste >= PAS_ECHARPE) {
    p.reste -= PAS_ECHARPE;
    p.pans.forEach((chaine, pan) => {
      const decale = p.temps + pan * 1.3;
      const n = chaine.length;
      chaine[0].x = ancre.x;
      chaine[0].y = ancre.y;
      for (let i = 1; i < n; i++) {
        const m = chaine[i];
        const a = chaine[i - 1];
        const vx = (m.x - m.px) * 0.9;
        const vy = (m.y - m.py) * 0.9;
        m.px = m.x;
        m.py = m.y;
        m.x += vx;
        m.y += vy;
        const angle = -0.17 + pan * 0.37 + Math.sin(decale * 5.2 - i * 0.75) * (0.16 + (0.3 * i) / n);
        m.x += (a.x + arriere * Math.cos(angle) * LONGUEUR_MAILLON - m.x) * RAPPEL;
        m.y += (a.y + Math.sin(angle) * LONGUEUR_MAILLON - m.y) * RAPPEL;
      }
      for (let passe = 0; passe < 3; passe++) {
        for (let i = 1; i < n - 1; i++) {
          const a = chaine[i - 1];
          const b = chaine[i];
          const c = chaine[i + 1];
          b.x += ((a.x + c.x) / 2 - b.x) * 0.25;
          b.y += ((a.y + c.y) / 2 - b.y) * 0.25;
        }
        for (let i = 1; i < n; i++) {
          const a = chaine[i - 1];
          const b = chaine[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const ecart = (d - LONGUEUR_MAILLON) / d;
          b.x -= dx * ecart;
          b.y -= dy * ecart;
        }
      }
    });
  }
}

/** Une image d'animation. Renvoie ce qui vient de se passer, pour les effets autour du corps. */
export function animer(p: Pantin, e: Vue, dt: number): Evenements {
  const ev: Evenements = { atterri: 0, decolle: false, pas: false };
  p.temps += dt;
  const teleporte = Math.hypot(e.x - p.xAvant, e.y - p.yAvant) > 170;

  if (e.sol) {
    const avant = Math.floor(p.foulee / Math.PI);
    p.foulee += (Math.abs(e.vx) / 14) * dt;
    ev.pas = Math.abs(e.vx) > 120 && Math.floor(p.foulee / Math.PI) !== avant;
  }
  if (e.sol && !p.solAvant) {
    ev.atterri = Math.max(0, p.vyAvant);
    p.atterrissage = clamp(ev.atterri / 620, 0.35, 1);
    p.salto = 0;
  }
  if (!e.sol && p.solAvant && e.vy < 0) ev.decolle = true;
  if (!e.sol && !p.solAvant && e.etourdi === 0 && e.vy < -300 && e.vy < p.vyAvant - 200) p.salto = 1;
  p.atterrissage = Math.max(0, p.atterrissage - dt / 0.15);

  const face = 1 - Math.exp(-34 * dt);
  p.face += (e.dir - p.face) * face;
  if (Math.abs(p.face) < 0.12) p.face = 0.12 * e.dir;

  // la rotation : un salto au deuxième saut, une vrille sur les gros coups, puis on se rétablit
  if (p.salto > 0) {
    p.salto = Math.max(0, p.salto - dt / SALTO_S);
    p.tour = sec(1 - p.salto) * Math.PI * 2;
    if (p.salto === 0) p.tour = 0;
  } else if (e.etourdi > 0 && Math.hypot(e.vx, e.vy) > 620) {
    p.tour += dt * 11 * (e.vx * e.dir > 0 ? 1 : -1);
  } else {
    const proche = Math.round(p.tour / (Math.PI * 2)) * Math.PI * 2;
    p.tour = proche + (p.tour - proche) * Math.exp(-16 * dt);
    if (Math.abs(p.tour - proche) < 0.01) p.tour = 0;
  }

  const raideur = e.dash > 0 ? 70 : e.etourdi > 0 ? 40 : e.sol ? (Math.abs(e.vx) > 40 ? 48 : 24) : 16;
  p.base = melanger(p.base, cible(p, e), 1 - Math.exp(-raideur * dt));

  const coup = e.coup;
  const avantCoup = coup && p.coupAvant >= 0 && p.coupAvant <= coup.t ? p.coupAvant : (coup?.t ?? 0);
  let pose = coup ? frappe(p.base, coup.type, coup.t, e.sol) : p.base;
  // un coup enchaîné ou annulé : on repart de la pose où l'on était, sans saut d'image
  if (p.coupAvant >= 0 && (!coup || coup.t < p.coupAvant)) {
    p.relais = p.pose;
    p.relaisT = RELAIS_S;
  }
  if (p.atterrissage > 0 && !coup) {
    const k = lisse(p.atterrissage);
    pose = { ...pose, hanche: { x: pose.hanche.x, y: pose.hanche.y + 8 * k }, etire: pose.etire * (1 - 0.13 * k), buste: pose.buste + 0.2 * k, piedAvant: { x: pose.piedAvant.x + 3 * k, y: pose.piedAvant.y }, piedArriere: { x: pose.piedArriere.x - 3 * k, y: pose.piedArriere.y } };
  }
  if (p.relais && p.relaisT > 0) {
    pose = melanger(p.relais, pose, 1 - p.relaisT / RELAIS_S);
    p.relaisT = Math.max(0, p.relaisT - dt);
  }
  p.pose = pose;
  p.squelette = squeletteDe(pose, e.x, e.y, p.face, p.tour);

  for (const m of p.sillage) m.age += dt;
  p.sillage = p.sillage.filter((m) => m.age < VIE_SILLAGE);
  if (e.dash > 0 && p.temps - p.sillageT >= SILLAGE_PAS) {
    p.sillage.push({ s: p.squelette, age: 0 });
    p.sillageT = p.temps;
  }

  // la trace de la lame, en plusieurs points par image pour qu'elle reste une courbe
  for (const m of p.trace) m.age += dt;
  p.trace = p.trace.filter((m) => m.age < VIE_TRACE);
  if (coup) {
    const c = COUPS[coup.type];
    const de = Math.max(avantCoup, c.debut);
    const a = Math.min(coup.t, c.fin + 0.015);
    if (a > de) {
      for (let i = 1; i <= 5; i++) {
        const t = de + ((a - de) * i) / 5;
        const s = squeletteDe(frappe(p.base, coup.type, t, e.sol), e.x, e.y, p.face, p.tour);
        p.trace.push({ bx: s.bout.x, by: s.bout.y, ix: mixN(s.garde.x, s.bout.x, 0.6), iy: mixN(s.garde.y, s.bout.y, 0.6), age: (a - t) * 0.6, type: coup.type });
      }
    }
  }
  p.coupAvant = coup ? coup.t : -1;

  if (teleporte) {
    p.pans = poserEcharpe(p.squelette);
    p.trace = [];
    p.sillage = [];
    p.tour = 0;
  } else agiterEcharpe(p, dt);

  p.flash = Math.max(0, p.flash - dt);
  p.solAvant = e.sol;
  p.vyAvant = e.vy;
  p.xAvant = e.x;
  p.yAvant = e.y;
  return ev;
}
