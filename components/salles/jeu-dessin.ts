import type { Direction } from "@/lib/salles/jeu-attente";

// Les personnages du mini-jeu : peints pixel par pixel une fois par pose, puis agrandis.
// Le décor, lui, est une image (public/salles/dojo.webp).

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

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

const POSES = new Map<string, HTMLCanvasElement>();

/** Une pose du samouraï sur 16 × 16 pixels, gardée pour les images suivantes. `pas` : 0 au repos, 1 ou 2 en marchant. */
export function poseDe(direction: Direction, pas: number, echarpe: string): HTMLCanvasElement {
  const cle = `${direction}:${pas}:${echarpe}`;
  const gardee = POSES.get(cle);
  if (gardee) return gardee;
  const f = document.createElement("canvas");
  f.width = 16;
  f.height = 16;
  const c = f.getContext("2d");
  if (c) {
    const corps = direction === "bas" ? FACE : direction === "haut" ? DOS : PROFIL;
    const jambes = pas === 0 ? JAMBES.repos : pas === 1 ? JAMBES.pasA : JAMBES.pasB;
    const inverse = direction === "gauche";
    peindreLignes(c, corps, 0, 0, echarpe, inverse);
    peindreLignes(c, jambes, 0, 12, echarpe, inverse);
  }
  POSES.set(cle, f);
  return f;
}

/** Un rouleau de papier, qui flotte un peu. `k` : pixels d'image par pixel de dessin ; `t` : le temps, en secondes. */
export function peindreRouleau(c: Ctx, x: number, y: number, k: number, t: number) {
  const x0 = x - 5 * k;
  const y0 = y - 12 * k + Math.sin(t * 3 + x) * 2;
  c.fillStyle = "rgba(26, 18, 11, 0.28)";
  c.fillRect(x - 4 * k, y - k, 8 * k, k);
  c.fillStyle = "#3a2615";
  c.fillRect(x0 - k, y0, 12 * k, 8 * k);
  c.fillStyle = "#f2e6c4";
  c.fillRect(x0, y0 + k, 10 * k, 6 * k);
  c.fillStyle = "#cbb483";
  c.fillRect(x0, y0 + k, 2 * k, 6 * k);
  c.fillRect(x0 + 8 * k, y0 + k, 2 * k, 6 * k);
  c.fillStyle = "#b4371f";
  c.fillRect(x0 + 4 * k, y0, 2 * k, 8 * k);
}

const ECHARPES = ["#3f7fb5", "#3d9a6a", "#d9a23a", "#8a5fb0", "#2fa3a3", "#c7608b"];

/** La couleur de l'écharpe : le vermillon pour soi, une couleur stable pour les autres. */
export function echarpeDe(userId: string, moi: boolean): string {
  if (moi) return "#d8432a";
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ECHARPES[h % ECHARPES.length];
}
