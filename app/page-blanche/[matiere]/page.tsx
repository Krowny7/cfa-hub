import { notFound, redirect } from "next/navigation";
import { SessionPageBlanche } from "@/components/page-blanche/Session";
import { matiereDe } from "@/lib/formules";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "La page blanche · Ranked Lobby" };

// Une matière de la page blanche : seule sa partie du catalogue part au navigateur.
// La page (en-tête commun, colonne de la séance) est rendue par SessionPageBlanche ; le
// retour dit déjà « La page blanche », le titre ne dit que la matière.
export default async function PageBlancheMatiere({ params }: { params: Promise<{ matiere: string }> }) {
  const { matiere } = await params;
  const m = matiereDe(matiere);
  if (!m) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase.from("formules_maitrise").select("formule,maitrisee,tours").eq("user_id", auth.user.id).eq("matiere", matiere);
  const lignes = data ?? [];
  const tour = lignes.reduce((t, r) => Math.max(t, Number(r.tours) || 0), 0) + 1;

  return (
    <SessionPageBlanche
      matiere={matiere}
      nom={topicLabel(matiere)}
      copies={m.copies}
      maitrisees={lignes.filter((r) => r.maitrisee).map((r) => r.formule as string)}
      tourDepart={tour}
    />
  );
}
