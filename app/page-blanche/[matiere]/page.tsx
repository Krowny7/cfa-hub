import { notFound, redirect } from "next/navigation";
import { SessionPageBlanche } from "@/components/page-blanche/Session";
import { matiereDe } from "@/lib/formules";
import { topicLabel } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/server";
import { PB } from "@/lib/voice-page-blanche";

export const metadata = { title: "La page blanche · Ranked Lobby" };

// Une matière de la page blanche : seule sa partie du catalogue part au navigateur.
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
    <div className="rl-wide rl-page">
      <SessionPageBlanche
        matiere={matiere}
        nom={`${PB.titre} · ${topicLabel(matiere)}`}
        copies={m.copies}
        maitrisees={lignes.filter((r) => r.maitrisee).map((r) => r.formule as string)}
        tourDepart={tour}
      />
    </div>
  );
}
