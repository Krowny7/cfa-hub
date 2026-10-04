import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function FSAFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Financial Statement Analysis",
        description: "11 synthèses, une par lecture, chacune suivie de son QCM corrigé.",
        pdfFile: "financial-statement-analysis.pdf",
        pdfDownloadName: "Financial_Statement_Analysis_Vault_Concept_Sheet.pdf",
        pdfLabel: "Financial Statement Analysis — 24 pages",
        totalPages: 11,
        drillTitlePrefix: "Financial Statement Analysis — Drill Fiche Page",
      }}
    />
  );
}
