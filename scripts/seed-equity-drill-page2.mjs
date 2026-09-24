// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Equity
// (Security Market Indexes). Questions officielles sélectionnées depuis la
// banque de pratique (Reading 42), corrigé vérifié contre le PDF
// "- Answers.pdf" correspondant.
// Usage: node scripts/seed-equity-drill-page2.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 2 (Security Market Indexes)",
    difficulty: 1,
    questions: [
      [
        "The type of index weighting that produces a portfolio similar to that of a momentum strategy is an index with weights that are:",
        ["equal.", "based on market capitalization.", "based on fundamentals."],
        1,
        "Un indice pondéré par la capitalisation boursière donne progressivement plus de poids aux titres dont la valeur a le plus augmenté, reproduisant ainsi le comportement d'une stratégie momentum. Les pondérations égales ou fondées sur les fondamentaux (A et C) ne créent pas ce biais momentum.",
      ],
      [
        "Assume a stock index consists of many firms who have recently split their stock. Which of the following weighting schemes will see a bias due to the impact of stock splits?",
        ["Unweighted price series.", "Market value-weighted series.", "Price-weighted series."],
        2,
        "Dans une série pondérée par les prix, les grandes entreprises performantes perdent du poids dans l'indice simplement parce qu'elles ont divisé leur action, ce qui crée un biais à la baisse. Les distracteurs A et B ne sont pas biaisés : les firmes qui splittent leur action conservent un poids identique avant et après le split dans ces deux méthodes.",
      ],
      [
        "The providers of the Smith 30 Stock Index remove Jones Company from the index because it has been acquired by another firm, and replace it with Johnson Company. This change in the index is best described as an example of:",
        ["rebalancing.", "reconstitution.", "redefinition."],
        1,
        "La reconstitution désigne le changement des TITRES qui composent un indice — nécessaire quand un constituant disparaît (ici, absorption par acquisition). Le distracteur A (rebalancing) est un piège fréquent : le rééquilibrage consiste à ajuster les POIDS des titres déjà présents, pas à changer la composition.",
      ],
      [
        "Which of the following is least likely required when defining a security market index? The:",
        ["number of securities in the index.", "target market the index will represent.", "weighting method for the index."],
        0,
        "Un indice de marché n'a pas nécessairement de nombre fixe de titres : certains indices incluent tous les titres cotés sur une bourse donnée, un nombre qui varie dans le temps. Définir le marché cible et la méthode de pondération sont en revanche des éléments obligatoires.",
      ],
      [
        "An analyst using the capital asset pricing model is most likely to use a security market index as a proxy for:",
        ["the market return.", "beta.", "the risk-free rate."],
        0,
        "Le rendement d'un indice de marché sert de proxy pour le rendement du marché dans le CAPM. Le bêta se calcule à partir de la covariance du titre avec le marché mais n'est pas lui-même un indice ; le taux sans risque est généralement représenté par un titre du Trésor, pas par un indice boursier.",
      ],
      [
        "Ken Miller, CFA, wants to compare the returns on government agency bonds to the returns on corporate bonds. Peg Egan, CFA, wants to compare the returns on high yield bonds in developed markets to the returns on investment grade bonds in emerging markets. Which of these analysts is most likely able to use bond indexes for their analysis?",
        ["Both of these analysts.", "Neither of these analysts.", "Only one of these analysts."],
        0,
        "Étant donné le vaste univers d'obligations échangées sur les marchés, des indices existent (ou peuvent être construits) pour pratiquement n'importe quelle caractéristique ou classification obligataire, y compris celles décrites par les deux analystes.",
      ],
      [
        "An index provider maintains a price index and a total return index for the same 40 stocks. Assuming both indexes begin the year with the same value, the total return index at the end of the year will least likely be:",
        ["equal to the price index if the constituent stocks do not pay dividends.", "greater than the price index.", "less than the price index if the price index increases and greater than the price index if the price index decreases."],
        2,
        "Un indice total return inclut les flux de trésorerie (dividendes, intérêts) en plus des variations de prix, et ne peut donc jamais être INFÉRIEUR à l'indice de prix équivalent — l'affirmation C est fausse et constitue la bonne réponse à cette question \"least likely\".",
      ],
      [
        "Which of the following statements regarding bond market indexes is least accurate?",
        ["The bond universe is more stable than the stock universe.", "There are more bond issues than stocks.", "Unlike stocks, bonds lack continuous price trading data."],
        0,
        "L'univers obligataire change constamment (nouvelles émissions, échéances, rappels) : il est donc MOINS stable que l'univers actions, contrairement à ce qu'affirme A. Les distracteurs B et C sont des affirmations vraies qui expliquent pourquoi construire un indice obligataire est plus difficile.",
      ],
      [
        "Voluntary reporting of performance by hedge fund managers leads to:",
        ["an upward bias in hedge fund index returns.", "a downward bias in hedge fund index returns.", "no appreciable bias in hedge fund index returns."],
        0,
        "Les gérants de hedge funds ayant le choix de déclarer ou non leurs performances, seuls les fonds affichant de bons résultats ont tendance à le faire, ce qui crée un biais à la HAUSSE des indices de hedge funds.",
      ],
      [
        "Which of the following statements best describes the investment assumption used to calculate an equal weighted price indicator series?",
        ["A proportionate market value investment is made for each stock in the index.", "An equal dollar investment is made in each stock in the index.", "An equal number of shares of each stock are used in the index."],
        1,
        "Une série pondérée de façon égale suppose qu'un montant en dollars identique est investi dans chaque titre de l'indice. Le distracteur A décrit en réalité un indice pondéré par la capitalisation boursière, et C décrirait un indice pondéré par les prix.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 2...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
