import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 8 (Analysis of Income Taxes)",
    difficulty: 2,
    questions: [
      [
        "Laquelle des affirmations suivantes sur les impôts différés est INCORRECTE ?",
        [
          "Un passif d'impôt différé devrait entraîner une sortie de trésorerie future.",
          "L'impôt payé peut inclure des paiements ou remboursements relatifs à d'autres exercices.",
          "L'impôt à payer (taxes payable) est déterminé par le résultat avant impôt et le taux d'imposition.",
        ],
        2,
        "L'impôt à payer est déterminé par le résultat imposable (taxable income) et le taux d'imposition, pas par le résultat avant impôt (pretax income). Le résultat avant impôt (utilisé pour la communication financière) détermine la charge d'impôt, tandis que le résultat imposable (utilisé pour la déclaration fiscale) détermine l'impôt à payer.",
      ],
      [
        "Gator Sarl (Gator) a acquis des immobilisations en début de période pour 21 000 €, avec une durée de vie économique de trois ans et aucune valeur résiduelle. Gator utilise l'amortissement linéaire dans ses comptes, mais l'administration fiscale utilise le mode dégressif à taux double. À la fin de l'année 2, la valeur comptable de l'actif est de 7 000 € et sa base fiscale de 2 333 €. En supposant un taux d'imposition statutaire de 30 %, lequel des montants suivants est le plus proche du passif d'impôt différé (DTL) présenté au bilan de Gator à la fin de l'année 2 ?",
        ["700 €.", "1 400 €.", "2 100 €."],
        1,
        "DTL = (valeur comptable − base fiscale) × taux statutaire = (7 000 € − 2 333 €) × 0,30 = 1 400 €.",
      ],
      [
        "Lors de l'analyse de l'effet de levier financier d'une entreprise, les passifs d'impôts différés sont le mieux classés comme :",
        [
          "un passif ou des capitaux propres, selon la situation particulière de l'entreprise.",
          "un passif.",
          "ni un passif, ni des capitaux propres.",
        ],
        0,
        "Le traitement recommandé pour un analyste est de considérer les passifs d'impôts différés comme des passifs s'ils sont censés se dénouer (reverse), ou comme des capitaux propres s'ils ne sont pas censés se dénouer.",
      ],
      [
        "L'an dernier, Schoenberg AG a réalisé un résultat net de 150 000 €, une charge d'impôt de 47 000 €, et a payé un impôt de 51 000 €. Quel était le taux d'imposition effectif ?",
        ["23,9 %.", "25,9 %.", "31,3 %."],
        0,
        "Taux d'imposition effectif = charge d'impôt / résultat avant impôt = 47 000 € / (150 000 € + 47 000 €) = 23,9 %. Le résultat avant impôt s'obtient en rajoutant la charge d'impôt au résultat net.",
      ],
      [
        "Une différence temporaire entre le résultat avant impôt présenté dans les états financiers d'une entreprise et le résultat imposable déclaré à l'administration fiscale se traduit par :",
        [
          "un ajustement du taux d'imposition effectif de l'entreprise.",
          "un gain ou une perte dans le résultat global.",
          "un élément d'impôt différé.",
        ],
        2,
        "Une différence temporaire crée un passif d'impôt différé si la charge d'impôt excède l'impôt à payer, ou un actif d'impôt différé si elle lui est inférieure. C'est une différence permanente (pas temporaire) qui fait diverger le taux d'imposition effectif du taux statutaire.",
      ],
      [
        "Le taux d'imposition effectif d'une entreprise est déterminé en utilisant :",
        [
          "le résultat imposable tel qu'indiqué dans sa déclaration fiscale.",
          "la charge d'impôt tirée du compte de résultat.",
          "l'impôt payé en trésorerie à l'administration fiscale au cours de la période.",
        ],
        1,
        "Taux d'imposition effectif = charge d'impôt / résultat avant impôt. La charge d'impôt provient du compte de résultat (financial reporting), et non de la déclaration fiscale ni du montant réellement décaissé en trésorerie durant la période.",
      ],
      [
        "Lequel des éléments suivants est le plus susceptible de créer un actif d'impôt différé (DTA) ?",
        ["L'amortissement.", "Une baisse du taux d'imposition statutaire.", "Les produits constatés d'avance (unearned revenue)."],
        2,
        "Les produits constatés d'avance sont généralement imposables dès l'encaissement, même s'ils ne sont pas encore reconnus au compte de résultat — ce qui entraîne un impôt à payer plus élevé aujourd'hui et crée un actif d'impôt différé. L'amortissement crée généralement un passif d'impôt différé (accélération fiscale vs. linéaire comptable), et une baisse du taux d'imposition ne fait que diminuer les DTA/DTL existants, sans en créer de nouveaux.",
      ],
      [
        "Laquelle des affirmations suivantes concernant les impôts différés est INCORRECTE ?",
        [
          "Seules les composantes des passifs d'impôts différés susceptibles de se dénouer devraient être considérées comme un passif.",
          "Si les passifs d'impôts différés ne sont pas inclus dans les capitaux propres, le ratio dette/capitaux propres sera réduit.",
          "Si les impôts différés ne sont pas censés se dénouer dans le futur, ils devraient être classés en capitaux propres.",
        ],
        1,
        "Lorsque les passifs d'impôts différés sont inclus dans les capitaux propres, cela augmente le dénominateur du ratio dette/capitaux propres et le réduit donc — l'inverse de ce que suggère l'affirmation, qui prétend que le ratio est réduit lorsque les DTL ne sont PAS inclus dans les capitaux propres, ce qui est faux.",
      ],
      [
        "Laquelle des affirmations suivantes décrit le mieux la provision pour dépréciation (valuation allowance) ? Il s'agit d'une réserve :",
        [
          "créée lorsque les actifs d'impôts différés excèdent les passifs d'impôts différés.",
          "contre les actifs d'impôts différés fondée sur la probabilité que ces actifs ne soient pas réalisés.",
          "contre les passifs d'impôts différés fondée sur la probabilité que ces passifs soient réglés.",
        ],
        1,
        "La provision pour dépréciation (valuation allowance) est une réserve constituée contre les actifs d'impôts différés, reflétant la probabilité que ces actifs ne soient pas récupérables sur les résultats futurs. Elle ne concerne jamais les passifs d'impôts différés, et n'est pas définie en comparant simplement DTA et DTL.",
      ],
      [
        "Une entreprise a vendu 530 unités au cours de l'exercice avec une garantie d'un an. L'entreprise estime que 20 % de ces unités feront l'objet de réclamations durant l'année suivante, pour un coût de 80 $ par unité. Dans le pays où l'entreprise opère, une charge de garantie n'est fiscalement déductible que lorsque les travaux de garantie sont effectivement réalisés. Quelle est la base fiscale du passif de garantie ?",
        ["0 $.", "8 480 $.", "42 400 $."],
        0,
        "Au bilan, un passif de garantie de 8 480 $ (530 × 0,20 × 80 $) sera comptabilisé. La base fiscale est égale à la valeur comptable moins le montant déductible dans le futur, soit 8 480 $ − 8 480 $ = 0 $, puisque l'intégralité de la charge sera déductible plus tard lorsque les travaux seront réalisés — un actif d'impôt différé de 8 480 $ sera donc reconnu.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 8...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
