import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";
const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 2 (Portfolio Risk and Return: Part II)",
    difficulty: 2,
    questions: [
      [
        "Lesquels des termes suivants renvoient au même type de risque ?",
        [
          "Le risque systématique et le risque spécifique à l'entreprise.",
          "Le risque total et la variance des rendements.",
          "Le risque non diversifiable et le risque non systématique.",
        ],
        1,
        "La variance est une mesure du risque total ; 'risque total' et 'variance des rendements' renvoient donc bien au même concept. Le risque systématique et le risque spécifique à l'entreprise sont des types de risque différents, tout comme le risque non diversifiable et le risque non systématique.",
      ],
      [
        "Laquelle des affirmations suivantes concernant le ratio de Sharpe est la plus exacte ? Le ratio de Sharpe mesure :",
        [
          "le rendement excédentaire par unité de risque.",
          "l'acuité (peakedness) d'une distribution de rendements.",
          "le rendement total par unité de risque.",
        ],
        0,
        "Le ratio de Sharpe mesure le rendement excédentaire (rendement du portefeuille moins le taux sans risque) par unité de risque, défini comme l'écart-type des rendements. L'acuité d'une distribution est mesurée par le kurtosis, pas par le ratio de Sharpe.",
      ],
      [
        "Quel est le taux de rendement attendu d'une action ayant un bêta de 1,4 si la prime de risque de marché est de 9 % et le taux sans risque de 4 % ?",
        ["13,0 %.", "16,6 %.", "11,0 %."],
        1,
        "En utilisant l'équation de la security market line (SML) : 4 % + 1,4(9 %) = 16,6 %.",
      ],
      [
        "Un portefeuille équipondéré composé d'un actif risqué et d'un actif sans risque présentera :",
        [
          "la moitié de l'écart-type des rendements de l'actif risqué.",
          "moins de la moitié de l'écart-type des rendements de l'actif risqué.",
          "plus de la moitié de l'écart-type des rendements de l'actif risqué.",
        ],
        0,
        "Un actif sans risque a un écart-type nul et une corrélation nulle avec tout actif risqué. En conséquence, l'écart-type du portefeuille est égal au poids de l'actif risqué multiplié par son écart-type. Pour un portefeuille équipondéré, ce poids est de 0,5, donc l'écart-type du portefeuille correspond à la moitié de celui de l'actif risqué.",
      ],
      [
        "Tous les portefeuilles situés sur la capital market line (CML) :",
        [
          "présentent un risque non systématique, sauf si seul l'actif sans risque est détenu.",
          "contiennent au moins une allocation positive à l'actif sans risque.",
          "contiennent le même mélange d'actifs risqués, sauf si seul l'actif sans risque est détenu.",
        ],
        2,
        "Tous les portefeuilles sur la CML incluent le même portefeuille (de marché) d'actifs risqués, sauf à l'intersection où tous les fonds sont placés dans l'actif sans risque. Les portefeuilles sur la CML sont bien diversifiés (efficients) et n'ont aucun risque non systématique ; les 'portefeuilles emprunteurs' ont une allocation négative à l'actif sans risque, donc l'option B n'est pas toujours vraie.",
      ],
      [
        "Dans un modèle de marché, la pente de la droite caractéristique (characteristic line) d'un titre mesure :",
        [
          "la volatilité totale du titre.",
          "le rendement excédentaire moyen du titre.",
          "le bêta du titre, c'est-à-dire sa sensibilité au marché.",
        ],
        2,
        "La droite caractéristique régresse les rendements excédentaires d'un titre sur les rendements excédentaires du marché ; sa pente est précisément le bêta du titre, mesurant sa sensibilité au marché — et non sa volatilité totale (qui inclut aussi le risque spécifique) ni son rendement excédentaire moyen (qui correspondrait plutôt à l'ordonnée à l'origine, alpha).",
      ],
      [
        "Quelle mesure de risque est associée à la capital market line (CML) ?",
        ["Le bêta.", "Le risque non systématique.", "L'écart-type."],
        2,
        "La CML relie le rendement attendu à l'écart-type total des rendements (le risque total) pour les portefeuilles efficients combinant l'actif sans risque et le portefeuille de marché. Le bêta est associé à la security market line (SML), qui mesure le risque systématique uniquement.",
      ],
      [
        "Dans le contexte de la capital market line (CML), le portefeuille de marché inclut :",
        [
          "uniquement les actions à grande capitalisation.",
          "tous les actifs risqués existants.",
          "uniquement les actifs négociés sur les marchés domestiques.",
        ],
        1,
        "Le portefeuille de marché, tel que défini dans le cadre de la CML, représente théoriquement l'ensemble de tous les actifs risqués existants (actions, obligations, immobilier, etc.), et non un sous-ensemble limité aux grandes capitalisations ou aux marchés domestiques.",
      ],
      [
        "Laquelle des affirmations suivantes sur le risque est INCORRECTE ?",
        [
          "Le risque total se décompose en risque systématique plus risque non systématique.",
          "Le risque total est égal au risque systématique moins le risque non systématique.",
          "Le risque non systématique peut être éliminé par la diversification.",
        ],
        1,
        "La formule correcte est risque total = risque systématique + risque non systématique (et non une soustraction). Le risque non systématique peut effectivement être éliminé par une diversification suffisante, laissant uniquement le risque systématique, non diversifiable.",
      ],
      [
        "Si l'on trace les combinaisons de rendement attendu et d'écart-type obtenues en combinant un actif risqué et l'actif sans risque, on obtient :",
        [
          "une courbe concave.",
          "une courbe convexe.",
          "une ligne droite.",
        ],
        2,
        "Puisque l'actif sans risque a un écart-type nul et une corrélation nulle avec l'actif risqué, toute combinaison des deux se situe sur une ligne droite reliant le point de l'actif sans risque à celui de l'actif risqué dans l'espace rendement-écart-type — c'est précisément la construction géométrique de la capital allocation line.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 2...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
