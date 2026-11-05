import { HAUTEUR, LARGEUR } from "@/lib/salles/jeu-combat";

// Le grand spectacle des combos, peint par-dessus le combat : volontairement exagéré, comme
// une image d'impact de film d'animation. Rien ici ne touche aux règles du jeu.

type Ctx = CanvasRenderingContext2D;

export type Effet =
  | { sorte: "lignes"; x: number; y: number; vie: number; max: number }
  | { sorte: "taille"; x: number; y: number; angle: number; vie: number; max: number }
  | { sorte: "onde"; x: number; y: number; r: number; couleur: string; vie: number; max: number }
  | { sorte: "titre"; texte: string; vie: number; max: number }
  | { sorte: "note"; x: number; y: number; glyphe: string; couleur: string; vie: number; max: number };

const ROUGE = "#d8432a";
const CREME = "#fff6e4";

/** Les lignes de vitesse : elles convergent vers l'impact depuis les bords de l'écran. */
function peindreLignes(c: Ctx, e: Extract<Effet, { sorte: "lignes" }>) {
  const k = e.vie / e.max;
  const trou = 150 + (1 - k) * 170;
  c.fillStyle = `rgba(7, 6, 10, ${0.86 * Math.min(1, k * 2)})`;
  c.beginPath();
  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * Math.PI * 2 + Math.random() * 0.1;
    const debut = trou + Math.random() * 130;
    const large = 0.006 + Math.random() * 0.02;
    c.moveTo(e.x + Math.cos(a) * debut, e.y + Math.sin(a) * debut);
    c.lineTo(e.x + Math.cos(a - large) * 1400, e.y + Math.sin(a - large) * 1400);
    c.lineTo(e.x + Math.cos(a + large) * 1400, e.y + Math.sin(a + large) * 1400);
    c.closePath();
  }
  c.fill();
}

/** Une entaille qui traverse tout l'écran : elle jaillit, puis s'affine. */
function peindreTaille(c: Ctx, e: Extract<Effet, { sorte: "taille" }>) {
  const u = 1 - e.vie / e.max;
  const long = 1250 * Math.min(1, u * 5);
  const epais = 58 * (1 - u) ** 1.4;
  const lame = (k: number) => {
    c.beginPath();
    c.moveTo(-long / 2, 0);
    c.quadraticCurveTo(0, -epais * k, long / 2, 0);
    c.quadraticCurveTo(0, epais * k * 0.22, -long / 2, 0);
    c.closePath();
    c.fill();
  };
  c.save();
  c.translate(e.x, e.y);
  c.rotate(e.angle);
  c.fillStyle = ROUGE;
  lame(1);
  c.fillStyle = CREME;
  lame(0.55);
  c.restore();
}

function peindreOnde(c: Ctx, e: Extract<Effet, { sorte: "onde" }>) {
  const u = 1 - e.vie / e.max;
  c.strokeStyle = e.couleur;
  c.globalAlpha = 1 - u;
  c.lineWidth = 16 * (1 - u) + 1;
  c.beginPath();
  c.arc(e.x, e.y, e.r * (1 - (1 - u) ** 3), 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 1;
}

/** Le titre géant : il s'écrase sur l'écran, tremble, et s'en va. */
function peindreTitre(c: Ctx, e: Extract<Effet, { sorte: "titre" }>, police: string) {
  const u = 1 - e.vie / e.max;
  const entree = Math.min(1, u / 0.1);
  const echelle = 1 + (1 - entree) * 2.2 + Math.sin(Math.min(1, u / 0.22) * Math.PI) * 0.14;
  const tremble = u < 0.3 ? (Math.random() - 0.5) * 7 : 0;
  c.save();
  c.globalAlpha = Math.min(1, e.vie / 0.22);
  c.translate(LARGEUR / 2 + tremble, 128 + tremble);
  c.rotate(-0.07);
  c.scale(echelle, echelle);
  // le coup de pinceau sous le texte
  c.fillStyle = "#08070b";
  c.beginPath();
  c.moveTo(-330, -44);
  c.quadraticCurveTo(0, -66, 348, -38);
  c.lineTo(318, -8);
  c.lineTo(352, 12);
  c.lineTo(322, 44);
  c.quadraticCurveTo(0, 62, -344, 40);
  c.lineTo(-312, 12);
  c.lineTo(-352, -8);
  c.closePath();
  c.fill();
  c.font = `400 76px ${police}, system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = ROUGE;
  c.fillText(e.texte, 5, 6);
  c.fillStyle = "#f6c64e";
  c.fillText(e.texte, 0, 0);
  c.restore();
  c.textBaseline = "alphabetic";
}

function peindreNote(c: Ctx, e: Extract<Effet, { sorte: "note" }>) {
  const u = 1 - e.vie / e.max;
  c.globalAlpha = Math.min(1, e.vie / 0.3);
  c.font = "700 24px system-ui, sans-serif";
  c.textAlign = "center";
  c.lineWidth = 4;
  c.strokeStyle = "rgba(8, 7, 11, 0.8)";
  const x = e.x + Math.sin(u * 9) * 9;
  const y = e.y - u * 62;
  c.strokeText(e.glyphe, x, y);
  c.fillStyle = e.couleur;
  c.fillText(e.glyphe, x, y);
  c.globalAlpha = 1;
}

/** Ce qui vit dans le décor et suit la caméra. */
export function peindreEffetsScene(c: Ctx, liste: Effet[]) {
  for (const e of liste) {
    if (e.sorte === "onde") peindreOnde(c, e);
    else if (e.sorte === "taille") peindreTaille(c, e);
    else if (e.sorte === "note") peindreNote(c, e);
  }
}

/** Ce qui se pose sur l'écran. */
export function peindreEffetsEcran(c: Ctx, liste: Effet[], police: string) {
  for (const e of liste) {
    if (e.sorte === "lignes") peindreLignes(c, e);
    else if (e.sorte === "titre") peindreTitre(c, e, police);
  }
}

/** L'image d'impact : tout l'écran bascule, une étoile éclate derrière les combattants. */
export function peindreFondImpact(c: Ctx, x: number, y: number, noir: boolean) {
  c.fillStyle = noir ? "#07060a" : ROUGE;
  c.fillRect(0, 0, LARGEUR, HAUTEUR);
  c.fillStyle = noir ? ROUGE : CREME;
  c.beginPath();
  const pointes = 15;
  for (let i = 0; i < pointes * 2; i++) {
    const a = (i / (pointes * 2)) * Math.PI * 2 + Math.random() * 0.05;
    const r = i % 2 === 0 ? 260 + Math.random() * 520 : 50 + Math.random() * 44;
    if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
}
