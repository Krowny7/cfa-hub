import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function FixedIncomeFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
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
