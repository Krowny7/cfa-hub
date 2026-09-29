import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 9 (Financial Reporting Quality)",
    difficulty: 2,
    questions: [
      [
        "Sur un spectre d'évaluation de la qualité de la communication financière, laquelle des situations suivantes représente la plus haute qualité ?",
        [
          "La communication est conforme au GAAP et utile à la décision, mais les résultats ne sont pas durables.",
          "La communication est conforme au GAAP mais les choix et estimations comptables sont biaisés.",
          "La communication n'est pas conforme au GAAP mais les chiffres présentés reflètent l'activité réelle de l'entreprise.",
        ],
        0,
        "Une entreprise peut avoir une communication financière de haute qualité même si la qualité de ses résultats est faible, comme une entreprise qui constate des gains ponctuels tout en les identifiant clairement. Des choix comptables biaisés et une non-conformité au GAAP représentent au contraire une communication financière de moindre qualité.",
      ],
      [
        "Les conditions pouvant conduire des entreprises à publier une communication financière de mauvaise qualité sont le mieux décrites comme :",
        [
          "l'opportunité, la motivation et la rationalisation.",
          "une structure organisationnelle instable et des contrôles internes déficients.",
          "des normes éthiques inappropriées et le fait de ne pas corriger des dysfonctionnements connus.",
        ],
        0,
        "Les trois conditions qui conduisent le plus souvent à une communication financière de mauvaise qualité sont l'opportunité, la motivation, et la rationalisation.",
      ],
      [
        "Comparée à une entreprise qui passe correctement en charges ses coûts d'entretien récurrents, une entreprise qui capitalise ces coûts présentera un flux de trésorerie plus élevé en provenance :",
        ["des activités d'exploitation.", "des activités de financement.", "des activités d'investissement."],
        0,
        "Lorsqu'une entreprise capitalise des coûts, elle classe la sortie de trésorerie en CFI plutôt qu'en CFO, ce qui donne un CFO plus élevé comparé à la passation en charges des mêmes coûts.",
      ],
      [
        "Une forte augmentation des délais de paiement fournisseurs (days payables) au-delà des niveaux historiques est le plus vraisemblablement associée à :",
        [
          "une augmentation du fonds de roulement net.",
          "une hausse non durable des résultats publiés.",
          "une faible qualité du tableau des flux de trésorerie.",
        ],
        2,
        "Une forte augmentation des délais de paiement fournisseurs peut indiquer que les dettes fournisseurs sont 'étirées' (payées plus lentement), ce qui gonfle le flux de trésorerie d'exploitation de manière non durable et remet en cause la qualité du tableau des flux de trésorerie. Cela n'affecte pas les résultats et diminue, plutôt qu'il n'augmente, le fonds de roulement net.",
      ],
      [
        "Laquelle des actions suivantes est la moins susceptible d'augmenter les résultats de la période en cours ?",
        [
          "Diminuer la valeur résiduelle des actifs amortissables.",
          "Constater un produit avant d'avoir rempli les conditions de la vente.",
          "Vendre plus de stock qu'il n'en est acheté ou produit.",
        ],
        0,
        "Diminuer la valeur résiduelle entraîne une charge d'amortissement plus élevée et donc des résultats plus faibles dans la période en cours, alors que les deux autres choix sont des pratiques agressives qui augmentent les résultats de la période en cours.",
      ],
      [
        "Samantha Cameron, CFA, analyse la qualité de la communication financière de Redd Networks. Cameron examine comment l'entreprise répond à des clauses restrictives de dette (covenants) strictes et enquête sur les participations des dirigeants en actions et options de l'entreprise, réputées élevées. Quelle condition pouvant conduire à une communication financière de mauvaise qualité Cameron examine-t-elle ?",
        ["L'opportunité.", "La rationalisation.", "La motivation."],
        2,
        "Les éléments examinés par Cameron — pression des covenants et participation élevée des dirigeants au capital — représentent des incitations (des motivations) susceptibles de pousser la direction vers une communication financière de mauvaise qualité, et non des opportunités (faiblesse des contrôles) ou une rationalisation (justification morale des actes).",
      ],
      [
        "Laquelle des caractéristiques suivantes est le plus fidèlement décrite comme une caractéristique de la qualité des résultats (quality of earnings) d'une entreprise ?",
        ["La durabilité (sustainability).", "L'exhaustivité (completeness).", "La pertinence (relevance)."],
        0,
        "La qualité des résultats est liée au niveau et à la durabilité (sustainability) des résultats d'une entreprise. La pertinence et la fidélité de la représentation (incluant l'exhaustivité et la neutralité) sont des caractéristiques de la qualité de la communication financière, un concept distinct.",
      ],
      [
        "Concernant l'objectif de neutralité en communication financière, les normes comptables relatives aux coûts de recherche et aux pertes sur litiges devraient être considérées comme :",
        [
          "biaisées vers une communication financière agressive.",
          "biaisées vers une communication financière conservatrice.",
          "favorisant une communication financière neutre.",
        ],
        1,
        "Certains principes comptables, comme les normes IFRS et US GAAP sur la passation en charges des coûts de recherche et la reconnaissance des pertes probables sur litiges, reflètent une approche conservatrice plutôt que neutre, en exigeant une reconnaissance plus précoce des pertes probables que des gains probables.",
      ],
      [
        "Quel mécanisme de discipline de la qualité de la communication financière, pour les titres cotés aux États-Unis, n'est généralement pas imposé aux émetteurs ailleurs ?",
        [
          "La direction doit attester de l'efficacité des contrôles internes de l'entreprise.",
          "L'entreprise doit fournir une déclaration signée par la personne responsable de la préparation des états financiers.",
          "Les états financiers doivent être audités par un tiers indépendant.",
        ],
        0,
        "Une déclaration signée de la direction attestant de l'efficacité des contrôles internes est exigée par les régulateurs américains pour les titres cotés aux États-Unis, mais pas systématiquement ailleurs. Les deux autres exigences sont en général imposées par les régulateurs de valeurs mobilières à travers le monde.",
      ],
      [
        "Les mécanismes qui disciplinent la qualité de la communication financière sont le moins susceptibles d'inclure :",
        [
          "les régulateurs gouvernementaux des valeurs mobilières.",
          "les contreparties de contrats privés.",
          "les organismes de normalisation comptable.",
        ],
        2,
        "Les organismes de normalisation comptable émettent des normes de communication financière, mais n'en font pas respecter la conformité. Les régulateurs de valeurs mobilières et les contreparties de contrats privés (par exemple via des covenants) font, eux, bien partie des mécanismes qui disciplinent la qualité de la communication financière.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 9...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
