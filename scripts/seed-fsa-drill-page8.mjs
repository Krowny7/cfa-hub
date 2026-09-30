// Seed script — quiz de "drill" associé à la page 8 de la fiche PDF FSA
// (Analysis of Income Taxes). Structure : 5 concepts × (1 question
// officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page8.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 8 (Analysis of Income Taxes)",
    difficulty: 2,
    questions: [
      // Concept 1 — Impôt à payer déterminé par le résultat imposable (officielle)
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
      // Variante angle différent — application directe : quelle base sert au calcul de l'impôt à payer
      [
        "A company's taxes payable are most accurately determined by applying the tax rate to its:",
        ["pretax income, as reported in the financial statements.", "taxable income, as reported to the tax authorities.", "net income after tax."],
        1,
        "C'est le résultat imposable, déclaré à l'administration fiscale, qui détermine l'impôt effectivement à payer — pas le résultat avant impôt des états financiers.",
      ],
      // Variante plus difficile — calculer LES DEUX bases simultanément sans les confondre
      [
        "A company reports pretax income of $500,000 under financial reporting, but its taxable income is $440,000 due to a temporary difference. The applicable tax rate is 25%. The company's income tax expense and taxes payable are closest to, respectively:",
        ["$125,000 and $110,000.", "$110,000 and $125,000.", "$125,000 and $125,000."],
        0,
        "Charge d'impôt = résultat avant impôt × taux = 500 000 $ × 25 % = 125 000 $. Impôt à payer = résultat imposable × taux = 440 000 $ × 25 % = 110 000 $. La différence (15 000 $) crée un passif d'impôt différé — il faut calculer les deux bases séparément sans les inverser.",
      ],

      // Concept 2 — Calcul d'un passif d'impôt différé (DTL) (officielle)
      [
        "Gator Sarl (Gator) purchased PP&E at the start of the period costing €21,000, with a three-year useful economic life and no residual value. Gator uses straight-line depreciation in its accounts, but the tax authorities use double-declining balance. At the end of Year 2, the carrying value of the asset is €7,000 and its tax base is €2,333. Assuming a statutory tax rate of 30%, which of the following is closest to the DTL reported in Gator's balance sheet at the end of Year 2?",
        ["€700.", "€1,400.", "€2,100."],
        1,
        "DTL = (valeur comptable − base fiscale) × taux statutaire = (7 000 € − 2 333 €) × 0,30 = 1 400 €.",
      ],
      // Variante angle différent — reverse-engineering : DTL et base fiscale donnés, retrouver la valeur comptable
      [
        "An asset has a tax base of $12,000, and a 25% statutory tax rate applies. If the deferred tax liability associated with this asset is $2,000, the asset's carrying value on the balance sheet is closest to:",
        ["$8,000.", "$14,000.", "$20,000."],
        2,
        "DTL = (valeur comptable − base fiscale) × taux → 2 000 = (VC − 12 000) × 0,25 → VC − 12 000 = 8 000 → VC = 20 000 $. Il faut ici remonter du DTL vers une composante du calcul, l'inverse de l'approche habituelle.",
      ],
      // Variante plus difficile — reconstruire les DEUX bases (comptable et fiscale) sur 2 ans avant le DTL
      [
        "A company purchases equipment for $30,000 with a 3-year useful life and no residual value. For financial reporting, it uses straight-line depreciation. For tax purposes, accelerated depreciation of 50%, 30%, and 20% of cost applies in Years 1, 2, and 3, respectively. Assuming a 20% tax rate, the deferred tax liability at the END of Year 2 is closest to:",
        ["$600.", "$800.", "$1,000."],
        1,
        "Valeur comptable fin Année 2 = 30 000 − (10 000 × 2) = 10 000 $ (amortissement linéaire de 10 000 $/an). Base fiscale fin Année 2 = 30 000 − 15 000 (50 %) − 9 000 (30 %) = 6 000 $. DTL = (10 000 − 6 000) × 0,20 = 800 $. Il faut ici reconstruire les deux plans d'amortissement sur deux ans avant de pouvoir appliquer la formule, contrairement à la question officielle qui donne directement les deux bases.",
      ],

      // Concept 3 — Classification analytique des passifs d'impôts différés (officielle)
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
      // Variante angle différent — le cas précis "non censé se dénouer", pas la règle générale
      [
        "For analytical purposes, deferred tax liabilities that are NOT expected to reverse in the foreseeable future are most appropriately treated as:",
        ["a liability.", "equity.", "a contra-asset."],
        1,
        "Un passif d'impôt différé qui ne devrait jamais se dénouer se comporte économiquement comme des capitaux propres (il ne générera jamais de sortie de trésorerie réelle) et devrait être reclassé comme tel pour l'analyse — contrairement à un DTL censé se dénouer, traité comme une vraie dette.",
      ],
      // Variante plus difficile — retraiter un bilan complet en scindant le DTL en deux composantes
      [
        "A company's balance sheet shows total liabilities of $800 million (including $60 million of deferred tax liabilities) and total equity of $400 million. An analyst determines that $20 million of the deferred tax liabilities are expected to reverse in the foreseeable future, while the remaining $40 million are not expected to reverse. For analytical purposes, the analyst's adjusted total liabilities and adjusted total equity are closest to:",
        [
          "Liabilities $740 million, Equity $460 million.",
          "Liabilities $760 million, Equity $440 million.",
          "Liabilities $780 million, Equity $420 million.",
        ],
        1,
        "Seuls les 40 M$ de DTL non censés se dénouer doivent être reclassés en capitaux propres. Passifs ajustés = 800 − 40 = 760 M$. Capitaux propres ajustés = 400 + 40 = 440 M$. Les 20 M$ restants (censés se dénouer) restent classés en passifs, sans ajustement.",
      ],

      // Concept 4 — Calcul du taux d'imposition effectif (officielle)
      [
        "Last year, Schoenberg AG earned net income of €150,000, an income tax expense of €47,000, and paid tax of €51,000. What was the effective tax rate?",
        ["23.9%.", "25.9%.", "31.3%."],
        0,
        "Taux d'imposition effectif = charge d'impôt / résultat avant impôt = 47 000 € / (150 000 € + 47 000 €) = 23,9 %.",
      ],
      // Variante angle différent — reverse-engineering : taux et charge donnés, retrouver le résultat net
      [
        "A company's effective tax rate for the year was 28%, and its income tax expense was $84,000. The company's net income for the year is closest to:",
        ["$216,000.", "$300,000.", "$384,000."],
        0,
        "Résultat avant impôt = charge d'impôt / taux effectif = 84 000 $ / 0,28 = 300 000 $. Résultat net = 300 000 $ − 84 000 $ = 216 000 $. Il faut remonter du taux effectif et de la charge vers le résultat net, l'inverse du calcul habituel.",
      ],
      // Variante plus difficile — classer TROIS taux (statutaire, effectif, cash) du plus élevé au plus faible
      [
        "A company operates in a country with a 30% statutory tax rate. It reports pretax income of $400,000, income tax expense of $108,000, and paid $95,000 in cash taxes during the year. Which of the following correctly ranks the company's statutory, effective, and cash tax rates from HIGHEST to LOWEST?",
        [
          "Statutory > Effective > Cash.",
          "Effective > Statutory > Cash.",
          "Cash > Effective > Statutory.",
        ],
        0,
        "Taux effectif = 108 000 $ / 400 000 $ = 27 %. Taux cash = 95 000 $ / 400 000 $ = 23,75 %. Classement : statutaire (30 %) > effectif (27 %) > cash (23,75 %). Il faut calculer deux taux distincts puis les classer ensemble avec le taux statutaire donné, plutôt que de calculer un seul taux comme dans la question officielle.",
      ],

      // Concept 5 — Différence temporaire → élément d'impôt différé (officielle)
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
      // Variante angle différent — distinguer une différence temporaire d'une différence permanente
      [
        "Which of the following differences between financial reporting and tax reporting is most likely to give rise to a deferred tax asset or liability?",
        [
          "A permanent difference, such as tax-exempt municipal bond interest.",
          "A temporary difference, such as using different depreciation methods for financial and tax reporting.",
          "A difference in the company's functional reporting currency.",
        ],
        1,
        "Seule une différence temporaire (comme des méthodes d'amortissement différentes entre comptes et fiscalité) crée un actif ou passif d'impôt différé. Une différence permanente n'a par nature aucun effet différé.",
      ],
      // Variante plus difficile — deux différences dans le même énoncé, une temporaire et une permanente
      [
        "A company recognizes a $50,000 warranty expense in its financial statements this year, but under local tax law, warranty costs are only tax-deductible when the warranty work is actually performed (none was performed this year). Separately, the company earned $10,000 of interest income from municipal bonds that is permanently tax-exempt. Which of these two items creates a deferred tax item, and of what type?",
        [
          "The warranty expense creates a deferred tax asset; the municipal bond interest creates no deferred tax item.",
          "The municipal bond interest creates a deferred tax asset; the warranty expense creates no deferred tax item.",
          "Both items create deferred tax liabilities.",
        ],
        0,
        "La charge de garantie est une différence TEMPORAIRE (déductible plus tard, quand les travaux seront réalisés) : elle crée un actif d'impôt différé. Les intérêts d'obligations municipales sont une différence PERMANENTE (jamais imposables, jamais déductibles) : ils ne créent jamais de poste d'impôt différé — il faut distinguer les deux natures dans un même énoncé.",
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
