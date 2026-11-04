import type { MatiereFormules } from "@/lib/formules/types";

export const QUANT: MatiereFormules = {
  matiere: "quant",
  copies: [
    {
      id: "quant.rendements",
      titre: "Taux et rendements",
      formules: [
        {
          id: "quant.hpr",
          nom: "Holding period return",
          latex: "\\frac{P_1 - P_0 + D_1}{P_0}"
        },
        {
          id: "quant.multi-period-hpr",
          nom: "Multi-period holding period return",
          latex: "(1+R_1)(1+R_2)\\cdots(1+R_n) - 1"
        },
        {
          id: "quant.arithmetic-mean",
          nom: "Arithmetic mean return",
          latex: "\\frac{1}{n}\\sum_{i=1}^{n} R_i"
        },
        {
          id: "quant.geometric-mean",
          nom: "Geometric mean return",
          latex: "\\left[\\prod_{i=1}^{n}(1+R_i)\\right]^{1/n} - 1",
          note: "Toujours inférieure ou égale à la moyenne arithmétique."
        },
        {
          id: "quant.harmonic-mean",
          nom: "Harmonic mean",
          latex: "\\frac{n}{\\sum_{i=1}^{n} \\frac{1}{X_i}}",
          note: "Utilisée pour le prix moyen payé en investissant un montant fixe à chaque période."
        },
        {
          id: "quant.weighted-mean",
          nom: "Weighted mean",
          latex: "\\sum_{i=1}^{n} w_i X_i"
        },
        {
          id: "quant.twr",
          nom: "Time-weighted return",
          latex: "\\left[\\prod_{t=1}^{T}(1+HPR_t)\\right]^{1/T}-1",
          note: "Neutre vis-à-vis des apports et retraits : mesure la performance du gérant."
        },
        {
          id: "quant.mwr",
          nom: "Money-weighted return",
          texte: "The internal rate of return (IRR) of the portfolio's cash flows: the rate that sets the PV of inflows equal to the PV of outflows.",
          note: "Sensible au calendrier des apports et retraits."
        },
        {
          id: "quant.annualized-return",
          nom: "Annualized return",
          latex: "(1 + R_{period})^{\\text{periods per year}} - 1"
        },
        {
          id: "quant.continuously-compounded-return",
          nom: "Continuously compounded return",
          latex: "\\ln\\left(\\frac{P_1}{P_0}\\right) = \\ln(1 + HPR)",
          note: "Les rendements continus s'additionnent d'une période à l'autre."
        },
        {
          id: "quant.real-return",
          nom: "Real return",
          latex: "\\frac{1 + \\text{Nominal return}}{1 + \\text{Inflation rate}} - 1"
        },
        {
          id: "quant.leveraged-return",
          nom: "Leveraged portfolio return",
          latex: "r_p + \\frac{V_B}{V_0}\\left(r_p - r_B\\right)",
          note: "V_B = montant emprunté, V_0 = fonds propres investis, r_B = coût de l'emprunt."
        }
      ]
    },
    {
      id: "quant.valeur-temps",
      titre: "Valeur temps : flux unique et composition",
      formules: [
        {
          id: "quant.fv",
          nom: "Future value (lump sum)",
          latex: "PV\\,(1 + r)^N"
        },
        {
          id: "quant.fv-multiple-compounding",
          nom: "Future value with m compoundings per year",
          latex: "PV\\left(1 + \\frac{r_s}{m}\\right)^{mN}"
        },
        {
          id: "quant.fv-continuous",
          nom: "Future value with continuous compounding",
          latex: "PV\\, e^{r_s N}"
        },
        {
          id: "quant.ear",
          nom: "Effective annual rate",
          latex: "\\left(1 + \\frac{r_s}{m}\\right)^{m} - 1"
        },
        {
          id: "quant.ear-continuous",
          nom: "Effective annual rate (continuous compounding)",
          latex: "e^{r_s} - 1"
        },
        {
          id: "quant.implied-growth",
          nom: "Implied growth rate (compound)",
          latex: "\\left(\\frac{FV}{PV}\\right)^{1/N} - 1"
        },
        {
          id: "quant.number-of-periods",
          nom: "Number of periods to reach a future value",
          latex: "\\frac{\\ln(FV/PV)}{\\ln(1+r)}"
        }
      ]
    },
    {
      id: "quant.annuites",
      titre: "Annuités, perpétuités et NPV",
      formules: [
        {
          id: "quant.fv-annuity",
          nom: "Future value of an ordinary annuity",
          latex: "A\\left[\\frac{(1+r)^N - 1}{r}\\right]"
        },
        {
          id: "quant.pv-annuity",
          nom: "Present value of an ordinary annuity",
          latex: "A\\left[\\frac{1 - (1+r)^{-N}}{r}\\right]",
          note: "Annuité due : multiplier par (1 + r)."
        },
        {
          id: "quant.loan-payment",
          nom: "Level loan payment (annuity payment)",
          latex: "\\frac{PV \\times r}{1 - (1+r)^{-N}}"
        },
        {
          id: "quant.pv-perpetuity",
          nom: "Present value of a perpetuity",
          latex: "\\frac{A}{r}"
        },
        {
          id: "quant.pv-growing-perpetuity",
          nom: "Present value of a growing perpetuity",
          latex: "\\frac{CF_1}{r - g}",
          note: "Valable seulement si r > g ; CF_1 est le flux de la période suivante."
        },
        {
          id: "quant.npv",
          nom: "Net present value",
          latex: "\\sum_{t=0}^{N}\\frac{CF_t}{(1+r)^t}"
        }
      ]
    },
    {
      id: "quant.tvm-finance",
      titre: "Valeur temps appliquée à la finance",
      formules: [
        {
          id: "quant.bond-price",
          nom: "Bond price",
          latex: "\\sum_{t=1}^{N}\\frac{PMT}{(1+r)^t} + \\frac{FV}{(1+r)^N}"
        },
        {
          id: "quant.gordon-growth-value",
          nom: "Stock value (Gordon growth model)",
          latex: "\\frac{D_1}{r - g} = \\frac{D_0(1+g)}{r - g}"
        },
        {
          id: "quant.implied-equity-return",
          nom: "Implied required return on a stock (Gordon)",
          latex: "\\frac{D_1}{P_0} + g"
        },
        {
          id: "quant.implied-growth-gordon",
          nom: "Implied dividend growth rate (Gordon)",
          latex: "r - \\frac{D_1}{P_0}"
        },
        {
          id: "quant.forward-rate-spot",
          nom: "Implied forward rate (1y1y) from spot rates",
          latex: "\\frac{(1+S_2)^2}{1+S_1} - 1",
          note: "Vient de (1 + S_2)^2 = (1 + S_1)(1 + 1y1y) : deux façons d'emprunter sur 2 ans doivent coûter pareil."
        },
        {
          id: "quant.forward-fx",
          nom: "No-arbitrage forward exchange rate (price/base)",
          latex: "S_{P/B}\\,\\frac{1 + r_P}{1 + r_B}",
          note: "P = devise de cotation (price currency), B = devise de base ; taux sans risque de chaque devise."
        },
        {
          id: "quant.binomial-hedge-ratio",
          nom: "Hedge ratio (one-period binomial call)",
          latex: "h = \\frac{c_1^{u} - c_1^{d}}{S_1^{u} - S_1^{d}}",
          note: "Nombre d'actions achetées par call vendu : le portefeuille a la même valeur dans les deux états."
        },
        {
          id: "quant.binomial-call-value",
          nom: "Call value (one-period binomial, no arbitrage)",
          latex: "h\\,S_0 - \\frac{h\\,S_1^{d} - c_1^{d}}{1 + r_f}",
          note: "c_0 = h S_0 - V_0, avec V_0 la valeur actuelle du portefeuille sans risque."
        }
      ]
    },
    {
      id: "quant.statistiques",
      titre: "Statistiques descriptives",
      formules: [
        {
          id: "quant.range",
          nom: "Range",
          latex: "\\text{Maximum value} - \\text{Minimum value}"
        },
        {
          id: "quant.mad",
          nom: "Mean absolute deviation",
          latex: "\\frac{\\sum_{i=1}^{n}\\left|X_i - \\bar{X}\\right|}{n}"
        },
        {
          id: "quant.population-variance",
          nom: "Population variance",
          latex: "\\frac{\\sum_{i=1}^{N}(X_i - \\mu)^2}{N}"
        },
        {
          id: "quant.sample-variance",
          nom: "Sample variance",
          latex: "\\frac{\\sum_{i=1}^{n}(X_i - \\bar{X})^2}{n-1}"
        },
        {
          id: "quant.coefficient-of-variation",
          nom: "Coefficient of variation",
          latex: "\\frac{s}{\\bar{X}}"
        },
        {
          id: "quant.target-downside-deviation",
          nom: "Target downside deviation",
          latex: "\\sqrt{\\frac{\\sum_{X_i < B}(X_i - B)^2}{n-1}}",
          note: "B = rendement cible ; seuls les rendements inférieurs à B comptent dans la somme."
        },
        {
          id: "quant.skewness",
          nom: "Sample skewness (approximation)",
          latex: "\\frac{1}{n}\\,\\frac{\\sum_{i=1}^{n}(X_i - \\bar{X})^3}{s^3}",
          note: "Positive : moyenne > médiane > mode ; négative : moyenne < médiane < mode. Le programme demande d'interpréter, pas de calculer."
        },
        {
          id: "quant.excess-kurtosis",
          nom: "Excess kurtosis",
          latex: "\\text{Kurtosis} - 3",
          note: "Normale : kurtosis = 3. Leptokurtique : excès > 0 (queues épaisses)."
        },
        {
          id: "quant.sample-covariance",
          nom: "Sample covariance",
          latex: "\\frac{\\sum_{i=1}^{n}(X_i - \\bar{X})(Y_i - \\bar{Y})}{n-1}"
        },
        {
          id: "quant.correlation",
          nom: "Correlation coefficient",
          latex: "\\frac{\\text{Cov}(X,Y)}{s_X\\, s_Y}"
        },
        {
          id: "quant.trimmed-winsorized",
          nom: "Trimmed mean vs winsorized mean",
          texte: "Trimmed mean: discard a stated percentage of the most extreme observations, then average. Winsorized mean: replace the extreme observations with the percentile values (e.g. the 5th and 95th) instead, then average.",
          note: "Les deux limitent l'effet des valeurs aberrantes."
        }
      ]
    },
    {
      id: "quant.probabilites",
      titre: "Probabilités et arbres",
      formules: [
        {
          id: "quant.expected-value",
          nom: "Expected value",
          latex: "\\sum_{i=1}^{n} P(x_i)\\, x_i"
        },
        {
          id: "quant.variance-prob",
          nom: "Variance (probability-weighted)",
          latex: "\\sum_{i=1}^{n} P(x_i)\\,\\left[x_i - E(X)\\right]^2"
        },
        {
          id: "quant.covariance-prob",
          nom: "Covariance (probability-weighted)",
          latex: "\\sum_{i}\\sum_{j} P(a_i, b_j)\\,\\left[a_i - E(A)\\right]\\left[b_j - E(B)\\right]"
        },
        {
          id: "quant.addition-rule",
          nom: "Addition rule",
          latex: "P(A) + P(B) - P(AB)"
        },
        {
          id: "quant.multiplication-rule",
          nom: "Multiplication rule",
          latex: "P(A \\mid B)\\,P(B)"
        },
        {
          id: "quant.independent-events",
          nom: "Independent events",
          latex: "P(A)\\,P(B)",
          note: "Équivalent : P(A | B) = P(A)."
        },
        {
          id: "quant.total-probability-rule",
          nom: "Total probability rule",
          latex: "\\sum_{i=1}^{n} P(A \\mid B_i)\\,P(B_i)"
        },
        {
          id: "quant.total-expectation-rule",
          nom: "Total probability rule for expected value",
          latex: "\\sum_{i=1}^{n} E(X \\mid S_i)\\,P(S_i)"
        },
        {
          id: "quant.bayes",
          nom: "Bayes' formula",
          latex: "\\frac{P(B \\mid A)\\,P(A)}{P(B)}"
        }
      ]
    },
    {
      id: "quant.portefeuille",
      titre: "Mathématiques du portefeuille et safety-first",
      formules: [
        {
          id: "quant.portfolio-expected-return",
          nom: "Portfolio expected return",
          latex: "\\sum_{i=1}^{n} w_i\\, E(R_i)"
        },
        {
          id: "quant.portfolio-variance-2",
          nom: "Portfolio variance (two assets)",
          latex: "w_1^2\\sigma_1^2 + w_2^2\\sigma_2^2 + 2\\,w_1 w_2\\,\\sigma_1\\sigma_2\\,\\rho_{1,2}"
        },
        {
          id: "quant.portfolio-variance-n",
          nom: "Portfolio variance (n assets)",
          latex: "\\sum_{i=1}^{n}\\sum_{j=1}^{n} w_i w_j \\,\\text{Cov}(R_i, R_j)"
        },
        {
          id: "quant.covariance-from-correlation",
          nom: "Covariance from correlation",
          latex: "\\rho_{1,2}\\,\\sigma_1\\,\\sigma_2"
        },
        {
          id: "quant.z-score",
          nom: "Standardization (z-score)",
          latex: "\\frac{x - \\mu}{\\sigma}"
        },
        {
          id: "quant.safety-first-ratio",
          nom: "Safety-first ratio (SFRatio)",
          latex: "\\frac{E(R_P) - R_L}{\\sigma_P}",
          note: "R_L = rendement minimal acceptable ; on choisit le SFRatio le plus élevé (minimise P(R_P < R_L))."
        },
        {
          id: "quant.shortfall-risk",
          nom: "Shortfall risk (normally distributed returns)",
          latex: "P(R_P < R_L) = N(-\\text{SFRatio})",
          note: "N = loi normale centrée réduite cumulée ; le SFRatio est le nombre d'écarts-types sous la moyenne."
        }
      ]
    },
    {
      id: "quant.simulation",
      titre: "Simulation, échantillonnage et estimation",
      formules: [
        {
          id: "quant.lognormal-price",
          nom: "Price relative S_T / S_0 (lognormal model)",
          latex: "e^{r_{0,T}}",
          note: "Le rendement continu r est normal ; le prix est lognormal, donc jamais négatif."
        },
        {
          id: "quant.monte-carlo",
          nom: "Monte Carlo simulation",
          texte: "Repeated random draws from assumed probability distributions of the risk factors, used to approximate the distribution of an outcome (e.g. a value or a return).",
          note: "Dépend des hypothèses de distribution ; ne donne pas de solution analytique."
        },
        {
          id: "quant.bootstrap",
          nom: "Bootstrap resampling",
          texte: "Repeated sampling with replacement from the observed sample, to estimate the sampling distribution of a statistic without assuming a distribution."
        },
        {
          id: "quant.jackknife",
          nom: "Jackknife resampling",
          texte: "Compute n sample means, each with one observation of the sample of size n removed, and base the estimate of the standard error on these n means.",
          note: "Sans tirage aléatoire ; réduit le biais."
        },
        {
          id: "quant.standard-error-known",
          nom: "Standard error of the sample mean (known variance)",
          latex: "\\frac{\\sigma}{\\sqrt{n}}"
        },
        {
          id: "quant.standard-error-unknown",
          nom: "Standard error of the sample mean (unknown variance)",
          latex: "\\frac{s}{\\sqrt{n}}"
        },
        {
          id: "quant.clt",
          nom: "Central limit theorem",
          texte: "For a large sample (n >= 30), the sampling distribution of the sample mean is approximately normal with mean μ and variance σ²/n, whatever the population distribution."
        }
      ]
    },
    {
      id: "quant.tests-hypotheses",
      titre: "Tests d'hypothèse",
      formules: [
        {
          id: "quant.test-statistic-mean",
          nom: "Test statistic for a mean (t or z)",
          latex: "\\frac{\\bar{X} - \\mu_0}{s/\\sqrt{n}}"
        },
        {
          id: "quant.power",
          nom: "Power of a test",
          latex: "1 - P(\\text{Type II error})"
        },
        {
          id: "quant.chi-square-variance",
          nom: "Chi-square test of a variance",
          latex: "\\frac{(n-1)\\,s^2}{\\sigma_0^2}",
          note: "Degrés de liberté : n - 1."
        },
        {
          id: "quant.f-test-variances",
          nom: "F-test for equality of two variances",
          latex: "\\frac{s_1^2}{s_2^2}",
          note: "Variance la plus grande au numérateur ; df = n1 - 1 et n2 - 1."
        },
        {
          id: "quant.pooled-variance",
          nom: "Pooled sample variance",
          latex: "\\frac{(n_1 - 1)s_1^2 + (n_2 - 1)s_2^2}{n_1 + n_2 - 2}"
        },
        {
          id: "quant.t-difference-means",
          nom: "t-test for difference in means (pooled, independent samples)",
          latex: "\\frac{\\bar{X}_1 - \\bar{X}_2}{\\sqrt{\\frac{s_p^2}{n_1} + \\frac{s_p^2}{n_2}}}",
          note: "Variances supposées égales ; df = n1 + n2 - 2."
        },
        {
          id: "quant.paired-t",
          nom: "Paired comparisons test",
          latex: "\\frac{\\bar{d}}{s_d/\\sqrt{n}}",
          note: "d = différences par paires ; df = n - 1."
        }
      ]
    },
    {
      id: "quant.independance",
      titre: "Tests d'indépendance",
      formules: [
        {
          id: "quant.correlation-t",
          nom: "t-test of the correlation coefficient",
          latex: "\\frac{r\\sqrt{n-2}}{\\sqrt{1 - r^2}}",
          note: "H0 : ρ = 0 ; df = n - 2."
        },
        {
          id: "quant.spearman",
          nom: "Spearman rank correlation",
          latex: "1 - \\frac{6\\sum_{i=1}^{n} d_i^2}{n(n^2 - 1)}",
          note: "d_i = écart de rang ; test non paramétrique."
        },
        {
          id: "quant.chi-square-independence",
          nom: "Chi-square test of independence",
          latex: "\\sum \\frac{(O_{ij} - E_{ij})^2}{E_{ij}}"
        },
        {
          id: "quant.expected-frequency",
          nom: "Expected frequency (contingency table)",
          latex: "\\frac{\\text{Total of row } i \\times \\text{Total of column } j}{\\text{Overall total}}"
        },
        {
          id: "quant.chi-square-df",
          nom: "Degrees of freedom (contingency table)",
          latex: "(r - 1)(c - 1)"
        }
      ]
    },
    {
      id: "quant.regression",
      titre: "Régression linéaire simple",
      formules: [
        {
          id: "quant.regression-model",
          nom: "Regression model for Y_i",
          latex: "b_0 + b_1 X_i + \\varepsilon_i"
        },
        {
          id: "quant.slope",
          nom: "Slope coefficient",
          latex: "\\frac{\\text{Cov}(X, Y)}{\\text{Var}(X)}"
        },
        {
          id: "quant.intercept",
          nom: "Intercept",
          latex: "\\bar{Y} - b_1 \\bar{X}"
        },
        {
          id: "quant.sst",
          nom: "Total variation (SST)",
          latex: "\\text{SSR} + \\text{SSE}",
          note: "SSR = variation expliquée par la régression ; SSE = variation inexpliquée (résidus)."
        },
        {
          id: "quant.r-squared",
          nom: "Coefficient of determination (R²)",
          latex: "\\frac{\\text{SSR}}{\\text{SST}} = 1 - \\frac{\\text{SSE}}{\\text{SST}}",
          note: "En régression simple, R² = r² (carré de la corrélation)."
        },
        {
          id: "quant.see",
          nom: "Standard error of estimate (SEE)",
          latex: "\\sqrt{\\frac{\\text{SSE}}{n-2}}"
        },
        {
          id: "quant.f-statistic-regression",
          nom: "F-statistic (simple regression)",
          latex: "\\frac{\\text{SSR}/1}{\\text{SSE}/(n-2)} = \\frac{\\text{MSR}}{\\text{MSE}}",
          note: "En régression simple, F = t² de la pente."
        },
        {
          id: "quant.slope-t",
          nom: "t-statistic for the slope",
          latex: "\\frac{\\hat{b}_1 - B_1}{s_{\\hat{b}_1}}",
          note: "df = n - 2 ; B_1 est la valeur sous H0 (souvent 0)."
        },
        {
          id: "quant.slope-confidence",
          nom: "Confidence interval for the slope",
          latex: "\\hat{b}_1 \\pm t_c \\, s_{\\hat{b}_1}"
        },
        {
          id: "quant.regression-assumptions",
          nom: "Regression assumptions",
          texte: "Linearity of the relationship; homoskedasticity (constant error variance); independence of the observations and errors; normality of the errors."
        }
      ]
    }
  ]
};
