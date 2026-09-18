// Variantes (2 par question) pour "Mock A — Session 1 — Analyse des États
// Financiers".
//
// Règle de conception : une variante ne rejoue pas l'énoncé d'origine avec
// d'autres chiffres. Pour chaque question source on produit
//   (a) un ANGLE DIFFÉRENT — on inverse l'inconnue, on compare deux cas, on
//       diagnostique une erreur, ou on applique le concept ailleurs ;
//   (b) une MONTÉE EN DIFFICULTÉ — une étape de plus, un repère retiré, ou la
//       combinaison de deux notions.
// Les distracteurs correspondent à des erreurs réellement commises.
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Analyse des États Financiers — Variantes",
    difficulty: 2,
    questions: [
      // ---- Q28 — produits constatés d'avance ------------------------------
      // (a) angle : que se passe-t-il quand le produit EST livré
      [
        "A publisher previously recorded a customer's annual subscription payment entirely as unearned revenue (a liability). When the publisher delivers the first of four quarterly issues, it should recognize:",
        [
          "a decrease in the liability and an increase in cash, both equal to one-quarter of the total payment.",
          "a decrease in the liability and an increase in revenue, both equal to one-quarter of the total payment.",
          "no accounting entry until all four issues have been delivered.",
        ],
        1,
        "As each issue is delivered, the publisher has earned one-quarter of what it was paid in advance, so it reduces the unearned revenue liability and recognizes that amount as revenue. The cash was already received and recorded as an asset when the subscription was paid, so delivery does not create a new cash entry — it converts a liability into recognized revenue.",
      ],
      // (b) difficulté : deux situations opposées dans la même question
      [
        "A consulting firm (1) delivers services in December but will not invoice or collect cash until January, and (2) receives a cash retainer in December for services it will deliver in January. Ignoring income taxes, the accounting effects in December are, respectively:",
        [
          "an increase in liabilities and revenue; an increase in assets and revenue.",
          "an increase in assets and liabilities; an increase in assets and revenue.",
          "an increase in assets and revenue; an increase in assets and liabilities.",
        ],
        2,
        "Situation (1) is accrued revenue: the service has been earned, so an account receivable (asset) and revenue are recognized even though no cash has changed hands yet. Situation (2) is unearned revenue: cash (asset) has been received but the service has not been performed, so a liability is recorded and no revenue is recognized until the work is delivered. The two situations are mirror images of each other, which is exactly what makes them easy to mix up.",
      ],

      // ---- Q30 — actifs incorporels : modèle du coût ou de la réévaluation ---
      // (a) angle : contraste avec les US GAAP
      [
        "Under US GAAP, intangible assets acquired outside of a business combination are most likely reported using the:",
        ["cost model or fair value model.", "cost model only.", "cost model or revaluation model."],
        1,
        "Unlike IFRS, which permits a revaluation model for intangible assets with an active market, US GAAP does not allow upward revaluation of intangible assets — they are reported at cost, less accumulated amortization and any impairment. The revaluation option is specifically an IFRS feature.",
      ],
      // (b) difficulté : amortissement et réévaluation ne s'excluent pas
      [
        "Under IFRS, a company applies the revaluation model to an intangible asset with a finite useful life. Which of the following is most accurate regarding this asset?",
        [
          "The asset is no longer amortized once the revaluation model is adopted.",
          "The revaluation model may only be applied to intangible assets with an indefinite useful life.",
          "The asset continues to be amortized over its useful life, in addition to periodic revaluation to fair value.",
        ],
        2,
        "Choosing the revaluation model changes how the asset's carrying amount is subsequently measured — periodically adjusted to fair value — but it does not suspend amortization for an asset with a finite useful life; the two mechanics operate side by side. The revaluation model is available for both finite- and indefinite-life intangibles, provided an active market exists to establish fair value.",
      ],

      // ---- Q36 — Sarbanes–Oxley -------------------------------------------
      // (a) angle : quel organisme fait quoi
      [
        "Under the Sarbanes–Oxley Act, which body was created specifically to oversee the auditors of public companies, operating under the SEC's supervision?",
        [
          "The Financial Accounting Standards Board (FASB).",
          "The Public Company Accounting Oversight Board (PCAOB).",
          "The International Accounting Standards Board (IASB).",
        ],
        1,
        "The PCAOB was created directly by the Sarbanes–Oxley Act of 2002 to oversee the auditors of public companies, and it in turn operates under the SEC's supervision. The FASB sets US GAAP and the IASB sets IFRS — neither was created by, nor is specifically tasked with enforcing, Sarbanes–Oxley.",
      ],
      // (b) difficulté : deux obligations distinctes, gestion et auditeur
      [
        "A company's CFO signs a certification, required under the Sarbanes–Oxley Act, personally attesting to the effectiveness of the company's internal control over financial reporting. Which of the following best describes the external auditor's role with respect to this certification?",
        [
          "The external auditor bears no responsibility related to internal control, only to the financial statements themselves.",
          "The external auditor's role is limited to checking the certification for internal consistency, not to testing the controls themselves.",
          "The external auditor must independently confirm the effectiveness of the internal control described in the certification.",
        ],
        2,
        "Sarbanes–Oxley requires both a management certification and a separate external auditor confirmation of the effectiveness of internal control over financial reporting — the two obligations run in parallel rather than one relying on or replacing the other. It is not enough for the CFO alone to attest; the auditor must independently test and confirm the controls.",
      ],

      // ---- Q38 — estimer les achats --------------------------------------
      // (a) angle : inverser — retrouver le stock initial
      [
        "A company's cost of sales was €500,000 and its purchases during the period were €520,000. If ending inventory was €80,000, beginning inventory was closest to:",
        ["€20,000.", "€60,000.", "€100,000."],
        1,
        "Rearranging purchases = cost of sales + ending inventory − beginning inventory gives beginning inventory = €500,000 + €80,000 − €520,000 = €60,000. €100,000 comes from flipping the formula's signs (purchases − cost of sales + ending inventory); €20,000 ignores the ending inventory term entirely (purchases − cost of sales).",
      ],
      // (b) difficulté : partir de la marge brute, pas du coût des ventes
      [
        "A retailer had revenue of €900,000 and a gross profit margin of 40%. During the period, its inventory decreased by €30,000. The retailer's purchases during the period were closest to:",
        ["€510,000.", "€540,000.", "€570,000."],
        0,
        "Cost of sales is revenue × (1 − gross margin) = €900,000 × 60% = €540,000. Since inventory decreased, part of what was sold came out of existing stock rather than new purchases, so purchases = cost of sales − decrease in inventory = €540,000 − €30,000 = €510,000. €540,000 uses cost of sales directly and ignores the inventory change; €570,000 adds the decrease instead of subtracting it.",
      ],

      // ---- Q42 — variation des bénéfices non distribués --------------------
      // (a) angle : inverser — retrouver les dividendes
      [
        "A company's beginning retained earnings were €1,500 thousand, its net income for the year was €900 thousand, and its ending retained earnings were €1,900 thousand. If there are no other items affecting shareholders' equity, dividends declared and paid during the year (in € thousands) were closest to:",
        ["400.", "500.", "900."],
        1,
        "Ending retained earnings = beginning retained earnings + net income − dividends, so dividends = €1,500 + €900 − €1,900 = €500 thousand. €400 and €900 are simply other figures from the underlying identity substituted in the wrong place.",
      ],
      // (b) difficulté : un dividende en actions s'ajoute au dividende en numéraire
      [
        "A company's beginning retained earnings were €1,500 thousand and its ending retained earnings were €2,000 thousand. During the year it declared and paid a cash dividend of €400 thousand, and it also issued a stock dividend that reduced retained earnings by a further €150 thousand (with an offsetting increase to contributed capital). Net income for the year (in € thousands) is closest to:",
        ["750.", "900.", "1,050."],
        2,
        "Ending retained earnings = beginning + net income − cash dividend − stock dividend, so net income = €2,000 − €1,500 + €400 + €150 = €1,050 thousand. €900 forgets the stock dividend's additional reduction to retained earnings entirely; €750 subtracts the stock dividend instead of adding it back when solving for net income.",
      ],

      // ---- Q44 — application rétrospective ---------------------------------
      // (a) angle : le cas opposé — un changement d'estimation
      [
        "A company revises its estimate of the useful life of its equipment. This change should most likely be accounted for:",
        [
          "retrospectively, restating all prior periods presented.",
          "prospectively, in the period of change and future periods only.",
          "retrospectively, but only if the change is judged to be material.",
        ],
        1,
        "A change in an accounting estimate — such as a revised useful life — is applied prospectively: depreciation going forward reflects the new estimate, but prior periods are not restated. Retrospective application (with prior periods restated) is reserved for changes in accounting policy, not changes in estimate.",
      ],
      // (b) difficulté : identifier d'abord le TYPE de changement
      [
        "A company previously expensed certain development costs as incurred. This year, after concluding that similar costs now meet the criteria for capitalization under the applicable accounting standard, it begins capitalizing them going forward, without restating prior years. This treatment is most likely:",
        [
          "correct, because a change in which recognition criteria are met is treated as a change in accounting estimate, applied prospectively.",
          "incorrect, because this is a change in accounting policy and should be applied retrospectively, absent impracticality.",
          "correct, because retrospective application is prohibited for expense recognition changes.",
        ],
        1,
        "Changing how a type of cost is recognized — expensed versus capitalized — is a change in accounting policy, not a change in estimate, even though it was triggered by a reassessment of the facts. Accounting policy changes require retrospective application, restating prior periods as if the new policy had always been used, unless doing so is impracticable. Simply applying the new treatment going forward, as described, is the wrong treatment for this type of change.",
      ],

      // ---- Q45 — dépréciation des stocks : reprise ------------------------
      // (a) angle : la reprise de dépréciation, IFRS contre US GAAP
      [
        "Which of the following is most accurate regarding the reversal of a previously recognized inventory write-down?",
        [
          "IFRS permits reversal, up to the amount of the original write-down; US GAAP prohibits reversal.",
          "US GAAP permits reversal, up to the amount of the original write-down; IFRS prohibits reversal.",
          "Both IFRS and US GAAP prohibit any reversal of a previously recognized write-down.",
        ],
        0,
        "Under IFRS, if the circumstances that caused an inventory write-down no longer exist, the write-down can be reversed, but only up to the original cost — the reversal cannot create a gain beyond that. US GAAP does not permit reversing an inventory write-down once it has been recognized, even if the inventory's value later recovers.",
      ],
      // (b) difficulté : appliquer la règle avec des chiffres
      [
        "A company writes inventory down from €100,000 cost to €70,000 net realizable value in Year 1. In Year 2, net realizable value recovers to €95,000, still below the original €100,000 cost. Under IFRS, the inventory should be reported in Year 2 at:",
        ["€70,000.", "€95,000.", "€100,000."],
        1,
        "IFRS allows the write-down to be reversed as net realizable value recovers, but the reversal is capped at the original cost. Since the recovered value of €95,000 is still below the €100,000 original cost, the full recovery is recognized: the inventory is reported at €95,000. €70,000 wrongly applies the US GAAP no-reversal rule; €100,000 wrongly caps the reversal at cost even though the actual recovered value is lower than cost.",
      ],

      // ---- Q47 — comptabilité conservatrice ---------------------------------
      // (a) angle : le cas opposé — une comptabilité agressive
      [
        "A company capitalizes an expenditure that, under a stricter interpretation of the accounting standard, could reasonably have been expensed immediately — a choice that increases current-period reported income relative to that stricter alternative. This is most likely an example of:",
        ["conservative accounting.", "aggressive accounting.", "a change in accounting estimate."],
        1,
        "Aggressive accounting choices increase current-period reported income and financial position relative to a more conservative alternative, often at the expense of later periods. Conservative accounting does the opposite — it decreases reported performance now, potentially boosting it later — and this is not a change in accounting estimate, since it reflects a policy choice about how to treat the expenditure, not a revised estimate.",
      ],
      // (b) difficulté : ce que devient l'écart l'année suivante
      [
        "A company makes conservative accounting choices that reduce its reported net income in Year 1 relative to a less conservative alternative. All else equal, this choice is most likely to have which effect on reported net income in Year 2, relative to that same less conservative alternative?",
        [
          "Lower, since conservative accounting permanently reduces total lifetime income.",
          "No effect, since accounting choices affect only the period in which they are made.",
          "Higher, since some of the income deferred from Year 1 is recognized in Year 2.",
        ],
        2,
        "Conservative and aggressive accounting choices mainly shift the timing of reported income between periods rather than changing the underlying economics of the business — income deferred by a conservative choice in Year 1 tends to show up as relatively higher reported income in Year 2. It is a common misconception that conservative accounting destroys income permanently; over the life of the business, total income is the same regardless of the accounting choices made along the way.",
      ],

      // ---- Q48 — DuPont et rendement des capitaux propres ------------------
      // (a) angle : un autre levier, dans l'autre sens
      [
        "All else being equal, an increase in which of the following would most likely result in a lower return on equity (ROE)?",
        ["Total asset turnover.", "Net profit margin.", "The tax rate."],
        2,
        "A higher tax rate lowers the tax burden ratio (net income ÷ pretax income) in the DuPont decomposition, which directly reduces ROE. An increase in total asset turnover or net profit margin, by contrast, raises ROE — both are components that move in the same direction as ROE, not the opposite direction.",
      ],
      // (b) difficulté : identifier le facteur par élimination
      [
        "A company's five-factor DuPont decomposition shows the following from Year 1 to Year 2: tax burden unchanged, interest burden unchanged, EBIT margin unchanged, and total asset turnover unchanged. Over the same period, ROE fell from 18% to 15%. This decline is most likely explained by a decrease in the company's:",
        ["financial leverage.", "net profit margin.", "asset turnover."],
        0,
        "The five-factor DuPont decomposition is tax burden × interest burden × EBIT margin × asset turnover × financial leverage. Four of the five factors are explicitly stated as unchanged, and net profit margin and asset turnover are already covered by the stated-unchanged EBIT margin and turnover terms — by elimination, the one remaining factor, financial leverage, must be the one that fell to explain the drop in ROE.",
      ],

      // ---- Q50 — croissance organique --------------------------------------
      // (a) angle : retrouver la croissance organique à partir du total
      [
        "A retailer's total revenue increased by 12% year over year. Of this, 3 percentage points came from newly acquired stores and 1 percentage point from favorable foreign exchange translation. The retailer's organic growth rate is closest to:",
        ["9%.", "8%.", "12%."],
        1,
        "Organic growth excludes the effects of acquisitions/divestitures and foreign exchange translation, leaving only growth from existing operations at constant currency: 12% − 3% − 1% = 8%. 12% is total revenue growth without removing either adjustment; 9% removes only one of the two adjustments.",
      ],
      // (b) difficulté : décomposer la croissance organique elle-même
      [
        "A company's total revenue grew 10% year over year, of which 2 percentage points came from an acquisition completed mid-year. Of the remaining organic growth, unit volume contributed 5 percentage points. The price/mix contribution to organic growth was closest to:",
        ["5%.", "8%.", "3%."],
        2,
        "Organic growth is total growth less the acquisition contribution: 10% − 2% = 8%. Organic growth is itself the sum of volume and price/mix effects, so price/mix = 8% − 5% (volume) = 3%. 8% is the total organic growth rate, not the price/mix component alone; 5% is only the volume component.",
      ],

      // ---- Q51 — passifs et actifs d'impôts différés ------------------------
      // (a) angle : le cas inverse — un actif d'impôt différé
      [
        "Deferred tax assets most likely arise when:",
        [
          "accounting (pretax) profit is greater than taxable income.",
          "the tax base of an asset is less than its carrying value.",
          "taxable income is greater than accounting (pretax) profit.",
        ],
        2,
        "When taxable income exceeds accounting profit in a period, the company pays more tax now than its accounting income statement implies — that excess tax paid is recoverable in future periods, creating a deferred tax asset. Accounting profit exceeding taxable income is instead the condition that creates a deferred tax liability, and an asset's tax base being less than its carrying value (carrying value > tax base) also points to a deferred tax liability, not an asset.",
      ],
      // (b) difficulté : appliquer la règle à un cas concret
      [
        "A company recognizes a warranty expense and a corresponding liability of €50,000 for accounting purposes in the year of sale, but tax authorities do not allow the deduction until warranty claims are actually paid in cash, which occurs in a later year. In the year of sale, this temporary difference gives rise to a:",
        [
          "deferred tax liability, since accounting profit exceeds taxable income in the year of sale.",
          "no deferred tax item, since the warranty liability itself is not a tax-deductible expense.",
          "deferred tax asset, since the expense is recognized for accounting purposes before it is deductible for tax purposes.",
        ],
        2,
        "The warranty expense reduces accounting profit in the year of sale, but the tax authorities do not yet allow the deduction, so taxable income that year is higher than accounting profit — the company effectively prepays tax on income it has already expensed for accounting purposes, and recovers that prepayment through lower taxable income when the claims are later paid. Describing this as accounting profit exceeding taxable income reverses the actual direction of the difference; and a temporary difference clearly does exist here, so 'no deferred tax item' is not correct either.",
      ],

      // ---- Q54 — BPA dilué, méthode du "if-converted" -----------------------
      // (a) angle : un convertible réellement DILUTIF, pas anti-dilutif
      [
        "A company has net income of $200,000, a 15% tax rate, and a weighted average of 125,000 common shares outstanding. It also has a 6% convertible bond with a face value of $60,000, convertible into 5,000 common shares. The company's diluted EPS is closest to:",
        ["$1.56.", "$1.60.", "$1.62."],
        0,
        "Basic EPS is $200,000 / 125,000 = $1.60. The after-tax interest saved if the bond converts is $60,000 × 6% × (1 − 15%) = $3,060, so if-converted diluted EPS is ($200,000 + $3,060) / (125,000 + 5,000) = $203,060 / 130,000 ≈ $1.56. Because this is below basic EPS, the convertible is genuinely dilutive and must be included — unlike a convertible whose if-converted EPS would exceed basic EPS, in which case it would be antidilutive and excluded. $1.60 wrongly ignores the convertible entirely; $1.62 adds the interest savings to net income but forgets to add the 5,000 shares to the denominator.",
      ],
      // (b) difficulté : filtrer un titre dilutif parmi deux candidats
      [
        "The same company (net income $200,000, 15% tax rate, 125,000 weighted average shares, basic EPS $1.60) also has two potentially dilutive securities outstanding: a 12% convertible bond, face value $60,000, convertible into 3,000 shares; and an 8% convertible bond, face value $50,000, convertible into 4,000 shares. The company's diluted EPS is closest to:",
        ["$1.58.", "$1.60.", "$1.61."],
        0,
        "Each convertible must be screened separately before being combined. The 12% bond's after-tax interest saved is $60,000 × 12% × 0.85 = $6,120, an incremental $6,120 / 3,000 = $2.04 per share — well above basic EPS, so it is antidilutive and excluded. The 8% bond's after-tax interest saved is $50,000 × 8% × 0.85 = $3,400, an incremental $3,400 / 4,000 = $0.85 per share — below basic EPS, so it is dilutive and included: diluted EPS = ($200,000 + $3,400) / (125,000 + 4,000) ≈ $1.58. $1.60 ignores both convertibles; $1.61 mistakenly includes the antidilutive 12% bond instead of the dilutive 8% bond.",
      ],

      // ---- Q60 — ratios liés au ROE et au ROA ------------------------------
      // (a) angle : retrouver l'actif moyen, pas les ratios eux-mêmes
      [
        "An analyst collects the following information about a company: net profit margin 4%, return on average assets 8%, return on average equity 16%, revenue €2,500,000. The company's average total assets are closest to:",
        ["€625,000.", "€1,250,000.", "€2,500,000."],
        1,
        "Net income is revenue × net profit margin = €2,500,000 × 4% = €100,000, and average total assets = net income ÷ ROA = €100,000 / 8% = €1,250,000. €625,000 divides net income by ROE instead of ROA, which gives average equity, not average assets; €2,500,000 simply repeats revenue without any calculation.",
      ],
      // (b) difficulté : combiner deux étapes pour obtenir le levier financier
      [
        "Using the same company (net profit margin 4%, return on average equity 16%, revenue €2,500,000, and average total assets of €1,250,000), the company's financial leverage ratio (average assets ÷ average equity) is closest to:",
        ["0.50.", "2.00.", "2.50."],
        1,
        "Net income is €2,500,000 × 4% = €100,000, so average equity = net income ÷ ROE = €100,000 / 16% = €625,000. Financial leverage = average assets ÷ average equity = €1,250,000 / €625,000 = 2.00. 0.50 inverts the ratio (equity ÷ assets instead of assets ÷ equity) — a genuinely different ratio that answers a different question.",
      ],

      // ---- Q62 — flux de trésorerie et ventes au comptant -------------------
      // (a) angle : le cas inverse — une hausse du CFO
      [
        "A company's sales and net income are roughly unchanged year over year, but its cash flow from operations increased significantly. The company most likely experienced an increase in:",
        [
          "days of inventory on hand.",
          "the proportion of sales made on a cash basis.",
          "the average collection period for receivables.",
        ],
        1,
        "If sales and net income are stable but more of that revenue is collected immediately in cash rather than on credit, cash flow from operations rises without any change to the income statement. A longer collection period or more inventory on hand would each tie up more cash, not less — both would tend to reduce, not increase, cash flow from operations.",
      ],
      // (b) difficulté : écarter une explication concurrente
      [
        "A company's sales and net income were roughly unchanged year over year, but cash flow from operations fell sharply. During the same year, the company extended significantly more trade credit to a large new customer, while its accounts payable turnover stayed unchanged. The most likely explanation for the decline in cash flow from operations is:",
        [
          "a deterioration in payables management.",
          "an increase in the cash conversion cycle driven solely by slower inventory turnover.",
          "a decrease in the proportion of cash sales, driven by the new credit sales to the large customer.",
        ],
        2,
        "The new trade credit extended to a large customer directly points to a shift from cash sales toward credit sales, which increases receivables and reduces cash flow from operations even though revenue and net income are unaffected. Payables management is explicitly ruled out, since accounts payable turnover is stated as unchanged, and nothing in the scenario points to an inventory problem.",
      ],

      // ---- Q66 — dépréciation des stocks et types de ratios -----------------
      // (a) angle : quel type de ratio est aussi PÉNALISÉ
      [
        "Following an inventory write-down, which of the following ratio types is most likely negatively affected, compared to if the write-down had not occurred?",
        ["Activity ratios.", "None; only the balance sheet is affected, not any ratios.", "Solvency ratios."],
        2,
        "A write-down reduces both the current period's profit and the carrying amount of inventory, which reduces retained earnings and therefore equity — this worsens solvency ratios that compare debt to equity. Activity ratios such as inventory turnover actually improve, because the write-down shrinks the inventory (denominator) more than it changes the flow measure in the numerator; the write-down clearly does affect the income statement and multiple balance-sheet-based ratios, not just the balance sheet in isolation.",
      ],
      // (b) difficulté : la direction ET le mécanisme d'un ratio d'activité précis
      [
        "A company writes down €2 million of obsolete inventory. All else equal, this write-down will most likely cause its inventory turnover ratio (cost of goods sold ÷ average inventory) to:",
        [
          "increase, because average inventory (the denominator) falls as a result of the write-down.",
          "decrease, because the write-down reduces cost of goods sold while inventory stays the same.",
          "remain unchanged, because a write-down does not affect either cost of goods sold or inventory.",
        ],
        0,
        "The write-down reduces the carrying amount of inventory, shrinking the denominator of the inventory turnover ratio — and a smaller denominator on its own is enough to push the ratio up, regardless of exactly how the write-down expense is classified on the income statement. It is incorrect that a write-down leaves inventory unaffected: that reduction in the balance sheet carrying amount is the whole point of recognizing it.",
      ],

      // ---- Q68 — trésorerie versée aux fournisseurs -------------------------
      // (a) angle : inverser — retrouver la variation des dettes fournisseurs
      [
        "A company's cost of sales was €800 million, and inventory decreased by €250 million during the year. If cash paid to suppliers was €450 million, the change in accounts payable was:",
        [
          "an increase of €100 million.",
          "a decrease of €100 million.",
          "an increase of €350 million.",
        ],
        0,
        "Purchases = cost of sales − decrease in inventory = €800M − €250M = €550M. Cash paid to suppliers = purchases − increase in accounts payable, so the increase in accounts payable = €550M − €450M = €100M. €350M forgets to adjust cost of sales for the change in inventory before comparing it to cash paid; €100M with the wrong sign would imply payables fell even though less cash was paid out than was purchased, which is the opposite of what a payables increase means.",
      ],
      // (b) difficulté : stock ET dettes fournisseurs évoluent ensemble
      [
        "A company's cost of sales was €900 million. During the year, inventory increased by €40 million and accounts payable decreased by €60 million. Cash paid to suppliers during the year was closest to:",
        ["€880 million.", "€940 million.", "€1,000 million."],
        2,
        "A rising inventory level means the company bought more than it sold, so purchases = cost of sales + increase in inventory = €900M + €40M = €940M. Because accounts payable fell, the company paid out more cash than it purchased on credit that year, so cash paid to suppliers = purchases + decrease in accounts payable = €940M + €60M = €1,000M. €940M stops after computing purchases and forgets the payables adjustment; €880M applies both adjustments with the signs reversed.",
      ],

      // ---- Q72 — écart d'acquisition sous la méthode de l'acquisition -------
      // (a) angle : le cas inverse — une acquisition à prix avantageux
      [
        "Under the acquisition method, if the purchase price of an acquired company is LESS than the fair value of the net identifiable assets acquired, the acquirer should record the difference as a:",
        [
          "gain recognized immediately in profit or loss (a bargain purchase gain).",
          "reduction of goodwill on the balance sheet.",
          "gain recognized in other comprehensive income.",
        ],
        0,
        "A purchase price below the fair value of the net identifiable assets acquired is a bargain purchase, and the resulting gain is recognized immediately in profit or loss — not deferred, and not routed through other comprehensive income. There is no goodwill to reduce in this case, since goodwill only arises when the purchase price exceeds fair value, the opposite situation.",
      ],
      // (b) difficulté : calculer l'écart d'acquisition à partir des composantes
      [
        "An acquirer pays €500 million for a target company. The fair value of the target's identifiable assets is €560 million and the fair value of its identifiable liabilities assumed is €110 million. The acquirer should recognize:",
        ["goodwill of €50 million.", "a bargain purchase gain of €50 million.", "goodwill of €560 million."],
        0,
        "The fair value of net identifiable assets is €560M − €110M = €450M. Since the €500M purchase price exceeds this by €50M, goodwill of €50M is recognized. Calling this a bargain purchase gain reverses which side is larger; using €560M as the benchmark forgets to net out the assumed liabilities.",
      ],

      // ---- Q73 — retraite sous IFRS et autres éléments du résultat global ----
      // (a) angle : ce qui passe en résultat net, pas en AERG
      [
        "Under IFRS, which of the following components of the periodic change in the net pension asset or liability is recognized in profit or loss, rather than in other comprehensive income?",
        [
          "Employees' service cost.",
          "Actuarial gains and losses.",
          "Remeasurements of plan assets due to a change in the discount rate.",
        ],
        0,
        "Service cost and net interest expense or income on the pension asset or liability are recognized in profit or loss as ordinary pension expense. Actuarial gains and losses and other remeasurements — including the effect of discount rate changes on the plan's assets or obligation — are instead recognized in other comprehensive income.",
      ],
      // (b) difficulté : le sort ultérieur de ce montant en AERG
      [
        "Under IFRS, actuarial gains and losses on a defined benefit pension plan are recognized in other comprehensive income. In subsequent periods, these amounts are most likely:",
        [
          "never reclassified to profit or loss.",
          "reclassified to profit or loss once a corridor threshold is exceeded.",
          "amortized into profit or loss over employees' expected remaining service life.",
        ],
        0,
        "Under IFRS, pension remeasurements recognized in other comprehensive income are never subsequently reclassified ('recycled') into profit or loss — they remain in accumulated other comprehensive income permanently. Amortizing deferred actuarial gains and losses into profit or loss through a corridor approach was a feature of older US GAAP practice, not the current IFRS treatment.",
      ],

      // ---- Q78 — actifs long terme destinés à être cédés ---------------------
      // (a) angle : le cas normal — une vente à un tiers
      [
        "A company commits to a plan to sell a group of long-lived assets to an outside buyer through a normal sale within the next 12 months, and the assets meet all applicable criteria to be classified as held for sale. Until the sale occurs, the assets should be:",
        [
          "classified as held for use, with depreciation continuing.",
          "immediately written off, since a sale has already been committed to.",
          "classified as held for sale, with depreciation suspended.",
        ],
        2,
        "When assets meet the held-for-sale criteria in connection with a genuine sale to an outside party, they are reclassified as held for sale and depreciation stops, since the assets are no longer being used to generate value through ongoing operations — they are simply awaiting sale, generally at the lower of carrying amount and fair value less costs to sell. This is the case where held-for-sale treatment genuinely applies, as distinct from a disposal by spin-off, exchange, or abandonment, which keeps the depreciation running.",
      ],
      // (b) difficulté : un autre mode de cession que la vente ou la scission
      [
        "A manufacturer plans to abandon a production line — disposing of the related equipment other than by sale — within the next six months. Until the abandonment occurs, the equipment should most likely be:",
        [
          "classified as held for use, with depreciation continuing until disposal.",
          "classified as held for sale, with depreciation suspended.",
          "immediately derecognized, since the decision to abandon has already been made.",
        ],
        0,
        "Held-for-sale classification, with depreciation suspended, applies specifically to assets that will be disposed of through a sale. Assets disposed of by other means — a spin-off, an exchange for other assets, or abandonment, as here — remain classified as held for use and continue to be depreciated right up until the disposal actually occurs, even once management has committed to the decision.",
      ],

      // ---- Q84 — coût moyen pondéré contre FIFO en période de hausse des prix ---
      // (a) angle : l'effet sur la marge brute, pas sur le cycle de conversion
      [
        "All else being equal, during a period of rising prices and constant inventory quantities, a company using the weighted average cost method most likely reports a gross profit margin, relative to if it had used FIFO, that is:",
        [
          "lower, because weighted average cost of goods sold blends in some of the higher-cost recent purchases sooner than FIFO does.",
          "higher, because weighted average defers recognizing higher-cost purchases in cost of goods sold.",
          "the same, because gross margin is unaffected by the choice of inventory cost method.",
        ],
        0,
        "FIFO matches the oldest, cheapest costs to cost of goods sold during rising prices, leaving the higher-cost recent purchases in ending inventory — this produces the lowest cost of goods sold and the highest gross margin among the common methods. Weighted average cost blends some of those higher recent costs into cost of goods sold immediately, producing a higher cost of goods sold and therefore a lower gross margin than FIFO.",
      ],
      // (b) difficulté : chiffrer le cycle de conversion de trésorerie
      [
        "Company A uses FIFO and, during a period of rising prices, reports days of inventory on hand (DOH) of 60, days of sales outstanding (DSO) of 45, and days of payables of 40. If Company A instead used weighted average cost — with DSO and days of payables unaffected by the cost-flow method, and DOH 8 days lower due to the higher inventory turnover under weighted average — its cash conversion cycle under weighted average would be closest to:",
        ["57 days.", "65 days.", "73 days."],
        0,
        "The cash conversion cycle is DOH + DSO − days of payables. Under FIFO it is 60 + 45 − 40 = 65 days; under weighted average, DOH falls by 8 days to 52, giving 52 + 45 − 40 = 57 days. 65 days is simply the unchanged FIFO figure; 73 days adds the 8-day adjustment instead of subtracting it.",
      ],

      // ---- Q88 — perte de valeur (IAS 36) -----------------------------------
      // (a) angle : quand la valeur d'utilité, pas la juste valeur, domine
      [
        "An analyst gathers the following information about an asset (in € thousands): carrying amount prior to impairment 80; present value of expected future cash flows (value in use) 58; fair value 70; costs to sell 5. The impairment loss (in € thousands) is:",
        ["10.", "15.", "22."],
        1,
        "The recoverable amount is the higher of fair value less costs to sell (€70 − €5 = €65) and value in use (€58); here that is €65. The impairment loss is carrying amount minus recoverable amount: €80 − €65 = €15. €10 uses fair value directly without subtracting costs to sell; €22 uses value in use alone (€80 − €58) instead of taking the higher of the two candidate measures.",
      ],
      // (b) difficulté : remonter à la valeur comptable à partir de la perte
      [
        "An asset's fair value is €70 thousand and estimated costs to sell are €6 thousand. Its value in use is €68 thousand. If the recognized impairment loss was €9 thousand, the asset's carrying amount prior to impairment (in € thousands) was:",
        ["73.", "77.", "85."],
        1,
        "The recoverable amount is the higher of fair value less costs to sell (€70 − €6 = €64) and value in use (€68); here that is €68. Since impairment loss = carrying amount − recoverable amount, carrying amount = €68 + €9 = €77. €73 wrongly uses €64 (fair value less costs to sell) as the recoverable amount instead of the higher value-in-use figure; €85 adds costs to sell instead of subtracting it when evaluating the fair-value-based candidate.",
      ],

      // ---- Q89 — ratio de levier financier -----------------------------------
      // (a) angle : inverser — retrouver l'actif total
      [
        "A company's financial leverage ratio is 1.80 and its total equity is £500 million. The company's total assets are closest to:",
        ["£278 million.", "£500 million.", "£900 million."],
        2,
        "Financial leverage ratio = total assets ÷ total equity, so total assets = leverage ratio × total equity = 1.80 × £500M = £900M. £278M divides equity by the leverage ratio instead of multiplying, inverting the formula; £500M simply repeats the equity figure without applying the ratio at all.",
      ],
      // (b) difficulté : distinguer la dette totale des passifs totaux
      [
        "Using the same company (total assets £600 million, total liabilities £120 million, total equity £480 million, total debt £60 million), the debt-to-equity ratio, using total debt rather than total liabilities, is closest to:",
        ["0.125.", "0.25.", "1.25."],
        0,
        "Debt-to-equity uses interest-bearing debt specifically, not all liabilities: £60M / £480M = 0.125. 0.25 is the common mix-up of using total liabilities (£120M) instead of total debt in the numerator — liabilities include non-interest-bearing items such as accounts payable, which are not part of 'debt' in this ratio. 1.25 is the company's financial leverage ratio (assets ÷ equity), a different ratio entirely.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — Analyse des États Financiers...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
