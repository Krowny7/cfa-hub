import { createClient } from "@/lib/supabase/server";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { codexDisponible } from "@/lib/codex/disponible";
import { lirePanneau } from "@/lib/codex/serveur";
import { SceauQuetes } from "@/components/codex/SceauQuetes";

// Le sceau « ! » de la barre du haut, lu côté serveur et diffusé en flux
// (Suspense dans components/TopBar) : la barre ne l'attend pas. Le Codex est
// gardé 45 s en mémoire par joueur, et son panneau 10 min en base
// (lirePanneau, lib/codex/serveur.ts). Sans la migration, hors connexion ou
// au moindre souci : rien. Module serveur.
export async function SceauQuetesServeur() {
  try {
    const { user } = await getSessionUserWithProfile();
    if (!user || !(await codexDisponible())) return null;
    const panneau = await lirePanneau(await createClient(), user);
    if (!panneau.disponible) return null;
    return <SceauQuetes initial={panneau} />;
  } catch {
    return null;
  }
}
