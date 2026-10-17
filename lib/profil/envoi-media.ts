// L'envoi d'un média de la page du profil (Personnaliser · Ta page), dans
// le navigateur : une image (telle quelle si elle est raisonnable, sinon
// réduite à 2 400 px sans perte visible) ; une vidéo, un edit court type
// TikTok enregistré sur son téléphone (une par page, une minute et 30 Mo au
// plus, envoyée telle quelle), dans le dossier du joueur. La base borne le
// poids, les types et le nombre de fichiers (migration_profil_medias.sql) ;
// le serveur revalide la liste à l'enregistrement et supprime les fichiers
// qui ne servent plus.
// Module client (document, URL.createObjectURL) : importé seulement par
// components/profil/EditeurPage.tsx.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ImageIllisible, preparerImage } from "@/lib/profil/image";
import {
  BUCKET_MEDIAS,
  BUCKET_VIDEOS,
  FORMAT_DEFAUT,
  IMAGE_MAX_PX,
  MEDIA_MAX_OCTETS,
  VIDEO_MAX_OCTETS,
  VIDEO_MAX_SECONDES,
  VIDEO_TYPES,
  nouvelId,
  type BlocMedia,
  type Format,
  type GenreMedia,
} from "@/lib/profil/disposition";

export const Mo = (n: number) => `${Math.round(n / (1024 * 1024))} Mo`;

/** Un refus à montrer tel quel au joueur (les autres erreurs : un message général). */
export class Refus extends Error {}

/** Proportion et durée d'une vidéo, lues dans le navigateur. */
export function lireVideo(file: File): Promise<{ duree: number; ratio: number }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const fin = () => URL.revokeObjectURL(url);
    v.onloadedmetadata = () => {
      const r = { duree: v.duration, ratio: v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 9 / 16 };
      fin();
      res(r);
    };
    v.onerror = () => {
      fin();
      rej(new Refus("Cette vidéo ne se lit pas dans ton navigateur : choisis un MP4."));
    };
    v.src = url;
  });
}

/** Une image prête à l'envoi : telle quelle, ou réduite (2 400 px au plus). */
export async function reduireImage(file: File) {
  try {
    return await preparerImage(file, { maxLargeur: IMAGE_MAX_PX, maxHauteur: IMAGE_MAX_PX });
  } catch (e) {
    if (e instanceof ImageIllisible) throw new Refus("Image illisible : choisis un JPEG, un PNG ou un WebP.");
    throw e;
  }
}

/** Le fichier est-il une vidéo (type, ou extension quand le navigateur ne dit rien) ? */
export const estFichierVideo = (file: File) => file.type.startsWith("video/") || /[.](mp4|mov|webm)$/i.test(file.name);

/**
 * Prépare et envoie un fichier ; renvoie le bloc média, au format que
 * `format` donne à son genre (par défaut, le format par défaut du genre :
 * l'éditeur le pose ensuite dans sa place). Une vidéo porte sa durée, au
 * dixième de seconde.
 */
export async function envoyerMedia(supabase: SupabaseClient, file: File, format: (g: GenreMedia) => Format = (g) => FORMAT_DEFAUT[g]): Promise<BlocMedia> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Refus("Connecte-toi pour ajouter un média.");
  const id = nouvelId();
  let blob: Blob, ratio: number, ext: string, contentType: string;
  let duree: number | null = null;
  const video = estFichierVideo(file);
  if (video) {
    // la vidéo part telle quelle : seules sa durée et son poids sont bornés
    const type = file.type || (/[.]mov$/i.test(file.name) ? "video/quicktime" : /[.]webm$/i.test(file.name) ? "video/webm" : "video/mp4");
    if (!VIDEO_TYPES.includes(type)) throw new Refus("Vidéo MP4, MOV ou WebM seulement.");
    if (file.size > VIDEO_MAX_OCTETS) throw new Refus(`Vidéo trop lourde : ${Mo(VIDEO_MAX_OCTETS)} au plus. Raccourcis-la, ou enregistre-la en 720p.`);
    const m = await lireVideo(file);
    if (Number.isFinite(m.duree) && m.duree > VIDEO_MAX_SECONDES + 0.5) throw new Refus(`Vidéo trop longue : ${VIDEO_MAX_SECONDES} secondes au plus.`);
    blob = file;
    ratio = m.ratio;
    if (Number.isFinite(m.duree) && m.duree >= 0.5) duree = Math.round(m.duree * 10) / 10;
    contentType = type;
    ext = type === "video/quicktime" ? "mov" : type === "video/webm" ? "webm" : "mp4";
  } else if (file.type.startsWith("image/") || /[.]hei[cf]$/i.test(file.name)) {
    if (file.size > 30 * 1024 * 1024) throw new Refus("Image trop lourde (30 Mo au plus avant réduction).");
    ({ blob, ratio, ext, contentType } = await reduireImage(file));
  } else {
    throw new Refus("Choisis une image ou une vidéo.");
  }
  const bucket = video ? BUCKET_VIDEOS : BUCKET_MEDIAS;
  const path = `${auth.user.id}/${id}.${ext}`;
  const up = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
  if (up.error) {
    const m = up.error.message || "";
    if (/bucket not found/i.test(m)) throw new Refus(video ? "Les vidéos arrivent bientôt : la base n'est pas encore prête." : "Les images arrivent bientôt : la base n'est pas encore prête.");
    if (/row-level security|policy/i.test(m))
      throw new Refus(video ? "Une vidéo est déjà en attente : enregistre ton profil (l'ancienne sera supprimée), puis réessaie." : "Trop de fichiers en attente : enregistre ton profil (les images retirées seront supprimées), puis réessaie.");
    if (/size|too large|exceed/i.test(m)) throw new Refus(`Fichier trop lourd : ${Mo(video ? VIDEO_MAX_OCTETS : MEDIA_MAX_OCTETS)} au plus.`);
    throw new Error(m);
  }
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  // le ratio au millième, comme la validation le relit
  const r = Math.round(ratio * 1000) / 1000;
  const genre: GenreMedia = video ? "video" : /[.]gif$/i.test(url) ? "gif" : "image";
  return { k: "media", id, type: video ? "video" : "image", url, ratio: r, legende: null, ...(duree !== null ? { duree } : {}), f: format(genre) };
}
