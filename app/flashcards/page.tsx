import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";
import { CoteCroupier } from "@/components/reviser/CoteCroupier";
import { PARTIE_ENTREE } from "@/lib/voice-partie";
import { subjectFromParam } from "@/components/ContentDetailHeader";

type SearchParams = { view?: string; subject?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

// Les flashcards (disposition de Théo, 2026-11-12) : l'en-tête commun des sous-pages, puis le cadre
// principal : le carrousel des 10 paquets à gauche (un clic sur le paquet de devant ouvre la
// révision de sa matière, /flashcards/matiere/<clé>, avec ses paquets et son mémo), Léonard et le
// petit tapis vert de la partie de cartes à droite. Pas d'annexe.
export default async function FlashcardsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  // L'ancienne vue Communauté (?view=community&scope=…&q=…) n'existe plus :
  // retour propre sur les paquets officiels, la matière gardée si elle est donnée.
  if (sp.view === "community") redirect(sp.subject ? `/flashcards?subject=${encodeURIComponent(sp.subject)}` : "/flashcards");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const subjectsAvail = await loadSubjectsSafe(supabase, user.id);

  // « La partie de cartes » (Léonard, croupier) : la matière passée en paramètre est cochée d'avance,
  // et le carrousel s'ouvre sur elle
  const matierePartie = subjectFromParam(sp.subject);
  const hrefPartie = matierePartie ? `/flashcards/partie?matiere=${encodeURIComponent(matierePartie.key)}` : "/flashcards/partie";

  return (
    <ListeReviser
      kind="cartes"
      subjects={subjectsAvail}
      titreCroupier={PARTIE_ENTREE.titreZone}
      choisie={matierePartie?.key}
      croupier={
        <CoteCroupier href={hrefPartie} aide={matierePartie ? PARTIE_ENTREE.ligneMatiere(matierePartie.name) : PARTIE_ENTREE.aide} />
      }
    />
  );
}
