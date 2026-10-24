import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FlashcardReview } from "@/components/FlashcardReview";
import { FlashcardCardEditor } from "@/components/FlashcardCardEditor";
import { ShareButton } from "@/components/ShareButton";
import { RecentFlashcardSetTracker } from "@/components/RecentFlashcardSetTracker";
import { ContentDetailHeader, DisclosureRow, plural, splitTitle, subjectOfFolder, subjectOfTitle, visibilityLabel } from "@/components/ContentDetailHeader";
import { onePagerFile, subjectByKey } from "@/components/reviser/catalog";
import { themePaquet } from "@/lib/flashcards/paquets";
import { cleSet, etatAffiche } from "@/lib/flashcards/progression";
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
    return (
      <div className="mx-auto grid max-w-[560px] justify-items-start gap-3 pt-4 md:pt-10">
        <p className="t-eyebrow">Flashcards</p>
        <h1 className="t-h1 m-0">{t(locale, "flashcards.notFound")}</h1>
        <p className="t-small">Il a peut-être été supprimé, ou il n&apos;est pas partagé avec toi.</p>
        <Link href="/flashcards" className="btn btn-secondary mt-3">
          Retour aux flashcards
        </Link>
      </div>
    );
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
  const eyebrow = [subject?.name, parts.lead].filter(Boolean).join(" · ") || null;

  // Le one-pager de la matière (une page A4, bucket privé « fiches », URL
  // signée d'une heure) : proposé en fin de boucle, absent s'il n'est pas en ligne.
  const onePagerSlug = subject ? subjectByKey(subject.key)?.onePager : null;
  const onePager = onePagerSlug
    ? await supabase.storage
        .from("fiches")
        .createSignedUrl(onePagerFile(onePagerSlug), 3600)
        .then((r) => (r.error ? null : (r.data?.signedUrl ?? null)))
        .catch(() => null)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-8 md:gap-10">
      <RecentFlashcardSetTracker id={id} title={set.title} />

      <ContentDetailHeader
        backHref="/flashcards"
        backLabel={t(locale, "nav.flashcards")}
        title={parts.main}
        eyebrow={eyebrow}
        meta={[plural(cards.length, "carte", "cartes"), visibilityLabel(set.visibility)]}
        etat={progressions ? <EtatPaquetVivant cle={cle} initial={ouJenSuis} total={cards.length} seulementFini /> : null}
        rightSlot={set.share_token ? <ShareButton token={set.share_token} base="flashcards" /> : null}
      />

      {/* La révision est l'usage quotidien : premier contenu visible, sans défilement */}
      <FlashcardReview
        cards={cards}
        setId={id}
        traitsJour={traitsJour}
        matiere={subject?.key}
        matiereNom={subject?.name ?? null}
        theme={themePaquet(set.title)}
        onePager={onePager}
        autresHref={subject ? `/flashcards?subject=${subject.key}#paquets` : "/flashcards"}
        compte={progressions ? { cle, ligne, lueA: Date.now() } : null}
        joueur={auth.user.id}
      />

      {/* Le set : toutes les cartes, en lecture seule (paquets officiels), repliées */}
      <section className="rl-section mt-6 md:mt-10" aria-labelledby="set-cartes">
        <h2 id="set-cartes" className="t-h3 m-0">
          Le set
        </h2>
        <div className="card divide-y divide-line overflow-hidden">
          <DisclosureRow
            icon={<Layers size={18} aria-hidden />}
            title={t(locale, "flashcards.allCards")}
            sub={`${plural(cards.length, "carte", "cartes")} · recto et verso`}
          >
            <FlashcardCardEditor cards={cards} />
          </DisclosureRow>
        </div>
      </section>
    </div>
  );
}
