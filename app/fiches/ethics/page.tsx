import { FicheDrillPage } from "@/components/FicheDrillPage";

// ?page=N ouvre la page N, ?onglet=erreurs|melange|progression un onglet.
export default function EthicsFiche({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <FicheDrillPage
      searchParams={searchParams}
      config={{
        title: "Ethical and Professional Standards",
        description: "5 synthèses, une par grand thème, chacune suivie de son QCM corrigé.",
        pdfFile: "ethics.pdf",
        pdfDownloadName: "Ethical_and_Professional_Standards_Vault_Concept_Sheet.pdf",
        pdfLabel: "Ethical and Professional Standards — 12 pages",
        totalPages: 5,
        drillTitlePrefix: "Ethical and Professional Standards — Drill Fiche Page",
      }}
    />
  );
}
