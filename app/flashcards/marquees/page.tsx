import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { plural } from "@/components/ContentDetailHeader";
import { FlashcardReview, type FlashcardCard } from "@/components/FlashcardReview";
import { SynchroMarquesCartes } from "@/components/flashcards/SynchroMarquesCartes";
import { lireCartesMarquees, ordreProgramme } from "@/lib/flashcards/marquees";
import { CadreZones, ColonneSeance, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { RETOUR } from "@/lib/voice-reviser";
import { POSTE_CARTES } from "@/lib/voice-postes";
import { MARQUE_CARTE } from "@/lib/voice-z3c";

export const metadata = { title: "Flashcards marquées · Ranked Lobby" };

// Les flashcards marquées du joueur (migration_flashcard_flags.sql), révisées
// d'un bloc avec la même boucle « À revoir » qu'un paquet (FlashcardReview),
// dans l'ordre du programme : matière, puis paquet, puis position. Chaque
// carte garde la répétition espacée de son paquet. La boucle est gardée sur
// l'appareil seulement (clé « marquees ») : la progression du compte
// (flashcard_progress) n'admet que les paquets et les matières, et la liste
// des marquées change d'un jour à l'autre. Une carte démarquée en route reste
// dans la boucle jusqu'au prochain passage ; une carte marquée depuis rejoint
// la boucle reprise (accueillirNouvelles). Rien de marqué : un état vide
// propre ; table pas encore créée : les marques sont gardées sur l'appareil,
// la page le dit (et se relit quand elles rejoignent le compte :
// SynchroMarquesCartes) ; lecture ratée : un mot neutre, sans état vide.
// Modèle des sous-pages (2026-11-12) : l'en-tête commun (retour aux flashcards),
// puis le cadre à une seule zone, « Tes cartes marquées », qui porte la révision
// (dans la colonne des séances, 760 px) ; l'état vide n'a pas de second retour.
export default async function FlashcardsMarqueesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [marquees, traitsJour] = await Promise.all([lireCartesMarquees(supabase), traitsDuJour(auth.user.id)]);
  const items = ordreProgramme(marquees.items);
  // l'en-tête de chaque fiche : « Fixed Income · Duration & convexity » (la matière change d'une carte à l'autre)
  const cards: FlashcardCard[] = items.map((c) => ({ id: c.cardId, front: c.front, back: c.back, setId: c.setId, theme: c.lieu }));
  const matieres = new Set(items.map((c) => c.matiereCle ?? c.lieu)).size;
  const titreVide = marquees.erreur ? MARQUE_CARTE.indisponibleTitre : MARQUE_CARTE.vide;

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          illustration={{ nom: "moi-marquees" }}
          retour={RETOUR.flashcards}
          titre={MARQUE_CARTE.titre}
          ligne={cards.length ? `${plural(cards.length, "carte", "cartes")} · ${MARQUE_CARTE.matieres(matieres)}` : undefined}
        />
      }
    >
      <CadreZones
        gauche={{
          titre: POSTE_CARTES.marquees,
          contenu: (
            <ColonneSeance>
              {cards.length ? (
                <FlashcardReview
                  cards={cards}
                  cle="marquees"
                  traitsJour={traitsJour}
                  ordre="programme"
                  autresHref="/flashcards"
                  joueur={auth.user.id}
                  sourceMarque="marquees"
                  accueillirNouvelles
                />
              ) : (
                <section className="card-quiet rl-in grid justify-items-start gap-4 px-6 py-10 sm:px-9 sm:py-12" aria-label={titreVide}>
                  <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-surface-2 text-muted" aria-hidden>
                    <Bookmark size={19} />
                  </span>
                  <div className="grid gap-2">
                    <h2 className="t-h2 m-0">{titreVide}</h2>
                    <p className="t-small m-0 max-w-[460px]">
                      {marquees.erreur ? MARQUE_CARTE.indisponible : marquees.available ? MARQUE_CARTE.videLigne : MARQUE_CARTE.sansTable}
                    </p>
                  </div>
                  {!marquees.erreur && <SynchroMarquesCartes />}
                </section>
              )}
            </ColonneSeance>
          ),
        }}
      />
    </SousPage>
  );
}
