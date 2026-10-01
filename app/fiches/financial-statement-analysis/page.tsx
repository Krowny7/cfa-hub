import { FicheDrillPage } from "@/components/FicheDrillPage";

export default function FSAFiche() {
  return (
    <FicheDrillPage
      config={{
        title: "Financial Statement Analysis",
        description:
          "11 pages de synthèse (une par lecture), chacune suivie d'une page de QCM d'entraînement tirée de notre banque officielle. Corrigé complet en fin de document.",
        pdfFile: "financial-statement-analysis.pdf",
        pdfDownloadName: "Financial_Statement_Analysis_Vault_Concept_Sheet.pdf",
        pdfLabel: "Financial Statement Analysis — 24 pages",
        totalPages: 11,
        drillTitlePrefix: "Financial Statement Analysis — Drill Fiche Page",
      }}
    />
  );
}
