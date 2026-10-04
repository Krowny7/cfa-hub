import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function PortfolioManagementFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Portfolio Management",
        description: "6 synthèses, une par lecture, chacune suivie de son QCM corrigé.",
        pdfFile: "portfolio-management.pdf",
        pdfDownloadName: "Portfolio_Management_Vault_Concept_Sheet.pdf",
        pdfLabel: "Portfolio Management — 13 pages",
        totalPages: 6,
        drillTitlePrefix: "Portfolio Management — Drill Fiche Page",
      }}
    />
  );
}
