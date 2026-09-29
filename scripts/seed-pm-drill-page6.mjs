import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";
const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 6 (Introduction to Risk Management)",
    difficulty: 2,
    questions: [
      [
        "Un gestionnaire de portefeuille utilise un modèle informatique pour estimer l'effet sur la valeur d'un portefeuille d'une hausse simultanée de 3 % des taux d'intérêt et d'une dépréciation de 5 % de l'euro par rapport au yen. Le gestionnaire se livre le plus fidèlement à :",
        ["une analyse de scénarios (scenario analysis).", "un stress test.", "un risk shifting."],
        0,
        "L'analyse de scénarios modélise les effets de changements simultanés sur plusieurs variables d'entrée. Le stress test examine l'effet d'un changement sur une seule variable, et le risk shifting renvoie à la modification de la distribution des résultats (par exemple via des dérivés).",
      ],
      [
        "Souscrire une assurance est le mieux décrit comme une méthode pour une organisation de :",
        ["prévenir un risque.", "déplacer un risque (shift).", "transférer un risque."],
        2,
        "Souscrire une assurance transfère un risque à la compagnie d'assurance. Déplacer un risque (shifting) signifie modifier la distribution des résultats (typiquement via des dérivés), tandis que prévenir un risque consiste à prendre des mesures comme le renforcement des procédures de sécurité.",
      ],
      [
        "La valeur en risque (VaR) et la VaR conditionnelle sont le mieux décrites comme des mesures :",
        ["du risque de liquidité.", "du risque de modèle.", "du risque de queue (tail risk)."],
        2,
        "La VaR et la VaR conditionnelle mesurent le risque de queue — la probabilité ou l'ampleur de résultats négatifs extrêmes dans la queue d'une distribution de rendements.",
      ],
      [
        "Lesquels des éléments suivants sont des exemples de risques financiers ?",
        [
          "Le risque de crédit, le risque de marché, et le risque de liquidité.",
          "Le risque de marché, le risque de liquidité, et le risque fiscal.",
          "Le risque de solvabilité, le risque de crédit, et le risque de marché.",
        ],
        0,
        "Le risque de crédit, le risque de marché et le risque de liquidité sont classés comme des risques financiers. Le risque de solvabilité et le risque fiscal sont classés comme des risques non financiers.",
      ],
      [
        "La gouvernance des risques (risk governance) est le mieux décrite comme :",
        [
          "la détermination de la tolérance au risque d'une organisation.",
          "l'allocation des ressources d'une organisation en fonction de leurs caractéristiques de risque.",
          "la supervision par la direction générale de la fonction de gestion des risques de l'organisation.",
        ],
        2,
        "La gouvernance des risques est le terme général et englobant désignant la supervision par la direction générale de la fonction de gestion des risques. Déterminer la tolérance au risque et le risk budgeting (allocation des ressources selon le risque) sont des éléments spécifiques au sein de cette responsabilité de gouvernance plus large.",
      ],
      [
        "Lequel des risques suivants est le plus vraisemblablement classé comme un risque non financier ?",
        ["Le risque de crédit.", "Le risque de modèle.", "Le risque de marché."],
        1,
        "Le risque de modèle — le risque qu'un modèle financier produise des résultats erronés — est classé comme un risque non financier, au même titre que le risque opérationnel ou le risque de solvabilité. Le risque de crédit et le risque de marché sont, eux, des risques financiers.",
      ],
      [
        "Lorsqu'une organisation gère ses risques, elle devrait le plus vraisemblablement considérer :",
        [
          "chaque risque de manière isolée, indépendamment des autres.",
          "uniquement les risques financiers, en excluant les risques non financiers.",
          "les interactions entre les différents risques auxquels elle est exposée.",
        ],
        2,
        "Une gestion des risques efficace prend en compte les interactions entre les différents risques (financiers et non financiers), car ces risques peuvent se renforcer ou se compenser mutuellement — les considérer isolément ou ignorer les risques non financiers conduirait à une vision incomplète du profil de risque global.",
      ],
      [
        "Laquelle des affirmations suivantes décrit le mieux la tolérance au risque (risk tolerance) d'une organisation ?",
        [
          "Le niveau de risque acceptable compte tenu de sa force financière et de ses objectifs stratégiques.",
          "Le montant total de capital économique disponible pour absorber des pertes.",
          "La probabilité qu'un événement de risque se matérialise au cours de l'exercice.",
        ],
        0,
        "La tolérance au risque d'une organisation reflète le niveau de risque qu'elle est prête à accepter, déterminé notamment par sa force financière (capacité à absorber des pertes) et ses objectifs stratégiques — un concept distinct du capital économique disponible ou d'une simple probabilité d'occurrence.",
      ],
      [
        "Un cadre de gestion des risques (risk management framework) est le moins susceptible de viser à :",
        [
          "identifier et mesurer les risques auxquels l'organisation est exposée.",
          "discipliner les gestionnaires en supprimant toute prise de risque.",
          "définir des processus de suivi et de reporting des risques.",
        ],
        1,
        "Un cadre de gestion des risques vise à identifier, mesurer, gérer et surveiller les risques — pas à éliminer toute prise de risque, ce qui irait à l'encontre de l'objectif même d'investir. Discipliner les gestionnaires n'est pas non plus l'objectif premier d'un cadre de gestion des risques, contrairement à l'identification et au suivi des risques.",
      ],
      [
        "La sensibilité d'un portefeuille obligataire aux variations de taux d'intérêt est le moins vraisemblablement mesurée par :",
        ["le bêta.", "la duration.", "la convexité."],
        0,
        "Le bêta mesure la sensibilité d'un actif aux mouvements du marché actions dans le cadre du CAPM, pas la sensibilité aux taux d'intérêt. La duration et la convexité sont, elles, les mesures classiques de la sensibilité d'un portefeuille obligataire aux variations de taux d'intérêt.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 6...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
