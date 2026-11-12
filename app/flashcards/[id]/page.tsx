import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FlashcardReview } from "@/components/FlashcardReview";
import { FlashcardCardEditor } from "@/components/FlashcardCardEditor";
import { RecentFlashcardSetTracker } from "@/components/RecentFlashcardSetTracker";
import { DisclosureRow, groupBySubject, plural, splitTitle, subjectOfFolder, subjectOfTitle } from "@/components/ContentDetailHeader";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { ListeCourte } from "@/components/ui/Decors";
import { RETOUR } from "@/lib/voice-reviser";
import { POSTE_CARTES } from "@/lib/voice-postes";
import poste from "@/components/reviser/Postes.module.css";
import { fichePaquetFile, memoPaquetImage, onePagerFile, subjectByKey } from "@/components/reviser/catalog";
import { Memo } from "@/components/flashcards/Memo";
import { RATIO_PAQUET, boitesMemo } from "@/lib/flashcards/memos";
import { numeroPaquet, themePaquet } from "@/lib/flashcards/paquets";
import { BOUCLE } from "@/lib/voice-z3c";
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
/** les paquets officiels publiés (même lecture que /flashcards/matiere/<clé>) */
type PaquetRow = { id: string; title: string; visibility: string | null; library_folders?: Dossier | Dossier[] };
const nomDuDossier = (f: PaquetRow["library_folders"]) => (Array.isArray(f) ? f[0] : f)?.name ?? null;

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
  // la seule ligne de l'en-tête : repère du paquet, cartes (sans Public / Privé) ; la matière est
  // déjà dans le retour
  const ligneEntete = [parts.lead, plural(cards.length, "carte", "cartes")].filter(Boolean).join(" · ");

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
  // Les autres paquets officiels de la même matière (la colonne grise) : même lecture que la page
  // de la matière, faite après la lecture du paquet par la RLS ; clé admin absente : pas de liste.
  const lireAutres = async (): Promise<{ id: string; title: string }[]> => {
    if (!set.is_official || !subject) return [];
    try {
      const { data } = await createAdminClient()
        .from("flashcard_sets")
        .select("id,title,visibility,library_folders(name)")
        .eq("is_official", true)
        .eq("official_published", true)
        .limit(200);
      const rows = (data ?? []) as unknown as PaquetRow[];
      const groupe = groupBySubject(rows.map((s) => ({ id: s.id, title: s.title, folder: nomDuDossier(s.library_folders), visibility: s.visibility })), {}).find(
        (g) => g.key === subject.key
      );
      return (groupe?.rows ?? []).filter((r) => r.kind === "set" && r.id !== id).map((r) => ({ id: r.id, title: r.title }));
    } catch {
      return [];
    }
  };

  const [onePager, fiche, memo, autres] = await Promise.all([
    onePagerSlug ? signer(onePagerFile(onePagerSlug)) : Promise.resolve(null),
    onePagerSlug && numero ? signer(fichePaquetFile(onePagerSlug, numero)) : Promise.resolve(null),
    // le mémo en image, dans la colonne grise à la place de « Toutes les cartes »
    onePagerSlug && numero ? signer(memoPaquetImage(onePagerSlug, numero)) : Promise.resolve(null),
    lireAutres(),
  ]);

  // Modèle des sous-pages (2026-11-12) : l'en-tête commun (retour à la matière, le thème du paquet,
  // une ligne et la pastille « Maîtrisé » ; aucun bouton), puis le cadre à zones : « Ta révision » à
  // gauche ; dans la colonne grise, les autres paquets de la matière, puis le mémo du paquet (la zone
  // de la carte à l'écran surlignée en jaune) ou, sans mémo, toutes les cartes repliées.
  const retour = subject ? { href: `/flashcards/matiere/${subject.key}`, label: subject.name } : RETOUR.flashcards;
  const avecMemo = !!(memo && onePagerSlug && numero);
  const titreDroite = autres.length ? POSTE_CARTES.autres : avecMemo ? POSTE_CARTES.memo : POSTE_CARTES.paquet;
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
        />
      }
    >
      <CadreZones
        gauche={{
          titre: POSTE_CARTES.revision,
          contenu: (
            <div className={poste.haut + " grid min-w-0"}>
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
          ),
        }}
        droite={{
          titre: titreDroite,
          contenu: (
            <>
              {autres.length > 0 && <ListeCourte lignes={autres.map((a) => ({ cle: a.id, titre: themePaquet(a.title), href: `/flashcards/${a.id}` }))} />}
              {memo && onePagerSlug && numero ? (
                <Memo
                  src={memo}
                  pdf={fiche}
                  titre={`${BOUCLE.memoPaquetTitre} · ${themePaquet(set.title)}`}
                  ratio={RATIO_PAQUET}
                  boites={boitesMemo(onePagerSlug, numero)}
                  positions={Object.fromEntries(cards.map((c, i) => [c.id, i + 1]))}
                />
              ) : (
                // toutes les cartes, en lecture seule (paquets sans mémo), repliées
                <div className="card divide-y divide-line overflow-hidden">
                  <DisclosureRow icon={<Layers size={18} aria-hidden />} title={t(locale, "flashcards.allCards")}>
                    <FlashcardCardEditor cards={cards} />
                  </DisclosureRow>
                </div>
              )}
            </>
          ),
        }}
      />
    </SousPage>
  );
}
