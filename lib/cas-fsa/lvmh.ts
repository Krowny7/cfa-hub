// Cas pratique FSA : LVMH, IFRS, exercice 2025. Chiffres recopiés du document source (voir source.url) ;
// les réponses des étapes sont recalculées par un script de contrôle à partir des lignes des états.
import type { CasFsa } from "./types";

export const CAS_LVMH: CasFsa = {
  "id": "lvmh-2025",
  "societe": "LVMH Moët Hennessy Louis Vuitton",
  "exercice": "Exercice clos le 31 décembre 2025",
  "referentiel": "IFRS",
  "source": {
    "titre": "LVMH — Consolidated financial statements as of December 31, 2025 (traduction anglaise publiée sur lvmh.com)",
    "url": "https://lvmh-com.cdn.prismic.io/lvmh-com/aY242t0YXLCxVuF9_LVMHComptesconsolid%C3%A9s2025-VA--VDEFpubli%C3%A9e.pdf"
  },
  "accroche": "Le luxe sous IFRS : une marge brute de plus de 66 %, mais des stocks de près de dix mois et presque la moitié de la dette faite de loyers. Un cas pour comprendre IFRS 16, le goodwill, et pourquoi un stock qui vieillit n'est pas un stock qui dort.",
  "etats": {
    "resultat": {
      "titre": "CONSOLIDATED INCOME STATEMENT",
      "unite": "millions EUR, sauf résultat par action",
      "lignes": [
        {
          "libelle": "Revenue",
          "n": 80807,
          "n1": 84683
        },
        {
          "libelle": "Cost of sales",
          "n": -27279,
          "n1": -27918
        },
        {
          "libelle": "Gross margin",
          "n": 53528,
          "n1": 56765,
          "total": true
        },
        {
          "libelle": "Marketing and selling expenses",
          "n": -29914,
          "n1": -31002
        },
        {
          "libelle": "General and administrative expenses",
          "n": -5934,
          "n1": -6220
        },
        {
          "libelle": "Income/(Loss) from joint ventures and associates",
          "n": 75,
          "n1": 28
        },
        {
          "libelle": "Profit from recurring operations",
          "n": 17755,
          "n1": 19571,
          "total": true
        },
        {
          "libelle": "Other operating income and expenses",
          "n": -656,
          "n1": -664
        },
        {
          "libelle": "Operating profit",
          "n": 17099,
          "n1": 18907,
          "total": true
        },
        {
          "libelle": "Cost of net financial debt",
          "n": -348,
          "n1": -442
        },
        {
          "libelle": "Interest on lease liabilities",
          "n": -553,
          "n1": -510
        },
        {
          "libelle": "Other financial income and expenses",
          "n": 500,
          "n1": 160
        },
        {
          "libelle": "Net financial income/(expense)",
          "n": -401,
          "n1": -792,
          "total": true
        },
        {
          "libelle": "Income taxes",
          "n": -5476,
          "n1": -5157
        },
        {
          "libelle": "Net profit before minority interests",
          "n": 11222,
          "n1": 12958,
          "total": true
        },
        {
          "libelle": "Minority interests",
          "n": -344,
          "n1": -408
        },
        {
          "libelle": "Net profit, Group share",
          "n": 10878,
          "n1": 12550,
          "total": true
        },
        {
          "libelle": "Basic Group share of net earnings per share (EUR)",
          "n": 21.86,
          "n1": 25.13
        },
        {
          "libelle": "Number of shares on which the calculation is based",
          "n": 497650238,
          "n1": 499412515,
          "niveau": 1
        },
        {
          "libelle": "Diluted Group share of net earnings per share (EUR)",
          "n": 21.85,
          "n1": 25.12
        },
        {
          "libelle": "Number of shares on which the calculation is based",
          "n": 497976118,
          "n1": 499681046,
          "niveau": 1
        }
      ]
    },
    "bilan": {
      "titre": "CONSOLIDATED BALANCE SHEET",
      "unite": "millions EUR",
      "lignes": [
        {
          "libelle": "Assets",
          "n": null,
          "n1": null
        },
        {
          "libelle": "Brands and other intangible assets",
          "n": 23129,
          "n1": 26280,
          "niveau": 1
        },
        {
          "libelle": "Goodwill",
          "n": 18315,
          "n1": 20307,
          "niveau": 1
        },
        {
          "libelle": "Property, plant and equipment",
          "n": 29728,
          "n1": 29886,
          "niveau": 1
        },
        {
          "libelle": "Right-of-use assets",
          "n": 14860,
          "n1": 16620,
          "niveau": 1
        },
        {
          "libelle": "Investments in joint ventures and associates",
          "n": 1214,
          "n1": 1343,
          "niveau": 1
        },
        {
          "libelle": "Non-current available for sale financial assets",
          "n": 1891,
          "n1": 1632,
          "niveau": 1
        },
        {
          "libelle": "Other non-current assets",
          "n": 983,
          "n1": 1106,
          "niveau": 1
        },
        {
          "libelle": "Deferred tax",
          "n": 3738,
          "n1": 4545,
          "niveau": 1
        },
        {
          "libelle": "Non-current assets",
          "n": 93858,
          "n1": 101719,
          "total": true
        },
        {
          "libelle": "Inventories and work in progress",
          "n": 22659,
          "n1": 23669,
          "niveau": 1
        },
        {
          "libelle": "Trade accounts receivable",
          "n": 4332,
          "n1": 4730,
          "niveau": 1
        },
        {
          "libelle": "Income taxes",
          "n": 758,
          "n1": 986,
          "niveau": 1
        },
        {
          "libelle": "Other current assets",
          "n": 8840,
          "n1": 8455,
          "niveau": 1
        },
        {
          "libelle": "Assets held for sale",
          "n": 2796,
          "n1": 0,
          "niveau": 1
        },
        {
          "libelle": "Cash and cash equivalents",
          "n": 8794,
          "n1": 9631,
          "niveau": 1
        },
        {
          "libelle": "Current assets",
          "n": 48179,
          "n1": 47471,
          "total": true
        },
        {
          "libelle": "Total assets",
          "n": 142037,
          "n1": 149190,
          "total": true
        },
        {
          "libelle": "Liabilities and equity",
          "n": null,
          "n1": null
        },
        {
          "libelle": "Equity, Group share",
          "n": 67472,
          "n1": 67517,
          "niveau": 1
        },
        {
          "libelle": "Minority interests",
          "n": 1477,
          "n1": 1770,
          "niveau": 1
        },
        {
          "libelle": "Equity",
          "n": 68949,
          "n1": 69287,
          "total": true
        },
        {
          "libelle": "Long-term borrowings",
          "n": 12418,
          "n1": 12091,
          "niveau": 1
        },
        {
          "libelle": "Non-current lease liabilities",
          "n": 13384,
          "n1": 14860,
          "niveau": 1
        },
        {
          "libelle": "Non-current provisions and other liabilities",
          "n": 3546,
          "n1": 3856,
          "niveau": 1
        },
        {
          "libelle": "Deferred tax",
          "n": 6993,
          "n1": 7344,
          "niveau": 1
        },
        {
          "libelle": "Purchase commitments for minority interests' shares",
          "n": 6331,
          "n1": 8056,
          "niveau": 1
        },
        {
          "libelle": "Non-current liabilities",
          "n": 42672,
          "n1": 46207,
          "total": true
        },
        {
          "libelle": "Short-term borrowings",
          "n": 7925,
          "n1": 10851,
          "niveau": 1
        },
        {
          "libelle": "Current lease liabilities",
          "n": 2634,
          "n1": 2972,
          "niveau": 1
        },
        {
          "libelle": "Trade accounts payable",
          "n": 8223,
          "n1": 8630,
          "niveau": 1
        },
        {
          "libelle": "Income taxes",
          "n": 828,
          "n1": 1231,
          "niveau": 1
        },
        {
          "libelle": "Current provisions and other liabilities",
          "n": 9190,
          "n1": 10012,
          "niveau": 1
        },
        {
          "libelle": "Liabilities held for sale",
          "n": 1616,
          "n1": 0,
          "niveau": 1
        },
        {
          "libelle": "Current liabilities",
          "n": 30416,
          "n1": 33696,
          "total": true
        },
        {
          "libelle": "Total liabilities and equity",
          "n": 142037,
          "n1": 149190,
          "total": true
        }
      ]
    },
    "flux": {
      "titre": "CONSOLIDATED CASH FLOW STATEMENT",
      "unite": "millions EUR",
      "lignes": [
        {
          "libelle": "I. OPERATING ACTIVITIES",
          "n": null,
          "n1": null
        },
        {
          "libelle": "Operating profit",
          "n": 17099,
          "n1": 18907,
          "niveau": 1
        },
        {
          "libelle": "(Income)/Loss and dividends received from joint ventures and associates",
          "n": 13,
          "n1": 29,
          "niveau": 1
        },
        {
          "libelle": "Net increase in depreciation, amortization and provisions",
          "n": 4858,
          "n1": 4568,
          "niveau": 1
        },
        {
          "libelle": "Depreciation of right-of-use assets",
          "n": 3143,
          "n1": 3228,
          "niveau": 1
        },
        {
          "libelle": "Other adjustments and computed expenses",
          "n": -172,
          "n1": 488,
          "niveau": 1
        },
        {
          "libelle": "Cash from operations before changes in working capital",
          "n": 24941,
          "n1": 27220,
          "total": true
        },
        {
          "libelle": "Cost of net financial debt: interest paid",
          "n": -290,
          "n1": -357,
          "niveau": 1
        },
        {
          "libelle": "Lease liabilities: interest paid",
          "n": -545,
          "n1": -483,
          "niveau": 1
        },
        {
          "libelle": "Tax paid",
          "n": -4656,
          "n1": -5531,
          "niveau": 1
        },
        {
          "libelle": "Change in working capital",
          "n": -576,
          "n1": -1925,
          "niveau": 1
        },
        {
          "libelle": "Net cash from/(used in) operating activities",
          "n": 18874,
          "n1": 18924,
          "total": true
        },
        {
          "libelle": "II. INVESTING ACTIVITIES",
          "n": null,
          "n1": null
        },
        {
          "libelle": "Operating investments",
          "n": -4567,
          "n1": -5531,
          "niveau": 1
        },
        {
          "libelle": "Purchase and proceeds from sale of consolidated investments",
          "n": 149,
          "n1": -438,
          "niveau": 1
        },
        {
          "libelle": "Dividends received",
          "n": 21,
          "n1": 9,
          "niveau": 1
        },
        {
          "libelle": "Tax paid related to non-current available for sale financial assets and consolidated investments",
          "n": 0,
          "n1": 0,
          "niveau": 1
        },
        {
          "libelle": "Purchase and proceeds from sale of non-current available for sale financial assets",
          "n": -243,
          "n1": -579,
          "niveau": 1
        },
        {
          "libelle": "Net cash from/(used in) investing activities",
          "n": -4640,
          "n1": -6539,
          "total": true
        },
        {
          "libelle": "III. FINANCING ACTIVITIES",
          "n": null,
          "n1": null
        },
        {
          "libelle": "Interim and final dividends paid",
          "n": -7123,
          "n1": -7322,
          "niveau": 1
        },
        {
          "libelle": "Purchase and proceeds from sale of minority interests",
          "n": -1091,
          "n1": -173,
          "niveau": 1
        },
        {
          "libelle": "Other equity-related transactions",
          "n": -1634,
          "n1": -224,
          "niveau": 1
        },
        {
          "libelle": "Proceeds from borrowings",
          "n": 2095,
          "n1": 3595,
          "niveau": 1
        },
        {
          "libelle": "Repayment of borrowings",
          "n": -4228,
          "n1": -3676,
          "niveau": 1
        },
        {
          "libelle": "Repayment of lease liabilities",
          "n": -2974,
          "n1": -2915,
          "niveau": 1
        },
        {
          "libelle": "Purchase and proceeds from sale of current available for sale financial assets",
          "n": 59,
          "n1": -1,
          "niveau": 1
        },
        {
          "libelle": "Net cash from/(used in) financing activities",
          "n": -14896,
          "n1": -10716,
          "total": true
        },
        {
          "libelle": "IV. EFFECT OF EXCHANGE RATE CHANGES",
          "n": -248,
          "n1": 80
        },
        {
          "libelle": "NET INCREASE/(DECREASE) IN CASH AND CASH EQUIVALENTS (I+II+III+IV)",
          "n": -910,
          "n1": 1749,
          "total": true
        },
        {
          "libelle": "CASH AND CASH EQUIVALENTS AT BEGINNING OF PERIOD",
          "n": 9269,
          "n1": 7520
        },
        {
          "libelle": "CASH AND CASH EQUIVALENTS AT END OF PERIOD",
          "n": 8359,
          "n1": 9269,
          "total": true
        },
        {
          "libelle": "TOTAL TAX PAID",
          "n": -4901,
          "n1": -5790
        }
      ]
    }
  },
  "extraits": [
    {
      "id": "lvmh-inv-aging",
      "titre": "Vins et spiritueux : stocks classés en actif courant",
      "texte": "the holding period for these inventories generally exceeds one year. However, in accordance with industry practices, these inventories are classified as current assets.",
      "ou": "Note 1.18 — Inventories and work in progress, p. 13"
    },
    {
      "id": "lvmh-lease-capitalized",
      "titre": "IFRS 16 : seuls les loyers fixes sont capitalisés",
      "texte": "As required by IFRS 16, only the minimum fixed lease payments are capitalized. \"Other lease expenses\" mainly relate to variable lease payments.",
      "ou": "Note 7.3 — Breakdown of lease expense, p. 26"
    },
    {
      "id": "lvmh-impairment",
      "titre": "Test de dépréciation des marques et du goodwill",
      "texte": "No significant impairment expenses were recognized in respect of these items during the course of fiscal year 2025.",
      "ou": "Note 5 — Impairment testing of intangible assets with indefinite useful lives, p. 20"
    },
    {
      "id": "lvmh-dfs",
      "titre": "DFS : actifs destinés à être cédés",
      "texte": "In January 2026, LVMH finalized the sale of a significant portion of DFS' businesses as part of its plan to divest from DFS.",
      "ou": "Note 2.1 — Fiscal year 2025, p. 16"
    },
    {
      "id": "lvmh-receivables",
      "titre": "Clients : des grossistes peu nombreux",
      "texte": "The trade accounts receivable balance is comprised essentially of receivables from wholesalers or agents, who are limited in number and with whom the Group maintains long-term relationships.",
      "ou": "Note 12 — Trade accounts receivable, p. 31"
    }
  ],
  "etapes": [
    {
      "id": "lvmh-q01-marge-brute",
      "notion": "Gross margin",
      "enonce": "Compute LVMH's gross margin for fiscal 2025 (Gross margin divided by Revenue). Give the answer in %, to one decimal.",
      "reponse": 66.2,
      "tolerance": 0.1,
      "unite": "%",
      "guide": "Prends la ligne Gross margin et la ligne Revenue du compte de résultat 2025. Pas besoin de retraiter : le document présente déjà la marge brute en sous-total.",
      "corrige": "Gross margin / Revenue = 53 528 / 80 807 = 66,2 %. En 2024 : 56 765 / 84 683 = 67,0 %.",
      "lecture": "Deux euros de ventes sur trois restent après le coût des produits : c'est la signature du luxe, où la marque permet de fixer le prix bien au-dessus du coût de fabrication. La marge recule pourtant de 0,8 point : moins de volume absorbé, et un mix qui pèse."
    },
    {
      "id": "lvmh-q02-marge-recurrente",
      "notion": "Operating margin",
      "enonce": "Compute the margin of Profit from recurring operations for fiscal 2025 (as % of Revenue), to one decimal.",
      "reponse": 22,
      "tolerance": 0.1,
      "unite": "%",
      "guide": "LVMH met en avant Profit from recurring operations, avant la ligne Other operating income and expenses (dépréciations, restructurations, éléments non récurrents). Divise-le par Revenue.",
      "corrige": "17 755 / 80 807 = 22,0 % (2024 : 19 571 / 84 683 = 23,1 %). L'Operating profit après éléments non récurrents donne 21,2 %.",
      "lecture": "Même après avoir payé 29 914 M EUR de frais commerciaux (boutiques, marketing), il reste 22,0 % de marge. La marge perd 1,1 point alors que le chiffre d'affaires recule de 3 876 M EUR : les frais de marketing et de vente baissent moins vite que les ventes (31 002 puis 29 914), c'est l'effet de levier opérationnel."
    },
    {
      "id": "lvmh-q03-taux-impot",
      "notion": "Effective tax rate",
      "enonce": "Compute LVMH's effective tax rate for 2025: Income taxes divided by profit before tax (Net profit before minority interests plus Income taxes). Give the answer in %, to one decimal.",
      "reponse": 32.8,
      "tolerance": 0.1,
      "unite": "%",
      "guide": "Le résultat avant impôt n'est pas une ligne du document : reconstitue-le en additionnant Net profit before minority interests et le montant des Income taxes (en valeur positive).",
      "corrige": "Résultat avant impôt = 11 222 + 5 476 = 16 698. Taux = 5 476 / 16 698 = 32,8 %.",
      "lecture": "Un taux de 32,8 % est élevé : l'impôt pèse un tiers du résultat avant impôt. Le document ne détaille pas ici l'écart avec le taux statutaire : il se lit dans la Note 28. Chaque point de taux pèse environ 167 M EUR de résultat net."
    },
    {
      "id": "lvmh-q04-jours-stocks",
      "notion": "Days of inventory on hand",
      "enonce": "Compute LVMH's days of inventory on hand (DOH) for 2025 using average Inventories and work in progress (2025 and 2024 balance sheets), Cost of sales and a 365-day year. Give the answer in days, to one decimal.",
      "reponse": 309.9,
      "tolerance": 1,
      "unite": "jours",
      "guide": "Stock moyen = moyenne des lignes Inventories and work in progress de fin 2025 et fin 2024. Divise par Cost of sales (en valeur positive) et multiplie par 365.",
      "corrige": "Stock moyen = (22 659 + 23 669) / 2 = 23 164,0. DOH = 23 164,0 / 27 279 x 365 = 309,9 jours (rotation de 1,18x).",
      "lecture": "Près de dix mois de stock : un niveau énorme pour un distributeur, mais normal ici. Le stock contient des vins et eaux-de-vie qui vieillissent plusieurs années avant la vente, et les maisons de mode gardent du stock pour garantir la disponibilité d'un produit rare. Voir l'extrait sur la Note 1.18."
    },
    {
      "id": "lvmh-q05-stocks-hors-vieillissement",
      "notion": "Inventory quality",
      "enonce": "Note 11 shows that \"Wines and eaux-de-vie in the process of aging\" account for EUR 7 515 million of net inventories at end-2025 (EUR 7 035 million at end-2024). Excluding them from average inventories, and keeping total Cost of sales, recompute the days of inventory on hand for 2025, in days to one decimal.",
      "reponse": 212.6,
      "tolerance": 1,
      "unite": "jours",
      "guide": "Retire les stocks en vieillissement de chaque bilan (fin 2025 et fin 2024) avant de faire la moyenne. Garde Cost of sales total, par simplification : la note ne donne pas le coût des ventes par catégorie.",
      "corrige": "Stocks hors vieillissement : 22 659 - 7 515 = 15 144 (2025) ; 23 669 - 7 035 = 16 634 (2024). Moyenne = 15 889,0. DOH = 15 889,0 / 27 279 x 365 = 212,6 jours.",
      "lecture": "Le vieillissement explique environ 97 jours sur 310. Reste un stock de produits finis très long pour de la mode et de la maroquinerie : 7,1 mois. La note 11 montre 2 214 M EUR de dépréciations sur les produits finis : le risque d'obsolescence est surtout là, pas dans les caves."
    },
    {
      "id": "lvmh-q06-cycle-cash",
      "notion": "Cash conversion cycle",
      "enonce": "Compute LVMH's cash conversion cycle for 2025 (days of inventory on hand + days of sales outstanding - days of payables outstanding). Use average balances, Revenue for receivables, Cost of sales for inventory and payables, and 365 days. Give the answer in days, to one decimal.",
      "reponse": 217.7,
      "tolerance": 1,
      "unite": "jours",
      "guide": "Trois durées : stocks (déjà calculés, sur Cost of sales), créances (Trade accounts receivable moyen / Revenue x 365) et dettes fournisseurs (Trade accounts payable moyen / Cost of sales x 365). Additionne les deux premières, retire la troisième.",
      "corrige": "DOH = 309,9. DSO = 4 531,0 / 80 807 x 365 = 20,5. DPO = 8 426,5 / 27 279 x 365 = 112,7. Cycle = 309,9 + 20,5 - 112,7 = 217,7 jours.",
      "lecture": "Les clients paient en 20 jours : LVMH vend surtout en boutique, au comptant, et les créances restantes viennent de grossistes peu nombreux (extrait Note 12). Les fournisseurs, eux, sont payés en 113 jours. Mais ce crédit fournisseur ne couvre même pas la moitié des jours de stock : 218 jours de besoin en fonds de roulement à financer, c'est le prix d'un luxe qui garde son stock."
    },
    {
      "id": "lvmh-q07-liquidite",
      "notion": "Current ratio",
      "enonce": "Compute LVMH's current ratio at the end of 2025 (Current assets divided by Current liabilities), to two decimals.",
      "reponse": 1.58,
      "tolerance": 0.02,
      "unite": "x",
      "guide": "Prends les deux sous-totaux Current assets et Current liabilities du bilan 2025. Pense ensuite à regarder ce qui compose les actifs courants.",
      "corrige": "48 179 / 30 416 = 1,58x. Les stocks pèsent 47 % des actifs courants.",
      "lecture": "Un ratio de 1,58 paraît confortable, mais il est porté par les stocks (22 659 M EUR, dont 7 515 qui vieillissent plus d'un an et restent classés en actif courant par usage de la profession : voir l'extrait). Sans les stocks, trésorerie plus clients couvrent 43 % des dettes courantes : la liquidité vient de la capacité d'emprunt et du cash généré, pas du bilan."
    },
    {
      "id": "lvmh-q08-ifrs16-dette",
      "notion": "Leverage and IFRS 16",
      "enonce": "At the end of 2025, what percentage of LVMH's total debt does the lease liability represent? Total debt = Long-term borrowings + Short-term borrowings + Non-current lease liabilities + Current lease liabilities. Give the answer in %, to one decimal.",
      "reponse": 44.1,
      "tolerance": 0.1,
      "unite": "%",
      "guide": "Additionne les deux lignes de borrowings, puis les deux lignes de lease liabilities. La part des loyers = lease liabilities / total des quatre lignes.",
      "corrige": "Emprunts = 12 418 + 7 925 = 20 343. Lease liabilities = 13 384 + 2 634 = 16 018. Total = 36 361. Part des loyers = 16 018 / 36 361 = 44,1 %.",
      "lecture": "Sous IFRS 16, presque la moitié de la dette est faite de loyers de boutiques. Un analyste qui compare LVMH à une société US GAAP doit savoir que 16 018 M EUR de cette dette n'apparaîtraient pas comme de la dette sans IFRS 16. L'actif Right-of-use (14 860 M EUR) est la contrepartie. La Note 7.3 précise que seuls les loyers fixes sont capitalisés : les loyers variables restent en charges."
    },
    {
      "id": "lvmh-q09-couverture-interets",
      "notion": "Interest coverage",
      "enonce": "Compute LVMH's interest coverage for 2025: Operating profit divided by total interest expense (Cost of net financial debt plus Interest on lease liabilities, both taken as positive amounts). Give the answer in x, to one decimal.",
      "reponse": 19,
      "tolerance": 0.2,
      "unite": "x",
      "guide": "Au numérateur, Operating profit. Au dénominateur, additionne la charge de la dette nette et les intérêts sur loyers : IFRS 16 sépare ces deux lignes dans le résultat financier.",
      "corrige": "Charges d'intérêt = 348 + 553 = 901. Couverture = 17 099 / 901 = 19,0x.",
      "lecture": "Le résultat opérationnel couvre 19 fois les intérêts : la dette financière n'est pas un sujet. Remarque que les intérêts sur loyers (553) dépassent ceux de la dette financière (348) : les loyers sont devenus la charge d'intérêt principale."
    },
    {
      "id": "lvmh-q10-roe",
      "notion": "ROE",
      "enonce": "Compute LVMH's return on equity for 2025: Net profit, Group share divided by average Equity, Group share (2025 and 2024 balance sheets). Give the answer in %, to one decimal.",
      "reponse": 16.1,
      "tolerance": 0.1,
      "unite": "%",
      "guide": "Numérateur : Net profit, Group share (pas le résultat avant minoritaires, car les capitaux propres retenus sont ceux du groupe). Dénominateur : moyenne de Equity, Group share fin 2025 et fin 2024.",
      "corrige": "Capitaux propres moyens = (67 472 + 67 517) / 2 = 67 494,5. ROE = 10 878 / 67 494,5 = 16,1 %. Décomposition DuPont : marge nette 13,5 % x rotation de l'actif 0,55x x levier 2,16.",
      "lecture": "Un ROE de 16 % est solide, mais pas exceptionnel pour une marque de luxe. DuPont montre pourquoi : la marge est très forte, mais l'actif tourne lentement (0,55x) car il est gonflé par les marques et le goodwill de 41 444 M EUR issus d'acquisitions, et le levier reste modeste."
    },
    {
      "id": "lvmh-q11-qualite-resultat",
      "notion": "CFO / net income",
      "enonce": "Compute the ratio of Net cash from operating activities to Net profit before minority interests for 2025, to two decimals.",
      "reponse": 1.68,
      "tolerance": 0.02,
      "unite": "x",
      "guide": "Lis la ligne Net cash from/(used in) operating activities dans le tableau de flux et divise-la par Net profit before minority interests du compte de résultat.",
      "corrige": "18 874 / 11 222 = 1,68x. L'écart vient surtout des dotations aux amortissements et provisions (4 858) et de l'amortissement des droits d'utilisation (3 143), partiellement compensés par la variation du besoin en fonds de roulement (-576).",
      "lecture": "Le cash opérationnel vaut 1,7 fois le résultat net : la qualité du résultat est bonne. Mais ce chiffre est gonflé par IFRS 16 : l'amortissement des droits d'utilisation (3 143) est ajouté au cash opérationnel, alors que le paiement du loyer (2 974) sort en financement. Il faut le retrancher pour juger le cash réel : question suivante."
    },
    {
      "id": "lvmh-q12-fcf-ifrs16",
      "notion": "Free cash flow",
      "enonce": "Compute LVMH's free cash flow for 2025 as Net cash from operating activities minus Operating investments minus Repayment of lease liabilities (the repayment of lease principal is treated like a capital expenditure). Give the answer in EUR millions.",
      "reponse": 11333,
      "tolerance": 1,
      "unite": "millions EUR",
      "guide": "Trois lignes : Net cash from operating activities (flux I), Operating investments (flux II) et Repayment of lease liabilities (flux III). Retire les deux dernières de la première, en valeurs positives.",
      "corrige": "18 874 - 4 567 - 2 974 = 11 333 M EUR. C'est exactement l'Operating free cash flow que LVMH publie sous le tableau de flux.",
      "lecture": "Après investissements et loyers, il reste 11 333 M EUR, soit 104 % du résultat net groupe : le résultat se transforme bien en cash. À comparer aux 7 123 M EUR de dividendes versés : le free cash flow ne les couvre pas entièrement, l'écart est financé par la baisse de trésorerie (-910 M EUR sur l'année)."
    },
    {
      "id": "lvmh-q13-goodwill",
      "notion": "Goodwill and intangibles",
      "enonce": "Compute the share of Goodwill plus Brands and other intangible assets in LVMH's Total assets at the end of 2025. Give the answer in %, to one decimal.",
      "reponse": 29.2,
      "tolerance": 0.1,
      "unite": "%",
      "guide": "Additionne les lignes Goodwill et Brands and other intangible assets du bilan 2025 et divise par Total assets. Réfléchis ensuite à ce que représente ce poids pour les capitaux propres.",
      "corrige": "(18 315 + 23 129) / 142 037 = 41 444 / 142 037 = 29,2 %. Ce montant représente 60 % de Equity.",
      "lecture": "Près d'un tiers de l'actif est de l'immatériel acquis. Le goodwill a baissé de 1 992 M EUR en 2025 : surtout du change (dollar) et la fin d'engagements de rachat de minoritaires, avec 135 M EUR de dépréciation (Note 4). La Note 5 ne signale pas de dépréciation significative : le test repose sur des plans pluriannuels, donc sur les hypothèses de la direction. Si la demande de luxe se dégrade durablement, c'est ce poste qui encaisse le choc."
    },
    {
      "id": "lvmh-q14-redige-dfs",
      "notion": "Classification and comparability",
      "enonce": "LVMH reclassified DFS's assets and liabilities as held for sale at end-2025. Explain how this affects the comparison of the 2025 balance sheet with 2024, and name two ratios that become harder to interpret.",
      "reponse": null,
      "reponseTexte": "Les actifs et passifs de DFS (2 796 M EUR d'actifs, 1 616 M EUR de passifs) sont regroupés sur deux lignes séparées en 2025, alors qu'ils figuraient ligne par ligne en 2024 : les stocks, goodwill, droits d'utilisation et loyers de 2025 sont donc plus faibles sans que l'activité ait été réduite d'autant. Les ratios de rotation (stocks, créances) et de levier (dette de loyers sur dette totale) deviennent moins comparables ; le chiffre d'affaires de DFS reste inclus dans le résultat 2025 (1 494 M EUR).",
      "guide": "Regarde deux lignes du bilan 2025 absentes de 2024 (valeur nulle) : Assets held for sale et Liabilities held for sale. Lis l'extrait de la Note 2.1, puis pense aux ratios où le numérateur et le dénominateur ne viennent pas du même exercice.",
      "corrige": "Assets held for sale = 2 796 M EUR et Liabilities held for sale = 1 616 M EUR, contre 0 en 2024. Le bilan de fin 2025 exclut donc DFS de chaque ligne (stocks, goodwill, droits d'utilisation, loyers), alors que le compte de résultat 2025 inclut encore ses 1 494 M EUR de revenue. Exemples de ratios faussés : la rotation des stocks (stock moyen mélangeant 2024 avec DFS et 2025 sans, face à un coût des ventes avec DFS) et la part des loyers dans la dette.",
      "lecture": "C'est un piège classique de comparaison entre exercices : un changement de périmètre déforme les ratios sans que rien ne change dans l'économie du groupe. Le bon réflexe d'analyste : lire les notes (ici Note 2.1) pour isoler l'effet, au lieu de conclure sur le seul chiffre."
    }
  ]
};
