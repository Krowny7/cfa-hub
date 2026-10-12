import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function EconomicsFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Economics",
        description: "5 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "economics.pdf",
        pdfDownloadName: "Economics_Vault_Concept_Sheet.pdf",
        pdfLabel: "Economics — 12 pages",
        totalPages: 5,
        drillTitlePrefix: "Economics — Drill Fiche Page",
      }}
    />
  );
}
