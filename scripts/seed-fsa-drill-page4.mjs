// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF FSA
// (Analyzing Statements of Cash Flows II). Structure : 5 concepts × (1
// question officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page4.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 4 (Analyzing Statements of Cash Flows II)",
    difficulty: 2,
    questions: [
      // Concept 1 — Calcul du FCFF (officielle)
      [
        "Joplin Corporation reports the following in its year-end financial statements: Net income of $43.7 million. Depreciation expense of $4.2 million. Increase in accounts receivable of $1.5 million. Decrease in accounts payable of $2.3 million. Sold equipment for $15 million. Purchased equipment for $35 million. Joplin's free cash flow to the firm (FCFF) is closest to:",
        ["$39 million.", "$24 million.", "$28 million."],
        1,
        "FCFF = résultat net + charges non monétaires − investissement en capital fixe − investissement en BFR = 43,7 + 4,2 − (35 − 15) − (1,5 + 2,3) = 24,1 M$. L'augmentation des créances et la diminution des dettes fournisseurs sont toutes deux des usages de trésorerie.",
      ],
      // Variante angle différent — reverse-engineering du FCInv à partir du FCFF et du CFO
      [
        "A company reports CFO of $50 million and FCFF of $30 million. The company pays no interest expense and its working capital investment was zero for the year. Its net investment in fixed capital (capital expenditures minus proceeds from asset sales) for the year was closest to:",
        ["$20 million.", "$30 million.", "$80 million."],
        0,
        "Sans intérêts et sans variation de BFR, FCFF = CFO − investissement en capital fixe, donc 30 = 50 − FCInv → FCInv = 20 M$. Il faut ici isoler une composante du FCFF à partir du résultat final, pas appliquer directement la formule.",
      ],
      // Variante plus difficile — calcul complet avec un élément-piège (net borrowing, hors FCFF)
      [
        "A company reports net income of $80 million, depreciation of $10 million, interest expense of $12 million, an increase in accounts receivable of $4 million, a decrease in accounts payable of $6 million, net borrowing (new debt issued minus debt repaid) of $15 million, purchases of fixed assets of $40 million, and proceeds from asset sales of $5 million. The tax rate is 30%. FCFF is closest to:",
        ["$45.0 million.", "$53.4 million.", "$57.0 million."],
        1,
        "FCFF = 80 + 10 + 12×(1−0,30) − (40−5) − (4+6) = 80 + 10 + 8,4 − 35 − 10 = 53,4 M$. Le net borrowing de 15 M$ est une donnée-piège : il n'entre JAMAIS dans le calcul du FCFF (seulement dans celui du FCFE) et doit être ignoré. Oublier de multiplier l'intérêt par (1−taux) donnerait à tort 57,0 M$.",
      ],

      // Concept 2 — Dénominateurs d'un tableau de flux en pourcentage (officielle)
      [
        "A common-size cash flow statement is least likely to provide payments to employees as a percentage of:",
        ["revenues for the period.", "operating cash flow for the period.", "total cash outflows for the period."],
        1,
        "Il existe deux formats reconnus de tableau de flux en pourcentage : chaque sortie en % du total des sorties, ou en % du chiffre d'affaires. Le flux d'exploitation mélange entrées et sorties et n'est pas utilisé comme dénominateur pour un poste de paiement individuel.",
      ],
      // Variante angle différent — appliquer correctement le bon total à un poste d'ENTRÉE
      [
        "An analyst is building a common-size cash flow statement using the format that expresses each flow as a percentage of total cash flows in the same direction. For a line item showing \"proceeds from the sale of investments\" (a cash inflow), the appropriate denominator is:",
        ["total cash outflows for the period.", "total cash inflows for the period.", "total revenue for the period."],
        1,
        "Sous ce format, chaque ENTRÉE se rapporte au total des entrées, et chaque SORTIE au total des sorties — jamais l'inverse, et le chiffre d'affaires n'est utilisé que sous l'autre format (celui basé sur les revenus).",
      ],
      // Variante plus difficile — combiner les deux formats pour retrouver une donnée manquante
      [
        "A company's cash paid for interest was $45,000, representing 3% of total cash outflows for the period under one common-size format. If total revenue for the period was $2,000,000, cash paid for interest as a percentage of revenue (the other common-size format) is closest to:",
        ["1.50%.", "2.25%.", "3.00%."],
        1,
        "Total des sorties de trésorerie = 45 000 $ / 0,03 = 1 500 000 $ (utilisé seulement pour retrouver une donnée intermédiaire). Intérêts payés en % du chiffre d'affaires = 45 000 $ / 2 000 000 $ = 2,25 %. Il faut combiner les deux formats dans le bon ordre, pas seulement en appliquer un.",
      ],

      // Concept 3 — Baisse de la rotation des dettes fournisseurs (officielle)
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
      // Variante angle différent — effet sur un ratio analytique en aval, pas classification CFF
      [
        "A company deliberately extends its payment terms to suppliers, significantly slowing cash outflows, in order to report higher operating cash flow this year with no change in sales or profitability. Which of the following would most likely result?",
        [
          "A genuine, sustainable increase in the cash flow-to-income ratio (CFO / net income).",
          "A temporarily inflated cash flow-to-income ratio that does not reflect a real improvement in earnings quality.",
          "No effect on the cash flow-to-income ratio, since net income is unaffected.",
        ],
        1,
        "Le CFO gonflé artificiellement par l'étirement des paiements augmente mécaniquement le ratio CFO/résultat net, mais cette hausse ne traduit aucune amélioration réelle de la qualité des résultats — c'est un signal d'alerte à interpréter avec prudence, pas une vraie amélioration.",
      ],
      // Variante plus difficile — calculer la rotation avant/après pour quantifier l'étirement
      [
        "At the start of the year, a company's accounts payable balance was $80,000, and COGS for the year was $960,000 (unchanged for the full year). During the year, the company deliberately stretched its payments, and by year-end accounts payable had grown to $160,000. Using average payables, the new accounts payable turnover is closest to, and does this change most likely represent a sustainable improvement?",
        [
          "8.0; this represents a sustainable improvement in supplier terms.",
          "8.0; this does NOT represent a sustainable improvement, only a one-time cash benefit from stretching payables.",
          "6.0; this represents a sustainable improvement.",
        ],
        1,
        "Dettes fournisseurs moyennes = (80 000 + 160 000)/2 = 120 000 $. Rotation = 960 000 $ / 120 000 $ = 8,0 (en baisse depuis 12,0 en début de période, donc délais de paiement allongés). Cet allongement ponctuel des délais n'est pas durable : les fournisseurs ne l'accepteront pas indéfiniment.",
      ],

      // Concept 4 — Ratio de réinvestissement vs ratio de performance (officielle)
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
      // Variante angle différent — identifier le bon ratio pour un objectif donné, sans table de correspondance
      [
        "Which of the following ratios would an analyst most likely use to assess a firm's ability to grow its productive capacity using cash generated from operations?",
        ["Cash-to-income ratio.", "Reinvestment ratio.", "Debt payment ratio."],
        1,
        "Le ratio de réinvestissement (CFO / trésorerie payée pour les actifs long terme) est précisément conçu pour mesurer cette capacité de croissance financée par l'exploitation, contrairement aux deux autres ratios (performance et couverture de dette).",
      ],
      // Variante plus difficile — calculer les deux ratios simultanément sans les confondre
      [
        "A company reports CFO of $18 million, operating income of $24 million, and cash paid for long-term assets of $30 million. The company's reinvestment ratio and cash-to-income ratio are closest to, respectively:",
        ["0.60 and 0.75.", "0.75 and 0.60.", "0.60 and 1.33."],
        0,
        "Ratio de réinvestissement = CFO / trésorerie payée pour actifs long terme = 18/30 = 0,60. Ratio cash-to-income = CFO / résultat opérationnel = 18/24 = 0,75. Les deux ratios partagent le même numérateur (CFO) mais pas le même dénominateur — une confusion fréquente qu'il faut éviter.",
      ],

      // Concept 5 — Calcul du ratio de réinvestissement (officielle)
      [
        "Selected information from the most recent cash flow statement of Thibault Company: Cash from operating activities €1,300; Cash paid for plant and equipment (€2,600). Thibault's reinvestment ratio for this period is closest to:",
        ["0.50.", "0.75.", "1.00."],
        0,
        "Ratio de réinvestissement = CFO / trésorerie payée pour les actifs long terme = 1 300 € / 2 600 € = 0,50.",
      ],
      // Variante angle différent — reverse-engineering du CFO à partir du ratio
      [
        "A company's reinvestment ratio for the period is 0.40. If the company paid $75,000 in cash for new equipment during the period, its cash flow from operations for the period was closest to:",
        ["$18,750.", "$30,000.", "$187,500."],
        1,
        "CFO = ratio de réinvestissement × trésorerie payée pour les actifs long terme = 0,40 × 75 000 $ = 30 000 $. Il faut ici remonter du ratio vers le CFO, l'inverse du calcul habituel.",
      ],
      // Variante plus difficile — dériver d'abord le CFO par la méthode indirecte, puis le ratio
      [
        "A company reports net income of $45,000, depreciation expense of $8,000, an increase in accounts receivable of $3,000, and cash paid for new equipment of $40,000 during the period (no other adjustments are needed to compute CFO from net income). The company's reinvestment ratio for the period is closest to:",
        ["0.80.", "1.13.", "1.25."],
        2,
        "CFO = 45 000 + 8 000 − 3 000 = 50 000 $ (méthode indirecte, à calculer d'abord). Ratio de réinvestissement = 50 000 $ / 40 000 $ = 1,25. Cette variante exige de combiner deux compétences : reconstituer le CFO, puis seulement ensuite calculer le ratio.",
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
