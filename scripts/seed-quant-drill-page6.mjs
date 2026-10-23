// Seed script — quiz de "drill" associé à la page 6 de la fiche PDF Quantitative
// Methods (Simple Linear Regression · Big Data Techniques, Readings 10 et 11 de
// la fiche, même numérotation que la banque de pratique).
// Structure : pour chacun des 5 concepts clés de la page, 1 question officielle
// (banque de pratique Quantitative Methods, bonne réponse vérifiée contre le
// corrigé officiel "- Answers") + 1 variante "angle différent" (même notion,
// mais jamais un simple changement de chiffres menant au même raisonnement)
// + 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés / notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Questions en anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R10 Q10, Q8 et Q3, R11 Q2 et Q1) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-quant-drill-page6.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Quantitative Methods (Système)";

const QUIZ_SETS = [
  {
    title: "Quantitative Methods — Drill Fiche Page 6 (Simple Linear Regression · Big Data Techniques)",
    difficulty: 2,
    questions: [
      // Concept 1 — Modèle, OLS & interprétation : la pente estimée (officielle — R10 Q1)
      [
        "The estimated slope coefficient in a simple linear regression is:",
        [
          "the predicted value of the dependent variable, given the actual value of the independent variable.",
          "the change in the independent variable, given a one-unit change in the dependent variable.",
          "the ratio of the covariance of the regression variables to the variance of the independent variable.",
        ],
        2,
        "Par les moindres carrés (OLS), la pente estimée vaut b1 = Cov(X, Y) / Var(X) : covariance des deux variables divisée par la variance de la variable indépendante. C est donc correct. Elle s'interprète comme la variation de la variable dépendante Y pour une hausse d'une unité de la variable indépendante X. B est faux : il inverse les rôles des deux variables. A est faux : la valeur prédite de Y fait intervenir l'intercept en plus de la pente (Ŷ = b0 + b1 X).",
      ],
      // Variante angle différent — de la pente à l'intercept : la droite OLS passe par le point moyen
      [
        "A regression of a stock's monthly excess returns (Y) on the market's monthly excess returns (X) is based on the following sample statistics: mean of Y = 1.1%, mean of X = 0.8%, Cov(X, Y) = 0.0018 and Var(X) = 0.0015. The estimated intercept is closest to:",
        ["0.14%.", "0.43%.", "-0.52%."],
        0,
        "Étape 1, pente : b1 = Cov(X, Y) / Var(X) = 0,0018 / 0,0015 = 1,2 (c'est le beta de l'action). Étape 2, intercept : la droite des moindres carrés passe toujours par le point moyen (moyenne de X, moyenne de Y), donc b0 = moyenne de Y - b1 x moyenne de X = 1,1 % - 1,2 x 0,8 % = 0,14 %. A est donc correct. B est faux : 0,43 % = 1,1 % - 0,833 x 0,8 % utilise la pente inversée Var(X) / Cov(X, Y). C est faux : -0,52 % = 0,8 % - 1,2 x 1,1 % intervertit les rôles de X et de Y dans la formule de l'intercept.",
      ],
      // Variante plus difficile — pente à partir de ρ et des écarts-types, puis R² = r² : la taille de la pente ne mesure pas la force de la relation
      [
        "Two simple regressions use the market's returns as the independent variable (market standard deviation 15%). Stock P has a standard deviation of 30% and a correlation with the market of 0.40. Stock Q has a standard deviation of 12% and a correlation with the market of 0.90. Which of the following statements is most accurate?",
        [
          "Stock Q has the higher slope (1.13 versus 0.20), and its regression has the higher R² (0.81 versus 0.16).",
          "Stock P has the higher slope (0.80 versus 0.72), but Stock Q's regression has the higher R² (0.81 versus 0.16).",
          "Stock P has the higher slope (0.80 versus 0.72), so Stock P's returns have the stronger linear relationship with the market (R² of 0.64 versus 0.52).",
        ],
        1,
        "Étape 1, pentes : b1 = Cov(X, Y) / Var(X) = ρ x σY x σX / σX² = ρ x σY / σX. Action P : 0,40 x 30 / 15 = 0,80 ; action Q : 0,90 x 12 / 15 = 0,72. Étape 2, qualité de l'ajustement : en régression simple, R² = r², soit 0,16 pour P et 0,81 pour Q. B est donc correct : P a la pente la plus forte, mais c'est la régression de Q qui explique la plus grande part de la variation des rendements. C'est le piège de la fiche : la taille de la pente ne dit rien de la force de la relation. A est faux : 1,13 et 0,20 inversent le rapport des écarts-types (ρ x σX / σY). C est faux : il confond R² et pente au carré (0,80² = 0,64 ; 0,72² = 0,52) et conclut à tort qu'une pente plus forte signifie une relation plus forte.",
      ],

      // Concept 2 — ANOVA & goodness of fit : R² et coefficient de corrélation (officielle — R10 Q12)
      [
        "A simple linear regression is performed to quantify the relationship between the return on the common stocks of medium-sized companies (mid-caps) and the return on the S&P 500 index, using the monthly return on mid-cap stocks as the dependent variable and the monthly return on the S&P 500 as the independent variable. The results of the regression are: intercept coefficient 1.71 (standard error 2.950, t-value 0.58); S&P 500 coefficient 1.52 (standard error 0.130, t-value 11.69); coefficient of determination = 0.599. The strength of the relationship, as measured by the correlation coefficient, between the return on mid-cap stocks and the return on the S&P 500 for the period under study was:",
        ["0.130.", "0.774.", "0.599."],
        1,
        "En régression simple, le coefficient de détermination R² est le carré du coefficient de corrélation entre X et Y. Donc r = 0,599^0,5 = 0,774, positif comme la pente (1,52). B est donc correct. C est faux : 0,599 est le R² lui-même, pas la corrélation. A est faux : 0,130 est l'erreur type de la pente.",
      ],
      // Variante angle différent — remonter du R² au SEE (SSE = (1 - R²) x SST, MSE, racine)
      [
        "A simple linear regression estimated on 32 observations has a coefficient of determination of 0.75 and a total sum of squares of 400. The standard error of estimate (SEE) is closest to:",
        ["3.33.", "3.16.", "1.83."],
        2,
        "Étape 1, décomposition : SST = SSR + SSE et R² = SSR / SST, donc SSE = (1 - R²) x SST = 0,25 x 400 = 100 (et SSR = 300). Étape 2, MSE = SSE / (n - 2) = 100 / 30 = 3,33. Étape 3, SEE = MSE^0,5 = 3,33^0,5 = 1,83. C est donc correct. A est faux : 3,33 est le MSE ; il faut encore en prendre la racine. B est faux : 3,16 = (300 / 30)^0,5 utilise la somme des carrés expliquée (SSR) au lieu de la somme des carrés résiduelle (SSE) ; le SEE mesure la dispersion des résidus autour de la droite.",
      ],
      // Variante plus difficile — reconstruire l'ANOVA à partir de r : F = MSR / MSE, F = t² et signe du t de la pente
      [
        "In a simple linear regression with 50 observations, the sample correlation between X and Y is -0.60 and the total sum of squares is 2,000. The F-statistic and the t-statistic of the slope coefficient are closest to:",
        ["F = 27.0 and t = -5.20.", "F = 27.0 and t = +5.20.", "F = 0.56 and t = -0.75."],
        0,
        "Étape 1, R² = r² = 0,36, d'où SSR = 0,36 x 2 000 = 720 et SSE = 2 000 - 720 = 1 280. Étape 2, MSR = SSR / 1 = 720 ; MSE = SSE / (n - 2) = 1 280 / 48 = 26,67. Étape 3, F = MSR / MSE = 720 / 26,67 = 27,0. Étape 4, en régression simple F = t², donc |t| = 27^0,5 = 5,20 ; le t de la pente a le signe de la pente, qui est celui de la corrélation (négative) : t = -5,20. Contrôle par le test de corrélation : t = r x (n - 2)^0,5 / (1 - r²)^0,5 = -0,60 x 48^0,5 / 0,80 = -5,20. A est donc correct. B est faux : F = t² efface le signe, mais t le conserve, et il suit celui de la corrélation. C est faux : 0,56 = 720 / 1 280 divise les sommes de carrés sans les rapporter à leurs degrés de liberté (1 et n - 2), et -0,75 en est la racine.",
      ],

      // Concept 3 — Prévision : intervalle de confiance autour d'une valeur prédite (officielle — R10 Q7)
      [
        "To determine a confidence interval around the predicted value from a simple linear regression, the appropriate degrees of freedom are:",
        ["n – 1.", "n.", "n – 2."],
        2,
        "L'intervalle de confiance d'une prévision s'écrit Ŷ ± tc x sf, où sf est l'erreur type de la prévision et tc la valeur critique d'une loi de Student à n - 2 degrés de liberté : on perd deux degrés de liberté pour estimer l'intercept et la pente. C est donc correct. A est faux : n - 1 est le nombre de degrés de liberté d'un test sur une seule moyenne. B est faux : n ne retire aucun degré de liberté pour les paramètres estimés.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai sur l'erreur type de la prévision (sf toujours supérieur au SEE)
      [
        "Holding all other factors constant, which statement about the standard error of the forecast in a simple linear regression is least accurate?",
        [
          "It increases as the value of X used for the forecast moves further away from the sample mean of X.",
          "It is smaller than the standard error of estimate, because the regression is estimated on many observations.",
          "It decreases as the number of observations used to estimate the regression increases.",
        ],
        1,
        "Formule : sf² = SEE² x [1 + 1/n + (X - moyenne de X)² / ((n - 1) x sX²)]. Le crochet vaut toujours plus de 1, donc sf est toujours supérieur au SEE : à l'incertitude sur le terme d'erreur de la nouvelle observation (le 1) s'ajoute l'incertitude sur l'estimation des coefficients. B est l'affirmation la moins exacte, donc la bonne réponse. A est exact : plus X s'éloigne de sa moyenne, plus le dernier terme grossit et plus l'intervalle s'élargit. C est exact : un n plus grand réduit 1/n et augmente (n - 1) x sX², ce qui resserre l'intervalle.",
      ],
      // Variante plus difficile — intervalle de prévision complet loin de la moyenne de X (sf, variance vs écart-type de X)
      [
        "A regression estimated on 26 observations gives the equation Y = 1.5% + 0.8X, with a standard error of estimate of 2.0%. The independent variable has a sample mean of 4% and a sample standard deviation of 2%. The analyst forecasts Y for X = 14%. The critical t-value for 24 degrees of freedom (two-tailed, 5%) is 2.064. The 95% prediction interval for Y is closest to:",
        ["8.6% to 16.8%.", "5.5% to 19.9%.", "6.8% to 18.6%."],
        2,
        "Étape 1, prévision : Y = 1,5 + 0,8 x 14 = 12,7 %. Étape 2, erreur type de la prévision : sf² = SEE² x [1 + 1/n + (X - moyenne de X)² / ((n - 1) x sX²)] = 2,0² x [1 + 1/26 + (14 - 4)² / (25 x 2²)] = 4 x [1 + 0,0385 + 100 / 100] = 4 x 2,0385 = 8,154, d'où sf = 2,856 %. Étape 3, intervalle : 12,7 ± 2,064 x 2,856 = 12,7 ± 5,89, soit de 6,8 % à 18,6 %. C est donc correct. A est faux : 8,6 % à 16,8 % (12,7 ± 2,064 x 2,0) utilise le SEE au lieu de sf ; il oublie l'incertitude sur les coefficients, très forte ici car X = 14 % est loin de la moyenne (4 %). B est faux : 5,5 % à 19,9 % met l'écart-type de X (2) au lieu de sa variance (4) au dénominateur, ce qui gonfle le dernier terme (100 / 50 = 2) et donne sf = 3,49 %.",
      ],

      // Concept 4 — Fintech & Big Data : traitement des données (curation) (officielle — R11 Q7)
      [
        "Which of the following uses of data is most accurately described as curation?",
        [
          "An analyst adjusts daily stock index data from two countries for their different market holidays.",
          "A data technician accesses an offsite archive to retrieve data that has been stored there.",
          "An investor creates a word cloud from financial analysts' recent research reports about a company.",
        ],
        0,
        "La curation consiste à garantir la qualité des données, par exemple en corrigeant les données erronées ou manquantes : ajuster les séries de deux pays pour leurs jours fériés différents en fait partie. A est donc correct. B est faux : déplacer des données de leur support de stockage vers l'endroit où on en a besoin relève du transfer. C est faux : un nuage de mots (word cloud) est une technique de visualisation.",
      ],
      // Variante angle différent — une autre étape du traitement des données : la capture (mise au format exploitable), à distinguer de la curation (qualité) et du storage
      [
        "Before running any model, a data team uses optical character recognition (OCR) software to collect the figures printed in scanned PDF annual reports and convert them into machine-readable tables that the analytical tool can use. Among the data processing methods, this step is best described as:",
        ["curation.", "storage.", "capture."],
        2,
        "Le traitement des données se décompose en capture, curation, storage, search et transfer. La capture consiste à collecter les données et à les transformer dans un format exploitable par l'outil d'analyse : convertir des rapports PDF scannés en tableaux lisibles par la machine en est l'exemple type. C est donc correct. A est faux : la curation garantit la qualité des données (repérer et corriger les erreurs, les doublons, les valeurs manquantes) ; ici, on ne vérifie pas l'exactitude des chiffres, on change leur format. B est faux : le storage porte sur la façon d'enregistrer, d'archiver et de rendre accessibles les données (choix de la base, structurée ou non) ; produire des tableaux ne dit rien de l'endroit où ils seront conservés.",
      ],
      // Variante plus difficile — sources de données alternatives (sensors, corporate exhaust, individus) et caractéristique « variety »
      [
        "A fund combines three alternative data sets: (1) satellite images of retailers' parking lots, (2) point-of-sale scanner data generated by retailers in the normal course of business, and (3) consumers' social media posts about the retailers' products. The sources of these three data sets, in order, and the Big Data characteristic most challenged by combining images, tables and free text, are best described as:",
        [
          "sensors; businesses (corporate exhaust); individuals; variety.",
          "sensors; individuals; businesses (corporate exhaust); velocity.",
          "businesses (corporate exhaust); businesses (corporate exhaust); individuals; volume.",
        ],
        0,
        "Étape 1, sources des données alternatives : les images satellites viennent de capteurs (sensors, famille de l'Internet of Things) ; les données de caisse sont produites par l'activité courante des entreprises (corporate exhaust) ; les posts sur les réseaux sociaux viennent des individus. Étape 2, caractéristique : mêler images, tableaux structurés et texte libre pose un problème de variety (diversité des formats, du structuré au non structuré). A est donc correct. B est faux : il intervertit les deux dernières sources, et la velocity désigne la vitesse à laquelle les données sont produites et traitées (low latency, temps réel). C est faux : les images satellites ne sont pas un sous-produit de l'activité d'une entreprise mais des données de capteurs, et le volume désigne la quantité de données (téraoctets, pétaoctets), pas leur hétérogénéité.",
      ],

      // Concept 5 — AI & machine learning : supervised vs unsupervised learning (officielle — R11 Q8)
      [
        "The technique in which a machine learns to model a set of output data from a given set of inputs is best described as:",
        ["deep learning.", "supervised learning.", "unsupervised learning."],
        1,
        "En supervised learning, la machine reçoit des données d'entrée et de sortie étiquetées et apprend à modéliser les sorties à partir des entrées. B est donc correct. C est faux : en unsupervised learning, la machine ne reçoit que des données d'entrée, sans sortie à modéliser, et cherche elle-même des structures et des relations. A est faux : le deep learning est une technique (réseaux de neurones à plusieurs couches) qui identifie des structures de complexité croissante ; il peut être supervisé ou non supervisé.",
      ],
      // Variante angle différent — appliquer la distinction à des tâches concrètes : laquelle relève de l'unsupervised learning ?
      [
        "Which of the following tasks is best suited to unsupervised learning?",
        [
          "Predicting whether a corporate bond will default, using past bonds labeled as defaulted or not defaulted.",
          "Grouping stocks into clusters based on the similarity of their return patterns, with no predefined categories.",
          "Forecasting next quarter's earnings surprise from past earnings surprises and the factors that preceded them.",
        ],
        1,
        "En unsupervised learning, la machine ne reçoit que des données d'entrée, sans sortie étiquetée à prédire, et cherche elle-même une structure. Regrouper des actions par similarité de comportement sans catégories définies à l'avance (clustering) en est l'exemple type. B est donc correct. A est faux : les obligations sont étiquetées (défaut ou non) et la machine apprend à prédire ce label, c'est du supervised learning. C est faux : on modélise une sortie connue dans le passé (la surprise de bénéfices) à partir d'entrées, c'est aussi du supervised learning.",
      ],
      // Variante plus difficile — diagnostiquer l'approche (données étiquetées) et l'overfitting (écart entre échantillons d'apprentissage et de test)
      [
        "A machine learning model is trained on ten years of corporate bonds labeled as defaulted or not defaulted, and is then evaluated on a test sample it has never seen. It classifies 98% of the training bonds correctly but only 61% of the test bonds. The learning approach and the problem with the model are best described as:",
        [
          "supervised learning; overfitting, because the model has learned noise in the training data as if it were a true relationship.",
          "unsupervised learning; overfitting, because the model has learned noise in the training data as if it were a true relationship.",
          "supervised learning; underfitting, because the model is too simple and treats true relationships as noise.",
        ],
        0,
        "Étape 1, approche : les données sont étiquetées (défaut ou non) et le modèle apprend à prédire ce label : supervised learning. Étape 2, diagnostic : un écart énorme entre la performance sur l'échantillon d'apprentissage (98 %) et sur l'échantillon de test (61 %) est la signature de l'overfitting : un modèle trop complexe a appris le bruit propre aux données d'entraînement comme s'il s'agissait de vraies relations, et se généralise mal à de nouvelles données. A est donc correct. B est faux : sans étiquettes, il n'y aurait ni sortie à prédire ni taux de bonne classification à mesurer. C est faux : un modèle underfit, trop simple, rate de vraies relations et se trompe aussi sur l'échantillon d'apprentissage ; il n'afficherait pas 98 % de bonnes réponses.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Quantitative Methods Page 6...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
