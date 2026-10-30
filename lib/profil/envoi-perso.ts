// L'envoi du personnage de la bannière (Personnaliser › Bannière › Ton
// personnage), dans le navigateur : un PNG, un WebP ou un JPG, envoyé tel
// quel s'il est raisonnable (la transparence d'un PNG détouré est gardée),
// sinon réduit à 1 800 px (WebP, PNG si le navigateur n'écrit pas le WebP) ;
// 4 Mo au plus une fois prêt. Dans le dossier du joueur du bucket
// profil-medias, sous le nom exact `perso-<instant>.<ext>`
// (lib/profil/perso.ts) ; même base, mêmes limites que les médias de sa page
// (migration_profil_medias.sql : 12 fichiers par joueur, 14 avec
// migration_bannieres_perso.sql). Le serveur revalide l'adresse à
// l'enregistrement et supprime les fichiers qui ne servent plus.
// Module client (document, createImageBitmap) : importé seulement par
// components/profil/SectionsPersonnaliser.tsx.

import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_MEDIAS } from "@/lib/profil/disposition";
import { QuotaFichiers, Refus, Mo } from "@/lib/profil/envoi-media";
import { ImageIllisible, preparerImage } from "@/lib/profil/image";
import { PERSO_BRUT_MAX_OCTETS, PERSO_MAX_OCTETS, PERSO_MAX_PX, PERSO_TYPES, nomFichierPerso } from "@/lib/profil/perso";

const EXTENSION_OK = /[.](png|webp|jpe?g)$/i;
/** PNG, WebP ou JPG (le type, ou l'extension quand le navigateur ne dit rien). */
export const estFichierPerso = (file: File) => (file.type ? PERSO_TYPES.includes(file.type) : EXTENSION_OK.test(file.name));

/**
 * Prépare et envoie le fichier ; renvoie l'adresse publique du personnage.
 * Un refus à montrer tel quel : Refus ; le dossier plein de fichiers en
 * attente : QuotaFichiers (l'appelant le fait ranger par le serveur, puis
 * renvoie une fois).
 */
export async function envoyerPerso(supabase: SupabaseClient, file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Refus("Connecte-toi pour envoyer ton personnage.");
  if (!estFichierPerso(file)) throw new Refus("Choisis un PNG, un WebP ou un JPG.");
  if (file.size > PERSO_BRUT_MAX_OCTETS) throw new Refus(`Image trop lourde : ${Mo(PERSO_BRUT_MAX_OCTETS)} au plus avant réduction.`);
  let prete: Awaited<ReturnType<typeof preparerImage>>;
  try {
    prete = await preparerImage(file, { maxLargeur: PERSO_MAX_PX, maxHauteur: PERSO_MAX_PX, maxOctetsTelleQuelle: PERSO_MAX_OCTETS, garderAlpha: true });
  } catch (e) {
    if (e instanceof ImageIllisible) throw new Refus("Image illisible : choisis un PNG, un WebP ou un JPG.");
    throw e;
  }
  if (prete.blob.size > PERSO_MAX_OCTETS) throw new Refus(`Image trop lourde : ${Mo(PERSO_MAX_OCTETS)} au plus, même réduite.`);
  const path = `${auth.user.id}/${nomFichierPerso(prete.ext)}`;
  const up = await supabase.storage.from(BUCKET_MEDIAS).upload(path, prete.blob, { contentType: prete.contentType, upsert: false });
  if (up.error) {
    const m = up.error.message || "";
    if (/bucket not found/i.test(m)) throw new Refus("L'envoi du personnage arrive bientôt : la base n'est pas encore prête.");
    if (/row-level security|policy/i.test(m)) throw new QuotaFichiers("Trop de fichiers en attente : enregistre ton profil (les images retirées seront supprimées), puis réessaie.");
    if (/size|too large|exceed/i.test(m)) throw new Refus(`Fichier trop lourd : ${Mo(PERSO_MAX_OCTETS)} au plus.`);
    throw new Error(m);
  }
  return supabase.storage.from(BUCKET_MEDIAS).getPublicUrl(path).data.publicUrl;
}
