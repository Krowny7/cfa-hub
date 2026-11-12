import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { CFA_SUBJECTS, groupBySubject, plural } from "@/components/ContentDetailHeader";
import { FlashcardReview, type FlashcardCard } from "@/components/FlashcardReview";
import { MatiereVide } from "@/components/flashcards/Panneaux";
import { MemoMini } from "@/components/flashcards/MemoMini";
import { EtatPaquetListe } from "@/components/flashcards/EtatPaquetListe";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { ListeCourte } from "@/components/ui/Decors";
import { ficheCartesFile, memoCartesImage, onePagerFile, subjectByKey } from "@/components/reviser/catalog";
import { RATIO_CARTES } from "@/lib/flashcards/memos";
import { themePaquet } from "@/lib/flashcards/paquets";
import { BOUCLE } from "@/lib/voice-z3c";
import { cleMatiere, cleSet, etatAffiche, etatListe } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";
import { EtatPaquetVivant } from "@/components/flashcards/EtatPaquetVivant";
import { MATIERE_CARTES } from "@/lib/voice-z3c";
import { RETOUR } from "@/lib/voice-reviser";
import { POSTE_CARTES } from "@/lib/voice-postes";
import poste from "@/components/reviser/Postes.module.css";

type PageProps = { params: Promise<{ matiere: string }> };
type Dossier = { name: string | null } | null;
type SetRow = { id: string; title: string; visibility: string | null; library_folders?: Dossier | Dossier[] };
const nomDossier = (f: SetRow["library_folders"]) => (Array.isArray(f) ? f[0] : f)?.name ?? null;
type CardRow = { id: string; front: string; back: string; position: number | null; set_id: string };

export async function generateMetadata({ params }: PageProps) {
  const { matiere } = await params;
  const subject = CFA_SUBJECTS.find((s) => s.key === matiere);
  return { title: subject ? `Flashcards ${subject.name} · Ranked Lobby` : "Flashcards · Ranked Lobby" };
}

