// La disposition d'un profil : l'ordre des blocs sous l'en-tête, leur
// largeur (toute la ligne, ou une demi-ligne côte à côte), ceux qu'on
// masque, et les médias du joueur : ses images et sa vidéo (un edit court,
// type TikTok, enregistré sur son téléphone), ou des GIF choisis dans la
// banque KLIPY (affichés depuis son serveur).
// Images et vidéos sont envoyées par le navigateur dans deux buckets
// publics (`profil-medias`, `profil-videos`), dans le dossier du joueur ;
// la base borne le poids de chaque fichier, les types permis et le nombre
// de fichiers par joueur (migration_profil_medias.sql). Le serveur revalide
// tout à l'écriture et supprime les fichiers qui ne servent plus.
// Module neutre (client et serveur).

import { URL_KLIPY } from "@/lib/profil/gifs";

export type Largeur = "plein" | "demi";

export const BLOCS = [
  { k: "vitrine", nom: "Chiffres clés", demi: true },
  { k: "radar", nom: "Radar des matières", demi: true },
  { k: "amis", nom: "Amis", demi: true },
  { k: "reponses", nom: "Questions répondues", demi: false },
  { k: "trophees", nom: "Trophées", demi: false },
  { k: "progression", nom: "Progression", demi: false },
] as const;
export type CleBloc = (typeof BLOCS)[number]["k"];

export type BlocFixe = { k: CleBloc; w: Largeur };
export type BlocMedia = {
  k: "media";
  id: string;
  type: "image" | "video";
  url: string;
  /** largeur / hauteur, pour réserver la place avant le chargement */
  ratio: number;
  legende: string | null;
  w: Largeur;
  /** « klipy » : un GIF de la banque, servi par KLIPY (sinon : envoyé par le joueur) */
  source?: "klipy";
  /** largeur réelle en pixels (GIF de la banque, souvent petits : pas trop agrandis) */
  px?: number;
};
export type Bloc = BlocFixe | BlocMedia;
export type Disposition = Bloc[];

export const DISPOSITION_DEFAUT: Disposition = BLOCS.map((b) => ({ k: b.k, w: "plein" }));

export const BUCKET_MEDIAS = "profil-medias";
export const BUCKET_VIDEOS = "profil-videos";
/** médias sur la page (images, GIF, vidéo) */
export const MEDIAS_MAX = 6;
/** poids d'une image envoyée (la base refuse au-delà) */
export const MEDIA_MAX_OCTETS = 8 * 1024 * 1024;
/** la vidéo : une par page, une minute et 30 Mo au plus (la base refuse au-delà de 30 Mo) */
export const VIDEOS_MAX = 1;
export const VIDEO_MAX_SECONDES = 60;
export const VIDEO_MAX_OCTETS = 30 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const LEGENDE_MAX = 80;
/** côté le plus long d'une image, après réduction dans le navigateur */
export const IMAGE_MAX_PX = 2400;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_IMAGE = /[.](jpe?g|png|webp|gif)$/i;
const EXT_VIDEO = /[.](mp4|mov|webm)$/i;

export const estMedia = (b: Bloc): b is BlocMedia => b.k === "media";
export const estGif = (b: BlocMedia) => b.source === "klipy" || /[.]gif$/i.test(b.url);
export const estVideo = (b: Bloc) => estMedia(b) && b.type === "video";
export const infoBloc = (k: CleBloc) => BLOCS.find((b) => b.k === k)!;
/** Un bloc peut-il se mettre en demi-largeur ? (les médias : toujours) */
export const peutDemi = (b: Bloc) => estMedia(b) || infoBloc(b.k).demi;

/** Une légende : une ligne, sans caractères de contrôle, 80 caractères. */
export function nettoyerLegende(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LEGENDE_MAX);
  return s || null;
}

const bornerRatio = (r: unknown) => {
  const n = Number(r);
  return Number.isFinite(n) && n > 0 ? Math.max(0.25, Math.min(4, Math.round(n * 1000) / 1000)) : 16 / 9;
};

/** Les adresses publiques des dossiers du joueur (images, vidéos). */
export type Prefixes = { images: string; videos: string };

/**
 * Valide une disposition : blocs connus (une fois chacun), largeur permise,
 * médias venus des dossiers du joueur (`prefixes` ; null : aucun envoi
 * accepté ; « lecture » : relu de la base, déjà vérifié à l'écriture, seul
 * le bucket est contrôlé) ou GIF de la banque KLIPY (adresse en klipy.com) ;
 * six médias au plus, dont une vidéo.
 */
export function validerDisposition(raw: unknown, prefixes: Prefixes | null | "lecture"): { disposition: Disposition; refus: string[] } {
  const refus: string[] = [];
  const out: Disposition = [];
  const vus = new Set<string>();
  let medias = 0;
  let videos = 0;
  let mediaRefuse = false;
  for (const x of Array.isArray(raw) ? raw.slice(0, 24) : []) {
    if (!x || typeof x !== "object") continue;
    const b = x as Record<string, unknown>;
    const w: Largeur = b.w === "demi" ? "demi" : "plein";
    if (b.k === "media") {
      const id = typeof b.id === "string" && /^[a-z0-9]{6,24}$/.test(b.id) ? b.id : null;
      const type = b.type === "image" ? "image" : b.type === "video" ? "video" : null;
      const url = typeof b.url === "string" ? b.url.trim() : "";
      const klipy = type === "image" && URL_KLIPY.test(url);
      const bucket = type === "video" ? BUCKET_VIDEOS : BUCKET_MEDIAS;
      const dossierOk =
        klipy ||
        (prefixes === "lecture"
          ? new RegExp(`^https:[/][/][^/]+[/]storage[/]v1[/]object[/]public[/]${bucket}[/]`).test(url)
          : !!prefixes && url.startsWith(type === "video" ? prefixes.videos : prefixes.images));
      const ok =
        id && type && dossierOk && url.length <= 500 && /^[A-Za-z0-9:/._%-]+$/.test(url) && (type === "video" ? EXT_VIDEO : EXT_IMAGE).test(url) && !vus.has("m:" + id);
      if (!ok || medias >= MEDIAS_MAX || (type === "video" && videos >= VIDEOS_MAX)) {
        mediaRefuse = true;
        continue;
      }
      vus.add("m:" + id);
      medias++;
      if (type === "video") videos++;
      const px = Math.round(Number(b.px));
      out.push({
        k: "media",
        id,
        type,
        url,
        ratio: bornerRatio(b.ratio),
        legende: nettoyerLegende(b.legende),
        w,
        ...(klipy ? { source: "klipy" as const, ...(px >= 16 && px <= 4000 ? { px } : {}) } : {}),
      });
      continue;
    }
    const info = BLOCS.find((i) => i.k === b.k);
    if (!info || vus.has(info.k)) continue;
    vus.add(info.k);
    out.push({ k: info.k, w: info.demi ? w : "plein" });
  }
  if (mediaRefuse) refus.push("un ou plusieurs médias");
  return { disposition: out, refus };
}

/**
 * La disposition lue en base. Sans disposition enregistrée : celle par
 * défaut (sans le radar si le joueur l'avait masqué, comme avant).
 */
export function dispositionDepuis(raw: unknown, radar: boolean): Disposition {
  if (Array.isArray(raw)) return validerDisposition(raw, "lecture").disposition;
  return radar ? DISPOSITION_DEFAUT : DISPOSITION_DEFAUT.filter((b) => b.k !== "radar");
}

/** Un identifiant de média (minuscules et chiffres). */
export const nouvelId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
