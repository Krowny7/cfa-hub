import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhotoRecadree } from "./recadrage";

// Enregistre la photo de profil recadrée : bucket « avatars », dans le dossier
// du joueur, puis profiles.avatar_url. Le chemin porte l'heure : chaque photo
// a sa propre adresse (aucun cache à casser). Renvoie l'adresse publique.
export async function enregistrerPhotoProfil(supabase: SupabaseClient, userId: string, photo: PhotoRecadree): Promise<string> {
  const path = `${userId}/${Date.now()}.${photo.ext}`;
  const up = await supabase.storage.from("avatars").upload(path, photo.blob, { upsert: true, contentType: photo.contentType });
  if (up.error) throw up.error;
  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
  if (error) throw error;
  return publicUrl;
}
