import { FicheDrillPage } from "@/components/FicheDrillPage";

export default function PortfolioManagementFiche() {
  return (
    <FicheDrillPage
      config={{
        title: "Portfolio Management",
        description:
          "6 pages de synthèse (une par lecture), chacune suivie d'une page de QCM d'entraînement tirée de notre banque officielle. Corrigé complet en fin de document.",
        pdfFile: "portfolio-management.pdf",
        pdfDownloadName: "Portfolio_Management_Vault_Concept_Sheet.pdf",
        pdfLabel: "Portfolio Management — 13 pages",
        totalPages: 6,
        drillTitlePrefix: "Portfolio Management — Drill Fiche Page",
      }}
    />
  );
}
