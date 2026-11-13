import { redirect } from "next/navigation";
import { Dossiers } from "@/components/cas-fsa/Dossiers";
import { CAS_FSA } from "@/lib/cas-fsa";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cas pratiques · Ranked Lobby" };

// Les cas pratiques de FSA (direction « le lieu, puis l'objet », 2026-11-13) : la porte, puis la
// rangée des dossiers d'ébène, le conseillé entouré et ouvert à l'encre (components/cas-fsa/Dossiers).
// Seul ce que montre la rangée part au navigateur (pas les états ni les énoncés : le thème de
// chaque question, pour le sommaire d'un dossier seul).
export default async function CasPratiquesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  return (
    <Dossiers
      cas={CAS_FSA.map((c) => ({ id: c.id, societe: c.societe, exercice: c.exercice, referentiel: c.referentiel, etapes: c.etapes.map((e) => ({ id: e.id, titre: e.notion })) }))}
    />
  );
}
