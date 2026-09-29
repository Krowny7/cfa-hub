import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 2 (Analyzing Balance Sheets)",
    difficulty: 2,
    questions: [
      [
        "Un analyste a réuni les informations suivantes sur une entreprise : Trésorerie 100, Créances clients 750, Titres négociables 300, Stocks 850 ; Dettes fournisseurs 300, Dette court terme 130. Quel est le quick ratio ?",
        ["0,62.", "1,53.", "2,67."],
        2,
        "Quick ratio = (Trésorerie + Créances clients + Titres négociables) / (Dettes fournisseurs + Dette court terme) = (100 + 750 + 300) / (300 + 130) = 1 150 / 430 = 2,67. Les stocks sont exclus du numérateur car c'est justement ce qui distingue le quick ratio du current ratio.",
      ],
      [
        "Sous US GAAP, la valeur au bilan d'un titre de créance classé comme 'held-to-maturity' est :",
        ["son coût historique.", "son coût amorti.", "sa juste valeur."],
        1,
        "Sous US GAAP, les titres de créance détenus jusqu'à l'échéance (held-to-maturity) sont comptabilisés au bilan à leur coût amorti, ni à leur coût historique brut (non ajusté), ni à leur juste valeur — contrairement aux titres trading ou available-for-sale.",
      ],
      [
        "Le goodwill comptable au bilan est le plus fidèlement décrit comme :",
        [
          "le montant par lequel le prix d'acquisition d'une entreprise excède ses actifs nets identifiables.",
          "la valeur intangible qu'une entreprise crée en excès de ses actifs nets identifiables.",
          "la valeur dérivée de la performance future attendue d'une entreprise.",
        ],
        0,
        "Le goodwill comptable (au bilan) correspond au montant par lequel le prix d'acquisition d'une entreprise excède la juste valeur de ses actifs nets identifiables. Le goodwill généré en interne n'est jamais reconnu au bilan (B décrit un concept non comptabilisé), et la valeur issue de la performance future attendue est appelée 'goodwill économique', un concept distinct du goodwill comptable (C).",
      ],
      [
        "James Alexander, Inc. a payé le pair de 220 000 $ pour des obligations à coupon de 5 % émises par Charles Michael, Inc. À la fin de la période comptable, la juste valeur des obligations était de 212 000 $. L'entreprise prévoit de conserver ces obligations quelques années mais de les vendre avant l'échéance. Quel sera l'impact le plus probable sur le résultat net à la fin de la première année ?",
        ["Le résultat net ne sera pas affecté.", "Le résultat net diminuera.", "Le résultat net augmentera."],
        2,
        "Puisque l'entreprise prévoit de conserver les obligations un certain temps mais de les vendre avant l'échéance, elles sont classées 'available-for-sale' : la perte latente de 8 000 $ passe par les autres éléments du résultat global (OCI) et non par le résultat net, tandis que les revenus d'intérêts perçus sur les obligations augmentent bien le résultat net.",
      ],
      [
        "Lequel des éléments suivants est classé comme actif incorporel identifiable ?",
        ["Le goodwill.", "Un placement en titres.", "Une marque déposée (trademark)."],
        2,
        "Les actifs incorporels identifiables sont des actifs non monétaires sans substance physique pouvant être acquis séparément, comme une marque déposée. Le goodwill ne peut jamais être acquis séparément — il est donc par définition non identifiable — tandis que les titres de placement sont considérés comme des actifs financiers, pas incorporels.",
      ],
      [
        "Sous US GAAP, le traitement des titres de transaction ('trading securities') est identique au traitement IFRS des titres mesurés à :",
        ["leur coût amorti.", "leur juste valeur par le compte de résultat (FVTPL).", "leur juste valeur par les autres éléments du résultat global (FVOCI)."],
        1,
        "Les titres de transaction (trading securities) sous US GAAP sont mesurés à la juste valeur, avec les variations passant par le résultat net — exactement comme les titres classés en juste valeur par le compte de résultat (fair value through profit and loss) sous IFRS. Le coût amorti concerne les titres held-to-maturity et la FVOCI concerne certains titres de dette AFS sous IFRS, pas les titres de transaction.",
      ],
      [
        "Les revenus d'intérêts sont comptabilisés si l'actif sous-jacent est reconnu comme :",
        [
          "un actif de transaction (trading) uniquement.",
          "held-to-maturity, trading, ou available-for-sale.",
          "trading ou available-for-sale uniquement.",
        ],
        1,
        "Les revenus d'intérêts sont comptabilisés au compte de résultat quelle que soit la classification du titre de dette porteur d'intérêts — held-to-maturity, trading, ou available-for-sale. Ce qui diffère selon la classification, c'est le traitement des variations de valeur (résultat net, OCI, ou aucun ajustement), pas la comptabilisation des intérêts eux-mêmes.",
      ],
      [
        "Les passifs non courants sont généralement comptabilisés au bilan à :",
        ["leur prix d'émission.", "leur coût amorti.", "leur juste valeur."],
        1,
        "La grande majorité des passifs non courants (dettes obligataires, emprunts) sont comptabilisés au coût amorti, méthode qui intègre l'amortissement de toute prime ou décote d'émission sur la durée de vie de l'instrument. Le prix d'émission n'est que la valeur initiale, et la juste valeur n'est utilisée que sur option pour certains passifs spécifiques (financial liabilities at fair value option), pas comme traitement par défaut.",
      ],
      [
        "L'amortissement d'une obligation émise avec une prime (bond issued at a premium) se traduit le plus vraisemblablement par :",
        ["une augmentation du résultat net.", "une diminution du résultat net.", "aucun impact sur le résultat net."],
        0,
        "Lorsqu'une obligation est émise avec une prime, la charge d'intérêt effective comptabilisée diminue chaque période à mesure que la prime s'amortit, ce qui réduit la charge d'intérêt totale par rapport au coupon payé et augmente donc le résultat net par rapport à une émission au pair.",
      ],
      [
        "Lequel des passifs financiers suivants est le plus vraisemblablement détenu à la juste valeur ?",
        ["Les dérivés.", "Les obligations.", "Les emprunts bancaires."],
        0,
        "Les instruments dérivés sont systématiquement comptabilisés à la juste valeur, avec variations passant par le résultat net, en raison de leur nature spéculative ou de couverture. Les obligations et emprunts bancaires sont en général comptabilisés au coût amorti, sauf option de juste valeur exercée dans des cas spécifiques.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 2...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
