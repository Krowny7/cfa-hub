// Seed script — quiz de "drill" associé à la page 7 de la fiche PDF FSA
// (Topics in Long-Term Liabilities and Equity). Structure : 5 concepts ×
// (1 question officielle + 1 variante "angle différent" + 1 variante
// "plus difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions
// en anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page7.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 7 (Topics in Long-Term Liabilities and Equity)",
    difficulty: 2,
    questions: [
      // Concept 1 — Classification finance lease vs operating lease (officielle)
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
      // Variante angle différent — un AUTRE critère de classification (transfert de propriété)
      [
        "Which of the following characteristics would most likely cause a lessee to classify a lease as a finance lease rather than an operating lease?",
        [
          "The lease term is short relative to the asset's useful life.",
          "Ownership of the asset transfers to the lessee at the end of the lease term.",
          "The lessor retains substantially all the risks and rewards of ownership.",
        ],
        1,
        "Le transfert de propriété en fin de contrat est un critère autonome de classification en location financement, distinct de celui testé par la question officielle (durée du contrat = durée de vie de l'actif).",
      ],
      // Variante plus difficile — plusieurs critères en présence, un seul suffit (option d'achat avantageuse)
      [
        "A lessee enters into a 4-year lease for equipment with a 10-year useful life. The present value of the lease payments is $180,000, equal to 90% of the equipment's $200,000 fair value at inception. The lease also includes a bargain purchase option that the lessee is reasonably certain to exercise. Under U.S. GAAP, this lease should most likely be classified as a:",
        [
          "operating lease, since the term (4 years) is well below the asset's useful life (10 years).",
          "finance lease, because of the bargain purchase option.",
          "lease that cannot be classified without knowing the discount rate used.",
        ],
        1,
        "Plusieurs critères de classification existent, et UN SEUL suffit à déclencher la qualification en location financement : ici, l'option d'achat avantageuse que le preneur est quasi certain d'exercer suffit à elle seule, quel que soit le ratio durée/durée de vie utile (40 % seulement, qui suggérerait pourtant une location simple si on ne regardait que ce critère).",
      ],

      // Concept 2 — Actif et passif au bilan quel que soit le type de location (officielle)
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
      // Variante angle différent — reformulée en règle générale (both types), pas seulement l'avion
      [
        "Which of the following is most accurate regarding the balance sheet treatment of a lease under current IFRS and U.S. GAAP standards, assuming the lease is not short-term or low-value?",
        [
          "Only finance leases result in a lessee balance sheet asset and liability.",
          "Only operating leases result in a lessee balance sheet asset and liability.",
          "Both finance and operating leases result in a lessee balance sheet asset and liability.",
        ],
        2,
        "C'est précisément la réforme majeure des normes de location : les locations simples génèrent désormais, elles aussi, un actif et un passif au bilan du preneur, comme les locations financement — contrairement à l'ancien référentiel.",
      ],
      // Variante plus difficile — appliquer précisément l'exception « short-term » (seuil de 12 mois)
      [
        "A lessee signs a 10-month lease for office equipment and, separately, an 18-month lease for a company vehicle. Under current lease accounting standards, which of these leases, if any, would most likely qualify for an exception allowing the lessee to avoid recognizing a lease asset and liability on its balance sheet?",
        [
          "Only the 10-month equipment lease, under the short-term lease exception.",
          "Only the 18-month vehicle lease.",
          "Both leases qualify for the exception.",
        ],
        0,
        "L'exception pour contrats de courte durée s'applique aux locations de 12 mois ou moins au moment de la signature. Le contrat de 10 mois y est éligible ; celui de 18 mois dépasse ce seuil et doit générer un actif et un passif au bilan.",
      ],

      // Concept 3 — Régime à prestations définies au bilan (officielle)
      [
        "An employer offers a defined benefit pension plan and a defined contribution pension plan. The employer's balance sheet is most likely to present an asset or liability related to:",
        ["the defined benefit plan.", "the defined contribution plan.", "both of these pension plans."],
        0,
        "Seul un régime à prestations définies a un statut de financement qui apparaît au bilan comme actif ou passif. Les versements à un régime à cotisations définies sont simplement passés en charges.",
      ],
      // Variante angle différent — pourquoi l'obligation de l'employeur est éteinte dans un régime DC
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
      // Variante plus difficile — combiner le calcul du statut de financement DB ET exclure correctement le DC
      [
        "A company's defined benefit pension plan has plan assets with a fair value of $450 million and a projected benefit obligation of $480 million at year-end. During the year, the company also made a $20 million cash contribution to a separate defined contribution plan for other employees. Which of the following amounts should appear on the company's balance sheet related to these two pension arrangements, combined?",
        [
          "A net pension liability of $30 million only.",
          "A net pension liability of $50 million.",
          "A net pension asset of $20 million and a net pension liability of $30 million, shown separately.",
        ],
        0,
        "Statut de financement du régime à prestations définies = 450 M$ (actifs) − 480 M$ (obligation) = −30 M$, soit un passif net de 30 M$. Le versement de 20 M$ au régime à cotisations définies est déjà entièrement passé en charges une fois payé : il ne laisse AUCUN solde résiduel au bilan — un piège consistant à vouloir l'additionner (option B) ou le présenter séparément comme un actif (option C).",
      ],

      // Concept 4 — Rémunération en actions amortie sur la période d'acquisition (officielle)
      [
        "Under which reporting standards are share-based compensation expensed to the income statement over the vesting period?",
        ["IFRS, but not U.S. GAAP.", "U.S. GAAP, but not IFRS.", "Both IFRS and U.S. GAAP."],
        2,
        "Les IFRS et les US GAAP exigent tous deux que la juste valeur de la rémunération en actions soit estimée à la date d'attribution et passée en charges sur la période d'acquisition des droits (vesting period).",
      ],
      // Variante angle différent — application directe : étalement sur la période de vesting
      [
        "A company grants stock options to its employees with a three-year vesting period. Under both IFRS and U.S. GAAP, the fair value of these options at the grant date is most likely:",
        ["expensed entirely in the year of grant.", "expensed evenly over the three-year vesting period.", "never expensed, only disclosed in the footnotes."],
        1,
        "La charge de rémunération en actions est étalée sur toute la période d'acquisition des droits (ici trois ans), pas comptabilisée d'un coup à l'octroi, ni seulement mentionnée en annexe.",
      ],
      // Variante plus difficile — ajuster la juste valeur pour un taux de perte estimé avant de l'étaler
      [
        "A company grants stock options with a grant-date fair value of $600,000 and a 3-year cliff vesting period (all options vest at once, only if the employee remains employed through the end of year 3). At the end of Year 1, the company estimates that 10% of the options will be forfeited due to expected employee turnover before vesting. Compensation expense recognized in Year 1 is closest to:",
        ["$180,000.", "$200,000.", "$60,000."],
        0,
        "Juste valeur totale attendue à être acquise = 600 000 $ × (1 − 10 %) = 540 000 $. Sur 3 ans en vesting « cliff », la charge annuelle = 540 000 $ / 3 = 180 000 $. Ignorer le taux de perte estimé (option B, 600 000/3=200 000) est une erreur fréquente : il faut ajuster la base AVANT de l'étaler.",
      ],

      // Concept 5 — Remboursement du principal : flux de financement (officielle)
      [
        "For a lessee, the portion of a lease payment that represents repayment of principal is a cash flow from:",
        ["operations.", "financing.", "investing."],
        1,
        "La portion principal d'un paiement de location est un flux sortant de financement. La portion intérêt est un flux d'exploitation sous US GAAP (et peut être exploitation ou financement sous IFRS).",
      ],
      // Variante angle différent — la portion INTÉRÊT, pas la portion principal
      [
        "For a lessee under a finance lease, the interest portion of a lease payment is most likely classified, under U.S. GAAP, as a cash flow from:",
        ["operations.", "investing.", "financing."],
        0,
        "Sous US GAAP, la portion intérêt d'un paiement de location financement est toujours classée en exploitation — seule la portion principal va en financement, l'inverse de ce que teste la question officielle.",
      ],
      // Variante plus difficile — calculer la portion intérêt (taux effectif) avant de déduire la portion financement
      [
        "A lessee makes a total lease payment of $25,000 during the year under a finance lease. At the start of the year, the lease liability balance was $180,000, and the effective interest rate on the lease is 6%. Under U.S. GAAP, how much of this $25,000 payment should be classified as a financing cash outflow?",
        ["$10,800.", "$14,200.", "$25,000."],
        1,
        "Intérêt de la période = 180 000 $ × 6 % = 10 800 $ (flux d'exploitation). Portion principal (flux de financement) = 25 000 $ − 10 800 $ = 14 200 $. Il faut d'abord calculer la portion intérêt via le taux effectif avant de pouvoir isoler la portion financement, contrairement à la question officielle qui donne directement le montant à classer.",
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
