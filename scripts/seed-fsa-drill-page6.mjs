// Seed script — quiz de "drill" associé à la page 6 de la fiche PDF FSA
// (Analysis of Long-Term Assets). Structure : 5 concepts × (1 question
// officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page6.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 6 (Analysis of Long-Term Assets)",
    difficulty: 2,
    questions: [
      // Concept 1 — Coûts de développement logiciel jusqu'à faisabilité technologique (officielle)
      [
        "Mammoth, Inc. reports under U.S. GAAP. Mammoth has begun a long-term project to develop inventory control software for external sale. On its financial statements, Mammoth should:",
        [
          "capitalize all costs of this project.",
          "expense all costs of this project in the periods incurred.",
          "expense all costs of this project until technological feasibility has been established.",
        ],
        2,
        "Sous IFRS comme sous US GAAP, les coûts de développement de logiciels destinés à la vente sont passés en charges jusqu'à ce que la faisabilité technologique soit établie, puis capitalisés une fois cette faisabilité démontrée.",
      ],
      // Variante angle différent — le régime DIFFÉRENT du logiciel à usage interne
      [
        "A company is developing software for its own internal use (not for external sale). Under U.S. GAAP, costs incurred during the application development stage (after the preliminary project stage) are most likely:",
        [
          "expensed as incurred, just as during the preliminary stage.",
          "capitalized.",
          "always capitalized retroactively once the software is placed in service.",
        ],
        1,
        "Le logiciel à usage interne suit une logique différente de celui destiné à la vente externe : les coûts du stade préliminaire sont passés en charges, mais ceux du stade de développement applicatif (une fois le projet jugé faisable et engagé) sont capitalisés — le déclencheur n'est pas la « faisabilité technologique » mais le franchissement du stade préliminaire.",
      ],
      // Variante plus difficile — calcul combinant la répartition dépense/capitalisation ET l'amortissement
      [
        "A company spends $2 million over the year developing software for external sale: $500,000 before technological feasibility was established, and $1,500,000 after. Once feasibility was reached, management estimated the software would generate revenue for 4 years, and $300,000 of the capitalized costs were amortized by year-end. The software's net carrying value on the balance sheet at year-end is closest to:",
        ["$1,200,000.", "$1,700,000.", "$1,500,000."],
        0,
        "Seuls les 1 500 000 $ engagés APRÈS la faisabilité technologique sont capitalisés (les 500 000 $ antérieurs sont passés en charges et ne figurent jamais au bilan). Valeur nette = 1 500 000 $ − 300 000 $ d'amortissement = 1 200 000 $.",
      ],

      // Concept 2 — Actifs incorporels à durée de vie indéfinie (officielle)
      [
        "Which of the following items is least likely an example of an intangible asset with an indefinite life?",
        ["Acquired patents.", "Goodwill.", "Trademarks that can be renewed at minimal cost."],
        0,
        "Les brevets acquis sont achetés pour une durée déterminée : ils ont une durée de vie finie. Le goodwill a par définition une durée de vie indéfinie, tout comme les marques renouvelables à coût minime.",
      ],
      // Variante angle différent — la nuance du COÛT de renouvellement, pas juste patent vs goodwill
      [
        "A company holds a trademark that is renewable every 10 years. Renewing it requires a substantial legal and marketing expenditure, comparable to launching a new brand. This trademark should most likely be treated, for accounting purposes, as an intangible asset with a:",
        [
          "finite useful life, and therefore amortized.",
          "indefinite useful life, and therefore not amortized but tested for impairment.",
          "indefinite useful life, and therefore amortized over an assumed 10-year period.",
        ],
        0,
        "C'est le COÛT de renouvellement qui détermine la classification, pas le simple fait d'être renouvelable : un renouvellement coûteux (comparable à un nouveau lancement de marque) signale une durée de vie FINIE, à amortir — contrairement à un renouvellement à coût minime, qui justifie une durée de vie indéfinie.",
      ],
      // Variante plus difficile — combine durée de vie finie ET interdiction de réévaluation à la hausse (US GAAP)
      [
        "A company acquires a license to operate a toll road for a fixed, non-renewable term of 30 years, for $60 million. Five years later, an independent appraisal determines the fair value of the remaining license term to be $70 million, due to higher-than-expected toll revenue. Under U.S. GAAP, which of the following is most accurate?",
        [
          "The license should be revalued to $70 million, since its usefulness has increased.",
          "The license continues to be amortized on its original cost basis over the 30-year term; no upward revaluation is permitted.",
          "The license should be reclassified as having an indefinite life, since demand now exceeds expectations.",
        ],
        1,
        "Cette licence a une durée de vie finie (30 ans, non renouvelable) : elle reste amortie sur son coût d'origine. Comme pour tout actif long terme en usage sous US GAAP, aucune réévaluation à la hausse n'est permise, même si sa juste valeur a augmenté — il faut combiner deux règles (amortissement sur durée finie + interdiction de réévaluation) pour répondre correctement.",
      ],

      // Concept 3 — Pas de réévaluation à la hausse sous US GAAP (officielle)
      [
        "Marcel Inc. is a large manufacturing company. Marcel has long-lived assets currently in use that are valued on the balance sheet at $600 million, including previously recognized impairment losses of $80 million. The original cost of the assets was $750 million. The fair value of the assets was determined in a professional appraisal to be $690 million. Assuming Marcel reports under U.S. GAAP, the new appraisal of the assets' value most likely results in:",
        [
          "a $90 million gain in other comprehensive income.",
          "an $80 million gain on income statement and $10 million gain in other comprehensive income.",
          "no change to Marcel's financial statements.",
        ],
        2,
        "Sous US GAAP, les réévaluations à la hausse sont interdites pour des actifs long terme en usage (sauf exception pour les actifs détenus en vue de la vente, qui ne s'applique pas ici). Marcel ne peut donc pas réévaluer ses actifs.",
      ],
      // Variante angle différent — le régime IFRS (réévaluation permise, mais où ?), pas "aucun changement"
      [
        "Under IFRS, a firm using the revaluation model for property, plant, and equipment determines that the fair value of an asset has increased above its carrying amount, with no prior impairment recognized on that asset. This increase is most likely recognized in:",
        ["net income.", "other comprehensive income.", "neither; revaluation gains are never recognized under IFRS."],
        1,
        "Sous IFRS, avec le modèle de réévaluation, une hausse de juste valeur (sans dépréciation antérieure à annuler) passe par les autres éléments du résultat global — contrairement au régime US GAAP de la question officielle, qui interdit purement et simplement toute réévaluation à la hausse.",
      ],
      // Variante plus difficile — reprise partielle en résultat + partielle en OCI (annule une dépréciation antérieure)
      [
        "A firm using the IFRS revaluation model previously recognized a $30 million impairment loss on a piece of equipment, fully reflected in net income. This year, an appraisal determines the equipment's fair value has increased by $45 million above its current carrying amount. How should the firm most appropriately recognize this $45 million increase?",
        [
          "The full $45 million should be recognized in net income.",
          "$30 million should be recognized in net income (reversing the prior impairment) and $15 million in other comprehensive income.",
          "The full $45 million should be recognized in other comprehensive income.",
        ],
        1,
        "Sous IFRS, une hausse de juste valeur repasse d'abord par le résultat net, mais seulement à hauteur de la dépréciation antérieurement constatée sur ce même actif (30 M$, annulant la perte passée) ; l'excédent (45 − 30 = 15 M$) va, lui, dans les autres éléments du résultat global — un calcul en deux temps plus exigeant que la simple question officielle.",
      ],

      // Concept 4 — Net PP&E / amortissement = durée de vie utile restante (officielle)
      [
        "Which of the following is best estimated by the ratio of net PP&E to annual depreciation expense?",
        ["Remaining useful life.", "Average age.", "Total useful life."],
        0,
        "Durée de vie utile restante = immobilisations nettes / charge annuelle d'amortissement.",
      ],
      // Variante angle différent — calculer les 3 estimations à partir des mêmes données et choisir la bonne
      [
        "A company's gross PP&E is $900,000, accumulated depreciation is $300,000, and annual depreciation expense is $60,000. The estimate of the REMAINING useful life of the asset base, in years, is closest to:",
        ["5 years.", "10 years.", "15 years."],
        1,
        "Immobilisations nettes = 900 000 − 300 000 = 600 000 $. Durée de vie restante = 600 000 $ / 60 000 $ = 10 ans. Les distracteurs correspondent aux deux AUTRES ratios classiques calculables avec les mêmes données : l'âge moyen (amortissement cumulé / amortissement annuel = 300 000/60 000 = 5 ans) et la durée de vie totale (PP&E brut / amortissement annuel = 900 000/60 000 = 15 ans).",
      ],
      // Variante plus difficile — reconstituer le PP&E net de fin d'année avant d'appliquer le ratio
      [
        "A company's net PP&E at the start of the year was $500,000. During the year, the company recorded $80,000 of depreciation expense and purchased $150,000 of new equipment (no assets were sold or disposed of). Using the year-end net PP&E balance, the estimated remaining useful life of the company's asset base is closest to:",
        ["6.25 years.", "7.1 years.", "7.75 years."],
        1,
        "PP&E net de fin d'année = 500 000 + 150 000 (achats) − 80 000 (amortissement) = 570 000 $. Durée de vie restante = 570 000 $ / 80 000 $ ≈ 7,1 ans. Il faut d'abord reconstituer le solde de fin d'année (option A utilise à tort le solde de DÉBUT d'année, 500 000/80 000 = 6,25) avant d'appliquer le ratio.",
      ],

      // Concept 5 — Capitalisation vs passation en charges (officielle)
      [
        "When comparing the financial statement effects of expensing versus capitalizing an expenditure, capitalizing will most likely result in which of the following effects in the years after the expenditure is incurred?",
        [
          "Lower net income and higher return on assets.",
          "Higher net income and lower return on assets.",
          "Lower net income and lower return on assets.",
        ],
        2,
        "Dans les années suivant la dépense, la capitalisation entraîne une charge d'amortissement déduite du résultat net (plus faible qu'en cas de passation en charges immédiate) et augmente le total des actifs, ce qui fait baisser le ROA.",
      ],
      // Variante angle différent — effet dans l'année MÊME de la dépense (pas les années suivantes)
      [
        "In the year an expenditure is incurred, compared to expensing it immediately, capitalizing the same expenditure will most likely result in:",
        ["higher net income and higher total assets.", "lower net income and lower total assets.", "higher net income and lower total assets."],
        0,
        "L'année même de la dépense, capitaliser évite de passer tout le montant en charge immédiatement (seule une petite fraction, l'amortissement de l'année, réduit le résultat) : le résultat net ET le total des actifs sont donc plus élevés que si la dépense avait été passée en charges en totalité — l'inverse de l'effet en années suivantes testé par la question officielle.",
      ],
      // Variante plus difficile — raisonnement multi-année : quand les résultats cumulés se rejoignent-ils ?
      [
        "A company capitalizes a $100,000 expenditure at the start of Year 1 and depreciates it straight-line over 5 years with no salvage value. A competitor expenses an identical $100,000 cost immediately in Year 1. Assuming both companies have identical revenue and all other costs, in which year will the two companies' CUMULATIVE net income (since Year 1) become equal again?",
        ["Year 2.", "Year 3.", "Year 5."],
        2,
        "La capitalisation ne change pas le montant TOTAL finalement passé en charges, seulement son ÉTALEMENT dans le temps : à la fin de l'année 5, l'entreprise qui capitalise a cumulé 5 × 20 000 $ = 100 000 $ d'amortissement, exactement comme l'entreprise qui a tout passé en charges dès l'année 1. Les résultats nets cumulés se rejoignent donc précisément à la fin de l'année 5, une fois l'actif totalement amorti.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 6...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
