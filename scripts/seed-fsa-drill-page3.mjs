import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 3 (Analyzing Statements of Cash Flows I)",
    difficulty: 2,
    questions: [
      [
        "Étant donné les informations suivantes, quel est l'ajustement au résultat net pour calculer le flux de trésorerie d'exploitation par la méthode indirecte ? Augmentation des dettes fournisseurs de 25 $. Vente d'une action pour 15 $. Dividendes payés de 10 $ aux actionnaires. Charge d'amortissement de 100 $. Augmentation des stocks de 20 $.",
        ["-50 $.", "-95 $.", "+105 $."],
        2,
        "L'ajustement est égal à l'augmentation des dettes fournisseurs (+25) plus l'amortissement réintégré (+100) moins l'augmentation des stocks (-20) = +105. La vente d'action et les dividendes payés sont des flux de financement et n'ajustent pas le résultat net lors du calcul du CFO.",
      ],
      [
        "Pour calculer les encaissements clients lors de la conversion d'un tableau de flux de trésorerie de la méthode indirecte à la méthode directe, un analyste commence par :",
        [
          "le coût des ventes, en soustrayant toute augmentation des dettes fournisseurs, en ajoutant toute augmentation des stocks, et en soustrayant toute dépréciation de stock.",
          "les ventes, en soustrayant toute augmentation des créances clients, et en ajoutant toute augmentation des produits constatés d'avance.",
          "le résultat net et en réintégrant les charges non monétaires.",
        ],
        1,
        "Pour calculer les encaissements clients, l'analyste part des ventes nettes du compte de résultat, soustrait (ajoute) toute augmentation (diminution) des créances clients, et ajoute (soustrait) toute augmentation (diminution) des produits constatés d'avance (unearned revenue).",
      ],
      [
        "Copper, Inc. avait 4 millions $ d'obligations en circulation convertibles en actions ordinaires à un taux de conversion de 100 actions par obligation de 1 000 $. En 20X1, toutes les obligations en circulation ont été converties en actions ordinaires. Le prix moyen de l'action Copper en 20X1 était de 15 $. Le tableau des flux de trésorerie de Copper pour l'exercice clos le 31 décembre 20X1 devrait le plus vraisemblablement inclure :",
        [
          "des flux de financement de +6 millions $ liés à l'émission d'actions ordinaires et de -4 millions $ liés au remboursement des obligations, et des flux d'investissement de -2 millions $ pour une perte sur remboursement d'obligations.",
          "des flux de financement de +4 millions $ liés à l'émission d'actions ordinaires et de -4 millions $ liés au remboursement des obligations.",
          "une annexe décrivant la conversion des obligations en actions ordinaires.",
        ],
        2,
        "La conversion d'obligations en actions ordinaires est une transaction non monétaire (non-cash) : elle n'implique aucune entrée ni sortie de trésorerie réelle. Elle doit donc être présentée en annexe du tableau des flux de trésorerie, et non intégrée dans les sections financement ou investissement.",
      ],
      [
        "Quel référentiel comptable permet à une entreprise de classer les intérêts reçus en flux de financement et les intérêts payés en flux d'investissement dans son tableau des flux de trésorerie ?",
        ["Les IFRS uniquement.", "Les US GAAP uniquement.", "Ni les IFRS ni les US GAAP."],
        2,
        "Les IFRS permettent de classer les intérêts reçus en flux d'exploitation ou d'investissement, et les intérêts payés en flux d'exploitation ou de financement (soit l'inverse de ce que décrit la question). Les US GAAP imposent que les intérêts reçus ET payés soient tous deux classés en flux d'exploitation. Aucun des deux référentiels ne permet la combinaison décrite dans l'énoncé.",
      ],
      [
        "Lors du calcul du flux de trésorerie d'exploitation (CFO) par la méthode indirecte, laquelle des affirmations suivantes est la plus exacte ?",
        [
          "Lors de la constatation d'une plus-value sur cession d'immobilisations, le montant constitue une déduction des flux de trésorerie d'exploitation.",
          "La méthode indirecte nécessite un tableau supplémentaire pour rapprocher le résultat net et le flux de trésorerie.",
          "Avec la méthode indirecte, chaque poste du compte de résultat est converti en son équivalent trésorerie.",
        ],
        0,
        "Une plus-value sur cession d'immobilisations est incluse dans le résultat net, mais le produit réel de la cession apparaît dans la section investissement ; la plus-value doit donc être déduite du résultat net lors du calcul du CFO pour éviter un double comptage. Convertir chaque poste du compte de résultat en équivalent trésorerie décrit la méthode directe, pas la méthode indirecte.",
      ],
      [
        "Pour calculer les encaissements clients, un analyste devrait le plus judicieusement :",
        [
          "ajouter la variation des créances clients aux ventes à crédit.",
          "soustraire les créances clients des ventes brutes.",
          "soustraire la variation des créances clients des ventes nettes.",
        ],
        2,
        "Les encaissements clients se calculent le plus justement en soustrayant la variation des créances clients (augmentation) ou en l'ajoutant (diminution) aux ventes nettes de la période, et non en manipulant les ventes brutes ou à crédit isolément.",
      ],
      [
        "Quelle est la différence entre la méthode directe et la méthode indirecte de calcul du flux de trésorerie d'exploitation ?",
        [
          "Les postes de bilan ne sont pas inclus dans le flux d'exploitation pour la méthode directe, alors qu'ils le sont pour la méthode indirecte.",
          "La méthode directe part des ventes et suit la trésorerie telle qu'elle transite par le compte de résultat, tandis que la méthode indirecte part du résultat net et l'ajuste pour les charges non monétaires et autres éléments.",
          "La méthode indirecte part du résultat brut et ajuste le flux d'exploitation, tandis que la méthode directe part de la marge brute et suit le compte de résultat pour calculer les flux d'exploitation.",
        ],
        1,
        "La différence fondamentale porte sur le point de départ du calcul : la méthode directe part des ventes et retrace la trésorerie encaissée/décaissée poste par poste du compte de résultat, tandis que la méthode indirecte part du résultat net (après impôt) et l'ajuste pour les éléments non monétaires et les variations de BFR. Les deux méthodes aboutissent toujours au même flux d'exploitation final.",
      ],
      [
        "Pour convertir un tableau de flux de trésorerie de la méthode indirecte à la méthode directe, l'analyste devrait :",
        [
          "ajouter les diminutions des créances clients aux ventes nettes.",
          "soustraire les augmentations de stocks du coût des ventes.",
          "ajouter les augmentations des dettes fournisseurs au coût des ventes.",
        ],
        0,
        "Une diminution des créances clients représente un encaissement de trésorerie supplémentaire, donc s'ajoute aux ventes nettes pour obtenir les encaissements clients réels. Les augmentations de stock (un usage de trésorerie) doivent en réalité être ajoutées au coût des ventes, et les augmentations de dettes fournisseurs (une source de trésorerie) doivent être soustraites du coût des ventes — l'inverse de ce que proposent B et C.",
      ],
      [
        "Laquelle des affirmations suivantes est CORRECTE concernant la prise en compte de l'amortissement dans la section exploitation du tableau des flux de trésorerie ?",
        [
          "La méthode directe comme la méthode indirecte prennent en compte l'amortissement.",
          "La méthode directe ne prend pas en compte l'amortissement, la méthode indirecte le prend en compte.",
          "Ni la méthode directe ni la méthode indirecte ne prennent en compte l'amortissement.",
        ],
        1,
        "La méthode indirecte doit réintégrer l'amortissement au résultat net puisque son point de départ (le résultat net) l'inclut déjà comme charge non monétaire. La méthode directe, elle, ne part jamais du résultat net et n'a donc jamais besoin de retraiter l'amortissement — elle ne considère que les flux de trésorerie réels.",
      ],
      [
        "Lors du calcul du flux de trésorerie d'exploitation par la méthode indirecte, une variation des dettes fournisseurs nécessite laquelle des opérations suivantes ?",
        [
          "Un ajustement positif (négatif) au résultat net lorsque les dettes fournisseurs augmentent (diminuent).",
          "Un ajustement négatif au résultat net, que les dettes fournisseurs augmentent ou diminuent.",
          "Un ajustement négatif (positif) au résultat net lorsque les dettes fournisseurs augmentent (diminuent).",
        ],
        0,
        "Une augmentation des dettes fournisseurs signifie que l'entreprise a différé des paiements en trésorerie, ce qui constitue une source de cash : elle appelle donc un ajustement positif au résultat net. Inversement, une diminution des dettes fournisseurs signifie que davantage de trésorerie a été décaissée que ce que reflète le résultat net : elle appelle un ajustement négatif.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 3...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
