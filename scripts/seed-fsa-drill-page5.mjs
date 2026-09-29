import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 5 (Analysis of Inventories)",
    difficulty: 2,
    questions: [
      [
        "Dans un environnement de prix en baisse, la méthode d'évaluation des stocks first-in first-out (FIFO) se traduit par :",
        [
          "un coût des ventes plus faible comparé au last-in first-out.",
          "un stock plus élevé comparé au last-in first-out.",
          "une marge brute plus faible comparée au last-in first-out.",
        ],
        2,
        "Si les prix baissent, le FIFO suppose que les achats les plus anciens et les plus coûteux sont vendus en premier. Cela produit un coût des ventes plus élevé, un stock plus faible, et une marge brute plus faible comparé au LIFO.",
      ],
      [
        "Sous quel référentiel comptable une entreprise est-elle tenue de mentionner les circonstances lors de la reprise d'une dépréciation de stock ?",
        ["Ni les IFRS ni les US GAAP.", "Les IFRS et les US GAAP.", "Les IFRS, mais pas les US GAAP."],
        2,
        "Les reprises de dépréciation de stock sont autorisées sous IFRS mais pas sous US GAAP. Si une entreprise reportant sous IFRS reprend une dépréciation de stock, elle est tenue de mentionner les circonstances de cette reprise.",
      ],
      [
        "Informations relatives au stock de la société Bledsoe au 31 décembre 20x7 : Prix de vente estimé 3 500 000 $ ; Coûts de cession estimés 50 000 $ ; Coûts d'achèvement estimés 300 000 $ ; Coût FIFO d'origine 3 200 000 $ ; Coût de remplacement 3 300 000 $. En utilisant la méthode d'évaluation appropriée, quel ajustement est nécessaire pour présenter correctement le stock de Bledsoe en fin d'exercice 20x7, et cet ajustement affecte-t-il le quick ratio de Bledsoe ?",
        [
          "Réévaluation à la hausse de 100 000 $ ; Aucun effet sur le quick ratio.",
          "Dépréciation de 50 000 $ ; Aucun effet sur le quick ratio.",
          "Dépréciation de 50 000 $ ; Oui, affecte le quick ratio.",
        ],
        1,
        "La valeur nette de réalisation (NRV) est de 3 150 000 $ (3 500 000 $ prix de vente − 300 000 $ coûts d'achèvement − 50 000 $ coûts de cession). Le coût d'origine de 3 200 000 $ excédant la NRV de 3 150 000 $, une dépréciation de 50 000 $ est nécessaire. Une dépréciation de stock n'a aucun impact sur le quick ratio puisque le stock est exclu à la fois du numérateur et du dénominateur de ce ratio.",
      ],
      [
        "L'effet d'une dépréciation de stock sur le rendement des actifs (ROA) d'une entreprise est le plus fidèlement décrit comme :",
        [
          "un ROA plus élevé dans la période actuelle et plus faible dans les périodes futures.",
          "un ROA plus faible dans la période actuelle et plus élevé dans les périodes futures.",
          "un ROA plus faible dans la période actuelle et aucun effet sur le ROA dans les périodes futures.",
        ],
        1,
        "Déprécier le stock à sa valeur nette de réalisation diminue à la fois le résultat net et le total des actifs dans la période de la dépréciation ; le résultat net étant en général inférieur aux actifs, le ROA diminue dans cette période. Dans les périodes suivantes, un stock à valeur plus faible réduit le coût des ventes et augmente le résultat net, ce qui, combiné à un total d'actifs plus faible, augmente le ROA.",
      ],
      [
        "Tim Rogers, analyste actions senior chez White Capital LLP, analyse les informations sur les stocks de Drako Toys Inc., un fabricant de jouets, et conclut que Drako devrait connaître une croissance de ses ventes supérieure à la moyenne au cours des trois prochaines années. Laquelle des informations suivantes soutiendrait le plus vraisemblablement la conclusion de Rogers ?",
        [
          "Le stock de produits finis a crû plus vite que les ventes au cours des deux dernières années.",
          "Une augmentation des matières premières et des en-cours et une baisse correspondante des produits finis au cours des deux dernières années.",
          "Une augmentation des produits finis et une baisse correspondante des matières premières et des en-cours au cours des deux dernières années.",
        ],
        1,
        "Une augmentation des matières premières et/ou des en-cours indique probablement une hausse de la demande anticipée par l'entreprise. À l'inverse, une augmentation des produits finis alors que les matières premières et en-cours diminuent peut indiquer une baisse de la demande.",
      ],
      [
        "Si les prix sont en baisse, les meilleures estimations du stock et du coût des ventes du point de vue d'un analyste sont fournies par :",
        [
          "le stock FIFO et le coût des ventes LIFO.",
          "le stock FIFO et le coût des ventes FIFO.",
          "le stock LIFO et le coût des ventes FIFO.",
        ],
        0,
        "Que les prix montent ou baissent, le stock FIFO et le coût des ventes LIFO sont préférés car ils sont les estimations les plus proches des coûts courants : le stock FIFO reflète les achats les plus récents, et le coût des ventes LIFO reflète également les prix les plus récents.",
      ],
      [
        "Si une entreprise met ses stocks en gage (nantissement) comme garantie d'un prêt, elle doit :",
        [
          "compenser les stocks nantis avec les passifs courants.",
          "mentionner en annexe la valeur comptable des stocks nantis.",
          "créer un compte d'actif contra à hauteur des stocks nantis.",
        ],
        1,
        "La valeur comptable des stocks nantis en garantie d'un emprunt fait partie des informations à mentionner obligatoirement en annexe, tant sous IFRS que sous US GAAP. Ni la compensation avec le passif courant, ni la création d'un compte contra-actif ne sont des traitements corrects.",
      ],
      [
        "Judah GmbH établit ses états financiers sous IFRS. Au 31 décembre 20X8, Judah détient un stock de biens manufacturés d'un coût de 720 000 €. Le coût de vente estimé de ce stock est de 50 000 € et sa valeur de marché est de 740 000 €. Au 31 janvier 20X9, aucune partie du stock n'a été vendue mais sa valeur de marché a augmenté à 810 000 €. Les coûts de vente restent inchangés. Quelle écriture est la plus vraisemblablement permise sous IFRS ?",
        [
          "N'effectuer aucun ajustement de la valeur du stock à aucune des deux dates.",
          "Déprécier le stock de 30 000 € au 31 décembre 20X8 et le revaloriser de 30 000 € au 31 janvier 20X9.",
          "Déprécier le stock de 30 000 € au 31 décembre 20X8 et le revaloriser de 70 000 € au 31 janvier 20X9.",
        ],
        1,
        "Les règles IFRS exigent que le stock soit évalué au plus bas du coût ou de la valeur nette de réalisation (NRV). Au 31 déc. 20X8, NRV = 740 000 € − 50 000 € = 690 000 €. Le coût (720 000 €) excédant la NRV (690 000 €), une dépréciation de 30 000 € est requise. Au 31 janv. 20X9, NRV = 810 000 € − 50 000 € = 760 000 €. Sous IFRS, une reprise de dépréciation est autorisée mais limitée au montant de la perte précédemment constatée : la revalorisation est donc plafonnée à 30 000 €, pas à 70 000 €, et le stock ne peut jamais dépasser son coût d'origine de 720 000 €.",
      ],
      [
        "En périodes de prix en baisse, lequel des énoncés suivants est le plus exact ? Comparé au FIFO, le LIFO se traduit par :",
        [
          "des soldes de stock plus élevés et un fonds de roulement (working capital) plus élevé.",
          "des soldes de stock plus élevés et un fonds de roulement plus faible.",
          "un coût des ventes plus faible, des impôts plus faibles et un résultat net plus élevé.",
        ],
        0,
        "En périodes de prix en baisse, le LIFO se traduit par un coût des ventes plus faible, des impôts plus faibles, un résultat net plus élevé, des soldes de stock plus élevés, un fonds de roulement plus élevé, et des flux de trésorerie plus faibles comparé au FIFO.",
      ],
      [
        "Si les prix sont en hausse, la méthode du coût moyen pondéré (weighted average) se traduit le plus vraisemblablement par des valeurs de stock plus élevées que les valeurs de stock obtenues avec :",
        ["le first-in first-out (FIFO).", "le last-in first-out (LIFO).", "l'identification spécifique."],
        1,
        "En environnement de prix en hausse, les valeurs de stock sous LIFO sont plus faibles que sous FIFO, et les valeurs sous coût moyen pondéré se situent entre les deux. La valeur du stock sous coût moyen pondéré est donc supérieure à celle sous LIFO. La valeur du stock sous identification spécifique dépend de quels articles précis sont vendus et peut être plus élevée ou plus faible que les autres méthodes.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 5...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
