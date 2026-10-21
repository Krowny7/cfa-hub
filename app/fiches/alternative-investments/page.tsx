import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function AlternativeInvestmentsFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Alternative Investments",
        description: "4 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "alternative-investments.pdf",
        pdfDownloadName: "Alternative_Investments_Vault_Concept_Sheet.pdf",
        pdfLabel: "Alternative Investments — 10 pages",
        totalPages: 4,
        drillTitlePrefix: "Alternative Investments — Drill Fiche Page",
      }}
    />
  );
}
