import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";

// Fiches de révision : le gabarit commun des listes de Réviser (la carte « ta
// suite » et la peinture du lieu « Les carnets », index du programme avec ta
// maîtrise), puis l'accès aux one-pagers (une page A4 par matière).
export default async function FichesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const subjects = await loadSubjectsSafe(supabase, auth.user.id);
  return (
    <ListeReviser
      kind="fiche"
      subjects={subjects}
    />
  );
}
