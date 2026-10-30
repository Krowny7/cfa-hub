"use server";

import { createClient } from "@/lib/supabase/server";
import { messageErreurSalle } from "@/lib/salles/api";
import { lancerSession } from "@/lib/salles/serveur";

// Action serveur des Salles : le lancement d'une partie. Les calculs sortent des
// catalogues de lib/calc (réponses comprises) : ils sont tirés ICI, sur le
// serveur du site, et envoyés tels quels à lancer_session ; le navigateur de
// l'admin n'en voit que le résultat (jamais les calculs ni leurs réponses).
// Créer, rejoindre, quitter, arrêter : le navigateur appelle directement les
// fonctions de lib/salles/api (les RPC vérifient qui est qui).

export type LancerResultat =
  | { ok: true; nb: number; nbQuestions: number; nbCalculs: number; manque: boolean }
  | { ok: false; erreur: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lance une partie dans la salle `salleId` avec les réglages `params` (validés
 * ici puis par la base : seul l'admin peut lancer, une seule partie à la fois).
 */
export async function lancerPartie(salleId: string, params: unknown): Promise<LancerResultat> {
  if (typeof salleId !== "string" || !UUID_RE.test(salleId)) return { ok: false, erreur: "Salle introuvable." };
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, erreur: "Session expirée — recharge la page et reconnecte-toi." };
    const r = await lancerSession(supabase, salleId, params);
    return { ok: true, nb: r.nb, nbQuestions: r.nbQuestions, nbCalculs: r.nbCalculs, manque: r.manque };
  } catch (e) {
    return { ok: false, erreur: messageErreurSalle(e, "Le lancement n'a pas abouti. Réessaie dans un instant.") };
  }
}
