"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STYLE_DEFAUT } from "@/lib/profil/catalogue";
import { colonneAbsente } from "@/lib/arene/donnees";
import { BUCKET_ARENE, areneValide, fichiersArene, type Arene } from "@/lib/arene/perso";
import { ARENE } from "@/lib/voice-arene";

// Enregistrer sa bannière de VS et sa vidéo de victoire : revalidé ici (fichiers
// de son dossier seulement), écrit par le client service role (les joueurs
// n'écrivent pas profile_style), à part du reste du style : « Enregistrer » de
// Personnaliser ne touche pas à cette colonne. Puis le ménage de son dossier.

export type ResultatArene = { ok: true; arene: Arene } | { ok: false; erreur: string };

export async function enregistrerArene(input: unknown): Promise<ResultatArene> {
  const R = ARENE.reglages;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, erreur: R.connecte };
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/[/]+$/, "");
  if (!base) return { ok: false, erreur: R.enregistrementRate };
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, erreur: R.enregistrementRate };
  }

  const arene = areneValide(input, `${base}/storage/v1/object/public/${BUCKET_ARENE}/${user.id}/`);
  const updated_at = new Date().toISOString();
  const maj = await admin.from("profile_style").update({ arene, updated_at }).eq("user_id", user.id).select("user_id");
  let erreur = maj.error;
  // pas encore de ligne : la bannière, la couleur, le cadre et la vitrine de départ, pas ceux de la base
  if (!erreur && !maj.data?.length) {
    const { banner, accent, frame, showcase } = STYLE_DEFAUT;
    ({ error: erreur } = await admin.from("profile_style").insert({ user_id: user.id, banner, accent, frame, showcase, arene, updated_at }));
  }
  if (erreur) return { ok: false, erreur: colonneAbsente(erreur) ? R.basePasPrete : R.enregistrementRate };

  try {
    const gardes = fichiersArene(arene);
    const { data: objets } = await admin.storage.from(BUCKET_ARENE).list(user.id, { limit: 100 });
    const inutiles = (objets ?? []).filter((o) => o.name && !gardes.has(o.name)).map((o) => `${user.id}/${o.name}`);
    if (inutiles.length) await admin.storage.from(BUCKET_ARENE).remove(inutiles);
  } catch {
    // bucket pas encore créé : rien à ranger
  }
  return { ok: true, arene };
}
