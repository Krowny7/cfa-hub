// Seed script — quiz de "drill" associé à la page 11 de la fiche PDF FSA
// (Introduction to Financial Statement Modeling). Structure : 5 concepts
// × (1 question officielle + 1 variante "angle différent" + 1 variante
// "plus difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions
// en anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page11.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 11 (Introduction to Financial Statement Modeling)",
    difficulty: 2,
    questions: [
      // Concept 1 — Atténuer le biais de représentativité (officielle)
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
      // Variante angle différent — identifier la bonne technique parmi des alternatives proches
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
      // Variante plus difficile — appliquer le principe à un cas réel avec divergence extrême entre les deux vues
      [
        "An analyst forecasting a biotech startup's revenue growth relies heavily on the company's own pipeline and management's specific projections (an \"inside view\"), suggesting an 80% probability of approval and rapid growth. A colleague points out that the average historical success rate for similarly staged biotech startups over the past 20 years is only 15% (an \"outside\", base-rate view). Which of the following is the most appropriate way to combine these two views to mitigate representativeness bias?",
        [
          "Disregard the outside view entirely, since company-specific management projections are always more reliable.",
          "Give meaningful weight to the base rate, adjusting the forecast significantly toward the lower, more realistic historical success rate.",
          "Simply average the two probabilities without further analysis, arriving at 47.5%.",
        ],
        1,
        "Le biais de représentativité se manifeste précisément quand on ignore le taux de base (ici 15 %) au profit d'informations spécifiques séduisantes mais non représentatives de la population historique. La bonne pratique consiste à pondérer sérieusement le taux de base, pas à l'ignorer ni à faire une simple moyenne arithmétique sans jugement.",
      ],

      // Concept 2 — Point de départ d'un modèle pro forma basé sur les ventes (officielle)
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
      // Variante angle différent — ce dont dépendent LES AUTRES postes, pas le point de départ lui-même
      [
        "In a sales-based financial forecasting approach, most other line items in the pro forma income statement and balance sheet are typically modeled as a function of:",
        ["forecasted capital expenditures.", "forecasted net income.", "forecasted revenue."],
        2,
        "Le chiffre d'affaires prévisionnel sert de variable pilote (driver) pour modéliser la plupart des autres postes — coûts, BFR, immobilisations — via des ratios historiques appliqués aux ventes.",
      ],
      // Variante plus difficile — distinguer coûts variables (% des ventes) et coûts fixes dans un calcul complet
      [
        "A retailer forecasts 10% revenue growth next year. Historically, COGS has been a stable 60% of revenue, while SG&A has been a stable $500,000 FIXED amount, regardless of the sales level. If current-year revenue is $5,000,000, next year's forecast operating profit is closest to:",
        ["$1,650,000.", "$1,700,000.", "$2,000,000."],
        1,
        "Chiffre d'affaires prévisionnel = 5 000 000 $ × 1,10 = 5 500 000 $. COGS (variable, % des ventes) = 60 % × 5 500 000 $ = 3 300 000 $. SG&A reste FIXE à 500 000 $ (ne pas le faire croître avec les ventes, piège classique). Résultat opérationnel = 5 500 000 − 3 300 000 − 500 000 = 1 700 000 $.",
      ],

      // Concept 3 — Barrières à l'entrée et pouvoir de fixation des prix (officielle)
      [
        "A company is most likely to have pricing power if it operates in an industry that exhibits high:",
        ["bargaining power of customers.", "barriers to entry.", "intensity of industry rivalry."],
        1,
        "Des barrières à l'entrée élevées réduisent la menace de nouveaux entrants, ce qui tend à augmenter le pouvoir de fixation des prix des entreprises en place. Un fort pouvoir de négociation des clients et une forte rivalité réduisent au contraire ce pouvoir.",
      ],
      // Variante angle différent — quelle caractéristique RÉDUIT le pouvoir de prix, pas l'augmente
      [
        "Which of the following industry characteristics would most likely reduce a firm's pricing power?",
        ["High barriers to entry.", "Low bargaining power of customers.", "High intensity of rivalry among existing competitors."],
        2,
        "Une forte rivalité entre concurrents existants pousse les prix vers le bas et réduit le pouvoir de fixation des prix — contrairement aux barrières à l'entrée élevées et au faible pouvoir de négociation des clients, qui le renforcent tous deux.",
      ],
      // Variante plus difficile — synthétiser PLUSIEURS forces de Porter simultanément, certaines en sens opposé
      [
        "An industry has high barriers to entry (large capital requirements), but also only two dominant suppliers of a critical raw material with no viable substitutes, and end customers who are highly price-sensitive and can easily switch between the few competing firms. Considering all of Porter's five forces together, a firm in this industry would most likely have:",
        [
          "strong pricing power overall, since barriers to entry dominate all other considerations.",
          "limited pricing power overall, despite high barriers to entry, because of strong supplier and customer bargaining power.",
          "pricing power that depends entirely on the number of direct competitors, which is not specified.",
        ],
        1,
        "Une seule force favorable (barrières à l'entrée élevées) ne garantit pas un fort pouvoir de prix si d'autres forces sont défavorables : ici, un pouvoir de négociation fort des fournisseurs (peu nombreux, sans substitut) ET des clients (sensibles au prix, peuvent changer facilement) compriment le pouvoir de fixation des prix malgré la protection contre les nouveaux entrants — il faut peser TOUTES les forces ensemble, pas une seule isolément.",
      ],

      // Concept 4 — Effet d'une baisse des unités vendues sur le bilan (officielle)
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
      // Variante angle différent — IDENTIFIER quels postes réagissent, par élimination du non-concerné
      [
        "A decline in a company's unit sales volume would most likely have a direct effect on which of the following pairs of balance sheet items?",
        ["Accounts receivable and inventory.", "Prepaid expenses and goodwill.", "Long-term debt and common stock."],
        0,
        "Les créances clients et le stock sont directement liés au volume d'activité. Les charges payées d'avance, le goodwill, la dette long terme et les capitaux propres ne varient pas mécaniquement avec le volume de ventes.",
      ],
      // Variante plus difficile — appliquer la baisse proportionnellement à des montants réels de bilan
      [
        "An analyst forecasts a 5% decline in unit sales volume for next year, with no change in selling price, and expects days sales outstanding (DSO) and days inventory on hand (DOH) to remain at historical levels. Current accounts receivable is $200,000 and current inventory is $300,000. Assuming both items scale proportionally with the volume-driven revenue decline, their forecast values are closest to:",
        [
          "Accounts receivable $190,000; Inventory $285,000.",
          "Accounts receivable $200,000; Inventory $300,000 (both unchanged).",
          "Accounts receivable $190,000; Inventory $300,000.",
        ],
        0,
        "Créances clients prévisionnelles = 200 000 $ × 0,95 = 190 000 $. Stock prévisionnel = 300 000 $ × 0,95 = 285 000 $. Contrairement à la question officielle (identifier QUELS postes réagissent), cette variante exige d'appliquer réellement le pourcentage de baisse aux DEUX postes.",
      ],

      // Concept 5 — Impact relatif sur le résultat opérationnel (officielle)
      [
        "Fresh Farm Foods (FFF) reported Revenue of $800,000, COGS of $570,000, and SG&A of $96,000 for the year, based on sales of 140,000 units (Operating profit of $134,000). An analyst forecasts FFF will be forced to raise its unit price by 8%, causing demand to fall by 3,000 units. In percentage terms, which of the following will most likely see the biggest decrease?",
        ["Operating profit.", "Revenue.", "Gross profit."],
        0,
        "Le chiffre d'affaires et la marge brute encaissent le choc en partie, mais les frais SG&A restent fixes : c'est donc le résultat opérationnel qui absorbe la totalité du choc relatif et chute le plus fortement en pourcentage.",
      ],
      // Variante angle différent — le "pourquoi" (effet de levier opérationnel), pas un nouveau calcul chiffré
      [
        "A company holds SG&A expenses fixed regardless of changes in revenue or gross profit. Which of the following best explains why, following a price/volume shock, operating profit tends to fall by a LARGER percentage than revenue or gross profit?",
        [
          "Because fixed SG&A means the entire dollar impact of the shock lands on a much smaller base (operating profit), amplifying its percentage effect.",
          "Because SG&A automatically increases whenever revenue decreases.",
          "Because gross profit and operating profit are always mathematically identical.",
        ],
        0,
        "C'est l'effet de levier opérationnel : avec des charges fixes, tout choc en dollars sur le résultat se répercute sur une base beaucoup plus petite (le résultat opérationnel) que sur le chiffre d'affaires ou la marge brute, ce qui amplifie mécaniquement l'impact en pourcentage — cette variante explique le MÉCANISME plutôt que de le recalculer sur un nouvel exemple.",
      ],
      // Variante plus difficile — problème INVERSE : quelle hausse de prix maintient le résultat opérationnel constant ?
      [
        "Meadow Brook Dairy (MBD) currently sells 100,000 units at $10 per unit, with variable COGS of $6 per unit and fixed SG&A of $150,000 (Operating profit = $250,000). MBD expects a price increase to cause volume to fall to 90,000 units. Approximately what price increase would MBD need to implement to keep operating profit UNCHANGED at $250,000, given the new volume of 90,000 units?",
        ["2.5%.", "4.4%.", "6.7%."],
        1,
        "Nouveau COGS = 6 $ × 90 000 = 540 000 $. Pour maintenir un résultat opérationnel de 250 000 $ : Revenu nécessaire = 250 000 + 540 000 + 150 000 = 940 000 $. Prix nécessaire = 940 000 $ / 90 000 = 10,44 $, soit une hausse de (10,44−10)/10 ≈ 4,4 %. Contrairement à la question officielle (calculer l'effet d'un prix donné), il faut ici résoudre pour le prix INCONNU qui atteint un objectif donné — un problème inverse plus exigeant.",
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
