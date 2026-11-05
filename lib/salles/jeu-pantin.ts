// Le pantin du mini-jeu : un squelette animé par le code, sans aucune image. Chaque image, on
// calcule la pose voulue selon ce que fait le combattant (repos, course, saut, chute, coup,
// coup reçu), on s'en rapproche en douceur, puis les genoux et les coudes se placent tout seuls
// entre le bassin, les pieds et les mains. L'écharpe suit derrière, en vraie chaîne souple.
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

/** Ce qu'il faut savoir d'un combattant pour l'animer. */
export type Vue = Pick<Combattant, "x" | "y" | "vx" | "vy" | "sol" | "dir" | "coup" | "etourdi">;

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
  echarpe: Maillon[];
  reste: number;
  trace: Trace[];
};

type Maillon = { x: number; y: number; px: number; py: number };

/** Ce qui vient de se passer, pour la poussière et les éclats. */
export type Evenements = { atterri: number; decolle: boolean; pas: boolean };

const CUISSE = 18;
const TIBIA = 19;
const BRAS = 13;
const AVANT_BRAS = 14;
const DOS = 22;
export const RAYON_TETE = 12.5;
export const LAME = 50;

const MAILLONS = 8;
const LONGUEUR_MAILLON = 8;
const PAS_ECHARPE = 1 / 60;
export const VIE_TRACE = 0.13;
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
    hanche: { x: -1, y: -31.5 + souffle * 0.9 },
    buste: 0.14 + souffle * 0.012,
    tete: -0.1,
    piedAvant: { x: 13, y: 0 },
    piedArriere: { x: -13, y: 0 },
    mainAvant: { x: 13, y: 11 + souffle * 0.6 },
    mainArriere: { x: 15, y: 15 + souffle * 0.6 },
    sabre: -0.72 + souffle * 0.025,
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
    sabre: -2.72 + balance * 0.06,
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
    mainAvant: { x: 4, y: 8 },
    mainArriere: { x: 13, y: 5 },
    sabre: -2.3,
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

/** Le coup en cours, posé sur ce que fait déjà le corps : on arme, on frappe, on revient. */
export function frappe(base: Pose, type: TypeCoup, t: number, sol: boolean): Pose {
  const c = COUPS[type];
  const fort = type === "fort";
  const arme: Pose = {
    ...base,
    buste: fort ? -0.34 : 0.02,
    tete: fort ? 0.14 : 0,
    mainAvant: fort ? { x: -8, y: -19 } : { x: 4, y: -16 },
    mainArriere: fort ? { x: -3, y: -17 } : { x: 8, y: -11 },
    sabre: fort ? -3.75 : -1.95,
    ...(sol ? { hanche: { x: fort ? -7 : -2, y: fort ? -27.5 : -30 }, piedArriere: { x: fort ? -17 : -14, y: 0 } } : {}),
  };
  const coup: Pose = {
    ...base,
    buste: fort ? 0.82 : 0.5,
    tete: fort ? -0.62 : -0.4,
    mainAvant: fort ? { x: 25, y: 10 } : { x: 25, y: 4 },
    mainArriere: fort ? { x: 21, y: 15 } : { x: -13, y: 9 },
    sabre: fort ? 0.98 : 0.42,
    ...(sol ? { hanche: { x: fort ? 13 : 7, y: fort ? -26 : -29 }, piedAvant: { x: fort ? 34 : 24, y: 0 }, piedArriere: { x: fort ? -16 : -13, y: 0 } } : {}),
  };
  const tenue = fort ? 0.09 : 0.03;
  if (t < c.debut) return melanger(base, arme, lisse(t / c.debut));
  if (t < c.fin) return melanger(arme, coup, sec((t - c.debut) / (c.fin - c.debut)));
  if (t < c.fin + tenue) return coup;
  return melanger(coup, base, lisse((t - c.fin - tenue) / (c.total - c.fin - tenue)));
}

