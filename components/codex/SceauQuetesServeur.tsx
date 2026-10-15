import { createClient } from "@/lib/supabase/server";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { codexDisponible } from "@/lib/codex/disponible";
import { lireCodex } from "@/lib/codex/serveur";
import { panneauDe } from "@/lib/codex/panneau";
import { SceauQuetes } from "@/components/codex/SceauQuetes";

// Le sceau « ! » de la barre du haut, lu côté serveur et diffusé en flux
// (Suspense dans components/TopBar) : la barre ne l'attend pas. Le Codex est
// gardé 45 s en mémoire par joueur (lib/codex/serveur.ts). Sans la migration,
// hors connexion ou au moindre souci : rien. Module serveur.
export async function SceauQuetesServeur() {
  try {
    const { user } = await getSessionUserWithProfile();
    if (!user || !(await codexDisponible())) return null;
    const vue = await lireCodex(await createClient(), user);
    if (!vue.disponible) return null;
    return <SceauQuetes initial={panneauDe(vue)} />;
  } catch {
    return null;
  }
}
