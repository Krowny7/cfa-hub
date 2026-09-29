import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";
const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 1 (Portfolio Risk and Return: Part I)",
    difficulty: 2,
    questions: [
      [
        "Dans le cadre de Markowitz, le risque est défini comme :",
        ["la variance des rendements.", "la probabilité d'une perte.", "le bêta d'un investissement."],
        0,
        "Le cadre de Markowitz suppose que tous les investisseurs perçoivent le risque comme la variabilité des rendements, mesurée par la variance (ou l'écart-type) des rendements. Le bêta mesure le risque systématique sous le CAPM, un concept distinct du cadre de Markowitz.",
      ],
      [
        "Selon le CAPM, un investisseur rationnel serait le moins susceptible de choisir comme portefeuille optimal :",
        [
          "une allocation à 100 % dans l'actif sans risque.",
          "le portefeuille de variance minimale globale.",
          "une allocation à 130 % dans le portefeuille de marché.",
        ],
        1,
        "Les investisseurs rationnels averses au risque choisissent de manière optimale un portefeuille situé sur la capital market line (CML), allant de 100 % dans l'actif sans risque jusqu'à une position à effet de levier dans le portefeuille de marché. Le portefeuille de variance minimale globale se situe sous la CML et n'est pas efficient selon les hypothèses du CAPM.",
      ],
      [
        "Quelle est la variance d'un portefeuille à deux actions si 15 % est investi dans l'action A (variance de 0,0071) et 85 % dans l'action B (variance de 0,0008), avec un coefficient de corrélation entre les actions de -0,04 ?",
        ["0,0007.", "0,0020.", "0,0026."],
        0,
        "σ²p = W₁²σ₁² + W₂²σ₂² + 2W₁W₂σ₁σ₂r₁,₂ = (0,15)²(0,0071) + (0,85)²(0,0008) + 2(0,15)(0,85)(0,0843)(0,0283)(-0,04) = 0,0007.",
      ],
      [
        "L'action 1 a un écart-type de 10. L'action 2 a également un écart-type de 10. Si le coefficient de corrélation entre ces actions est de -1, quelle est la covariance entre ces deux actions ?",
        ["0,00.", "-100,00.", "1,00."],
        1,
        "Covariance = coefficient de corrélation × écart-type(Action1) × écart-type(Action2) = (-1,00)(10,00)(10,00) = -100,00.",
      ],
      [
        "Betsy Minor étudie les bénéfices de diversification d'un portefeuille à deux actions. Le rendement attendu de l'action A est de 14 % avec un écart-type de 18 %, et le rendement attendu de l'action B est de 18 % avec un écart-type de 24 %. Minor prévoit d'investir 40 % de ses fonds dans l'action A et 60 % dans l'action B. Le coefficient de corrélation entre les deux actions est de 0,6. Quelle est la variance et l'écart-type du portefeuille à deux actions ?",
        [
          "Variance = 0,02206 ; Écart-type = 14,85 %.",
          "Variance = 0,03836 ; Écart-type = 19,59 %.",
          "Variance = 0,04666 ; Écart-type = 21,60 %.",
        ],
        1,
        "σ²p = (0,40)²(0,18)² + (0,60)²(0,24)² + 2(0,4)(0,6)(0,18)(0,24)(0,6) = 0,03836 ; √0,03836 = 19,59 %.",
      ],
      [
        "Réduire la corrélation entre les actifs d'un portefeuille déplace la frontière efficiente :",
        [
          "vers le sud-est (risque plus élevé, rendement identique).",
          "vers le nord-est (rendement plus élevé, risque identique).",
          "vers le nord-ouest (risque réduit, rendement identique ou amélioré).",
        ],
        2,
        "Réduire la corrélation entre les actifs d'un portefeuille améliore les bénéfices de diversification : pour un même niveau de rendement attendu, le risque du portefeuille diminue, ce qui déplace la frontière efficiente vers le nord-ouest sur le graphique risque-rendement.",
      ],
      [
        "Laquelle des affirmations suivantes sur la frontière efficiente est la moins exacte ?",
        [
          "Les investisseurs souhaitent toujours détenir le portefeuille offrant le rendement le plus élevé, quel que soit le niveau de risque.",
          "Tous les portefeuilles sur la frontière efficiente sont dominants par rapport aux portefeuilles situés en dessous.",
          "La frontière efficiente représente l'ensemble des portefeuilles offrant le rendement attendu maximal pour chaque niveau de risque.",
        ],
        0,
        "Cette affirmation ignore la dimension risque : un investisseur rationnel averse au risque ne cherche pas simplement le rendement le plus élevé possible, mais le meilleur compromis risque-rendement compte tenu de sa tolérance au risque. C'est précisément l'objet de la frontière efficiente, décrite correctement par les deux autres options.",
      ],
      [
        "Les bénéfices de la diversification existent tant que le coefficient de corrélation entre les actifs est :",
        ["inférieur à 1.", "supérieur à 0.", "égal à 1."],
        0,
        "Tant que la corrélation entre deux actifs est strictement inférieure à 1, combiner ces actifs dans un portefeuille réduit le risque total en dessous de la moyenne pondérée des risques individuels — c'est la source des bénéfices de diversification. Une corrélation de +1 exactement élimine tout bénéfice de diversification.",
      ],
      [
        "Une covariance positive entre les rendements de deux actifs implique que :",
        [
          "les rendements évoluent toujours dans des directions opposées.",
          "les deux actifs ont le même niveau de risque total.",
          "les rendements ont tendance à évoluer dans la même direction.",
        ],
        2,
        "Une covariance positive signifie que les rendements des deux actifs ont statistiquement tendance à évoluer dans la même direction (tous deux montent ou baissent ensemble). Une covariance négative indiquerait au contraire des mouvements en sens opposé, et la covariance ne dit rien du niveau de risque total de chaque actif pris isolément.",
      ],
      [
        "Ajouter une action à un portefeuille existant réduit le risque du portefeuille si la corrélation entre cette action et le portefeuille est inférieure à :",
        ["0.", "0,50.", "+1,00."],
        2,
        "Tant que la corrélation entre le nouvel actif et le portefeuille existant est strictement inférieure à +1,00, l'ajout de cet actif réduit le risque total du portefeuille par rapport à la moyenne pondérée des risques — même si la corrélation reste positive (mais < 1). Une corrélation nulle ou négative renforce cet effet, mais n'est pas une condition nécessaire.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 1...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
