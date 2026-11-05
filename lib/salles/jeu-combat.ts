// Le mini-jeu de la salle d'attente : un combat de plateforme, vu de profil. Chaque coup fait
// monter les dégâts de la cible, et plus ils sont hauts, plus elle vole loin ; qui sort de
// l'arène perd une vie. Rien en base : chaque joueur simule son personnage et envoie sa
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
const SAUT = -660;
const SAUT_EN_L_AIR = -600;
const SAUTS = 2;
const INVINCIBLE = 2;
/** Au-delà, c'est la sortie de l'arène. */
const MARGE = 140;
const MARGE_HAUT = 260;

export type Plateforme = { x: number; y: number; l: number; traversable: boolean };

export const PLATEFORMES: Plateforme[] = [
  { x: 192, y: 440, l: 640, traversable: false },
  { x: 250, y: 320, l: 170, traversable: true },
  { x: 604, y: 320, l: 170, traversable: true },
  { x: 432, y: 215, l: 160, traversable: true },
];

export type TypeCoup = "leger" | "fort";

/** En secondes : quand le coup touche, et quand on peut rejouer. */
export const COUPS: Record<TypeCoup, { debut: number; fin: number; total: number; portee: number; hauteur: number; degats: number; base: number; croissance: number }> = {
  leger: { debut: 0.06, fin: 0.16, total: 0.3, portee: 64, hauteur: 54, degats: 7, base: 240, croissance: 4.2 },
  fort: { debut: 0.2, fin: 0.32, total: 0.56, portee: 80, hauteur: 62, degats: 15, base: 380, croissance: 7.5 },
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
  etourdi: number;
  invincible: number;
};

/** `saut`, `leger`, `fort` : vrais à l'image où la touche vient d'être enfoncée. */
export type Entrees = { gauche: boolean; droite: boolean; bas: boolean; saut: boolean; leger: boolean; fort: boolean };

export const SANS_ENTREE: Entrees = { gauche: false, droite: false, bas: false, saut: false, leger: false, fort: false };

const REAPPARITIONS = [240, 784, 512, 335, 689];

/** Où un joueur apparaît : des places différentes selon son rang dans la salle. */
export function nouveauCombattant(rang: number): Combattant {
  const x = REAPPARITIONS[rang % REAPPARITIONS.length];
  return { x, y: 430, vx: 0, vy: 0, sol: false, sauts: SAUTS, dir: x < LARGEUR / 2 ? 1 : -1, degats: 0, vies: VIES, coup: null, etourdi: 0, invincible: INVINCIBLE };
}

export const elimine = (f: Combattant) => f.vies <= 0;

export const horsArene = (f: Pick<Combattant, "x" | "y">) => f.x < -MARGE || f.x > LARGEUR + MARGE || f.y > HAUTEUR + MARGE || f.y < -MARGE_HAUT;

/** Une image de jeu : renvoie le combattant suivant, sans toucher à l'ancien. */
export function avancer(avant: Combattant, e: Entrees, dt: number): Combattant {
  const f = { ...avant };
  f.invincible = Math.max(0, f.invincible - dt);
  f.etourdi = Math.max(0, f.etourdi - dt);
  if (f.coup) {
    const t = f.coup.t + dt;
    f.coup = t >= COUPS[f.coup.type].total ? null : { ...f.coup, t };
  }

  const libre = f.etourdi === 0;
  const sens = libre ? Number(e.droite) - Number(e.gauche) : 0;
  if (sens !== 0) {
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
  }
  if (libre && !f.coup && (e.leger || e.fort)) f.coup = { type: e.fort ? "fort" : "leger", t: 0 };

  f.vy = Math.min(e.bas && libre && !f.sol ? CHUTE_RAPIDE : CHUTE_MAX, f.vy + GRAVITE * dt);
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
  if (f.invincible > 0) return f;
  const c = COUPS[type];
  const degats = f.degats + c.degats;
  const force = c.base + degats * c.croissance;
  return { ...f, degats, vx: dir * force * 0.8, vy: -force * 0.62, sol: false, coup: null, etourdi: 0.16 + degats * 0.002 };
}

/** La manche : vide tant qu'elle se joue ; sinon le dernier debout. `null` en jeu solo. */
export function dernierDebout(joueurs: { id: string; vies: number }[]): string | null {
  if (joueurs.length < 2) return null;
  const debout = joueurs.filter((j) => j.vies > 0);
  return debout.length === 1 ? debout[0].id : null;
}

/** Le meneur de jeu : le plus petit identifiant présent. Lui seul décide de la fin de la manche. */
export const meneur = (ids: string[]): string | null => [...ids].sort()[0] ?? null;
