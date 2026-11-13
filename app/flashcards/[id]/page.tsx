import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FlashcardReview } from "@/components/FlashcardReview";
import { FlashcardCardEditor } from "@/components/FlashcardCardEditor";
import { RecentFlashcardSetTracker } from "@/components/RecentFlashcardSetTracker";
import { DisclosureRow, splitTitle, subjectOfFolder, subjectOfTitle } from "@/components/ContentDetailHeader";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { ChiffreVues } from "@/components/flashcards/GrilleCartes";
import { sourcesVues } from "@/components/flashcards/vues";
import { RETOUR } from "@/lib/voice-reviser";
import { GRILLE_CARTES, POSTE_CARTES } from "@/lib/voice-postes";
import pq from "@/components/flashcards/Paquet.module.css";
import { fichePaquetFile, memoPaquetImage, onePagerFile, subjectByKey } from "@/components/reviser/catalog";
import { Memo } from "@/components/flashcards/Memo";
import { RATIO_PAQUET, boitesMemo } from "@/lib/flashcards/memos";
import { numeroPaquet, themePaquet } from "@/lib/flashcards/paquets";
import { BOUCLE } from "@/lib/voice-z3c";
import { cleMatiere, cleSet, etatAffiche } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";
import { EtatPaquetVivant } from "@/components/flashcards/EtatPaquetVivant";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import type { Flashcard } from "@/lib/types";

type Dossier = { name: string | null } | null;
type SetRow = {
  id: string;
  title: string;
  visibility: string;
  share_token: string | null;
  is_official: boolean | null;
  folder_id: string | null;
  library_folders?: Dossier | Dossier[];
};
type PageProps = { params: Promise<{ id: string }> };

