import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireLobby } from "@/components/accueil/lobby/donnees";
import { LobbyView } from "@/components/accueil/lobby/LobbyView";
import { parisDay } from "@/components/accueil/queries";

export const metadata = { title: "Accueil · Ranked Lobby" };

// L'accueil « Le lobby » : la page ne fait que trouver le joueur et le client de
// service, puis laisse components/accueil/lobby lire (UN Promise.all, chaque
// carte avec son filet) et composer (LobbyView). Rien du Codex ici : ses quêtes
// vivent derrière le sceau de la barre du haut, sur /codex et dans la carte
// « Ta prochaine quête ».
export default async function Dashboard() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // Client admin : moyennes et inscrits aux examens blancs, présence, duels en cours, rival.
  // Absent (variables d'environnement) → les cartes qui en dépendent se masquent.
  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const now = new Date();
  return <LobbyView l={await lireLobby({ sb: supabase, admin, user, now, jour: parisDay(now) })} />;
}
