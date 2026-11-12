import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ficheCartesFile, memoCartesImage, subjectByKey } from "@/components/reviser/catalog";
import { Memo } from "@/components/flashcards/Memo";
import { RATIO_CARTES } from "@/lib/flashcards/memos";
import { BOUCLE } from "@/lib/voice-z3c";
import { createAdminClient } from "@/lib/supabase/admin";
import { FlashcardPaquets, flashcardGroups, flashcardPaquets, paquetsDeMatiere } from "@/components/FlashcardSubjectGrid";
import type { ContentSetRow } from "@/components/ContentListPage";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";
import { RV } from "@/lib/voice-reviser";
import { cleMatiere, cleSet, etatListe, type EtatListe } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";
import { clesAvances, suiviProgramme } from "@/lib/flashcards/avancement";
import { compterCartesMarquees } from "@/lib/flashcards/marquees";
import { SynchroMarquesCartes } from "@/components/flashcards/SynchroMarquesCartes";
import { MARQUE_CARTE } from "@/lib/voice-z3c";
import { ActionContour } from "@/components/ui/SousPage";
import { CoteCroupier } from "@/components/reviser/CoteCroupier";
import { PARTIE_ENTREE } from "@/lib/voice-partie";
import { subjectFromParam } from "@/components/ContentDetailHeader";

type FlashcardRow = ContentSetRow & {
  is_official?: boolean | null;
  official_published?: boolean | null;
};

