import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FlashcardPaquets, flashcardGroups, flashcardPaquets, paquetsDeMatiere } from "@/components/FlashcardSubjectGrid";
import type { ContentSetRow } from "@/components/ContentListPage";
import { BandeReprise } from "@/components/reviser/BandeReprise";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { loadSubjectsSafe } from "@/components/reviser/load";
import { RV } from "@/lib/voice-reviser";
import { cleMatiere, cleSet, etatListe, type EtatListe } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";

type FlashcardRow = ContentSetRow & {
  is_official?: boolean | null;
  official_published?: boolean | null;
};

type SearchParams = { view?: string; subject?: string };
type PageProps = { searchParams?: Promise<SearchParams> };

// Les flashcards du site sont les paquets officiels (« Système ») : on ne crée
// ni n'importe de paquet. La liste suit le gabarit commun de Réviser (carte du
// lieu « Le casier », bande « Reprendre », index du programme, puis les paquets
// de la matière choisie, chacun avec où en est sa boucle sur le compte :
// flashcard_progress, seulement les clés affichées, puis relue sur l'appareil
// s'il a plus récent ; rien si la table n'est pas encore créée).
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

  // la matière affichée : seules ses boucles (paquets et matière) sont lues
  const paquets = flashcardPaquets(system, counts, sp.subject);
  const cles = (paquets?.groups ?? []).flatMap((g) => [...g.rows.map((r) => cleSet(r.id)), cleMatiere(g.key)]);
  const [subjectsAvail, progressions] = await Promise.all([loadSubjectsSafe(supabase, user.id), lireProgressions(supabase, user.id, cles)]);
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

  return (
    <ListeReviser
      kind="cartes"
      subjects={subjectsAvail}
      bande={<BandeReprise fallback={first && firstGroup ? { id: first.id, title: first.title, subject: firstGroup.name } : null} counts={counts} subjects={subjects} />}
      suite={
        paquets && (
          <section id="paquets" className="rl-section scroll-mt-24" aria-label={RV.lesPaquets(paquets.name)}>
            <h2 className="t-h2 m-0">{RV.lesPaquets(paquets.name)}</h2>
            <FlashcardPaquets groups={paquets.groups} basePath="/flashcards" etats={etats} />
          </section>
        )
      }
    />
  );
}
