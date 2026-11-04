import type { MatiereFormules } from "@/lib/formules/types";

export const EQUITY: MatiereFormules = {
  matiere: "equity",
  copies: [
    {
      id: "equity.marches",
      titre: "Marchés : marge, vente à découvert, ordres",
      formules: [
        {
          id: "equity.leverage-ratio",
          nom: "Leverage ratio (margin purchase)",
          latex: "\\frac{1}{\\text{Initial margin requirement}}",
        },
        {
          id: "equity.margin-call-long",
          nom: "Margin call price (long position)",
          latex: "P_0\\times\\frac{1-\\text{Initial margin}}{1-\\text{Maintenance margin}}",
        },
        {
          id: "equity.margin-call-short",
          nom: "Margin call price (short position)",
          latex: "P_0\\times\\frac{1+\\text{Initial margin}}{1+\\text{Maintenance margin}}",
        },
        {
          id: "equity.margin-return",
          nom: "Return on a margin purchase",
          latex: "\\frac{N\\times P_1+\\text{Dividends}-\\text{Loan}\\times(1+i)}{\\text{Initial equity}}-1",
          note: "N = nombre d'actions, i = taux du prêt de marge. Ajouter les commissions si l'énoncé en donne.",
        },
        {
          id: "equity.bid-ask-spread",
          nom: "Bid-ask spread",
          latex: "\\text{Ask price}-\\text{Bid price}",
        },
        {
          id: "equity.order-types",
          nom: "Order types",
          texte: "Market order: executes immediately at the best available price. Limit order: sets a minimum execution price on a sell (maximum on a buy) and executes only at that price or better.",
        },
        {
          id: "equity.short-sale-loss",
          nom: "Short seller's dividend obligation",
          texte: "The short seller must pay the lender any dividends paid on the borrowed shares (payments in lieu).",
        },
      ],
    },
    {
      id: "equity.indices",
      titre: "Indices boursiers",
      formules: [
        {
          id: "equity.price-weighted-index",
          nom: "Price-weighted index",
          latex: "\\frac{\\sum_{i} P_i}{\\text{Divisor}}",
        },
        {
          id: "equity.divisor-adjustment",
          nom: "New divisor after a split",
          latex: "\\frac{\\sum P_{\\text{after split}}}{\\text{Index value before split}}",
          note: "Garde la valeur de l'indice inchangée par le split.",
        },
        {
          id: "equity.market-cap-index",
          nom: "Market-cap-weighted index",
          latex: "\\frac{\\sum_{i} P_{i,t}\\,Q_{i,t}}{\\sum_{i} P_{i,0}\\,Q_{i,0}}\\times\\text{Base value}",
        },
        {
          id: "equity.equal-weighted-index",
          nom: "Equal-weighted index return",
          latex: "\\frac{1}{N}\\sum_{i=1}^{N} R_i",
        },
        {
          id: "equity.price-return",
          nom: "Price return of an index",
          latex: "\\frac{\\text{Index}_{end}-\\text{Index}_{start}}{\\text{Index}_{start}}",
        },
        {
          id: "equity.total-return",
          nom: "Total return of an index",
          latex: "\\text{Price return}+\\text{Income return}",
        },
        {
          id: "equity.index-weighting-biases",
          nom: "Index weighting methods",
          texte: "Price-weighted: high-priced stocks dominate. Market-cap-weighted: large caps dominate (overweights overvalued stocks). Equal-weighted: overweights small caps, needs rebalancing. Fundamental-weighted: weights by size measures (sales, earnings, dividends).",
        },
      ],
    },
    {
      id: "equity.efficience",
      titre: "Efficience des marchés",
      formules: [
        {
          id: "equity.weak-form",
          nom: "Weak-form efficiency",
          texte: "Prices reflect all past market data (prices, volume). Technical analysis cannot earn excess returns.",
        },
        {
          id: "equity.semistrong-form",
          nom: "Semi-strong form efficiency",
          texte: "Prices reflect all publicly available information. Fundamental analysis cannot earn excess returns.",
        },
        {
          id: "equity.strong-form",
          nom: "Strong-form efficiency",
          texte: "Prices reflect all information, public and private. Even insiders cannot earn excess returns.",
        },
        {
          id: "equity.market-anomalies",
          nom: "Market anomalies",
          texte: "Patterns inconsistent with efficiency. Time-series: January effect, overreaction, momentum. Cross-sectional: size effect, value effect. Others: closed-end funds at a discount to NAV, slow adjustment to earnings surprises, IPO underperformance. Often due to data mining.",
        },
        {
          id: "equity.informational-efficiency",
          nom: "Informationally efficient market",
          texte: "Security prices reflect all available information fully, quickly and rationally; only unexpected information moves prices.",
        },
        {
          id: "equity.market-vs-intrinsic",
          nom: "Market value vs intrinsic value",
          texte: "Market value: the price at which an asset can currently be bought or sold. Intrinsic value: the price investors with full knowledge of the asset's characteristics would place on it.",
        },
        {
          id: "equity.efficiency-factors",
          nom: "Factors affecting market efficiency",
          texte: "More participants and more information availability raise efficiency. Impediments to arbitrage and short selling, and high trading and information costs, lower it.",
        },
      ],
    },
    {
      id: "equity.titres",
      titre: "Actions et rendement exigé",
      formules: [
        {
          id: "equity.hpr",
          nom: "Holding period return (stock)",
          latex: "\\frac{P_1-P_0+D_1}{P_0}",
        },
        {
          id: "equity.capm",
          nom: "CAPM required return",
          latex: "r_f+\\beta\\,\\left[E(R_m)-r_f\\right]",
        },
        {
          id: "equity.bond-yield-plus-premium",
          nom: "Bond yield plus risk premium",
          latex: "\\text{YTM of firm's long-term debt}+\\text{Risk premium}",
        },
        {
          id: "equity.roe",
          nom: "Return on equity",
          latex: "\\frac{\\text{Net income}-\\text{Preferred dividends}}{\\text{Average book value of common equity}}",
          note: "Variante : valeur comptable de début d'année (t − 1) au dénominateur.",
        },
        {
          id: "equity.book-value-per-share",
          nom: "Book value per share",
          latex: "\\frac{\\text{Common shareholders' equity}}{\\text{Shares outstanding}}",
        },
        {
          id: "equity.dupont",
          nom: "DuPont ROE (three-step)",
          latex: "\\frac{NI}{\\text{Sales}}\\times\\frac{\\text{Sales}}{\\text{Assets}}\\times\\frac{\\text{Assets}}{\\text{Equity}}",
        },
        {
          id: "equity.preferred-value",
          nom: "Non-callable perpetual preferred value",
          latex: "\\frac{D_p}{r_p}",
        },
      ],
    },
    {
      id: "equity.analyse-entreprise",
      titre: "Analyse d'entreprise et d'industrie",
      formules: [
        {
          id: "equity.dol",
          nom: "Degree of operating leverage",
          latex: "\\frac{\\%\\Delta\\text{Operating income}}{\\%\\Delta\\text{Sales}}",
        },
        {
          id: "equity.operating-profit",
          nom: "Operating profit (fixed and variable costs)",
          latex: "Q\\,(P-VC)-FC",
          note: "(P − VC) = marge sur coûts variables (contribution margin) par unité ; Q = quantité.",
        },
        {
          id: "equity.dfl",
          nom: "Degree of financial leverage",
          latex: "\\frac{\\%\\Delta\\text{Net income}}{\\%\\Delta\\text{Operating income}}",
        },
        {
          id: "equity.hhi",
          nom: "Herfindahl-Hirschman Index (HHI)",
          latex: "\\sum_{i=1}^{N} s_i^{2}",
          note: "s_i = part de marché (en %) : < 1 500 faible, 1 500 à 2 500 modérée, > 2 500 forte concentration.",
        },
        {
          id: "equity.porter-five-forces",
          nom: "Porter's five forces",
          texte: "Threat of new entrants, threat of substitutes, bargaining power of buyers, bargaining power of suppliers, rivalry among existing competitors.",
        },
        {
          id: "equity.sales-forecast",
          nom: "Sales forecast (market share approach)",
          latex: "\\text{Industry sales}\\times\\text{Market share}",
          note: "Taille du marché = ventes de l'entreprise / part de marché.",
        },
      ],
    },
    {
      id: "equity.ddm",
      titre: "Modèles d'actualisation des dividendes",
      formules: [
        {
          id: "equity.ddm-finite",
          nom: "Dividend discount model (finite holding period)",
          latex: "\\sum_{t=1}^{n}\\frac{D_t}{(1+r)^{t}}+\\frac{P_n}{(1+r)^{n}}",
        },
        {
          id: "equity.gordon-growth",
          nom: "Gordon growth model",
          latex: "\\frac{D_1}{r-g}=\\frac{D_0\\,(1+g)}{r-g}",
          note: "Exige r > g, croissance stable.",
        },
        {
          id: "equity.gordon-required-return",
          nom: "Required return from Gordon growth",
          latex: "\\frac{D_1}{P_0}+g",
        },
        {
          id: "equity.sustainable-growth",
          nom: "Sustainable growth rate",
          latex: "b\\times ROE",
          note: "b = taux de rétention = 1 − payout ; ROE et payout supposés constants, sans nouvelle émission d'actions.",
        },
        {
          id: "equity.terminal-value-gordon",
          nom: "Terminal value (Gordon growth)",
          latex: "P_n=\\frac{D_{n+1}}{r-g}",
        },
        {
          id: "equity.multistage-ddm",
          nom: "Two-stage DDM",
          latex: "\\sum_{t=1}^{n}\\frac{D_t}{(1+r)^{t}}+\\frac{D_{n+1}}{(r-g_L)(1+r)^{n}}",
          note: "g_L = croissance de long terme après la phase de forte croissance.",
        },
      ],
    },
    {
      id: "equity.multiples",
      titre: "Multiples",
      formules: [
        {
          id: "equity.pe",
          nom: "Price-to-earnings (P/E)",
          latex: "\\frac{\\text{Price}}{\\text{EPS}}",
        },
        {
          id: "equity.justified-leading-pe",
          nom: "Justified leading P/E",
          latex: "\\frac{1-b}{r-g}",
        },
        {
          id: "equity.justified-trailing-pe",
          nom: "Justified trailing P/E",
          latex: "\\frac{(1-b)(1+g)}{r-g}",
        },
        {
          id: "equity.pb",
          nom: "Price-to-book (P/B)",
          latex: "\\frac{\\text{Price}}{\\text{Book value per share}}",
        },
        {
          id: "equity.ps",
          nom: "Price-to-sales (P/S)",
          latex: "\\frac{\\text{Price}}{\\text{Sales per share}}",
        },
        {
          id: "equity.pcf",
          nom: "Price-to-cash flow (P/CF)",
          latex: "\\frac{\\text{Price}}{\\text{Cash flow per share}}",
        },
        {
          id: "equity.dividend-yield",
          nom: "Dividend yield",
          latex: "\\frac{\\text{Dividends per share}}{\\text{Price}}",
        },
        {
          id: "equity.ev",
          nom: "Enterprise value",
          latex: "\\text{Market value of equity}+\\text{Market value of debt}-\\text{Cash and short-term investments}",
          note: "Coût d'acquisition de l'entreprise ; compare des structures de capital différentes.",
        },
        {
          id: "equity.ev-ebitda",
          nom: "EV/EBITDA",
          latex: "\\frac{\\text{Enterprise value}}{EBITDA}",
        },
      ],
    },
    {
      id: "equity.flux",
      titre: "Flux de trésorerie libres",
      formules: [
        {
          id: "equity.fcff",
          nom: "Free cash flow to the firm (from net income)",
          latex: "NI+NCC+Int\\,(1-t)-FCInv-WCInv",
          note: "NCC = charges non monétaires, FCInv = investissement en capital fixe, WCInv = variation du BFR.",
        },
        {
          id: "equity.fcff-cfo",
          nom: "Free cash flow to the firm (from CFO)",
          latex: "CFO+Int\\,(1-t)-FCInv",
        },
        {
          id: "equity.fcfe",
          nom: "Free cash flow to equity",
          latex: "FCFF-Int\\,(1-t)+\\text{Net borrowing}",
        },
        {
          id: "equity.fcfe-cfo",
          nom: "Free cash flow to equity (from CFO)",
          latex: "CFO-FCInv+\\text{Net borrowing}",
        },
        {
          id: "equity.equity-from-ev",
          nom: "Equity value from enterprise value",
          latex: "EV-\\text{Market value of debt}+\\text{Cash and short-term investments}",
        },
      ],
    },
  ],
};
