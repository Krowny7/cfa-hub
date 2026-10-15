import type { SupabaseClient, User } from "@supabase/supabase-js";
import { bilanDe } from "@/lib/codex/bilan";
import { lireCodex } from "@/lib/codex/serveur";
import { FeteCodex } from "@/components/codex/FeteCodex";

// Le Codex sur l'accueil : plus de ligne « Ta quête » ni de contrats (le
// sceau « ! » de la barre du haut les montre partout) ; seulement la petite
// cérémonie (quêtes tamponnées, acte qui s'ouvre, dévoilement, « Léonard a
// feuilleté ton carnet »), qui ne prend de la place que lorsqu'il y a
// quelque chose à fêter. Lue côté serveur et diffusée en flux (Suspense dans
// app/dashboard). Sans migration ou au moindre souci, rien. Module serveur.
export async function CodexAccueil({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  try {
    const vue = await lireCodex(supabase, user);
    if (!vue.disponible) return null;
    return <FeteCodex initial={bilanDe(vue)} persister={!!vue.devoile?.change} />;
  } catch {
    return null;
  }
}
