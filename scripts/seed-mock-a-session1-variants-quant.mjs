// Variantes (2 par question) pour "Mock A — Session 1 — Méthodes Quantitatives".
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Méthodes Quantitatives — Variantes",
    difficulty: 2,
    questions: [
      // Q33 — account balance with cash flow + return
      [
        "An investor has the following cash flows and returns for a new account: Year 1: $5,000 deposit at the beginning of the year, return for the year –10%. Year 2: $500 withdrawal at the beginning of the year, return for the year 15%. The account balance at the end of the second year is closest to:",
        ["$4,600.", "$5,175.", "$5,750."],
        0,
        "The $5,000 deposit declines to $4,500 = $5,000 × (1 – 0.10) before the $500 withdrawal, leaving $4,000, which then grows to $4,600 = $4,000 × (1 + 0.15). $5,175 forgets to deduct the withdrawal; $5,750 adds it instead of subtracting it.",
      ],
      [
        "An investor has the following cash flows and returns for a new account: Year 1: £8,000 deposit at the beginning of the year, return for the year +12%. Year 2: £2,000 withdrawal at the beginning of the year, return for the year –5%. The account balance at the end of the second year is closest to:",
        ["£6,612.", "£8,512.", "£10,412."],
        0,
        "The £8,000 deposit grows to £8,960 = £8,000 × 1.12 before the £2,000 withdrawal, leaving £6,960, which then falls to £6,612 = £6,960 × (1 – 0.05). £8,512 forgets to deduct the withdrawal; £10,412 adds it instead of subtracting it.",
      ],
      // Q35 — machine learning
      [
        "Which of the following statements about machine learning applications in investment research is most accurate?",
        [
          "ML eliminates the need for human judgment in selecting the appropriate technique.",
          "ML models still require the underlying data to be clean and free of bias before they can be used effectively.",
          "ML performs equally well regardless of how much training data is available.",
        ],
        1,
        "Machine learning still requires human judgment in understanding the data and choosing appropriate techniques — the data must be cleaned and free of biases and spurious observations before use. ML also generally needs sufficiently large datasets to train and validate models.",
      ],
      [
        "A key limitation of machine learning techniques when applied to Big Data in investment analysis is that they:",
        [
          "cannot be used to analyze image or satellite data.",
          "always outperform traditional statistical methods regardless of context.",
          "still require sufficiently large, clean datasets to train and validate the model effectively.",
        ],
        2,
        "ML models require sufficiently large amounts of clean data and may not perform well when too little data is available to train and validate them — human judgment is still needed to prepare the data and select techniques, and ML does not always outperform traditional methods.",
      ],
      // Q39 — HPR over two 6-month periods
      [
        "If a security appreciates by 20% over the first six months and then depreciates by 10% over the following six months, the holding period return over the 12-month period is closest to:",
        ["3.9%.", "8.0%.", "10.0%."],
        1,
        "The 12-month HPR compounds the two six-month HPRs: (1 + 0.20)(1 – 0.10) – 1 = 1.08 – 1 = 8.0%. 3.9% is the geometric mean of the two HPRs (√[(1.20)(0.90)] – 1), and 10.0% is their simple sum (20% – 10%) — neither is the actual compounded return.",
      ],
      [
        "If a security appreciates by 30% over the first six months and then depreciates by 10% over the following six months, the holding period return over the 12-month period is closest to:",
        ["8.2%.", "17.0%.", "20.0%."],
        1,
        "The 12-month HPR compounds the two six-month HPRs: (1 + 0.30)(1 – 0.10) – 1 = 1.17 – 1 = 17.0%. 20.0% is the simple sum (30% – 10%), and 8.2% is the geometric mean of the two HPRs — neither equals the true compounded 12-month return.",
      ],
      // Q41 — Spearman rank correlation
      [
        "For a sample size of 8 and a sum of squared differences in ranks of 40, the Spearman rank correlation is closest to:",
        ["0.48.", "0.52.", "0.94."],
        1,
        "rs = 1 – [6 × 40] / [8 × (8² – 1)] = 1 – 240/504 = 1 – 0.476 = 0.524 ≈ 0.52. Forgetting the '1 –' gives 0.48; using n² instead of n in the denominator's first factor gives ≈ 0.94.",
      ],
      [
        "For a sample size of 12 and a sum of squared differences in ranks of 200, the Spearman rank correlation is closest to:",
        ["0.30.", "0.70.", "0.94."],
        0,
        "rs = 1 – [6 × 200] / [12 × (12² – 1)] = 1 – 1200/1716 = 1 – 0.699 = 0.301 ≈ 0.30. Forgetting the '1 –' gives ≈ 0.70; using n² instead of n in the denominator's first factor gives ≈ 0.94.",
      ],
      // Q43 — lognormal distribution
      [
        "The lognormal distribution is often preferred over the normal distribution for modeling asset prices mainly because it:",
        [
          "cannot take negative values, being bounded below by zero.",
          "is symmetric, just like the normal distribution.",
          "has a shorter right tail than the normal distribution.",
        ],
        0,
        "The lognormal distribution is bounded below by 0 and skewed to the right (long right tail) — a good match for asset prices, which can never be negative. The normal distribution, by contrast, spans the entire real line and is symmetric, which is a better approximation for returns than for prices.",
      ],
      [
        "Which property distinguishes the lognormal distribution from the normal distribution, making it more suitable for modeling asset prices?",
        [
          "It is defined by three parameters instead of two.",
          "It is skewed to the right and bounded below by zero.",
          "It assigns equal probability to positive and negative outcomes.",
        ],
        1,
        "Both distributions are fully defined by two parameters (mean and standard deviation), so that isn't the distinguishing feature. What matters for asset prices is that the lognormal distribution is bounded below by zero and skewed right, unlike the normal distribution, which allows negative values and is symmetric.",
      ],
      // Q53 — prediction interval / standard error of forecast
      [
        "Which of the following will most likely result in a narrower prediction interval around a regression forecast, all else equal?",
        [
          "A larger sample size used in the regression estimation.",
          "A smaller variation in the independent variable's historical values.",
          "A larger standard error of the estimate.",
        ],
        0,
        "The standard error of the forecast, sf = se√(1 + 1/n + (Xf – X̄)²/Σ(Xi – X̄)²), decreases as n increases — a larger sample size narrows the prediction interval. A smaller variation in X or a larger se would each widen it instead.",
      ],
      [
        "The standard error of the forecast used to construct a regression prediction interval will most likely decrease when:",
        [
          "the independent variable's historical variation decreases.",
          "the value being forecast is far from the independent variable's mean.",
          "the sample size used to estimate the regression increases.",
        ],
        2,
        "Since sf = se√(1 + 1/n + (Xf – X̄)²/Σ(Xi – X̄)²), a larger n reduces sf and narrows the prediction interval. A smaller variation in X, or forecasting far from the mean of X, would instead increase sf.",
      ],
      // Q55 — systematic sampling
      [
        "An analyst selects every 5th company from an alphabetically ordered list of 500 companies until reaching a sample of 100. This sampling method is best described as:",
        ["cluster sampling.", "systematic sampling.", "stratified random sampling."],
        1,
        "Systematic sampling selects every kth member of the population (here, k = 5) until the desired sample size is reached — unlike cluster sampling (dividing the population into representative subgroups) or stratified random sampling (drawing proportional samples from defined strata).",
      ],
      [
        "Which sampling method involves selecting every kth member of a population, starting from a randomly chosen point?",
        ["Stratified random sampling.", "Cluster sampling.", "Systematic sampling."],
        2,
        "Systematic sampling selects every kth member of the population until the sample is complete. Stratified random sampling draws proportional samples from predefined strata; cluster sampling divides the population into representative clusters and samples within them.",
      ],
      // Q59 — geometric mean return, 4 years
      [
        "Over a 4-year period, a portfolio has returns of 15%, –5%, 10%, and –8%. The geometric mean return across the period is closest to:",
        ["2.5%.", "3.0%.", "8.8%."],
        0,
        "RG = [(1.15)(0.95)(1.10)(0.92)]^0.25 – 1 ≈ (1.1056)^0.25 – 1 ≈ 2.5%. 3.0% is the simple arithmetic average (15 – 5 + 10 – 8)/4; 8.8% comes from taking the fourth root of the product of the raw percentage numbers (an invalid calculation, since it never adds 1 to each return first).",
      ],
      [
        "Over a 4-year period, a portfolio has returns of 8%, –3%, –2%, and 6%. The geometric mean return across the period is closest to:",
        ["2.1%.", "2.3%.", "4.1%."],
        0,
        "RG = [(1.08)(0.97)(0.98)(1.06)]^0.25 – 1 ≈ (1.0883)^0.25 – 1 ≈ 2.1%. 2.3% is the simple arithmetic average (8 – 3 – 2 + 6)/4; 4.1% comes from taking the fourth root of the product of the raw percentage numbers, which is not a valid return calculation.",
      ],
      // Q69 — standard deviation of EPS
      [
        "An analyst gathers the following probability distribution of a company's EPS: P=0.3, EPS=$15.0; P=0.7, EPS=$25.0. The standard deviation of EPS is closest to:",
        ["$4.58.", "$5.00.", "$21.00."],
        0,
        "E(EPS) = 0.3×$15 + 0.7×$25 = $22.0. Variance = 0.3×(15–22)² + 0.7×(25–22)² = 14.7 + 6.3 = 21.0, so SD = √21.0 ≈ $4.58. $5.00 wrongly uses a simple (unweighted) average of $15 and $25 as the expected value; $21.00 is the variance, not its square root.",
      ],
      [
        "An analyst gathers the following probability distribution of a company's EPS: P=0.2, EPS=$10.0; P=0.8, EPS=$18.0. The standard deviation of EPS is closest to:",
        ["$3.20.", "$4.00.", "$10.24."],
        0,
        "E(EPS) = 0.2×$10 + 0.8×$18 = $16.4. Variance = 0.2×(10–16.4)² + 0.8×(18–16.4)² = 8.192 + 2.048 = 10.24, so SD = √10.24 = $3.20. $4.00 wrongly uses a simple (unweighted) average of $10 and $18 as the expected value; $10.24 is the variance, not its square root.",
      ],
      // Q70 — median/mode/mean comparison
      [
        "An analyst gathers the following company P/E ratios: 7, 11, 3, 10, 7, 9. For the data given, the:",
        [
          "median is greater than the mode.",
          "mode is greater than the arithmetic mean.",
          "arithmetic mean is greater than the median.",
        ],
        0,
        "Sorted: 3, 7, 7, 9, 10, 11. Median = (7 + 9)/2 = 8. Mode = 7 (occurs twice). Mean = (7+11+3+10+7+9)/6 = 47/6 ≈ 7.83. The median (8) is greater than the mode (7); the mode (7) is not greater than the mean (7.83); the mean (7.83) is not greater than the median (8).",
      ],
      [
        "An analyst gathers the following company P/E ratios: 13, 2, 11, 10, 2, 12. For the data given, the:",
        [
          "median is greater than the mode.",
          "mode is greater than the arithmetic mean.",
          "arithmetic mean is greater than the median.",
        ],
        0,
        "Sorted: 2, 2, 10, 11, 12, 13. Median = (10 + 11)/2 = 10.5. Mode = 2 (occurs twice). Mean = (13+2+11+10+2+12)/6 = 50/6 ≈ 8.33. The median (10.5) is greater than the mode (2); the mode (2) is not greater than the mean (8.33); the mean (8.33) is not greater than the median (10.5).",
      ],
      // Q75 — regression hypothesis test (reject no linear relationship)
      [
        "An analyst runs a simple linear regression using 40 quarters of data. Results: Intercept = 0.4000 (SE 0.3500); Slope = 0.8500 (SE 0.2000). Critical t-values at a 5% level of significance: one-sided ±1.686, two-sided ±2.021. At a 95% confidence level, the analyst should reject the null hypothesis that:",
        [
          "there is no linear relationship between the two variables (the slope is zero).",
          "the intercept is zero.",
          "the slope is less than or equal to 0.70.",
        ],
        0,
        "t-stat for the slope vs. zero = 0.8500/0.2000 = 4.25, which exceeds the two-sided critical value of ±2.021 — reject. For the intercept, t = 0.4000/0.3500 ≈ 1.14, inside ±2.021 — fail to reject. For the one-sided test of slope ≤ 0.70, t = (0.85 – 0.70)/0.20 = 0.75, below the critical value of 1.686 — fail to reject.",
      ],
      [
        "An analyst runs a simple linear regression using 50 months of data. Results: Intercept = –0.3000 (SE 0.4000); Slope = 0.6000 (SE 0.1500). Critical t-values at a 5% level of significance: one-sided ±1.677, two-sided ±2.010. At a 95% confidence level, the analyst should reject the null hypothesis that:",
        [
          "the intercept is zero.",
          "there is no linear relationship between the two variables (the slope is zero).",
          "the slope is less than or equal to 0.40.",
        ],
        1,
        "t-stat for the slope vs. zero = 0.6000/0.1500 = 4.00, which exceeds the two-sided critical value of ±2.010 — reject. For the intercept, t = –0.3000/0.4000 = –0.75, inside ±2.010 — fail to reject. For the one-sided test of slope ≤ 0.40, t = (0.60 – 0.40)/0.15 = 1.33, below the critical value of 1.677 — fail to reject.",
      ],
      // Q76 — appropriate test statistic for paired mean differences
      [
        "An analyst wants to test whether the mean difference in returns between two paired investment strategies, applied to the same set of assets, is zero — assuming the differences are normally distributed with unknown population variance. Which test statistic is most appropriate?",
        ["t-statistic.", "F-statistic.", "Chi-square statistic."],
        0,
        "For a test of mean differences between paired observations from normally distributed populations with unknown variance, the appropriate test is a t-test: t = (d̄ – μd0)/sd, with n – 1 degrees of freedom. The F-statistic applies to tests of differences between two variances; the chi-square statistic applies to tests concerning the variance of a single population.",
      ],
      [
        "Which test statistic is used to test the mean difference between two normally distributed populations when paired observations are used and the population variance of the differences is unknown?",
        ["z-statistic.", "t-statistic.", "Chi-square statistic."],
        1,
        "With paired observations, unknown population variance, and normally distributed differences, the correct approach is a t-test on the sample mean difference (n – 1 degrees of freedom) — not a z-test (which requires a known population variance) or a chi-square test (used for single-population variance tests).",
      ],
      // Q80 — continuously compounded return
      [
        "A stock's price rises from $80 to $92 over one period, then from $92 to $100 over the next period. The continuously compounded return over the two periods combined is closest to:",
        ["11.2%.", "22.3%.", "25.0%."],
        1,
        "The continuously compounded return over multiple periods is the sum of the one-period continuously compounded returns: ln(92/80) + ln(100/92) = 0.1398 + 0.0834 = 0.2232 ≈ 22.3%. 25.0% is the simple holding period return (100/80 – 1); 11.2% is the (incorrect) average, rather than sum, of the two continuously compounded returns.",
      ],
      [
        "Which of the following statements about the continuously compounded return is most accurate? The continuously compounded return:",
        [
          "is always higher than the holding period return over the same period.",
          "over multiple periods equals the sum of the one-period continuously compounded returns.",
          "cannot be computed when the holding period return is negative.",
        ],
        1,
        "The continuously compounded return to time T is the sum of the one-period continuously compounded returns. It is actually lower than the holding period return for the same period (since ln(1+R) < R for R > 0), and it can always be computed even for a negative holding period return, since the price ratio St+1/St remains positive.",
      ],
      // Q86 — dispersion measures / degrees of freedom
      [
        "For a sample of 25 observations, the number of degrees of freedom used when estimating the population variance from the sample variance is:",
        ["24.", "25.", "26."],
        0,
        "In the sample variance formula, the denominator is n – 1, also known as the number of degrees of freedom used in estimating the population variance. For n = 25, that is 25 – 1 = 24.",
      ],
      [
        "Which of the following statements about the sample variance is most accurate?",
        [
          "The sample variance is expressed in the same unit of measurement as the observations.",
          "The denominator (n – 1) represents the degrees of freedom used in estimating the population variance.",
          "The sample standard deviation is always larger than the sample variance.",
        ],
        1,
        "The sample variance's denominator, n – 1, is the number of degrees of freedom used in estimating the population variance. Variance itself is measured in squared units (not the same unit as the observations — that's the standard deviation), and whether the standard deviation exceeds the variance depends on the data's scale, not a general rule.",
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
