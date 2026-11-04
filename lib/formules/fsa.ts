import type { MatiereFormules } from "@/lib/formules/types";

export const FSA: MatiereFormules = {
  matiere: "fsa",
  copies: [
    {
      id: "fsa.compte-de-resultat",
      titre: "Compte de résultat et BPA",
      formules: [
        {
          id: "fsa.revenue-recognition",
          nom: "Revenue recognition: the five steps",
          texte: "1) Identify the contract(s) with the customer; 2) Identify the performance obligations; 3) Determine the transaction price; 4) Allocate the transaction price to the performance obligations; 5) Recognize revenue when (or as) each performance obligation is satisfied.",
          note: "Même modèle en IFRS 15 et en US GAAP (ASC 606)."
        },
        {
          id: "fsa.gross-profit",
          nom: "Gross profit",
          latex: "\\text{Revenue} - \\text{COGS}"
        },
        {
          id: "fsa.comprehensive-income",
          nom: "Comprehensive income",
          latex: "\\text{Net income} + \\text{Other comprehensive income}"
        },
        {
          id: "fsa.retained-earnings",
          nom: "Ending retained earnings",
          latex: "\\text{Beginning retained earnings} + \\text{Net income} - \\text{Dividends declared}"
        },
        {
          id: "fsa.basic-eps",
          nom: "Basic EPS",
          latex: "\\frac{\\text{Net income} - \\text{Preferred dividends}}{\\text{Weighted average number of common shares outstanding}}"
        },
        {
          id: "fsa.diluted-eps",
          nom: "Diluted EPS",
          latex: "\\frac{\\text{Net income} - \\text{Preferred dividends} + \\text{Dividends on convertible preferred} + \\text{Convertible debt interest}(1-t)}{\\text{Weighted average shares} + \\text{Shares from conversion of convertible preferred} + \\text{Shares from conversion of convertible debt} + \\text{Shares issued from exercise of options}}",
          note: "If-converted method pour les convertibles ; on n'inclut que ce qui est dilutif."
        },
        {
          id: "fsa.treasury-stock-method",
          nom: "Incremental shares from options (treasury stock method)",
          latex: "N \\times \\left(1 - \\frac{\\text{Exercise price}}{\\text{Average market price}}\\right)",
          note: "N = nombre d'options. Dilutif seulement si le cours moyen dépasse le prix d'exercice."
        },
        {
          id: "fsa.effective-tax-rate",
          nom: "Effective tax rate",
          latex: "\\frac{\\text{Income tax expense}}{\\text{Pretax income}}"
        },
        {
          id: "fsa.common-size-income",
          nom: "Common-size income statement item",
          latex: "\\frac{\\text{Line item}}{\\text{Revenue}}"
        }
      ]
    },
    {
      id: "fsa.bilan",
      titre: "Bilan et lecture des états",
      formules: [
        {
          id: "fsa.accounting-equation",
          nom: "Assets (accounting equation)",
          latex: "\\text{Assets} = \\text{Liabilities} + \\text{Equity}"
        },
        {
          id: "fsa.working-capital",
          nom: "Working capital",
          latex: "\\text{Current assets} - \\text{Current liabilities}"
        },
        {
          id: "fsa.goodwill",
          nom: "Goodwill",
          latex: "\\text{Purchase price} - \\text{Fair value of identifiable net assets acquired}",
          note: "Non amorti ; testé en dépréciation chaque année."
        },
        {
          id: "fsa.common-size-balance",
          nom: "Common-size balance sheet item",
          latex: "\\frac{\\text{Line item}}{\\text{Total assets}}"
        },
        {
          id: "fsa.ending-equity",
          nom: "Ending shareholders' equity (clean surplus)",
          latex: "\\text{Beginning equity} + \\text{Net income} - \\text{Dividends} \\pm \\text{Share issuance / repurchase}"
        }
      ]
    },
    {
      id: "fsa.flux-de-tresorerie",
      titre: "Flux de trésorerie (CFO, direct, indirect)",
      formules: [
        {
          id: "fsa.cfo-indirect",
          nom: "CFO (indirect method)",
          latex: "\\text{Net income} + \\text{Non-cash charges} - \\text{Non-cash gains} - \\Delta\\text{Operating working capital}",
          note: "Une hausse d'un actif opérationnel réduit le CFO ; une hausse d'un passif opérationnel l'augmente."
        },
        {
          id: "fsa.cash-from-customers",
          nom: "Cash collected from customers",
          latex: "\\text{Revenue} - \\Delta\\text{Accounts receivable} + \\Delta\\text{Unearned revenue}"
        },
        {
          id: "fsa.cash-to-suppliers",
          nom: "Cash paid to suppliers",
          latex: "-\\left(\\text{COGS} + \\Delta\\text{Inventory} - \\Delta\\text{Accounts payable}\\right)",
          note: "Méthode directe : le signe négatif indique un décaissement."
        },
        {
          id: "fsa.fcff-from-cfo",
          nom: "FCFF from CFO",
          latex: "\\text{CFO} + \\text{Interest paid}(1-t) - \\text{FCInv}",
          note: "Sous IFRS, si l'intérêt payé est déjà classé en financement, ne pas le rajouter."
        },
        {
          id: "fsa.fcff-from-ni",
          nom: "FCFF from net income",
          latex: "\\text{NI} + \\text{NCC} + \\text{Int}(1-t) - \\text{FCInv} - \\text{WCInv}",
          note: "NCC = non-cash charges ; FCInv = capex net ; WCInv = investissement en fonds de roulement."
        },
        {
          id: "fsa.fcfe-from-cfo",
          nom: "FCFE from CFO",
          latex: "\\text{CFO} - \\text{FCInv} + \\text{Net borrowing}"
        },
        {
          id: "fsa.fcfe-from-fcff",
          nom: "FCFE from FCFF",
          latex: "\\text{FCFF} - \\text{Int}(1-t) + \\text{Net borrowing}"
        },
        {
          id: "fsa.common-size-cash-flow",
          nom: "Common-size cash flow statement item",
          latex: "\\frac{\\text{Cash flow line item}}{\\text{Revenue}}",
          note: "Ou en % du total des entrées / sorties de trésorerie."
        }
      ]
    },
    {
      id: "fsa.ratios-flux",
      titre: "Ratios de flux de trésorerie",
      formules: [
        {
          id: "fsa.cfo-to-revenue",
          nom: "Cash flow to revenue",
          latex: "\\frac{\\text{CFO}}{\\text{Net revenue}}"
        },
        {
          id: "fsa.cash-return-on-assets",
          nom: "Cash return on assets",
          latex: "\\frac{\\text{CFO}}{\\text{Average total assets}}"
        },
        {
          id: "fsa.cash-return-on-equity",
          nom: "Cash return on equity",
          latex: "\\frac{\\text{CFO}}{\\text{Average total equity}}"
        },
        {
          id: "fsa.cfo-to-ni",
          nom: "Cash to income",
          latex: "\\frac{\\text{CFO}}{\\text{Operating income}}"
        },
        {
          id: "fsa.cash-flow-per-share",
          nom: "Cash flow per share",
          latex: "\\frac{\\text{CFO} - \\text{Preferred dividends}}{\\text{Weighted average number of common shares}}"
        },
        {
          id: "fsa.debt-coverage",
          nom: "Debt coverage",
          latex: "\\frac{\\text{CFO}}{\\text{Total debt}}"
        },
        {
          id: "fsa.interest-coverage-cf",
          nom: "Interest coverage (cash flow based)",
          latex: "\\frac{\\text{CFO} + \\text{Interest paid} + \\text{Taxes paid}}{\\text{Interest paid}}"
        },
        {
          id: "fsa.reinvestment",
          nom: "Reinvestment",
          latex: "\\frac{\\text{CFO}}{\\text{Cash paid for long-term assets}}"
        },
        {
          id: "fsa.debt-payment",
          nom: "Debt payment",
          latex: "\\frac{\\text{CFO}}{\\text{Cash paid for long-term debt repayment}}"
        },
        {
          id: "fsa.dividend-payment",
          nom: "Dividend payment",
          latex: "\\frac{\\text{CFO}}{\\text{Dividends paid}}"
        },
        {
          id: "fsa.investing-and-financing",
          nom: "Investing and financing",
          latex: "\\frac{\\text{CFO}}{\\text{Cash outflows from investing and financing activities}}"
        }
      ]
    },
    {
      id: "fsa.stocks",
      titre: "Stocks (inventories)",
      formules: [
        {
          id: "fsa.cogs",
          nom: "Cost of goods sold",
          latex: "\\text{Beginning inventory} + \\text{Purchases} - \\text{Ending inventory}"
        },
        {
          id: "fsa.fifo-inventory",
          nom: "FIFO inventory",
          latex: "\\text{LIFO inventory} + \\text{LIFO reserve}"
        },
        {
          id: "fsa.fifo-cogs",
          nom: "FIFO COGS",
          latex: "\\text{LIFO COGS} - \\Delta\\text{LIFO reserve}",
          note: "Prix en hausse : COGS FIFO plus bas, bénéfice FIFO plus haut."
        },
        {
          id: "fsa.fifo-equity",
          nom: "FIFO equity (adjusted from LIFO)",
          latex: "\\text{LIFO equity} + \\text{LIFO reserve}(1-t)"
        },
        {
          id: "fsa.nrv",
          nom: "Net realizable value",
          latex: "\\text{Estimated selling price} - \\text{Costs to complete and sell}",
          note: "Stock porté au plus bas du coût et de la NRV (IFRS : toujours ; US GAAP : FIFO / coût moyen)."
        },
        {
          id: "fsa.inventory-writedown",
          nom: "Inventory write-down",
          latex: "\\text{Carrying amount} - \\text{NRV}"
        },
        {
          id: "fsa.inventory-turnover",
          nom: "Inventory turnover",
          latex: "\\frac{\\text{COGS}}{\\text{Average inventory}}"
        },
        {
          id: "fsa.days-inventory-on-hand",
          nom: "Days of inventory on hand",
          latex: "\\frac{365}{\\text{Inventory turnover}}"
        }
      ]
    },
    {
      id: "fsa.actifs-long-terme",
      titre: "Actifs long terme et amortissement",
      formules: [
        {
          id: "fsa.straight-line-depreciation",
          nom: "Straight-line depreciation",
          latex: "\\frac{\\text{Cost} - \\text{Salvage value}}{\\text{Useful life}}"
        },
        {
          id: "fsa.gain-loss-on-sale",
          nom: "Gain (loss) on sale of a long-term asset",
          latex: "\\text{Sale proceeds} - \\text{Carrying amount}"
        },
        {
          id: "fsa.ifrs-recoverable-amount",
          nom: "IFRS recoverable amount",
          latex: "\\max\\left(\\text{Fair value less costs to sell},\\ \\text{Value in use}\\right)"
        },
        {
          id: "fsa.ifrs-impairment-loss",
          nom: "IFRS impairment loss",
          latex: "\\text{Carrying amount} - \\text{Recoverable amount}",
          note: "Constatée si le carrying amount dépasse le recoverable amount ; reprise possible (sauf goodwill)."
        },
        {
          id: "fsa.usgaap-impairment",
          nom: "US GAAP impairment test (held for use)",
          texte: "Impaired if carrying amount > undiscounted expected future cash flows; loss = carrying amount - fair value.",
          note: "Pas de reprise de perte en US GAAP pour les actifs détenus pour usage."
        },
        {
          id: "fsa.average-age",
          nom: "Average age of depreciable assets",
          latex: "\\frac{\\text{Accumulated depreciation}}{\\text{Depreciation expense}}"
        },
        {
          id: "fsa.total-useful-life",
          nom: "Total useful life of depreciable assets",
          latex: "\\frac{\\text{Gross PP\\&E}}{\\text{Depreciation expense}}"
        },
        {
          id: "fsa.remaining-useful-life",
          nom: "Remaining useful life",
          latex: "\\frac{\\text{Net PP\\&E}}{\\text{Depreciation expense}}"
        }
      ]
    },
    {
      id: "fsa.passifs-leases-impots",
      titre: "Dette, leases, retraites et impôts différés",
      formules: [
        {
          id: "fsa.bond-interest-expense",
          nom: "Bond interest expense (effective interest method)",
          latex: "\\text{Beginning carrying value} \\times \\text{Market rate at issuance}"
        },
        {
          id: "fsa.bond-coupon",
          nom: "Bond cash coupon",
          latex: "\\text{Face value} \\times \\text{Coupon rate}"
        },
        {
          id: "fsa.discount-amortization",
          nom: "Discount amortization",
          latex: "\\text{Interest expense} - \\text{Coupon paid}",
          note: "Le carrying value d'une obligation émise à décote augmente vers le nominal."
        },
        {
          id: "fsa.lease-liability",
          nom: "Lessee lease liability at inception",
          latex: "\\text{PV of remaining lease payments}",
          note: "Actualisé au taux implicite du bail, ou au taux d'emprunt marginal du preneur."
        },
        {
          id: "fsa.rou-asset",
          nom: "Right-of-use asset at inception",
          latex: "\\text{PV of remaining lease payments}",
          note: "Égal à la lease liability à l'origine ; sous IFRS (tous baux sauf courts / de faible valeur) et US GAAP."
        },
        {
          id: "fsa.lease-interest",
          nom: "Lease interest expense (finance lease / IFRS)",
          latex: "\\text{Beginning lease liability} \\times \\text{Discount rate}",
          note: "Charge totale du bail = intérêt + amortissement du ROU : plus lourde au début."
        },
        {
          id: "fsa.income-tax-expense",
          nom: "Income tax expense",
          latex: "\\text{Taxes payable} + \\Delta\\text{DTL} - \\Delta\\text{DTA}"
        },
        {
          id: "fsa.taxes-payable",
          nom: "Taxes payable (current tax)",
          latex: "\\text{Taxable income} \\times \\text{Tax rate}"
        },
        {
          id: "fsa.deferred-tax-liability",
          nom: "Deferred tax liability (asset)",
          latex: "\\left(\\text{Carrying amount} - \\text{Tax base}\\right) \\times t",
          note: "Actif : carrying > tax base donne un DTL ; passif : carrying < tax base donne un DTA."
        },
        {
          id: "fsa.tax-base-liability",
          nom: "Tax base of a liability",
          latex: "\\text{Carrying amount} - \\text{Amounts deductible in the future}"
        },
        {
          id: "fsa.funded-status",
          nom: "Funded status of a defined benefit plan",
          latex: "\\text{Fair value of plan assets} - \\text{PBO}",
          note: "PBO (US GAAP) = PVDBO (IFRS). Négatif : net pension liability ; positif : net pension asset."
        },
        {
          id: "fsa.pension-net-interest",
          nom: "Net interest expense (income) on a pension plan",
          latex: "\\text{Net pension liability (asset)} \\times \\text{Discount rate}",
          note: "Charge du compte de résultat avec le service cost ; remesures en OCI."
        }
      ]
    },
    {
      id: "fsa.ratios-activite",
      titre: "Ratios d'activité",
      formules: [
        {
          id: "fsa.receivables-turnover",
          nom: "Receivables turnover",
          latex: "\\frac{\\text{Revenue}}{\\text{Average receivables}}"
        },
        {
          id: "fsa.dso",
          nom: "Days of sales outstanding",
          latex: "\\frac{365}{\\text{Receivables turnover}}"
        },
        {
          id: "fsa.payables-turnover",
          nom: "Payables turnover",
          latex: "\\frac{\\text{Purchases}}{\\text{Average trade payables}}"
        },
        {
          id: "fsa.purchases",
          nom: "Purchases",
          latex: "\\text{COGS} + \\text{Ending inventory} - \\text{Beginning inventory}"
        },
        {
          id: "fsa.number-days-payables",
          nom: "Number of days of payables",
          latex: "\\frac{365}{\\text{Payables turnover}}"
        },
        {
          id: "fsa.working-capital-turnover",
          nom: "Working capital turnover",
          latex: "\\frac{\\text{Revenue}}{\\text{Average working capital}}"
        },
        {
          id: "fsa.fixed-asset-turnover",
          nom: "Fixed asset turnover",
          latex: "\\frac{\\text{Revenue}}{\\text{Average net fixed assets}}"
        },
        {
          id: "fsa.total-asset-turnover",
          nom: "Total asset turnover",
          latex: "\\frac{\\text{Revenue}}{\\text{Average total assets}}"
        }
      ]
    },
    {
      id: "fsa.ratios-liquidite",
      titre: "Ratios de liquidité",
      formules: [
        {
          id: "fsa.current-ratio",
          nom: "Current ratio",
          latex: "\\frac{\\text{Current assets}}{\\text{Current liabilities}}"
        },
        {
          id: "fsa.quick-ratio",
          nom: "Quick ratio",
          latex: "\\frac{\\text{Cash} + \\text{Short-term marketable securities} + \\text{Receivables}}{\\text{Current liabilities}}"
        },
        {
          id: "fsa.cash-ratio",
          nom: "Cash ratio",
          latex: "\\frac{\\text{Cash} + \\text{Short-term marketable securities}}{\\text{Current liabilities}}"
        },
        {
          id: "fsa.defensive-interval",
          nom: "Defensive interval ratio",
          latex: "\\frac{\\text{Cash} + \\text{Short-term marketable securities} + \\text{Receivables}}{\\text{Daily cash expenditures}}"
        },
        {
          id: "fsa.cash-conversion-cycle",
          nom: "Cash conversion cycle",
          latex: "\\text{DOH} + \\text{DSO} - \\text{Number of days of payables}",
          note: "Plus il est court, mieux c'est ; DOH et DSO s'additionnent, les jours de dettes fournisseurs se soustraient."
        }
      ]
    },
    {
      id: "fsa.solvabilite",
      titre: "Ratios de solvabilité",
      formules: [
        {
          id: "fsa.debt-to-assets",
          nom: "Debt-to-assets ratio",
          latex: "\\frac{\\text{Total debt}}{\\text{Total assets}}"
        },
        {
          id: "fsa.debt-to-capital",
          nom: "Debt-to-capital ratio",
          latex: "\\frac{\\text{Total debt}}{\\text{Total debt} + \\text{Total shareholders' equity}}",
          note: "Capital = dette + actions de préférence + capitaux propres."
        },
        {
          id: "fsa.debt-to-equity",
          nom: "Debt-to-equity ratio",
          latex: "\\frac{\\text{Total debt}}{\\text{Total shareholders' equity}}"
        },
        {
          id: "fsa.lt-debt-to-equity",
          nom: "Long-term debt-to-equity ratio",
          latex: "\\frac{\\text{Long-term debt}}{\\text{Total shareholders' equity}}"
        },
        {
          id: "fsa.financial-leverage",
          nom: "Financial leverage ratio",
          latex: "\\frac{\\text{Average total assets}}{\\text{Average total equity}}"
        },
        {
          id: "fsa.interest-coverage",
          nom: "Interest coverage",
          latex: "\\frac{\\text{EBIT}}{\\text{Interest payments}}"
        },
        {
          id: "fsa.fixed-charge-coverage",
          nom: "Fixed charge coverage",
          latex: "\\frac{\\text{EBIT} + \\text{Lease payments}}{\\text{Interest payments} + \\text{Lease payments}}"
        },
        {
          id: "fsa.debt-to-ebitda",
          nom: "Debt-to-EBITDA ratio",
          latex: "\\frac{\\text{Total debt}}{\\text{EBITDA}}",
          note: "Total debt = dette portant intérêt, courte et longue, hors leases (convention du programme)."
        }
      ]
    },
    {
      id: "fsa.rentabilite",
      titre: "Rentabilité et décomposition du ROE",
      formules: [
        {
          id: "fsa.gross-margin",
          nom: "Gross profit margin",
          latex: "\\frac{\\text{Gross profit}}{\\text{Revenue}}"
        },
        {
          id: "fsa.operating-margin",
          nom: "Operating profit margin",
          latex: "\\frac{\\text{Operating income}}{\\text{Revenue}}"
        },
        {
          id: "fsa.pretax-margin",
          nom: "Pretax margin",
          latex: "\\frac{\\text{EBT}}{\\text{Revenue}}"
        },
        {
          id: "fsa.net-margin",
          nom: "Net profit margin",
          latex: "\\frac{\\text{Net income}}{\\text{Revenue}}"
        },
        {
          id: "fsa.roa",
          nom: "Return on assets (ROA)",
          latex: "\\frac{\\text{Net income}}{\\text{Average total assets}}"
        },
        {
          id: "fsa.roa-adjusted",
          nom: "ROA (interest added back)",
          latex: "\\frac{\\text{Net income} + \\text{Interest expense}(1-t)}{\\text{Average total assets}}",
          note: "Intérêt brut (pas net des produits d'intérêt) : met dette et fonds propres sur le même plan."
        },
        {
          id: "fsa.operating-roa",
          nom: "Operating ROA",
          latex: "\\frac{\\text{Operating income}}{\\text{Average total assets}}"
        },
        {
          id: "fsa.return-on-total-capital",
          nom: "Return on total capital",
          latex: "\\frac{\\text{EBIT}}{\\text{Short- and long-term debt} + \\text{Equity}}"
        },
        {
          id: "fsa.roe",
          nom: "Return on equity (ROE)",
          latex: "\\frac{\\text{Net income}}{\\text{Average total equity}}"
        },
        {
          id: "fsa.return-on-common-equity",
          nom: "Return on common equity",
          latex: "\\frac{\\text{Net income} - \\text{Preferred dividends}}{\\text{Average common equity}}"
        },
        {
          id: "fsa.dupont-3",
          nom: "ROE (3-part DuPont)",
          latex: "\\frac{\\text{NI}}{\\text{Revenue}} \\times \\frac{\\text{Revenue}}{\\text{Average assets}} \\times \\frac{\\text{Average assets}}{\\text{Average equity}}",
          note: "Net margin × asset turnover × financial leverage."
        },
        {
          id: "fsa.dupont-5",
          nom: "ROE (5-part DuPont)",
          latex: "\\frac{\\text{NI}}{\\text{EBT}} \\times \\frac{\\text{EBT}}{\\text{EBIT}} \\times \\frac{\\text{EBIT}}{\\text{Revenue}} \\times \\frac{\\text{Revenue}}{\\text{Average assets}} \\times \\frac{\\text{Average assets}}{\\text{Average equity}}",
          note: "Tax burden × interest burden × EBIT margin × asset turnover × leverage."
        }
      ]
    },
    {
      id: "fsa.modelisation",
      titre: "Modélisation des états financiers",
      formules: [
        {
          id: "fsa.revenue-forecast",
          nom: "Revenue forecast (growth)",
          latex: "\\text{Revenue}_{t-1} \\times (1 + g)"
        },
        {
          id: "fsa.market-share-forecast",
          nom: "Revenue from market share",
          latex: "\\text{Market size} \\times \\text{Company market share}"
        },
        {
          id: "fsa.market-share",
          nom: "Market share",
          latex: "\\frac{\\text{Company sales}}{\\text{Industry sales}}"
        },
        {
          id: "fsa.interest-forecast",
          nom: "Interest expense forecast",
          latex: "\\text{Interest rate} \\times \\text{Average debt balance}"
        },
        {
          id: "fsa.capex-net-ppe",
          nom: "Ending net PP&E",
          latex: "\\text{Beginning net PP\\&E} + \\text{Capex} - \\text{Depreciation}"
        },
        {
          id: "fsa.forecast-from-days",
          nom: "Forecast receivables from DSO",
          latex: "\\text{Revenue} \\times \\frac{\\text{DSO}}{365}",
          note: "Même logique : stocks par DOH × COGS / 365, fournisseurs par jours de dettes × COGS / 365."
        }
      ]
    }
  ]
};
