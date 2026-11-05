// Le mini-jeu de la salle d'attente : un combat de plateforme, vu de profil. Chaque coup fait
// monter les dégâts de la cible, et plus ils sont hauts, plus elle vole loin ; qui sort de
// l'arène perd une vie. Le dash file au ras du sol ou en l'air, et son début esquive les coups.
// Le coup léger s'enchaîne : léger, suite, final, ou le coup fort pour conclure. Rien en base : chaque joueur simule son personnage et envoie sa
// position sur un canal Realtime (components/salles/JeuAttente). Ce module ne garde que les
// règles, sans navigateur, pour les tester. `x`, `y` : le milieu des pieds.

export const LARGEUR = 1024;
export const HAUTEUR = 572;

export const VIES = 3;
const GRAVITE = 1900;
const CHUTE_MAX = 900;
const CHUTE_RAPIDE = 1250;
const COURSE = 300;
const ACCELERATION = 2600;
const FREIN_AU_SOL = 2400;
const SAUT = -745;
const SAUT_EN_L_AIR = -660;
const SAUTS = 2;
const INVINCIBLE = 2;
const DASH_VITESSE = 820;
export const DASH_S = 0.16;
/** Au début du dash, on passe à travers les coups. */
const DASH_ESQUIVE = 0.1;
const DASH_RECHARGE = 0.6;
/** Combien de temps une touche de coup reste en mémoire pendant le coup précédent. */
const TAMPON_S = 0.18;
/** Le petit pas qui accompagne un coup enchaîné, pour rester au contact de la cible. */
const ELAN = 260;
/** Au-delà, c'est la sortie de l'arène. */
const MARGE = 140;
const MARGE_HAUT = 260;

export type Plateforme = { x: number; y: number; l: number; traversable: boolean };

/** Calées sur la peinture (public/salles/arene.webp) : la grande estrade et les trois planches. */
export const PLATEFORMES: Plateforme[] = [
  { x: 158, y: 340, l: 708, traversable: false },
  { x: 212, y: 210, l: 168, traversable: true },
  { x: 646, y: 210, l: 168, traversable: true },
  { x: 436, y: 100, l: 154, traversable: true },
];

export type TypeCoup = "leger" | "suite" | "final" | "fort";

/** En secondes : quand le coup touche, quand on peut rejouer, et combien de temps la cible reste sonnée. */
export const COUPS: Record<TypeCoup, { debut: number; fin: number; total: number; portee: number; hauteur: number; degats: number; base: number; croissance: number; etourdi: number }> = {
  leger: { debut: 0.06, fin: 0.16, total: 0.3, portee: 64, hauteur: 54, degats: 6, base: 170, croissance: 1.8, etourdi: 0.24 },
  suite: { debut: 0.05, fin: 0.15, total: 0.3, portee: 68, hauteur: 56, degats: 7, base: 190, croissance: 2, etourdi: 0.28 },
  final: { debut: 0.1, fin: 0.22, total: 0.48, portee: 80, hauteur: 62, degats: 12, base: 360, croissance: 6.5, etourdi: 0.16 },
  fort: { debut: 0.2, fin: 0.32, total: 0.56, portee: 80, hauteur: 62, degats: 15, base: 380, croissance: 7.5, etourdi: 0.16 },
};

export type Combattant = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sol: boolean;
  sauts: number;
  dir: 1 | -1;
  degats: number;
  vies: number;
  /** le coup en cours et son temps écoulé */
  coup: { type: TypeCoup; t: number } | null;
  /** la touche de coup gardée en mémoire, jouée dès que l'enchaînement le permet */
  tampon: { type: TypeCoup; reste: number } | null;
  etourdi: number;
  invincible: number;
  /** le temps de dash restant, l'attente avant le suivant, et le dash en l'air encore disponible */
  dash: number;
  recharge: number;
  dashAir: boolean;
};

/** `saut`, `dash`, `leger`, `fort` : vrais à l'image où la touche vient d'être enfoncée. */
export type Entrees = { gauche: boolean; droite: boolean; bas: boolean; saut: boolean; dash: boolean; leger: boolean; fort: boolean };

export const SANS_ENTREE: Entrees = { gauche: false, droite: false, bas: false, saut: false, dash: false, leger: false, fort: false };

const REAPPARITIONS = [240, 784, 512, 335, 689];

/** Où un joueur apparaît : des places différentes selon son rang dans la salle. */
export function nouveauCombattant(rang: number): Combattant {
  const x = REAPPARITIONS[rang % REAPPARITIONS.length];
  return { x, y: 330, vx: 0, vy: 0, sol: false, sauts: SAUTS, dir: x < LARGEUR / 2 ? 1 : -1, degats: 0, vies: VIES, coup: null, tampon: null, etourdi: 0, invincible: INVINCIBLE, dash: 0, recharge: 0, dashAir: true };
}

export const elimine = (f: Combattant) => f.vies <= 0;

export const horsArene = (f: Pick<Combattant, "x" | "y">) => f.x < -MARGE || f.x > LARGEUR + MARGE || f.y > HAUTEUR + MARGE || f.y < -MARGE_HAUT;

/** Le coup qu'on peut lancer maintenant : le coup voulu à froid, la suite une fois le coup en cours passé. */
function coupSuivant(coup: Combattant["coup"], voulu: TypeCoup): TypeCoup | null {
  if (!coup) return voulu;
  if (coup.type === "fort" || coup.type === "final" || coup.t <= COUPS[coup.type].fin) return null;
  if (voulu === "fort") return "fort";
  return coup.type === "leger" ? "suite" : "final";
}

