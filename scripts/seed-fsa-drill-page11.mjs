// Seed script — quiz de "drill" associé à la page 11 de la fiche PDF FSA
// (Introduction to Financial Statement Modeling). Structure Fixed Income :
// 5 concepts × 3 variantes (questions en anglais ; explications en
// français). Concept 1 = question officielle du PDF imprimé (qcm_data/
// fsa_raw.txt) ; variantes 2-3 testent le même concept différemment. Pour
// le concept 5 (calcul), les variantes 2 et 3 sont obtenues par mise à
// l'échelle proportionnelle exacte des chiffres officiels (mêmes
// pourcentages, montants différents) plutôt que par un nouveau calcul
// manuel, pour garantir l'exactitude arithmétique.
// Usage: node scripts/seed-fsa-drill-page11.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 11 (Introduction to Financial Statement Modeling)",
    difficulty: 2,
    questions: [
      // Concept 1 — Atténuer le biais de représentativité
      [
        "An analyst trying to mitigate representativeness bias would most likely:",
        [
          "perform scenario analysis.",
          "consider both inside and outside views to generate forecasts.",
          "use flexible models with few independent variables.",
        ],
        1,
        "Le biais de représentativité provient de la tendance à classer des données selon des classifications passées ; il est atténué en combinant une vision interne (spécifique à la situation) et une vision externe (le taux de base d'une population plus large).",
      ],
      [
        "An analyst combines a situation-specific forecast with base-rate information drawn from a broader reference class of similar situations. This approach is primarily designed to mitigate:",
        ["overconfidence bias.", "representativeness bias.", "conservatism bias."],
        1,
        "Combiner la vision interne (spécifique) et la vision externe (taux de base d'un ensemble plus large de situations comparables) est précisément la technique recommandée contre le biais de représentativité.",
      ],
      [
        "Which of the following approaches would most likely help an analyst mitigate representativeness bias in a forecast?",
        [
          "Limiting the model to a small number of well-understood variables.",
          "Incorporating both an inside view and an outside (base-rate) view.",
          "Running multiple scenario analyses around a single base case.",
        ],
        1,
        "Un modèle à peu de variables traite le biais de conservatisme, et l'analyse de scénarios traite le biais d'excès de confiance — seule la combinaison vision interne/externe cible spécifiquement le biais de représentativité.",
      ],
      // Concept 2 — Point de départ d'un modèle pro forma basé sur les ventes
      [
        "An analyst who wants to create a sales-based pro forma model for a company is most likely to begin by:",
        [
          "modeling the company's working capital items.",
          "estimating the company's revenue growth trend.",
          "forecasting the company's capital spending.",
        ],
        1,
        "La première étape est d'estimer la croissance et le chiffre d'affaires futur, puisque la plupart des autres postes sont ensuite modélisés en fonction de celui-ci.",
      ],
      [
        "When building a sales-based pro forma model, an analyst should most appropriately begin by:",
        ["forecasting capital expenditures.", "estimating future revenue growth.", "modeling changes in working capital."],
        1,
        "Toujours la même logique : le chiffre d'affaires futur est le point d'ancrage du modèle, estimé en premier, avant tous les autres postes qui en dépendent.",
      ],
      [
        "In a sales-based financial forecasting approach, most other line items in the pro forma income statement and balance sheet are typically modeled as a function of:",
        ["forecasted capital expenditures.", "forecasted net income.", "forecasted revenue."],
        2,
        "Le chiffre d'affaires prévisionnel sert de variable pilote (driver) pour modéliser la plupart des autres postes — coûts, BFR, immobilisations — via des ratios historiques appliqués aux ventes.",
      ],
      // Concept 3 — Barrières à l'entrée et pouvoir de fixation des prix
      [
        "A company is most likely to have pricing power if it operates in an industry that exhibits high:",
        ["bargaining power of customers.", "barriers to entry.", "intensity of industry rivalry."],
        1,
        "Des barrières à l'entrée élevées réduisent la menace de nouveaux entrants, ce qui tend à augmenter le pouvoir de fixation des prix des entreprises en place. Un fort pouvoir de négociation des clients et une forte rivalité réduisent au contraire ce pouvoir.",
      ],
      [
        "A firm operating in an industry characterized by high barriers to entry most likely has:",
        [
          "low pricing power, due to reduced competition.",
          "high pricing power, due to a reduced threat of new entrants.",
          "no meaningful pricing power effect from barriers to entry.",
        ],
        1,
        "Les barrières à l'entrée élevées protègent les entreprises en place de nouveaux concurrents, ce qui leur confère un plus grand pouvoir de fixation des prix.",
      ],
      [
        "Which of the following industry characteristics would most likely reduce a firm's pricing power?",
        [
          "High barriers to entry.",
          "Low bargaining power of customers.",
          "High intensity of rivalry among existing competitors.",
        ],
        2,
        "Une forte rivalité entre concurrents existants pousse les prix vers le bas et réduit le pouvoir de fixation des prix — contrairement aux barrières à l'entrée élevées et au faible pouvoir de négociation des clients, qui le renforcent tous deux.",
      ],
      // Concept 4 — Effet d'une baisse des unités vendues sur le bilan
      [
        "An analyst is developing a forecast for a firm and expects the units sold to be reduced by 5% in the next reporting period. Which of the following balance sheet current assets is this most likely to affect?",
        [
          "Accounts receivable, inventory, and prepayments.",
          "Accounts receivable and prepayments.",
          "Accounts receivable and inventory.",
        ],
        2,
        "Vendre moins d'unités réduit les créances clients et affecte les niveaux de stocks. Les charges payées d'avance représentent des dépenses de périodes futures, pas des achats, et ne réagissent pas à une variation de la demande.",
      ],
      [
        "An analyst forecasts a 10% increase in a company's unit sales volume for next year. Holding all else equal, which of the following balance sheet items is LEAST likely to be directly affected by this change?",
        ["Accounts receivable.", "Prepaid expenses.", "Inventory."],
        1,
        "Les charges payées d'avance ne sont pas liées au volume de ventes : elles correspondent à des dépenses futures déjà réglées (assurance, loyer...), indépendantes du nombre d'unités vendues. Les créances clients et le stock, eux, varient directement avec le volume.",
      ],
      [
        "A decline in a company's unit sales volume would most likely have a direct effect on which of the following pairs of balance sheet items?",
        [
          "Accounts receivable and inventory.",
          "Prepaid expenses and goodwill.",
          "Long-term debt and common stock.",
        ],
        0,
        "Les créances clients et le stock sont directement liés au volume d'activité. Les charges payées d'avance, le goodwill, la dette long terme et les capitaux propres ne varient pas mécaniquement avec le volume de ventes.",
      ],
      // Concept 5 — Impact relatif sur résultat opérationnel vs chiffre d'affaires
      [
        "Fresh Farm Foods (FFF) reported Revenue of $800,000, COGS of $570,000, and SG&A of $96,000 for the year, based on sales of 140,000 units (Operating profit of $134,000). An analyst forecasts FFF will be forced to raise its unit price by 8%, causing demand to fall by 3,000 units. In percentage terms, which of the following will most likely see the biggest decrease?",
        ["Operating profit.", "Revenue.", "Gross profit."],
        0,
        "Le chiffre d'affaires et la marge brute encaissent le choc en partie, mais les frais SG&A restent fixes : c'est donc le résultat opérationnel qui absorbe la totalité du choc relatif et chute le plus fortement en pourcentage.",
      ],
      [
        "Greenfield Farms (GF) reported Revenue of $1,000,000, COGS of $712,500, and SG&A of $120,000 for the year, based on sales of 175,000 units (Operating profit of $167,500). An analyst forecasts GF will be forced to raise its unit price by 8%, causing demand to fall by 3,750 units. In percentage terms, which of the following will most likely see the biggest decrease?",
        ["Operating profit.", "Revenue.", "Gross profit."],
        0,
        "Mêmes proportions que le cas Fresh Farm Foods (tous les montants sont mis à l'échelle ×1,25, les pourcentages de variation restent donc identiques) : les frais SG&A fixes amplifient le choc relatif sur le résultat opérationnel, qui chute le plus.",
      ],
      [
        "Sunrise Produce (SP) reported Revenue of $400,000, COGS of $285,000, and SG&A of $48,000 for the year, based on sales of 70,000 units (Operating profit of $67,000). An analyst forecasts SP will be forced to raise its unit price by 8%, causing demand to fall by 1,500 units. In percentage terms, which of the following will most likely see the biggest decrease?",
        ["Operating profit.", "Revenue.", "Gross profit."],
        0,
        "Même structure que le cas Fresh Farm Foods (chiffres mis à l'échelle ×0,5) : avec des frais SG&A fixes, c'est toujours le résultat opérationnel qui subit la plus forte baisse relative parmi les trois lignes.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 11...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
