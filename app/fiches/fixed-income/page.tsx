import { FicheDrillPage } from "@/components/FicheDrillPage";

export default function FixedIncomeFiche() {
  return (
    <FicheDrillPage
      config={{
        title: "Fixed Income",
        description:
          "8 pages de synthèse (une par grand thème), chacune suivie d'une page de QCM d'entraînement tirée de notre banque officielle. Corrigé complet en fin de document.",
        pdfFile: "fixed-income.pdf",
        pdfDownloadName: "Fixed_Income_Vault_Concept_Sheet.pdf",
        pdfLabel: "Fixed Income — 18 pages",
        totalPages: 8,
        drillTitlePrefix: "Fixed Income — Drill Fiche Page",
      }}
    />
  );
}
