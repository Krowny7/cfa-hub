"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CARTE_JOUR } from "@/lib/voice-accueil-lobby-carte";
import { CLE_CARTE_JOUR, tagCarteDuJour, validerReglages, versLeCompte, type ReglagesCarte } from "./modele-carte";

// Le réglage de « La carte du jour » (accueil « Le lobby »), posé depuis
// l'engrenage de la carte : une seule clé du compte, user_metadata.rl_carte_jour
// = { m: matières, s: source }, lue au rendu par lecture-carte.ts (le serveur
// tire la carte, il lui faut les réglages avant la page : pas de carte qui
// change après hydratation, mêmes réglages partout, aucune migration). Même
// précédent que le mode sobre (app/moi/actions-sobre.ts). Rien d'autre n'est
// touché dans les métadonnées. La carte tirée est gardée côté serveur pour le
// jour (lecture-carte.ts, par joueur, jour ET réglages : d'autres réglages sont
// d'office une autre clé) ; l'enregistrement la révoque aussi par son étiquette,
// pour que « Enregistrer » redonne une carte fraîche même à réglages égaux
// (cartes marquées ou points faibles qui ont bougé).

export type ResultatCarte = { ok: true; reglages: ReglagesCarte } | { ok: false; erreur: string };

/**
 * Enregistre les cartes du jour du joueur. Valide d'abord, sans toucher à la
 * base : des clés de matière toutes connues, une matière au moins, une source
 * connue. Sinon rien n'est écrit.
 */
export async function reglerCarteDuJour(brut: unknown): Promise<ResultatCarte> {
  const reglages = validerReglages(brut);
  if (!reglages) return { ok: false, erreur: CARTE_JOUR.reglages.refus };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erreur: CARTE_JOUR.reglages.connexion };
  try {
    const { error } = await supabase.auth.updateUser({ data: { [CLE_CARTE_JOUR]: versLeCompte(reglages) } });
    if (error) return { ok: false, erreur: CARTE_JOUR.reglages.erreur };
  } catch {
    return { ok: false, erreur: CARTE_JOUR.reglages.erreur };
  }
  revalidateTag(tagCarteDuJour(auth.user.id));
  revalidatePath("/dashboard");
  return { ok: true, reglages };
}
