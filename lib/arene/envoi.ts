// L'envoi de la vidéo de victoire et de l'image de bannière, dans le navigateur
// (mêmes contrôles que les médias du profil : lib/profil/envoi-media.ts), vers le
// dossier du joueur du bucket arene-medias (migration_arene.sql). Le fichier
// remplacé part au ménage de l'enregistrement (lib/arene/actions.ts).
// Module client : importé seulement par components/arene/ReglagesArene.tsx.

import type { SupabaseClient } from "@supabase/supabase-js";
import { VIDEO_MAX_OCTETS, VIDEO_TYPES } from "@/lib/profil/disposition";
import { Mo, Refus, estFichierVideo, lireVideo, reduireImage } from "@/lib/profil/envoi-media";
import { BUCKET_ARENE, VICTOIRE_MAX_SECONDES, type VideoVictoire } from "@/lib/arene/perso";
import { ARENE } from "@/lib/voice-arene";

const R = ARENE.reglages;

async function deposer(sb: SupabaseClient, nom: string, fichier: Blob, contentType: string): Promise<string> {
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Refus(R.connecte);
  const chemin = `${auth.user.id}/${nom}`;
  const up = await sb.storage.from(BUCKET_ARENE).upload(chemin, fichier, { contentType, upsert: false });
  if (up.error) {
    const m = up.error.message || "";
    if (/bucket not found/i.test(m)) throw new Refus(R.basePasPrete);
    if (/row-level security|policy/i.test(m)) throw new Refus(R.refusQuota);
    if (/size|too large|exceed/i.test(m)) throw new Refus(R.refusLourde(Mo(VIDEO_MAX_OCTETS)));
    throw new Error(m);
  }
  return sb.storage.from(BUCKET_ARENE).getPublicUrl(chemin).data.publicUrl;
}

/** Contrôle et envoie une vidéo : 15 secondes et 30 Mo au plus, MP4, MOV ou WebM. */
export async function envoyerVideoVictoire(sb: SupabaseClient, file: File): Promise<VideoVictoire> {
  if (!estFichierVideo(file)) throw new Refus(R.refusType);
  const type = file.type || (/[.]mov$/i.test(file.name) ? "video/quicktime" : /[.]webm$/i.test(file.name) ? "video/webm" : "video/mp4");
  if (!VIDEO_TYPES.includes(type)) throw new Refus(R.refusType);
  if (file.size > VIDEO_MAX_OCTETS) throw new Refus(R.refusLourde(Mo(VIDEO_MAX_OCTETS)));
  const m = await lireVideo(file);
  if (Number.isFinite(m.duree) && m.duree > VICTOIRE_MAX_SECONDES + 0.5) throw new Refus(R.refusLongue(VICTOIRE_MAX_SECONDES));
  const ext = type === "video/quicktime" ? "mov" : type === "video/webm" ? "webm" : "mp4";
  const url = await deposer(sb, `victoire-${Date.now()}.${ext}`, file, type);
  return { url, ratio: Math.round(m.ratio * 1000) / 1000, duree: Number.isFinite(m.duree) ? Math.round(m.duree * 10) / 10 : null, nom: file.name.slice(0, 120), poids: file.size };
}

/** Réduit au besoin et envoie l'image de fond de la bannière. */
export async function envoyerImageVs(sb: SupabaseClient, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Refus(R.refusImage);
  const { blob, ext, contentType } = await reduireImage(file);
  return deposer(sb, `vs-${Date.now()}.${ext}`, blob, contentType);
}
