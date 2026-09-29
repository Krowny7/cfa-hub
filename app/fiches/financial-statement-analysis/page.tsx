import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Même architecture que Fixed Income / Equity : le PDF "Vault Concept
// Sheet" (11 pages de synthèse + 11 pages de QCM + 2 pages de corrigé) est
// stocké dans le bucket privé "fiches" et servi via une URL signée.
// Pas de drill interactif pour l'instant (voir cfa-hub-vault-concept-sheet-pdf
// dans la mémoire projet — scope volontairement réduit pour cette fiche).
export default async function FSAFiche() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data, error } = await supabase.storage
    .from("fiches")
    .createSignedUrl("financial-statement-analysis.pdf", 3600);

  const pdfUrl = error ? null : data?.signedUrl ?? null;

  return (
    <div className="grid gap-4">
      <div>
        <Link href="/fiches" className="text-xs text-white/50 hover:text-white/80">
          ← Fiches de révision
        </Link>
        <h1 className="mt-1 font-display text-xl font-medium tracking-tight">
          Financial Statement Analysis — Vault Concept Sheet
        </h1>
        <p className="mt-1 text-sm text-white/55">
          11 pages de synthèse (une par lecture), chacune suivie d&apos;une page de QCM d&apos;entraînement
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
            <div className="text-xs text-white/50">Financial Statement Analysis — 24 pages</div>
            <div className="flex gap-2">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                <ExternalLink size={13} /> Ouvrir dans un nouvel onglet
              </a>
              <a href={pdfUrl} download="Financial_Statement_Analysis_Vault_Concept_Sheet.pdf" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                <Download size={13} /> Télécharger
              </a>
            </div>
          </div>
          <iframe
            src={pdfUrl}
            title="Financial Statement Analysis — Vault Concept Sheet"
            className="h-[80vh] w-full"
          />
        </div>
      )}
    </div>
  );
}
