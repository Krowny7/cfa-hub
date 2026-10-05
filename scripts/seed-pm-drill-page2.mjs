// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Portfolio
// Management (Portfolio Risk and Return: Part II). Structure : 5 concepts clés
// de la page, chacun en 3 questions : 1 question officielle
// (banque de pratique CFA, "Reading 21 Portfolio Risk and Return Part II",
// corrigé vérifié contre "- Answers.pdf", recopiée à l'identique) + 1 variante
// "angle différent" (même notion, jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement à
// plusieurs étapes / pièges combinés / donnée-piège / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français. Remis au cadre le 3 octobre 2026 (l'ancienne
// version, en français, ne suivait pas ce modèle).
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concepts d'origine 1, 3, 6 retirés de la fiche, leurs
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
// Usage: node scripts/seed-pm-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";

const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 2 (Portfolio Risk and Return: Part II)",
    difficulty: 2,
    questions: [
      // Concept 1 — Risque systématique vs non systématique (officielle)
      [
        "In equilibrium, investors should only expect to be compensated for bearing systematic risk because:",
        [
          "individual securities in equilibrium only have systematic risk.",
          "nonsystematic risk can be eliminated by diversification.",
          "systematic risk is specific to the securities the investor selects.",
        ],
        1,
        "Le risque non systématique (spécifique à l'entreprise) peut être éliminé gratuitement par la diversification : le marché n'a donc aucune raison de le rémunérer. Seul le risque systématique, non diversifiable, est rémunéré à l'équilibre. A est faux : chaque titre porte à la fois du risque systématique et du risque non systématique ; seul un portefeuille bien diversifié (comme le portefeuille de marché) n'a plus que du risque systématique. C inverse les définitions : c'est le risque NON systématique qui est propre aux titres choisis ; le risque systématique est le risque de marché, commun à tous.",
      ],
      // Variante angle différent — comparer deux titres : risque total élevé vs bêta élevé
      [
        "Stock B, a biotech company awaiting the results of a single drug trial, has a standard deviation of returns of 60% and a beta of 0.6. Stock M, a machine-tool manufacturer, has a standard deviation of returns of 25% and a beta of 1.3. According to the CAPM, which of the following statements is most accurate?",
        [
          "Stock M should have the higher expected return, because only systematic risk is priced.",
          "Stock B should have the higher expected return, because its total risk is more than twice as high.",
          "Both stocks should have the same expected return, because their unsystematic risk can be diversified away.",
        ],
        0,
        "Comparaison de deux profils. Le biotech a un risque TOTAL très élevé, mais il vient surtout d'un facteur propre à l'entreprise (le résultat de l'essai clinique), donc diversifiable ; son bêta est faible (0,6). Le fabricant de machines-outils est moins volatil mais plus sensible à la conjoncture (bêta 1,3). Le CAPM ne rémunère que le risque systématique : M doit offrir le rendement attendu le plus élevé. B confond risque total et risque rémunéré (un β faible ne veut pas dire un σ faible, et inversement). C a raison de dire que le risque non systématique se diversifie, mais en tire une mauvaise conclusion : une fois ce risque éliminé, il reste des expositions systématiques différentes (β de 0,6 contre 1,3), donc des rendements attendus différents.",
      ],
      // Variante plus difficile — isoler la variance non systématique (σe² = σi² − β²σm²) et dire si elle est rémunérée
      [
        "A stock has a standard deviation of returns of 40% and a beta of 1.2. The standard deviation of the market's returns is 20%. What proportion of the stock's total variance is unsystematic, and is that portion rewarded with a higher expected return in equilibrium?",
        [
          "40%; no, it is not rewarded.",
          "64%; yes, because it makes up most of the stock's total risk.",
          "64%; no, it is not rewarded.",
        ],
        2,
        "(1) Variance totale = 0,40² = 0,16. (2) Variance systématique = β² × σm² = 1,44 × 0,04 = 0,0576. (3) Variance non systématique = σe² = 0,16 − 0,0576 = 0,1024, soit 0,1024 / 0,16 = 64 % de la variance totale. Contrôle : ρ = β × σm / σi = 1,2 × 0,20 / 0,40 = 0,6, et ρ² = 0,36 est la part systématique ; 1 − 0,36 = 64 %. (4) Rémunération : ce risque se diversifie sans coût, il n'est donc pas rémunéré, même s'il représente l'essentiel du risque du titre. A décompose les écarts-types au lieu des variances (β × σm = 24 %, soit 60 % des 40 %, d'où 40 % « non systématique ») : ce sont les variances, et non les σ, qui s'additionnent. B fait le bon calcul mais oublie que seul le risque systématique est rémunéré.",
      ],

      // Concept 2 — Bêta : calcul et interprétation (officielle)
      [
        "An analyst has estimated the following: Correlation of Bahr Industries returns with market returns = 0.8; Variance of the market returns = 0.0441; Variance of Bahr returns = 0.0225. The beta of Bahr Industries stock is closest to:",
        ["0.77.", "0.57.", "0.67."],
        1,
        "β = ρ × σi / σm, avec des ÉCARTS-TYPES : σBahr = √0,0225 = 0,15 et σm = √0,0441 = 0,21. β = 0,8 × 0,15 / 0,21 = 0,571. Méthode équivalente : Cov = 0,8 × 0,15 × 0,21 = 0,0252, puis β = Cov / σm² = 0,0252 / 0,0441 = 0,57. Contrôle de cohérence : β = ρ × 0,714 ; comme ρ ≤ 1, le bêta ne peut pas dépasser 0,714, ce qui exclut A (0,77). C (0,67) supposerait une corrélation d'environ 0,94, pas 0,8. L'erreur classique à éviter : utiliser les variances au lieu des écarts-types (0,8 × 0,0225 / 0,0441 = 0,41).",
      ],
      // Variante angle différent — cas limite : un bêta négatif
      [
        "A stock has a beta of −0.4, and the expected market risk premium is positive. Which of the following statements about this stock is most accurate?",
        [
          "Adding it to a diversified portfolio reduces the portfolio's systematic risk, and its CAPM expected return is below the risk-free rate.",
          "Its total risk is negative, so it reduces portfolio risk regardless of its weight in the portfolio.",
          "Its CAPM expected return must be negative, because its returns tend to move against the market.",
        ],
        0,
        "Cas limite du bêta : β = Cov(i, m) / σm² < 0 signifie que le titre tend à monter quand le marché baisse. (1) Effet sur le risque : le bêta d'un portefeuille est la moyenne pondérée des bêtas ; ajouter un bêta négatif fait baisser le risque systématique — le titre joue un rôle d'assurance. (2) CAPM : E(R) = Rf + (−0,4) × prime de marché < Rf ; les investisseurs acceptent un rendement inférieur au taux sans risque en échange de cette couverture. B est faux : le risque total (σ) ne peut jamais être négatif ; c'est la covariance avec le marché qui l'est. C va trop loin : E(R) est inférieur à Rf, mais pas forcément négatif (par exemple, Rf = 4 % et une prime de 5 % donnent 4 % − 2 % = 2 %).",
      ],
      // Variante plus difficile — bêta d'un portefeuille à partir de données hétérogènes (covariance, corrélation, σ-piège)
      [
        "A portfolio is invested 60% in Stock X and 40% in Stock Y. The covariance between Stock X's returns and the market's returns is 0.0270, and Stock X's standard deviation of returns is 35%. Stock Y has a standard deviation of returns of 24% and a correlation of 0.5 with the market. The market's standard deviation of returns is 15%. The portfolio's beta is closest to:",
        ["0.43.", "1.04.", "1.23."],
        1,
        "(1) βX = Cov / σm² = 0,0270 / 0,15² = 0,0270 / 0,0225 = 1,20 ; le σ de X (35 %) est une donnée-piège, inutile avec cette méthode. (2) βY = ρ × σY / σm = 0,5 × 0,24 / 0,15 = 0,80. (3) Bêta du portefeuille = moyenne pondérée des bêtas : 0,6 × 1,20 + 0,4 × 0,80 = 0,72 + 0,32 = 1,04. A (0,43) divise la covariance par σm au lieu de σm² (βX = 0,18). C (1,23) calcule βY avec des variances au lieu des écarts-types (0,5 × 0,0576 / 0,0225 = 1,28). À retenir : β = Cov / σm² = ρ × σi / σm — jamais σi² / σm².",
      ],

      // Concept 3 — CAPM : rendement requis (officielle)
      [
        "What is the required rate of return for a stock with a beta of 1.2, when the risk-free rate is 6% and the market risk premium is 12%?",
        ["13.2%.", "15.4%.", "20.4%."],
        2,
        "L'énoncé donne la PRIME de risque de marché [E(Rm) − Rf] = 12 %, pas le rendement du marché : E(R) = Rf + β × prime = 6 % + 1,2 × 12 % = 6 % + 14,4 % = 20,4 %. A (13,2 %) traite 12 % comme le rendement du marché et lui retire encore le taux sans risque : 6 % + 1,2 × (12 % − 6 %). C'est le piège classique : bien lire si l'énoncé donne Rm ou la prime [Rm − Rf]. B (15,4 %) ne correspond à aucune application correcte de la formule.",
      ],
      // Variante angle différent — calcul inversé : reconstruire la SML à partir de deux titres
      [
        "Two correctly priced stocks plot on the security market line. Stock A has a beta of 0.8 and an expected return of 9%, and Stock B has a beta of 1.4 and an expected return of 12%. The expected return on the market portfolio is closest to:",
        ["5.0%.", "10.0%.", "11.25%."],
        1,
        "Calcul inversé : on reconstruit la SML à partir de deux points. Pente = prime de risque de marché = (12 % − 9 %) / (1,4 − 0,8) = 3 % / 0,6 = 5 %. Ordonnée à l'origine : Rf = 9 % − 0,8 × 5 % = 5 % (vérification avec B : 5 % + 1,4 × 5 % = 12 %). Le portefeuille de marché a un bêta de 1 : E(Rm) = Rf + prime = 5 % + 5 % = 10 %. A (5 %) confond le rendement du marché avec la prime de risque — le piège symétrique de la question officielle. C (11,25 %) oublie le taux sans risque et divise le rendement de A par son bêta (9 % / 0,8), comme si E(R) = β × E(Rm).",
      ],
      // Variante plus difficile — Rf nominal (réel + inflation), bêta négatif et σ-piège
      [
        "The real risk-free rate is 1.5%, expected inflation is 2.5%, and the expected return on the market is 9%. Stock N has a beta of −0.4 and a standard deviation of returns of 35%. Using the CAPM and the approximate nominal risk-free rate, Stock N's required return is closest to:",
        ["2.0%.", "0.4%.", "6.0%."],
        0,
        "(1) Taux sans risque nominal ≈ taux réel + inflation attendue = 1,5 % + 2,5 % = 4 %. (2) Prime de marché = 9 % − 4 % = 5 % (l'énoncé donne le rendement du marché, pas la prime). (3) E(R) = 4 % + (−0,4) × 5 % = 4 % − 2 % = 2,0 %. Le σ de 35 % est une donnée-piège : le CAPM ne rémunère que le risque systématique (β), et un bêta négatif justifie un rendement requis inférieur au taux sans risque malgré une forte volatilité. B (0,4 %) commet l'erreur classique Rf + β × Rm (4 % − 0,4 × 9 %) au lieu de Rf + β × (Rm − Rf). C (6,0 %) perd le signe du bêta (4 % + 0,4 × 5 %). Prendre le taux réel comme Rf donnerait 1,5 % − 0,4 × 7,5 % = −1,5 %.",
      ],

      // Concept 4 — Sur/sous-évaluation via la SML (officielle)
      [
        "The stock of Mia Shoes is currently trading at $15 per share, and the stock of Video Systems is currently trading at $18 per share. An analyst expects the prices of both stocks to increase by $2 over the next year and neither company pays dividends. Mia Shoes has a beta of 0.9 and Video Systems has a beta of (-0.3). If the expected market return is 15% and the risk-free rate is 8%, which trading strategy does the CAPM indicate for these two stocks?",
        ["Mia Shoes: Buy; Video Systems: Buy.", "Mia Shoes: Buy; Video Systems: Sell.", "Mia Shoes: Sell; Video Systems: Buy."],
        2,
        "On compare le rendement prévu au rendement requis par le CAPM. Mia Shoes : requis = 8 % + 0,9 × (15 % − 8 %) = 14,3 % ; prévu = 2 / 15 = 13,3 % < 14,3 % → sous la SML, surévaluée → vendre. Video Systems : requis = 8 % + (−0,3) × 7 % = 5,9 % ; prévu = 2 / 18 = 11,1 % > 5,9 % → au-dessus de la SML, sous-évaluée → acheter. A (tout acheter) oublie que le rendement prévu de Mia Shoes ne couvre pas le rendement requis par son risque. B inverse les deux conclusions — typiquement en jugeant Video Systems risquée à cause de son bêta négatif, alors qu'un bêta négatif ABAISSE le rendement requis. Retenir : au-dessus de la SML = sous-évalué.",
      ],
      // Variante angle différent — calcul inversé : quel prix de fin d'année rendrait le titre correctement évalué
      [
        "A stock with a beta of 1.2 currently trades at $40 and is expected to pay a dividend of $1 at the end of the year. The risk-free rate is 4%, and the expected return on the market is 9%. For the stock to be correctly priced according to the CAPM, its expected price at the end of the year must be closest to:",
        ["$44.00.", "$44.92.", "$43.00."],
        2,
        "Calcul inversé : au lieu de comparer un rendement prévu au rendement requis, on cherche le prix de fin d'année qui les égalise. (1) Rendement requis = 4 % + 1,2 × (9 % − 4 %) = 10 %. (2) Correctement évalué si (P1 − 40 + 1) / 40 = 10 %, soit P1 + 1 = 44 et P1 = 43,00 $. Avec une prévision au-dessus de 43 $, le titre serait au-dessus de la SML (sous-évalué) ; en dessous, surévalué. A (44,00 $) oublie le dividende, qui fait partie du rendement. B (44,92 $) applique l'erreur classique Rf + β × Rm = 4 % + 1,2 × 9 % = 14,8 %, puis 40 × 1,148 − 1 = 44,92 $.",
      ],
      // Variante plus difficile — bêta à partir de la covariance, dividende, σ-piège, ampleur de la sous-évaluation
      [
        "An analyst gathers the following data for Stock Q: current price $50, expected price in one year $54, expected dividend $1.50, covariance of returns with the market 0.0288, and standard deviation of returns 30%. The market's standard deviation of returns is 16%, the expected market return is 8%, and the risk-free rate is 3%. Based on the CAPM, Stock Q is:",
        [
          "undervalued by about 5.0%, so the analyst should buy it.",
          "undervalued by about 2.4%, so the analyst should buy it.",
          "overvalued by about 0.6%, so the analyst should sell it.",
        ],
        1,
        "(1) Bêta = Cov / σm² = 0,0288 / 0,0256 = 1,125 (le σ du titre, 30 %, est inutile). (2) Rendement requis = 3 % + 1,125 × (8 % − 3 %) = 8,625 %. (3) Rendement prévu = (54 − 50 + 1,50) / 50 = 11,0 %. (4) Prévu > requis de 2,375 % : le titre est au-dessus de la SML, sous-évalué → acheter (c'est un alpha de Jensen attendu positif). A (5,0 %) prend à tort la corrélation pour le bêta : 0,0288 / (0,30 × 0,16) = 0,60, d'où un requis de 6 %. C (0,6 %) oublie le dividende : (54 − 50) / 50 = 8 % < 8,625 %, et conclut à tort à une surévaluation.",
      ],

      // Concept 5 — Mesures de performance ajustées au risque (officielle)
      [
        "An investor's wealth is approximately 50% in bonds and broad-based equities and 50% in shares of a company she founded. Which of the following measures of risk-adjusted returns is least appropriate for this investor's portfolio?",
        ["M-squared.", "Sharpe ratio.", "Jensen's alpha."],
        2,
        "Le portefeuille est très concentré (50 % sur une seule entreprise) : il porte beaucoup de risque non systématique. Les mesures fondées sur le risque total (σ) — ratio de Sharpe et M² — en tiennent compte et conviennent à un portefeuille non pleinement diversifié. Jensen's alpha (comme la mesure de Treynor) ne s'appuie que sur le bêta, c'est-à-dire le risque systématique : il n'est pertinent que pour un portefeuille bien diversifié. A et B sont donc appropriés ; C est la mesure la moins adaptée.",
      ],
      // Variante angle différent — comparer deux fonds : Sharpe et Treynor donnent des classements opposés
      [
        "The risk-free rate is 4%. Fund X has a return of 12%, a standard deviation of returns of 16%, and a beta of 1.0. Fund Y has a return of 14%, a standard deviation of returns of 25%, and a beta of 0.8. Which of the following statements about the funds' Sharpe ratios and Treynor measures is most accurate?",
        [
          "Fund Y ranks higher on both measures, because it earned the higher return.",
          "Fund X ranks higher on the Treynor measure and Fund Y on the Sharpe ratio, because Fund X carries more unsystematic risk.",
          "Fund X ranks higher on the Sharpe ratio and Fund Y on the Treynor measure, because Fund Y carries more unsystematic risk.",
        ],
        2,
        "Sharpe = (R − Rf) / σ : X = 8 / 16 = 0,50 ; Y = 10 / 25 = 0,40 → X devant. Treynor = (R − Rf) / β : X = 8 / 1,0 = 8,0 ; Y = 10 / 0,8 = 12,5 → Y devant. Les classements divergent parce que Y a beaucoup de risque total pour peu de risque systématique : le σ pénalise ce risque non systématique, le β l'ignore. Pour un investisseur dont c'est le seul placement (non diversifié), Sharpe est la bonne référence ; pour un fonds noyé dans un portefeuille bien diversifié, Treynor. A juge sur le rendement brut, sans ajustement au risque. B inverse les deux classements.",
      ],
      // Variante plus difficile — calculer M² et Jensen's alpha, avec deux erreurs de formule classiques
      [
        "Portfolio P had a return of 11%, a standard deviation of returns of 25%, and a beta of 1.1. Over the same period, the market returned 9% with a standard deviation of returns of 20%, and the risk-free rate was 3%. Portfolio P's M-squared (M²) measure and Jensen's alpha are closest to:",
        [
          "M² = 9.4%; Jensen's alpha = 1.4%.",
          "M² = 8.8%; Jensen's alpha = 1.4%.",
          "M² = 9.4%; Jensen's alpha = −1.9%.",
        ],
        0,
        "(1) Sharpe de P = (11 % − 3 %) / 25 % = 0,32 ; celui du marché = (9 % − 3 %) / 20 % = 0,30. (2) M² = Rf + Sharpe × σm = 3 % + 0,32 × 20 % = 9,4 % : c'est le rendement de P ramené au risque du marché (80 % dans P et 20 % dans l'actif sans risque) ; 9,4 % > 9 %, P a battu le marché ajusté du risque total (M² alpha = +0,4 %). (3) Jensen's alpha = Rp − [Rf + β × (Rm − Rf)] = 11 % − (3 % + 1,1 × 6 %) = 11 % − 9,6 % = +1,4 %. B (8,8 %) met à l'échelle le rendement TOTAL (11 % × 20 / 25) et oublie la part placée au taux sans risque (0,2 × 3 %). C (−1,9 %) commet l'erreur Rf + β × Rm (3 % + 1,1 × 9 % = 12,9 %). Les deux mesures concluent ici dans le même sens, mais elles ne mesurent pas le même risque : σ total pour M², β pour Jensen.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
