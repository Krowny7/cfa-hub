import { FicheDrillPage } from "@/components/FicheDrillPage";

export default function PortfolioManagementFiche() {
  return (
    <FicheDrillPage
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
