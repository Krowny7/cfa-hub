import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function QuantitativeMethodsFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Quantitative Methods",
        description: "6 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "quantitative-methods.pdf",
        pdfDownloadName: "Quantitative_Methods_Vault_Concept_Sheet.pdf",
        pdfLabel: "Quantitative Methods — 14 pages",
        totalPages: 6,
        drillTitlePrefix: "Quantitative Methods — Drill Fiche Page",
      }}
    />
  );
}
