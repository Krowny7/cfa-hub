// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF FSA
// (Analyzing Statements of Cash Flows I). Structure : 5 concepts × (1
// question officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page3.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 3 (Analyzing Statements of Cash Flows I)",
    difficulty: 2,
    questions: [
      // Concept 1 — Ajustement du résultat net, méthode indirecte (officielle)
      [
        "Given the following information, what is the adjustment to net income when calculating cash flow from operations using the indirect method? Increase in accounts payable of $25. Sold one share of stock for $15. Paid dividends of $10 to shareholders. Depreciation expense of $100. Increase in inventory of $20.",
        ["-$50.", "-$95.", "+$105."],
        2,
        "L'ajustement est égal à l'augmentation des dettes fournisseurs (+25) plus l'amortissement réintégré (+100) moins l'augmentation des stocks (-20) = +105. La vente d'action et les dividendes payés sont des flux de financement, sans effet sur cet ajustement.",
      ],
      // Variante angle différent — reverse-engineering à partir du CFO
      [
        "An analyst starts with net income of $200,000 to calculate CFO using the indirect method. The only adjustments made are a $40,000 add-back for depreciation and one change in accounts payable, resulting in a CFO of $250,000. The change in accounts payable was most likely a(n):",
        ["increase of $10,000.", "decrease of $10,000.", "increase of $50,000."],
        0,
        "200 000 + 40 000 + ΔAP = 250 000 → ΔAP = +10 000. Il faut ici remonter du résultat final (CFO) vers la donnée manquante, plutôt que calculer un ajustement à partir de données complètes.",
      ],
      // Variante plus difficile — plusieurs ajustements avec un piège (stock dividend, non-cash pur)
      [
        "A company reports net income of $500,000. During the year: depreciation expense was $60,000; the company recognized a $15,000 unrealized gain on trading securities (included in net income); accounts receivable increased by $25,000; the company distributed a 5% stock dividend to shareholders; and accounts payable decreased by $10,000. Using the indirect method, cash flow from operations is closest to:",
        ["$485,000.", "$510,000.", "$535,000."],
        1,
        "CFO = 500 000 + 60 000 (amortissement) − 15 000 (plus-value latente sur titres de transaction, non monétaire, à soustraire) − 25 000 (hausse des créances) − 10 000 (baisse des dettes fournisseurs) = 510 000 $. Le dividende en actions n'a AUCUN effet de trésorerie et n'apparaît même pas dans le calcul — un piège classique consistant à vouloir l'ajuster alors qu'il faut simplement l'ignorer.",
      ],

      // Concept 2 — Encaissements clients, méthode directe (officielle)
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
      // Variante angle différent — reverse-engineering d'une variation de stock à partir du cash payé
      [
        "Using the direct method, a company reports cash paid to suppliers of $340,000. Cost of goods sold for the period was $360,000, and accounts payable decreased by $15,000 during the period. The change in inventory during the period was most likely a(n):",
        ["increase of $35,000.", "decrease of $35,000.", "decrease of $5,000."],
        1,
        "Achats = cash payé aux fournisseurs − diminution des dettes fournisseurs en sens inverse = 340 000 − (−15 000) → Achats = 340 000 + 15 000 = 325 000 (une baisse des dettes fournisseurs exige PLUS de cash que les seuls achats). Achats = COGS + Δstock → 325 000 = 360 000 + Δstock → Δstock = −35 000, soit une baisse de 35 000 $.",
      ],
      // Variante plus difficile — deux ajustements combinés (AR et unearned revenue)
      [
        "A company's net sales were $620,000 for the year. Accounts receivable increased by $45,000 and unearned revenue decreased by $20,000 during the period. Cash collections from customers for the period, using the direct method, are closest to:",
        ["$535,000.", "$555,000.", "$575,000."],
        1,
        "Encaissements = ventes nettes − augmentation des créances − diminution des produits constatés d'avance = 620 000 − 45 000 − 20 000 = 555 000 $. Contrairement à la question officielle (un seul ajustement), il faut ici combiner correctement deux ajustements de signes différents dans la même formule.",
      ],

      // Concept 3 — Conversion d'obligations en actions : annexe non monétaire (officielle)
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
      // Variante angle différent — justifier le principe plutôt que l'appliquer
      [
        "Which of the following is the best explanation for why the conversion of bonds into common stock is excluded from both the financing and investing sections of the statement of cash flows?",
        [
          "The transaction is immaterial for most companies that engage in it.",
          "No cash actually changes hands in the transaction.",
          "Accounting standards specifically classify bond conversions as operating activities.",
        ],
        1,
        "Le tableau des flux de trésorerie ne retrace que les mouvements réels de trésorerie. Une conversion d'obligations en actions ne génère aucun encaissement ni décaissement : elle n'a donc sa place dans aucune des trois sections, quelle que soit sa taille, et doit être mentionnée en annexe.",
      ],
      // Variante plus difficile — distinguer 3 transactions similaires, dont une seule non monétaire
      [
        "During the year, a company converts $6 million of convertible bonds into common stock (non-cash), issues $6 million of new bonds for cash, and uses $6 million of cash to repay an unrelated bank loan. How should the analyst most accurately interpret the company's statement of cash flows with respect to these three items?",
        [
          "All three transactions should appear as $6 million financing inflows or outflows.",
          "Only the bond issuance (inflow) and the loan repayment (outflow) appear in the financing section; the bond conversion is disclosed only in a footnote.",
          "Only the bond conversion should appear in the financing section, since the other two are unrelated to long-term debt.",
        ],
        1,
        "Il faut distinguer, parmi trois transactions de montant identique et de nature proche, celle qui ne génère aucun mouvement de trésorerie (la conversion) des deux qui en génèrent réellement (l'émission d'obligations et le remboursement du prêt) — seules ces deux dernières figurent dans la section financement.",
      ],

      // Concept 4 — Classification des intérêts, IFRS vs US GAAP (officielle)
      [
        "Which set of accounting standards allows a firm to classify interest received as a financing cash flow and interest paid as an investing cash flow on its cash flow statement?",
        ["The IFRS only.", "U.S. GAAP only.", "Neither the IFRS nor U.S. GAAP."],
        2,
        "Les IFRS permettent de classer les intérêts reçus en exploitation ou investissement, et les intérêts payés en exploitation ou financement (l'inverse de ce que décrit la question). Les US GAAP imposent que les deux soient classés en exploitation. Aucun référentiel ne permet cette combinaison précise.",
      ],
      // Variante angle différent — tester si une manipulation de classement est possible sous GAAP
      [
        "A U.S. GAAP reporting company wants to reduce its reported operating cash flow and increase its financing cash flow, without changing any underlying business activity, by reclassifying its interest paid. Could this be achieved?",
        [
          "Yes, because U.S. GAAP allows firms to choose between classifying interest paid as operating or financing.",
          "No, because U.S. GAAP requires interest paid to always be classified as an operating cash flow, with no choice permitted.",
          "Yes, but only if the company also reclassifies its interest received in the same way.",
        ],
        1,
        "Contrairement aux IFRS, les US GAAP n'offrent aucune flexibilité de classement pour les intérêts payés : ils sont toujours en exploitation, ce qui empêche ce type de manipulation de présentation.",
      ],
      // Variante plus difficile — retraitement analytique pour comparer IFRS et US GAAP
      [
        "An analyst is comparing two companies: Company A reports under IFRS and classifies interest paid as a financing cash outflow and interest received as an investing cash inflow. Company B reports under U.S. GAAP. To make the two companies' cash flow statements more comparable, the analyst should most appropriately reclassify Company A's:",
        [
          "interest paid from financing to operating, and interest received from investing to operating.",
          "interest paid from financing to investing only, with no change to interest received.",
          "figures are already comparable; no reclassification is needed.",
        ],
        0,
        "Pour rendre les deux tableaux comparables au référentiel le plus restrictif (US GAAP), l'analyste doit reclasser TOUS les intérêts (reçus ET payés) de l'entreprise IFRS vers l'exploitation, puisque c'est le seul traitement autorisé sous US GAAP pour ces deux postes.",
      ],

      // Concept 5 — Plus-value sur cession et méthode indirecte (officielle)
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
      // Variante angle différent — appliquer le même principe à une plus-value sur DETTE (financement), pas un actif
      [
        "A firm's income statement includes a $20,000 gain on the retirement of debt (the firm repurchased its own bonds below their carrying value). When calculating CFO using the indirect method, this gain should be:",
        [
          "added to net income, since debt retirement is treated as a routine operating activity.",
          "subtracted from net income, since the retirement is a financing activity, not an operating one.",
          "ignored, since gains on debt retirement are never included in net income.",
        ],
        1,
        "Le même principe que pour une plus-value sur cession d'actif s'applique ici : tout gain inclus dans le résultat net mais lié à une activité de financement ou d'investissement doit être soustrait lors du calcul du CFO, pour ne garder que les éléments véritablement liés à l'exploitation.",
      ],
      // Variante plus difficile — distinguer un élément en résultat net (à ajuster) d'un élément en OCI (jamais à ajuster)
      [
        "A company sells equipment with a carrying value of $30,000 for $45,000 in cash, recognizing a $15,000 gain in net income. Separately, it recognizes a $5,000 foreign currency translation gain in other comprehensive income (not net income) related to a foreign subsidiary. When computing CFO using the indirect method starting from net income, which of these two gains requires an adjustment, and in which direction?",
        [
          "Only the $15,000 equipment gain requires a subtraction; the $5,000 OCI item requires no CFO adjustment at all.",
          "Both gains require a subtraction from net income.",
          "Only the $5,000 OCI item requires an adjustment, since it relates to cash held abroad.",
        ],
        0,
        "La méthode indirecte part du résultat net : seul un élément qui a transité par le résultat net peut nécessiter un ajustement pour reconstituer le CFO. La plus-value sur cession (15 000 $) est dans le résultat net et doit être soustraite ; le gain de change en OCI (5 000 $) n'a jamais affecté le résultat net, donc aucun ajustement ne le concerne.",
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
