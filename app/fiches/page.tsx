import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";
import { onePagerItems } from "@/components/reviser/shelves";
import { MurMini } from "@/components/ui/Decors";
import { OP } from "@/lib/voice-reviser";

// Fiches de révision (modèle des sous-pages, 2026-11-12) : l'en-tête (« Les carnets »), puis le
// cadre à zones : les 10 fiches en carnets sur le carrousel à gauche, et dans la colonne grise le
// petit mur des one-pagers (une page A4 par matière), qui mène à /fiches/one-pagers.
export default async function FichesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const subjects = await loadSubjectsSafe(supabase, auth.user.id);
  return (
    <ListeReviser
      kind="fiche"
      subjects={subjects}
      droite={{ titre: OP.zone, contenu: <MurMini images={onePagerItems().map((o) => o.mini)} href="/fiches/one-pagers" aide={OP.murAide} /> }}
    />
  );
}
