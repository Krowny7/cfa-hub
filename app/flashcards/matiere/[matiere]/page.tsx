import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { CFA_SUBJECTS, groupBySubject } from "@/components/ContentDetailHeader";
import { FlashcardReview, type FlashcardCard } from "@/components/FlashcardReview";
import { MatiereVide } from "@/components/flashcards/Panneaux";
import { ChiffreVues, GrilleCartes } from "@/components/flashcards/GrilleCartes";
import { sourcesVues } from "@/components/flashcards/vues";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { ficheCartesFile, memoCartesImage, onePagerFile, subjectByKey } from "@/components/reviser/catalog";
import { themePaquet } from "@/lib/flashcards/paquets";
import { cleMatiere, cleSet, etatAffiche } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";
import { EtatPaquetVivant } from "@/components/flashcards/EtatPaquetVivant";
import { MATIERE_CARTES } from "@/lib/voice-z3c";
import { RETOUR } from "@/lib/voice-reviser";
import { GRILLE_CARTES as G } from "@/lib/voice-postes";
import poste from "@/components/reviser/Postes.module.css";

type PageProps = { params: Promise<{ matiere: string }>; searchParams?: Promise<{ revision?: string }> };
type Dossier = { name: string | null } | null;
type SetRow = { id: string; title: string; visibility: string | null; library_folders?: Dossier | Dossier[] };
const nomDossier = (f: SetRow["library_folders"]) => (Array.isArray(f) ? f[0] : f)?.name ?? null;
type CardRow = { id: string; front: string; back: string; position: number | null; set_id: string };

export async function generateMetadata({ params }: PageProps) {
  const { matiere } = await params;
  const subject = CFA_SUBJECTS.find((s) => s.key === matiere);
  return { title: subject ? `Flashcards ${subject.name} · Ranked Lobby` : "Flashcards · Ranked Lobby" };
}

// Toute une matière (Réviser A, « le lieu, puis l'objet », 2026-11-13) : la porte (retour aux
// flashcards, la matière, le chiffre-héros des cartes vues), puis UN objet : la grille des 60 cartes,
// un rang par paquet, celles pas encore vues de dos (GrilleCartes) ; le nom d'un rang ouvre son paquet
// seul (/flashcards/<id>, une option de cette page), comme chaque carte de son rang. L'action à
// l'encre lance la révision de toute la matière (?revision=1 ; le bouton reste enfoncé et l'encre
// pulse pendant le chargement : AttenteLien de SousPage) : la même boucle « À revoir » qu'avant (FlashcardReview), gardée sous sa clé
// « matiere:<clé> », chaque carte gardant la répétition espacée de son paquet ; le one-pager est
// proposé en fin de boucle. À côté, à contour : la partie de cartes de la matière et le mémo des
// cartes (PDF). Une matière sans cartes affiche un état vide propre.
export default async function FlashcardsMatierePage({ params, searchParams }: PageProps) {
  const { matiere } = await params;
  const enRevision = ((await searchParams) ?? {}).revision === "1";
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

  const user = auth.user;
  const ids = cards.map((c) => c.id);
  const src = sourcesVues({
    lignes: progressions,
    cles: [cle, ...paquets.map((p) => cleSet(p.id))],
    ids,
    paquets: paquets.map((p) => p.id),
    joueur: user.id,
  });
  const ici = `/flashcards/matiere/${subject.key}`;
  const entame = !!ouJenSuis && !ouJenSuis.fini;

  // la ligne d'état : les paquets, puis où en est la boucle de la matière (le nombre de cartes est
  // déjà dans le chiffre-héros : « 38 VUES SUR 60 »)
  const ligne = (
    <span className="inline-flex min-h-[26px] flex-wrap items-center gap-x-3 gap-y-1">
      <span>{MATIERE_CARTES.paquets(paquets.length)}</span>
      {cards.length && progressions ? <EtatPaquetVivant cle={cle} initial={ouJenSuis} total={cards.length} /> : null}
    </span>
  );
  const entete = (
    <EnTeteSousPage
      illustration={{ nom: "reviser-casier" }}
      retour={enRevision ? { href: ici, label: subject.name } : RETOUR.flashcards}
      titre={subject.name}
      ligne={ligne}
      heros={cards.length ? { valeur: <ChiffreVues src={src} ids={ids} />, legende: G.herosLegende(cards.length) } : null}
    />
  );

  if (!cards.length) {
    return (
      <SousPage entete={entete}>
        <Scene>
          <MatiereVide matiere={subject.name} onePager={onePager} />
        </Scene>
      </SousPage>
    );
  }

  if (enRevision) {
    return (
      <SousPage entete={entete}>
        <Scene>
          <div className={poste.haut + " grid min-w-0"}>
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
          </div>
        </Scene>
      </SousPage>
    );
  }

  const rangs = paquets.map((p, i) => ({
    cle: p.id,
    href: `/flashcards/${p.id}`,
    titre: G.paquet(i + 1, themePaquet(p.title)),
    cartes: cards.filter((c) => c.setId === p.id).map((c) => ({ id: c.id, recto: c.front })),
  }));
  const memo = ficheCartes ?? memoCartes;
  return (
    <SousPage entete={entete}>
      <Scene>
        <GrilleCartes
          rangs={rangs}
          src={src}
          actions={{
            encre: { href: `${ici}?revision=1`, texte: entame ? G.reprendre : G.reviser(cards.length) },
            options: [
              { cle: "partie", href: `/flashcards/partie?matiere=${encodeURIComponent(subject.key)}`, texte: G.partie },
              ...(memo ? [{ cle: "memo", href: memo, texte: G.memo, aide: G.memoAide(cards.length), nouvelOnglet: true }] : []),
            ],
          }}
        />
      </Scene>
    </SousPage>
  );
}
