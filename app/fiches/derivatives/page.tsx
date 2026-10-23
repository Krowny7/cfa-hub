import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function DerivativesFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Derivatives",
        description: "5 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "derivatives.pdf",
        pdfDownloadName: "Derivatives_Vault_Concept_Sheet.pdf",
        pdfLabel: "Derivatives — 12 pages",
        totalPages: 5,
        drillTitlePrefix: "Derivatives — Drill Fiche Page",
      }}
    />
  );
}
