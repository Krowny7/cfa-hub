// Seed script — quiz de "drill" associé à la page 8 de la fiche PDF FSA
// (Analysis of Income Taxes). Structure Fixed Income : 5 concepts × 3
// variantes (questions en anglais ; explications en français). Concept 1
// = question officielle du PDF imprimé (qcm_data/fsa_raw.txt) ; variantes
// 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page8.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 8 (Analysis of Income Taxes)",
    difficulty: 2,
    questions: [
      // Concept 1 — Impôt à payer déterminé par le résultat imposable
      [
        "Which of the following statements about tax deferrals is NOT correct?",
        [
          "A deferred tax liability is expected to result in future cash outflow.",
          "Income tax paid can include payments or refunds for other years.",
          "Taxes payable are determined by pretax income and the tax rate.",
        ],
        2,
        "L'impôt à payer est déterminé par le résultat imposable (taxable income), pas par le résultat avant impôt (pretax income). Le résultat avant impôt détermine la charge d'impôt (income tax expense), un concept distinct.",
      ],
      [
        "Which of the following statements regarding income taxes is most accurate?",
        [
          "Income tax expense is determined by applying the tax rate(s) to pretax income.",
          "Taxes payable are determined by applying the statutory tax rate to pretax income.",
          "Pretax income and taxable income are always identical.",
        ],
        0,
        "La charge d'impôt (income tax expense) est calculée sur le résultat avant impôt (pretax income), tandis que l'impôt à payer (taxes payable) est calculé sur le résultat imposable (taxable income) — les deux résultats diffèrent presque toujours en présence de différences temporaires ou permanentes.",
      ],
      [
        "A company's taxes payable are most accurately determined by applying the tax rate to its:",
        ["pretax income, as reported in the financial statements.", "taxable income, as reported to the tax authorities.", "net income after tax."],
        1,
        "C'est le résultat imposable, déclaré à l'administration fiscale, qui détermine l'impôt effectivement à payer — pas le résultat avant impôt des états financiers.",
      ],
      // Concept 2 — Calcul d'un passif d'impôt différé (DTL)
      [
        "Gator Sarl (Gator) purchased PP&E at the start of the period costing €21,000, with a three-year useful economic life and no residual value. Gator uses straight-line depreciation in its accounts, but the tax authorities use double-declining balance. At the end of Year 2, the carrying value of the asset is €7,000 and its tax base is €2,333. Assuming a statutory tax rate of 30%, which of the following is closest to the DTL reported in Gator's balance sheet at the end of Year 2?",
        ["€700.", "€1,400.", "€2,100."],
        1,
        "DTL = (valeur comptable − base fiscale) × taux statutaire = (7 000 € − 2 333 €) × 0,30 = 1 400 €.",
      ],
      [
        "An asset has a carrying value of $12,000 and a tax base of $5,000. Assuming a statutory tax rate of 25%, the deferred tax liability associated with this asset is closest to:",
        ["$1,250.", "$1,750.", "$2,250."],
        1,
        "DTL = (12 000 $ − 5 000 $) × 0,25 = 1 750 $.",
      ],
      [
        "An asset has a carrying value of $9,500 and a tax base of $4,000. Assuming a statutory tax rate of 20%, the deferred tax liability associated with this asset is closest to:",
        ["$900.", "$1,100.", "$1,300."],
        1,
        "DTL = (9 500 $ − 4 000 $) × 0,20 = 1 100 $.",
      ],
      // Concept 3 — Classification analytique des passifs d'impôts différés
      [
        "When analyzing a company's financial leverage, deferred tax liabilities are best classified as:",
        [
          "a liability or equity, depending on the company's particular situation.",
          "a liability.",
          "neither as a liability, nor as equity.",
        ],
        0,
        "Le traitement recommandé est de considérer les passifs d'impôts différés comme des passifs s'ils sont censés se dénouer, ou comme des capitaux propres s'ils ne sont pas censés se dénouer — la classification dépend du cas.",
      ],
      [
        "When analyzing a company's solvency ratios, deferred tax liabilities that are expected to reverse in the foreseeable future should most appropriately be treated as:",
        ["a liability.", "equity.", "neither a liability nor equity; they should be ignored."],
        0,
        "Un passif d'impôt différé censé se dénouer (donner lieu à une vraie sortie de trésorerie future) doit être traité comme une véritable dette dans l'analyse du levier financier.",
      ],
      [
        "For analytical purposes, deferred tax liabilities that are not expected to reverse in the foreseeable future are most appropriately treated as:",
        ["a liability.", "equity.", "a contra-asset."],
        1,
        "Un passif d'impôt différé qui ne devrait jamais se dénouer se comporte économiquement comme des capitaux propres (il ne générera jamais de sortie de trésorerie réelle) et devrait être reclassé comme tel pour l'analyse.",
      ],
      // Concept 4 — Calcul du taux d'imposition effectif
      [
        "Last year, Schoenberg AG earned net income of €150,000, an income tax expense of €47,000, and paid tax of €51,000. What was the effective tax rate?",
        ["23.9%.", "25.9%.", "31.3%."],
        0,
        "Taux d'imposition effectif = charge d'impôt / résultat avant impôt = 47 000 € / (150 000 € + 47 000 €) = 23,9 %.",
      ],
      [
        "A company earned net income of $200,000 and reported an income tax expense of $60,000 for the year, while paying $65,000 in cash taxes. The company's effective tax rate was closest to:",
        ["23.1%.", "25.0%.", "30.0%."],
        0,
        "Taux d'imposition effectif = charge d'impôt / résultat avant impôt = 60 000 $ / (200 000 $ + 60 000 $) = 60 000 $ / 260 000 $ = 23,1 %.",
      ],
      [
        "A company earned net income of $90,000 and reported an income tax expense of $30,000 for the year, while paying $28,000 in cash taxes. The company's effective tax rate was closest to:",
        ["22.5%.", "25.0%.", "33.3%."],
        1,
        "Taux d'imposition effectif = 30 000 $ / (90 000 $ + 30 000 $) = 30 000 $ / 120 000 $ = 25,0 %.",
      ],
      // Concept 5 — Différence temporaire → élément d'impôt différé
      [
        "A temporary difference between pretax income reported in a firm's financial statements and taxable income the firm reports to the tax authorities results in:",
        [
          "an adjustment to the firm's effective tax rate.",
          "a gain or loss in comprehensive income.",
          "a deferred tax item.",
        ],
        2,
        "Une différence temporaire crée un passif d'impôt différé si la charge d'impôt excède l'impôt à payer, ou un actif d'impôt différé si elle lui est inférieure. C'est une différence permanente qui fait diverger le taux d'imposition effectif du taux statutaire.",
      ],
      [
        "A difference between a firm's pretax income and its taxable income that is expected to reverse in a future period is best described as a:",
        ["permanent difference.", "temporary difference, giving rise to a deferred tax item.", "tax loss carryforward."],
        1,
        "Une différence appelée à se résorber dans le temps est par définition une différence temporaire, source d'un élément d'impôt différé (actif ou passif). Une différence permanente, elle, ne se résorbe jamais.",
      ],
      [
        "Which of the following differences between financial reporting and tax reporting is most likely to give rise to a deferred tax asset or liability?",
        [
          "A permanent difference, such as tax-exempt municipal bond interest.",
          "A temporary difference, such as using different depreciation methods for financial and tax reporting.",
          "A difference in the company's functional reporting currency.",
        ],
        1,
        "Seule une différence temporaire (comme des méthodes d'amortissement différentes entre comptes et fiscalité) crée un actif ou passif d'impôt différé. Une différence permanente n'a par nature aucun effet différé, et la devise fonctionnelle n'a rien à voir avec la fiscalité différée.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 8...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
