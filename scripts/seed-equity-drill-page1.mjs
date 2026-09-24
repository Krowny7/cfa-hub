// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Equity
// (Market Organization & Structure). Questions officielles sélectionnées
// depuis la banque de pratique (Reading 41), corrigé vérifié contre le PDF
// "- Answers.pdf" correspondant — jamais recalculé/inventé.
// Usage: node scripts/seed-equity-drill-page1.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 1 (Market Organization & Structure)",
    difficulty: 1,
    questions: [
      [
        "In contrast with a typical forward contract, futures contracts have:",
        ["standardized terms.", "less liquidity.", "greater counterparty risk."],
        0,
        "Les futures sont des forwards qui se négocient sur des bourses organisées avec des conditions standardisées, contrairement aux forwards qui sont des instruments sur mesure. Une chambre de compensation réduit le risque de contrepartie des futures (donc le distracteur C, qui affirme un risque de contrepartie plus élevé, est faux), et les futures, cotés en bourse, sont plus liquides que les forwards (donc B est aussi faux).",
      ],
      [
        "Which of the following orders is said to be \"behind the market\"?",
        ["Market sell order when the best bid is 38 and the best ask is 39.", "Limit sell order at 38 when the best ask is 39.", "Limit buy order at 38 when the best bid is 39."],
        2,
        "Un ordre limite d'achat est \"derrière le marché\" si son prix limite est inférieur au meilleur bid : ici le meilleur bid est 39 et l'ordre d'achat est à 38, donc il est derrière le marché. Le distracteur B est un piège : un ordre de vente à 38 alors que l'ask est à 39 est en réalité un ordre agressif (exécutable immédiatement), pas \"derrière le marché\". Les ordres au marché (A) ne sont jamais qualifiés ainsi.",
      ],
      [
        "Which of the following statements about short sales is least accurate?",
        ["Proceeds from short sales cannot be withdrawn from the account.", "The short seller is required to replace the borrowed securities within six months of a short sale.", "The short seller must pay the lender of the stock any dividends paid by the company."],
        1,
        "Il n'existe aucun délai maximal légal pour couvrir une vente à découvert : le titre emprunté doit être restitué dès que le prêteur le demande, pas nécessairement dans les six mois — donc B est faux. Les affirmations A (le produit de la vente sert de garantie et ne peut être retiré) et C (le vendeur à découvert doit reverser au prêteur les dividendes versés) sont vraies.",
      ],
      [
        "An objective of financial market regulation is to:",
        ["ensure that inside information is made public in a timely manner.", "prevent uninformed investors from participating in financial markets.", "reduce information gathering costs by requiring common financial reporting standards."],
        2,
        "Un objectif de la régulation des marchés est d'exiger des standards de reporting financier communs, ce qui réduit le coût de collecte d'information pour les investisseurs. La régulation ne vise pas à écarter les investisseurs non informés du marché (B est faux) ; elle vise plutôt à empêcher ceux qui détiennent une information non publique d'en profiter, sans exiger que toute information privilégiée devienne publique immédiatement (A est faux).",
      ],
      [
        "Which of the following statements about securities exchanges is most accurate?",
        ["Call markets are markets in which the stock is only traded at specific times.", "Continuous markets are markets where trades occur 24 hours per day.", "Setting a negotiated price to clear the market is a method used to set the closing price in major continuous markets."],
        0,
        "Un marché \"call\" (marché à enchères périodiques) n'échange le titre qu'à des moments précis : c'est exact. Le distracteur B est faux : les marchés continus permettent des transactions à tout moment pendant les heures d'ouverture, pas nécessairement 24h/24. Le distracteur C est également faux : fixer un prix négocié unique sert à établir le prix D'OUVERTURE (et non de clôture) sur les grands marchés continus.",
      ],
      [
        "Which of the following statements about financial intermediaries is most accurate?",
        ["Arbitrageurs buy securities with the anticipation that they will be able to sell the securities in the future at higher prices.", "Brokers seek out traders that are willing to take the opposite sides of their clients' orders.", "Dealers buy a security in one market and simultaneously sell the same security in a different market."],
        1,
        "Les courtiers (brokers) recherchent des contreparties prêtes à prendre le côté opposé des ordres de leurs clients : c'est exact. Le distracteur A décrit en réalité les dealers (qui achètent des titres en espérant les revendre plus cher plus tard), pas les arbitrageurs. Le distracteur C décrit en réalité les arbitrageurs (achat sur un marché, revente simultanée sur un autre à un prix plus élevé), pas les dealers.",
      ],
      [
        "A financial system in which transactions have low costs is said to exhibit:",
        ["allocational efficiency.", "informational efficiency.", "operational efficiency."],
        2,
        "L'efficience opérationnelle désigne des coûts de transaction faibles. Les distracteurs confondent avec l'efficience informationnelle (les prix reflètent rapidement toute l'information pertinente) et l'efficience allocative (le capital est dirigé vers ses usages les plus productifs) — deux concepts distincts qui ne portent pas sur le coût des transactions.",
      ],
      [
        "Byron Campbell purchased 300 shares of Crescent, Inc., stock at a price of $80 per share. The purchase was made on margin with an initial margin requirement of 50%. Assuming the maintenance margin is 25%, the stock price of Crescent, Inc. has to fall below what level for Campbell to receive a margin call?",
        ["$20.00.", "$40.00.", "$53.33."],
        2,
        "Le prix déclenchant l'appel de marge se calcule par : P = P0 × (1 − marge initiale) / (1 − marge de maintenance) = 80 × (1 − 0,50) / (1 − 0,25) = 40 / 0,75 = 53,33 $. Les distracteurs A et B n'appliquent pas correctement le dénominateur (1 − marge de maintenance) de la formule officielle.",
      ],
      [
        "The prospectus for the Horizon Fund states that it invests only in real assets. Which of the following would the Horizon Fund most likely include in its portfolio?",
        ["Foreign currencies.", "Common stock of a technology company.", "An apartment complex."],
        2,
        "Les actifs réels (\"real assets\") ont une présence physique, comme l'immobilier ; un immeuble résidentiel est donc un actif réel. Le distracteur B est un piège classique : les actions ordinaires sont des actifs FINANCIERS (créances sur des actifs physiques ou réels), pas des actifs réels eux-mêmes.",
      ],
      [
        "Which of the following is least likely a characteristic of a well-functioning market?",
        ["Reliable information is available on price and volume.", "Prices change significantly from one transaction to the next.", "Prices adjust quickly when new information becomes available."],
        1,
        "Dans un marché bien organisé, les prix ne devraient PAS varier significativement d'une transaction à l'autre, car de nombreux acheteurs et vendeurs sont disposés à échanger près du prix courant (continuité des prix). Les distracteurs A et C décrivent au contraire de vraies caractéristiques d'un marché bien organisé.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 1...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
