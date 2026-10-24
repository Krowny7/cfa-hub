"use server";

import { createClient } from "@/lib/supabase/server";
import { ecrireProgression, type ResultatEcriture } from "@/lib/flashcards/progression-serveur";

// Les gestes de la révision des flashcards, écrits sur le compte : la boucle
// « À revoir » d'un paquet ou d'une matière (migration_flashcard_progress.sql).
// Le joueur est celui de la session (jamais un identifiant reçu du
// navigateur) ; l'état est validé (lib/flashcards/progression.ts) et borné.
// Table absente : « absente », le navigateur cesse d'essayer. Compte changé
// ailleurs depuis la version sur laquelle l'état s'appuie : « conflit », avec
// la ligne du compte (le navigateur la prend au lieu de l'écraser).
// La relecture du compte passe par app/api/flashcards/progression (GET) :
// une action serveur sert à écrire, pas à lire.

export async function enregistrerBoucle(cle: string, etat: unknown): Promise<ResultatEcriture> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, raison: "connexion" };
    return await ecrireProgression(supabase, data.user.id, cle, etat);
  } catch {
    return { ok: false, raison: "erreur" };
  }
}
