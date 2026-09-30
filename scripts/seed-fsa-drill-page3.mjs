// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF FSA
// (Analyzing Statements of Cash Flows I). Structure Fixed Income : 5
// concepts × 3 variantes (questions en anglais ; explications en
// français). Concept 1 = question officielle du PDF imprimé (qcm_data/
// fsa_raw.txt) ; variantes 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page3.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 3 (Analyzing Statements of Cash Flows I)",
    difficulty: 2,
    questions: [
      // Concept 1 — Ajustement du résultat net (méthode indirecte)
      [
        "Given the following information, what is the adjustment to net income when calculating cash flow from operations using the indirect method? Increase in accounts payable of $25. Sold one share of stock for $15. Paid dividends of $10 to shareholders. Depreciation expense of $100. Increase in inventory of $20.",
        ["-$50.", "-$95.", "+$105."],
        2,
        "L'ajustement est égal à l'augmentation des dettes fournisseurs (+25) plus l'amortissement réintégré (+100) moins l'augmentation des stocks (-20) = +105. La vente d'action et les dividendes payés sont des flux de financement, sans effet sur cet ajustement.",
      ],
      [
        "Given the following information, what is the adjustment to net income when calculating cash flow from operations using the indirect method? Increase in accounts payable of $40. Sold common stock for $20. Paid cash dividends of $15. Depreciation expense of $80. Increase in inventory of $10.",
        ["+$70.", "+$90.", "+$110."],
        2,
        "Ajustement = +40 (AP) + 80 (amortissement) − 10 (stock) = +110. L'émission d'actions et les dividendes payés sont des flux de financement, exclus de cet ajustement.",
      ],
      [
        "Given the following information, what is the adjustment to net income when calculating cash flow from operations using the indirect method? Decrease in accounts payable of $15. Issued bonds for $50. Paid cash dividends of $20. Depreciation expense of $60. Decrease in inventory of $25.",
        ["+$45.", "+$70.", "+$95."],
        1,
        "Ajustement = −15 (baisse des dettes fournisseurs, un usage de trésorerie) + 60 (amortissement) + 25 (baisse des stocks, une source de trésorerie) = +70. L'émission d'obligations et les dividendes payés sont des flux de financement.",
      ],
      // Concept 2 — Encaissements clients par la méthode directe
      [
        "To compute cash collections from customers when converting a statement of cash flows from the indirect to the direct method, an analyst begins with:",
        [
          "cost of goods sold, subtracts any increase in accounts payable, adds any increase in inventory, and subtracts any inventory write-offs.",
          "sales, subtracts any increase in accounts receivable, and adds any increase in unearned revenue.",
          "net income and adds back non-cash expenses.",
        ],
        1,
        "L'analyste part des ventes nettes, soustrait (ajoute) toute augmentation (diminution) des créances clients, et ajoute (soustrait) toute augmentation (diminution) des produits constatés d'avance.",
      ],
      [
        "An analyst wants to estimate cash collections from customers using the income statement and balance sheet. Which of the following adjustments to net sales is correct?",
        [
          "Add an increase in accounts receivable.",
          "Subtract a decrease in unearned revenue.",
          "Add a decrease in accounts receivable.",
        ],
        2,
        "Une diminution des créances clients signifie que plus de trésorerie a été encaissée que ce que reflètent les ventes de la période : elle s'ajoute aux ventes nettes. Une augmentation des créances se soustrait (pas s'ajoute), et une baisse des produits constatés d'avance se soustrait également (pas l'inverse).",
      ],
      [
        "A company's net sales were $500,000. Accounts receivable increased by $30,000 during the period, and unearned revenue decreased by $10,000. Cash collections from customers for the period are closest to:",
        ["$460,000.", "$500,000.", "$540,000."],
        0,
        "Encaissements = ventes nettes − augmentation des créances − diminution des produits constatés d'avance = 500 000 $ − 30 000 $ − 10 000 $ = 460 000 $.",
      ],
      // Concept 3 — Conversion d'obligations en actions : annexe non monétaire
      [
        "Copper, Inc., had $4 million in bonds outstanding that were convertible into common stock at a conversion rate of 100 shares per $1,000 bond. In 20X1, all of the outstanding bonds were converted into common stock. Copper's average share price for 20X1 was $15. Copper's statement of cash flows for the year ended December 31, 20X1, should most likely include:",
        [
          "cash flows from financing of +$6 million from issuance of common stock and –$4 million from retirement of bonds and cash flows from investing of –$2 million for a loss on retirement of bonds.",
          "cash flows from financing of +$4 million from issuance of common stock and –$4 million from retirement of bonds.",
          "a footnote describing the conversion of the bonds into common stock.",
        ],
        2,
        "La conversion d'obligations en actions ordinaires est une transaction non monétaire : elle n'implique aucune entrée ni sortie de trésorerie réelle, et doit donc être présentée en annexe, pas dans les sections financement ou investissement.",
      ],
      [
        "A company converts $10 million of convertible bonds into common stock during the year, with no cash changing hands. How should this transaction most likely be reported on the statement of cash flows?",
        [
          "As a $10 million financing inflow and a $10 million financing outflow.",
          "As a $10 million investing outflow only.",
          "In a footnote disclosure, since no cash flow is involved.",
        ],
        2,
        "Sans mouvement de trésorerie réel, la conversion ne figure dans aucune des trois sections du tableau de flux — elle est simplement décrite en annexe, comme toute transaction non monétaire significative.",
      ],
      [
        "Which of the following transactions would most likely be disclosed in a footnote to the statement of cash flows rather than reported within one of its three main sections?",
        [
          "Payment of a cash dividend to shareholders.",
          "Acquisition of equipment by issuing common stock directly to the seller.",
          "Repayment of short-term bank debt with cash.",
        ],
        1,
        "Acquérir un équipement en échange direct d'actions (sans trésorerie) est une transaction non monétaire, à mentionner en annexe. Le paiement de dividendes et le remboursement de dette en cash sont, eux, de vrais flux de trésorerie classés en financement.",
      ],
      // Concept 4 — Classification des intérêts (IFRS vs US GAAP)
      [
        "Which set of accounting standards allows a firm to classify interest received as a financing cash flow and interest paid as an investing cash flow on its cash flow statement?",
        ["The IFRS only.", "U.S. GAAP only.", "Neither the IFRS nor U.S. GAAP."],
        2,
        "Les IFRS permettent de classer les intérêts reçus en exploitation ou investissement, et les intérêts payés en exploitation ou financement (l'inverse de ce que décrit la question). Les US GAAP imposent que les deux soient classés en exploitation. Aucun référentiel ne permet cette combinaison précise.",
      ],
      [
        "Under U.S. GAAP, interest paid on debt is classified as a cash flow from:",
        ["operations.", "investing.", "financing."],
        0,
        "Sous US GAAP, les intérêts payés (comme les intérêts reçus et les dividendes reçus) sont toujours classés en flux d'exploitation — seuls les dividendes payés sont classés en financement.",
      ],
      [
        "Which of the following interest and dividend classifications is permitted under IFRS but not under U.S. GAAP?",
        [
          "Classifying interest paid as a financing cash outflow.",
          "Classifying interest received as an operating cash inflow.",
          "Classifying dividends paid as a financing cash outflow.",
        ],
        0,
        "Les IFRS offrent une flexibilité de classement (intérêts payés en exploitation OU financement) que n'ont pas les US GAAP, qui imposent toujours l'exploitation pour les intérêts payés. Les intérêts reçus en exploitation et les dividendes payés en financement sont, eux, conformes aux deux référentiels.",
      ],
      // Concept 5 — Plus/moins-value sur cession et méthode indirecte
      [
        "When calculating cash flow from operations (CFO) using the indirect method which of the following is most accurate?",
        [
          "When recognizing a gain on the sale of fixed assets, the amount is a deduction to operating cash flows.",
          "The indirect method requires an additional schedule to reconcile net income to cash flow.",
          "In using the indirect method, each item on the income statement is converted to its cash equivalent.",
        ],
        0,
        "Une plus-value sur cession d'immobilisations est incluse dans le résultat net, mais le produit réel de la cession apparaît en investissement ; elle doit donc être déduite du résultat net pour éviter un double comptage.",
      ],
      [
        "A firm sells equipment for $80,000 and recognizes a $15,000 gain on the sale in net income. Using the indirect method to compute cash flow from operations, the analyst should:",
        [
          "add the $15,000 gain to net income.",
          "subtract the $15,000 gain from net income.",
          "make no adjustment, since the gain is already a cash flow.",
        ],
        1,
        "La plus-value de 15 000 $ est déjà incluse dans le résultat net mais appartient économiquement à la section investissement (le produit total de 80 000 $ y figure) ; elle doit donc être soustraite du résultat net lors du calcul du CFO.",
      ],
      [
        "Using the indirect method, a loss on the sale of equipment should be treated as a(n):",
        [
          "addition to net income when computing CFO.",
          "subtraction from net income when computing CFO.",
          "adjustment to CFI only, with no effect on CFO.",
        ],
        0,
        "Symétriquement à la plus-value, une moins-value réduit le résultat net sans représenter une vraie sortie de trésorerie d'exploitation (le produit de cession, lui, va en investissement) ; elle doit donc être réintégrée (ajoutée) au résultat net pour calculer le CFO.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 3...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
