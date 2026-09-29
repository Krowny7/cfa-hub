import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 4 (Analyzing Statements of Cash Flows II)",
    difficulty: 2,
    questions: [
      [
        "Joplin Corporation présente les éléments suivants dans ses états financiers de fin d'exercice : Résultat net de 43,7 M$. Charge d'amortissement de 4,2 M$. Augmentation des créances clients de 1,5 M$. Diminution des dettes fournisseurs de 2,3 M$. Vente d'équipement pour 15 M$. Achat d'équipement pour 35 M$. Le free cash flow to the firm (FCFF) de Joplin est le plus proche de :",
        ["39 millions $.", "24 millions $.", "28 millions $."],
        1,
        "FCFF = résultat net + charges non monétaires + intérêts après impôt − investissement en capital fixe − investissement en BFR = 43,7 M$ + 4,2 M$ − (35 M$ − 15 M$) − (1,5 M$ + 2,3 M$) = 24,1 M$ (aucune charge d'intérêt n'est donnée, et l'augmentation des créances comme la diminution des dettes fournisseurs sont toutes deux des usages de trésorerie).",
      ],
      [
        "Un tableau de flux de trésorerie en pourcentage (common-size) est le moins susceptible de présenter les paiements aux employés en pourcentage :",
        ["des revenus de la période.", "du flux de trésorerie d'exploitation de la période.", "du total des flux de trésorerie sortants de la période."],
        1,
        "Il existe deux formats standards de tableau de flux de trésorerie en pourcentage : exprimer chaque sortie en pourcentage du total des sorties de trésorerie, ou en pourcentage du chiffre d'affaires total de la période. Le flux de trésorerie d'exploitation mélange entrées et sorties et n'est pas utilisé comme dénominateur pour des postes individuels de paiement.",
      ],
      [
        "Comment une baisse de la rotation des dettes fournisseurs (accounts payable turnover) affecte-t-elle le flux de trésorerie de financement d'une entreprise, et cette source de trésorerie est-elle durable ?",
        [
          "Flux de financement : Augmentation / Source durable : Non",
          "Flux de financement : Aucun impact / Source durable : Non",
          "Flux de financement : Aucun impact / Source durable : Oui",
        ],
        1,
        "Une baisse de la rotation des dettes fournisseurs (payer plus lentement les fournisseurs) économise de la trésorerie et constitue une source de trésorerie d'exploitation, pas de financement — elle n'a donc aucun impact sur le CFF. Ce n'est pas non plus durable, car les fournisseurs finiront par refuser d'étendre davantage leur crédit si les paiements continuent de ralentir.",
      ],
      [
        "Lequel décrit le mieux respectivement un ratio mesurant la capacité d'une entreprise à acquérir des actifs long terme avec ses flux de trésorerie d'exploitation, et un ratio de performance ?",
        [
          "Acquisition d'actifs avec CFO : ratio d'investissement et de financement / Ratio de performance : ratio cash-to-income",
          "Acquisition d'actifs avec CFO : ratio de réinvestissement / Ratio de performance : ratio cash-to-income",
          "Acquisition d'actifs avec CFO : ratio de réinvestissement / Ratio de performance : ratio de remboursement de dette",
        ],
        1,
        "Le ratio de réinvestissement mesure la capacité d'une entreprise à acquérir des actifs long terme avec son CFO, tandis que le ratio cash-to-income est un ratio de performance mesurant la capacité à générer de la trésorerie à partir de l'exploitation. Le ratio d'investissement et de financement est plus large (il couvre aussi le remboursement de dette et les dividendes), et le ratio de remboursement de dette est un ratio de couverture, pas un ratio de performance.",
      ],
      [
        "Informations sélectionnées du dernier tableau de flux de trésorerie de la société Thibault : Trésorerie provenant des activités d'exploitation 1 300 € ; Trésorerie payée pour équipements de production (2 600 €). Le ratio de réinvestissement de Thibault pour cette période est le plus proche de :",
        ["0,50.", "0,75.", "1,00."],
        0,
        "Le ratio de réinvestissement est égal au CFO divisé par la trésorerie payée pour les actifs long terme : 1 300 € / 2 600 € = 0,50.",
      ],
      [
        "La société RR a eu un flux de trésorerie d'exploitation de 20 millions $. RR a acheté 5 millions $ d'équipements et en a vendu 3 millions $ au cours de la période. Quel est le free cash flow to equity (FCFE) de RR pour la période ?",
        ["15 millions $.", "18 millions $.", "22 millions $."],
        1,
        "En l'absence de tout financement net par emprunt ou toute charge d'intérêt à retraiter, le FCFE se calcule simplement comme CFO moins les investissements nets en capital fixe : 20 M$ − (5 M$ achats − 3 M$ ventes) = 20 M$ − 2 M$ = 18 M$.",
      ],
      [
        "Un tableau de flux de trésorerie en pourcentage (common-size) est le moins susceptible de présenter chaque entrée de trésorerie en pourcentage :",
        ["du chiffre d'affaires.", "du total des entrées de trésorerie.", "du total des flux de trésorerie (entrées et sorties confondues)."],
        2,
        "Les deux approches standards du common-size cash flow statement sont : exprimer chaque entrée en pourcentage du total des entrées, ou exprimer chaque poste en pourcentage du chiffre d'affaires. Aucune des deux méthodes ne rapporte les entrées au 'total des flux de trésorerie' pris comme somme indifférenciée des entrées et sorties — ce dénominateur n'est pas utilisé en pratique.",
      ],
      [
        "David Chance, CFA, analyse Grow Corporation et réunit les informations suivantes : Trésorerie nette générée par l'exploitation 3 500 $. Trésorerie nette utilisée pour les investissements en capital fixe 727 $. Intérêts payés en trésorerie 195 $. Résultat avant impôt 4 400 $. Charge d'impôt 1 540 $. Résultat net 2 860 $. Le free cash flow to the firm (FCFF) de Grow est le plus proche de :",
        ["2 640 $.", "2 900 $.", "2 260 $."],
        1,
        "FCFF = CFO + intérêts après impôt − investissement en capital fixe = 3 500 $ + 195 $ × (1 − taux d'impôt effectif) − 727 $. Le taux d'impôt effectif est 1 540/4 400 = 35 %, donc les intérêts après impôt sont 195 $ × (1 − 0,35) ≈ 127 $. FCFF ≈ 3 500 + 127 − 727 = 2 900 $.",
      ],
      [
        "Considérons les affirmations suivantes : Affirmation #1 — Une approche de présentation d'un tableau de flux de trésorerie en pourcentage (common-size) consiste à exprimer chaque entrée de trésorerie en pourcentage du total des entrées, et chaque sortie en pourcentage du total des sorties. Affirmation #2 — Exprimer chaque poste du tableau de flux de trésorerie en pourcentage du chiffre d'affaires est utile pour prévoir les flux de trésorerie futurs. Lesquelles de ces affirmations sur un tableau de flux de trésorerie en pourcentage sont CORRECTES ?",
        ["Seule l'affirmation #1 est correcte.", "Seule l'affirmation #2 est correcte.", "Les deux affirmations sont correctes."],
        2,
        "Les deux formats décrits sont bien les deux approches reconnues du common-size cash flow statement : l'une exprime chaque flux en pourcentage du total des entrées/sorties (utile pour comparer la structure des flux), l'autre exprime chaque poste en pourcentage du chiffre d'affaires (utile pour la prévision, puisque le chiffre d'affaires futur est en général l'input de départ des modèles).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 4...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
