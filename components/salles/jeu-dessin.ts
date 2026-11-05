import { CARTE, COLONNES, HAUTEUR, LARGEUR, LIGNES, TUILE, type Direction } from "@/lib/salles/jeu-attente";

// Le dessin du mini-jeu : tout est peint pixel par pixel, sans image. La cour et ses arbres
// sont dessinés une fois (une image par phase de l'eau), les sprites à chaque image.

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const HERBE = ["#8fc06b", "#84b662", "#9bca76"];
const CHEMIN = ["#dcc79c", "#cfb887", "#e4d2ac"];
const EAU = ["#5fa8cc", "#74b9d8"];

/** Un bruit fixe : la même case garde toujours les mêmes brins d'herbe. */
const bruit = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function sol(c: Ctx, x0: number, y0: number, teintes: string[]) {
  c.fillStyle = teintes[0];
  c.fillRect(x0, y0, TUILE, TUILE);
  for (let y = 0; y < TUILE; y += 2) {
    for (let x = 0; x < TUILE; x += 2) {
      const n = bruit(x0 + x, y0 + y);
      if (n > 0.86) {
        c.fillStyle = teintes[1];
        c.fillRect(x0 + x, y0 + y, 2, 1);
      } else if (n < 0.1) {
        c.fillStyle = teintes[2];
        c.fillRect(x0 + x, y0 + y, 1, 2);
      }
    }
  }
}

function fleurs(c: Ctx, x0: number, y0: number) {
  for (const [x, y, t] of [
    [3, 4, "#f4e9c8"],
    [10, 3, "#e8836b"],
    [6, 10, "#e8836b"],
    [12, 11, "#f4e9c8"],
  ] as const) {
    c.fillStyle = t;
    c.fillRect(x0 + x, y0 + y, 2, 2);
    c.fillStyle = "#e9b949";
    c.fillRect(x0 + x, y0 + y, 1, 1);
  }
}

function eau(c: Ctx, x0: number, y0: number, phase: number) {
  c.fillStyle = EAU[0];
  c.fillRect(x0, y0, TUILE, TUILE);
  c.fillStyle = EAU[1];
  for (let y = 2; y < TUILE; y += 5) {
    const d = ((y * 3 + x0 + phase * 4) % 10) + 1;
    c.fillRect(x0 + d, y0 + y, 4, 1);
  }
}

function arbre(c: Ctx, x0: number, y0: number) {
  c.fillStyle = "#6b4a2f";
  c.fillRect(x0 + 6, y0 + 11, 4, 5);
  c.fillStyle = "#2f5a3c";
  c.fillRect(x0 + 2, y0 + 3, 12, 9);
  c.fillRect(x0 + 4, y0 + 1, 8, 12);
  c.fillStyle = "#3f7a4e";
  c.fillRect(x0 + 4, y0 + 3, 7, 6);
  c.fillStyle = "#58996a";
  c.fillRect(x0 + 5, y0 + 3, 3, 2);
}

function rocher(c: Ctx, x0: number, y0: number) {
  c.fillStyle = "#7f898d";
  c.fillRect(x0 + 2, y0 + 6, 12, 8);
  c.fillRect(x0 + 4, y0 + 4, 8, 2);
  c.fillStyle = "#a3adb0";
  c.fillRect(x0 + 4, y0 + 6, 6, 3);
}

/** Le dojo : trois cases sur deux, un toit vermillon et une porte qui donne sur le chemin. */
function dojo(c: Ctx, x0: number, y0: number) {
  const l = TUILE * 3;
  const h = TUILE * 2;
  c.fillStyle = "#efe6d2";
  c.fillRect(x0 + 3, y0 + 13, l - 6, h - 13);
  c.fillStyle = "#b4371f";
  c.fillRect(x0, y0 + 2, l, 12);
  c.fillStyle = "#8e2a17";
  c.fillRect(x0, y0 + 12, l, 2);
  c.fillStyle = "#cf5a3f";
  for (let x = 2; x < l; x += 6) c.fillRect(x0 + x, y0 + 4, 3, 1);
  c.fillStyle = "#4a3423";
  c.fillRect(x0 + l / 2 - 5, y0 + h - 12, 10, 12);
  c.fillStyle = "#6b4a2f";
  c.fillRect(x0 + 8, y0 + 18, 7, 6);
  c.fillRect(x0 + l - 15, y0 + 18, 7, 6);
}

/** La cour, sans les joueurs, pour une phase de l'eau (0 ou 1). */
export function peindreCour(c: Ctx, phase: number) {
  for (let l = 0; l < LIGNES; l++) {
    for (let k = 0; k < COLONNES; k++) {
      const t = CARTE[l][k];
      const x = k * TUILE;
      const y = l * TUILE;
      if (t === "=") sol(c, x, y, CHEMIN);
      else if (t === "~") eau(c, x, y, phase);
      else sol(c, x, y, HERBE);
      if (t === "f") fleurs(c, x, y);
      if (t === "T") arbre(c, x, y);
      if (t === "R") rocher(c, x, y);
    }
  }
  const l = CARTE.findIndex((ligne) => ligne.includes("H"));
  if (l >= 0) dojo(c, CARTE[l].indexOf("H") * TUILE, l * TUILE);
}

