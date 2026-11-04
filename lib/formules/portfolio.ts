import type { MatiereFormules } from "@/lib/formules/types";

export const PORTFOLIO: MatiereFormules = {
  matiere: "portfolio",
  copies: [
    {
      id: "portfolio.rendements",
      titre: "Mesures de rendement",
      formules: [
        {
          id: "portfolio.hpr",
          nom: "Holding period return",
          latex: "\\frac{P_1-P_0+\\text{Income}}{P_0}",
        },
        {
          id: "portfolio.arithmetic-mean",
          nom: "Arithmetic mean return",
          latex: "\\frac{1}{n}\\sum_{t=1}^{n} R_t",
        },
        {
          id: "portfolio.geometric-mean",
          nom: "Geometric mean return",
          latex: "\\left[\\prod_{t=1}^{n}(1+R_t)\\right]^{1/n}-1",
          note: "Toujours ≤ moyenne arithmétique ; mesure la croissance composée.",
        },
        {
          id: "portfolio.twr",
          nom: "Time-weighted return",
          latex: "\\prod_{t=1}^{n}(1+HPR_t)-1",
          note: "Neutralise l'effet des apports et retraits ; mesure la performance du gérant.",
        },
        {
          id: "portfolio.mwr",
          nom: "Money-weighted return",
          texte: "The IRR of the portfolio's cash flows (initial value, contributions, withdrawals, ending value). It is affected by the timing and size of cash flows.",
        },
        {
          id: "portfolio.real-return",
          nom: "Real return",
          latex: "\\frac{1+R_{nominal}}{1+\\text{Inflation}}-1",
        },
        {
          id: "portfolio.log-return",
          nom: "Continuously compounded return",
          latex: "\\ln\\left(\\frac{P_1}{P_0}\\right)=\\ln(1+HPR)",
        },
        {
          id: "portfolio.leveraged-return",
          nom: "Leveraged portfolio return",
          latex: "R_P+\\frac{V_B}{V_E}\\left(R_P-r_D\\right)",
          note: "V_B = montant emprunté, V_E = fonds propres, r_D = coût de la dette.",
        },
      ],
    },
    {
      id: "portfolio.risque-rendement",
      titre: "Risque et rendement d'un portefeuille",
      formules: [
        {
          id: "portfolio.expected-return",
          nom: "Expected return of a portfolio",
          latex: "\\sum_{i=1}^{N} w_i\\,E(R_i)",
        },
        {
          id: "portfolio.covariance",
          nom: "Covariance",
          latex: "\\rho_{1,2}\\,\\sigma_1\\,\\sigma_2",
        },
        {
          id: "portfolio.correlation",
          nom: "Correlation",
          latex: "\\frac{Cov(R_1,R_2)}{\\sigma_1\\,\\sigma_2}",
        },
        {
          id: "portfolio.sample-variance",
          nom: "Sample variance of returns",
          latex: "\\frac{\\sum_{t=1}^{T}\\left(R_t-\\bar{R}\\right)^{2}}{T-1}",
          note: "Écart-type = racine carrée. Population : diviser par T.",
        },
        {
          id: "portfolio.variance-two-assets",
          nom: "Portfolio variance (two assets)",
          latex: "w_1^{2}\\sigma_1^{2}+w_2^{2}\\sigma_2^{2}+2\\,w_1 w_2\\,\\rho_{1,2}\\,\\sigma_1\\sigma_2",
        },
        {
          id: "portfolio.variance-n-assets",
          nom: "Portfolio variance (N assets)",
          latex: "\\sum_{i=1}^{N}\\sum_{j=1}^{N} w_i\\,w_j\\,Cov(R_i,R_j)",
        },
        {
          id: "portfolio.diversification",
          nom: "Diversification benefit",
          texte: "Portfolio risk falls as correlation falls. With ρ = 1 there is no benefit; with ρ < 1 the portfolio σ is below the weighted average of the σ's. Only systematic (market) risk remains in a well-diversified portfolio.",
        },
        {
          id: "portfolio.risk-aversion-utility",
          nom: "Mean-variance utility",
          latex: "E(R)-\\frac{1}{2}\\,A\\,\\sigma^{2}",
          note: "A = coefficient d'aversion au risque. Formule du texte CFA (le résumé Schweser n'en garde que l'intuition).",
        },
        {
          id: "portfolio.risk-attitudes",
          nom: "Risk attitudes and indifference curves",
          texte: "Risk-averse: prefers less risk for equal expected return. Risk-seeking: prefers more. Risk-neutral: indifferent. Indifference curves slope upward for risk-averse investors; more risk aversion means steeper curves.",
        },
        {
          id: "portfolio.efficient-frontier",
          nom: "Efficient frontier",
          texte: "The set of portfolios offering the highest expected return for each level of risk (or the lowest risk for each level of return). The global minimum-variance portfolio is its leftmost point.",
        },
      ],
    },
    {
      id: "portfolio.cal-capm",
      titre: "CAL, CML et CAPM",
      formules: [
        {
          id: "portfolio.cal",
          nom: "Capital allocation line (CAL)",
          latex: "r_f+\\frac{E(R_{risky})-r_f}{\\sigma_{risky}}\\,\\sigma_P",
        },
        {
          id: "portfolio.cml",
          nom: "Capital market line (CML)",
          latex: "r_f+\\frac{E(R_M)-r_f}{\\sigma_M}\\,\\sigma_P",
          note: "Vaut pour les portefeuilles efficients ; l'axe est le risque total σ.",
        },
        {
          id: "portfolio.sml",
          nom: "Security market line (CAPM)",
          latex: "r_f+\\beta_i\\,\\left[E(R_M)-r_f\\right]",
          note: "Vaut pour tout titre ou portefeuille ; l'axe est le risque systématique β.",
        },
        {
          id: "portfolio.beta",
          nom: "Beta",
          latex: "\\frac{Cov(R_i,R_M)}{\\sigma_M^{2}}=\\rho_{i,M}\\,\\frac{\\sigma_i}{\\sigma_M}",
        },
        {
          id: "portfolio.total-risk-decomposition",
          nom: "Total variance decomposition (market model)",
          latex: "\\beta_i^{2}\\,\\sigma_M^{2}+\\sigma_{e_i}^{2}",
          note: "Partie systématique + risque spécifique.",
        },
        {
          id: "portfolio.market-model",
          nom: "Market model (single-index model)",
          latex: "\\alpha_i+\\beta_i\\,R_M+e_i",
        },
        {
          id: "portfolio.portfolio-beta",
          nom: "Portfolio beta",
          latex: "\\sum_{i} w_i\\,\\beta_i",
        },
        {
          id: "portfolio.market-risk-premium",
          nom: "Market risk premium",
          latex: "E(R_M)-r_f",
        },
        {
          id: "portfolio.sml-valuation",
          nom: "SML valuation rule",
          texte: "A security plotting above the SML earns more than required for its beta (underpriced: buy). Below the SML it is overpriced. On the SML it is fairly priced.",
        },
      ],
    },
    {
      id: "portfolio.performance",
      titre: "Mesures de performance ajustée du risque",
      formules: [
        {
          id: "portfolio.sharpe",
          nom: "Sharpe ratio",
          latex: "\\frac{R_P-r_f}{\\sigma_P}",
          note: "Risque total : pour comparer des portefeuilles entiers.",
        },
        {
          id: "portfolio.treynor",
          nom: "Treynor ratio",
          latex: "\\frac{R_P-r_f}{\\beta_P}",
          note: "Risque systématique : pour un portefeuille faisant partie d'un ensemble diversifié.",
        },
        {
          id: "portfolio.m-squared",
          nom: "M-squared (M²)",
          latex: "r_f+\\frac{\\sigma_M}{\\sigma_P}\\,(R_P-r_f)",
          note: "Rendement du portefeuille P* (P ajusté par levier ou désendettement au risque du marché). Même classement que Sharpe.",
        },
        {
          id: "portfolio.m-squared-alpha",
          nom: "M-squared alpha",
          latex: "(Sharpe_P-Sharpe_M)\\times\\sigma_M",
          note: "= M² − R_M. Positif : P bat le marché à risque total égal.",
        },
        {
          id: "portfolio.jensen-alpha",
          nom: "Jensen's alpha",
          latex: "R_P-\\left[r_f+\\beta_P\\,(R_M-r_f)\\right]",
        },
      ],
    },
    {
      id: "portfolio.gestion",
      titre: "Gestion de portefeuille : processus et planification",
      formules: [
        {
          id: "portfolio.process",
          nom: "Portfolio management process",
          texte: "Planning (client needs, IPS), execution (asset allocation, security selection), feedback (monitoring, rebalancing, performance evaluation).",
        },
        {
          id: "portfolio.ips-risk-return",
          nom: "IPS objectives",
          texte: "Return objective (absolute or relative) and risk objective (absolute or relative), the latter reflecting the client's ability and willingness to take risk.",
        },
        {
          id: "portfolio.ips-constraints",
          nom: "IPS constraints",
          texte: "Liquidity, time horizon, tax considerations, legal and regulatory factors, unique circumstances.",
        },
        {
          id: "portfolio.risk-tolerance",
          nom: "Risk tolerance",
          texte: "Overall risk tolerance depends on both ability (financial factors: wealth, income stability, time horizon) and willingness (psychological factors) to take risk. When they differ, choose the more conservative and counsel the client.",
        },
        {
          id: "portfolio.saa-taa",
          nom: "Strategic vs tactical asset allocation",
          texte: "Strategic: long-term target weights set from objectives and constraints. Tactical: short-term deviations to exploit market views.",
        },
        {
          id: "portfolio.active-passive",
          nom: "Active vs passive management",
          texte: "Active management attempts to outperform a chosen benchmark through manager skill. Passive management attempts to replicate the performance of a chosen benchmark index.",
        },
        {
          id: "portfolio.esg-approaches",
          nom: "ESG investment approaches",
          texte: "Negative screening, positive screening, thematic investing, impact investing, engagement/active ownership, ESG integration.",
        },
        {
          id: "portfolio.pooled-vehicles",
          nom: "Pooled investment vehicles",
          texte: "Mutual funds (open-ended: bought and sold at NAV; closed-ended: fixed number of shares trading at a market price), ETFs (bought and sold like stocks), separately managed accounts, hedge funds (accredited investors; typical fees 2% of assets plus 20% of excess performance), buyout funds, venture capital funds.",
        },
        {
          id: "portfolio.ips-sections",
          nom: "IPS sections",
          texte: "Introduction, statement of purpose, duties and responsibilities, procedures, investment objectives, investment constraints, investment guidelines, evaluation and review, appendices (strategic asset allocation, rebalancing policy).",
        },
        {
          id: "portfolio.db-dc",
          nom: "Defined contribution vs defined benefit plan",
          texte: "Defined contribution: the employee bears the investment risk. Defined benefit: the employer promises a benefit, so the employer bears the investment risk.",
        },
        {
          id: "portfolio.top-down-bottom-up",
          nom: "Top-down vs bottom-up analysis",
          texte: "Top-down: starts from macroeconomic expectations (inflation, rates, GDP) to choose asset classes and industries. Bottom-up: starts from valuation estimates of individual securities.",
        },
      ],
    },
    {
      id: "portfolio.biais",
      titre: "Biais comportementaux",
      formules: [
        {
          id: "portfolio.cognitive-belief-perseverance",
          nom: "Cognitive errors: belief perseverance",
          texte: "Conservatism, confirmation, representativeness, control, hindsight.",
          note: "Biais de croyance : l'investisseur s'accroche à ses idées. Corrigibles par l'information.",
        },
        {
          id: "portfolio.cognitive-processing",
          nom: "Cognitive errors: information-processing",
          texte: "Anchoring and adjustment, mental accounting, framing, availability.",
        },
        {
          id: "portfolio.emotional-biases",
          nom: "Emotional biases",
          texte: "Loss aversion, overconfidence, self-control, status quo, endowment, regret aversion.",
          note: "Plus difficiles à corriger que les biais cognitifs ; on s'y adapte.",
        },
        {
          id: "portfolio.loss-aversion",
          nom: "Loss aversion",
          texte: "Feeling more pain from a loss than pleasure from an equal gain. Can cause trading too much (selling for small gains) or holding deteriorated assets and taking excessive risk to recover losses.",
        },
        {
          id: "portfolio.overconfidence",
          nom: "Overconfidence bias",
          texte: "Overestimating one's own intuitive ability or reasoning. Can lead to underestimating risk, overestimating return and failing to diversify sufficiently.",
        },
        {
          id: "portfolio.anchoring",
          nom: "Anchoring and adjustment",
          texte: "Basing expectations on a prior number and overweighting it, so that the implications of new information are underestimated.",
        },
        {
          id: "portfolio.behavioral-finance",
          nom: "Behavioral finance vs traditional finance",
          texte: "Traditional finance assumes rational decision making. Behavioral finance holds that cognitive and emotional biases are widespread and predictable; they describe investor irrationality but do not necessarily refute market efficiency.",
        },
      ],
    },
    {
      id: "portfolio.gestion-risques",
      titre: "Gestion des risques",
      formules: [
        {
          id: "portfolio.risk-process",
          nom: "Risk management process",
          texte: "Identify and measure existing risks; determine overall risk tolerance; set risk governance processes and policies; manage and mitigate risks to reach the optimal bundle of risks; monitor exposures; communicate; perform strategic risk analysis.",
        },
        {
          id: "portfolio.financial-risks",
          nom: "Financial risks",
          texte: "Market risk, credit risk, liquidity risk.",
        },
        {
          id: "portfolio.non-financial-risks",
          nom: "Non-financial risks",
          texte: "Operational risk (including cyber), solvency risk, regulatory risk, governmental or political risk (including tax), legal risk, model risk, tail risk, accounting risk. Settlement risk is also non-financial.",
        },
        {
          id: "portfolio.risk-responses",
          nom: "Risk responses",
          texte: "Bear the risk (self-insure); avoid or prevent it; manage it through diversification; transfer it (insurance, surety bond); shift it (change the distribution of outcomes, with derivatives).",
        },
        {
          id: "portfolio.var",
          nom: "Value at risk (VaR)",
          texte: "The minimum loss over a period that will occur with a specific probability (a 5% one-month VaR of $1 million: a loss of at least $1 million is expected 5% of the time). It is not a maximum loss. Conditional VaR (CVaR) is the expected loss given that the loss exceeds the VaR.",
        },
        {
          id: "portfolio.risk-measures",
          nom: "Risk measures by asset class",
          texte: "Assets: standard deviation, beta, duration. Derivatives: delta, gamma, vega, rho. Tail risk: VaR and conditional VaR.",
        },
        {
          id: "portfolio.risk-budgeting",
          nom: "Risk budgeting",
          texte: "Allocating the total risk the firm will take (its risk tolerance) to assets or investments according to their risk characteristics and how they combine. The budget can be a single metric (beta, VaR) or a sum of risk factors.",
        },
      ],
    },
  ],
};
