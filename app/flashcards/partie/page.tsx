import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireMaitriseCompte, lireMatieresPartie, matieresDemandees } from "@/lib/flashcards/partie-serveur";
import { PartieDeCartes } from "@/components/flashcards/partie/PartieDeCartes";

export const metadata = { title: "Partie de cartes · Ranked Lobby" };

type PageProps = { searchParams?: Promise<{ matiere?: string | string[]; subject?: string | string[] }> };

// La partie de cartes : Léonard de Vinci, croupier, distribue les flashcards
// officielles comme au casino (voir lib/flashcards/partie.ts). Une seule
// page : « Prépare ta partie », la table, le bilan, en état côté navigateur
// (components/flashcards/partie/PartieDeCartes.tsx). Le serveur ne lit que de
// quoi préparer la donne : les matières avec leurs paquets et les
// identifiants de leurs cartes (client admin, comme la page d'une matière :
// les paquets officiels sont publics), et ce que le compte sait de la
// maîtrise du joueur (flashcard_progress ; rien si la table n'est pas encore
// créée, la maîtrise se lit alors sur l'appareil). Le texte des cartes ne
// vient qu'à la donne, des seules cartes tirées (app/api/flashcards/partie).
// ?matiere=fsa (ou ?subject=, comme la liste des flashcards) coche cette
// matière d'avance ; sinon, toutes celles qui ont des cartes.
export default async function PartieDeCartesPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const matieres = await lireMatieresPartie(createAdminClient());
  const { compte } = await lireMaitriseCompte(supabase, auth.user.id, matieres);

  return (
    <div className="rl-wide rl-page">
      <PartieDeCartes matieres={matieres} joueur={auth.user.id} compte={compte} cochees={matieresDemandees(sp.matiere, sp.subject)} />
    </div>
  );
}
