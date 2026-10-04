import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FicheWorkspace, type DrillSet } from "@/components/FicheWorkspace";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";

export type FicheConfig = {
  title: string;
  description: string;
  pdfFile: string;
  pdfDownloadName: string;
  pdfLabel: string;
  totalPages: number;
  // Titre attendu des sets de drill : "<prefix> N (...)" — le numéro de page
  // est extrait du titre plutôt que codé en dur, pour que les nouveaux
  // scripts de seed soient pris en compte automatiquement.
  drillTitlePrefix: string;
};

// Page commune aux fiches PDF "Vault Concept Sheet" (Fixed Income, Equity,
// FSA, Portfolio Management) : le PDF vit dans le bucket privé "fiches"
// (servi par URL signée), les quiz viennent de la banque officielle
// (quiz_sets / quiz_questions). La bonne réponse et l'explication ne sont
// JAMAIS envoyées au navigateur : elles ne sont révélées qu'après tentative,
// par award_quiz_question_xp (voir migration_fix_answer_leak.sql).
//
// Liens directs : `?page=N` ouvre la page N (le serveur la sélectionne dès le
// premier rendu), `?onglet=erreurs|melange|progression` un onglet.
export async function FicheDrillPage({
  config,
  searchParams,
}: {
  config: FicheConfig;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const admin = createAdminClient();
  // Les traits du jour (anneau du jour sous la copie corrigée) : même lecture
  // que le logo de la barre du haut, déjà faite pour cette requête (cache).
  const [{ data: signed, error }, { data: setsData }, traits, sp] = await Promise.all([
    supabase.storage.from("fiches").createSignedUrl(config.pdfFile, 3600),
    admin.from("quiz_sets").select("id,title").like("title", `${config.drillTitlePrefix}%`),
    traitsDuJour(auth.user.id),
    searchParams ?? Promise.resolve(undefined),
  ]);
  const pdfUrl = error ? null : signed?.signedUrl ?? null;
  const pageParam = Number(Array.isArray(sp?.page) ? sp?.page[0] : sp?.page);
  const initialPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : null;

  const sets = (setsData ?? [])
    .map((s) => ({ ...s, page: Number(/Page ([0-9]+)/.exec(s.title)?.[1]) }))
    .filter((s) => Number.isFinite(s.page));

  const { data: questionsData } = sets.length
    ? await admin
        .from("quiz_questions")
        .select("id,set_id,prompt,choices,position")
        .in("set_id", sets.map((s) => s.id))
        .order("position", { ascending: true })
    : { data: [] };

  const drillSets: DrillSet[] = sets
    .map((s) => ({
      page: s.page,
      setId: s.id,
      title: s.title,
      questions: (questionsData ?? [])
        .filter((q) => q.set_id === s.id)
        .map((q) => ({
          id: q.id as string,
          set_id: q.set_id as string,
          prompt: q.prompt as string,
          choices: Array.isArray(q.choices) ? (q.choices as string[]) : [],
          position: q.position as number,
        })),
    }))
    .sort((a, b) => a.page - b.page);

  // Page large (.rl-wide, alignée sur la barre du haut) : cours et quiz côte à
  // côte sur grand écran. L'en-tête (retour, titre, état de la fiche) est
  // rendu par FicheWorkspace, qui connaît la progression.
  return (
    <div className="rl-wide">
      <FicheWorkspace
        title={config.title}
        description={config.description}
        pdfUrl={pdfUrl}
        pdfDownloadName={config.pdfDownloadName}
        pdfLabel={config.pdfLabel}
        totalPages={config.totalPages}
        drillSets={drillSets}
        initialPage={initialPage}
        traitsDuJour={traits}
      />
    </div>
  );
}
