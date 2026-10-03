import { FicheDrillPage } from "@/components/FicheDrillPage";

export default function EquityFiche() {
  return (
    <FicheDrillPage
      config={{
        title: "Equity",
        description: "8 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "equity.pdf",
        pdfDownloadName: "Equity_Vault_Concept_Sheet.pdf",
        pdfLabel: "Equity — 18 pages",
        totalPages: 8,
        drillTitlePrefix: "Equity — Drill Fiche Page",
      }}
    />
  );
}
