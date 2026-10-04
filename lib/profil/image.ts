// Préparer une image du joueur avant l'envoi (bannière, média du profil),
// dans le navigateur. Une image déjà raisonnable (JPEG, PNG ou WebP, pas
// trop lourde, pas trop grande) part telle quelle : aucune perte. Sinon elle
// est réduite (lissage haute qualité) puis encodée en WebP (repli JPEG si le
// navigateur ne sait pas écrire le WebP), à une qualité élevée.
// Les tailles visent les écrans larges et denses : une bannière couvre
// toute la largeur de l'écran (1 920 px × 1,5 = 2 880 pixels réels).

export class ImageIllisible extends Error {}

const TELLE_QUELLE = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function preparerImage(
  file: File,
  { maxLargeur, maxHauteur, maxOctetsTelleQuelle = 3 * 1024 * 1024, qualite = 0.92 }: { maxLargeur: number; maxHauteur: number; maxOctetsTelleQuelle?: number; qualite?: number },
): Promise<{ blob: Blob; ext: string; contentType: string; ratio: number }> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new ImageIllisible("illisible");
  }
  const { width: w, height: h } = bmp;
  const ratio = w / h;
  if (TELLE_QUELLE.includes(file.type) && file.size <= maxOctetsTelleQuelle && w <= maxLargeur && h <= maxHauteur) {
    bmp.close();
    return { blob: file, ext: EXT[file.type], contentType: file.type, ratio };
  }
  const k = Math.min(1, maxLargeur / w, maxHauteur / h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const encoder = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, qualite));
  let blob = await encoder("image/webp");
  if (!blob || blob.type !== "image/webp") {
    // pas de WebP : JPEG, sur fond blanc (la transparence n'y existe pas)
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blob = await encoder("image/jpeg");
  }
  bmp.close();
  if (!blob) throw new Error("encodage");
  const contentType = blob.type === "image/webp" ? "image/webp" : "image/jpeg";
  return { blob, ext: EXT[contentType], contentType, ratio };
}
