// Seed script — quiz de "drill" associé à la page 7 de la fiche PDF FSA
// (Topics in Long-Term Liabilities and Equity). Structure Fixed Income : 5
// concepts × 3 variantes (questions en anglais ; explications en
// français). Concept 1 = question officielle du PDF imprimé (qcm_data/
// fsa_raw.txt) ; variantes 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page7.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 7 (Topics in Long-Term Liabilities and Equity)",
    difficulty: 2,
    questions: [
      // Concept 1 — Classification finance lease vs operating lease
      [
        "ABC Company leases manufacturing equipment for five years with annual payments of $20,000. The company will return the equipment to the lessor at the end of the lease. The term of the lease is equal to the equipment's useful life. Under U.S. GAAP, the company will:",
        [
          "report the lease as an operating lease.",
          "record a right-of-use asset on the balance sheet.",
          "recognize an amortization expense equal to the principal repayment each period.",
        ],
        1,
        "La durée du contrat étant égale à la durée de vie utile de l'actif, il s'agit d'une location financement : le preneur comptabilise la valeur actualisée des paiements comme droit d'utilisation, amorti linéairement.",
      ],
      [
        "A company leases equipment for a term equal to the equipment's entire remaining useful life, with no expectation that the asset will be returned to the lessor in usable condition. Under U.S. GAAP, this lease should most likely be classified, from the lessee's perspective, as a(n):",
        ["operating lease.", "finance lease.", "sales-type lease."],
        1,
        "Un contrat couvrant la quasi-totalité de la durée de vie utile de l'actif est un signal clé de location financement (le preneur assume substantiellement tous les risques et avantages liés à la propriété). Le « sales-type lease » est une classification utilisée côté bailleur, pas côté preneur.",
      ],
      [
        "Which of the following characteristics would most likely cause a lessee to classify a lease as a finance lease rather than an operating lease?",
        [
          "The lease term is short relative to the asset's useful life.",
          "Ownership of the asset transfers to the lessee at the end of the lease term.",
          "The lessor retains substantially all the risks and rewards of ownership.",
        ],
        1,
        "Le transfert de propriété en fin de contrat est l'un des critères classiques qui impose la classification en location financement. Un terme court et le maintien des risques/avantages chez le bailleur pointent au contraire vers une location simple.",
      ],
      // Concept 2 — Actif et passif au bilan, quel que soit le type de location
      [
        "An airline leases a new airplane from its manufacturer for 10 years. For financial reporting, the airline must record an asset and a liability on its balance sheet:",
        [
          "only if the lease is a finance lease.",
          "only if the lease is an operating lease.",
          "regardless of whether the lease is a finance or operating lease.",
        ],
        2,
        "Pour les locations financement comme pour les locations simples, les IFRS et les US GAAP exigent un actif et un passif au bilan du preneur, sauf exception pour les contrats de courte durée ou les actifs de faible valeur (sous IFRS).",
      ],
      [
        "Under current lease accounting standards, a lessee with a 5-year lease (longer than the short-term exception) for a piece of equipment must recognize on its balance sheet:",
        [
          "an asset and a liability, only if the lease is classified as a finance lease.",
          "an asset and a liability, regardless of whether the lease is classified as finance or operating.",
          "a liability only, regardless of lease classification.",
        ],
        1,
        "Depuis la réforme des normes de location, un actif ET un passif sont comptabilisés au bilan du preneur pour pratiquement tous les contrats de plus d'un an, que la location soit classée financement ou simple.",
      ],
      [
        "Which of the following is most accurate regarding the balance sheet treatment of a lease under current IFRS and U.S. GAAP standards, assuming the lease is not short-term or low-value?",
        [
          "Only finance leases result in a lessee balance sheet asset and liability.",
          "Only operating leases result in a lessee balance sheet asset and liability.",
          "Both finance and operating leases result in a lessee balance sheet asset and liability.",
        ],
        2,
        "C'est précisément la réforme majeure des normes de location : contrairement à l'ancien référentiel, les locations simples génèrent désormais, elles aussi, un actif et un passif au bilan du preneur, comme les locations financement.",
      ],
      // Concept 3 — Régime à prestations définies au bilan
      [
        "An employer offers a defined benefit pension plan and a defined contribution pension plan. The employer's balance sheet is most likely to present an asset or liability related to:",
        ["the defined benefit plan.", "the defined contribution plan.", "both of these pension plans."],
        0,
        "Seul un régime à prestations définies a un statut de financement qui apparaît au bilan comme actif ou passif. Les versements à un régime à cotisations définies sont simplement passés en charges.",
      ],
      [
        "An employer sponsors both a defined benefit pension plan and a defined contribution pension plan for its employees. Under which plan would a net pension asset or liability most likely appear on the employer's balance sheet?",
        ["The defined contribution plan only.", "The defined benefit plan only.", "Both plans equally."],
        1,
        "Même principe : le régime à prestations définies génère un actif ou passif net de retraite au bilan (différence entre juste valeur des actifs du régime et obligation de prestations). Le régime à cotisations définies ne génère jamais un tel poste.",
      ],
      [
        "Which of the following statements about defined contribution pension plans is most accurate?",
        [
          "The employer bears the investment risk associated with the plan's assets.",
          "A funded status is recorded as an asset or liability on the employer's balance sheet.",
          "The employer's obligation is essentially satisfied once the required contribution is made.",
        ],
        2,
        "Dans un régime à cotisations définies, l'employeur n'a qu'une obligation de verser la cotisation convenue — une fois versée, son obligation est remplie. C'est l'employé, et non l'employeur, qui supporte le risque d'investissement, et aucun statut de financement n'apparaît au bilan de l'employeur.",
      ],
      // Concept 4 — Rémunération en actions amortie sur la période d'acquisition
      [
        "Under which reporting standards are share-based compensation expensed to the income statement over the vesting period?",
        ["IFRS, but not U.S. GAAP.", "U.S. GAAP, but not IFRS.", "Both IFRS and U.S. GAAP."],
        2,
        "Les IFRS et les US GAAP exigent tous deux que la juste valeur de la rémunération en actions soit estimée à la date d'attribution et passée en charges sur la période d'acquisition des droits (vesting period).",
      ],
      [
        "A company grants stock options to its employees with a three-year vesting period. Under both IFRS and U.S. GAAP, the fair value of these options at the grant date is most likely:",
        [
          "expensed entirely in the year of grant.",
          "expensed evenly over the three-year vesting period.",
          "never expensed, only disclosed in the footnotes.",
        ],
        1,
        "La charge de rémunération en actions est étalée sur toute la période d'acquisition des droits (ici trois ans), pas comptabilisée d'un coup à l'octroi, ni seulement mentionnée en annexe.",
      ],
      [
        "Under which of the following sets of standards must the fair value of employee stock options be estimated at the grant date and recognized as compensation expense over time?",
        ["IFRS only.", "U.S. GAAP only.", "Both IFRS and U.S. GAAP."],
        2,
        "C'est une exigence commune aux deux référentiels comptables, pas une spécificité de l'un ou de l'autre.",
      ],
      // Concept 5 — Remboursement du principal : flux de financement
      [
        "For a lessee, the portion of a lease payment that represents repayment of principal is a cash flow from:",
        ["operations.", "financing.", "investing."],
        1,
        "La portion principal d'un paiement de location est un flux sortant de financement. La portion intérêt est un flux d'exploitation sous US GAAP (et peut être exploitation ou financement sous IFRS).",
      ],
      [
        "For a lessee under a finance lease, the interest portion of a lease payment is most likely classified, under U.S. GAAP, as a cash flow from:",
        ["operations.", "investing.", "financing."],
        0,
        "Sous US GAAP, la portion intérêt d'un paiement de location financement est toujours classée en exploitation — seule la portion principal va en financement.",
      ],
      [
        "A lessee makes a lease payment of $10,000, of which $7,000 represents repayment of principal and $3,000 represents interest. Under U.S. GAAP, how is this payment most likely classified on the lessee's statement of cash flows?",
        [
          "$10,000 as a financing outflow.",
          "$7,000 as a financing outflow and $3,000 as an operating outflow.",
          "$7,000 as an operating outflow and $3,000 as a financing outflow.",
        ],
        1,
        "Le paiement doit être scindé : le remboursement de principal (7 000 $) est un flux de financement, et les intérêts (3 000 $) sont un flux d'exploitation sous US GAAP — jamais le contraire, et jamais le montant total dans une seule section.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 7...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
