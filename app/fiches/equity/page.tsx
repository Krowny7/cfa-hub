import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FicheDrillSelector, type DrillSet } from "@/components/FicheDrillSelector";
import type { QuizQuestion } from "@/lib/types";

const TOTAL_PAGES = 8;
// Même principe que Fixed Income : le numéro de page est extrait du titre
// plutôt que codé en dur.
const DRILL_TITLE_PREFIX = "Equity — Drill Fiche Page";

// Même architecture que la fiche Fixed Income : le PDF "Vault Concept
// Sheet" (8 pages de synthèse + 8 pages de QCM + 2 pages de corrigé) est
// stocké dans le bucket privé "fiches" et servi via une URL signée. Les
// quiz interactifs par page viennent de la banque officielle (quiz_sets/
// quiz_questions), affichés via FicheDrillSelector.
export default async function EquityFiche() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data, error } = await supabase.storage
    .from("fiches")
    .createSignedUrl("equity.pdf", 3600);

  const pdfUrl = error ? null : data?.signedUrl ?? null;

  const admin = createAdminClient();
  const { data: drillSetsData } = await admin
    .from("quiz_sets")
    .select("id,title,owner_id")
    .like("title", `${DRILL_TITLE_PREFIX}%`);

  const drillSets: DrillSet[] = [];
  for (const set of drillSetsData ?? []) {
    const m = /Page (\d+)/.exec(set.title);
    if (!m) continue;
    const page = Number(m[1]);
    const isOwner = set.owner_id === auth.user.id;

    const { data: questionsData } = await admin
      .from("quiz_questions")
      .select("id,prompt,choices,correct_index,explanation,position")
      .eq("set_id", set.id)
      .order("position", { ascending: true });

    const questions: QuizQuestion[] = (questionsData ?? []).map((q) => ({
      ...q,
      choices: Array.isArray(q.choices) ? q.choices : [],
      correct_index: isOwner ? q.correct_index : undefined,
      explanation: isOwner ? q.explanation : undefined,
      set_id: set.id,
    })) as QuizQuestion[];

    drillSets.push({ page, setId: set.id, title: set.title, isOwner, questions });
  }
  drillSets.sort((a, b) => a.page - b.page);

  return (
    <div className="grid gap-4">
      <div>
        <Link href="/fiches" className="text-xs text-white/50 hover:text-white/80">
          ← Fiches de révision
        </Link>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">Equity — Vault Concept Sheet</h1>
        <p className="mt-1 text-sm text-white/55">
          8 pages de synthèse (une par grand thème), chacune suivie d'une page de QCM d'entraînement
          tirée de notre banque officielle. Corrigé complet en fin de document.
        </p>
      </div>

      {!pdfUrl ? (
        <div className="card p-6 text-center text-sm text-muted">
          Impossible de charger la fiche pour le moment. Réessaie dans un instant.
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] p-3">
            <div className="text-xs text-white/50">Equity — 18 pages</div>
            <div className="flex gap-2">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                <ExternalLink size={13} /> Ouvrir dans un nouvel onglet
              </a>
              <a href={pdfUrl} download="Equity_Vault_Concept_Sheet.pdf" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                <Download size={13} /> Télécharger
              </a>
            </div>
          </div>
          <iframe
            src={pdfUrl}
            title="Equity — Vault Concept Sheet"
            className="h-[80vh] w-full"
          />
        </div>
      )}

      <FicheDrillSelector totalPages={TOTAL_PAGES} drillSets={drillSets} />
    </div>
  );
}