// Toute une matière d'un bloc : les paquets officiels de la matière (4 × 15
// cartes), dans l'ordre paquet puis position, révisés avec la même boucle
// « À revoir » qu'un paquet (FlashcardReview), gardée sous sa propre clé
// (« matiere:fixed_income »). Chaque carte garde la répétition espacée de son
// paquet. Le one-pager de la matière est proposé en fin de boucle : les deux
// font la révision d'une nuit. Une matière sans cartes affiche un état vide propre.
// La boucle de la matière et celles des paquets sont aussi sur le compte
// (flashcard_progress, seulement ces clés-là) : l'en-tête dit quand la matière
// est maîtrisée, la liste des paquets où en est chacun, réparés sur les cartes
// actuelles (rien si la table n'est pas encore créée).
// Modèle des sous-pages (2026-11-12) : l'en-tête (retour aux flashcards), puis le
// cadre à zones : « Ta révision » à gauche, « Les paquets » dans la colonne grise
// (les 4 paquets et leur état, puis le mémo des 60 cartes en petit).
export default async function FlashcardsMatierePage({ params }: PageProps) {
  const { matiere } = await params;
  const subject = CFA_SUBJECTS.find((s) => s.key === matiere);
  if (!subject) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const admin = createAdminClient();
  const onePagerSlug = subjectByKey(subject.key)?.onePager ?? null;

  const [setsRes, onePager, traitsJour] = await Promise.all([
    admin
      .from("flashcard_sets")
      .select("id,title,visibility,library_folders(name)")
      .eq("is_official", true)
      .eq("official_published", true)
      .limit(200),
    // le one-pager (bucket privé « fiches », URL signée d'une heure), absent s'il n'est pas en ligne
    onePagerSlug
      ? supabase.storage
          .from("fiches")
          .createSignedUrl(onePagerFile(onePagerSlug), 3600)
          .then((r) => (r.error ? null : (r.data?.signedUrl ?? null)))
          .catch(() => null)
      : Promise.resolve(null),
    traitsDuJour(auth.user.id),
  ]);
  const cle = cleMatiere(subject.key);

  // Les paquets de la matière, rangés comme dans la liste (Set 1/4, 2/4…).
  const sets = (setsRes.data ?? []) as unknown as SetRow[];
  const groupe = groupBySubject(sets.map((s) => ({ id: s.id, title: s.title, folder: nomDossier(s.library_folders), visibility: s.visibility })), {}).find(
    (g) => g.key === subject.key
  );
  const paquets = (groupe?.rows ?? []).filter((r) => r.kind === "set");
  const rang = new Map(paquets.map((p, i) => [p.id, i]));

  // le mémo des cartes de la matière (bucket privé « fiches », URL signées d'une heure, une seule
  // requête) : son image et son PDF ; absent, pas de mémo (la mini-fiche de chaque paquet est sur
  // la page du paquet)
  const fichiers = onePagerSlug ? [ficheCartesFile(onePagerSlug), memoCartesImage(onePagerSlug)] : [];
  const [lignes, progressions, fiches] = await Promise.all([
    paquets.length
      ? admin
          .from("flashcards")
          .select("id,front,back,position,set_id")
          .in(
            "set_id",
            paquets.map((p) => p.id)
          )
          .order("position", { ascending: true })
          .then((r) => (r.data ?? []) as CardRow[])
      : Promise.resolve([] as CardRow[]),
    // les boucles de la matière et de ses paquets seulement
    lireProgressions(supabase, auth.user.id, [cle, ...paquets.map((p) => cleSet(p.id))]),
    fichiers.length
      ? supabase.storage
          .from("fiches")
          .createSignedUrls(fichiers, 3600)
          .then((r) => new Map((r.data ?? []).filter((x) => !x.error && x.path && x.signedUrl).map((x) => [x.path as string, x.signedUrl] as [string, string])))
          .catch(() => new Map<string, string>())
      : Promise.resolve(new Map<string, string>()),
  ]);
  const ficheCartes = onePagerSlug ? (fiches.get(ficheCartesFile(onePagerSlug)) ?? null) : null;
  const memoCartes = onePagerSlug ? (fiches.get(memoCartesImage(onePagerSlug)) ?? null) : null;

  let cards: FlashcardCard[] = [];
  if (paquets.length) {
    const themes = new Map(paquets.map((p) => [p.id, themePaquet(p.title)]));
    cards = lignes
      .slice()
      .sort((x, y) => (rang.get(x.set_id) ?? 0) - (rang.get(y.set_id) ?? 0) || (x.position ?? 0) - (y.position ?? 0))
      .map((c) => ({ id: c.id, front: c.front, back: c.back, setId: c.set_id, theme: themes.get(c.set_id) ?? null }));
  }
  const ligneMatiere = progressions?.get(cle) ?? null;
  const ouJenSuis = etatAffiche(ligneMatiere, cards.map((c) => c.id));
  const idsDe = (setId: string) => cards.filter((c) => c.setId === setId).map((c) => c.id);

  // L'en-tête : retour aux flashcards, la matière, une ligne (les paquets sont dans la colonne grise,
  // l'avancée du tour sous la révision : la pastille ne dit que « Maîtrisé ») ; aucun bouton.
  const ligneEntete = [MATIERE_CARTES.toute, ...(cards.length ? [plural(cards.length, "carte", "cartes")] : [])].join(" · ");
  const user = auth.user;
  const memoTitre = BOUCLE.memoCartesTitre(cards.length || 60);
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          illustration={{ nom: "reviser-casier" }}
          retour={RETOUR.flashcards}
          titre={subject.name}
          ligne={
            <span className="inline-flex min-h-[26px] flex-wrap items-center gap-x-3 gap-y-1">
              <span>{ligneEntete}</span>
              {cards.length && progressions ? <EtatPaquetVivant cle={cle} initial={ouJenSuis} total={cards.length} seulementFini /> : null}
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
              {cards.length ? (
                <FlashcardReview
                  cards={cards}
                  cle={`matiere:${subject.key}`}
                  traitsJour={traitsJour}
                  matiere={subject.key}
                  matiereNom={subject.name}
                  onePager={onePager}
                  autresHref={`/flashcards?subject=${subject.key}`}
                  ordre="programme"
                  compte={progressions ? { cle, ligne: ligneMatiere, lueA: Date.now() } : null}
                  joueur={user.id}
                />
              ) : (
                <MatiereVide matiere={subject.name} onePager={onePager} />
              )}
            </div>
          ),
        }}
        droite={
          paquets.length
            ? {
                titre: POSTE_CARTES.paquets,
                contenu: (
                  <>
                    <ListeCourte
                      lignes={paquets.map((p) => ({
                        cle: p.id,
                        titre: themePaquet(p.title),
                        // où en est le paquet (rien tant que sa boucle n'est pas commencée)
                        detail: progressions ? (
                          <EtatPaquetListe etat={etatListe(cleSet(p.id), progressions.get(cleSet(p.id)), idsDe(p.id), user.id)} />
                        ) : undefined,
                        href: `/flashcards/${p.id}`,
                      }))}
                    />
                    {memoCartes && <MemoMini src={memoCartes} href={ficheCartes ?? memoCartes} titre={memoTitre} aide={POSTE_CARTES.memoOuvrir(cards.length || 60)} ratio={RATIO_CARTES} />}
                  </>
                ),
              }
            : undefined
        }
      />
    </SousPage>
  );
}
