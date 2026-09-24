// Seed script — quiz de "drill" associé à la page 6 de la fiche PDF Equity
// (Industry & Competitive Analysis). Questions officielles sélectionnées
// depuis la banque de pratique (Reading 46), corrigé vérifié contre le PDF
// "- Answers.pdf" correspondant.
// Usage: node scripts/seed-equity-drill-page6.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 6 (Industry & Competitive Analysis)",
    difficulty: 2,
    questions: [
      [
        "After completing a thorough industry analysis, which of the following is most likely an additional element an analyst should examine when analyzing a specific company within the industry?",
        ["Competitive strategy.", "Power of buyers.", "Threat of entry."],
        0,
        "L'analyse d'une entreprise spécifique porte notamment sur sa situation financière, ses produits/services et sa stratégie concurrentielle (leadership par les coûts ou différenciation). Le pouvoir de négociation des acheteurs et la menace d'entrants sont des éléments de l'analyse sectorielle (Porter), pas des éléments additionnels propres à l'analyse d'une entreprise.",
      ],
      [
        "Which of the following types of industries is typically characterized by above-normal expansion in sales and profits independent of the business cycle?",
        ["Defensive.", "Counter-cyclical.", "Growth."],
        2,
        "Une industrie de croissance (growth industry) se caractérise par une expansion des ventes et des profits supérieure à la normale, indépendamment du cycle économique. Les industries défensives se caractérisent plutôt par une performance stable pendant les phases d'expansion et de contraction, non par une croissance supérieure à la normale.",
      ],
      [
        "An analyst is using the Herfindahl-Hirschman Index (HHI) to evaluate industry concentration. The industry has four firms with the following market shares: 45%, 25%, 20%, and 10%. This industry's concentration will be considered:",
        ["moderate.", "low.", "high."],
        2,
        "Le HHI se calcule comme la somme des carrés des parts de marché : (45×45)+(25×25)+(20×20)+(10×10)=2025+625+400+100=3150. Un HHI supérieur à 2 500 est considéré comme une forte concentration. Une concentration faible correspondrait à un HHI inférieur à 1 500, et modérée entre 1 500 et 2 500.",
      ],
      [
        "In differentiating between an industry and a sector, an analyst may describe transportation and airlines in what manner?",
        ["Transportation is the sector, and airline is the industry.", "Airline is the sector, and transportation is the industry.", "Both airline and transportation are industries."],
        0,
        "Un secteur est un regroupement d'industries similaires ; une industrie est identifiée par les produits/services qu'elle propose. Le transport est donc le secteur, et les compagnies aériennes constituent une industrie au sein de ce secteur.",
      ],
      [
        "The competitive forces identified by Michael Porter include:",
        ["power of existing competitors and threat of entry.", "rivalry among existing competitors and power of buyers.", "threat of substitutes and rivalry among suppliers."],
        1,
        "Les cinq forces concurrentielles de Porter sont : la rivalité entre concurrents existants, la menace d'entrants, la menace de substituts, le pouvoir de négociation des acheteurs et le pouvoir de négociation des fournisseurs. Seule la réponse B nomme correctement deux de ces forces (« rivalité entre concurrents existants » et « pouvoir des acheteurs ») ; les autres réponses mélangent les termes de façon incorrecte (« rivalité entre fournisseurs » n'existe pas dans le modèle de Porter).",
      ],
      [
        "Commercial industry classification systems such as the Global Industry Classification Standard (GICS) typically classify firms according to their:",
        ["principal business activities.", "correlations of historical returns.", "sensitivity to business cycles."],
        0,
        "Les systèmes de classification commerciaux comme le GICS classent les entreprises selon leur activité économique principale (ex. biens de consommation de base, services financiers, santé), et non selon la corrélation de leurs rendements historiques ou leur sensibilité au cycle économique.",
      ],
      [
        "The threat of substitutes is most likely to be low for a firm that:",
        ["operates in a fragmented market with little unused capacity.", "produces a commodity product in an industry with significant unused capacity.", "produces a differentiated product with high switching costs."],
        2,
        "La menace de substituts est faible pour une entreprise qui propose un produit différencié avec des coûts de changement élevés pour le client. La capacité inutilisée et la fragmentation du marché intensifient plutôt la rivalité entre concurrents existants, mais ne sont pas directement liées à la menace de substituts.",
      ],
      [
        "Company X runs a series of high-end hotels in the Northeastern United States. The average room rate per night is higher than any other hotel in the region. Which of the following best allows the company to build upon its differentiation strategy?",
        ["Economies of scale and low variable costs.", "Strong cost controls, which allow the company to maintain profit margins.", "A culture of strong customer experience."],
        2,
        "Une entreprise pratiquant des tarifs plus élevés que ses concurrents met en œuvre une stratégie de différenciation, où le client perçoit une valeur ajoutée justifiant le prix premium — une culture d'expérience client forte s'inscrit dans cette logique. Les économies d'échelle, les coûts variables faibles et le contrôle strict des coûts relèvent au contraire d'une stratégie de leadership par les coûts, pas de différenciation.",
      ],
      [
        "A commercial industry classification system has a hierarchical structure: economic sectors, business sectors, industry groups, industries, and activities. Which of the following classifications does this represent?",
        ["Refinitiv Business Classification (TRBC).", "Industry Classification Benchmark (ICB).", "Global Industry Classification Standard (GICS)."],
        0,
        "Cette structure hiérarchique en cinq niveaux (secteurs économiques, secteurs d'activité, groupes d'industries, industries, activités) correspond à la classification TRBC (Refinitiv Business Classification). L'ICB utilise plutôt : industries, supersecteurs, secteurs, sous-secteurs ; et le GICS utilise : secteur, groupes d'industries, industries, sous-industries.",
      ],
      [
        "As part of an industry and competitive analysis, an analyst first defines and then surveys an industry. Which of the following assessments will be made as part of the survey step?",
        ["The growth rate of the industry over the last several years.", "Political and economic impacts on the industry.", "The geographical region in which the industry operates."],
        0,
        "L'étape de « survey » (relevé) de l'industrie consiste à évaluer sa taille, sa rentabilité, sa croissance et les tendances de parts de marché — dont le taux de croissance des dernières années. Les impacts politiques et économiques relèvent de l'étape d'examen des influences externes, et la région géographique relève plutôt de l'étape de définition de l'industrie.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 6...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