/** Une image de jeu : renvoie le combattant suivant, sans toucher à l'ancien. */
export function avancer(avant: Combattant, e: Entrees, dt: number): Combattant {
  const f = { ...avant };
  f.invincible = Math.max(0, f.invincible - dt);
  f.etourdi = Math.max(0, f.etourdi - dt);
  f.recharge = Math.max(0, f.recharge - dt);
  if (f.dash > 0) {
    f.dash = Math.max(0, f.dash - dt);
    if (f.dash === 0) f.vx = Math.max(-COURSE, Math.min(COURSE, f.vx));
  }
  if (f.coup) {
    const t = f.coup.t + dt;
    f.coup = t >= COUPS[f.coup.type].total ? null : { ...f.coup, t };
  }

  const libre = f.etourdi === 0;
  const sens = libre ? Number(e.droite) - Number(e.gauche) : 0;
  // un dash part à tout moment, sauf pendant que le coup porte : il sert aussi à annuler la fin d'un coup
  if (libre && e.dash && f.recharge === 0 && (f.sol || f.dashAir) && (!f.coup || f.coup.t > COUPS[f.coup.type].fin)) {
    if (sens !== 0) f.dir = sens > 0 ? 1 : -1;
    if (!f.sol) f.dashAir = false;
    f.dash = DASH_S;
    f.recharge = DASH_RECHARGE;
    f.coup = null;
    f.vx = f.dir * DASH_VITESSE;
    f.vy = 0;
  }
  if (f.dash > 0) {
    // lancé, on ne dirige plus rien
  } else if (sens !== 0) {
    if (!f.coup) f.dir = sens > 0 ? 1 : -1;
    f.vx += sens * ACCELERATION * dt;
    f.vx = Math.max(-COURSE, Math.min(COURSE, f.vx));
  } else if (f.sol) {
    const frein = FREIN_AU_SOL * dt;
    f.vx = Math.abs(f.vx) <= frein ? 0 : f.vx - Math.sign(f.vx) * frein;
  }

  if (libre && e.saut && f.sauts > 0) {
    f.vy = f.sol ? SAUT : SAUT_EN_L_AIR;
    f.sauts -= 1;
    f.sol = false;
    f.dash = 0;
    f.vx = Math.max(-COURSE, Math.min(COURSE, f.vx));
  }

  const voulu: TypeCoup | null = e.fort ? "fort" : e.leger ? "leger" : null;
  if (voulu) f.tampon = { type: voulu, reste: TAMPON_S };
  else if (f.tampon) f.tampon = f.tampon.reste > dt ? { ...f.tampon, reste: f.tampon.reste - dt } : null;
  const suivant = libre && f.tampon ? coupSuivant(f.coup, f.tampon.type) : null;
  if (suivant) {
    const enchaine = f.coup !== null;
    f.coup = { type: suivant, t: 0 };
    f.tampon = null;
    if (enchaine) {
      if (sens !== 0) f.dir = sens > 0 ? 1 : -1;
      if (f.sol && f.dash === 0) f.vx = f.dir * ELAN;
    }
  }

  if (f.dash === 0) f.vy = Math.min(e.bas && libre && !f.sol ? CHUTE_RAPIDE : CHUTE_MAX, f.vy + GRAVITE * dt);
  const y0 = f.y;
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  f.sol = false;
  if (f.vy >= 0) {
    for (const p of PLATEFORMES) {
      const dedans = f.x >= p.x && f.x <= p.x + p.l;
      if (dedans && y0 <= p.y + 1 && f.y >= p.y && !(p.traversable && e.bas)) {
        f.y = p.y;
        f.vy = 0;
        f.sol = true;
        f.sauts = SAUTS;
        f.dashAir = true;
        break;
      }
    }
  }

  if (horsArene(f)) {
    const place = nouveauCombattant(2);
    return { ...place, y: 120, sol: false, dir: f.dir, vies: f.vies - 1 };
  }
  return f;
}

/** Le coup porte-t-il en ce moment ? */
export function coupActif(f: Combattant): boolean {
  if (!f.coup) return false;
  const c = COUPS[f.coup.type];
  return f.coup.t >= c.debut && f.coup.t <= c.fin;
}

/** Le coup de `a` atteint-il `b` ? */
export function touche(a: Pick<Combattant, "x" | "y" | "dir" | "coup">, b: Pick<Combattant, "x" | "y">): boolean {
  if (!a.coup) return false;
  const c = COUPS[a.coup.type];
  const devant = (b.x - a.x) * a.dir;
  return devant > -14 && devant < c.portee + 18 && Math.abs(a.y - b.y) < c.hauteur;
}

/** Ce que reçoit la cible : plus elle a de dégâts, plus elle vole loin. */
export function subir(f: Combattant, type: TypeCoup, dir: 1 | -1): Combattant {
  if (f.invincible > 0 || f.dash > DASH_S - DASH_ESQUIVE) return f;
  const c = COUPS[type];
  const degats = f.degats + c.degats;
  const force = c.base + degats * c.croissance;
  return { ...f, degats, vx: dir * force * 0.8, vy: -force * 0.62, sol: false, coup: null, tampon: null, dash: 0, etourdi: c.etourdi + degats * 0.002 };
}

/** La manche : vide tant qu'elle se joue ; sinon le dernier debout. `null` en jeu solo. */
export function dernierDebout(joueurs: { id: string; vies: number }[]): string | null {
  if (joueurs.length < 2) return null;
  const debout = joueurs.filter((j) => j.vies > 0);
  return debout.length === 1 ? debout[0].id : null;
}

/** Le meneur de jeu : le plus petit identifiant présent. Lui seul décide de la fin de la manche. */
export const meneur = (ids: string[]): string | null => [...ids].sort()[0] ?? null;
