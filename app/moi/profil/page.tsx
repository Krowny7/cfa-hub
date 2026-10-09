import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hrefPersonnaliser } from "@/lib/profil/onglets";

// L'ancien éditeur du profil : on personnalise désormais sur la page même
// (/people/<moi>?personnaliser=1). L'adresse reste pour les liens gardés.
export default async function PersonnaliserPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  redirect(hrefPersonnaliser(auth.user.id));
}
