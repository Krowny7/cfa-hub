import { FicheDrillPage } from "@/components/FicheDrillPage";

export default function EquityFiche() {
  return (
    <FicheDrillPage
      config={{
        title: "Equity",
        description:
          "8 pages de synthèse (une par grand thème), chacune suivie d'une page de QCM d'entraînement tirée de notre banque officielle. Corrigé complet en fin de document.",
        pdfFile: "equity.pdf",
        pdfDownloadName: "Equity_Vault_Concept_Sheet.pdf",
        pdfLabel: "Equity — 18 pages",
        totalPages: 8,
        drillTitlePrefix: "Equity — Drill Fiche Page",
      }}
    />
  );
}
