import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 10 (Financial Analysis Techniques)",
    difficulty: 2,
    questions: [
      [
        "Les résultats opérationnels de la société Paragon sont de 100 000 $, sa charge d'intérêt est de 25 000 $, et son résultat avant impôt est de 75 000 $. Quel est le ratio de couverture des intérêts de Paragon ?",
        ["1 fois.", "3 fois.", "4 fois."],
        2,
        "Ratio de couverture des intérêts = résultat opérationnel (EBIT) / charge d'intérêt = 100 000 $ / 25 000 $ = 4.",
      ],
      [
        "En 2007, Brownfield Incorporated a acheté 140 millions $ de stock. Pour l'exercice qui vient de se clore, Brownfield a présenté un coût des ventes de 130 millions $. Le stock en fin d'exercice était de 45 millions $. Calculez la rotation des stocks pour l'année.",
        ["2,89.", "3,25.", "3,71."],
        1,
        "Stock initial = coût des ventes + stock final − achats = 130 M$ + 45 M$ − 140 M$ = 35 millions $. Stock moyen = (35 M$ + 45 M$)/2 = 40 millions $. Rotation des stocks = 130 M$ coût des ventes / 40 M$ stock moyen = 3,25.",
      ],
      [
        "Lequel des ratios suivants est une composante de l'équation DuPont originale (en trois parties) ?",
        ["Le ratio dette/capitaux propres.", "La rotation des actifs.", "La marge brute."],
        1,
        "L'approche DuPont en trois parties est : marge nette × rotation des actifs × ratio de levier (actifs sur capitaux propres).",
      ],
      [
        "Dans l'équation DuPont étendue (en cinq parties), quelle composante décrit l'équation EBT / EBIT ?",
        ["Le fardeau fiscal (tax burden).", "Le fardeau d'intérêt (interest burden).", "Le levier financier."],
        1,
        "EBT / EBIT est le fardeau d'intérêt (interest burden), la deuxième composante de l'équation DuPont étendue, montrant qu'un levier plus élevé entraîne des charges d'intérêt plus élevées qui peuvent compenser les bénéfices du levier sur le ROE.",
      ],
      [
        "Les comptes de résultat de Royal, Inc. montrent des ventes de 78 millions $ (20X0) et 82 millions $ (20X1) ; un coût des ventes de 47 millions $ (20X0) et 48 millions $ (20X1) ; un résultat après impôt de 7 millions $ (20X0) et 6 millions $ (20X1). Concernant les tendances de la marge brute et de la marge nette de Royal :",
        [
          "la marge brute et la marge nette ont toutes deux augmenté en 20X1.",
          "la marge brute a augmenté en 20X1 mais la marge nette a diminué.",
          "la marge brute a diminué mais la marge nette a augmenté en 20X1.",
        ],
        1,
        "La marge brute (résultat brut/ventes) est passée de 39,7 % en 20X0 à 41,5 % en 20X1, tandis que la marge nette (résultat après impôt/ventes) est passée de 9,0 % en 20X0 à 7,3 % en 20X1.",
      ],
      [
        "La différence entre le current ratio et le quick ratio est que le quick ratio exclut :",
        ["le stock.", "les titres négociables.", "les actifs non courants."],
        0,
        "Current ratio = actifs courants / passifs courants ; quick ratio = (actifs courants − stocks) / passifs courants. Les titres négociables sont inclus dans les actifs courants dans les deux ratios ; aucun des deux ne prend en compte les actifs non courants.",
      ],
      [
        "Comment le quick ratio et le ratio dette/capital sont-ils typiquement utilisés pour évaluer la capacité d'une entreprise à honorer ses obligations de dette ?",
        [
          "Les deux sont utilisés principalement pour évaluer la capacité à honorer des obligations long terme.",
          "Les deux sont utilisés principalement pour évaluer la capacité à honorer des obligations court terme.",
          "L'un est utilisé principalement pour évaluer la capacité à honorer des obligations court terme, et l'autre pour évaluer la capacité à honorer des obligations long terme.",
        ],
        2,
        "Le quick ratio est un ratio de liquidité, utilisé pour mesurer la capacité d'une entreprise à honorer ses obligations court terme. Le ratio dette/capital est un ratio de solvabilité, utilisé pour mesurer la capacité à honorer des obligations plus long terme.",
      ],
      [
        "Lequel des ratios suivants est le moins susceptible d'être un ratio de rentabilité opérationnelle couramment utilisé ?",
        ["Ventes/Total des actifs.", "Résultat brut/ventes nettes.", "Résultat net/ventes nettes."],
        0,
        "Ventes/Total des actifs (la rotation des actifs) est une mesure d'efficacité opérationnelle, pas de rentabilité opérationnelle. Le résultat brut/ventes (marge brute) et le résultat net/ventes (marge nette) sont, eux, des ratios de rentabilité opérationnelle classiques.",
      ],
      [
        "Lequel des ratios suivants ne serait PAS utilisé pour évaluer l'efficacité avec laquelle la direction utilise les actifs de l'entreprise ?",
        ["La marge brute.", "La rotation des immobilisations (fixed asset turnover).", "La rotation des dettes fournisseurs (payables turnover)."],
        0,
        "La marge brute est utilisée pour mesurer la rentabilité opérationnelle d'une entreprise, pas son efficacité opérationnelle. La rotation des immobilisations et la rotation des dettes fournisseurs sont, elles, de véritables ratios d'efficacité.",
      ],
      [
        "Quel ratio est utilisé pour mesurer la liquidité interne d'une entreprise ?",
        ["La couverture des intérêts.", "La rotation totale des actifs.", "Le current ratio."],
        2,
        "La rotation totale des actifs mesure l'efficacité opérationnelle, et la couverture des intérêts mesure le risque financier d'une entreprise. Le current ratio, lui, est le ratio de référence pour mesurer la liquidité interne (la capacité à honorer les obligations court terme avec les actifs courants).",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 10...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
