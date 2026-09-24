// Seed script — quiz de "drill" associé à la page 3 de la fiche PDF Equity
// (Market Efficiency). Questions officielles sélectionnées depuis la banque
// de pratique (Reading 43), corrigé vérifié contre le PDF "- Answers.pdf"
// correspondant.
// Usage: node scripts/seed-equity-drill-page3.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 3 (Market Efficiency)",
    difficulty: 2,
    questions: [
      [
        "Which of the following statements on the forms of the efficient market hypothesis (EMH) is least accurate?",
        ["The semi-strong form EMH assumes market prices reflect all public information.", "The strong-form EMH assumes market prices reflect all public and private information.", "The weak-form EMH assumes market prices reflect current public market information and expectations."],
        2,
        "La forme faible (weak-form) suppose que le prix reflète toute l'information HISTORIQUE de prix et de volume — et non \"l'information de marché publique courante et les anticipations\" comme l'affirme à tort C. A (forme semi-forte) et B (forme forte) sont des définitions exactes.",
      ],
      [
        "A market's efficiency is most likely to decrease by:",
        ["substantial analyst coverage of exchange-listed companies.", "a ban on short selling.", "high volumes of trading activity."],
        1,
        "Interdire la vente à découvert empêche les investisseurs informés de corriger les titres surévalués, ce qui réduit l'efficience du marché. A (couverture analyste) et C (volumes élevés) contribuent au contraire à AMÉLIORER l'efficience.",
      ],
      [
        "If the momentum effect persists over time, it would provide evidence against which of the following forms of market efficiency?",
        ["Semistrong form only.", "Weak form only.", "Both weak form and semistrong form."],
        2,
        "L'effet momentum suggère qu'il est possible de réaliser des rendements anormaux en utilisant uniquement des données de marché passées. Les trois formes d'efficience supposent que les prix reflètent pleinement les données de marché historiques ; un momentum persistant contredirait donc à la fois la forme faible ET la forme semi-forte.",
      ],
      [
        "The idea that uninformed traders, when faced with unclear information, observe the actions of informed traders to make decisions, is referred to as:",
        ["herding behavior.", "information cascades.", "narrow framing."],
        1,
        "Les \"cascades d'information\" désignent précisément le fait que des traders non informés observent les actions de traders informés pour prendre leurs décisions face à une information ambiguë. Le herding (A) désigne le regroupement des transactions sans lien nécessaire avec l'observation d'informés ; le narrow framing (C) désigne l'analyse isolée des événements.",
      ],
      [
        "An investor who is more risk averse with respect to potential negative outcomes than potential positive outcomes most likely exhibits which behavioral finance characteristic?",
        ["Conservatism.", "Loss aversion.", "Mental accounting."],
        1,
        "L'aversion aux pertes (loss aversion) se manifeste par une aversion au risque ASYMÉTRIQUE : l'investisseur déteste davantage une perte potentielle qu'il n'apprécie un gain équivalent. Le mental accounting (C) concerne le classement mental des investissements en comptes séparés ; le conservatism (A) désigne le maintien d'opinions antérieures malgré de nouvelles informations.",
      ],
      [
        "Tom Edwin, CFA, states, \"Individuals exhibit biases, such as loss aversion and herding, that result in observed pricing anomalies in financial markets. However, a strategy based on exploiting these anomalies will not earn positive abnormal returns over time.\" With regard to the efficient markets and behavioral finance views of market pricing, Edwin's statement is most likely consistent with:",
        ["behavioral finance, but not informationally efficient markets.", "neither behavioral finance nor informationally efficient markets.", "both behavioral finance and informationally efficient markets."],
        2,
        "La déclaration d'Edwin est cohérente à la fois avec la finance comportementale (les biais individuels provoquent un mauvais pricing) ET avec l'efficience informationnelle des marchés (ce mauvais pricing ne peut pas être exploité de façon constante pour générer des rendements ajustés du risque positifs). Ces deux visions ne sont donc pas incompatibles.",
      ],
      [
        "Which of the following statements least likely describes the role of a portfolio manager in perfectly efficient markets? Portfolio managers should:",
        ["quantify client's risk tolerance, communicate portfolio policies and strategies, and maintain a strict buy and hold policy avoiding any changes in the portfolio to minimize transaction costs.", "construct diversified portfolios that include international securities to eliminate unsystematic risk.", "construct a portfolio that includes financial and real assets."],
        0,
        "Un gérant de portefeuille doit certes quantifier la tolérance au risque du client et communiquer la stratégie, mais il doit aussi surveiller l'évolution des besoins du client et ajuster le portefeuille en conséquence — une politique stricte de \"buy and hold\" sans aucun changement ne sert pas l'intérêt du client.",
      ],
      [
        "An increase in which of the following factors would most likely improve a market's efficiency?",
        ["Bid-ask spreads.", "Restrictions on short selling.", "Number of participants."],
        2,
        "Plus le nombre de participants augmente, plus la vitesse d'ajustement des prix à l'information nouvelle tend à s'accélérer, ce qui améliore l'efficience. Les restrictions sur la vente à découvert et des spreads bid-ask élevés dégradent au contraire l'efficience.",
      ],
      [
        "Hume Inc. announces fourth quarter earnings per share of $1.20, which is 15% higher than last year. Hume's earnings are equal to the consensus analyst forecast for the quarter. Assuming markets are efficient, the announcement will most likely cause the price of Hume's stock to:",
        ["decrease.", "increase.", "remain the same."],
        2,
        "Sur un marché efficient, le cours intègre déjà les anticipations de bénéfices. Le bénéfice annoncé étant exactement égal au consensus des analystes, le prix ne devrait pas varier. Seule une SURPRISE par rapport aux attentes du marché (et non la variation en niveau absolu de +15%) affecte le prix.",
      ],
      [
        "An analyst with Guffman Investments has developed a stock selection model based on earnings announcements made by companies with high P/E stocks. The model predicts that investing in companies with P/E ratios twice that of their industry average that make positive earnings announcements will generate significant excess return. If the analyst has consistently made superior risk-adjusted returns using this strategy, which form of the efficient market hypothesis has been violated?",
        ["Strong, semistrong, and weak forms.", "Semistrong and strong forms only.", "Weak form only."],
        1,
        "Le ratio P/E et les annonces de résultats sont des informations PUBLIQUES ; générer de façon constante des rendements supérieurs en les exploitant viole la forme semi-forte (et donc la forme forte, plus restrictive). La forme faible (fondée sur les données de prix/volume historiques) n'est pas nécessairement violée par cette stratégie.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 3...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