function cible(p: Pantin, e: Vue): Pose {
  if (e.etourdi > 0) return touche(e.vx * e.dir > 0 ? -1 : 1);
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
  const { hanche, buste, tete } = pose;
  const sx = Math.sin(buste);
  const sy = -Math.cos(buste);
  const cou = { x: hanche.x + sx * DOS, y: hanche.y + sy * DOS };
  const haut = { x: cou.x - sx * 3, y: cou.y - sy * 3 };
  const epauleAvant = { x: haut.x + 2.5, y: haut.y };
  const epauleArriere = { x: haut.x - 2.5, y: haut.y };
  const angleTete = buste + tete;
  const centreTete = { x: cou.x + Math.sin(angleTete) * (RAYON_TETE - 1), y: cou.y - Math.cos(angleTete) * (RAYON_TETE - 1) };
  const bras = plier(epauleAvant, { x: epauleAvant.x + pose.mainAvant.x, y: epauleAvant.y + pose.mainAvant.y }, BRAS, AVANT_BRAS, 1);
  const autre = plier(epauleArriere, { x: epauleArriere.x + pose.mainArriere.x, y: epauleArriere.y + pose.mainArriere.y }, BRAS, AVANT_BRAS, 1);
  const jambe = plier({ x: hanche.x + 3, y: hanche.y }, pose.piedAvant, CUISSE, TIBIA, -1);
  const seconde = plier({ x: hanche.x - 3, y: hanche.y }, pose.piedArriere, CUISSE, TIBIA, -1);
  const dirLame = { x: Math.cos(pose.sabre), y: Math.sin(pose.sabre) };
  const garde = { x: bras.fin.x + dirLame.x * 4, y: bras.fin.y + dirLame.y * 4 };
  const bout = { x: bras.fin.x + dirLame.x * LAME, y: bras.fin.y + dirLame.y * LAME };

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
    face,
  };
}

function poserEcharpe(s: Squelette): Maillon[] {
  return Array.from({ length: MAILLONS }, (_, i) => {
    const x = s.cou.x - s.face * i * LONGUEUR_MAILLON;
    return { x, y: s.cou.y + i * 2, px: x, py: s.cou.y + i * 2 };
  });
}

export function nouveauPantin(e: Pick<Vue, "x" | "y" | "dir">): Pantin {
  const pose = repos(0);
  const squelette = squeletteDe(pose, e.x, e.y, e.dir, 0);
  return { base: pose, pose, squelette, face: e.dir, temps: 0, foulee: 0, tour: 0, salto: 0, atterrissage: 0, flash: 0, solAvant: true, vyAvant: 0, xAvant: e.x, yAvant: e.y, coupAvant: -1, echarpe: poserEcharpe(squelette), reste: 0, trace: [] };
}

/** L'écharpe : chaque maillon garde son élan, le vent la soulève, et la longueur ne bouge pas. */
function agiterEcharpe(p: Pantin, dt: number) {
  const ancre = p.squelette.cou;
  p.reste += dt;
  while (p.reste >= PAS_ECHARPE) {
    p.reste -= PAS_ECHARPE;
    const vent = -p.face * (300 + Math.sin(p.temps * 3.1) * 110);
    const leve = Math.sin(p.temps * 4.3) * 60;
    for (let i = 1; i < p.echarpe.length; i++) {
      const m = p.echarpe[i];
      const vx = (m.x - m.px) * 0.95;
      const vy = (m.y - m.py) * 0.95;
      m.px = m.x;
      m.py = m.y;
      m.x += vx + vent * PAS_ECHARPE * PAS_ECHARPE;
      m.y += vy + (270 + leve * (i / MAILLONS)) * PAS_ECHARPE * PAS_ECHARPE;
    }
    p.echarpe[0].x = ancre.x;
    p.echarpe[0].y = ancre.y;
    for (let passe = 0; passe < 3; passe++) {
      for (let i = 1; i < p.echarpe.length; i++) {
        const a = p.echarpe[i - 1];
        const b = p.echarpe[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const ecart = (d - LONGUEUR_MAILLON) / d;
        b.x -= dx * ecart;
        b.y -= dy * ecart;
      }
    }
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

  const raideur = e.etourdi > 0 ? 40 : e.sol ? (Math.abs(e.vx) > 40 ? 48 : 24) : 16;
  p.base = melanger(p.base, cible(p, e), 1 - Math.exp(-raideur * dt));

  const coup = e.coup;
  const avantCoup = coup && p.coupAvant >= 0 && p.coupAvant <= coup.t ? p.coupAvant : (coup?.t ?? 0);
  let pose = coup ? frappe(p.base, coup.type, coup.t, e.sol) : p.base;
  if (p.atterrissage > 0 && !coup) {
    const k = lisse(p.atterrissage);
    pose = { ...pose, hanche: { x: pose.hanche.x, y: pose.hanche.y + 8 * k }, etire: pose.etire * (1 - 0.13 * k), buste: pose.buste + 0.2 * k, piedAvant: { x: pose.piedAvant.x + 3 * k, y: pose.piedAvant.y }, piedArriere: { x: pose.piedArriere.x - 3 * k, y: pose.piedArriere.y } };
  }
  p.pose = pose;
  p.squelette = squeletteDe(pose, e.x, e.y, p.face, p.tour);

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
    p.echarpe = poserEcharpe(p.squelette);
    p.trace = [];
    p.tour = 0;
  } else agiterEcharpe(p, dt);

  p.flash = Math.max(0, p.flash - dt);
  p.solAvant = e.sol;
  p.vyAvant = e.vy;
  p.xAvant = e.x;
  p.yAvant = e.y;
  return ev;
}
