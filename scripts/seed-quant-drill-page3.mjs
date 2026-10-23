// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Quantitative
// Methods (Statistical Measures of Asset Returns · Probability Trees, Readings 3
// et 4 de la fiche, mêmes numéros dans la banque de pratique : pas de
// décalage). Structure : pour chacun des 5 concepts clés de la page, 1 question
// officielle (banque de pratique Quantitative Methods, corrigé vérifié contre
// "- Answers.pdf") + 1 variante "angle différent" (même notion, mais jamais un
// simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés /
// notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Questions en anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R3 Q37, Q43 et Q54, R4 Q1 et Q8) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-quant-drill-page3.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Quantitative Methods (Système)";

const QUIZ_SETS = [
  {
    title: "Quantitative Methods — Drill Fiche Page 3 (Statistical Measures of Asset Returns · Probability Trees)",
    difficulty: 2,
    questions: [
      // Concept 1 — Tendance centrale : moyenne géométrique, médiane, trimmed / winsorized mean (officielle — R3 Q1)
      [
        "A company reports its past six years' earnings growth at 10%, 14%, 12%, 10%, –10%, and 12%. The company's average compound annual growth rate of earnings is closest to:",
        ["8.0%.", "7.7%.", "8.5%."],
        1,
        "Le taux de croissance annuel composé est la moyenne géométrique : [(1,10)(1,14)(1,12)(1,10)(0,90)(1,12)]^(1/6) - 1 = (1,5573)^(1/6) - 1 = 7,66 %, soit 7,7 %. B est donc correct. A est faux : 8,0 % est la moyenne arithmétique (48 / 6), toujours supérieure à la moyenne géométrique quand les taux varient. C est faux : 8,5 % ne correspond à aucun calcul correct ; il est même au-dessus de la moyenne arithmétique.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : médiane, mode, trimmed vs winsorized mean
      [
        "Which of the following statements about measures of central tendency is least accurate?",
        [
          "A winsorized mean excludes the most extreme observations, whereas a trimmed mean replaces them with the values at the cutoff percentiles.",
          "The median is less affected by extreme observations than the arithmetic mean.",
          "For continuous data, the mode is usually identified as a modal interval rather than a single value.",
        ],
        0,
        "On cherche l'affirmation fausse. A est fausse, donc c'est la réponse : elle inverse les deux définitions. La trimmed mean EXCLUT les observations extrêmes (une 1 % trimmed mean retire 0,5 % de chaque côté), alors que la winsorized mean les REMPLACE par les valeurs aux percentiles de coupure (une 90 % winsorized mean remplace les valeurs sous P5 par P5 et au-dessus de P95 par P95). B est vraie : la médiane ne dépend que du rang des observations, un outlier ne la déplace presque pas, alors qu'il tire la moyenne vers lui. C est vraie : avec des données continues, chaque valeur est en général unique, on repère donc l'intervalle le plus fréquent (modal interval).",
      ],
      // Variante plus difficile — calcul de trimmed et winsorized means sur un échantillon avec outliers, comparés à la moyenne et à la médiane
      [
        "An analyst has the following ten annual returns (%): 12, -35, 6, 9, 4, 7, 30, 5, 8, 10. The 20% trimmed mean and the 80% winsorized mean of these returns are closest to:",
        ["7.63% and 7.70%.", "7.70% and 7.63%.", "6.10% and 7.70%."],
        0,
        "On trie d'abord : -35, 4, 5, 6, 7, 8, 9, 10, 12, 30. Une 20 % trimmed mean retire 10 % de chaque côté, soit ici 1 observation en bas (-35) et 1 en haut (30) : (4 + 5 + 6 + 7 + 8 + 9 + 10 + 12) / 8 = 61 / 8 = 7,63 %. Une 80 % winsorized mean garde les 10 observations mais remplace -35 par la plus petite valeur restante (4) et 30 par la plus grande restante (12) : (4 + 4 + 5 + 6 + 7 + 8 + 9 + 10 + 12 + 12) / 10 = 77 / 10 = 7,70 %. A est donc correct. B est faux : il inverse les deux définitions (la trimmed mean exclut, la winsorized mean remplace). C est faux : 6,10 % divise la somme des 8 valeurs gardées par 10 au lieu de 8. À comparer : la moyenne arithmétique vaut 5,6 % (tirée vers le bas par -35) et la médiane (7 + 8) / 2 = 7,5 % ; les deux moyennes robustes s'en rapprochent.",
      ],

      // Concept 2 — Dispersion : variance et écart-type d'échantillon (officielle — R3 Q2)
      [
        "Cameron Ryan wants to make an offer on the condominium he is renting. He takes a sample of prices of condominiums in his development that closed in the last five months. Sample prices are as follows (amounts are in thousands of dollars): $125, $175, $150, $155 and $135. The sample standard deviation is closest to:",
        ["370.00.", "19.24.", "38.47."],
        1,
        "Moyenne = (125 + 175 + 150 + 155 + 135) / 5 = 148. Somme des carrés des écarts : 529 + 729 + 4 + 49 + 169 = 1 480. Variance d'échantillon = 1 480 / (5 - 1) = 370 ; écart-type = 370^0,5 = 19,24 (milliers de dollars). B est donc correct. A est faux : 370 est la variance, pas l'écart-type. C est faux : 38,47 vaut deux fois l'écart-type.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : n - 1, MAD, unités de la variance
      [
        "Which of the following statements about measures of dispersion is least accurate?",
        [
          "Because deviations from the mean always sum to zero, the mean absolute deviation uses their absolute values.",
          "Dividing the sum of squared deviations by n rather than n - 1 overstates the sample variance as an estimate of the population variance.",
          "The standard deviation is expressed in the same unit as the data, whereas the variance is expressed in squared units.",
        ],
        1,
        "On cherche l'affirmation fausse. B est fausse, donc c'est la réponse : diviser par n au lieu de n - 1 donne un chiffre plus PETIT, qui SOUS-estime la variance de la population. Les écarts sont mesurés autour de la moyenne de l'échantillon, qui est par construction la plus proche des données ; on corrige ce biais en divisant par n - 1 (piège de la fiche). A est vraie : la somme des écarts bruts à la moyenne vaut toujours 0, d'où les valeurs absolues dans la MAD (et les carrés dans la variance). C est vraie : des rendements en % ont un écart-type en % et une variance en %², d'où l'usage de l'écart-type pour interpréter le risque.",
      ],
      // Variante plus difficile — target downside deviation : cible non nulle, seules les observations sous la cible, mais division par n - 1
      [
        "A portfolio's six annual returns are 8%, -4%, 12%, 2%, -6%, and 10%. Treating them as a sample, the target downside deviation relative to a target return of 3% is closest to:",
        ["8.09%.", "3.22%.", "5.12%."],
        2,
        "Formule de la fiche : [Σ(Xi - B)² / (n - 1)]^(1/2), la somme ne portant que sur les observations sous la cible B = 3 %. Observations concernées : -4 %, 2 % et -6 % (2 % est positif mais sous la cible). Écarts : -7, -1 et -9 ; carrés : 49 + 1 + 81 = 131. On divise par n - 1 = 5, avec n = taille de TOUT l'échantillon : 131 / 5 = 26,2, et la racine donne 5,12 %. C est donc correct. A est faux : 8,09 % divise par 3 - 1 = 2 (le nombre d'observations sous la cible moins 1) ; piège de la fiche, on divise par n - 1 de l'échantillon entier. B est faux : 3,22 % prend une cible de 0 % et ne retient que les rendements négatifs ((16 + 36) / 5 = 10,4) ; avec une cible de 3 %, le rendement de 2 % compte aussi et les écarts se mesurent à partir de 3 %.",
      ],

      // Concept 3 — Kurtosis : distribution leptokurtique et queues épaisses (officielle — R3 Q36)
      [
        "Which of the following statements concerning kurtosis is most accurate?",
        [
          "A distribution with kurtosis of +2 has fatter tails than a normal distribution.",
          "A leptokurtic distribution has excess kurtosis less than zero.",
          "A leptokurtic distribution has fatter tails than a normal distribution.",
        ],
        2,
        "Une distribution leptokurtique a une kurtosis supérieure à 3, soit une excess kurtosis positive : elle est plus pointue au centre et a des queues plus épaisses que la loi normale, donc plus d'événements extrêmes. C est donc correct. A est faux : une kurtosis de 2 est inférieure à celle de la loi normale (3) ; la distribution est platykurtique, avec des queues plus fines. B est faux : une distribution leptokurtique a une excess kurtosis supérieure à zéro, pas inférieure.",
      ],
      // Variante angle différent — conséquence pratique : modéliser des rendements leptokurtiques par une loi normale
      [
        "Monthly returns on an equity index are leptokurtic and negatively skewed. If a risk manager models these returns with a normal distribution that has the same mean and standard deviation, the model will most likely:",
        [
          "underestimate the probability of large losses.",
          "overestimate the probability of large losses, because a normal distribution has fatter tails than a leptokurtic one.",
          "estimate the probability of large losses correctly, because the mean and the standard deviation fully describe any return distribution.",
        ],
        0,
        "Leptokurtique = excess kurtosis positive = queues plus épaisses que la normale ; skew négatif = longue queue à gauche, du côté des pertes. Les grosses pertes sont donc plus fréquentes en réalité que ne le prévoit une loi normale de même moyenne et de même écart-type : le modèle les sous-estime (risque de queue sous-évalué). A est donc correct. B est faux : c'est l'inverse, la loi normale (kurtosis 3) a des queues plus fines qu'une distribution leptokurtique. C est faux : moyenne et écart-type ne suffisent à décrire que la loi normale ; pour les rendements réels, il faut aussi le skewness et la kurtosis. Fiche : plus d'excess kurtosis et un skew plus négatif = plus de risque.",
      ],
      // Variante plus difficile — combiner kurtosis vs excess kurtosis et skewness (position moyenne / médiane, préférence de l'investisseur)
      [
        "Two funds have the same mean return and the same standard deviation. Fund P's returns have a sample skewness of -0.9 and a sample kurtosis of 5.2. Fund Q's returns have a sample skewness of +0.7 and an excess kurtosis of -0.5. Which of the following statements is most accurate?",
        [
          "Fund Q is leptokurtic because its skewness is positive, and its mean is most likely below its median.",
          "Fund P has fatter tails than a normal distribution and its mean is most likely below its median; a risk-averse investor would typically prefer Fund Q.",
          "Fund P has an excess kurtosis of 5.2, and its negative skewness means that it produces frequent small losses and occasional very large gains.",
        ],
        1,
        "Fund P : kurtosis 5,2, donc excess kurtosis = 5,2 - 3 = 2,2 > 0 : leptokurtique, queues épaisses. Son skew négatif (-0,9, significatif car |skew| > 0,5) étire la queue à gauche : moyenne < médiane < mode. Fund Q : excess kurtosis -0,5 (kurtosis 2,5) : platykurtique, queues fines ; skew positif : moyenne > médiane. À moyenne et écart-type égaux, un investisseur averse au risque préfère le skew positif et les queues fines, donc Fund Q. B est donc correct. A est faux : skewness et kurtosis sont deux mesures distinctes ; Q est platykurtique (excess négatif), et avec un skew positif sa moyenne est au-dessus de sa médiane. C est faux deux fois : 5,2 est la kurtosis, pas l'excess kurtosis (2,2) ; et un skew négatif signifie au contraire beaucoup de petits gains et quelques très grosses pertes.",
      ],

      // Concept 4 — Covariance & corrélation : interpréter un coefficient de corrélation (officielle — R3 Q44)
      [
        "The correlation between two variables is –0.74. The most appropriate way to interpret this correlation is that:",
        [
          "if one of the variables increases, there is a 74% probability that the other variable will decrease.",
          "the two variables have a negative linear association.",
          "there is unlikely to be a strong linear relationship between the two variables.",
        ],
        1,
        "Un coefficient de corrélation de -0,74 indique une association linéaire négative relativement forte. B est donc correct. A est faux : la corrélation n'est pas une probabilité ; elle mesure la force de la relation linéaire, pas la chance que les deux variables évoluent en sens opposé. C est faux : en valeur absolue, 0,74 est assez proche de 1 ; la relation linéaire est plutôt forte.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : corrélation nulle, relations non linéaires, scatter plot
      [
        "Which of the following statements about correlation is least accurate?",
        [
          "The correlation coefficient has no units and lies between -1 and +1.",
          "A scatter plot can reveal a strong nonlinear relationship between two variables whose correlation is close to zero.",
          "A correlation of zero means that there is no relationship of any kind between the two variables.",
        ],
        2,
        "On cherche l'affirmation fausse. C est fausse, donc c'est la réponse : la corrélation ne mesure que la relation LINÉAIRE. Deux variables peuvent avoir une corrélation nulle et être pourtant parfaitement liées de façon non linéaire (par exemple Y = X² sur des valeurs de X symétriques autour de 0). A est vraie : ρ = Cov / (sX x sY) divise la covariance par le produit des écarts-types, ce qui supprime les unités et borne le résultat entre -1 et +1 (contrairement à la covariance, en unités au carré et non bornée). B est vraie : c'est justement l'intérêt du scatter plot, qui montre les relations non linéaires et les outliers que ρ ne voit pas. Autre piège de la fiche : corrélation ≠ causalité (spurious correlation).",
      ],
      // Variante plus difficile — calculer covariance et corrélation d'échantillon (n - 1 partout, cohérence numérateur / dénominateur)
      [
        "Four paired observations of variables X and Y are: (2, 5), (4, 3), (6, 4), and (8, 0). The sample covariance and the sample correlation coefficient of X and Y are closest to:",
        ["-4.67 and -0.84.", "-3.50 and -0.84.", "-3.50 and -0.63."],
        0,
        "Moyennes : X̄ = 20 / 4 = 5 et Ȳ = 12 / 4 = 3. Écarts de X : -3, -1, 1, 3 ; écarts de Y : 2, 0, 1, -3. Produits : -6 + 0 + 1 - 9 = -14. Covariance d'échantillon = -14 / (4 - 1) = -4,67. Écarts-types : sX = (20 / 3)^0,5 = 2,582 et sY = (14 / 3)^0,5 = 2,160. Corrélation = -4,67 / (2,582 x 2,160) = -4,67 / 5,578 = -0,84 : relation linéaire négative forte. A est donc correct. B est faux : -3,50 divise par n = 4 au lieu de n - 1 ; la corrélation de -0,84 resterait juste si l'on divisait aussi les variances par n (les deux corrections s'annulent), mais la covariance d'échantillon, elle, est fausse. C est faux : -0,63 = -3,50 / 5,578 mélange une covariance divisée par n et des écarts-types divisés par n - 1.",
      ],

      // Concept 5 — Probability tree & Bayes' formula (officielle — R4 Q3)
      [
        "An economist estimates a 60% probability that the economy will expand next year. The technology sector has a 70% probability of outperforming the market if the economy expands and a 10% probability of outperforming the market if the economy does not expand. Given the new information that the technology sector will not outperform the market, the probability that the economy will not expand is closest to:",
        ["54%.", "33%.", "67%."],
        2,
        "Arbre : P(expansion) = 0,60 et P(pas d'expansion) = 0,40. Probabilité que la tech ne surperforme pas : 0,60 x 0,30 + 0,40 x 0,90 = 0,18 + 0,36 = 0,54. Bayes : P(pas d'expansion | pas de surperformance) = 0,36 / 0,54 = 67 %. C est donc correct : l'information fait passer la probabilité de non-expansion de 40 % à 67 %. A est faux : 54 % est la probabilité non conditionnelle que la tech ne surperforme pas. B est faux : 33 % est la probabilité d'une expansion sachant que la tech ne surperforme pas (0,18 / 0,54).",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : lecture d'un arbre de probabilités (conditionnelles, jointes)
      [
        "Which of the following statements about a probability tree is least accurate?",
        [
          "The probabilities on the branches that follow the first node are conditional probabilities.",
          "The joint probabilities of all the end nodes sum to 1.",
          "The probability of reaching an end node equals the sum of the probabilities along the branches leading to it.",
        ],
        2,
        "On cherche l'affirmation fausse. C est fausse, donc c'est la réponse : la probabilité d'une issue finale est le PRODUIT des probabilités le long du chemin, P(A et B) = P(B | A) x P(A), pas leur somme. Dans la question officielle, l'issue « expansion puis pas de surperformance » vaut 0,60 x 0,30 = 0,18 ; la somme 0,60 + 0,30 = 0,90 n'a aucun sens. A est vraie : après le premier nœud, chaque branche est conditionnée par l'événement qui précède (P(surperformance | expansion) = 70 %). B est vraie : les issues finales sont mutuellement exclusives et exhaustives, leurs probabilités jointes somment donc à 1 (0,42 + 0,18 + 0,04 + 0,36 = 1). C'est ce qui permet ensuite d'appliquer Bayes : jointe du chemin ÷ somme des jointes compatibles avec l'information.",
      ],
      // Variante plus difficile — Bayes à trois états puis espérance conditionnelle (probabilités révisées appliquées aux rendements)
      [
        "An analyst assigns probabilities of 30%, 50%, and 20% to a strong, normal, and weak economy next year, with expected market returns of 15%, 6%, and -10%, respectively. A leading indicator rises with probability 80% in a strong economy, 50% in a normal economy, and 10% in a weak economy. If the indicator rises, the updated expected market return is closest to:",
        ["9.6%.", "5.5%.", "4.9%."],
        0,
        "Étape 1, probabilités jointes : forte 0,30 x 0,80 = 0,24 ; normale 0,50 x 0,50 = 0,25 ; faible 0,20 x 0,10 = 0,02. P(hausse de l'indicateur) = 0,24 + 0,25 + 0,02 = 0,51. Étape 2, Bayes : P(forte | hausse) = 0,24 / 0,51 = 47,1 % ; P(normale | hausse) = 0,25 / 0,51 = 49,0 % ; P(faible | hausse) = 0,02 / 0,51 = 3,9 %. Étape 3, espérance conditionnelle : 0,471 x 15 + 0,490 x 6 + 0,039 x (-10) = 7,06 + 2,94 - 0,39 = 9,6 %. A est donc correct : l'information fait passer l'espérance de 5,5 % à 9,6 %. B est faux : 5,5 % = 0,30 x 15 + 0,50 x 6 + 0,20 x (-10) est l'espérance a priori, qui ignore l'information. C est faux : 4,9 % = 0,24 x 15 + 0,25 x 6 + 0,02 x (-10) pondère par les probabilités jointes sans les diviser par P(hausse) = 0,51 ; ces poids somment à 0,51 et non à 1.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Quantitative Methods Page 3...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
