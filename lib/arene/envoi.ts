// L'envoi de la vidéo de victoire et de l'image de bannière, dans le navigateur
// (mêmes contrôles que les médias du profil : lib/profil/envoi-media.ts), vers le
// dossier du joueur du bucket arene-medias (migration_arene.sql). Le fichier
// remplacé part au ménage de l'enregistrement (lib/arene/actions.ts).
// Module client : importé seulement par components/arene/ReglagesArene.tsx.

import type { SupabaseClient } from "@supabase/supabase-js";
import { VIDEO_TYPES } from "@/lib/profil/disposition";
import { Mo, Refus, estFichierVideo, lireVideo, reduireImage } from "@/lib/profil/envoi-media";
import { compresserVideo } from "@/lib/arene/compression";
import { BUCKET_ARENE, VICTOIRE_MAX_OCTETS, VICTOIRE_MAX_SECONDES, type VideoVictoire } from "@/lib/arene/perso";
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
    if (/size|too large|exceed/i.test(m)) throw new Refus(R.refusLourde(Mo(VICTOIRE_MAX_OCTETS)));
    throw new Error(m);
  }
  return sb.storage.from(BUCKET_ARENE).getPublicUrl(chemin).data.publicUrl;
}

/** Contrôle, compresse et envoie une vidéo : 15 secondes au plus, MP4, MOV ou WebM. */
export async function envoyerVideoVictoire(sb: SupabaseClient, file: File, surCompression?: () => void): Promise<VideoVictoire> {
  if (!estFichierVideo(file)) throw new Refus(R.refusType);
  const type = file.type || (/[.]mov$/i.test(file.name) ? "video/quicktime" : /[.]webm$/i.test(file.name) ? "video/webm" : "video/mp4");
  if (!VIDEO_TYPES.includes(type)) throw new Refus(R.refusType);
  const m = await lireVideo(file);
  if (Number.isFinite(m.duree) && m.duree > VICTOIRE_MAX_SECONDES + 0.5) throw new Refus(R.refusLongue(VICTOIRE_MAX_SECONDES));
  let envoi: Blob = file;
  let typeEnvoi = type;
  // toutes passent par la compression ; si elle échoue ou ne gagne rien, on garde l'originale
  surCompression?.();
  try {
    const c = await compresserVideo(file, Number.isFinite(m.duree) ? m.duree : VICTOIRE_MAX_SECONDES, VICTOIRE_MAX_OCTETS);
    if (c.blob.size < file.size) {
      envoi = c.blob;
      typeEnvoi = c.type;
    }
  } catch {
    // l'originale part telle quelle, si elle tient sous la limite
  }
  if (envoi.size > VICTOIRE_MAX_OCTETS) throw new Refus(R.refusLourde(Mo(VICTOIRE_MAX_OCTETS)));
  const ext = typeEnvoi === "video/quicktime" ? "mov" : typeEnvoi === "video/webm" ? "webm" : "mp4";
  const url = await deposer(sb, `victoire-${Date.now()}.${ext}`, envoi, typeEnvoi);
  return { url, ratio: Math.round(m.ratio * 1000) / 1000, duree: Number.isFinite(m.duree) ? Math.round(m.duree * 10) / 10 : null, nom: file.name.slice(0, 120), poids: file.size };
}

/** Réduit au besoin et envoie l'image de fond de la bannière. */
export async function envoyerImageVs(sb: SupabaseClient, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Refus(R.refusImage);
  const { blob, ext, contentType } = await reduireImage(file);
  return deposer(sb, `vs-${Date.now()}.${ext}`, blob, contentType);
}
