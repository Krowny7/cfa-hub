// Variantes (2 par question) pour "Mock A — Session 1 — Méthodes Quantitatives".
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
    title: "Mock A — Session 1 — Méthodes Quantitatives — Variantes",
    difficulty: 2,
    questions: [
      // ---- Q33 — flux en début de période et rendement -------------------
      // (a) angle : on remonte au dépôt initial au lieu de dérouler vers l'avant
      [
        "An account returned –22% in its first year and +24% in its second year. A €1,000 withdrawal was made at the beginning of the second year, and the balance at the end of the second year was €8,432. The initial deposit at the beginning of the first year was closest to:",
        ["€7,436.", "€8,718.", "€10,000."],
        2,
        "Work backwards through each year. The €8,432 ending balance is the post-withdrawal balance grown by 24%, so that balance was €8,432 / 1.24 = €6,800. Adding back the withdrawal gives €7,800 at the end of year 1, which is the deposit after a 22% loss: €7,800 / 0.78 = €10,000. €8,718 ignores the withdrawal entirely (€8,432 / (0.78 × 1.24)); €7,436 adds the withdrawal to the account instead of removing it.",
      ],
      // (b) difficulté : trois périodes, flux entrants et sortants mélangés
      [
        "An account is opened with a €20,000 deposit at the beginning of year 1 and returns –15% that year. A further €4,000 is deposited at the beginning of year 2, which returns +30%. A €6,000 withdrawal is made at the beginning of year 3, which returns –5%. The balance at the end of year 3 is closest to:",
        ["€18,795.", "€20,235.", "€25,935."],
        1,
        "Each cash flow occurs before that year's return, so it earns or loses the full year: €20,000 × 0.85 = €17,000; (€17,000 + €4,000) × 1.30 = €27,300; (€27,300 – €6,000) × 0.95 = €20,235. €18,795 applies each year's return before that year's cash flow; €25,935 forgets the year-3 withdrawal.",
      ],

      // ---- Q35 — apprentissage automatique -------------------------------
      // (a) angle : diagnostiquer un symptôme plutôt que réciter une propriété
      [
        "A model trained on ten years of daily data classifies 99% of the training observations correctly but only 52% of the observations in a hold-out sample. This result is best described as:",
        [
          "underfitting the training data.",
          "overfitting the training data.",
          "evidence that the hold-out sample was drawn from a different population.",
        ],
        1,
        "A model that performs far better in-sample than out-of-sample has learned the noise specific to the training data rather than the underlying relationship — that is overfitting. Underfitting would show poor performance in both samples. A change of population is possible in principle, but it is not the most likely explanation for a gap this large and this characteristic.",
      ],
      // (b) difficulté : placer la technique dans la taxonomie
      [
        "A researcher groups 500 companies into clusters on the basis of their financial ratios, without specifying in advance what the groups should be. This technique is best described as:",
        [
          "supervised learning, because the input data are labelled.",
          "unsupervised learning, because the model is not given target categories.",
          "deep learning, because clustering requires multiple hidden layers.",
        ],
        1,
        "In unsupervised learning the algorithm receives inputs but no target labels and finds structure on its own — clustering is the standard example. Supervised learning requires labelled targets to learn from. Deep learning refers to neural networks with many hidden layers and is a separate axis: a clustering task is not deep learning by definition.",
      ],

      // ---- Q39 — composition de rendements infra-annuels ------------------
      // (a) angle : l'ordre des sous-périodes change-t-il le résultat ?
      [
        "Security A appreciates by 33% over the first six months of the year and then depreciates by 15% over the following six months. Security B depreciates by 15% over the first six months and then appreciates by 33% over the following six months. Over the full 12 months:",
        [
          "Security A has the higher holding period return.",
          "Security B has the higher holding period return.",
          "the two securities have the same holding period return.",
        ],
        2,
        "The 12-month holding period return compounds the two sub-period returns, and multiplication is commutative: 1.33 × 0.85 = 0.85 × 1.33 = 1.1305, so both securities return 13.05%. The order in which the gain and the loss occur affects the path of the balance during the year, not the return over the whole period.",
      ],
      // (b) difficulté : annualiser une période partielle
      [
        "A security produces a holding period return of 8% over a four-month period. Assuming the same performance is repeated and compounded, the annualized return is closest to:",
        ["8.0%.", "24.0%.", "26.0%."],
        2,
        "Four months is one third of a year, so the annualized return compounds the holding period return three times: (1.08)³ – 1 = 1.2597 – 1 = 25.97%, or about 26.0%. 24.0% simply multiplies 8% by three, which ignores compounding; 8.0% is the unannualized holding period return.",
      ],

      // ---- Q41 — corrélation des rangs de Spearman -----------------------
      // (a) angle : on remonte à la somme des écarts au carré
      [
        "For a sample of 10 observations, the Spearman rank correlation is 0.30. The sum of the squared differences in ranks is closest to:",
        ["49.5.", "115.5.", "165.0."],
        1,
        "Rearrange r(s) = 1 – 6Σd² / [n(n² – 1)]. With n = 10, n(n² – 1) = 10 × 99 = 990, so 6Σd² / 990 = 1 – 0.30 = 0.70 and Σd² = 0.70 × 990 / 6 = 115.5. 49.5 uses r(s) itself (0.30) in place of 1 – r(s); 165.0 drops the 0.70 factor altogether.",
      ],
      // (b) difficulté : le cas limite du classement inversé
      [
        "Two analysts each rank the same six stocks, and their rankings are exactly opposite: the stock ranked 1 by the first analyst is ranked 6 by the second, 2 is ranked 5, and so on. The Spearman rank correlation between the two sets of rankings is:",
        ["–1.00.", "–0.50.", "0.00."],
        0,
        "The rank differences are –5, –3, –1, +1, +3 and +5, so Σd² = 25 + 9 + 1 + 1 + 9 + 25 = 70. With n = 6, n(n² – 1) = 6 × 35 = 210, giving r(s) = 1 – 6(70) / 210 = 1 – 2 = –1.00. A perfectly reversed ranking is the definition of perfect negative rank correlation; 0.00 would mean the two rankings are unrelated.",
      ],

      // ---- Q43 — loi lognormale ------------------------------------------
      // (a) angle : quelle variable suit quelle loi
      [
        "An analyst assumes that a stock's continuously compounded annual return is normally distributed. The implied distribution of the stock's price one year from now is best described as:",
        ["normally distributed.", "lognormally distributed.", "uniformly distributed."],
        1,
        "If the continuously compounded return r is normal, the price is S₀ × e^r — the exponential of a normal variable, which is by definition lognormal. This is precisely why the lognormal distribution is used for prices: the return can be modelled as normal while the price it implies can never fall below zero.",
      ],
      // (b) difficulté : la propriété qui la rend inadaptée aux rendements
      [
        "Which property of the lognormal distribution makes it suitable for modelling asset prices but unsuitable for modelling asset returns?",
        [
          "It is symmetric about its mean.",
          "It is bounded below by zero.",
          "It has fatter tails than the normal distribution.",
        ],
        1,
        "A lognormal variable can never be negative, which matches an asset price — a price cannot fall below zero. That same bound disqualifies it for returns, which routinely are negative. The lognormal distribution is skewed to the right rather than symmetric, and its tail behaviour is not what governs the choice here.",
      ],

      // ---- Q53 — intervalle de prévision ---------------------------------
      // (a) angle : quel changement élargit l'intervalle
      [
        "All else being equal, which of the following most likely widens the prediction interval around a forecast from a simple linear regression?",
        [
          "Forecasting at a value of the independent variable close to its sample mean.",
          "Forecasting at a value of the independent variable far from its sample mean.",
          "Increasing the number of observations used to estimate the regression.",
        ],
        1,
        "The standard error of the forecast grows with the distance between the forecast value of X and the mean of X in the sample: the further out the forecast, the more any error in the estimated slope is magnified. Forecasting near the mean of X gives the narrowest interval, and a larger sample reduces the standard error rather than increasing it.",
      ],
      // (b) difficulté : pourquoi les deux erreurs types diffèrent
      [
        "The standard error of the forecast in a simple linear regression is larger than the standard error of the estimate because it additionally reflects:",
        [
          "the uncertainty in the estimated regression coefficients.",
          "the number of independent variables included in the model.",
          "the correlation between successive residuals.",
        ],
        0,
        "The standard error of the estimate captures only the dispersion of the observations around the fitted line. A forecast carries a second source of uncertainty: the intercept and slope are themselves estimates, so the fitted line could be misplaced. The standard error of the forecast combines both, which is why it is always the larger of the two.",
      ],

      // ---- Q55 — méthodes d'échantillonnage ------------------------------
      // (a) angle : identifier une autre méthode du même groupe
      [
        "A researcher divides a population of companies into subgroups by industry, then draws a random sample from each subgroup in proportion to that industry's weight in the population. This sampling method is best described as:",
        ["cluster sampling.", "stratified random sampling.", "systematic sampling."],
        1,
        "Stratified random sampling splits the population into strata, then samples randomly within each stratum, typically in proportion to the strata's weights. Cluster sampling instead selects whole groups at random and samples only within those groups. Systematic sampling takes every kth member of the population and involves no subgroups at all.",
      ],
      // (b) difficulté : l'effet sur la précision, pas la définition
      [
        "Compared with simple random sampling of the same sample size, stratified random sampling most likely:",
        [
          "reduces the sampling error of the estimate.",
          "increases the sampling error of the estimate.",
          "requires a larger sample to reach the same precision.",
        ],
        0,
        "By guaranteeing that each stratum is represented in proportion to the population, stratified sampling removes the risk that a random draw happens to over- or under-represent a subgroup. That eliminates a source of variability, so for a given sample size the estimate carries a smaller sampling error — which is exactly why the method is used.",
      ],

      // ---- Q59 — moyenne géométrique -------------------------------------
      // (a) angle : retrouver l'année manquante
      [
        "A portfolio returns 12%, –5% and 20% in its first three years. Its geometric mean return over the four years is 6.00%. The return in year 4 is closest to:",
        ["–3.0%.", "–1.1%.", "+1.1%."],
        1,
        "The four-year compounded factor must equal (1.06)⁴ = 1.2625. The first three years give 1.12 × 0.95 × 1.20 = 1.2768, so the year-4 factor is 1.2625 / 1.2768 = 0.9888, a return of about –1.1%. –3.0% comes from arithmetic thinking (4 × 6% = 24% against 12 – 5 + 20 = 27%), which does not hold for compounded returns.",
      ],
      // (b) difficulté : le lien entre l'écart des moyennes et la volatilité
      [
        "A portfolio's arithmetic mean annual return is 8.0% and its geometric mean annual return is 6.5%. The gap between the two is most likely explained by:",
        [
          "the volatility of the annual returns.",
          "an error in the calculation, since the two means must be equal.",
          "the portfolio having earned a positive return in every year.",
        ],
        0,
        "The geometric mean is always below the arithmetic mean unless every annual return is identical, and the gap widens with the dispersion of those returns — it is a direct consequence of volatility, not a mistake. A series of identical positive returns would make the two means equal, so uniformly positive returns do not by themselves create a gap.",
      ],

      // ---- Q69 — distribution de probabilité du BPA ----------------------
      // (a) angle : retrouver la probabilité à partir de l'espérance
      [
        "A company's EPS will be $20 with probability p and $35 with probability (1 – p). The expected EPS is $31.25. The value of p is closest to:",
        ["0.25.", "0.33.", "0.75."],
        0,
        "Set the expected value equal to $31.25: 20p + 35(1 – p) = 31.25, so 35 – 15p = 31.25 and p = 3.75 / 15 = 0.25. 0.75 is the probability of the $35 outcome rather than the $20 one; 0.33 would follow from splitting the $15 gap into thirds instead of solving the equation.",
      ],
      // (b) difficulté : trois issues, et l'écart-type plutôt que l'espérance
      [
        "An analyst estimates the following distribution for a company's EPS: $1.50 with probability 0.2, $2.00 with probability 0.5, and $3.00 with probability 0.3. The standard deviation of EPS is closest to:",
        ["$0.31.", "$0.48.", "$0.56."],
        2,
        "Expected EPS is 0.2($1.50) + 0.5($2.00) + 0.3($3.00) = $2.20. The variance is 0.2(–0.70)² + 0.5(–0.20)² + 0.3(0.80)² = 0.098 + 0.020 + 0.192 = 0.310, so the standard deviation is its square root, $0.56. $0.31 reports the variance itself; $0.48 is the mean absolute deviation, which weights the deviations without squaring them.",
      ],

      // ---- Q70 — mesures de tendance centrale -----------------------------
      // (a) angle : la robustesse à une valeur extrême
      [
        "A sample of six P/E ratios is 9, 11, 12, 14, 15 and 19. The largest observation is subsequently restated as 49. Which measure of central tendency is unchanged by the restatement?",
        ["The mean.", "The median.", "Both the mean and the median."],
        1,
        "The median is the average of the third and fourth ordered values, (12 + 14) / 2 = 13, and the restated observation is still the largest, so the ordering of the middle values is untouched — the median stays at 13. The mean rises from 80 / 6 = 13.33 to 110 / 6 = 18.33, which is exactly why the median is preferred when a distribution contains extreme values.",
      ],
      // (b) difficulté : déduire l'ordre à partir de l'asymétrie
      [
        "For a distribution that is positively skewed, the relationship among the measures of central tendency is most likely:",
        ["mean > median > mode.", "mode > median > mean.", "median > mean > mode."],
        0,
        "Positive skew means a long right tail, and the mean is the measure most sensitive to extreme values, so it is pulled furthest toward that tail. The mode stays at the peak on the left and the median sits between the two, giving mean > median > mode. The reverse ordering describes a negatively skewed distribution.",
      ],

      // ---- Q75 — test d'hypothèse sur une régression ---------------------
      // (a) angle : tester une valeur précise et non la nullité
      [
        "An analyst regresses a country's short-term interest rate on its inflation rate using 35 monthly observations, obtaining a slope coefficient of 1.1300 with a standard error of 0.1806. Using a two-sided critical t-value of ±2.733 at the 1% level of significance, the null hypothesis that the slope equals 1.00 is most likely:",
        [
          "rejected, because the test statistic exceeds the critical value.",
          "not rejected, because the test statistic is 0.72.",
          "not rejected, because the estimated slope is greater than 1.00.",
        ],
        1,
        "The test statistic measures the distance from the hypothesized value, not from zero: t = (1.1300 – 1.00) / 0.1806 = 0.72. Since 0.72 sits well inside ±2.733, the null is not rejected. The same coefficient easily rejects a null of zero (t = 6.26) — whether a slope is significant depends entirely on what it is being tested against.",
      ],
      // (b) difficulté : le même test appliqué à la constante
      [
        "For the same regression the intercept is –0.5778 with a standard error of 0.3479. Using a two-sided critical t-value of ±2.733 at the 1% level of significance, the null hypothesis that the intercept equals zero is most likely:",
        [
          "rejected, because the estimated intercept is negative.",
          "not rejected, because the test statistic is –1.66.",
          "not rejected, because an intercept can never differ significantly from zero.",
        ],
        1,
        "The test statistic is t = –0.5778 / 0.3479 = –1.66, whose absolute value falls short of the critical 2.733, so the null is not rejected at the 1% level. The sign of a coefficient says nothing about its significance, and an intercept certainly can differ significantly from zero — here the evidence is simply too weak.",
      ],

      // ---- Q76 — choix de la statistique de test -------------------------
      // (a) angle : un autre paramètre testé
      [
        "Which test statistic is most appropriate for a hypothesis test concerning the equality of the variances of two normally distributed populations?",
        ["t-statistic", "F-statistic", "Chi-square statistic"],
        1,
        "A test comparing two population variances uses the ratio of the two sample variances, which follows an F-distribution. The chi-square statistic applies to a hypothesis about a single population variance, and the t-statistic to hypotheses about means.",
      ],
      // (b) difficulté : appariées ou indépendantes
      [
        "An analyst compares the returns of the same 30 funds before and after a change in regulation. The most appropriate test is a:",
        [
          "t-test on the mean of the differences between the paired observations.",
          "t-test on the difference between two independent sample means.",
          "chi-square test of independence.",
        ],
        0,
        "Because the same 30 funds are observed in both periods, the two samples are not independent — each fund acts as its own control. The correct procedure computes the difference for each fund and tests whether the mean of those differences is zero, a paired comparisons test. Treating the samples as independent discards the pairing and overstates the standard error.",
      ],

      // ---- Q80 — rendement en composition continue -----------------------
      // (a) angle : le calculer à partir de deux prix
      [
        "A stock's price rises from $50 to $56 over one year. The continuously compounded annual return is closest to:",
        ["11.3%.", "12.0%.", "12.7%."],
        0,
        "The continuously compounded return is the natural logarithm of the price relative: ln($56 / $50) = ln(1.12) = 11.3%. 12.0% is the holding period return itself; 12.7% applies the exponential in the wrong direction (e^0.12 – 1). The continuously compounded return is always below the holding period return when that return is positive.",
      ],
      // (b) difficulté : faire la conversion inverse
      [
        "A portfolio's continuously compounded return over one year is 9.0%. The equivalent holding period return is closest to:",
        ["8.6%.", "9.0%.", "9.4%."],
        2,
        "Converting back requires the exponential: HPR = e^0.09 – 1 = 1.0942 – 1 = 9.4%. 8.6% applies the logarithm instead (ln 1.09), which is the transform in the wrong direction; 9.0% would hold only if the two measures coincided, which happens just in the limit as the return approaches zero.",
      ],

      // ---- Q86 — mesures de dispersion et degrés de liberté --------------
      // (a) angle : la raison du n – 1, pas son nom
      [
        "The sample variance uses n – 1 rather than n in its denominator in order to:",
        [
          "produce an unbiased estimator of the population variance.",
          "ensure the sample variance is always smaller than the population variance.",
          "express the dispersion in the same unit of measurement as the observations.",
        ],
        0,
        "Deviations are measured from the sample mean rather than from the unknown population mean, which makes the sum of squared deviations systematically too small. Dividing by n – 1 instead of n corrects that downward bias, so the sample variance becomes an unbiased estimator. Dividing by the smaller number makes the estimate larger, not smaller, and no choice of denominator changes the units — a variance is in squared units either way.",
      ],
      // (b) difficulté : le calculer, avec le bon dénominateur
      [
        "A sample of five observations is 4, 7, 9, 10 and 15. The sample standard deviation is closest to:",
        ["3.63.", "4.06.", "16.50."],
        1,
        "The mean is 45 / 5 = 9, and the squared deviations are 25, 4, 0, 1 and 36, summing to 66. The sample variance divides by n – 1 = 4, giving 16.50, and the standard deviation is its square root, 4.06. 3.63 divides by n = 5, which is the population formula; 16.50 is the variance reported without taking the square root.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — Quant...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
