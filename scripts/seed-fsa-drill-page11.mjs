import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 11 (Introduction to Financial Statement Modeling)",
    difficulty: 2,
    questions: [
      [
        "Un analyste essayant d'atténuer le biais de représentativité (representativeness bias) devrait le plus vraisemblablement :",
        [
          "réaliser une analyse de scénarios (scenario analysis).",
          "considérer à la fois une vision interne (inside view) et externe (outside view) pour établir ses prévisions.",
          "utiliser des modèles flexibles avec peu de variables indépendantes.",
        ],
        1,
        "Le biais de représentativité provient de la tendance à classer des données en se basant sur des informations et classifications passées ; il est atténué en considérant à la fois une vision interne (spécifique à la situation) et une vision externe (le taux de base, dans une population plus large). L'analyse de scénarios traite le biais d'excès de confiance, et les modèles flexibles à peu de variables traitent le biais de conservatisme.",
      ],
      [
        "Un analyste voulant créer un modèle pro forma basé sur les ventes pour une entreprise commencera le plus vraisemblablement par :",
        [
          "modéliser les postes de fonds de roulement de l'entreprise.",
          "estimer la tendance de croissance du chiffre d'affaires de l'entreprise.",
          "prévoir les dépenses en capital (capex) de l'entreprise.",
        ],
        1,
        "La première étape de la création d'un modèle pro forma basé sur les ventes est d'estimer la croissance et le chiffre d'affaires futur, puisque la plupart des autres postes sont ensuite modélisés en fonction de celui-ci.",
      ],
      [
        "Une entreprise a le plus vraisemblablement du pouvoir de fixation des prix (pricing power) si elle opère dans une industrie qui présente des :",
        [
          "barrières à l'entrée élevées.",
          "un pouvoir de négociation des clients élevé.",
          "une intensité de la rivalité concurrentielle élevée.",
        ],
        0,
        "Des barrières à l'entrée élevées impliquent une faible menace de nouveaux entrants, ce qui tend à augmenter le pouvoir de fixation des prix des entreprises existantes. Une forte rivalité concurrentielle et un fort pouvoir de négociation des clients ont tendance, eux, à réduire ce pouvoir de fixation des prix.",
      ],
      [
        "Un analyste établit une prévision pour une entreprise et anticipe que les unités vendues diminueront de 5 % au cours de la prochaine période de reporting. Lequel des actifs courants du bilan cette baisse est-elle le plus susceptible d'affecter ?",
        [
          "Les créances clients, les stocks, et les charges payées d'avance.",
          "Les créances clients et les charges payées d'avance.",
          "Les créances clients et les stocks.",
        ],
        2,
        "Vendre moins d'unités réduit les créances clients (toutes choses égales par ailleurs) et est susceptible d'affecter les niveaux de stocks. Les charges payées d'avance représentent des montants payés pour des dépenses de périodes futures, pas des achats, et ne sont pas susceptibles d'être affectées par une variation de la demande.",
      ],
      [
        "Fresh Farm Foods (FFF) a présenté un chiffre d'affaires de 800 000 $, un coût des ventes de 570 000 $, et des frais SG&A de 96 000 $ pour l'exercice, sur la base de ventes de 140 000 unités (résultat opérationnel de 134 000 $). Un analyste prévoit que FFF sera contrainte d'augmenter son prix unitaire de 8 %, ce qui entraînera une baisse de la demande de 3 000 unités. En termes de pourcentage, lequel des éléments suivants connaîtra le plus vraisemblablement la plus forte baisse ?",
        ["Le résultat opérationnel.", "Le chiffre d'affaires.", "Le résultat brut."],
        0,
        "Le chiffre d'affaires prévisionnel chute de 8,00 % à 736 000 $ et le résultat brut de 22,52 % à 178 214 $ (le coût des ventes s'ajuste au nouveau volume unitaire). Les frais SG&A étant maintenus fixes, le résultat opérationnel absorbe la totalité du choc et chute le plus, de 38,65 % à 82 214 $.",
      ],
      [
        "La prévision de résultats d'une entreprise est le plus vraisemblablement optimiste si l'industrie présente :",
        [
          "une forte menace de produits de substitution.",
          "un faible pouvoir de négociation des fournisseurs.",
          "de faibles barrières à l'entrée.",
        ],
        1,
        "Un faible pouvoir de négociation des fournisseurs signifie que les entreprises ont davantage de contrôle sur leurs contrats fournisseurs, par exemple en obtenant avec succès des baisses de prix. Une forte menace de produits de substitution réduit le pouvoir de fixation des prix, et de faibles barrières à l'entrée signifient une forte menace de nouveaux entrants, ce qui complique le maintien du ROIC.",
      ],
      [
        "Pour une entreprise fortement cyclique, quel horizon de prévision serait le plus approprié ?",
        [
          "Jusqu'au milieu du cycle économique.",
          "Jusqu'à l'inclusion de deux cycles économiques complets.",
          "Une seule année.",
        ],
        0,
        "Bien qu'il soit utile de disposer de deux cycles économiques complets dans une prévision, il est probable que l'information soit alors difficile à prévoir avec suffisamment de précision. Prévoir sur une seule année peut donner un niveau de précision plus élevé mais présenter des résultats au-dessus ou en dessous de la tendance selon la position actuelle de l'entreprise dans le cycle. Prévoir jusqu'au milieu du cycle économique permet d'inclure ce niveau moyen de ventes et de résultats à mi-cycle, garantissant que la phase actuelle ne biaise pas la prévision.",
      ],
      [
        "Un analyste a établi une prévision de résultats pour l'année prochaine pour un investissement particulier. Depuis que la prévision a été finalisée, l'entreprise a fait des annonces concernant de nouveaux produits et des changements structurels. Certaines de ces annonces étaient attendues par l'analyste et intégrées dans la prévision d'origine, d'autres non. L'analyste est réticent à modifier sa prévision. Quel biais cet analyste illustre-t-il le plus vraisemblablement ?",
        ["Le biais de confirmation.", "Le biais de conservatisme.", "Le biais de représentativité."],
        1,
        "Le biais de conservatisme (aussi appelé ancrage) se manifeste lorsqu'un analyste n'apporte que de petits ajustements à ses prévisions antérieures malgré l'arrivée de nouvelles informations. Le biais de confirmation pousse à rechercher des données confirmant ses convictions initiales et à minimiser les informations contradictoires ; le scénario ne précise pas si les nouvelles informations contredisent ou confortent les vues initiales de l'analyste.",
      ],
      [
        "Lors de la prévision de la valeur d'une action par la méthode des flux de trésorerie actualisés (DCF), un petit changement dans laquelle des estimations suivantes aura le plus vraisemblablement le plus grand impact sur la valeur prévue ?",
        ["L'amortissement annuel.", "Le taux de croissance à long terme.", "Le taux d'imposition statutaire."],
        1,
        "L'amortissement n'est pas un flux de trésorerie et ne devrait pas être inclus dans l'approche DCF. Les variations du taux d'imposition statutaire impactent la prévision, mais pas autant que le taux de croissance à long terme, en raison de la valeur terminale qui projette ce taux de croissance à l'infini et applique la croissance de manière exponentielle.",
      ],
      [
        "Un analyste essaie de comparer les rendements de deux entreprises différentes, opérant toutes deux en Europe. Pourquoi l'analyste choisirait-il le plus vraisemblablement d'utiliser le rendement du capital investi (ROIC) plutôt que le rendement des capitaux propres (ROE) ?",
        [
          "Les deux entreprises opèrent dans des industries différentes.",
          "Les deux entreprises ont des structures de capital différentes.",
          "Les deux entreprises opèrent dans des pays différents.",
        ],
        1,
        "Le ROIC est le rendement destiné à la fois aux capitaux propres et à la dette, contrairement au ROE qui ne considère que le rendement des capitaux propres. Le ROIC est particulièrement utile pour analyser des entreprises ayant des structures de capital différentes. L'industrie ou le pays d'opération de l'entreprise est moins susceptible d'influencer le choix entre ROIC et ROE.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 11...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
