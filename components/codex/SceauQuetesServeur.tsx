import { createClient } from "@/lib/supabase/server";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { codexDisponible } from "@/lib/codex/disponible";
import { lirePanneau, lireXpTotal } from "@/lib/codex/serveur";
import { SceauQuetes } from "@/components/codex/SceauQuetes";
import { PastilleSeance } from "@/components/codex/PastilleSeance";

// Le sceau de la barre du haut et son panneau « Aujourd'hui », lus côté
// serveur et diffusés en flux (Suspense dans components/TopBar) : la barre ne
// les attend pas. Avec le panneau, l'XP totale du joueur (sa ligne de niveau).
// À sa droite, la pastille « Séance 2/3 · Continuer → » (V3 §6.4), du même
// panneau. Le Codex est gardé 45 s en mémoire par joueur, et son panneau
// 10 min en base (lirePanneau, lib/codex/serveur.ts). Sans la migration, hors
// connexion ou au moindre souci : rien. Module serveur.
export async function SceauQuetesServeur() {
  try {
    const { user } = await getSessionUserWithProfile();
    if (!user || !(await codexDisponible())) return null;
    const supabase = await createClient();
    const [panneau, xp] = await Promise.all([lirePanneau(supabase, user), lireXpTotal(supabase, user.id)]);
    if (!panneau.disponible) return null;
    return (
      <>
        <SceauQuetes initial={panneau} xp={xp} />
        <PastilleSeance initial={panneau.seance} jour={panneau.jour} />
      </>
    );
  } catch {
    return null;
  }
}
