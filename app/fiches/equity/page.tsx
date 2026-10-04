import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function EquityFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
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
