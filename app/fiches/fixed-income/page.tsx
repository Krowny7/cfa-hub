import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Fiche entièrement remaniée : au lieu du contenu React précédent, on sert
// directement le PDF "Vault Concept Sheet" (8 pages de synthèse, chacune
// suivie d'une page de QCM tirée de notre banque officielle, + corrigé en
// fin de document). Stocké dans le bucket privé "fiches" (jamais public —
// voir migration_fiches_storage.sql), servi via une URL signée générée à
// la demande pour l'utilisateur connecté.
export default async function FixedIncomeFiche() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data, error } = await supabase.storage
    .from("fiches")
    .createSignedUrl("fixed-income.pdf", 3600);

  const pdfUrl = error ? null : data?.signedUrl ?? null;

  return (
    <div className="grid gap-4">
      <div>
        <Link href="/fiches" className="text-xs text-white/50 hover:text-white/80">
          ← Fiches de révision
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Fixed Income — Vault Concept Sheet</h1>
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
            <div className="text-xs text-white/50">Fixed Income — 18 pages</div>
            <div className="flex gap-2">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                <ExternalLink size={13} /> Ouvrir dans un nouvel onglet
              </a>
              <a href={pdfUrl} download="Fixed_Income_Vault_Concept_Sheet.pdf" className="btn btn-secondary inline-flex items-center gap-1.5 text-xs">
                <Download size={13} /> Télécharger
              </a>
            </div>
          </div>
          <iframe
            src={pdfUrl}
            title="Fixed Income — Vault Concept Sheet"
            className="h-[80vh] w-full"
          />
        </div>
      )}
    </div>
  );
}
