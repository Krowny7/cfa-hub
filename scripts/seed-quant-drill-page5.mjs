// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Quantitative
// Methods (Hypothesis Testing · Tests of Independence, Readings 8 et 9 de la
// fiche, même numérotation que la banque de pratique).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Quantitative Methods, bonne réponse vérifiée contre le
// corrigé officiel "- Answers") + 1 variante "angle différent" (même notion,
// mais jamais un simple changement de chiffres menant au même raisonnement)
// + 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés / notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Questions en anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R8 Q23, Q28, Q25 et Q5, R9 Q3) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-quant-drill-page5.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Quantitative Methods (Système)";

const QUIZ_SETS = [
  {
    title: "Quantitative Methods — Drill Fiche Page 5 (Hypothesis Testing · Tests of Independence)",
    difficulty: 2,
    questions: [
      // Concept 1 — Démarche du test : statistique de test d'une moyenne (officielle — R8 Q2)
      [
        "A survey is taken to determine whether the average starting salaries of CFA charterholders is equal to or greater than $54,000 per year. Assuming a normal distribution, what is the test statistic given a sample of 75 newly acquired CFA charterholders with a mean starting salary of $57,000 and a standard deviation of $1,300?",
        ["-19.99.", "19.99.", "2.31."],
        1,
        "Statistique de test = (moyenne d'échantillon - moyenne sous H0) / (s / n^0,5) = (57 000 - 54 000) / (1 300 / 75^0,5) = 3 000 / 150,1 = 19,99. B est donc correct. A est faux : le signe est inversé ; la moyenne d'échantillon (57 000) est au-dessus de la valeur testée (54 000), la statistique est donc positive. C est faux : 2,31 = 3 000 / 1 300 divise par l'écart-type au lieu de l'erreur type (on oublie de diviser s par la racine de n).",
      ],
      // Variante angle différent — calcul inversé : la plus petite moyenne d'échantillon qui fait rejeter H0 (test unilatéral)
      [
        "An analyst tests H0: μ ≤ 2% versus Ha: μ > 2% at the 5% significance level using a z-test. The sample has 100 observations and a standard deviation of 5%. The smallest sample mean that would lead the analyst to reject the null hypothesis is closest to:",
        ["2.82%.", "2.98%.", "10.23%."],
        0,
        "Calcul inversé : au lieu de calculer la statistique à partir de la moyenne, on cherche la moyenne qui atteint la valeur critique. Test unilatéral à droite à 5 % : z critique = 1,645. Erreur type = 5 % / 100^0,5 = 0,5 %. On rejette si (moyenne - 2 %) / 0,5 % > 1,645, soit une moyenne supérieure à 2 % + 1,645 x 0,5 % = 2,82 %. A est donc correct. B est faux : 2,98 % utilise 1,96, la valeur critique d'un test bilatéral à 5 % ; ici Ha ne regarde qu'un côté (μ > 2 %), donc tout α est dans la queue droite. C est faux : 10,23 % = 2 % + 1,645 x 5 % multiplie par l'écart-type au lieu de l'erreur type (oubli de la division par la racine de n).",
      ],
      // Variante plus difficile — formuler H0, calculer t, choisir la bonne valeur critique, puis significativité économique (coûts)
      [
        "A strategy earned a mean monthly excess return of 0.40% over 36 months, with a standard deviation of 1.2%. An analyst tests whether the true mean excess return is greater than zero at the 5% significance level. The critical t-values for 35 degrees of freedom are 1.690 (one-tailed) and 2.030 (two-tailed). Implementing the strategy costs 0.45% per month in trading costs. The analyst should conclude that the result is:",
        [
          "not statistically significant, because the t-statistic of 2.00 is below the critical value of 2.030.",
          "statistically and economically significant, because the t-statistic of 2.00 exceeds the critical value of 1.690.",
          "statistically significant but not economically significant, because the t-statistic of 2.00 exceeds 1.690 but trading costs exceed the mean excess return.",
        ],
        2,
        "Étape 1, hypothèses : on cherche à montrer que le rendement est positif, donc H0 : μ ≤ 0 et Ha : μ > 0 (H0 contient l'égalité) ; le test est unilatéral à droite. Étape 2, statistique : t = (0,40 - 0) / (1,2 / 36^0,5) = 0,40 / 0,20 = 2,00. Étape 3, décision statistique : 2,00 > 1,690, on rejette H0 ; le rendement excédentaire est statistiquement significatif. Étape 4, décision économique : les coûts de transaction (0,45 % par mois) dépassent le rendement excédentaire moyen (0,40 %), la stratégie perd donc de l'argent une fois mise en œuvre. C est donc correct. A est faux : il prend la valeur critique bilatérale (2,030) alors que Ha est unilatérale. B est faux : la significativité statistique ne suffit pas ; coûts de transaction, impôts et risque peuvent rendre inexploitable un effet statistiquement significatif.",
      ],

      // Concept 2 — Erreurs, power & p-value : augmenter la puissance du test (officielle — R8 Q11)
      [
        'Lucy James, CFA, is constructing a hypothesis test using a 5% level of significance. If she is interested in increasing the "power of the test," she should consider:',
        [
          "lowering the level of significance.",
          "keeping the significance level the same and increasing the sample size.",
          "increasing the probability of a Type II error.",
        ],
        1,
        "La puissance du test (1 - probabilité d'une erreur de type II) est la probabilité de rejeter une H0 fausse. À seuil de signification inchangé, augmenter la taille de l'échantillon réduit l'erreur type, donc le risque d'erreur de type II, et accroît la puissance. B est donc correct. A est faux : baisser le seuil de signification réduit le risque d'erreur de type I mais augmente celui d'erreur de type II, ce qui diminue la puissance. C est faux : augmenter la probabilité d'une erreur de type II diminue directement la puissance.",
      ],
      // Variante angle différent — interpréter une p-value (règle p-value < α, et ce qu'elle n'est pas)
      [
        "A hypothesis test produces a p-value of 0.032. Which of the following statements is most accurate?",
        [
          "The null hypothesis is rejected at the 5% significance level but not at the 1% significance level.",
          "There is a 3.2% probability that the null hypothesis is true.",
          "The null hypothesis is rejected at both the 5% and the 1% significance levels.",
        ],
        0,
        "La p-value est le plus petit seuil de signification auquel on peut rejeter H0. Règle : rejeter si p-value < α. Ici, 0,032 < 0,05 : on rejette à 5 % ; mais 0,032 > 0,01 : on ne rejette pas à 1 %. A est donc correct. C est faux pour la même raison : au seuil de 1 %, la p-value dépasse α. B est faux : c'est l'erreur d'interprétation classique ; la p-value est la probabilité d'obtenir une statistique au moins aussi extrême que celle observée si H0 était vraie, pas la probabilité que H0 soit vraie.",
      ],
      // Variante plus difficile — décision par la p-value, type d'erreur commise et puissance (piège 1 - α)
      [
        "An analyst tests a null hypothesis at the 5% significance level and obtains a p-value of 0.08. The probability of a Type II error for this test was 30%. It is later established that the null hypothesis was false. The analyst's decision and the power of the test are best described as:",
        [
          "the analyst rejected the null, a correct decision; the power of the test was 70%.",
          "the analyst failed to reject the null, a Type I error; the power of the test was 95%.",
          "the analyst failed to reject the null, a Type II error; the power of the test was 70%.",
        ],
        2,
        "Étape 1, décision : p-value 0,08 > α 0,05, l'analyste ne rejette pas H0. Étape 2, nature de l'erreur : ne pas rejeter une H0 fausse est une erreur de type II (rejeter une H0 vraie serait une erreur de type I). Étape 3, puissance : power = 1 - P(type II) = 1 - 0,30 = 70 %, c'est la probabilité de rejeter H0 quand elle est fausse. C est donc correct. A est faux : avec une p-value supérieure à α, on ne rejette pas H0 ; il aurait fallu une p-value inférieure à 0,05. B est faux deux fois : une erreur de type I consiste à rejeter une H0 vraie, et 95 % = 1 - α est la probabilité de ne pas rejeter une H0 vraie (le niveau de confiance), pas la puissance.",
      ],

      // Concept 3 — Quel test ? Test F d'égalité de deux variances (officielle — R8 Q30)
      [
        "A data analyst compares the P/E ratios for two companies over a period of 20 years and calculates a two-tailed F-statistic that exceeds the critical F-statistic value. As a result of her findings, she will:",
        [
          "not reject the null hypothesis that the P/E ratio variances between the two companies are significantly different.",
          "reject the null hypothesis that the P/E ratio variances between the two companies are significantly different.",
          "reject the null hypothesis that the P/E ratio variances between the two companies are not significantly different.",
        ],
        2,
        "Le test F compare deux variances. En bilatéral, H0 : les variances sont égales (pas significativement différentes) et Ha : elles sont différentes. Une statistique F supérieure à la valeur critique conduit à rejeter H0, c'est-à-dire l'hypothèse que les variances ne sont pas significativement différentes. C est donc correct. A et B sont faux : ils placent dans H0 l'hypothèse de variances différentes, qui est en réalité l'hypothèse alternative.",
      ],
      // Variante angle différent — choisir le test : échantillons dépendants (paired comparisons) plutôt que différence de moyennes ou test F
      [
        "An analyst wants to test whether the mean monthly returns of two oil producers differed over the same 60 months. Both stocks' returns are driven largely by the price of crude oil. The most appropriate test is a:",
        [
          "t-test of the mean of the monthly return differences (paired comparisons test).",
          "t-test of the difference between two means using a pooled variance estimate.",
          "F-test of the ratio of the two sample variances.",
        ],
        0,
        "Les deux séries sont observées aux mêmes dates et dépendent d'un même facteur (le prix du pétrole) : les échantillons sont dépendants. On calcule donc la différence de rendement mois par mois et on teste si la moyenne de ces différences vaut zéro : t = (moyenne des différences - 0) / (sd / n^0,5), avec n - 1 = 59 degrés de liberté. A est donc correct. B est faux : le test de différence de moyennes avec variance poolée suppose des échantillons indépendants, ce qui n'est pas le cas ici ; il ignorerait la corrélation entre les deux séries. C est faux : le test F compare deux variances, pas deux moyennes.",
      ],
      // Variante plus difficile — test F complet : rapport des variances, degrés de liberté, valeur critique bilatérale (α/2), données-pièges
      [
        "An analyst tests whether two independent, normally distributed populations of monthly returns have equal variances, using a two-tailed test at the 5% significance level. Fund X: 25 observations, sample standard deviation 5.0%. Fund Y: 31 observations, sample standard deviation 3.5%. Critical values of the F-distribution are: F(24, 30) upper 2.5% = 2.136; F(24, 30) upper 5% = 1.887; F(30, 24) upper 2.5% = 2.209. The F-statistic and the analyst's decision are:",
        [
          "F = 2.04; reject the null hypothesis of equal variances.",
          "F = 2.04; fail to reject the null hypothesis of equal variances.",
          "F = 1.43; fail to reject the null hypothesis of equal variances.",
        ],
        1,
        "Étape 1, statistique : F = plus grande variance / plus petite variance = 5,0² / 3,5² = 25 / 12,25 = 2,04, avec 24 degrés de liberté au numérateur (25 - 1, fonds X) et 30 au dénominateur (31 - 1, fonds Y). Étape 2, valeur critique : en bilatéral à 5 %, la grande variance étant au numérateur, seule la valeur critique de droite compte, au seuil α/2 = 2,5 % : F(24, 30) = 2,136. Étape 3, décision : 2,04 < 2,136, on ne rejette pas H0. B est donc correct. A est faux : il compare 2,04 à 1,887, la valeur critique unilatérale à 5 %, alors que le test est bilatéral. C est faux : 1,43 = 5,0 / 3,5 est un rapport d'écarts-types ; le test F porte sur le rapport des variances (la décision est la même, mais par hasard). F(30, 24) = 2,209 est une donnée-piège : ses degrés de liberté sont inversés.",
      ],

      // Concept 4 — Parametric vs nonparametric tests (officielle — R8 Q3)
      [
        "A test of whether a mutual fund's performance rank in one period provides information about the fund's performance rank in a subsequent period is best described as a:",
        ["mean-rank test.", "nonparametric test.", "parametric test."],
        1,
        "Comparer des rangs de performance d'une période à l'autre revient à un test de corrélation de rangs (Spearman) : il porte sur des rangs, pas sur un paramètre d'une distribution, et ne suppose pas de loi particulière. C'est un test non paramétrique. B est donc correct. C est faux : un test paramétrique porte sur un paramètre (moyenne, variance) et repose sur des hypothèses de distribution. A est faux : « mean-rank test » n'est pas une catégorie de test.",
      ],
      // Variante angle différent — ce qui NE justifie PAS un test non paramétrique (cas où le test paramétrique s'impose)
      [
        "Using a nonparametric test is least appropriate when:",
        [
          "the data are available only as ranks.",
          "the sample is small and the population is clearly not normally distributed.",
          "the hypothesis concerns the variance of a normally distributed population.",
        ],
        2,
        "Les tests non paramétriques reposent sur peu d'hypothèses de distribution. On les utilise quand les hypothèses d'un test paramétrique ne tiennent pas (petit échantillon tiré d'une population non normale, B), quand les données sont des rangs (échelle ordinale, A), ou quand l'hypothèse ne porte pas sur un paramètre (runs test : une série est-elle aléatoire ?). C est la situation où un test non paramétrique est le moins approprié, donc la bonne réponse : l'hypothèse porte sur un paramètre (une variance) d'une population normale, c'est le terrain du test paramétrique du chi-deux, χ² = (n - 1) s² / σ0², avec n - 1 degrés de liberté.",
      ],
      // Variante plus difficile — calcul du Spearman rank correlation avec des ex æquo (rang moyen), pièges du départage et du facteur 6
      [
        "An analyst ranks five funds by return in Year 1 and in Year 2 (rank 1 = highest return). Year 1 returns: Fund A 12%, Fund B 9%, Fund C 9%, Fund D 5%, Fund E 2%. Year 2 ranks: A 2, B 1, C 3, D 5, E 4. Using the standard formula, with tied observations assigned the average of their ranks, the Spearman rank correlation coefficient is closest to:",
        ["0.725.", "0.800.", "0.954."],
        0,
        "Étape 1, rangs de l'année 1 : A = 1 ; B et C sont ex æquo aux places 2 et 3, chacun reçoit le rang moyen 2,5 ; D = 4 ; E = 5. Étape 2, écarts de rangs d (année 1 - année 2) : A 1 - 2 = -1 ; B 2,5 - 1 = 1,5 ; C 2,5 - 3 = -0,5 ; D 4 - 5 = -1 ; E 5 - 4 = 1. Somme des d² = 1 + 2,25 + 0,25 + 1 + 1 = 5,5. Étape 3, rS = 1 - 6 x 5,5 / [5 x (5² - 1)] = 1 - 33 / 120 = 0,725. A est donc correct. B est faux : 0,800 départage arbitrairement les ex æquo (B = 2, C = 3), d'où une somme des d² de 4 et 1 - 24 / 120. C est faux : 0,954 oublie le facteur 6 au numérateur (1 - 5,5 / 120). Le Spearman est un test non paramétrique : il ne travaille que sur les rangs et ne suppose aucune loi pour les rendements.",
      ],

      // Concept 5 — Contingency table : test d'indépendance du chi-deux (officielle — R9 Q5)
      [
        "In a test of independence based on contingency table data, degrees of freedom are the:",
        [
          "sum of the number of rows and the number of columns.",
          "product of the number of rows minus one and the number of columns, minus one.",
          "sum of the number of rows and the number of columns, minus two.",
        ],
        1,
        "Dans un test d'indépendance sur un tableau de contingence (statistique du chi-deux), le nombre de degrés de liberté est (r - 1) x (c - 1), où r et c sont les nombres de lignes et de colonnes. B est donc correct : pour un tableau de 3 lignes et 4 colonnes, df = 2 x 3 = 6. A et C sont faux : on multiplie (r - 1) par (c - 1) ; on n'additionne pas les nombres de lignes et de colonnes.",
      ],
      // Variante angle différent — le « pourquoi » de l'effectif attendu sous H0 (produit des probabilités marginales)
      [
        "A contingency table classifies 200 stocks by size (large or small) and by dividend yield (low, medium or high). There are 80 large stocks and 50 high-yield stocks. Under the null hypothesis that size and dividend yield are independent, the expected number of large, high-yield stocks is:",
        ["25.0.", "33.3.", "20.0."],
        2,
        "Sous H0 d'indépendance, la probabilité d'être à la fois une grande capitalisation et un titre à haut rendement est le produit des probabilités marginales : (80 / 200) x (50 / 200) = 0,40 x 0,25 = 0,10. Effectif attendu = 0,10 x 200 = 20, ce qui revient à la formule Eij = (total de la ligne i x total de la colonne j) / total = 80 x 50 / 200 = 20. C est donc correct. A est faux : 25 répartit les 50 titres à haut rendement à parts égales entre grandes et petites capitalisations, en oubliant que les grandes ne représentent que 40 % de l'échantillon. B est faux : 33,3 = 200 / 6 suppose le même effectif dans les 6 cases, sans tenir compte des totaux de ligne et de colonne.",
      ],
      // Variante plus difficile — test du chi-deux complet sur un tableau 2 x 2 : effectifs attendus, statistique, df et queue droite
      [
        "Analysts classify 100 companies by earnings growth (above or below the median) and by dividend yield (high or low). Observed counts are: high growth and high yield, 22; high growth and low yield, 28; low growth and high yield, 33; low growth and low yield, 17. Critical chi-square values are: 3.841 (1 degree of freedom, 5% right tail), 5.024 (1 degree of freedom, 2.5% right tail) and 7.815 (3 degrees of freedom, 5% right tail). Testing at the 5% significance level whether earnings growth and dividend yield are independent, the analyst should:",
        [
          "reject independence, because the test statistic of about 4.89 exceeds 3.841.",
          "fail to reject independence, because the test statistic of about 4.89 is below 7.815.",
          "fail to reject independence, because the test statistic of about 4.89 is below 5.024.",
        ],
        0,
        "Étape 1, totaux : 50 sociétés à forte croissance et 50 à faible croissance ; 55 à haut rendement et 45 à bas rendement. Étape 2, effectifs attendus Eij = total ligne x total colonne / 100 : 27,5 (haut rendement) et 22,5 (bas rendement) sur chaque ligne. Étape 3, χ² = Σ (O - E)² / E = (22 - 27,5)² / 27,5 + (28 - 22,5)² / 22,5 + (33 - 27,5)² / 27,5 + (17 - 22,5)² / 22,5 = 1,100 + 1,344 + 1,100 + 1,344 = 4,89. Étape 4, degrés de liberté = (r - 1)(c - 1) = 1 x 1 = 1 ; le test d'indépendance est unilatéral à droite, valeur critique 3,841. 4,89 > 3,841 : on rejette H0, la croissance des bénéfices et le rendement du dividende ne sont pas indépendants. A est donc correct. B est faux : 3 degrés de liberté correspondent au nombre de cases moins 1, pas à (r - 1)(c - 1). C est faux : 5,024 est la valeur critique d'un test bilatéral (2,5 % par queue) ; le test d'indépendance ne rejette que pour de grandes valeurs de χ², donc tout α est dans la queue droite.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Quantitative Methods Page 5...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
