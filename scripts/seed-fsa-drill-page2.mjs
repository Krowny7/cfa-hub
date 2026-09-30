// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF FSA
// (Analyzing Balance Sheets). Structure : 5 concepts × (1 question
// officielle + 1 variante "angle différent" + 1 variante "plus difficile").
// Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Usage: node scripts/seed-fsa-drill-page2.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 2 (Analyzing Balance Sheets)",
    difficulty: 2,
    questions: [
      // Concept 1 — Quick ratio (officielle)
      [
        "An analyst has gathered the following information about a company: Cash 100, Accounts Receivable 750, Marketable Securities 300, Inventory 850; Accounts Payable 300, Short-Term Debt 130. What is the quick ratio?",
        ["0.62.", "1.53.", "2.67."],
        2,
        "Quick ratio = (Trésorerie + Créances clients + Titres négociables) / (Dettes fournisseurs + Dette court terme) = (100 + 750 + 300) / (300 + 130) = 1 150 / 430 = 2,67. Les stocks sont exclus du numérateur.",
      ],
      // Variante angle différent — back-solve à partir des ratios
      [
        "A company's quick ratio is 1.80 and its current ratio is 2.50. Its only current asset besides cash, marketable securities, and receivables is inventory, and its current liabilities are $200,000. The company's inventory is closest to:",
        ["$70,000.", "$140,000.", "$200,000."],
        1,
        "Actifs rapides = 1,80 × 200 000 $ = 360 000 $. Actifs courants totaux = 2,50 × 200 000 $ = 500 000 $. Stock = actifs courants totaux − actifs rapides = 500 000 $ − 360 000 $ = 140 000 $. Il faut ici remonter des ratios vers une donnée du bilan, pas l'inverse.",
      ],
      // Variante plus difficile — mécanique du ratio quand il est < 1
      [
        "A company's quick ratio is currently 0.70. Management is considering two options to improve it before year-end: (1) use cash to pay down $50,000 of accounts payable, or (2) collect $50,000 of accounts receivable in cash. Which option would increase the quick ratio more, and why?",
        [
          "Option 1, because reducing both quick assets and current liabilities by an equal amount, when the ratio starts below 1.0, raises the ratio.",
          "Option 2, because converting receivables to cash increases quick assets without affecting current liabilities.",
          "Both options would have an identical effect on the quick ratio.",
        ],
        0,
        "Payer les dettes fournisseurs réduit à la fois les actifs rapides (trésorerie) et les passifs courants du même montant : quand le ratio de départ est inférieur à 1, soustraire une même quantité au numérateur et au dénominateur AUGMENTE la fraction. Encaisser des créances ne fait que transformer un actif rapide (créances) en un autre (trésorerie) : aucun effet sur le ratio, puisque le numérateur total des actifs rapides est inchangé.",
      ],

      // Concept 2 — Held-to-maturity au coût amorti (officielle)
      [
        "Under U.S. GAAP, the balance sheet value of a debt security classified as held-to-maturity is its:",
        ["historical cost.", "amortized cost.", "fair value."],
        1,
        "Sous US GAAP, les titres held-to-maturity sont comptabilisés au coût amorti, ni à leur coût historique brut, ni à leur juste valeur — contrairement aux titres trading ou available-for-sale.",
      ],
      // Variante angle différent — évaluer une affirmation sur le "lissage" du résultat
      [
        "A portfolio manager argues that classifying a bond as held-to-maturity is preferable to trading classification because it \"smooths\" reported net income. Which of the following best evaluates this argument?",
        [
          "The argument is correct: HTM securities are never marked to fair value, so unrealized value changes never affect net income.",
          "The argument is incorrect: HTM securities are marked to fair value through OCI, which still creates volatility in equity.",
          "The argument is correct, and HTM classification also eliminates all market and credit risk on the bond.",
        ],
        0,
        "Un titre HTM n'est jamais réévalué à la juste valeur, ni en résultat net ni en OCI — il reste au coût amorti jusqu'à l'échéance. L'argument est donc correct sur ce point précis, mais il est important de noter que le risque de marché et de crédit sur l'obligation elle-même subsiste malgré ce traitement comptable — seule sa PRÉSENTATION est lissée, pas le risque réel.",
      ],
      // Variante plus difficile — amortissement d'une décote + comparaison intérêts comptables vs cash
      [
        "A company purchases a bond at a discount to par and classifies it as held-to-maturity. Over the life of the bond, which of the following best describes what will happen to the bond's carrying value, and how interest income will compare to cash interest received?",
        [
          "Carrying value will decrease toward par; interest income will be less than cash interest received.",
          "Carrying value will increase toward par; interest income will exceed cash interest received.",
          "Carrying value will remain constant at the discounted purchase price; interest income will equal cash interest received.",
        ],
        1,
        "Un titre HTM acheté en décote voit sa valeur comptable remonter progressivement vers le pair au fil de l'amortissement de la décote (méthode du taux d'intérêt effectif). Cet amortissement s'ajoute aux intérêts en espèces reçus pour former le produit d'intérêt comptabilisé, qui est donc supérieur aux intérêts cash encaissés — l'inverse de ce qui se passerait pour une obligation achetée avec une prime.",
      ],

      // Concept 3 — Calcul du goodwill comptable (officielle, déjà une application)
      [
        "Halsey Corp. acquires Baines Inc. for $50 million. The fair value of Baines's identifiable net assets is $38 million. The balance sheet goodwill Halsey will recognize from this acquisition is closest to:",
        ["$12 million.", "$38 million.", "$50 million."],
        0,
        "Goodwill = prix d'achat − juste valeur des actifs nets identifiables = 50 M$ − 38 M$ = 12 M$.",
      ],
      // Variante angle différent — tester la définition/le "pourquoi", pas un calcul
      [
        "Balance sheet goodwill is most accurately described as the:",
        [
          "amount by which the purchase price of an acquired firm exceeds its identifiable net assets.",
          "intangible value a firm creates internally in excess of its identifiable net assets.",
          "value derived purely from the expected future performance of a firm.",
        ],
        0,
        "Le goodwill comptable est défini par l'écart entre le prix d'acquisition et la juste valeur des actifs nets identifiables acquis. Le goodwill généré en interne n'est jamais comptabilisé (option B), et la valeur issue de la performance future attendue s'appelle le goodwill économique, un concept distinct du goodwill comptable (option C).",
      ],
      // Variante plus difficile — multi-étapes avec piège des frais de transaction
      [
        "Vantage Inc. pays $90 million to acquire Larkspur Co. At the acquisition date, Larkspur's identifiable assets have a fair value of $80 million and its identifiable liabilities have a fair value of $28 million. Vantage also pays $2 million in cash for legal and advisory fees directly related to the acquisition. Under the acquisition method, the goodwill Vantage will recognize on its consolidated balance sheet is closest to:",
        ["$38 million.", "$40 million.", "$42 million."],
        0,
        "Actifs nets identifiables à la juste valeur = 80 M$ − 28 M$ = 52 M$. Goodwill = prix d'achat − actifs nets identifiables = 90 M$ − 52 M$ = 38 M$. Les frais de transaction (2 M$) sont toujours passés en charges de la période sous la méthode de l'acquisition — ils ne sont JAMAIS inclus dans le calcul du goodwill, contrairement à ce que suggère l'option B (90+2−52=40).",
      ],

      // Concept 4 — Effet d'une obligation AFS sur le résultat net (officielle)
      [
        "James Alexander, Inc., paid par of $220,000 for 5% coupon bonds in Charles Michael, Inc. By the end of the accounting period, the fair value of the bonds was $212,000. The firm plans to hold these bonds for a few years but sell them before maturity. What will be the most likely impact on net income at the end of the first year?",
        ["Net income will be unaffected.", "Net income will decrease.", "Net income will increase."],
        2,
        "Ces obligations sont classées available-for-sale : la perte latente de 8 000 $ passe par les autres éléments du résultat global (OCI), pas par le résultat net, tandis que les revenus d'intérêts perçus augmentent bien le résultat net.",
      ],
      // Variante angle différent — prime AFS, comparaison intérêt comptable vs cash (pas OCI)
      [
        "A company holds an available-for-sale bond that it purchased at a premium to par. Over the holding period, how will the bond's interest income recognized in net income most likely compare to the cash interest received?",
        [
          "Interest income will be less than cash interest received, as the premium is amortized against it.",
          "Interest income will exceed cash interest received.",
          "Interest income will equal cash interest received; AFS securities do not amortize premiums or discounts.",
        ],
        0,
        "Même pour un titre AFS, la prime d'achat est amortie sur la durée de vie du titre via la méthode du taux d'intérêt effectif, ce qui réduit le produit d'intérêt comptabilisé en dessous du coupon cash encaissé — ce mécanisme est indépendant de la classification AFS/HTM/trading, contrairement au traitement des variations de juste valeur.",
      ],
      // Variante plus difficile — recyclage de l'OCI au moment de la vente
      [
        "A company purchases an AFS bond for $100,000 at the start of Year 1. By the end of Year 1, its fair value has risen to $108,000 (recognized in OCI), and the company earned $5,000 of interest income during the year. On the first day of Year 2, the company sells the bond for its Year 1 year-end fair value of $108,000. Which of the following best describes the effect on net income across the two years?",
        [
          "Net income shows only the $5,000 interest income; the $8,000 gain never affects net income, only OCI.",
          "Net income shows the $5,000 interest income in Year 1, and the $8,000 gain is reclassified from OCI into net income in Year 2, upon sale.",
          "The $8,000 gain is recognized twice: once in OCI in Year 1, and again in net income in Year 2.",
        ],
        1,
        "Le gain latent constaté en OCI n'est pas perdu à la vente : il est « recyclé », c'est-à-dire reclassé d'OCI vers le résultat net au moment où le titre est effectivement cédé. Ce n'est donc ni un double comptage (les autres éléments du résultat global se réduisent d'autant), ni un gain qui reste indéfiniment hors résultat net.",
      ],

      // Concept 5 — Actif incorporel identifiable (officielle)
      [
        "Which of the following is classified as an identifiable intangible asset?",
        ["Goodwill.", "A security investment.", "A trademark."],
        2,
        "Les actifs incorporels identifiables sont des actifs non monétaires sans substance physique pouvant être acquis séparément, comme une marque déposée. Le goodwill n'est jamais identifiable, et un placement en titres est un actif financier, pas incorporel.",
      ],
      // Variante angle différent — le "pourquoi" de la distinction identifiable/non-identifiable
      [
        "Which of the following best explains why goodwill is classified as an unidentifiable intangible asset, while a customer list acquired in a business combination is classified as identifiable?",
        [
          "Goodwill has an indefinite useful life, while a customer list has a finite useful life.",
          "A customer list can be separated from the business and sold, licensed, or transferred individually, while goodwill cannot.",
          "Goodwill is generally larger in value than a customer list.",
        ],
        1,
        "Le critère de séparabilité (ou d'origine contractuelle/légale) est ce qui distingue un incorporel identifiable : une liste de clients peut être vendue ou cédée isolément, alors que le goodwill ne peut jamais être séparé de l'entreprise dans son ensemble — c'est ce critère, pas la durée de vie ni la taille, qui détermine la classification.",
      ],
      // Variante plus difficile — appliquer le critère à plusieurs exemples simultanément
      [
        "In a business combination, the acquirer identifies the following items as part of the purchase price allocation: an assembled workforce with specialized skills (not protected by any contract), a five-year non-compete agreement signed by the target's former CEO, and favorable terms on an acquired operating lease with three years remaining. Which of these items would most likely be recognized as identifiable intangible assets, separate from goodwill?",
        [
          "All three items.",
          "Only the non-compete agreement and the favorable lease terms.",
          "Only the assembled workforce.",
        ],
        1,
        "Le non-compete agreement et les conditions avantageuses du bail reposent sur des droits contractuels ou légaux : ils sont identifiables séparément. Le personnel en place (assembled workforce), en l'absence de protection contractuelle, ne satisfait ni le critère de séparabilité ni le critère contractuel/légal — il est absorbé dans le goodwill, un piège classique.",
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
