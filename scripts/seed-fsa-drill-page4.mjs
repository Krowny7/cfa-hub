// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF FSA
// (Analyzing Statements of Cash Flows II). Structure Fixed Income : 5
// concepts × 3 variantes (questions en anglais ; explications en
// français). Concept 1 = question officielle du PDF imprimé (qcm_data/
// fsa_raw.txt) ; variantes 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page4.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 4 (Analyzing Statements of Cash Flows II)",
    difficulty: 2,
    questions: [
      // Concept 1 — Calcul du FCFF
      [
        "Joplin Corporation reports the following in its year-end financial statements: Net income of $43.7 million. Depreciation expense of $4.2 million. Increase in accounts receivable of $1.5 million. Decrease in accounts payable of $2.3 million. Sold equipment for $15 million. Purchased equipment for $35 million. Joplin's free cash flow to the firm (FCFF) is closest to:",
        ["$39 million.", "$24 million.", "$28 million."],
        1,
        "FCFF = résultat net + charges non monétaires − investissement en capital fixe − investissement en BFR = 43,7 + 4,2 − (35 − 15) − (1,5 + 2,3) = 24,1 M$. L'augmentation des créances et la diminution des dettes fournisseurs sont toutes deux des usages de trésorerie.",
      ],
      [
        "Using the following data, calculate free cash flow to the firm (FCFF): Net income of $60 million. Depreciation expense of $8 million. Increase in accounts receivable of $2 million. Decrease in accounts payable of $1 million. Sold equipment for $10 million. Purchased equipment for $40 million.",
        ["$28 million.", "$35 million.", "$42 million."],
        1,
        "FCFF = 60 + 8 − (40 − 10) − (2 + 1) = 68 − 30 − 3 = 35 M$.",
      ],
      [
        "Using the following data, calculate free cash flow to the firm (FCFF): Net income of $25 million. Depreciation expense of $3 million. Decrease in accounts receivable of $1 million. Increase in accounts payable of $2 million. Sold equipment for $5 million. Purchased equipment for $18 million.",
        ["$12 million.", "$18 million.", "$24 million."],
        1,
        "FCFF = 25 + 3 − (18 − 5) − [(−1) − 2] = 28 − 13 − (−3) = 18 M$. Ici, la baisse des créances ET la hausse des dettes fournisseurs sont toutes deux des sources de trésorerie, donc l'investissement en BFR est négatif (il libère du cash au lieu d'en consommer).",
      ],
      // Concept 2 — Dénominateurs valides sur un tableau de flux en pourcentage
      [
        "A common-size cash flow statement is least likely to provide payments to employees as a percentage of:",
        ["revenues for the period.", "operating cash flow for the period.", "total cash outflows for the period."],
        1,
        "Il existe deux formats reconnus de tableau de flux en pourcentage : chaque sortie en % du total des sorties, ou en % du chiffre d'affaires. Le flux d'exploitation mélange entrées et sorties et n'est pas utilisé comme dénominateur pour un poste de paiement individuel.",
      ],
      [
        "On a common-size cash flow statement, cash paid for interest is least likely to be expressed as a percentage of:",
        ["revenue for the period.", "total cash outflows for the period.", "net income for the period."],
        2,
        "Le résultat net n'est pas un dénominateur standard pour un tableau de flux en pourcentage — seuls le chiffre d'affaires et le total des flux sortants (pour les sorties) ou entrants (pour les entrées) sont utilisés.",
      ],
      [
        "Which of the following is a valid basis for presenting a common-size cash flow statement?",
        [
          "Each item expressed as a percentage of net income.",
          "Each inflow expressed as a percentage of total inflows, and each outflow as a percentage of total outflows.",
          "Each item expressed as a percentage of total assets.",
        ],
        1,
        "C'est l'une des deux approches reconnues : chaque entrée en % du total des entrées, chaque sortie en % du total des sorties. Le résultat net et le total des actifs ne sont pas des bases reconnues pour ce type de présentation.",
      ],
      // Concept 3 — Baisse de la rotation des dettes fournisseurs
      [
        "How does decreasing accounts payable turnover affect a company's cash flow from financing activities and is this source of cash sustainable?",
        [
          "Financing cash flow: Increase / Sustainable source: No",
          "Financing cash flow: No impact / Sustainable source: No",
          "Financing cash flow: No impact / Sustainable source: Yes",
        ],
        1,
        "Payer plus lentement les fournisseurs économise de la trésorerie d'exploitation, pas de financement — aucun impact sur le CFF. Ce n'est pas durable, car les fournisseurs finiront par refuser d'étendre davantage leur crédit.",
      ],
      [
        "A company significantly slows down its payments to suppliers (a decrease in accounts payable turnover) in order to boost reported operating cash flow. This strategy is best described as:",
        [
          "sustainable indefinitely, since suppliers have no recourse.",
          "an operating source of cash that is unlikely to be sustainable over the long term.",
          "a financing source of cash that improves the firm's solvency.",
        ],
        1,
        "Ralentir les paiements fournisseurs est bien une source de trésorerie d'exploitation, mais non durable : les fournisseurs vont tôt ou tard réagir (crédit resserré, prix plus élevés, rupture de la relation commerciale).",
      ],
      [
        "Which of the following would most likely be considered a red flag regarding the sustainability of a company's operating cash flow?",
        [
          "A stable accounts payable turnover ratio over several years.",
          "A significant and sudden decrease in accounts payable turnover.",
          "A significant increase in accounts payable turnover.",
        ],
        1,
        "Une baisse soudaine et marquée de la rotation des dettes fournisseurs signale que l'entreprise « étire » ses paiements pour gonfler artificiellement son flux d'exploitation — un signal d'alerte classique sur la qualité et la durabilité du CFO.",
      ],
      // Concept 4 — Ratio de réinvestissement vs ratio de performance
      [
        "Which of the following best describes a ratio that measures a firm's ability to acquire long-term assets with cash flows from operations, and a performance ratio, respectively?",
        [
          "Acquire assets with CFO: Investing and financing ratio / Performance ratio: Cash-to-income ratio",
          "Acquire assets with CFO: Reinvestment ratio / Performance ratio: Cash-to-income ratio",
          "Acquire assets with CFO: Reinvestment ratio / Performance ratio: Debt payment ratio",
        ],
        1,
        "Le ratio de réinvestissement mesure la capacité à acquérir des actifs long terme avec le CFO ; le ratio cash-to-income est un ratio de performance mesurant la capacité à générer du cash à partir du résultat opérationnel.",
      ],
      [
        "Which of the following ratios would an analyst most likely use to assess a firm's ability to grow its productive capacity using cash generated from operations?",
        ["Cash-to-income ratio.", "Reinvestment ratio.", "Debt payment ratio."],
        1,
        "Le ratio de réinvestissement (CFO / trésorerie payée pour les actifs long terme) est précisément conçu pour mesurer cette capacité de croissance financée par l'exploitation.",
      ],
      [
        "The cash-to-income ratio is best described as a measure of a firm's:",
        [
          "ability to acquire long-term assets using operating cash flow.",
          "ability to repay outstanding debt using operating cash flow.",
          "ability to generate cash from its operations relative to operating income.",
        ],
        2,
        "Le cash-to-income ratio (CFO / résultat opérationnel) est un ratio de performance : il évalue la capacité de l'entreprise à convertir son résultat opérationnel en trésorerie réelle, pas sa capacité d'investissement ou de remboursement de dette.",
      ],
      // Concept 5 — Calcul du ratio de réinvestissement
      [
        "Selected information from the most recent cash flow statement of Thibault Company: Cash from operating activities €1,300; Cash paid for plant and equipment (€2,600). Thibault's reinvestment ratio for this period is closest to:",
        ["0.50.", "0.75.", "1.00."],
        0,
        "Ratio de réinvestissement = CFO / trésorerie payée pour les actifs long terme = 1 300 € / 2 600 € = 0,50.",
      ],
      [
        "A company reports cash from operating activities of $2,000 and cash paid for property, plant, and equipment of $2,500. The reinvestment ratio is closest to:",
        ["0.60.", "0.80.", "1.25."],
        1,
        "Ratio de réinvestissement = 2 000 $ / 2 500 $ = 0,80.",
      ],
      [
        "A company reports cash from operating activities of $3,000 and cash paid for property, plant, and equipment of $5,000. The reinvestment ratio is closest to:",
        ["0.50.", "0.60.", "1.67."],
        1,
        "Ratio de réinvestissement = 3 000 $ / 5 000 $ = 0,60.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 4...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
