import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Portfolio Management (Système)";
const QUIZ_SETS = [
  {
    title: "Portfolio Management — Drill Fiche Page 5 (The Behavioral Biases of Individuals)",
    difficulty: 2,
    questions: [
      [
        "Rex Newman traite différemment son salaire et ses primes lorsqu'il détermine ses objectifs d'épargne et d'investissement. Il investit ainsi tout salaire net disponible dans des placements peu risqués, tout en investissant ses primes dans des alternatives à haut risque. Newman illustre le plus vraisemblablement :",
        ["le biais de disponibilité.", "le biais de comptabilité mentale.", "le biais de cadrage."],
        1,
        "Le biais de comptabilité mentale (mental accounting) consiste à considérer différemment l'argent selon sa source (salaire vs. primes) lors des décisions d'investissement, au lieu de traiter l'argent comme fongible.",
      ],
      [
        "Les biais émotionnels sont le plus vraisemblablement :",
        [
          "atténués plutôt qu'accommodés.",
          "issus de sentiments ou d'intuitions.",
          "liés à un raisonnement erroné.",
        ],
        1,
        "Les biais émotionnels proviennent de sentiments ou d'intuitions, ne relèvent pas d'un raisonnement conscient, et sont donc difficiles à surmonter — ils doivent généralement être accommodés plutôt qu'atténués. Les erreurs cognitives, à l'inverse, résultent d'un raisonnement erroné et peuvent être atténuées par l'information.",
      ],
      [
        "Greg Brown reçoit une nouvelle information fiable concernant l'une de ses actions, qui contredit sa prévision antérieure de ce à quoi l'action devrait se négocier. Cependant, Brown ne révise pas son estimation de la valeur de l'action. Brown illustre le plus vraisemblablement :",
        ["le biais de conservatisme.", "le biais de confirmation.", "le biais de rétrospection."],
        0,
        "Le biais de conservatisme désigne le fait de ne pas mettre à jour de manière appropriée sa vue ou sa prévision lorsqu'une nouvelle information valide devient disponible, poussant les investisseurs à maintenir des estimations obsolètes.",
      ],
      [
        "Sarah Kowalski a acheté une action de croissance à 45 $ par action, dont le cours a ensuite chuté de 35 %, et elle est réticente à la vendre car elle espère que l'action rebondira. Kowalski illustre le plus vraisemblablement :",
        ["le biais de disponibilité.", "le biais de maîtrise de soi.", "le biais d'aversion à la perte."],
        2,
        "Le biais d'aversion à la perte provient du fait de ressentir plus de douleur face à une perte que de plaisir face à un gain équivalent, poussant les investisseurs à conserver des positions perdantes dans l'espoir de revenir au point d'équilibre plutôt que d'acter la perte.",
      ],
      [
        "Harvey Woodman investit dans l'art moderne. Il vend occasionnellement une pièce de sa collection, mais le processus est souvent difficile car il se sent vexé lorsque des acheteurs potentiels lui proposent ce qu'il estime être un montant trop faible. Quel biais Woodman illustre-t-il le plus vraisemblablement ?",
        ["Le biais de comptabilité mentale.", "Le biais d'excès de confiance.", "Le biais de dotation (endowment bias)."],
        2,
        "Un individu présentant un biais de dotation (endowment bias) considère qu'un actif qu'il possède est spécial et vaut davantage que sa valeur de marché réelle, simplement parce qu'il le possède.",
      ],
      [
        "Les erreurs cognitives (cognitive errors) sont le mieux décrites comme :",
        [
          "provenant principalement d'un raisonnement erroné.",
          "provenant principalement de sentiments ou d'intuitions.",
          "impossibles à atténuer par l'éducation ou l'information.",
        ],
        0,
        "Les erreurs cognitives résultent principalement d'un raisonnement défaillant (blind spots, erreurs de traitement de l'information) plutôt que de sentiments ou d'intuitions (ce qui caractérise plutôt les biais émotionnels). Contrairement aux biais émotionnels, elles peuvent souvent être atténuées par une meilleure information ou une meilleure éducation.",
      ],
      [
        "Lequel des biais suivants est le plus étroitement lié au traitement de l'information (information processing biases) ?",
        [
          "Le biais de dotation (endowment bias).",
          "Le biais de statu quo.",
          "Le biais d'ancrage et d'ajustement (anchoring and adjustment).",
        ],
        2,
        "Le biais d'ancrage et d'ajustement relève des biais liés au traitement de l'information : un point de référence initial ('ancre') influence excessivement les estimations ultérieures, même lorsque de nouvelles informations devraient conduire à un ajustement plus important. Le biais de dotation et le biais de statu quo sont classés parmi les biais liés aux croyances (belief perseverance biases).",
      ],
      [
        "Lesquels des biais suivants relèvent de la persévérance des croyances (belief persistence biases) ?",
        [
          "Le conservatisme, la représentativité, et le biais de rétrospection.",
          "Le biais de dotation et le biais de statu quo.",
          "Le biais d'ancrage et le biais de disponibilité.",
        ],
        0,
        "Les biais de persévérance des croyances regroupent le conservatisme, la représentativité, le biais de confirmation, l'illusion de contrôle et le biais de rétrospection — tous liés à la difficulté de mettre à jour ses croyances face à de nouvelles informations. Le biais de dotation et le biais de statu quo relèvent plutôt des biais de traitement de l'information.",
      ],
      [
        "Les erreurs cognitives sont-elles plus susceptibles d'être atténuées, comparées aux biais émotionnels ?",
        [
          "Non, aucun des deux types de biais ne peut être atténué.",
          "Oui, car elles peuvent être atténuées par une meilleure information.",
          "Non, les biais émotionnels sont plus faciles à atténuer que les erreurs cognitives.",
        ],
        1,
        "Les erreurs cognitives résultent d'un raisonnement défaillant et peuvent généralement être corrigées en fournissant une meilleure information ou éducation à l'investisseur. Les biais émotionnels, provenant de sentiments et d'intuitions, sont beaucoup plus difficiles à corriger et doivent le plus souvent être accommodés plutôt qu'atténués.",
      ],
      [
        "Lesquels des biais suivants sont classés comme des biais émotionnels ?",
        [
          "Le conservatisme et la représentativité.",
          "Le statu quo et la dotation (endowment bias).",
          "L'ancrage et le biais de disponibilité.",
        ],
        1,
        "Le biais de statu quo et le biais de dotation sont classés comme des biais émotionnels, provenant de sentiments (préférence pour la situation actuelle, attachement à ce que l'on possède). Le conservatisme, la représentativité et l'ancrage sont, eux, des erreurs cognitives.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Portfolio Management Page 5...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
