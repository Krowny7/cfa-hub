import type { User } from "@supabase/supabase-js";
import { AnneauDuJourLogo } from "@/components/adn/AnneauDuJourLogo";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { objectifDuJour } from "@/lib/objectif";

// Le logo de la barre du haut avec les traits et l'objectif du joueur, diffusé en flux
// (TopBar : Suspense, le logo plein en attendant). L'objectif du plan demande une lecture
// lourde à la première visite du jour : elle ne retarde plus la page et n'est plus coupée
// à mi-chemin, ce qui faisait afficher le défaut (40) à la place du vrai objectif.
export async function LogoDuJour({ user }: { user: Pick<User, "id" | "user_metadata"> }) {
  const [traits, plan] = await Promise.all([traitsDuJour(user.id), objectifDuJour(user)]);
  return <AnneauDuJourLogo repondues={traits} objectif={plan.objectif} size={26} landing publie />;
}
