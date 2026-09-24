// Seed script — quiz de "drill" associé à la page 8 de la fiche PDF Equity
// (Equity Valuation — Multiples & Asset-Based). Questions officielles
// sélectionnées depuis la banque de pratique (Reading 48, volet multiples/
// asset-based), corrigé vérifié contre le PDF "- Answers.pdf" correspondant
// — chaque calcul a été refait à la main pour confirmer la cohérence.
// Usage: node scripts/seed-equity-drill-page8.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 8 (Equity Valuation: Multiples & Asset-Based)",
    difficulty: 3,
    questions: [
      [
        "A stock has a required rate of return of 15%, a constant growth rate of 10%, and a dividend payout ratio of 45%. The stock's justified price-earnings ratio is closest to:",
        ["4.5 times.", "9.0 times.", "3.0 times."],
        1,
        "P0/E1 = (D1/E1)/(k−g) = 0,45/(0,15−0,10) = 0,45/0,05 = 9,0 fois.",
      ],
      [
        "Given the following information, compute the price/cash flow ratio for EAV Technology, a U.S. GAAP reporting firm. Net income per share = $6. Price per share = $100. Depreciation per share = $2. Interest expense per share = $4. Marginal tax rate = 25%.",
        ["12.5X.", "8.3X.", "9.1X."],
        0,
        "Cash flow par action = bénéfice net + amortissement = 6$+2$ = 8$ (les intérêts et le taux d'imposition sont des distracteurs non utilisés dans cette définition simple du CF). P/CF = 100/8 = 12,5X.",
      ],
      [
        "Given the following information, compute price/book value. Book value of assets = $550,000. Total sales = $200,000. Net income = $20,000. Dividend payout ratio = 30%. Operating cash flow = $40,000. Price per share = $100. Shares outstanding = 1000. Book value of liabilities = $500,000.",
        ["2.0X.", "2.5X.", "5.5X."],
        0,
        "Valeur comptable des capitaux propres = 550 000−500 000 = 50 000 $. Valeur de marché = 100×1000 = 100 000 $. P/B = 100 000/50 000 = 2,0X. Les autres données sont des distracteurs non pertinents pour ce ratio.",
      ],
      [
        "Baker Computer earned $6.00 per share last year, has a retention ratio of 55%, and a return on equity (ROE) of 20%. Assuming their required rate of return is 15%, how much would an investor pay for Baker on the basis of the earnings multiplier model?",
        ["$74.93.", "$40.00.", "$173.90."],
        0,
        "g = 0,55×0,20 = 11%. P0/E1 = (1−0,55)/(0,15−0,11) = 0,45/0,04 = 11,25. E1 = 6,00×1,11 = 6,66 $. Prix = 11,25×6,66 = 74,93 $.",
      ],
      [
        "The current price of XYZ, Inc., is $40 per share with 1,000 shares of equity outstanding. Sales are $4,000 and the book value of the firm is $10,000. What is the price/sales ratio of XYZ, Inc.?",
        ["10.000.", "4.000.", "0.010."],
        0,
        "P/S = (prix par action)/(ventes par action) = 40/(4000/1000) = 40/4 = 10,0. La valeur comptable de 10 000$ est un distracteur (pertinent pour un P/B, pas un P/S).",
      ],
      [
        "An analyst studying Albion Industries determines that the average EV/EBITDA ratio for Albion's industry is 10. The analyst obtains the following information from Albion's financial statements: EBITDA = £11,000,000. Market value of debt = £30,000,000. Cash = £1,000,000. Based on the industry's average enterprise value multiple, what is the equity value of Albion Industries?",
        ["£110,000,000.", "£80,000,000.", "£81,000,000."],
        2,
        "EV estimée = 10×11 000 000 = 110 000 000£. Or EV = Valeur des capitaux propres + dette − trésorerie, donc Valeur des capitaux propres = 110 000 000−30 000 000+1 000 000 = 81 000 000£.",
      ],
      [
        "An analyst gathered the following data for the Parker Corp. for the year ended December 31, 2005: EPS2005 = $1.75. Dividends2005 = $1.40. BetaParker = 1.17. Long-term bond rate = 6.75%. Rate of return S&P 500 = 12.00%. The firm is expected to continue their dividend policy in future. If the long-term growth rate in earnings and dividends is expected to be 6%, the forward P/E ratio for Parker Corp. will be:",
        ["12.31.", "21.54.", "11.61."],
        2,
        "Taux exigé via CAPM = 6,75%+1,17×(12,00%−6,75%) = 12,89%. Taux de distribution = 1,40/1,75 = 80%. P/E anticipé = 0,80/(0,1289−0,06) = 11,61.",
      ],
      [
        "A stock's price currently is $100. An analyst forecasts the following for the stock: The normalized trailing price earnings (P/E) ratio will be 12×. The stock is expected to pay a $5 dividend this coming year on projected earnings of $10 per share. If the analyst were to buy and hold the stock for the year, the projected rate of return based on these forecasts is closest to:",
        ["20%.", "15%.", "25%."],
        2,
        "Prix prévu en fin d'année = BPA×P/E = 10×12 = 120 $. Rendement = [dividende+(prix final−prix initial)]/prix initial = [5+(120−100)]/100 = 25%.",
      ],
      [
        "Gwangwa Gold, a South African gold producer, has as its primary asset a mine which is shown on the balance sheet with a value of R100 million. An analyst estimates the market value of this mine to be 90% of book value. The company's balance sheet shows other assets of R20 million and liabilities of R40 million, and the analyst feels that the book value of these items reflects their market values. Using the asset-based valuation approach, what should the analyst estimate the value of the company to be?",
        ["R110 million.", "R70 million.", "R80 million."],
        1,
        "Valeur de marché des actifs = 0,90×100M (mine)+20M (autres actifs) = 110M. Passif = 40M. Valeur nette de la société = 110M−40M = 70M de rands. A est en réalité la valeur totale des actifs seule, sans retrancher le passif.",
      ],
      [
        "Gourmet and Company has the following information: Current market value = $250 million. Current book value = $225 million. Sales = $750 million. Earnings = $75 million. Cash flow = $125 million. Stock price = $7.50. Which of the following statements regarding Gourmet and Company is most accurate?",
        ["The price/book ratio is 0.90.", "The price/sales ratio is 0.33.", "The price/earnings ratio is 33.3."],
        1,
        "P/S = 250M/750M = 0,33, ce qui rend B correcte. Vérification : P/B = 250M/225M = 1,11 (et non 0,90) et P/E = 250M/75M = 3,33 (et non 33,3 — erreur classique d'un facteur 10).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 8...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
