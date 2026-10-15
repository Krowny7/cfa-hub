import type { SupabaseClient, User } from "@supabase/supabase-js";
import { bilanDe } from "@/lib/codex/bilan";
import { lireCodex } from "@/lib/codex/serveur";
import { LigneCodex } from "@/components/codex/LigneCodex";

// La ligne du Codex sur l'accueil, lue côté serveur et diffusée en flux
// (Suspense dans app/dashboard) : l'accueil ne l'attend pas. Sans migration
// ou au moindre souci, rien. Module serveur.
export async function CodexAccueil({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  try {
    const vue = await lireCodex(supabase, user);
    if (!vue.disponible) return null;
    return <LigneCodex bilan={bilanDe(vue)} persister={!!vue.devoile?.change} />;
  } catch {
    return null;
  }
}
