// Variantes (2 par question) pour "Mock A — Session 1 — Analyse des États
// Financiers".
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Analyse des États Financiers — Variantes",
    difficulty: 2,
    questions: [
      // Q28 — unearned revenue
      [
        "A company receives a payment in advance for consulting services to be performed over the next 12 months, starting next fiscal year. Ignoring income taxes, the company would recognize in the current fiscal year an increase in:",
        ["assets and revenue.", "assets and liabilities.", "liabilities and revenue."],
        1,
        "Cash received in advance for services to be delivered later is recorded as an asset (cash) and a liability (unearned revenue) — no revenue is recognized until the service is actually performed, which happens in future periods.",
      ],
      [
        "A software company collects a one-year license fee in cash upfront, with the license period beginning next quarter. Ignoring taxes, at the moment cash is received the company should recognize an increase in:",
        ["cash (an asset) and unearned revenue (a liability).", "cash and revenue.", "unearned revenue and revenue."],
        0,
        "The cash received creates an asset, matched by a liability (unearned/deferred revenue) since the license period — and thus the earning of that revenue — hasn't started yet. Revenue is recognized later, as the license period elapses.",
      ],
      // Q30 — intangible assets IFRS
      [
        "Under IFRS, a company may subsequently measure its intangible assets using the:",
        ["cost model only.", "cost model or the revaluation model.", "fair value model only."],
        1,
        "IFRS allows companies to use either the cost model or the revaluation model for intangible assets, unlike US GAAP, which permits only the cost model.",
      ],
      [
        "Which of the following is true regarding subsequent measurement of intangible assets? Under US GAAP, companies:",
        [
          "may choose between the cost and revaluation models, just like under IFRS.",
          "may use only the cost model, whereas IFRS also permits a revaluation model.",
          "must use fair value through profit or loss.",
        ],
        1,
        "US GAAP permits only the cost model for intangible assets. IFRS is more flexible, allowing either the cost model or a revaluation model.",
      ],
      // Q36 — Sarbanes-Oxley / SEC
      [
        "Which US regulatory body is responsible for overseeing the Public Company Accounting Oversight Board (PCAOB), created under the Sarbanes–Oxley Act?",
        ["Financial Accounting Standards Board (FASB).", "Securities and Exchange Commission (SEC).", "International Accounting Standards Board (IASB)."],
        1,
        "The Sarbanes–Oxley Act of 2002 created the PCAOB to oversee auditors, and the SEC is responsible for carrying out the act's requirements and overseeing the PCAOB. FASB sets US GAAP standards, and IASB sets IFRS — neither oversees the PCAOB.",
      ],
      [
        "Under the Sarbanes–Oxley Act, which of the following is required regarding a company's internal control over financial reporting?",
        [
          "Reporting is voluntary and only required following a financial restatement.",
          "Management must report on its effectiveness, including external auditor confirmation.",
          "Only the audit committee needs to review it internally, with no public reporting requirement.",
        ],
        1,
        "The Sarbanes–Oxley Act requires management to report on the effectiveness of the company's internal control over financial reporting, including obtaining external auditor confirmation of that effectiveness — this is a mandatory public disclosure, not a voluntary or internal-only process.",
      ],
      // Q38 — purchases estimate
      [
        "A company's cost of sales is $650,000, its ending inventory is $120,000, and its beginning inventory is $95,000. Purchases for the period are closest to:",
        ["$625,000.", "$650,000.", "$675,000."],
        2,
        "Purchases = cost of goods sold + ending inventory − beginning inventory = $650,000 + $120,000 − $95,000 = $675,000. $650,000 ignores the change in inventory; $625,000 subtracts the inventory change in the wrong direction.",
      ],
      [
        "A company's cost of sales is €900,000, its ending inventory is €80,000, and its beginning inventory is €110,000. Purchases for the period are closest to:",
        ["€870,000.", "€900,000.", "€930,000."],
        0,
        "Purchases = cost of goods sold + ending inventory − beginning inventory = €900,000 + €80,000 − €110,000 = €870,000. €900,000 ignores the change in inventory; €930,000 applies the inventory adjustment in the wrong direction.",
      ],
      // Q42 — retained earnings roll-forward
      [
        "An analyst gathers the following information (in $ thousands) about a company: Beginning retained earnings 2,200; Ending retained earnings 3,000; Dividends declared and paid 500. If there are no other items affecting shareholders' equity, net income (in $ thousands) is:",
        ["$300.", "$800.", "$1,300."],
        2,
        "Ending retained earnings = beginning retained earnings + net income − dividends. 3,000 = 2,200 + net income − 500, so net income = $1,300 thousand. $800 ignores dividends; $300 subtracts dividends twice.",
      ],
      [
        "An analyst gathers the following information (in € thousands) about a company: Beginning retained earnings 4,000; Ending retained earnings 4,600; Dividends declared and paid 250. If there are no other items affecting shareholders' equity, net income (in € thousands) is:",
        ["€350.", "€600.", "€850."],
        2,
        "Ending retained earnings = beginning retained earnings + net income − dividends. 4,600 = 4,000 + net income − 250, so net income = €850 thousand. €600 ignores dividends; €350 subtracts dividends twice.",
      ],
      // Q44 — retrospective application
      [
        "A change in depreciation method, applied prospectively and affecting only the current and future periods, is best classified as a change in:",
        ["accounting policy, requiring retrospective restatement.", "accounting estimate.", "an error correction requiring restatement."],
        1,
        "Changes in accounting estimate (such as a depreciation method change reflecting new information) are applied prospectively — only current and future financial statements are affected, with no restatement of prior periods.",
      ],
      [
        "Unless impractical, which type of accounting change requires prior-period financial statements to be restated as if the new method had always been used?",
        ["A change in accounting estimate.", "A change in accounting policy.", "Neither type of change requires restatement."],
        1,
        "Changes in accounting policy are applied retrospectively (unless impractical), restating all periods presented as if the new policy had always applied. Changes in accounting estimate are instead applied prospectively, with no restatement.",
      ],
      // Q45 — inventory NRV agricultural
      [
        "Which of the following inventory measurement practices is permitted under both IFRS and US GAAP?",
        [
          "Reversing a previously recognized inventory write-down back to original cost.",
          "Valuing agricultural inventory (such as harvested crops) at net realizable value.",
          "Defining market value as net realizable value less a normal profit margin.",
        ],
        1,
        "Both IFRS and US GAAP allow agricultural inventories to be valued at net realizable value. US GAAP generally does not allow reversal of inventory write-downs, and the 'NRV less normal profit margin' definition of market value is a US GAAP-specific concept, not an IFRS one.",
      ],
      [
        "A company that harvests and sells agricultural produce may value its inventory at net realizable value:",
        ["under US GAAP only.", "under IFRS only.", "under both IFRS and US GAAP."],
        2,
        "Both accounting frameworks provide an exception allowing agricultural inventory to be measured at net realizable value, unlike the general inventory measurement rules that otherwise differ between the two frameworks.",
      ],
      // Q47 — conservative vs aggressive accounting
      [
        "A company that recognizes revenue later, and expenses earlier, than its economic reality would suggest — thereby decreasing current performance and potentially increasing performance in later periods — is most likely engaging in:",
        ["aggressive accounting.", "conservative accounting.", "fraudulent accounting."],
        1,
        "Conservative accounting choices decrease reported performance and financial position in the current period, potentially increasing them in later periods — the opposite of aggressive accounting, which inflates current performance at the expense of later periods.",
      ],
      [
        "Which of the following best describes 'aggressive' accounting choices?",
        [
          "Choices that decrease current reported performance and increase later reported performance.",
          "Choices that increase current reported performance and financial position, potentially decreasing performance in later periods.",
          "Choices that have no effect on the timing of reported performance.",
        ],
        1,
        "Aggressive accounting choices increase a company's reported performance and financial position in the current period, at the potential cost of decreasing them in later periods — the mirror image of conservative accounting.",
      ],
      // Q48 — DuPont ROE component
      [
        "All else being equal, an increase in which of the following would most likely result in a higher return on equity (ROE)?",
        ["Days of sales outstanding.", "The effective tax rate.", "Total asset turnover."],
        2,
        "Under the DuPont decomposition, ROE = tax burden × interest burden × EBIT margin × total asset turnover × leverage — an increase in any one component (holding others constant) raises ROE. An increase in days of sales outstanding lowers asset turnover (lowering ROE), and a higher effective tax rate lowers the tax burden component (also lowering ROE).",
      ],
      [
        "All else being equal, a decrease in which of the following would most likely increase return on equity (ROE)?",
        ["Days of sales outstanding (DSO).", "Total asset turnover.", "Financial leverage."],
        0,
        "A lower DSO means faster collection of receivables, which increases total asset turnover — and, holding the other DuPont components constant, a higher asset turnover raises ROE. Decreasing total asset turnover or leverage directly would instead lower ROE.",
      ],
      // Q50 — organic growth
      [
        "A company's revenue increased due to higher unit sales volume and favorable price/mix changes, excluding any impact from acquisitions, divestitures, or currency movements. This increase is best described as:",
        ["a currency translation effect.", "organic growth.", "inorganic (scope) growth."],
        1,
        "Organic growth captures revenue changes attributable to volume and price/mix, shown separately from the impact of acquisitions/divestitures (scope change) and foreign exchange movements.",
      ],
      [
        "Which of the following would NOT be included in a company's 'organic growth' figure?",
        ["Higher unit sales volume.", "Favorable price/mix changes.", "Revenue added through a recent acquisition."],
        2,
        "Organic growth reflects only volume and price/mix effects. Revenue contributed by a recent acquisition is a scope change and is reported separately from organic growth, not included within it.",
      ],
      // Q51 — deferred tax liabilities
      [
        "A deferred tax liability is most likely to arise when:",
        [
          "the tax base of an asset exceeds its carrying value.",
          "accounting (pretax) profit exceeds taxable income for the period.",
          "an expense is permanently disallowed for tax purposes.",
        ],
        1,
        "When accounting profit exceeds taxable income, financial-accounting income tax expense exceeds income taxes actually payable, giving rise to a deferred tax liability. A higher tax base than carrying value creates a deferred tax asset instead, and permanently disallowed expenses create a permanent difference, not a deferred tax item.",
      ],
      [
        "Which of the following situations would most likely give rise to a deferred tax liability rather than a deferred tax asset?",
        [
          "The tax base of an asset exceeds its carrying value.",
          "The carrying value of an asset exceeds its tax base.",
          "An expense is never deductible for tax purposes under any circumstance.",
        ],
        1,
        "A carrying value greater than the tax base implies the company will pay more tax in the future relative to accounting income already recognized — creating a deferred tax liability. The reverse (tax base greater than carrying value) creates a deferred tax asset, and a permanently disallowed expense creates a permanent difference with no deferred tax effect.",
      ],
      // Q54 — diluted EPS if-converted
      [
        "Selected year-end data: Net income $300,000; Tax rate 20%; Weighted average shares outstanding 150,000; 10% bond convertible into 5,000 shares (potentially dilutive), face value $80,000. The diluted EPS is closest to:",
        ["$1.89.", "$1.98.", "$2.04."],
        1,
        "Basic EPS = $300,000/150,000 = $2.00. After-tax interest addback on the convertible bond = $80,000 × 10% × (1 − 20%) = $6,400. Diluted EPS (if-converted method) = ($300,000 + $6,400) / (150,000 + 5,000) = $306,400/155,000 ≈ $1.98. $2.04 wrongly omits the extra shares from the denominator (and is invalid since diluted EPS can never exceed basic EPS); $1.89 wrongly subtracts, instead of adds, the after-tax interest.",
      ],
      [
        "Selected year-end data: Net income $500,000; Tax rate 25%; Weighted average shares outstanding 200,000; 8% bond convertible into 8,000 shares (potentially dilutive), face value $150,000. The diluted EPS is closest to:",
        ["$2.36.", "$2.45.", "$2.55."],
        1,
        "Basic EPS = $500,000/200,000 = $2.50. After-tax interest addback = $150,000 × 8% × (1 − 25%) = $9,000. Diluted EPS = ($500,000 + $9,000) / (200,000 + 8,000) = $509,000/208,000 ≈ $2.45. $2.55 wrongly omits the extra shares from the denominator (invalid, since diluted EPS can't exceed basic EPS); $2.36 wrongly subtracts the after-tax interest instead of adding it.",
      ],
      // Q60 — ROA/ROE/leverage/equity
      [
        "An analyst collects the following about a company: Net profit margin 5%; Return on average assets 10%; Return on average equity 20%; Revenue $3,000,000. The company's:",
        ["total asset turnover is 3.", "financial leverage ratio is 4.", "average shareholders' equity is closest to $750,000."],
        2,
        "Net profit = $3,000,000 × 5% = $150,000. Average shareholders' equity = net profit ÷ ROE = $150,000 ÷ 20% = $750,000. (For reference: average total assets = $150,000 ÷ 10% = $1,500,000, giving asset turnover of 2.0, not 3; leverage = ROE ÷ ROA = 20%/10% = 2.0, not 4.)",
      ],
      [
        "An analyst collects the following about a company: Net profit margin 6%; Return on average assets 12%; Return on average equity 18%; Revenue £4,000,000. The company's:",
        ["total asset turnover is 3.", "financial leverage ratio is 2.0.", "average shareholders' equity is closest to £1,333,333."],
        2,
        "Net profit = £4,000,000 × 6% = £240,000. Average shareholders' equity = net profit ÷ ROE = £240,000 ÷ 18% ≈ £1,333,333. (For reference: average total assets = £240,000 ÷ 12% = £2,000,000, giving asset turnover of 2.0, not 3; leverage = ROE ÷ ROA = 18%/12% = 1.5, not 2.0.)",
      ],
      // Q62 — cash flow decrease explained
      [
        "The following information is available about a company ($ millions): Year 2 sales $410.5, Year 1 sales $405.2; Year 2 net income $34.0, Year 1 net income $33.5; Year 2 cash flow from operations $18.0, Year 1 cash flow from operations $40.2. During Year 2, the company most likely experienced a significant decrease in:",
        ["the level of inventory.", "the proportion of sales made on a cash basis.", "the proportion of interest-bearing debt relative to trade payables."],
        1,
        "Sales and net income are nearly unchanged, but cash flow from operations fell sharply — consistent with a shift toward more credit (and less cash) sales, which increases accounts receivable and reduces operating cash flow without changing reported income. A decrease in inventory or an increase in payables would instead have increased, not decreased, cash from operations.",
      ],
      [
        "The following information is available about a company (€ millions): Year 2 sales 615.0, Year 1 sales 610.4; Year 2 net income 48.2, Year 1 net income 47.9; Year 2 cash flow from operations 22.5, Year 1 cash flow from operations 51.0. During Year 2, the company most likely experienced a significant decrease in:",
        ["accounts payable turnover due to slower supplier payments.", "the proportion of sales made on a cash basis.", "the level of inventory."],
        1,
        "With sales and net income essentially flat but operating cash flow sharply lower, the most likely explanation is a shift toward more credit sales (fewer cash sales), which raises receivables and drags down operating cash flow. Slower supplier payments (higher payables) or lower inventory would each have increased, not decreased, operating cash flow.",
      ],
      // Q66 — inventory write-down and activity ratios
      [
        "Which type of financial ratio is most likely to be positively affected by an inventory write-down, compared to if the write-down had not occurred?",
        ["Profitability ratios.", "Solvency ratios.", "Activity ratios."],
        2,
        "An inventory write-down reduces both profit and the carrying amount of inventory, which hurts profitability, liquidity, and solvency ratios. Activity ratios such as inventory turnover, however, are positively affected because the write-down shrinks the asset base (the ratio's denominator).",
      ],
      [
        "An inventory write-down reduces both reported profit and the carrying value of inventory. What effect does this most likely have on the inventory turnover ratio?",
        ["It decreases the ratio, since cost of goods sold falls too.", "It increases the ratio, since average inventory (the denominator) falls.", "It has no effect on the ratio."],
        1,
        "Inventory turnover = COGS ÷ average inventory. A write-down lowers average inventory (the denominator) more directly than it affects COGS in that period, so the ratio rises — a rare case where a write-down positively affects a ratio, even though it hurts profitability overall.",
      ],
      // Q68 — cash paid to suppliers
      [
        "An analyst gathers the following (€ millions): Cost of sales 600; Decrease in inventory 150; Increase in accounts payable 60. Cash paid to suppliers (€ millions) is:",
        ["390.", "690.", "810."],
        0,
        "Purchases = cost of goods sold − decrease in inventory = €600m − €150m = €450m. Cash paid to suppliers = purchases − increase in accounts payable = €450m − €60m = €390m. €690m and €810m both wrongly ADD the inventory decrease instead of subtracting it.",
      ],
      [
        "An analyst gathers the following ($ millions): Cost of sales 720; Decrease in inventory 80; Increase in accounts payable 40. Cash paid to suppliers ($ millions) is:",
        ["600.", "760.", "840."],
        0,
        "Purchases = cost of goods sold − decrease in inventory = $720m − $80m = $640m. Cash paid to suppliers = purchases − increase in accounts payable = $640m − $40m = $600m. $760m and $840m both wrongly add the inventory decrease instead of subtracting it.",
      ],
      // Q72 — goodwill / bargain purchase
      [
        "Under the acquisition method, if the purchase price paid for an acquired company is LESS than the fair value of its identifiable net assets, the acquirer should most likely record the difference as a:",
        ["reduction to goodwill.", "gain reflected in profit or loss.", "increase to other comprehensive income."],
        1,
        "A purchase price below the fair value of identifiable net assets acquired is a 'bargain purchase' — the difference is recognized immediately as a gain in profit or loss, not smoothed through OCI or netted against goodwill (which can't be negative under the acquisition method).",
      ],
      [
        "Under the acquisition method, the excess of the purchase price paid over the fair value of the identifiable net assets acquired is recorded as:",
        ["an immediate expense in the income statement.", "goodwill, an intangible asset on the balance sheet.", "a reduction to retained earnings."],
        1,
        "When the purchase price exceeds the fair value allocated to identifiable assets and liabilities, the excess is recorded as goodwill, an intangible asset — not expensed immediately or charged against retained earnings.",
      ],
      // Q73 — IFRS pension OCI
      [
        "Under IFRS pension accounting, which component of the periodic change in the net pension asset or liability is recognized in other comprehensive income rather than profit or loss?",
        ["Current service cost.", "Net interest expense or income.", "Remeasurements (actuarial gains and losses)."],
        2,
        "IFRS recognizes service cost and net interest expense/income in profit or loss as pension expense, while the third component — remeasurements, including actuarial gains and losses — is recognized in other comprehensive income.",
      ],
      [
        "Which of the following pension cost components is reported as pension expense in profit or loss under IFRS, rather than in other comprehensive income?",
        ["Actuarial gains and losses.", "Net interest expense or income on the net pension liability or asset.", "Remeasurement gains on plan assets."],
        1,
        "Net interest expense/income, along with current service cost, flows through profit or loss as pension expense under IFRS. Actuarial gains/losses and other remeasurements are instead recognized in other comprehensive income.",
      ],
      // Q78 — held for use vs held for sale
      [
        "A company plans to dispose of a group of long-lived assets through an exchange for other productive assets, rather than a sale. Until the exchange occurs, these assets should most likely be classified as:",
        ["held for sale, with depreciation suspended.", "held for use, continuing to be depreciated.", "held for use, with depreciation suspended."],
        1,
        "Long-lived assets to be disposed of other than by sale (an exchange, abandonment, or spin-off) remain classified as held for use and continue to be depreciated until the disposal actually occurs — only assets to be disposed of BY SALE are classified as held for sale (with depreciation stopped).",
      ],
      [
        "Long-lived assets that a company plans to abandon, rather than sell, are most appropriately classified — until abandonment — as:",
        ["held for sale, with no further depreciation.", "held for use, with depreciation continuing.", "immediately written off to zero value."],
        1,
        "Assets to be disposed of by means other than a sale (such as abandonment) are classified as held for use until disposal and continue to be depreciated — the held-for-sale classification (which halts depreciation) applies only when the disposal method is an actual sale.",
      ],
      // Q84 — FIFO vs weighted average, rising prices
      [
        "During a period of rising prices and stable or growing inventory quantities, a company using FIFO, compared to one using weighted average cost, will most likely report a:",
        ["lower gross profit margin.", "higher inventory turnover ratio.", "longer cash conversion cycle."],
        2,
        "In rising prices, FIFO allocates a lower amount to cost of sales and a higher amount to ending inventory than weighted average cost — this means higher days of inventory on hand and a longer cash conversion cycle under FIFO, along with a HIGHER (not lower) gross margin and a LOWER (not higher) inventory turnover ratio relative to weighted average cost.",
      ],
      [
        "All else equal, during a period of rising prices and stable inventory quantities, a company using weighted average cost, compared to one using FIFO, will most likely report a:",
        ["lower cost of goods sold.", "lower gross profit margin.", "higher ending inventory balance."],
        1,
        "In rising prices, weighted average cost allocates a higher amount to COGS (blending older, cheaper costs with newer, pricier ones less aggressively than FIFO keeps them separate) and a lower amount to ending inventory than FIFO — resulting in a lower gross profit margin, not a lower COGS or higher ending inventory, relative to FIFO.",
      ],
      // Q88 — impairment loss
      [
        "An analyst gathers the following (€ thousands) about a machine: Carrying amount prior to impairment 80; Present value of expected future cash flows 68; Fair value 75; Costs to sell 5. Impairment loss (€ thousands) is:",
        ["5.", "10.", "12."],
        1,
        "Recoverable amount = higher of (fair value − costs to sell) and value in use = max(75 − 5 = 70, 68) = 70. Impairment loss = carrying amount − recoverable amount = 80 − 70 = 10. €5 wrongly omits costs to sell from the recoverable amount; €12 wrongly uses the lower, instead of the higher, of the two values.",
      ],
      [
        "An analyst gathers the following ($ thousands) about a machine: Carrying amount prior to impairment 120; Present value of expected future cash flows 95; Fair value 105; Costs to sell 8. Impairment loss ($ thousands) is:",
        ["$15.", "$23.", "$25."],
        1,
        "Recoverable amount = higher of (fair value − costs to sell) and value in use = max(105 − 8 = 97, 95) = 97. Impairment loss = carrying amount − recoverable amount = 120 − 97 = 23. $15 wrongly omits costs to sell from the recoverable amount; $25 wrongly uses the lower, instead of the higher, of the two values.",
      ],
      // Q89 — financial leverage ratio
      [
        "An analyst gathers the following ($ millions) about a company: Total assets 900; Total liabilities 300; Total equity 600; Total debt 150. Based only on this information, the financial leverage ratio is:",
        ["0.17.", "0.50.", "1.50."],
        2,
        "Financial leverage ratio = total assets ÷ total equity = 900 ÷ 600 = 1.50. 0.17 is (incorrectly) total debt ÷ total assets, and 0.50 is (incorrectly) total liabilities ÷ total equity — neither is the financial leverage ratio.",
      ],
      [
        "An analyst gathers the following (£ millions) about a company: Total assets 450; Total liabilities 90; Total equity 360; Total debt 50. Based only on this information, the financial leverage ratio is:",
        ["0.11.", "0.25.", "1.25."],
        2,
        "Financial leverage ratio = total assets ÷ total equity = 450 ÷ 360 = 1.25. 0.11 is (incorrectly) total debt ÷ total assets, and 0.25 is (incorrectly) total liabilities ÷ total equity — neither is the financial leverage ratio.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — FSA...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
