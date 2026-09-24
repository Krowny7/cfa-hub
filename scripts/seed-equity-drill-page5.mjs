// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF Equity
// (Company Analysis: Past & Present + Forecasting). Questions officielles
// sélectionnées depuis la banque de pratique (Readings 45 et 47), corrigé
// vérifié contre les PDF "- Answers.pdf" correspondants.
// Usage: node scripts/seed-equity-drill-page5.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 5 (Company Analysis: Past, Present & Forecasting)",
    difficulty: 2,
    questions: [
      // Reading 45 — Company Analysis: Past and Present
      [
        "Items in an initial research report on a company that are most likely to also appear in subsequent reports include a(n):",
        ["industry overview and analysis of the company's competitive position.", "description of the company's business model and strategy.", "rationale for the investment recommendation."],
        2,
        "Les rapports initiaux et les rapports subséquents incluent tous deux une recommandation (achat/conservation/vente) ainsi que sa justification. En revanche, la description de l'entreprise et la vue d'ensemble du secteur figurent dans le rapport initial mais ne sont généralement pas répétées dans les rapports suivants, sauf si de nouvelles informations sont apparues.",
      ],
      [
        "Which of the following ratios should an analyst use who wishes to evaluate the returns a company generates based on the amount of financial leverage?",
        ["Return on equity (ROE).", "Return on invested capital (ROIC).", "Return on assets (ROA)."],
        0,
        "Le ROE intègre l'effet du levier financier, puisqu'il est égal au ROA multiplié par le ratio de levier financier (actif/capitaux propres). Le ROA et le ROIC servent au contraire à exprimer des rendements non affectés par le levier (« unlevered returns »).",
      ],
      [
        "If a company's operating income increases from $3 million to $3.3 million and its net income increases from $1.5 million to $1.8 million, its degree of financial leverage is closest to:",
        ["1.0.", "2.0.", "0.5."],
        1,
        "Le DFL se calcule en divisant la variation en % du résultat net par la variation en % du résultat opérationnel. Ici, le résultat net augmente de 20 % (1,5M→1,8M) et le résultat opérationnel de 10 % (3M→3,3M), soit 20 %/10 % = 2,0. Le distracteur 0,5 inverse numérateur et dénominateur, et 1,0 prend à tort la variation en dollars ($0,3M) plutôt que les variations en pourcentage.",
      ],
      [
        "During a period of increasing sales, compared to firms with lower operating leverage, earnings growth for firms with high operating leverage will be:",
        ["higher.", "unaffected.", "lower."],
        0,
        "Un levier opérationnel élevé signifie qu'une variation relativement faible des ventes entraîne une variation plus importante du résultat opérationnel. Donc en période de hausse des ventes, une entreprise à levier opérationnel élevé (coûts fixes élevés) verra sa croissance des bénéfices être supérieure à celle d'une entreprise à levier opérationnel plus faible.",
      ],
      [
        "A firm is most likely to have pricing power if:",
        ["costs to exit the industry are high.", "its market share is high.", "its product is differentiated."],
        2,
        "Les entreprises proposant des produits différenciés en termes de qualité ou de caractéristiques ont davantage de pouvoir de fixation des prix que celles vendant des produits banalisés. Une part de marché élevée n'implique pas nécessairement du pouvoir de prix (si quatre entreprises ont chacune 25 % de part de marché, aucune n'a de pouvoir de prix significatif). Des coûts de sortie élevés peuvent au contraire créer une surcapacité et intensifier la concurrence par les prix.",
      ],
      // Reading 47 — Company Analysis: Forecasting
      [
        "Pam Jones, CFA, creates pro forma financial statements for a company she is analyzing. In developing the income statements, she needs to forecast growth for the selling, general, and administrative (SG&A) line item. Her forecasted number will most likely be driven by:",
        ["inflation forecasts for fixed SG&A, and sales growth for variable SG&A.", "sales growth for fixed SG&A, and inflation forecasts for variable SG&A.", "sales growth for both fixed and variable SG&A."],
        0,
        "Les SG&A comportent une composante fixe et une composante variable. La partie fixe est peu affectée par les ventes et doit être projetée avec un taux d'inflation ; la partie variable est plus corrélée aux ventes et doit être projetée avec la croissance des ventes — c'est l'inverse de la réponse B.",
      ],
      [
        "A top-down revenue forecast is most likely to be based on expected:",
        ["GDP growth.", "sales at existing and new outlets.", "product prices and volumes."],
        0,
        "Une prévision « top-down » part de variables macroéconomiques telles que la croissance du PIB. Les approches « bottom-up », à l'inverse, se basent sur des facteurs propres à l'entreprise comme les prix/volumes des produits ou les ventes par point de vente existant/nouveau.",
      ],
      [
        "Sandra Page, CFA, is preparing a pro forma balance sheet for a company. Page is planning to incorporate several ad hoc additions into her forecast that are not currently accounted for on the company's recently published balance sheet from the prior year. Which of the following items will Page most likely need to add?",
        ["A potential gain stemming from a lawsuit in which the company was the plaintiff.", "Unrealized gains on equity securities since the date of the previous balance sheet.", "Forecasted losses due to exchange rate fluctuations over the course of the year."],
        0,
        "Les gains conditionnels (contingent gains), comme un gain potentiel issu d'un procès en tant que demandeur, ne sont pas comptabilisés dans les états financiers tant qu'ils ne se sont pas matérialisés — l'analyste doit donc les ajouter comme un élément ad hoc à son prévisionnel. Les fluctuations de change sont imprévisibles et les gains latents sur titres de capitaux propres ne sont pas des ajouts ad hoc typiques d'un bilan prévisionnel.",
      ],
      [
        "Which of the following represents a benefit to an analyst incorporating scenario analysis into her forecasting?",
        ["Accounting for potential changes in the company's economic environment.", "Adjusting past results for unidentified errors.", "Solidifying a single forecasted number for bottom-line profits."],
        0,
        "L'analyse de scénarios permet de tenir compte du caractère incertain des prévisions en envisageant plusieurs évolutions possibles de l'environnement économique de l'entreprise, plutôt que de s'en tenir à un seul chiffre ponctuel. Elle ne sert pas non plus à corriger des erreurs passées non identifiées.",
      ],
      [
        "A company has a market share of 5% and sales of $16 million. If overall industry sales are forecasted to grow 4% and the company's market share is expected to increase to 6%, expected sales for the company will be closest to:",
        ["$17,600,000.", "$19,968,000.", "$16,640,000."],
        1,
        "Avec des ventes de 16 M$ et une part de marché de 5 %, la taille du marché actuel est de 16/0,05 = 320 M$. En appliquant une croissance de 4 %, le marché prévisionnel atteint 332,8 M$. Avec une part de marché prévisionnelle de 6 %, les ventes attendues de l'entreprise sont 332,8 M$ × 0,06 = 19 968 000 $. Le distracteur 16 640 000 $ applique seulement la croissance de 4 % du secteur aux ventes actuelles (sans tenir compte du changement de part de marché), et 17 600 000 $ combine à tort les deux effets de façon additive.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("Drill QCM — Fiche Equity Page 5...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
