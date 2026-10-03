import { FicheDrillPage } from "@/components/FicheDrillPage";

export default function FixedIncomeFiche() {
  return (
    <FicheDrillPage
      config={{
        title: "Fixed Income",
        description: "8 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "fixed-income.pdf",
        pdfDownloadName: "Fixed_Income_Vault_Concept_Sheet.pdf",
        pdfLabel: "Fixed Income — 18 pages",
        totalPages: 8,
        drillTitlePrefix: "Fixed Income — Drill Fiche Page",
      }}
    />
  );
}
