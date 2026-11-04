import type { MatiereFormules } from "@/lib/formules/types";

export const FIXED_INCOME: MatiereFormules = {
  matiere: "fixed_income",
  copies: [
    {
      id: "fixed_income.prix",
      titre: "Prix d'une obligation et coupon couru",
      formules: [
        {
          id: "fixed_income.bond-price",
          nom: "Bond price (fixed-rate)",
          latex: "\\sum_{t=1}^{N}\\frac{PMT}{(1+r)^{t}}+\\frac{FV}{(1+r)^{N}}",
          note: "r = rendement par période (YTM / m), N = nombre de périodes.",
        },
        {
          id: "fixed_income.zero-coupon-price",
          nom: "Zero-coupon bond price",
          latex: "\\frac{FV}{(1+r)^{N}}",
        },
        {
          id: "fixed_income.accrued-interest",
          nom: "Accrued interest",
          latex: "\\frac{t}{T}\\times PMT",
          note: "t = jours depuis le dernier coupon, T = jours dans la période de coupon.",
        },
        {
          id: "fixed_income.full-price",
          nom: "Full (dirty) price",
          latex: "\\text{Flat price}+\\text{Accrued interest}",
          note: "On calcule d'abord le full price (VA des flux), puis on en déduit le flat price.",
        },
        {
          id: "fixed_income.flat-price",
          nom: "Flat (clean) price",
          latex: "\\text{Full price}-\\text{Accrued interest}",
        },
        {
          id: "fixed_income.price-yield-relation",
          nom: "Price-yield relationship",
          texte: "Coupon rate > YTM: premium. Coupon rate = YTM: par. Coupon rate < YTM: discount. Price and yield move inversely (convex relationship).",
        },
        {
          id: "fixed_income.constant-yield-price",
          nom: "Constant-yield price trajectory",
          texte: "Premium and discount bonds are pulled to par as maturity approaches (pull to par), if the yield stays constant.",
        },
        {
          id: "fixed_income.matrix-pricing",
          nom: "Matrix pricing",
          texte: "Estimate the required yield of an illiquid bond by interpolating the yields of traded bonds with very close credit quality, similar maturity and coupon.",
        },
      ],
    },
    {
      id: "fixed_income.rendements",
      titre: "Mesures de rendement",
      formules: [
        {
          id: "fixed_income.current-yield",
          nom: "Current yield",
          latex: "\\frac{\\text{Annual coupon}}{\\text{Flat price}}",
          note: "Ignore le gain ou la perte en capital.",
        },
        {
          id: "fixed_income.simple-yield",
          nom: "Simple yield",
          latex: "\\frac{\\text{Annual coupon}+\\frac{\\text{Par}-\\text{Flat price}}{\\text{Years to maturity}}}{\\text{Flat price}}",
          note: "Amortit linéairement la décote (ou la prime, qui se soustrait).",
        },
        {
          id: "fixed_income.effective-annual-yield",
          nom: "Effective annual yield",
          latex: "\\left(1+\\frac{\\text{YTM}}{n}\\right)^{n}-1",
          note: "n = périodicité (nombre de coupons par an).",
        },
        {
          id: "fixed_income.periodicity-conversion",
          nom: "Yield periodicity conversion",
          latex: "\\left(1+\\frac{\\text{YTM}_{m}}{m}\\right)^{m}=\\left(1+\\frac{\\text{YTM}_{n}}{n}\\right)^{n}",
          note: "Rendement coté pour m périodes par an converti pour n périodes par an.",
        },
        {
          id: "fixed_income.bond-equivalent-yield",
          nom: "Yield on a semiannual bond basis",
          latex: "2\\times\\text{Effective semiannual yield}",
        },
        {
          id: "fixed_income.ytm",
          nom: "Yield to maturity",
          texte: "The single discount rate that equates the PV of the promised cash flows to the bond's price. It assumes the bond is held to maturity, no default, and coupons reinvested at the YTM.",
        },
        {
          id: "fixed_income.yield-to-worst",
          nom: "Yield to worst",
          texte: "The lowest of the yield to maturity and the yields to each possible call date, for a callable bond.",
        },
        {
          id: "fixed_income.horizon-yield",
          nom: "Horizon yield",
          latex: "\\left(\\frac{\\text{Sale price}+\\text{Coupons}+\\text{Reinvestment income}}{\\text{Purchase price}}\\right)^{1/H}-1",
          note: "H = horizon en années. Retient aussi les coupons réinvestis.",
        },
      ],
    },
    {
      id: "fixed_income.monetaire",
      titre: "Marché monétaire : escompte et add-on",
      formules: [
        {
          id: "fixed_income.hpy",
          nom: "Holding period yield (money market)",
          latex: "\\frac{FV-PV}{PV}",
          note: "Rendement non annualisé sur la durée du titre.",
        },
        {
          id: "fixed_income.discount-price",
          nom: "Price (discount basis)",
          latex: "FV\\times\\left(1-\\frac{\\text{Days}}{360}\\times DR\\right)",
          note: "T-bills et commercial paper : base 360 jours.",
        },
        {
          id: "fixed_income.discount-rate",
          nom: "Discount rate (DR)",
          latex: "\\frac{FV-PV}{FV}\\times\\frac{360}{\\text{Days}}",
          note: "Base le nominal, pas le prix payé.",
        },
        {
          id: "fixed_income.addon-price",
          nom: "Price (add-on basis)",
          latex: "\\frac{FV}{1+\\frac{\\text{Days}}{\\text{Year}}\\times AOR}",
          note: "Year = 360 ou 365 selon la convention.",
        },
        {
          id: "fixed_income.addon-rate",
          nom: "Add-on rate (AOR)",
          latex: "\\frac{FV-PV}{PV}\\times\\frac{\\text{Year}}{\\text{Days}}",
          note: "Base le prix payé : AOR > DR pour le même titre.",
        },
        {
          id: "fixed_income.money-market-bey",
          nom: "Bond equivalent yield (money market)",
          latex: "\\frac{FV-PV}{PV}\\times\\frac{365}{\\text{Days}}",
          note: "Un rendement add-on annualisé sur 365 jours.",
        },
      ],
    },
    {
      id: "fixed_income.spreads",
      titre: "Écarts de rendement (spreads)",
      formules: [
        {
          id: "fixed_income.yield-spread",
          nom: "Yield spread over benchmark",
          latex: "\\text{Bond yield}-\\text{Benchmark yield}",
        },
        {
          id: "fixed_income.g-spread",
          nom: "G-spread",
          latex: "\\text{Bond yield}-\\text{Government bond yield (same maturity)}",
          note: "Rendement gouvernemental interpolé à la même maturité.",
        },
        {
          id: "fixed_income.i-spread",
          nom: "I-spread",
          latex: "\\text{Bond yield}-\\text{Swap rate (same maturity)}",
        },
        {
          id: "fixed_income.z-spread",
          nom: "Z-spread",
          latex: "P=\\sum_{t=1}^{N}\\frac{CF_t}{(1+z_t+Z)^{t}}",
          note: "Écart constant ajouté à chaque taux spot de la courbe pour retrouver le prix.",
        },
        {
          id: "fixed_income.oas",
          nom: "Option-adjusted spread (OAS)",
          latex: "Z\\text{-spread}-\\text{Option value (in spread terms)}",
          note: "Callable : OAS < Z-spread. Putable : OAS > Z-spread.",
        },
        {
          id: "fixed_income.callable-price",
          nom: "Callable bond value",
          latex: "\\text{Straight bond value}-\\text{Call option value}",
        },
        {
          id: "fixed_income.putable-price",
          nom: "Putable bond value",
          latex: "\\text{Straight bond value}+\\text{Put option value}",
        },
      ],
    },
    {
      id: "fixed_income.taux-variable",
      titre: "Obligations à taux variable et flux particuliers",
      formules: [
        {
          id: "fixed_income.frn-coupon",
          nom: "Floating-rate note coupon",
          latex: "\\text{Reference rate (MRR)}+\\text{Quoted margin}",
        },
        {
          id: "fixed_income.frn-price",
          nom: "FRN price (discount margin)",
          latex: "\\sum_{t=1}^{N}\\frac{\\frac{\\text{Index}+QM}{m}\\times FV}{\\left(1+\\frac{\\text{Index}+DM}{m}\\right)^{t}}+\\frac{FV}{\\left(1+\\frac{\\text{Index}+DM}{m}\\right)^{N}}",
          note: "DM = marge exigée ; QM = marge cotée. DM > QM : le titre cote sous le pair.",
        },
        {
          id: "fixed_income.inverse-floater",
          nom: "Inverse floater",
          texte: "A floating-rate tranche whose coupon rises when the reference rate falls, and falls when it rises.",
        },
        {
          id: "fixed_income.index-linked-principal",
          nom: "Capital-indexed bond principal",
          latex: "\\text{Par}\\times(1+\\text{Inflation rate})",
          note: "Le coupon = taux de coupon × principal ajusté. Coupon constant, principal indexé (ex. TIPS).",
        },
        {
          id: "fixed_income.level-payment",
          nom: "Fully amortizing level payment",
          latex: "PV\\times\\frac{r}{1-(1+r)^{-N}}",
          note: "Paiements égaux sur toute la vie ; sans amortissement total, il reste un balloon payment.",
        },
      ],
    },
    {
      id: "fixed_income.repo",
      titre: "Pension livrée (repo)",
      formules: [
        {
          id: "fixed_income.repo-interest",
          nom: "Repo interest",
          latex: "\\text{Loan amount}\\times\\text{Repo rate}\\times\\frac{\\text{Days}}{360}",
        },
        {
          id: "fixed_income.repurchase-price",
          nom: "Repurchase price",
          latex: "\\text{Purchase price (loan)}\\times\\left(1+\\text{Repo rate}\\times\\frac{\\text{Days}}{360}\\right)",
        },
        {
          id: "fixed_income.initial-margin-loan",
          nom: "Repo loan amount (initial margin)",
          latex: "\\frac{\\text{Collateral market value}}{\\text{Initial margin}}",
          note: "Initial margin de 103 % : prêt = valeur du collatéral / 1,03.",
        },
        {
          id: "fixed_income.haircut-loan",
          nom: "Repo loan amount with haircut",
          latex: "\\text{Collateral market value}\\times(1-\\text{Haircut})",
          note: "Haircut = (valeur du collatéral − prêt) / valeur du collatéral.",
        },
        {
          id: "fixed_income.variation-margin",
          nom: "Variation margin",
          texte: "Extra collateral the lender requests when the market value of the collateral falls below the loan value times the initial margin.",
        },
      ],
    },
    {
      id: "fixed_income.structure-par-terme",
      titre: "Courbes spot, par et forward",
      formules: [
        {
          id: "fixed_income.discount-factor",
          nom: "Discount factor (from spot rate)",
          latex: "\\frac{1}{(1+z_t)^{t}}",
        },
        {
          id: "fixed_income.price-spot",
          nom: "Bond price using spot rates",
          latex: "\\sum_{t=1}^{N}\\frac{CF_t}{(1+z_t)^{t}}",
          note: "Prix sans arbitrage.",
        },
        {
          id: "fixed_income.forward-rate",
          nom: "Forward rate relationship",
          latex: "(1+z_{A+B})^{A+B}=(1+z_A)^{A}\\,(1+IFR_{A,B})^{B}",
          note: "IFR(A,B) = taux forward B périodes, commençant dans A périodes.",
        },
        {
          id: "fixed_income.forward-price",
          nom: "Forward price of a zero-coupon bond",
          latex: "\\frac{1}{(1+IFR_{A,B})^{B}}=\\frac{(1+z_A)^{A}}{(1+z_{A+B})^{A+B}}",
        },
        {
          id: "fixed_income.spot-from-forwards",
          nom: "Spot rate from forward rates",
          latex: "\\left[(1+z_1)(1+f_{1,1})\\cdots(1+f_{N-1,1})\\right]^{1/N}-1",
          note: "Le taux spot est une moyenne géométrique des taux forward à 1 période.",
        },
        {
          id: "fixed_income.par-rate",
          nom: "Par rate",
          latex: "\\frac{1-DF_N}{\\sum_{t=1}^{N}DF_t}",
          note: "Coupon pour lequel le prix est égal au pair.",
        },
      ],
    },
    {
      id: "fixed_income.duree",
      titre: "Duration",
      formules: [
        {
          id: "fixed_income.macaulay-duration",
          nom: "Macaulay duration",
          latex: "\\frac{\\sum_{t=1}^{N} t\\times PV(CF_t)}{\\text{Bond price}}",
          note: "En années : diviser par m si t est en périodes. Zéro-coupon : durée = maturité.",
        },
        {
          id: "fixed_income.perpetuity-duration",
          nom: "Macaulay duration of a perpetuity",
          latex: "\\frac{1+YTM}{YTM}",
        },
        {
          id: "fixed_income.modified-duration",
          nom: "Modified duration",
          latex: "\\frac{\\text{Macaulay duration}}{1+\\frac{YTM}{m}}",
        },
        {
          id: "fixed_income.approx-modified-duration",
          nom: "Approximate modified duration",
          latex: "\\frac{PV_{-}-PV_{+}}{2\\times PV_0\\times\\Delta YTM}",
          note: "PV- : prix si le rendement baisse de ΔYTM ; PV+ : prix s'il monte.",
        },
        {
          id: "fixed_income.effective-duration",
          nom: "Effective duration",
          latex: "\\frac{PV_{-}-PV_{+}}{2\\times PV_0\\times\\Delta\\text{Curve}}",
          note: "Pour les titres à option : choc sur la courbe de référence, pas sur le YTM.",
        },
        {
          id: "fixed_income.price-change-duration",
          nom: "Price change from duration",
          latex: "\\%\\Delta PV\\approx -ModDur\\times\\Delta YTM",
        },
        {
          id: "fixed_income.money-duration",
          nom: "Money duration",
          latex: "ModDur\\times\\text{Full price of the position}",
          note: "Variation de valeur ≈ − money duration × ΔYTM.",
        },
        {
          id: "fixed_income.pvbp",
          nom: "Price value of a basis point (PVBP)",
          latex: "\\frac{PV_{-}-PV_{+}}{2}",
          note: "PV- et PV+ : valeurs pour un rendement −1 pb et +1 pb ; aussi money duration × 0,0001.",
        },
        {
          id: "fixed_income.duration-gap",
          nom: "Duration gap",
          latex: "\\text{Macaulay duration}-\\text{Investment horizon}",
          note: "Gap > 0 : risque de prix si les taux montent ; gap < 0 : risque de réinvestissement si les taux baissent.",
        },
        {
          id: "fixed_income.portfolio-duration",
          nom: "Portfolio duration",
          latex: "\\sum_{i} w_i\\times D_i",
          note: "w_i = poids en valeur de marché. Valable pour un choc parallèle seulement.",
        },
        {
          id: "fixed_income.key-rate-duration",
          nom: "Key rate duration",
          texte: "The sensitivity of a bond's or portfolio's value to a change in the benchmark yield at one specific maturity, other yields unchanged. Their sum equals the effective duration.",
        },
        {
          id: "fixed_income.key-rate-duration-cf",
          nom: "Key rate duration of a cash flow",
          latex: "\\text{Modified duration of the cash flow}\\times\\text{Weight in the portfolio}",
        },
      ],
    },
    {
      id: "fixed_income.convexite",
      titre: "Convexité et risque de taux",
      formules: [
        {
          id: "fixed_income.cf-convexity",
          nom: "Convexity of a single cash flow",
          latex: "\\frac{t\\,(t+1)}{(1+r)^{2}}",
          note: "La convexité d'une obligation est la moyenne pondérée (par les VA) de celles de ses flux ; annualiser en divisant par m².",
        },
        {
          id: "fixed_income.approx-convexity",
          nom: "Approximate convexity",
          latex: "\\frac{PV_{-}+PV_{+}-2\\,PV_0}{PV_0\\,(\\Delta YTM)^{2}}",
        },
        {
          id: "fixed_income.effective-convexity",
          nom: "Effective convexity",
          latex: "\\frac{PV_{-}+PV_{+}-2\\,PV_0}{PV_0\\,(\\Delta\\text{Curve})^{2}}",
        },
        {
          id: "fixed_income.price-change-convexity",
          nom: "Price change with convexity",
          latex: "\\%\\Delta PV\\approx -ModDur\\times\\Delta YTM+\\frac{1}{2}\\times Convexity\\times(\\Delta YTM)^{2}",
        },
        {
          id: "fixed_income.money-convexity",
          nom: "Money convexity",
          latex: "Convexity\\times\\text{Full price of the position}",
        },
        {
          id: "fixed_income.convexity-properties",
          nom: "Convexity properties",
          texte: "Convexity is positive for option-free bonds and rises with lower coupon, longer maturity and lower yield. A callable bond can have negative convexity at low yields; a putable bond always has positive convexity.",
        },
        {
          id: "fixed_income.duration-properties",
          nom: "Duration properties",
          texte: "Duration rises with longer maturity, lower coupon and lower yield; it falls with time and rises slightly on coupon dates. An embedded option with significant value lowers the duration below that of the straight bond.",
        },
        {
          id: "fixed_income.empirical-duration",
          nom: "Empirical vs analytical duration",
          texte: "Analytical durations (Macaulay, modified, effective) come from the math; empirical duration is estimated from historical yield and price changes, and can be lower for credit-risky bonds in a flight to quality.",
        },
      ],
    },
    {
      id: "fixed_income.credit",
      titre: "Risque de crédit",
      formules: [
        {
          id: "fixed_income.expected-loss",
          nom: "Expected loss",
          latex: "\\text{Probability of default}\\times\\text{Loss given default}",
        },
        {
          id: "fixed_income.lgd",
          nom: "Loss given default (LGD%)",
          latex: "\\text{Expected exposure}\\times(1-\\text{Recovery rate})",
        },
        {
          id: "fixed_income.credit-spread-approx",
          nom: "Credit spread (approximation)",
          latex: "\\text{Probability of default}\\times\\text{LGD\\%}",
          note: "Spread équitable pour compenser la perte attendue ; spread réel plus élevé = investisseur bien rémunéré.",
        },
        {
          id: "fixed_income.credit-ratios-ebit-margin",
          nom: "EBIT margin",
          latex: "\\frac{EBIT}{\\text{Revenue}}",
          note: "Plus élevé = meilleure qualité de crédit.",
        },
        {
          id: "fixed_income.credit-ratios-ebit-interest",
          nom: "EBIT interest coverage",
          latex: "\\frac{EBIT}{\\text{Interest expense}}",
          note: "Plus élevé = meilleure qualité de crédit.",
        },
        {
          id: "fixed_income.credit-ratios-debt-ebitda",
          nom: "Debt to EBITDA",
          latex: "\\frac{\\text{Total debt}}{EBITDA}",
          note: "Plus bas = meilleure qualité de crédit.",
        },
        {
          id: "fixed_income.credit-ratios-rcf-net-debt",
          nom: "RCF to net debt",
          latex: "\\frac{RCF}{\\text{Debt}-\\text{Cash and marketable securities}}",
          note: "Plus élevé = meilleure qualité de crédit.",
        },
        {
          id: "fixed_income.credit-ratios-ffo-debt",
          nom: "FFO to debt",
          latex: "\\frac{\\text{Funds from operations}}{\\text{Total debt}}",
        },
        {
          id: "fixed_income.ffo",
          nom: "Funds from operations (FFO)",
          texte: "Net income from continuing operations plus depreciation, amortization, deferred taxes and noncash items (CFO without changes in working capital).",
        },
        {
          id: "fixed_income.rcf",
          nom: "Retained cash flow (RCF)",
          latex: "\\text{Operating cash flow}-\\text{Dividends}",
          note: "Cash flow opérationnel = CFO, FFO ou autre mesure choisie.",
        },
      ],
    },
    {
      id: "fixed_income.titrisation",
      titre: "Titrisation, ABS et MBS",
      formules: [
        {
          id: "fixed_income.wac",
          nom: "Weighted average coupon (WAC)",
          latex: "\\sum_{i}\\frac{\\text{Balance}_i}{\\text{Total balance}}\\times\\text{Rate}_i",
        },
        {
          id: "fixed_income.wam",
          nom: "Weighted average maturity (WAM)",
          latex: "\\sum_{i}\\frac{\\text{Balance}_i}{\\text{Total balance}}\\times\\text{Remaining term}_i",
        },
        {
          id: "fixed_income.pass-through-rate",
          nom: "Pass-through rate",
          texte: "The coupon rate of the MBS: below the WAC of the pool, because servicing and guarantee fees are deducted.",
        },
        {
          id: "fixed_income.cpr",
          nom: "Conditional prepayment rate (CPR)",
          texte: "An annualized measure of the prepayments experienced by a pool of mortgages.",
        },
        {
          id: "fixed_income.smm",
          nom: "Single monthly mortality rate (SMM)",
          texte: "The percentage by which prepayments have reduced the month-end principal balance of the pool.",
        },
        {
          id: "fixed_income.psa",
          nom: "PSA prepayment benchmark",
          texte: "A monthly series of CPRs to which a pool's CPR may be compared. 50 PSA = 50% of the benchmark speed.",
        },
        {
          id: "fixed_income.wal",
          nom: "Weighted average life vs WAM",
          texte: "With any prepayments, the weighted average life of a pool is less than its WAM.",
        },
        {
          id: "fixed_income.contraction-extension",
          nom: "Contraction and extension risk",
          texte: "Contraction risk: faster prepayments when rates fall. Extension risk: slower prepayments when rates rise (the bond lasts longer).",
        },
        {
          id: "fixed_income.credit-enhancement",
          nom: "Internal credit enhancement (ABS)",
          texte: "Overcollateralization, excess spread, and subordination (credit tranching).",
        },
      ],
    },
  ],
};
