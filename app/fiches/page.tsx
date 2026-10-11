import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BandeListe, ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";

// Fiches de révision : le gabarit commun des listes de Réviser (carte du
// lieu « Les carnets », bande d'encre, index du programme avec ta maîtrise).
export default async function FichesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const subjects = await loadSubjectsSafe(supabase, auth.user.id);
  return <ListeReviser kind="fiche" subjects={subjects} bande={<BandeListe kind="fiche" subjects={subjects} />} />;
}