const TEINTES: Record<string, string> = { k: "#1b1b26", d: "#2c3142", g: "#454c63", s: "#e9bb8e", b: "#a98243" };

// Les samouraïs, de face, de dos et de profil (la gauche est le profil retourné).
// r : l'écharpe, à la couleur du joueur ; . : transparent.
const FACE = [
  ".......kk.......",
  ".....kkkkkk.....",
  "....kkkkkkkk....",
  "....kssssssk....",
  "....skssssks....",
  "....ssssssss....",
  ".....ssssss.....",
  "....rrrrrrrr....",
  "...grrrrrrrrg...",
  "...gddddddddg...",
  "...sddbbbbdds...",
  "....dddddddd....",
];
const DOS = [
  ".......kk.......",
  ".....kkkkkk.....",
  "....kkkkkkkk....",
  "....kkkkkkkk....",
  "....kkkkkkkk....",
  "....skkkkkks....",
  ".....ssssss.....",
  "....rrrrrrrr....",
  "...grrrrrrrrg...",
  "...gdddrrdddg...",
  "...sddbrrbdds...",
  "....dddddddd....",
];
const PROFIL = [
  ".....kk.........",
  ".....kkkkkk.....",
  "....kkkkkkkk....",
  "....kkkssssk....",
  "....kksssks.....",
  "....kkssssss....",
  ".....ssssss.....",
  "...rrrrrrrr.....",
  ".rrrrrrrrrrg....",
  "....gddddddg....",
  "....gddbbbdds...",
  ".....ddddddd....",
];
const JAMBES = {
  repos: ["....dd....dd....", "....kk....kk....", "................"],
  pasA: ["....dd.....dd...", "....kk.....kk...", "...........kk..."],
  pasB: ["...dd.....dd....", "...kk.....kk....", "...kk..........."],
};

function peindreLignes(c: Ctx, lignes: string[], x0: number, y0: number, echarpe: string, miroir: boolean) {
  lignes.forEach((ligne, y) => {
    for (let x = 0; x < 16; x++) {
      const t = ligne[miroir ? 15 - x : x];
      if (t === ".") continue;
      c.fillStyle = t === "r" ? echarpe : TEINTES[t];
      c.fillRect(x0 + x, y0 + y, 1, 1);
    }
  });
}

/** `x`, `y` : le milieu des pieds. `pas` : 0 au repos, 1 ou 2 en marchant. */
export function peindreSamourai(c: Ctx, x: number, y: number, direction: Direction, pas: number, echarpe: string) {
  const x0 = Math.round(x - 8);
  const y0 = Math.round(y - 14);
  c.fillStyle = "rgba(26, 18, 11, 0.22)";
  c.fillRect(x0 + 3, y0 + 13, 10, 2);
  const corps = direction === "bas" ? FACE : direction === "haut" ? DOS : PROFIL;
  const jambes = pas === 0 ? JAMBES.repos : pas === 1 ? JAMBES.pasA : JAMBES.pasB;
  const miroir = direction === "gauche";
  peindreLignes(c, corps, x0, y0 - (pas ? 1 : 0), echarpe, miroir);
  peindreLignes(c, jambes, x0, y0 + 12 - (pas ? 1 : 0), echarpe, miroir);
}

/** Un rouleau de papier, qui flotte un peu. `t` : le temps, en secondes. */
export function peindreRouleau(c: Ctx, x: number, y: number, t: number) {
  const x0 = Math.round(x - 5);
  const y0 = Math.round(y - 5 + Math.sin(t * 3 + x) * 1.2);
  c.fillStyle = "rgba(26, 18, 11, 0.2)";
  c.fillRect(Math.round(x - 4), Math.round(y + 4), 8, 1);
  c.fillStyle = "#f2e6c4";
  c.fillRect(x0, y0 + 1, 10, 6);
  c.fillStyle = "#cbb483";
  c.fillRect(x0, y0 + 1, 2, 6);
  c.fillRect(x0 + 8, y0 + 1, 2, 6);
  c.fillStyle = "#b4371f";
  c.fillRect(x0 + 4, y0, 2, 8);
}

const ECHARPES = ["#3f7fb5", "#3d9a6a", "#d9a23a", "#8a5fb0", "#2fa3a3", "#c7608b"];

/** La couleur de l'écharpe : le vermillon pour soi, une couleur stable pour les autres. */
export function echarpeDe(userId: string, moi: boolean): string {
  if (moi) return "#d8432a";
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ECHARPES[h % ECHARPES.length];
}

export const TAILLE_CARTE = { largeur: LARGEUR, hauteur: HAUTEUR };
