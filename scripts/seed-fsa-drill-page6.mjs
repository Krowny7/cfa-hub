import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 6 (Analysis of Long-Term Assets)",
    difficulty: 2,
    questions: [
      [
        "Mammoth, Inc. reporte sous US GAAP. Mammoth a lancé un projet long terme de développement d'un logiciel de gestion des stocks destiné à la vente externe. Dans ses états financiers, Mammoth devrait :",
        [
          "capitaliser tous les coûts de ce projet.",
          "passer en charges tous les coûts de ce projet au fur et à mesure qu'ils sont engagés.",
          "passer en charges tous les coûts de ce projet jusqu'à ce que la faisabilité technologique soit établie.",
        ],
        2,
        "Sous IFRS comme sous US GAAP, les coûts de développement de logiciels sont passés en charges jusqu'à ce que la faisabilité technologique soit établie, puis capitalisés une fois cette faisabilité démontrée.",
      ],
      [
        "Lequel des éléments suivants est le moins vraisemblablement un exemple d'actif incorporel à durée de vie indéfinie ?",
        [
          "Des brevets acquis.",
          "Le goodwill.",
          "Des marques déposées renouvelables à coût minime.",
        ],
        0,
        "Les brevets acquis sont le plus souvent achetés dans l'intention d'être utilisés sur une période déterminée : ils ont donc une durée de vie finie. Le goodwill a par définition une durée de vie indéfinie, et les marques renouvelables à coût minime sont également traitées comme des incorporels à durée de vie indéfinie.",
      ],
      [
        "Marcel Inc. est une grande entreprise industrielle. Marcel possède des actifs long terme actuellement en usage, valorisés au bilan à 600 millions $, incluant des pertes de dépréciation précédemment constatées de 80 millions $. Le coût d'origine des actifs était de 750 millions $. La juste valeur des actifs a été déterminée par une expertise professionnelle à 690 millions $. En supposant que Marcel reporte sous US GAAP, la nouvelle expertise se traduit le plus vraisemblablement par :",
        [
          "un gain de 90 millions $ dans les autres éléments du résultat global.",
          "un gain de 80 millions $ au compte de résultat et un gain de 10 millions $ dans les autres éléments du résultat global.",
          "aucun changement dans les états financiers de Marcel.",
        ],
        2,
        "Sous US GAAP, les actifs long terme sont comptabilisés au coût amorti diminué de toute perte de dépréciation. Les réévaluations à la hausse sont généralement interdites (sauf pour les actifs détenus en vue de la vente). Ces actifs étant actuellement en usage, cette exception ne s'applique pas : Marcel ne peut donc pas réévaluer les actifs à la hausse.",
      ],
      [
        "Lequel des éléments suivants est le mieux estimé par le ratio des immobilisations nettes (net PP&E) sur la charge annuelle d'amortissement ?",
        ["La durée de vie utile restante.", "L'âge moyen.", "La durée de vie utile totale."],
        0,
        "Durée de vie utile restante = immobilisations nettes en fin de période / charge annuelle d'amortissement.",
      ],
      [
        "Lorsqu'on compare les effets sur les états financiers de la passation en charges versus la capitalisation d'une dépense, la capitalisation se traduit le plus vraisemblablement par lesquels des effets suivants au cours des années suivant la dépense ?",
        [
          "Un résultat net plus faible et un rendement des actifs plus élevé.",
          "Un résultat net plus élevé et un rendement des actifs plus faible.",
          "Un résultat net plus faible et un rendement des actifs plus faible.",
        ],
        2,
        "Dans les années suivant la dépense, la capitalisation entraîne une charge d'amortissement déduite du résultat net, donnant un résultat net plus faible que si la dépense avait été passée en charges immédiatement. La capitalisation augmente aussi le total des actifs, ce qui fait baisser le ROA (résultat net / actifs).",
      ],
      [
        "L'âge moyen des immobilisations corporelles d'une entreprise peut être estimé en divisant :",
        [
          "l'amortissement cumulé par la charge d'amortissement.",
          "les immobilisations brutes par la charge d'amortissement.",
          "les immobilisations nettes par la charge d'amortissement.",
        ],
        0,
        "Âge moyen = amortissement cumulé / charge annuelle d'amortissement. Cette formule est différente de la durée de vie utile restante, qui utilise les immobilisations nettes (et non l'amortissement cumulé) au numérateur.",
      ],
      [
        "Une dépréciation d'actif (impairment write-down) est la moins susceptible de diminuer :",
        ["les actifs.", "le ratio dette/capitaux propres.", "la charge d'amortissement future."],
        1,
        "Une dépréciation réduit les capitaux propres sans affecter la dette : le ratio dette/capitaux propres augmente donc plutôt qu'il ne diminue. Les actifs diminuent (numérateur de la dépréciation elle-même) et la charge d'amortissement future diminue également puisque la base amortissable est plus faible après la dépréciation.",
      ],
      [
        "Le coût amorti d'une marque déposée est le moins susceptible d'apparaître au bilan d'une entreprise si la marque a été :",
        ["développée en interne.", "obtenue lors de l'acquisition d'une autre entreprise.", "achetée à une autre entreprise."],
        0,
        "Les coûts de développement d'une marque en interne sont passés en charges au fur et à mesure qu'ils sont engagés et ne créent donc aucun actif au bilan. La valeur d'une marque n'apparaît au bilan que si elle a été achetée ou obtenue lors d'une acquisition d'entreprise.",
      ],
      [
        "Varin, Inc. achète des droits de franchise d'une durée de vie utile estimée à dix ans, ainsi qu'une marque déposée renouvelable tous les cinq ans pour des frais minimes. Sous IFRS, Varin comptabilisera une charge d'amortissement sur :",
        ["ces deux actifs.", "aucun de ces deux actifs.", "un seul de ces deux actifs."],
        2,
        "Les actifs incorporels acquis avec une durée de vie finie attendue sont amortis — c'est le cas des droits de franchise (dix ans). Les actifs incorporels à durée de vie indéfinie ne sont pas amortis mais testés annuellement pour dépréciation — c'est le cas de la marque, dont le renouvellement à coût minime en fait un actif à durée de vie indéfinie.",
      ],
      [
        "Constater une dépréciation d'actifs long terme se traduit par :",
        [
          "un rendement des actifs (ROA) futur plus élevé.",
          "un ratio dette/capitaux propres plus faible.",
          "des passifs d'impôts différés plus élevés.",
        ],
        0,
        "Dans les années futures, moins de charge d'amortissement est constatée sur l'actif déprécié, ce qui entraîne un résultat net et un ROA plus élevés (ROA = résultat net / actifs totaux). Les passifs d'impôts différés liés à l'actif diminuent, car la dépréciation n'est pas déductible fiscalement tant que l'actif n'est pas cédé, et le ratio dette/capitaux propres augmente (pas diminue) puisque les capitaux propres baissent alors que la dette reste inchangée.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 6...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
