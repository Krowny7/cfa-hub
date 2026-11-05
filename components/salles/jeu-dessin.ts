import { HAUTEUR, LARGEUR, PLATEFORMES } from "@/lib/salles/jeu-combat";

type Direction = "bas" | "haut" | "gauche" | "droite";

// Le dessin du mini-jeu, en attendant la peinture de l'arène et les vrais sprites : les
// personnages sont peints pixel par pixel une fois par pose, l'arène à chaque image.

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

/** L'arène : un fond d'encre et des plateformes de bois. */
export function peindreArene(c: Ctx) {
  const ciel = c.createLinearGradient(0, 0, 0, HAUTEUR);
  ciel.addColorStop(0, "#2a1d13");
  ciel.addColorStop(1, "#120d09");
  c.fillStyle = ciel;
  c.fillRect(-20, -20, LARGEUR + 40, HAUTEUR + 40);
  for (const p of PLATEFORMES) {
    const h = p.traversable ? 12 : 44;
    c.fillStyle = "#6b4a2f";
    c.fillRect(p.x, p.y, p.l, h);
    c.fillStyle = "#94693f";
    c.fillRect(p.x, p.y, p.l, 5);
    c.fillStyle = "#3a2615";
    c.fillRect(p.x, p.y + h - 4, p.l, 4);
  }
}

const ECHARPES = ["#3f7fb5", "#3d9a6a", "#d9a23a", "#8a5fb0", "#2fa3a3", "#c7608b"];

/** La couleur de l'écharpe : le vermillon pour soi, une couleur stable pour les autres. */
export function echarpeDe(userId: string, moi: boolean): string {
  if (moi) return "#d8432a";
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ECHARPES[h % ECHARPES.length];
}
