// L'envoi des quatre images de la bannière composée (Personnaliser › Bannière :
// le fond, le personnage, la pièce du haut, la pièce du bas), dans le
// navigateur : un PNG, un WebP ou un JPG, envoyé tel quel s'il est raisonnable
// (la transparence d'un PNG détouré est gardée), sinon réduit à 1 800 px
// (WebP, PNG si le navigateur n'écrit pas le WebP) ; 4 Mo au plus une fois
// prêt. Dans le dossier du joueur du bucket profil-medias, sous le nom exact
// `<élément>-<instant>.<ext>` (lib/profil/banniere.ts : `fond-…`, `perso-…`,
// `haut-…`, `bas-…`), donc un fichier par élément ; même base, mêmes limites
// que les médias de sa page (migration_profil_medias.sql : 12 fichiers par
// joueur, 20 avec migration_bannieres_composees.sql : les quatre images plus
// une remplaçante en attente de chacune). Remplacer une image envoie un
// nouveau fichier ; l'ancien reste tant que la bannière enregistrée s'en sert
// et part au ménage de l'enregistrement qui ne le garde plus
// (fichiersGardesStyle, app/moi/profil/actions.ts). Une image envoyée puis
// remplacée avant d'enregistrer se retire tout de suite : supprimerEnAttente.
// Le serveur revalide les adresses à l'enregistrement (validerComposition).
// Module client (document, createImageBitmap) : importé seulement par l'éditeur
// de la bannière (components/profil/EditeurBanniere.tsx).

import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_MEDIAS } from "@/lib/profil/disposition";
import { IMAGE_BRUT_MAX_OCTETS, IMAGE_MAX_OCTETS, IMAGE_MAX_PX, IMAGE_TYPES, NOMS_ELEMENTS, bornerRatio, nomFichierImage, type CleImage } from "@/lib/profil/banniere";
import { QuotaFichiers, Refus, Mo } from "@/lib/profil/envoi-media";
import { ImageIllisible, preparerImage } from "@/lib/profil/image";

const EXTENSION_OK = /[.](png|webp|jpe?g)$/i;
/** PNG, WebP ou JPG (le type, ou l'extension quand le navigateur ne dit rien). */
export const estFichierImage = (file: File) => (file.type ? IMAGE_TYPES.includes(file.type) : EXTENSION_OK.test(file.name));

/** L'image envoyée : son adresse publique et le rapport largeur / hauteur de l'image (à garder dans le calque : `r`). */
export type ImageEnvoyee = { url: string; ratio: number };

/**
 * Prépare et envoie le fichier de l'élément `cle` ; renvoie l'adresse
 * publique et le rapport de l'image. Un refus à montrer tel quel : Refus ; le
 * dossier plein de fichiers en attente : QuotaFichiers (l'appelant le fait
 * ranger par le serveur, rangerFichiersEnAttente, puis renvoie une fois).
 */
export async function envoyerImageBanniere(supabase: SupabaseClient, cle: CleImage, file: File): Promise<ImageEnvoyee> {
  const nom = NOMS_ELEMENTS[cle].toLowerCase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Refus(`Connecte-toi pour envoyer ton image de ${nom}.`);
  if (!estFichierImage(file)) throw new Refus("Choisis un PNG, un WebP ou un JPG.");
  if (file.size > IMAGE_BRUT_MAX_OCTETS) throw new Refus(`Image trop lourde : ${Mo(IMAGE_BRUT_MAX_OCTETS)} au plus avant réduction.`);
  let prete: Awaited<ReturnType<typeof preparerImage>>;
  try {
    // le fond remplit la bannière : pas de transparence à garder ; les pièces et le personnage sont détourés
    prete = await preparerImage(file, { maxLargeur: IMAGE_MAX_PX, maxHauteur: IMAGE_MAX_PX, maxOctetsTelleQuelle: IMAGE_MAX_OCTETS, garderAlpha: cle !== "fond" });
  } catch (e) {
    if (e instanceof ImageIllisible) throw new Refus("Image illisible : choisis un PNG, un WebP ou un JPG.");
    throw e;
  }
  if (prete.blob.size > IMAGE_MAX_OCTETS) throw new Refus(`Image trop lourde : ${Mo(IMAGE_MAX_OCTETS)} au plus, même réduite.`);
  const path = `${auth.user.id}/${nomFichierImage(cle, prete.ext)}`;
  const up = await supabase.storage.from(BUCKET_MEDIAS).upload(path, prete.blob, { contentType: prete.contentType, upsert: false });
  if (up.error) {
    const m = up.error.message || "";
    if (/bucket not found/i.test(m)) throw new Refus("L'envoi des images de la bannière arrive bientôt : la base n'est pas encore prête.");
    if (/row-level security|policy/i.test(m)) throw new QuotaFichiers("Trop de fichiers en attente : enregistre ton profil (les images retirées seront supprimées), puis réessaie.");
    if (/size|too large|exceed/i.test(m)) throw new Refus(`Fichier trop lourd : ${Mo(IMAGE_MAX_OCTETS)} au plus.`);
    throw new Error(m);
  }
  return { url: supabase.storage.from(BUCKET_MEDIAS).getPublicUrl(path).data.publicUrl, ratio: bornerRatio(prete.ratio) };
}

/** `<uuid du joueur>/<élément>-<instant>.<ext>` : le chemin d'une image de la bannière dans le bucket. */
const CHEMIN = new RegExp(`[/]storage[/]v1[/]object[/]public[/]${BUCKET_MEDIAS}[/]([0-9a-f-]{36}[/](?:fond|perso|haut|bas)-[0-9]{9,16}[.](?:png|webp|jpe?g))$`, "i");

/**
 * Retire du dossier du joueur une image envoyée mais pas encore enregistrée
 * (il l'a remplacée avant d'enregistrer, ou retirée) : sans cela elle
 * resterait, en attente, jusqu'au ménage du prochain enregistrement, et
 * compterait dans son quota. `gardees` : les adresses que la bannière
 * enregistrée utilise encore (jamais supprimées : le profil en ligne les
 * montre). Au mieux : sans effet si l'adresse n'est pas une image de bannière
 * du joueur, ou si la suppression échoue (le ménage s'en chargera).
 */
export async function supprimerEnAttente(supabase: SupabaseClient, url: string | null | undefined, gardees: ReadonlyArray<string | null | undefined> = []): Promise<void> {
  if (!url || gardees.includes(url)) return;
  const chemin = CHEMIN.exec(url)?.[1];
  if (!chemin) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || !chemin.startsWith(`${auth.user.id}/`)) return;
    await supabase.storage.from(BUCKET_MEDIAS).remove([chemin]);
  } catch {
    // le ménage de l'enregistrement le supprimera
  }
}
