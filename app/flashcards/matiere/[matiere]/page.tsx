import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { CFA_SUBJECTS, ContentDetailHeader, groupBySubject, plural } from "@/components/ContentDetailHeader";
import { FlashcardReview, type FlashcardCard } from "@/components/FlashcardReview";
import { LienOnePager, MatiereVide, PaquetsDeLaMatiere } from "@/components/flashcards/Panneaux";
import { onePagerFile, subjectByKey } from "@/components/reviser/catalog";
import { themePaquet } from "@/lib/flashcards/paquets";
import { MATIERE_CARTES } from "@/lib/voice-z3c";

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
// paquet. En tête, le one-pager de la matière : les deux font la révision
// d'une nuit. Une matière sans cartes affiche un état vide propre.
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

  // Les paquets de la matière, rangés comme dans la liste (Set 1/4, 2/4…).
  const sets = (setsRes.data ?? []) as unknown as SetRow[];
  const groupe = groupBySubject(sets.map((s) => ({ id: s.id, title: s.title, folder: nomDossier(s.library_folders), visibility: s.visibility })), {}).find(
    (g) => g.key === subject.key
  );
  const paquets = (groupe?.rows ?? []).filter((r) => r.kind === "set");
  const rang = new Map(paquets.map((p, i) => [p.id, i]));

  let cards: FlashcardCard[] = [];
  if (paquets.length) {
    const { data } = await admin
      .from("flashcards")
      .select("id,front,back,position,set_id")
      .in(
        "set_id",
        paquets.map((p) => p.id)
      )
      .order("position", { ascending: true });
    const themes = new Map(paquets.map((p) => [p.id, themePaquet(p.title)]));
    cards = ((data ?? []) as CardRow[])
      .slice()
      .sort((x, y) => (rang.get(x.set_id) ?? 0) - (rang.get(y.set_id) ?? 0) || (x.position ?? 0) - (y.position ?? 0))
      .map((c) => ({ id: c.id, front: c.front, back: c.back, setId: c.set_id, theme: themes.get(c.set_id) ?? null }));
  }

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-8 md:gap-10">
      <ContentDetailHeader
        backHref={`/flashcards?subject=${subject.key}#paquets`}
        backLabel="Flashcards"
        title={subject.name}
        eyebrow={MATIERE_CARTES.surTitre}
        meta={cards.length ? [plural(cards.length, "carte", "cartes"), MATIERE_CARTES.paquets(paquets.length)] : []}
        rightSlot={onePager ? <LienOnePager href={onePager} className="btn btn-secondary btn-sm min-h-[44px]" /> : null}
      />

      {cards.length ? (
        <>
          <FlashcardReview
            cards={cards}
            cle={`matiere:${subject.key}`}
            traitsJour={traitsJour}
            matiere={subject.key}
            matiereNom={subject.name}
            onePager={onePager}
            autresHref={`/flashcards?subject=${subject.key}#paquets`}
            ordre="programme"
          />
          <PaquetsDeLaMatiere paquets={paquets.map((p) => ({ id: p.id, theme: themePaquet(p.title), cartes: cards.filter((c) => c.setId === p.id).length }))} />
        </>
      ) : (
        <MatiereVide matiere={subject.name} onePager={onePager} />
      )}
    </div>
  );
}
