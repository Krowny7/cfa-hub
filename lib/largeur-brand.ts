// Largeur des lettres de la police des grands titres (« Dela Gothic One »,
// classe font-brand), en em, mesurée une fois sur le canevas du navigateur.
// Sert aux titres qui doivent tenir sur une ligne dans une colonne dont on ne
// connaît la largeur qu'à l'affichage : taille = place disponible / largeur du
// texte (unités cqi, voir CarteLieu). Les lettres inconnues comptent pour 0,8.
const T: Record<string, number> = {
  "0": 0.91, "1": 0.58, "2": 0.83, "3": 0.88, "4": 0.92, "5": 0.88, "6": 0.85, "7": 0.77, "8": 0.87, "9": 0.85,
  a: 0.74, b: 0.74, c: 0.7, d: 0.73, e: 0.72, f: 0.47, g: 0.74, h: 0.69, i: 0.34, j: 0.32, k: 0.74, l: 0.31, m: 1.09, n: 0.69, o: 0.73, p: 0.73, q: 0.73, r: 0.57, s: 0.7, t: 0.51, u: 0.69, v: 0.69, w: 0.88, x: 0.68, y: 0.69, z: 0.67,
  A: 0.94, B: 0.89, C: 0.94, D: 0.89, E: 0.86, F: 0.86, G: 0.91, H: 0.91, I: 0.66, J: 0.88, K: 0.91, L: 0.8, M: 1.09, N: 0.91, O: 0.97, P: 0.88, Q: 0.97, R: 0.88, S: 0.92, T: 0.93, U: 0.92, V: 0.9, W: 1.09, X: 0.88, Y: 0.94, Z: 0.86,
  é: 0.72, è: 0.72, ê: 0.72, ë: 0.72, à: 0.74, â: 0.74, î: 0.34, ï: 0.34, ô: 0.73, ù: 0.69, û: 0.69, ü: 0.69, ç: 0.7, É: 0.86, À: 0.94,
  " ": 0.2, "'": 0.29, "’": 0.29, ".": 0.27, ",": 0.27, "·": 0.29, "-": 0.49, ":": 0.27, "!": 0.3, "?": 0.76, "«": 0.79, "»": 0.75, "&": 0.77, "/": 0.49, "(": 0.35, ")": 0.35,
};

/** Largeur d'un texte en em (font-brand), avec 3 % de marge. */
export function largeurBrand(texte: string): number {
  let w = 0;
  for (const c of texte) w += T[c] ?? 0.8;
  return Math.max(w, 1) * 1.03;
}

/**
 * Taille (valeur de font-size) d'un titre font-brand qui tient sur une ligne :
 * au plus 1em (la taille portée par le bloc parent), moins si la colonne est
 * trop étroite, sans descendre sous 0,6em (au-delà, c'est au texte de se
 * tronquer : un pseudo de 20 lettres ne doit pas devenir minuscule). Le parent
 * doit être un conteneur (@container) ; `--m` donne la place prise par la
 * pastille devant le titre. `largeur` : largeur en em, si le texte n'est pas
 * une simple chaîne.
 */
export function tailleBrand(texte: string | number): string {
  const w = typeof texte === "number" ? texte : largeurBrand(texte);
  return `max(0.6em, min(1em, calc((100cqi - var(--m, 0px)) / ${w.toFixed(2)})))`;
}