export default async function FlashcardSetPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const cle = cleSet(id);
  const [{ data: setData, error: setErr }, { data: cardsData }, traitsJour, progressions] = await Promise.all([
    supabase.from("flashcard_sets").select("id,title,visibility,share_token,is_official,folder_id,library_folders(name)").eq("id", id).maybeSingle(),
    supabase.from("flashcards").select("id,front,back,position,topic_id").eq("set_id", id).order("position", { ascending: true }),
    // traits du jour (lecture de la barre du haut, en cache) : le sceau du jour en fin de passe
    traitsDuJour(auth.user.id),
    // la boucle de ce paquet sur le compte (null : table pas encore créée, la boucle reste sur l'appareil)
    lireProgressions(supabase, auth.user.id, [cle]),
  ]);

  if (setErr || !setData) {
    // le retour de l'en-tête ramène aux flashcards : pas de second bouton
    return <SousPage entete={<EnTeteSousPage retour={RETOUR.flashcards} illustration={{ nom: "reviser-casier" }} titre={t(locale, "flashcards.notFound")} ligne={BOUCLE.paquetIntrouvable} />} />;
  }

  const set = setData as unknown as SetRow;
  const ligne = progressions?.get(cle) ?? null;
  const cards = (cardsData ?? []) as Pick<Flashcard, "id" | "front" | "back" | "position">[];
  // réparée comme dans la révision : cartes retirées ôtées, cartes ajoutées depuis la fin : plus « Maîtrisé »
  const ouJenSuis = etatAffiche(ligne, cards.map((c) => c.id));

  const parts = splitTitle(set.title);
  // La matière : par le dossier « (Système) » d'abord, sinon par le début du
  // titre. La RLS des dossiers (folders_select_own) ne montre un dossier qu'à
  // son propriétaire : la jointure ci-dessus ne sert qu'aux paquets perso de
  // leur auteur. Pour un paquet officiel, le nom du dossier est lu avec le
  // client admin, une fois l'accès au paquet vérifié par la RLS (lecture
  // réussie plus haut) : seul le nom du dossier Système est exposé, et la
  // page dit la même chose que la page matière.
  const jointure = Array.isArray(set.library_folders) ? set.library_folders[0] : set.library_folders;
  let nomDossier = jointure?.name ?? null;
  if (!nomDossier && set.is_official && set.folder_id) {
    try {
      const { data: f } = await createAdminClient().from("library_folders").select("name").eq("id", set.folder_id).maybeSingle();
      nomDossier = (f as { name: string | null } | null)?.name ?? null;
    } catch {
      // clé admin absente : la matière par le titre
    }
  }
  const subject = subjectOfFolder(nomDossier) ?? subjectOfTitle(set.title);
  // la seule ligne de l'en-tête : le repère du paquet (« Set 1/4 ») ; le nombre de cartes est dans le
  // chiffre-héros, la matière dans le retour
  const ligneEntete = parts.lead;

  // Le one-pager de la matière (une page A4, bucket privé « fiches », URL
  // signée d'une heure) : proposé en fin de boucle, absent s'il n'est pas en ligne.
  const onePagerSlug = subject ? subjectByKey(subject.key)?.onePager : null;
  // La mini-fiche du paquet (une page A5, les notions de ses cartes seulement), même bucket : le PDF du mémo.
  const numero = set.is_official ? numeroPaquet(set.title) : null;
  const signer = (fichier: string) =>
    supabase.storage
      .from("fiches")
      .createSignedUrl(fichier, 3600)
      .then((r) => (r.error ? null : (r.data?.signedUrl ?? null)))
      .catch(() => null);
  const [onePager, fiche, memo, lignesMatiere] = await Promise.all([
    onePagerSlug ? signer(onePagerFile(onePagerSlug)) : Promise.resolve(null),
    onePagerSlug && numero ? signer(fichePaquetFile(onePagerSlug, numero)) : Promise.resolve(null),
    // le mémo en image, dans la colonne grise à la place de « Toutes les cartes »
    onePagerSlug && numero ? signer(memoPaquetImage(onePagerSlug, numero)) : Promise.resolve(null),
    // la boucle de toute la matière, pour les cartes déjà vues du paquet (chiffre-héros)
    subject && progressions ? lireProgressions(supabase, auth.user.id, [cleMatiere(subject.key)]) : Promise.resolve(null),
  ]);

  // Réviser A (2026-11-13) : le paquet est une option de la page de sa matière (la grille des cartes,
  // un rang par paquet : son nom mène ici). La porte : retour à la matière, le thème du paquet, la
  // pastille « Maîtrisé », le chiffre-héros des cartes vues ; puis UNE scène : la révision du paquet
  // et, à sa droite dès 1100 px (collé en haut pendant le défilement), le mémo du paquet, dont la zone
  // de la carte à l'écran est surlignée : on voit la carte et sa zone ensemble ; dessous en plus
  // étroit. Sans mémo, toutes les cartes repliées sous la révision. Les autres paquets sont sur la
  // grille de la matière (le retour).
  const retour = subject ? { href: `/flashcards/matiere/${subject.key}`, label: subject.name } : RETOUR.flashcards;
  const ids = cards.map((c) => c.id);
  const avecMemo = !!(memo && onePagerSlug && numero);
  const lignesVues = new Map([...(progressions ?? new Map()), ...(lignesMatiere ?? new Map())]);
  const src = sourcesVues({
    lignes: progressions || lignesMatiere ? lignesVues : null,
    cles: subject ? [cle, cleMatiere(subject.key)] : [cle],
    ids,
    paquets: [id],
    joueur: auth.user.id,
  });
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          illustration={{ nom: "reviser-casier" }}
          retour={retour}
          titre={parts.main}
          ligne={
            <span className="inline-flex min-h-[26px] flex-wrap items-center gap-x-3 gap-y-1">
              <span>{ligneEntete}</span>
              {progressions ? <EtatPaquetVivant cle={cle} initial={ouJenSuis} total={cards.length} seulementFini /> : null}
            </span>
          }
          heros={cards.length ? { valeur: <ChiffreVues src={src} ids={ids} />, legende: GRILLE_CARTES.herosLegende(cards.length) } : null}
        />
      }
    >
      <Scene>
        <div className={pq.paquet} data-memo={avecMemo ? "1" : undefined}>
          <div className={pq.revision}>
            <RecentFlashcardSetTracker id={id} title={set.title} />
            <FlashcardReview
              cards={cards}
              setId={id}
              traitsJour={traitsJour}
              matiere={subject?.key}
              matiereNom={subject?.name ?? null}
              theme={themePaquet(set.title)}
              onePager={onePager}
              autresHref={subject ? `/flashcards/matiere/${subject.key}` : "/flashcards"}
              compte={progressions ? { cle, ligne, lueA: Date.now() } : null}
              joueur={auth.user.id}
            />
          </div>
          {memo && onePagerSlug && numero ? (
            <aside className={pq.memo} aria-label={POSTE_CARTES.memo}>
              <Memo
                src={memo}
                pdf={fiche}
                titre={`${BOUCLE.memoPaquetTitre} · ${themePaquet(set.title)}`}
                ratio={RATIO_PAQUET}
                boites={boitesMemo(onePagerSlug, numero)}
                positions={Object.fromEntries(cards.map((c, i) => [c.id, i + 1]))}
              />
            </aside>
          ) : (
            // toutes les cartes, en lecture seule (paquets sans mémo), repliées
            <div className="card divide-y divide-line overflow-hidden">
              <DisclosureRow icon={<Layers size={18} aria-hidden />} title={t(locale, "flashcards.allCards")}>
                <FlashcardCardEditor cards={cards} />
              </DisclosureRow>
            </div>
          )}
        </div>
      </Scene>
    </SousPage>
  );
}
