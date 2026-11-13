import { notFound, redirect } from "next/navigation";
import { SessionPageBlanche } from "@/components/page-blanche/Session";
import { liensCalculs } from "@/components/page-blanche/liens-calculs";
import { matiereDe } from "@/lib/formules";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "La page blanche · Ranked Lobby" };

// Une matière de la page blanche : seule sa partie du catalogue part au navigateur.
// Le calcul de chaque formule (lien sous un oubli) est trouvé ici : le catalogue des calculs reste
// sur le serveur. La page (porte, feuille nue) est rendue par SessionPageBlanche ; le
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
      liens={liensCalculs(matiere, m.copies)}
    />
  );
}
