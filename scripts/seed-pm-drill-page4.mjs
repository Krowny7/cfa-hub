import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";
const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 4 (Basics of Portfolio Planning and Construction)",
    difficulty: 2,
    questions: [
      [
        "Une gestionnaire de portefeuille qui pense que les actions sont surévaluées à court terme réduit le poids des actions dans son portefeuille à 35 % contre un poids cible long terme de 40 %. Cette décision est la mieux décrite comme un exemple de :",
        ["rééquilibrage (rebalancing).", "allocation stratégique d'actifs.", "allocation tactique d'actifs."],
        2,
        "L'allocation tactique d'actifs consiste à s'écarter délibérément des poids cibles (stratégiques) d'un portefeuille à court terme pour exploiter une mauvaise valorisation perçue sur une classe d'actifs spécifique.",
      ],
      [
        "Si la capacité d'un investisseur à supporter le risque (ability to bear risk) est faible et sa volonté de prendre du risque (willingness to bear risk) est élevée, un gestionnaire devrait le plus judicieusement considérer la tolérance au risque financier globale de l'investisseur comme :",
        ["faible.", "moyenne.", "élevée."],
        0,
        "En général, un conseiller doit considérer que la tolérance au risque globale d'un investisseur correspond à la plus faible des deux entre sa capacité et sa volonté de prendre du risque.",
      ],
      [
        "Une société qui investit la majorité d'un portefeuille pour répliquer passivement un indice de référence, et utilise des stratégies actives pour la portion restante, met en œuvre :",
        ["une approche core-satellite.", "le risk budgeting.", "l'allocation stratégique d'actifs."],
        0,
        "Avec une approche core-satellite, une société investit passivement la majorité d'un portefeuille (le 'core') et utilise des stratégies actives pour la portion restante (les 'satellites').",
      ],
      [
        "Laquelle des spécifications de classe d'actifs suivantes est la plus appropriée à des fins d'allocation d'actifs ?",
        ["Les marchés émergents.", "La consommation discrétionnaire.", "Les obligations domestiques."],
        2,
        "Une classe d'actifs devrait être spécifiée par type de titre (par exemple : actions, obligations, cash). 'Marchés émergents' et 'consommation discrétionnaire' sont incomplets car ils n'identifient pas si les titres sous-jacents sont des actions ou des titres de dette.",
      ],
      [
        "Un objectif de rendement est dit relatif si l'objectif est :",
        [
          "basé sur un indice ou portefeuille de référence.",
          "exprimé en termes de probabilité.",
          "comparé à un résultat numérique spécifique.",
        ],
        0,
        "Les objectifs de rendement relatifs sont exprimés par rapport à un indice de référence spécifié, comme un indice boursier ou le LIBOR. Les objectifs de rendement absolus sont exprimés sous forme de résultats numériques spécifiques (par exemple, 5 %).",
      ],
      [
        "Les catégories de contraintes d'investissement dans une déclaration de politique d'investissement (IPS) sont le moins susceptibles d'inclure :",
        ["les besoins de liquidité.", "les considérations fiscales.", "la tolérance au risque."],
        2,
        "La tolérance au risque et l'exigence de rendement constituent les objectifs d'investissement, pas les contraintes. Les contraintes d'investissement incluent les besoins de liquidité, l'horizon de temps, les considérations fiscales, les facteurs légaux et réglementaires, et les circonstances particulières.",
      ],
      [
        "Laquelle des affirmations suivantes sur l'importance du risque et du rendement dans l'objectif d'investissement est la moins exacte ?",
        [
          "L'objectif de rendement peut être exprimé en montant absolu même si l'objectif de risque est exprimé en pourcentage.",
          "Exprimer les objectifs d'investissement en termes de risque est plus approprié que de les exprimer en termes de rendement.",
          "La tolérance au risque de l'investisseur détermine le plus vraisemblablement le niveau de rendement qui sera atteignable.",
        ],
        1,
        "Exprimer les objectifs d'investissement uniquement en termes de risque n'est pas plus approprié que de les exprimer en termes de rendement — les objectifs d'investissement doivent être formulés à la fois en termes de risque ET de rendement. La tolérance au risque contribue effectivement à déterminer quel niveau de rendement sera réalisable.",
      ],
      [
        "Laquelle des affirmations suivantes N'est PAS une justification de l'importance de la déclaration de politique d'investissement (IPS) ? Elle :",
        [
          "force les investisseurs à comprendre leurs besoins et contraintes.",
          "aide les investisseurs à comprendre les risques et coûts de l'investissement.",
          "identifie les actions spécifiques que l'investisseur pourrait souhaiter acheter.",
        ],
        2,
        "La déclaration de politique d'investissement définit des objectifs et contraintes larges, mais n'entre jamais dans le détail d'actions spécifiques à acheter. Les deux autres justifications décrivent correctement le rôle pédagogique et clarificateur de l'IPS.",
      ],
      [
        "Un gestionnaire de placement met le plus vraisemblablement en œuvre une allocation tactique d'actifs s'il :",
        [
          "alloue plus que les 10 % ciblés aux obligations des marchés émergents parce que ce secteur semble sous-évalué.",
          "alloue 5 % au cash, 20 % aux obligations et 75 % aux actions en fonction de l'horizon long et de la tolérance au risque élevée de l'investisseur.",
          "augmente l'allocation aux obligations exonérées d'impôt parce que le taux d'imposition effectif de l'investisseur a augmenté.",
        ],
        0,
        "L'allocation tactique d'actifs consiste à s'écarter des poids cibles du portefeuille pour exploiter une mauvaise valorisation perçue à court terme — c'est exactement ce que décrit l'option A. Les options B et C relèvent de l'établissement (ou de l'ajustement de long terme) de l'allocation stratégique en fonction des caractéristiques propres de l'investisseur, pas d'un pari tactique de court terme.",
      ],
      [
        "Les principales composantes d'une déclaration de politique d'investissement (IPS) typique sont le moins susceptibles d'inclure :",
        [
          "la rémunération du gestionnaire de placement.",
          "les devoirs et responsabilités du gestionnaire de placement.",
          "les objectifs d'investissement.",
        ],
        0,
        "La rémunération du gestionnaire de placement ne fait pas partie des composantes principales d'une IPS type. Les composantes principales incluent une description du client, un énoncé de l'objet, un énoncé des devoirs et responsabilités, les procédures de mise à jour, les objectifs d'investissement, les contraintes, les lignes directrices d'investissement, et le benchmark d'évaluation de la performance.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 4...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
