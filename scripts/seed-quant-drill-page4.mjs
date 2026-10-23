// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Quantitative
// Methods (Portfolio Mathematics · Simulation · Estimation & Inference,
// Readings 5, 6 et 7 de la fiche, même numérotation que la banque de pratique).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Quantitative Methods, bonne réponse vérifiée contre le
// corrigé officiel "- Answers" ; R7 n'a pas de corrigé dans la banque : la
// réponse de R7 Q2 est vérifiée par la théorie du stratified sampling)
// + 1 variante "angle différent" (même notion, mais jamais un simple changement
// de chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R5 Q28, Q16 et Q20, R6 Q5, R7 Q16) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-quant-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Quantitative Methods (Système)";

const QUIZ_SETS = [
  {
    title: "Quantitative Methods — Drill Fiche Page 4 (Portfolio Mathematics · Simulation · Estimation & Inference)",
    difficulty: 2,
    questions: [
      // Concept 1 — Portfolio return & variance : écart-type d'un portefeuille de deux actifs (officielle — R5 Q30)
      [
        "What is the standard deviation of a portfolio if you invest 30% in stock one (standard deviation of 4.6%) and 70% in stock two (standard deviation of 7.8%) if the correlation coefficient for the two stocks is 0.45?",
        ["6.20%.", "0.38%.", "6.83%."],
        0,
        "Var(Rp) = w1² σ1² + w2² σ2² + 2 w1 w2 ρ σ1 σ2 = 0,09 x 0,046² + 0,49 x 0,078² + 2 x 0,30 x 0,70 x 0,45 x 0,046 x 0,078 = 0,000190 + 0,002981 + 0,000678 = 0,003850. Écart-type = 0,003850^0,5 = 6,20 %. A est donc correct. C est faux : 6,83 % correspond à peu près à la moyenne pondérée des écarts-types (0,30 x 4,6 + 0,70 x 7,8 = 6,84 %), qui ne vaut que pour une corrélation parfaite (+1) ; avec ρ = 0,45, la diversification réduit le risque. B est faux : 0,38 % est la variance (0,00385) lue à tort comme un écart-type.",
      ],
      // Variante angle différent — calcul inversé : retrouver la corrélation à partir de l'écart-type du portefeuille
      [
        "An equally weighted portfolio combines Stock A (standard deviation 10%) and Stock B (standard deviation 20%). If the portfolio's standard deviation is 13%, the correlation between the returns of the two stocks is closest to:",
        ["0.88.", "-0.81.", "0.44."],
        2,
        "Calcul inversé : on part de σp et on remonte à ρ. σp² = wA² σA² + wB² σB² + 2 wA wB ρ σA σB, soit 0,13² = 0,0169 = 0,25 x 0,01 + 0,25 x 0,04 + 2 x 0,5 x 0,5 x ρ x 0,10 x 0,20 = 0,0025 + 0,0100 + 0,01 ρ. D'où 0,01 ρ = 0,0044 et ρ = 0,44. C est donc correct. Contrôle de cohérence : 13 % est inférieur à la moyenne pondérée des écarts-types (15 %, cas ρ = +1), donc ρ < 1, mais supérieur à l'écart-type obtenu avec ρ = 0 (0,0125^0,5 = 11,2 %), donc ρ > 0. A est faux : 0,88 oublie le facteur 2 du terme de covariance (0,005 ρ = 0,0044). B est faux : -0,81 vient de poids non élevés au carré (0,5 x 0,01 + 0,5 x 0,04 = 0,025, plus que 0,0169, ce qui force une corrélation négative).",
      ],
      // Variante plus difficile — portefeuille de 3 actifs : covariances à partir des corrélations, n(n - 1)/2 paires, facteur 2
      [
        "A portfolio is invested 50% in Asset A, 30% in Asset B and 20% in Asset C. The standard deviations of returns are 20% for A, 15% for B and 10% for C. The correlations are 0.4 between A and B, 0.2 between A and C, and -0.1 between B and C. The standard deviation of the portfolio is closest to:",
        ["12.9%.", "12.1%.", "16.5%."],
        0,
        "Avec 3 actifs, la matrice de covariance compte 3 variances et n(n - 1)/2 = 3 covariances uniques, chacune comptée deux fois dans la variance du portefeuille (la matrice est symétrique). Étape 1, covariances : Cov(A,B) = 0,4 x 0,20 x 0,15 = 0,0120 ; Cov(A,C) = 0,2 x 0,20 x 0,10 = 0,0040 ; Cov(B,C) = -0,1 x 0,15 x 0,10 = -0,0015. Étape 2, termes de variance : 0,5² x 0,04 + 0,3² x 0,0225 + 0,2² x 0,01 = 0,0100 + 0,002025 + 0,0004 = 0,012425. Étape 3, termes de covariance : 2 x (0,5 x 0,3 x 0,0120 + 0,5 x 0,2 x 0,0040 + 0,3 x 0,2 x (-0,0015)) = 2 x (0,0018 + 0,0004 - 0,00009) = 0,00422. Variance = 0,016645, écart-type = 0,016645^0,5 = 12,9 %. A est donc correct. B est faux : 12,1 % oublie le facteur 2 devant les covariances (0,012425 + 0,00211 = 0,014535). C est faux : 16,5 % est la moyenne pondérée des écarts-types (0,5 x 20 + 0,3 x 15 + 0,2 x 10), qui ne vaut que si toutes les corrélations sont égales à +1 ; ici, des corrélations faibles ou négatives réduisent le risque.",
      ],

      // Concept 2 — Shortfall risk & Roy's safety-first ratio (officielle — R5 Q22)
      [
        "Three portfolios with normally distributed returns are available to an investor who wants to minimize the probability that the portfolio return will be less than 5%. The risk and return characteristics of these portfolios are: Epps: expected return 6%, standard deviation 4%; Flake: expected return 7%, standard deviation 9%; Grant: expected return 10%, standard deviation 15%. Based on Roy's safety-first criterion, which portfolio should the investor select?",
        ["Flake.", "Grant.", "Epps."],
        1,
        "SFRatio = [E(Rp) - RL] / σp avec RL = 5 % : Epps (6 - 5) / 4 = 0,25 ; Flake (7 - 5) / 9 = 0,22 ; Grant (10 - 5) / 15 = 0,33. Le ratio le plus élevé correspond à la plus faible probabilité de passer sous 5 % (shortfall risk) : Grant. B est donc correct. C est faux : Epps a le risque le plus faible, mais sa marge au-dessus du seuil (1 %) ne représente que 0,25 écart-type. A est faux : Flake a le ratio le plus faible (0,22).",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : le critère ne revient pas à minimiser l'écart-type ; lien avec le Sharpe ratio
      [
        "Which of the following statements about Roy's safety-first criterion is least accurate?",
        [
          "If the threshold return equals the risk-free rate, the safety-first ratio is equal to the Sharpe ratio.",
          "If returns are normally distributed, the portfolio with the highest safety-first ratio has the lowest probability of a return below the threshold.",
          "The optimal portfolio is the one with the lowest standard deviation, because it is the least likely to earn a return below the threshold.",
        ],
        2,
        "Le critère de Roy minimise le shortfall risk, P(Rp < RL). Avec des rendements normaux, cette probabilité vaut N(-SFRatio), où SFRatio = [E(Rp) - RL] / σp : elle est d'autant plus faible que le ratio est élevé, donc B est exact. Si RL = rf, le ratio devient [E(Rp) - rf] / σp, c'est-à-dire le Sharpe ratio, donc A est exact. C est l'affirmation la moins exacte, donc la bonne réponse : le critère ne regarde pas le risque seul mais la marge E(Rp) - RL mesurée en écarts-types. Un portefeuille peu risqué dont l'espérance dépasse à peine le seuil peut avoir un shortfall risk plus élevé qu'un portefeuille plus volatil mais bien plus rémunérateur : avec RL = 5 %, E = 6 % et σ = 4 % donnent un ratio de 0,25 seulement, contre 0,33 pour E = 10 % et σ = 15 %.",
      ],
      // Variante plus difficile — seuil déduit d'un retrait en dollars, choix du portefeuille puis probabilité de shortfall, donnée-piège rf
      [
        "A client's portfolio is worth $1,500,000. She will withdraw $45,000 at the end of the year and does not want the portfolio value after the withdrawal to fall below $1,500,000. The risk-free rate is 2% and returns are normally distributed. Allocation X has an expected return of 7% and a standard deviation of 8%; Allocation Y has an expected return of 12% and a standard deviation of 15%. Selected values of the standard normal cumulative distribution function are: N(0.50) = 0.6915, N(0.60) = 0.7257, N(0.625) = 0.7340, N(0.67) = 0.7486, N(0.80) = 0.7881, N(0.875) = 0.8092. Using Roy's safety-first criterion, the allocation she should choose and its probability of a shortfall are closest to:",
        ["Allocation X; 19.1%.", "Allocation Y; 27.4%.", "Allocation Y; 25.1%."],
        1,
        "Étape 1, seuil : le portefeuille doit rapporter au moins le montant du retrait pour rester à 1 500 000 $, soit RL = 45 000 / 1 500 000 = 3 %. Étape 2, SFRatio : X = (7 - 3) / 8 = 0,50 ; Y = (12 - 3) / 15 = 0,60. Y a le ratio le plus élevé, donc la plus faible probabilité de shortfall. Étape 3, probabilité : P(R < 3 %) = N(-0,60) = 1 - N(0,60) = 1 - 0,7257 = 27,4 % (X aurait 1 - 0,6915 = 30,9 %). B est donc correct. A est faux : il ignore le retrait (RL = 0) ; X obtient alors 7 / 8 = 0,875 contre 12 / 15 = 0,80 pour Y, et 1 - 0,8092 = 19,1 %. Ce seuil trop bas favorise à tort le portefeuille le moins volatil. C est faux : il prend le taux sans risque comme seuil, ce qui revient au Sharpe ratio : Y = (12 - 2) / 15 = 0,67, d'où 1 - 0,7486 = 25,1 %. Le bon seuil est le rendement minimal dont la cliente a besoin, pas rf.",
      ],

      // Concept 3 — Monte Carlo simulation : choix des distributions des variables (officielle — R6 Q2)
      [
        "Bill Phillips is developing a Monte Carlo simulation to value a complex and thinly traded security. Phillips wants to model one input variable to have negative skewness and a second input variable to have positive excess kurtosis. In a Monte Carlo simulation, Phillips can appropriately use:",
        ["neither of these variables.", "both of these variables.", "only one of these variables."],
        1,
        "Un des avantages de la simulation Monte Carlo est que l'analyste peut attribuer à chaque variable d'entrée la distribution de son choix, normale ou non : asymétrie négative, queues épaisses (excess kurtosis positive), etc. B est donc correct. A et C sont faux : la simulation n'impose pas la loi normale aux variables ; c'est justement ce qui la rend utile pour valoriser des titres complexes.",
      ],
      // Variante angle différent — ce qui N'EST PAS une limite de Monte Carlo (comparaison avec le bootstrap historique)
      [
        "Which of the following is least likely a limitation of Monte Carlo simulation?",
        [
          "Its output is only as reliable as the distributions and parameters assumed for the inputs.",
          "It is a statistical rather than an analytic method, so it does not explain cause-and-effect relationships.",
          "It can only generate outcomes that have already occurred in the historical data.",
        ],
        2,
        "En Monte Carlo, l'analyste suppose une loi et des paramètres pour chaque facteur de risque, tire des milliers de scénarios et valorise l'actif dans chacun : la méthode peut donc produire des scénarios jamais observés. C n'est pas une limite de Monte Carlo, c'est la bonne réponse : se limiter aux issues déjà observées est la limite du bootstrap historique, qui ne fait que retirer avec remise dans l'échantillon passé. A est une vraie limite : une simulation n'est pas meilleure que ses hypothèses. B en est une aussi : la méthode est statistique, pas analytique ; elle fournit une distribution de résultats mais n'établit pas de relation de cause à effet, contrairement à un modèle analytique.",
      ],
      // Variante plus difficile — un tirage de rendements continus normaux : prix simulé (somme puis exponentielle) et loi lognormale des prix
      [
        "In one trial of a Monte Carlo simulation, an analyst draws three monthly continuously compounded returns from a normal distribution for a non-dividend-paying stock currently priced at $50: +4%, -10% and +2%. The simulated stock price at the end of Month 3, and the distribution of the simulated end-of-Month-3 prices across many trials, are best described as:",
        ["$48.04; lognormal.", "$47.74; lognormal.", "$48.04; normal."],
        0,
        "Les rendements continus s'additionnent : rendement continu sur les 3 mois = 0,04 - 0,10 + 0,02 = -0,04, puis P3 = P0 x e^r = 50 x e^(-0,04) = 50 x 0,9608 = 48,04 $. Chaque rendement continu étant tiré d'une loi normale, leur somme est normale, et le prix, exponentielle d'une variable normale, suit une loi lognormale : bornée à 0 et asymétrique à droite, ce qui convient pour modéliser des prix. A est donc correct. B est faux : 47,74 $ = 50 x 1,04 x 0,90 x 1,02 traite les tirages comme des rendements discrets à composer, alors qu'il s'agit de rendements continus (on les additionne, puis on prend l'exponentielle). C est faux : le prix est bien 48,04 $, mais une loi normale autoriserait des prix négatifs ; ce sont les rendements continus qui sont normaux, les prix sont lognormaux.",
      ],

      // Concept 4 — Bootstrap resampling : tirage avec remise (officielle — R6 Q3)
      [
        "In bootstrap resampling, a single observation from a full dataset:",
        [
          "may appear in multiple samples.",
          "may appear either in exactly one sample or in no samples.",
          "must appear in one and only one sample.",
        ],
        0,
        "Le bootstrap tire, dans le jeu de données complet, des échantillons de même taille avec remise : chaque observation tirée est remise dans le pool et peut être tirée à nouveau, dans le même échantillon ou dans d'autres. A est donc correct. B et C sont faux : ils supposent un tirage sans remise, où chaque observation ne servirait qu'une fois.",
      ],
      // Variante angle différent — comparaison bootstrap vs jackknife
      [
        "Compared with jackknife resampling, bootstrap resampling most likely:",
        [
          "draws samples of size n - 1 by leaving out one observation at a time.",
          "requires more computation but generally gives more accurate estimates.",
          "produces exactly the same results each time it is run on the same dataset.",
        ],
        1,
        "Bootstrap : on tire un grand nombre d'échantillons de taille n avec remise dans les données observées, et l'écart-type des statistiques rééchantillonnées estime l'erreur type. C'est plus lourd en calcul que le jackknife, mais en général plus précis (il sert aussi à bâtir des intervalles de confiance, par exemple pour la médiane). B est donc correct. A est faux : c'est la définition du jackknife (n échantillons de taille n - 1, une observation retirée à chaque fois, sans remise), méthode simple qui sert surtout à réduire le biais d'un estimateur. C est faux : c'est le jackknife qui donne toujours le même résultat sur les mêmes données, puisque ses n sous-échantillons sont fixés ; le bootstrap repose sur des tirages aléatoires et ses résultats varient d'une exécution à l'autre.",
      ],
      // Variante plus difficile — estimation bootstrap de l'erreur type (écart-type des moyennes rééchantillonnées, B - 1), donnée-piège s / n^0,5
      [
        "An analyst has a sample of 60 monthly returns with a mean of 1.1% and a standard deviation of 2.4%. For illustration, she draws only five bootstrap resamples of 60 observations each, with replacement, and obtains resample means of 1.2%, 0.8%, 1.5%, 0.9% and 1.1%. The bootstrap estimate of the standard error of the sample mean is closest to:",
        ["0.31%.", "0.12%.", "0.27%."],
        2,
        "Le bootstrap estime l'erreur type par l'écart-type des moyennes rééchantillonnées, avec B - 1 au dénominateur (B = nombre de rééchantillons). Moyenne des 5 moyennes = 5,5 / 5 = 1,1 %. Écarts : 0,1 ; -0,3 ; 0,4 ; -0,2 ; 0. Somme des carrés = 0,01 + 0,09 + 0,16 + 0,04 + 0 = 0,30. Variance = 0,30 / 4 = 0,075, écart-type = 0,075^0,5 = 0,27 %. C est donc correct. A est faux : 0,31 % = 2,4 / 60^0,5 est l'erreur type analytique s / n^0,5 calculée sur l'échantillon d'origine ; c'est une estimation valable, mais pas celle que demande la question (donnée-piège). B est faux : 0,12 % = 0,27 / 5^0,5 redivise par la racine du nombre de rééchantillons ; l'écart-type des moyennes rééchantillonnées est déjà une erreur type, il ne faut pas le diviser à nouveau.",
      ],

      // Concept 5 — Sampling methods : stratified random sampling (officielle — R7 Q2, pas de corrigé R7 dans la banque : réponse vérifiée par la théorie)
      [
        "Which of the following is least likely a step in stratified random sampling?",
        [
          "The population is divided into strata based on some classification scheme.",
          "The size of each sub-sample is selected to be the same across strata.",
          "The sub-samples are pooled to create the complete sample.",
        ],
        1,
        "En stratified random sampling, on divise la population en strates selon un critère de classement (A), on tire au hasard dans chaque strate un sous-échantillon dont la taille est proportionnelle au poids de la strate dans la population, puis on regroupe les sous-échantillons pour former l'échantillon complet (C). B est donc l'étape la moins probable : les sous-échantillons n'ont pas la même taille d'une strate à l'autre, sauf si toutes les strates pèsent autant dans la population.",
      ],
      // Variante angle différent — reconnaître un cluster sampling à un étage et le comparer au stratified sampling
      [
        "A researcher divides the 600 bonds of an index into 60 groups by issuer region, randomly selects 6 of these groups and includes every bond in the selected groups in her sample. This method is best described as:",
        [
          "one-stage cluster sampling, which typically has more sampling error than stratified random sampling.",
          "stratified random sampling, which typically has less sampling error than simple random sampling.",
          "two-stage cluster sampling, which typically has less sampling error than stratified random sampling.",
        ],
        0,
        "On ne tire que certains groupes (6 sur 60) et on garde tous les titres des groupes tirés : c'est du cluster sampling à un étage (one-stage). C'est rapide et peu coûteux, mais chaque cluster ne représente pas forcément bien la population, d'où une sampling error plus forte qu'en stratified random sampling. A est donc correct. B est faux : en stratified random sampling, on tire dans toutes les strates, au prorata de leur poids ; ici, 54 groupes sur 60 ne sont pas représentés du tout. C est faux : en two-stage, on tirerait au hasard des titres à l'intérieur des clusters choisis au lieu de les prendre en entier ; et la sampling error d'un cluster sampling est plus forte, pas plus faible, que celle d'un échantillonnage stratifié (le two-stage en a même plus que le one-stage).",
      ],
      // Variante plus difficile — allocation proportionnelle, moyenne pondérée de l'échantillon et sampling error (statistique - paramètre)
      [
        "A bond index has three strata: government bonds (50% of the index, mean duration 6.0), investment-grade corporates (30%, mean duration 8.0) and high-yield bonds (20%, mean duration 4.0). A manager draws a stratified random sample of 40 bonds with proportional allocation. The sample mean durations are 6.2 for the government bonds, 7.5 for the investment-grade corporates and 4.4 for the high-yield bonds. The sampling error of the sample mean duration is closest to:",
        ["-0.03.", "-0.17.", "+0.03."],
        2,
        "Étape 1, allocation proportionnelle : 40 x 50 % = 20 titres d'État, 40 x 30 % = 12 corporates investment grade, 40 x 20 % = 8 high yield. Étape 2, moyenne de l'échantillon = (20 x 6,2 + 12 x 7,5 + 8 x 4,4) / 40 = (124 + 90 + 35,2) / 40 = 6,23. Étape 3, paramètre de la population = 0,5 x 6,0 + 0,3 x 8,0 + 0,2 x 4,0 = 6,20. Sampling error = statistique de l'échantillon - paramètre de la population = 6,23 - 6,20 = +0,03. C est donc correct. A est faux : -0,03 inverse le sens de la définition (paramètre - statistique). B est faux : -0,17 prend la moyenne simple des trois moyennes de strate ((6,2 + 7,5 + 4,4) / 3 = 6,03) sans tenir compte du poids de chaque strate ; en stratified sampling, chaque strate pèse selon sa taille dans la population, et c'est ce qui donne une sampling error plus faible qu'un tirage aléatoire simple.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Quantitative Methods Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
