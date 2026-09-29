import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";
const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 3 (Portfolio Management: An Overview)",
    difficulty: 1,
    questions: [
      [
        "Laquelle des parts d'investissement collectif suivantes est la moins susceptible de se négocier à un prix différent de sa valeur liquidative (NAV) ?",
        [
          "Les parts de fonds négociés en bourse (ETF).",
          "Les parts de fonds fermés (closed-end).",
          "Les parts de fonds ouverts (open-end).",
        ],
        2,
        "Les parts de fonds ouverts se négocient à la valeur liquidative (NAV). Les prix des fonds fermés peuvent s'écarter significativement de la NAV, et les prix des ETF peuvent s'en écarter légèrement, même si l'arbitrage les maintient généralement proches.",
      ],
      [
        "Le rapport entre l'écart-type de rendement d'un portefeuille équipondéré et l'écart-type moyen des titres qui le composent est appelé :",
        ["le ratio de diversification.", "le ratio de risque relatif.", "le ratio de Sharpe."],
        0,
        "Le ratio de diversification se calcule en divisant l'écart-type des rendements d'un portefeuille par l'écart-type moyen des rendements des titres individuels qui le composent.",
      ],
      [
        "L'approche portefeuille (portfolio approach) de l'investissement est le mieux décrite comme l'évaluation de chaque investissement potentiel en fonction de :",
        [
          "sa contribution au risque et au rendement globaux de l'investisseur.",
          "son potentiel à générer un rendement excédentaire pour l'investisseur.",
          "ses fondamentaux, comme la performance financière de l'émetteur du titre.",
        ],
        0,
        "L'approche portefeuille évalue chaque investissement individuel en fonction de sa contribution au risque et au rendement du portefeuille global de l'investisseur, et non sur une base isolée (stand-alone).",
      ],
      [
        "Les fondations et fonds de dotation (endowments and foundations) ont typiquement des besoins d'investissement caractérisés par :",
        [
          "un horizon long, une tolérance au risque élevée, et de faibles besoins de liquidité.",
          "un horizon long, une tolérance au risque faible, et des besoins de liquidité élevés.",
          "un horizon court, une tolérance au risque faible, et de faibles besoins de liquidité.",
        ],
        0,
        "Les fondations et fonds de dotation investissent sur le long terme pour financer un objectif permanent ou une cause caritative, ont typiquement de faibles taux de décaissement, et peuvent donc accepter une tolérance au risque élevée avec de faibles besoins de liquidité.",
      ],
      [
        "Dans un régime de retraite à prestations définies :",
        [
          "l'employé se voit promettre un versement périodique à la retraite.",
          "l'employé est responsable des décisions d'investissement.",
          "la charge de retraite de l'employeur est égale à ses cotisations au régime.",
        ],
        0,
        "Dans un régime à prestations définies, un versement périodique (généralement basé sur le salaire) est promis à l'employé à la retraite, et l'employeur assume le risque d'investissement et prend les décisions d'investissement (via le régime), contrairement à un régime à cotisations définies.",
      ],
      [
        "Dans un régime de retraite à prestations définies, la responsabilité du versement des prestations de retraite promises incombe le plus vraisemblablement :",
        [
          "au promoteur du régime (l'employeur/plan sponsor).",
          "à l'employé lui-même.",
          "à un fonds tiers indépendant sans lien avec l'employeur.",
        ],
        0,
        "Dans un régime à prestations définies, c'est le promoteur du régime (l'employeur) qui assume le risque d'investissement et la responsabilité de verser les prestations promises, quelle que soit la performance des actifs du régime — contrairement à un régime à cotisations définies où ce risque incombe à l'employé.",
      ],
      [
        "Laquelle des étapes suivantes fait partie de l'étape d'exécution (execution step) du processus de gestion de portefeuille ?",
        [
          "La rédaction de la déclaration de politique d'investissement (IPS).",
          "La mesure de performance et le rééquilibrage du portefeuille.",
          "La détermination de l'allocation stratégique d'actifs.",
        ],
        1,
        "L'étape d'exécution du processus de gestion de portefeuille comprend la construction du portefeuille ainsi que son suivi continu, incluant la mesure de performance et le rééquilibrage. La rédaction de l'IPS et l'allocation stratégique d'actifs relèvent de l'étape de planification, antérieure.",
      ],
      [
        "Dans un régime de retraite à cotisations définies, le risque d'investissement est supporté par :",
        ["l'employé.", "l'employeur.", "un assureur tiers."],
        0,
        "Dans un régime à cotisations définies, l'employé décide de l'allocation de ses cotisations et supporte donc entièrement le risque d'investissement ; les prestations futures dépendent de la performance des placements, contrairement au régime à prestations définies où ce risque incombe à l'employeur.",
      ],
      [
        "Lequel des véhicules de placement collectif suivants est le moins susceptible de recourir à l'effet de levier ?",
        [
          "Un fonds spéculatif (hedge fund).",
          "Un fonds de capital-risque (venture capital fund).",
          "Un fonds de capital-investissement (buyout fund).",
        ],
        1,
        "Les fonds de capital-risque financent typiquement des entreprises en démarrage par des apports en capitaux propres, sans recourir à un endettement significatif. Les hedge funds et les fonds de buyout, en revanche, ont fréquemment recours à l'effet de levier pour amplifier leurs rendements.",
      ],
      [
        "Un fonds monétaire (money market fund) vise typiquement à maintenir une valeur liquidative (NAV) de :",
        ["100 $ par part.", "10 $ par part.", "1,00 $ par part."],
        2,
        "Les fonds monétaires visent typiquement à maintenir une valeur liquidative stable de 1,00 $ par part, en investissant dans des instruments de marché monétaire à très court terme et de haute qualité.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 3...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