type SearchParams = { view?: string; subject?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

// Les flashcards du site sont les paquets officiels (« Système ») : on ne crée
// ni n'importe de paquet. La liste suit le gabarit commun de Réviser (en-tête
// avec « Partie de cartes » et « Marquées » à contour, rangée héros : la carte
// « ta suite » qui reprend le dernier paquet et la peinture du lieu « Le
// casier » ; index du programme, puis les paquets
// de la matière choisie, chacun avec où en est sa boucle sur le compte :
// flashcard_progress, puis relue sur l'appareil s'il a plus récent ; rien si
// la table n'est pas encore créée). Dans l'index du programme, chaque matière
// montre ses cartes déjà vues et une pastille par paquet (lib/flashcards/
// avancement.ts : toutes les boucles des paquets et des matières, en une
// seule lecture). Dans l'en-tête, « Flashcards marquées · N » vers leur
// révision (/flashcards/marquees), seulement s'il y en a (rien sans la
// table) ; des marques gardées sur l'appareil qui rejoignent le compte font
// relire la page une fois (SynchroMarquesCartes), pour que l'entrée
// apparaisse.
export default async function FlashcardsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  // L'ancienne vue Communauté (?view=community&scope=…&q=…) n'existe plus :
  // retour propre sur les paquets officiels, la matière gardée si elle est donnée.
  if (sp.view === "community") redirect(sp.subject ? `/flashcards?subject=${encodeURIComponent(sp.subject)}` : "/flashcards");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: systemData } = await admin
    .from("flashcard_sets")
    .select("id,title,visibility,created_at,is_official,official_published,subject,library_folders(name)")
    .eq("is_official", true)
    .eq("official_published", true)
    .order("created_at", { ascending: false })
    .limit(200);

  const system = (systemData ?? []) as unknown as FlashcardRow[];
  const systemIds = system.map((s) => s.id);

  // Nombre de cartes par paquet (repli : sans chiffres).
  const counts: Record<string, number> = {};
  if (systemIds.length) {
    try {
      const { data, error } = await admin.from("flashcard_sets").select("id, flashcards(count)").in("id", systemIds);
      if (!error) {
        for (const r of (data ?? []) as { id: string; flashcards: { count: number }[] | null }[]) {
          const n = r.flashcards?.[0]?.count;
          if (typeof n === "number") counts[r.id] = n;
        }
      }
    } catch {
      // pas de compte de cartes
    }
  }

  // « Pour commencer » : le premier paquet de la première matière qui en a.
  const groups = flashcardGroups(system, counts);
  const firstGroup = groups.find((g) => g.rows.length > 0 && !g.key.startsWith("x-")) ?? groups.find((g) => g.rows.length > 0);
  const first = firstGroup?.rows[0] ?? null;
  const subjects: Record<string, string> = {};
  for (const g of groups) if (!g.key.startsWith("x-")) for (const r of g.rows) subjects[r.id] = g.name;

  // les boucles lues sur le compte, en une requête : celles de la matière
  // affichée (paquets et matière) et, pour l'index du programme, celles de
  // tous les paquets et de toutes les matières
  const paquets = flashcardPaquets(system, counts, sp.subject);
  const cles = [
    ...new Set([...(paquets?.groups ?? []).flatMap((g) => [...g.rows.map((r) => cleSet(r.id)), cleMatiere(g.key)]), ...clesAvances(groups)]),
  ];
  // le mémo de toutes les cartes de la matière affichée (Fixed Income d'abord), sous ses paquets
  const slugMemo = paquets?.groups.length === 1 ? (subjectByKey(paquets.groups[0].key)?.onePager ?? null) : null;
  const memo = slugMemo
    ? await supabase.storage
        .from("fiches")
        .createSignedUrls([memoCartesImage(slugMemo), ficheCartesFile(slugMemo)], 3600)
        .then((r) => {
          const u = new Map((r.data ?? []).filter((x) => !x.error && x.path && x.signedUrl).map((x) => [x.path as string, x.signedUrl] as [string, string]));
          const img = u.get(memoCartesImage(slugMemo));
          return img ? { img, pdf: u.get(ficheCartesFile(slugMemo)) ?? null } : null;
        })
        .catch(() => null)
    : null;
  const [subjectsAvail, progressions, nMarquees] = await Promise.all([
    loadSubjectsSafe(supabase, user.id),
    lireProgressions(supabase, user.id, cles),
    // les flashcards marquées (null : table pas encore créée)
    compterCartesMarquees(supabase),
  ]);
  // où en est chaque boucle, par clé « set:<id> » / « matiere:<clé> » ; le
  // nombre de cartes compte celles ajoutées depuis une boucle bouclée
  const etats: Record<string, EtatListe> = {};
  if (progressions) {
    for (const g of paquets?.groups ?? []) {
      for (const r of g.rows) etats[cleSet(r.id)] = etatListe(cleSet(r.id), progressions.get(cleSet(r.id)), counts[r.id], user.id);
      const duBloc = paquetsDeMatiere(g);
      if (duBloc.length) {
        const total = duBloc.every((r) => counts[r.id] !== undefined) ? duBloc.reduce((n, r) => n + counts[r.id], 0) : undefined;
        etats[cleMatiere(g.key)] = etatListe(cleMatiere(g.key), progressions.get(cleMatiere(g.key)), total, user.id);
      }
    }
  }

  // l'avancement de chaque matière pour l'index (undefined : table pas encore créée, l'index reste tel quel)
  const avances = progressions ? suiviProgramme(groups, progressions, user.id) : undefined;

  // « La partie de cartes » (Léonard, croupier) : la matière choisie dans l'index est cochée d'avance
  const matierePartie = subjectFromParam(sp.subject);
  const hrefPartie = matierePartie ? `/flashcards/partie?matiere=${encodeURIComponent(matierePartie.key)}` : "/flashcards/partie";

  return (
    <ListeReviser
      kind="cartes"
      subjects={subjectsAvail}
      avances={avances}
      croupier={
        <CoteCroupier
          href={hrefPartie}
          bulle={matierePartie ? PARTIE_ENTREE.ligneMatiere(matierePartie.name) : PARTIE_ENTREE.invite}
          action={PARTIE_ENTREE.lancer}
          aide={PARTIE_ENTREE.aide}
        />
      }
      actions={
        <>
          {nMarquees ? (
            <ActionContour href="/flashcards/marquees" aide={MARQUE_CARTE.entreeAide}>
              <Bookmark size={15} fill="currentColor" aria-hidden /> {MARQUE_CARTE.entree(nMarquees)}
            </ActionContour>
          ) : null}
        </>
      }
      apres={
        <>
          <SynchroMarquesCartes joueur={user.id} />
          {paquets && (
            <section id="paquets" className="rl-section scroll-mt-24" aria-label={RV.lesPaquets(paquets.name)}>
              <h2 className="t-h2 m-0">{RV.lesPaquets(paquets.name)}</h2>
              <FlashcardPaquets groups={paquets.groups} basePath="/flashcards" etats={etats} />
              {memo && (
                <div className="mt-6 grid gap-3 md:mt-10">
                  <h2 className="t-h2 m-0">{BOUCLE.memoCartesTitre(60)}</h2>
                  <Memo src={memo.img} pdf={memo.pdf} titre={BOUCLE.memoCartesTitre(60)} ratio={RATIO_CARTES} />
                </div>
              )}
            </section>
          )}
        </>
      }
    />
  );
}
