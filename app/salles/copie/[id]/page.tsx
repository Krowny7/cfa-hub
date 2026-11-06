import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RevueSalle } from "@/components/salles/RevueSalle";
import { Stage } from "@/components/salles/Stage";
import { lireCopieSalle, type CopieSalle } from "@/lib/salles/copie";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITES } from "@/lib/voice-moi";

export const metadata = { title: "Ta copie · Ranked Lobby" };

// Ta copie d'une partie de Salle passée : la même correction qu'à la fin de la partie
// (RevueSalle), lisible à tout moment depuis Moi › Activités.
export default async function CopieSallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  let copie: CopieSalle | null = null;
  try {
    copie = await lireCopieSalle(createAdminClient(), id, auth.user.id, Date.now());
  } catch {
    copie = null;
  }
  if (!copie) notFound();

  return (
    <div className="rl-wide rl-page flex flex-col gap-4">
      <Link href="/moi?onglet=activites" className="t-small w-fit font-semibold">
        ← {ACTIVITES.titre}
      </Link>
      <Stage>
        <RevueSalle revue={copie.revue} numero={copie.numero} titre={copie.titre} retest />
      </Stage>
    </div>
  );
}
