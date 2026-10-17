import type { SupabaseClient, User } from "@supabase/supabase-js";
import { enteteSeance, gainsSeance } from "@/lib/codex/seance-etat";
import { lireCodex } from "@/lib/codex/serveur";
import { SeanceDuJour } from "@/components/codex/SeanceDuJour";

// La séance du jour sur l'accueil (V3 §6.3), en carte pleine largeur SOUS
// les 30 et les 5 du jour, qui gardent leur grande place en haut. Lue côté
// serveur et diffusée en flux (second Suspense dans app/dashboard) : le même
// lireCodex que CodexAccueil, calculé une seule fois (calculUnique). Codex
// indisponible, pas de séance, le jour J (V3 §7.4), ou au moindre souci :
// rien. Module serveur.
export async function SeanceAccueil({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  try {
    const vue = await lireCodex(supabase, user);
    if (!vue.disponible || !vue.seance?.blocs.length || vue.moment === "jourJ") return null;
    return <SeanceDuJour seance={vue.seance} entete={enteteSeance(vue.joursAvant, vue.phaseNom)} gains={gainsSeance(vue.seance.avant, vue)} mode="compact" />;
  } catch {
    return null;
  }
}
