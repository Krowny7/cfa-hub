import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireCarnets } from "@/components/reviser/carnets";
import { VueCarnets } from "@/components/reviser/VueCarnets";

export const metadata = { title: "Fiches · Ranked Lobby" };

// Fiches de révision (direction « le lieu, puis l'objet », 2026-11-13) : la porte (la bibliothèque,
// « pages faites sur N » en chiffre-héros, la ligne d'état des fiches), puis l'objet : les dix carnets
// ébène sur leur ligne de sol, le conseillé entouré, le mur des one-pagers en onzième objet, et une
// action à l'encre qui ouvre le carnet conseillé. Avancement illisible : les carnets sans chiffre.
export default async function FichesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }
  const lus = await lireCarnets(supabase, admin, auth.user.id);
  return <VueCarnets donnees={lus} />;
}
