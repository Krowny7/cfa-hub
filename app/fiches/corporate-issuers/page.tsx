import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function CorporateIssuersFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Corporate Issuers",
        description: "4 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "corporate-issuers.pdf",
        pdfDownloadName: "Corporate_Issuers_Vault_Concept_Sheet.pdf",
        pdfLabel: "Corporate Issuers — 10 pages",
        totalPages: 4,
        drillTitlePrefix: "Corporate Issuers — Drill Fiche Page",
      }}
    />
  );
}
