"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { relationAvec, type Relation } from "@/lib/profil/donnees";

// Amis : demander, accepter, retirer (annuler sa demande, refuser, ne plus
// être amis). Par les fonctions de la base (migration_profil.sql), au nom du
// joueur connecté ; renvoie la relation qui en résulte.

export type Operation = "demander" | "accepter" | "retirer";
export type AmiResultat = { ok: true; relation: Relation } | { ok: false; erreur: string };

const RPC: Record<Operation, string> = { demander: "rl_friend_request", accepter: "rl_friend_accept", retirer: "rl_friend_remove" };

export async function actionAmi(autre: string, op: Operation): Promise<AmiResultat> {
  if (!/^[0-9a-f-]{36}$/i.test(autre) || !(op in RPC)) return { ok: false, erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const moi = auth.user?.id;
  if (!moi) return { ok: false, erreur: "Connecte-toi d'abord." };
  if (moi === autre) return { ok: false, erreur: "Tu es déjà ton meilleur allié." };
  const { error } = await supabase.rpc(RPC[op], { p_other: autre });
  if (error) {
    return { ok: false, erreur: /does not exist|schema cache/i.test(error.message) ? "Les amis arrivent bientôt : la base n'est pas encore prête." : "Ça n'a pas marché, réessaie dans un instant." };
  }
  const relation = (await relationAvec(supabase, moi, autre)) ?? "aucune";
  revalidatePath(`/people/${autre}`);
  revalidatePath("/people");
  return { ok: true, relation };
}
