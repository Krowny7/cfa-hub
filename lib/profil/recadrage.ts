// Recadrage de la photo de profil, dans le navigateur : la géométrie (pure),
// le chargement de l'image (orientation EXIF respectée, réduite à 2 048 px
// pour ménager la mémoire du téléphone) et le rendu final en carré.
//
// Le cadrage se dit en « diamètres » : le cercle de recadrage mesure 1, et
// (dx, dy) est le décalage du centre de l'image par rapport au centre du
// cercle. Zoom 1 : l'image couvre juste le cercle (son petit côté = 1).
// Ainsi rien ne dépend de la taille de l'écran : l'aperçu et le rendu final
// dessinent la même chose.

export type Cadrage = { zoom: number; dx: number; dy: number };
export type SourceImage = { image: ImageBitmap | HTMLCanvasElement; w: number; h: number };

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
/** un côté de l'image chargée, au plus (pixels) */
export const COTE_MAX = 2048;
/** côté de la photo enregistrée (pixels) */
export const COTE_SORTIE = 512;
/** poids d'un fichier choisi, au plus */
export const OCTETS_MAX = 30 * 1024 * 1024;

export class PhotoIllisible extends Error {}
export class PhotoTropLourde extends Error {}

const entre = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Largeur et hauteur de l'image, en diamètres, pour ce zoom. */
export function tailleEnDiametres(w: number, h: number, zoom: number) {
  const m = Math.min(w, h);
  return { lw: (w / m) * zoom, lh: (h / m) * zoom };
}

/** Le cadrage ramené là où l'image couvre toujours le cercle. */
export function borner(c: Cadrage, w: number, h: number): Cadrage {
  const zoom = entre(c.zoom, ZOOM_MIN, ZOOM_MAX);
  const { lw, lh } = tailleEnDiametres(w, h, zoom);
  const mx = Math.max(0, (lw - 1) / 2);
  const my = Math.max(0, (lh - 1) / 2);
  return { zoom, dx: entre(c.dx, -mx, mx), dy: entre(c.dy, -my, my) };
}

/** Zoomer en gardant fixe le point (fx, fy), en diamètres depuis le centre du cercle. */
export function zoomerVers(c: Cadrage, zoom: number, fx: number, fy: number, w: number, h: number): Cadrage {
  const z = entre(zoom, ZOOM_MIN, ZOOM_MAX);
  const k = z / c.zoom;
  return borner({ zoom: z, dx: fx - (fx - c.dx) * k, dy: fy - (fy - c.dy) * k }, w, h);
}

/** Déplacer l'image de (ddx, ddy) diamètres. */
export function deplacer(c: Cadrage, ddx: number, ddy: number, w: number, h: number): Cadrage {
  return borner({ ...c, dx: c.dx + ddx, dy: c.dy + ddy }, w, h);
}

/** Le carré de l'image (en pixels de l'image) que le cercle recouvre. */
export function zoneSource(c: Cadrage, w: number, h: number) {
  const cote = Math.min(w, h) / c.zoom;
  const x = entre(w / 2 - c.dx * cote - cote / 2, 0, Math.max(0, w - cote));
  const y = entre(h / 2 - c.dy * cote - cote / 2, 0, Math.max(0, h - cote));
  return { x, y, cote };
}

/** Dessine l'image entière dans la zone d'aperçu (carré de côté `cote` px), le cercle de diamètre `diametre` px au centre. */
export function dessinerApercu(ctx: CanvasRenderingContext2D, s: SourceImage, c: Cadrage, cote: number, diametre: number) {
  ctx.clearRect(0, 0, cote, cote);
  const { lw, lh } = tailleEnDiametres(s.w, s.h, c.zoom);
  const largeur = lw * diametre;
  const hauteur = lh * diametre;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(s.image, cote / 2 + c.dx * diametre - largeur / 2, cote / 2 + c.dy * diametre - hauteur / 2, largeur, hauteur);
}

async function bitmapDe(blob: Blob): Promise<ImageBitmap> {
  try {
    // l'orientation de l'appareil photo (EXIF) est appliquée
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(blob);
    } catch {
      throw new PhotoIllisible("illisible");
    }
  }
}

/** Charge l'image (fichier, ou adresse d'une photo déjà enregistrée), orientée et réduite. */
export async function chargerSource(source: Blob | string): Promise<SourceImage> {
  let blob: Blob;
  if (typeof source === "string") {
    blob = await lireAdresse(source);
  } else {
    if (source.size > OCTETS_MAX) throw new PhotoTropLourde("lourde");
    blob = source;
  }
  const bmp = await bitmapDe(blob);
  const { width: w, height: h } = bmp;
  const k = Math.min(1, COTE_MAX / Math.max(w, h));
  if (k === 1) return { image: bmp, w, h };
  // trop grande : on la réduit une fois pour toutes, puis on libère l'originale
  const lw = Math.max(1, Math.round(w * k));
  const lh = Math.max(1, Math.round(h * k));
  const canvas = document.createElement("canvas");
  canvas.width = lw;
  canvas.height = lh;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bmp.close();
    throw new Error("canvas");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, lw, lh);
  bmp.close();
  return { image: canvas, w: lw, h: lh };
}

// Une photo déjà enregistrée : lue avec CORS (sinon le canvas serait « sali » et
// le rendu impossible). `reload` : une copie du cache faite sans CORS (la photo
// affichée dans une balise <img>) ferait échouer la lecture.
async function lireAdresse(url: string): Promise<Blob> {
  try {
    const r = await fetch(url, { mode: "cors", cache: "reload" });
    if (!r.ok) throw new Error(String(r.status));
    return await r.blob();
  } catch {
    // repli : balise <img crossOrigin="anonymous"> redessinée sur un canvas
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => ok(i);
      i.onerror = () => ko(new PhotoIllisible("cors"));
      i.src = url + (url.includes("?") ? "&" : "?") + "cors=" + Date.now();
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoIllisible("canvas");
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => {
      try {
        canvas.toBlob(r, "image/png");
      } catch {
        r(null); // canvas bloqué
      }
    });
    if (!blob) throw new PhotoIllisible("cors");
    return blob;
  }
}

export type PhotoRecadree = { blob: Blob; ext: string; contentType: string };

/** Le rendu final : carré 512 × 512, WebP (JPEG sur fond blanc si le navigateur ne sait pas écrire le WebP). */
export async function rendreCarre(s: SourceImage, c: Cadrage): Promise<PhotoRecadree> {
  const canvas = document.createElement("canvas");
  canvas.width = COTE_SORTIE;
  canvas.height = COTE_SORTIE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const z = zoneSource(c, s.w, s.h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(s.image, z.x, z.y, z.cote, z.cote, 0, 0, COTE_SORTIE, COTE_SORTIE);
  const encoder = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.88));
  let blob = await encoder("image/webp");
  if (!blob || blob.type !== "image/webp") {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, COTE_SORTIE, COTE_SORTIE);
    blob = await encoder("image/jpeg");
  }
  if (!blob) throw new Error("encodage");
  const webp = blob.type === "image/webp";
  return { blob, ext: webp ? "webp" : "jpg", contentType: webp ? "image/webp" : "image/jpeg" };
}
