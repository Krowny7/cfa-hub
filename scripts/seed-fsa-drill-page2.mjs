// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF FSA
// (Analyzing Balance Sheets). Même structure que Fixed Income : 5 concepts
// × 3 variantes (questions en anglais ; explications en français). Le
// concept 1 de chaque groupe est la question officielle du PDF imprimé
// (source : qcm_data/fsa_raw.txt) ; les variantes 2 et 3 testent le même
// concept avec des chiffres/scénarios différents.
// Usage: node scripts/seed-fsa-drill-page2.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 2 (Analyzing Balance Sheets)",
    difficulty: 2,
    questions: [
      // Concept 1 — Calcul du quick ratio
      [
        "An analyst has gathered the following information about a company: Cash 100, Accounts Receivable 750, Marketable Securities 300, Inventory 850; Accounts Payable 300, Short-Term Debt 130. What is the quick ratio?",
        ["0.62.", "1.53.", "2.67."],
        2,
        "Quick ratio = (Trésorerie + Créances clients + Titres négociables) / (Dettes fournisseurs + Dette court terme) = (100 + 750 + 300) / (300 + 130) = 1 150 / 430 = 2,67. Les stocks sont exclus du numérateur.",
      ],
      [
        "A company reports: Cash 200, Accounts Receivable 500, Marketable Securities 100, Inventory 600; Accounts Payable 250, Short-Term Debt 150. The quick ratio is closest to:",
        ["1.50.", "2.00.", "3.00."],
        1,
        "Quick ratio = (200 + 500 + 100) / (250 + 150) = 800 / 400 = 2,00. Le stock (600) n'entre pas dans le calcul, contrairement au current ratio.",
      ],
      [
        "A company reports: Cash 50, Accounts Receivable 300, Marketable Securities 150, Inventory 400; Accounts Payable 200, Short-Term Debt 100. The quick ratio is closest to:",
        ["1.33.", "1.67.", "2.33."],
        1,
        "Quick ratio = (50 + 300 + 150) / (200 + 100) = 500 / 300 = 1,67.",
      ],
      // Concept 2 — Titres held-to-maturity : coût amorti
      [
        "Under U.S. GAAP, the balance sheet value of a debt security classified as held-to-maturity is its:",
        ["historical cost.", "amortized cost.", "fair value."],
        1,
        "Sous US GAAP, les titres held-to-maturity sont comptabilisés au coût amorti, ni à leur coût historique brut, ni à leur juste valeur — contrairement aux titres trading ou available-for-sale.",
      ],
      [
        "A company purchases a bond and classifies it as held-to-maturity under U.S. GAAP. Subsequent changes in the bond's fair value will most likely:",
        [
          "be recognized in net income.",
          "be recognized in other comprehensive income.",
          "not be recognized in the financial statements.",
        ],
        2,
        "Un titre held-to-maturity n'est jamais réévalué à la juste valeur : il reste au coût amorti jusqu'à l'échéance, donc les variations de juste valeur ne sont comptabilisées nulle part (ni en résultat, ni en OCI).",
      ],
      [
        "Which of the following statements about a held-to-maturity debt security is most accurate?",
        [
          "It is reported at fair value, with gains and losses recognized through profit or loss.",
          "It is reported at fair value, with gains and losses recognized through other comprehensive income.",
          "It is reported at amortized cost, with no fair value adjustment on the balance sheet.",
        ],
        2,
        "Seule l'option C décrit correctement le traitement held-to-maturity : coût amorti, sans aucun ajustement de juste valeur au bilan. Les options A et B décrivent respectivement les titres trading et available-for-sale.",
      ],
      // Concept 3 — Calcul du goodwill comptable
      [
        "Balance sheet goodwill is most accurately described as the:",
        [
          "amount by which the purchase price of an acquired firm exceeds its identifiable net assets.",
          "intangible value a firm creates in excess of its identifiable net assets.",
          "value derived from the expected future performance of a firm.",
        ],
        0,
        "Le goodwill comptable correspond au montant par lequel le prix d'acquisition excède la juste valeur des actifs nets identifiables acquis. Le goodwill généré en interne n'est jamais comptabilisé, et la valeur de performance future s'appelle le goodwill économique, un concept distinct.",
      ],
      [
        "Halsey Corp. acquires Baines Inc. for $50 million. The fair value of Baines's identifiable net assets at the acquisition date is $38 million. The goodwill Halsey will recognize on its consolidated balance sheet is closest to:",
        ["$12 million.", "$38 million.", "$50 million."],
        0,
        "Goodwill = prix d'achat − juste valeur des actifs nets identifiables = 50 M$ − 38 M$ = 12 M$.",
      ],
      [
        "Rexon Inc. pays $120 million to acquire Talix Co., whose identifiable net assets have a fair value of $95 million at the acquisition date. The goodwill recognized on Rexon's consolidated balance sheet is closest to:",
        ["$95 million.", "$25 million.", "$120 million."],
        1,
        "Goodwill = 120 M$ − 95 M$ = 25 M$.",
      ],
      // Concept 4 — Effet d'une obligation AFS sur le résultat net
      [
        "James Alexander, Inc., paid par of $220,000 for 5% coupon bonds in Charles Michael, Inc. By the end of the accounting period, the fair value of the bonds was $212,000. The firm plans to hold these bonds for a few years but sell them before maturity. What will be the most likely impact on net income at the end of the first year?",
        ["Net income will be unaffected.", "Net income will decrease.", "Net income will increase."],
        2,
        "Ces obligations sont classées available-for-sale : la perte latente de 8 000 $ passe par les autres éléments du résultat global (OCI), pas par le résultat net, tandis que les revenus d'intérêts perçus augmentent bien le résultat net.",
      ],
      [
        "A firm purchases bonds at par for $150,000 and classifies them as available-for-sale. By year-end, the bonds' fair value has fallen to $145,000, but the firm continues to earn and record interest income on the bonds. What is the most likely impact on the firm's net income for the year?",
        [
          "Net income decreases, reflecting the unrealized loss on the bonds.",
          "Net income increases due to the interest income, while the unrealized loss bypasses net income.",
          "Net income is unaffected by either the interest income or the fair value change.",
        ],
        1,
        "Même logique : pour un titre AFS, les intérêts perçus passent par le résultat net, tandis que la variation de juste valeur (ici une perte latente de 5 000 $) est logée dans les autres éléments du résultat global, sans affecter le résultat net.",
      ],
      [
        "A company classifies a bond investment as available-for-sale. During the year, the bond's fair value rises above its purchase price, and the company also earns interest income on the bond. Which of the following is most accurate regarding the effects on net income and other comprehensive income (OCI)?",
        [
          "Both the interest income and the unrealized gain increase net income.",
          "The interest income increases net income; the unrealized gain is recognized in OCI.",
          "The interest income is recognized in OCI; the unrealized gain increases net income.",
        ],
        1,
        "Le traitement AFS est symétrique, que la variation de juste valeur soit une perte ou un gain latent : les intérêts vont toujours en résultat net, la variation de juste valeur va toujours en OCI (jamais l'inverse).",
      ],
      // Concept 5 — Actif incorporel identifiable
      [
        "Which of the following is classified as an identifiable intangible asset?",
        ["Goodwill.", "A security investment.", "A trademark."],
        2,
        "Les actifs incorporels identifiables sont des actifs non monétaires sans substance physique pouvant être acquis séparément, comme une marque déposée. Le goodwill n'est jamais identifiable, et un placement en titres est un actif financier, pas incorporel.",
      ],
      [
        "Which of the following is most likely classified as an identifiable intangible asset?",
        [
          "Goodwill arising from a business combination.",
          "A patent acquired from another firm.",
          "A long-term equity investment in another company.",
        ],
        1,
        "Un brevet acheté à une autre entreprise est un actif incorporel identifiable (séparable, protégé légalement). Le goodwill n'est par définition jamais identifiable, et un placement en titres de participation est un actif financier.",
      ],
      [
        "An analyst is reviewing a company's balance sheet and wants to identify its identifiable intangible assets. Which of the following would most likely qualify?",
        [
          "Internally generated goodwill.",
          "A customer list acquired as part of a business acquisition.",
          "Cash and cash equivalents.",
        ],
        1,
        "Une liste de clients acquise lors d'une acquisition d'entreprise est un actif incorporel identifiable reconnaissable séparément. Le goodwill généré en interne n'est jamais comptabilisé, et la trésorerie n'est bien sûr pas un actif incorporel.",
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
