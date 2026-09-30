// Seed script — quiz de "drill" associé à la page 6 de la fiche PDF FSA
// (Analysis of Long-Term Assets). Structure Fixed Income : 5 concepts × 3
// variantes (questions en anglais ; explications en français). Concept 1
// = question officielle du PDF imprimé (qcm_data/fsa_raw.txt) ; variantes
// 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page6.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 6 (Analysis of Long-Term Assets)",
    difficulty: 2,
    questions: [
      // Concept 1 — Coûts de développement logiciel jusqu'à faisabilité technologique
      [
        "Mammoth, Inc. reports under U.S. GAAP. Mammoth has begun a long-term project to develop inventory control software for external sale. On its financial statements, Mammoth should:",
        [
          "capitalize all costs of this project.",
          "expense all costs of this project in the periods incurred.",
          "expense all costs of this project until technological feasibility has been established.",
        ],
        2,
        "Sous IFRS comme sous US GAAP, les coûts de développement de logiciels sont passés en charges jusqu'à ce que la faisabilité technologique soit établie, puis capitalisés une fois cette faisabilité démontrée.",
      ],
      [
        "A company is developing internal-use software. Under U.S. GAAP, costs incurred during the preliminary project stage should most likely be:",
        ["capitalized.", "expensed as incurred.", "capitalized only once technological feasibility is achieved."],
        1,
        "Les coûts engagés au stade préliminaire d'un projet de logiciel (avant même la faisabilité technologique) sont toujours passés en charges au fur et à mesure.",
      ],
      [
        "Under both IFRS and U.S. GAAP, costs to develop software for external sale are:",
        [
          "always expensed as incurred, regardless of the stage of development.",
          "always capitalized from the start of the project.",
          "expensed until technological feasibility is established, then capitalized.",
        ],
        2,
        "La règle est la même sous les deux référentiels : dépenses passées en charges tant que la faisabilité technologique n'est pas atteinte, puis capitalisées à partir de ce point.",
      ],
      // Concept 2 — Actifs incorporels à durée de vie indéfinie
      [
        "Which of the following items is least likely an example of an intangible asset with an indefinite life?",
        ["Acquired patents.", "Goodwill.", "Trademarks that can be renewed at minimal cost."],
        0,
        "Les brevets acquis sont achetés pour une durée déterminée : ils ont une durée de vie finie. Le goodwill a par définition une durée de vie indéfinie, tout comme les marques renouvelables à coût minime.",
      ],
      [
        "Which of the following intangible assets most likely has a finite useful life?",
        [
          "A purchased patent with a legally defined expiration date.",
          "Goodwill recognized in a business combination.",
          "A broadcast license that can be renewed perpetually at negligible cost.",
        ],
        0,
        "Un brevet a une date d'expiration légale définie : sa durée de vie est donc finie et il doit être amorti. Le goodwill et une licence renouvelable à coût négligeable sont, eux, traités comme des incorporels à durée de vie indéfinie.",
      ],
      [
        "Which of the following is most likely treated as having an indefinite useful life for amortization purposes?",
        [
          "A patent with a 15-year legal life.",
          "A trademark that can be renewed indefinitely at minimal cost.",
          "A license with a fixed 10-year term and no renewal option.",
        ],
        1,
        "Seule la marque renouvelable indéfiniment à coût minime est traitée comme un actif à durée de vie indéfinie (non amorti, testé pour dépréciation). Les deux autres ont des durées de vie légales finies et doivent être amorties.",
      ],
      // Concept 3 — Pas de réévaluation à la hausse sous US GAAP
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
      [
        "A U.S. GAAP reporting firm has long-lived assets currently in use, carried at $400 million net of accumulated depreciation and impairment. An independent appraisal determines the assets' fair value to be $450 million. Under U.S. GAAP, the firm should most likely:",
        [
          "record a $50 million gain in net income.",
          "record a $50 million gain in other comprehensive income.",
          "make no adjustment to the financial statements.",
        ],
        2,
        "Même principe : sous US GAAP, une hausse de la juste valeur d'un actif long terme en usage n'est jamais comptabilisée, ni en résultat net ni en OCI — aucun ajustement n'est permis.",
      ],
      [
        "Under IFRS, a firm using the revaluation model for property, plant, and equipment determines that the fair value of an asset has increased above its carrying amount, with no prior impairment recognized on that asset. This increase is most likely recognized in:",
        ["net income.", "other comprehensive income.", "neither; revaluation gains are never recognized under IFRS."],
        1,
        "Sous IFRS, avec le modèle de réévaluation, une hausse de juste valeur (sans dépréciation antérieure à annuler) passe par les autres éléments du résultat global — contrairement à une reprise de dépréciation antérieure, qui elle repasse par le résultat net à hauteur du montant déprécié.",
      ],
      // Concept 4 — Net PP&E / amortissement = durée de vie utile restante
      [
        "Which of the following is best estimated by the ratio of net PP&E to annual depreciation expense?",
        ["Remaining useful life.", "Average age.", "Total useful life."],
        0,
        "Durée de vie utile restante = immobilisations nettes / charge annuelle d'amortissement.",
      ],
      [
        "A company's net property, plant, and equipment is $450,000 and its annual depreciation expense is $45,000. Dividing net PP&E by annual depreciation expense provides the best estimate of the asset base's:",
        ["total useful life.", "average age.", "remaining useful life."],
        2,
        "Le ratio immobilisations nettes / amortissement annuel = 450 000 $ / 45 000 $ = 10 ans, une estimation de la durée de vie utile RESTANTE, pas de la durée de vie totale (qui nécessiterait le PP&E brut) ni de l'âge moyen (qui nécessiterait l'amortissement cumulé).",
      ],
      [
        "Which of the following ratios would an analyst most likely use to estimate the remaining useful life of a company's depreciable assets?",
        [
          "Accumulated depreciation / annual depreciation expense.",
          "Net PP&E / annual depreciation expense.",
          "Gross PP&E / annual depreciation expense.",
        ],
        1,
        "Le ratio net PP&E / amortissement annuel estime la durée de vie restante. Le ratio avec l'amortissement cumulé au numérateur estime plutôt l'âge moyen, et celui avec le PP&E brut estime la durée de vie totale.",
      ],
      // Concept 5 — Capitalisation vs passation en charges
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
      [
        "In the year an expenditure is incurred, compared to expensing it immediately, capitalizing the same expenditure will most likely result in:",
        [
          "higher net income and higher total assets.",
          "lower net income and lower total assets.",
          "higher net income and lower total assets.",
        ],
        0,
        "L'année même de la dépense, capitaliser évite de passer tout le montant en charge immédiatement (seule une petite fraction, l'amortissement de l'année, réduit le résultat) : le résultat net ET le total des actifs sont donc plus élevés que si la dépense avait été passée en charges en totalité.",
      ],
      [
        "Compared to expensing a cash expenditure immediately, capitalizing the same expenditure will most likely result in, in the year the cost is incurred:",
        [
          "lower net income and lower cash flow from operations (CFO).",
          "higher net income and higher cash flow from operations (CFO).",
          "higher net income and lower cash flow from operations (CFO).",
        ],
        1,
        "Capitaliser classe la sortie de trésorerie en investissement plutôt qu'en exploitation : le CFO est donc plus élevé (pas amputé de cette sortie) qu'en cas de passation en charges, où la sortie de trésorerie réduit le CFO. Le résultat net est aussi plus élevé, pour la même raison que ci-dessus.",
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
