// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF FSA
// (Analysis of Inventories). Structure Fixed Income : 5 concepts × 3
// variantes (questions en anglais ; explications en français). Concept 1
// = question officielle du PDF imprimé (qcm_data/fsa_raw.txt) ; variantes
// 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page5.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 5 (Analysis of Inventories)",
    difficulty: 2,
    questions: [
      // Concept 1 — FIFO/LIFO et sens de variation des prix
      [
        "In a decreasing price environment, the first-in first-out (FIFO) inventory cost method results in:",
        [
          "lower cost of goods sold compared to last-in first-out.",
          "higher inventory compared to last-in first-out.",
          "lower gross profit compared to last-in first-out.",
        ],
        2,
        "Si les prix baissent, le FIFO vend en premier les unités les plus anciennes et les plus coûteuses. Cela produit un coût des ventes plus élevé, un stock plus faible, et une marge brute plus faible comparé au LIFO.",
      ],
      [
        "In a period of rising prices, the first-in first-out (FIFO) inventory method, compared to last-in first-out (LIFO), most likely results in:",
        [
          "lower cost of goods sold and higher gross profit.",
          "higher cost of goods sold and lower gross profit.",
          "identical cost of goods sold and gross profit.",
        ],
        0,
        "En prix croissants, le FIFO vend en premier les unités les plus anciennes et les moins chères, ce qui donne un coût des ventes plus faible et une marge brute plus élevée comparé au LIFO, qui vend les unités les plus récentes et les plus chères.",
      ],
      [
        "Compared to the FIFO method, the LIFO method in a period of falling prices will most likely result in:",
        [
          "lower cost of goods sold and higher gross profit.",
          "higher cost of goods sold and lower gross profit.",
          "an identical gross profit.",
        ],
        0,
        "En prix décroissants, le LIFO vend en premier les unités les plus récentes, donc les moins chères, ce qui donne un coût des ventes plus faible et une marge brute plus élevée comparé au FIFO (qui utilise les coûts anciens, plus élevés).",
      ],
      // Concept 2 — Reprise de dépréciation de stock (IFRS vs US GAAP)
      [
        "Under which financial reporting standards is a firm required to discuss the circumstances when reversing an inventory writedown?",
        ["Neither IFRS nor U.S. GAAP.", "Both IFRS and U.S. GAAP.", "IFRS, but not U.S. GAAP."],
        2,
        "Les reprises de dépréciation de stock sont autorisées sous IFRS mais interdites sous US GAAP. Une entreprise IFRS qui reprend une dépréciation doit en mentionner les circonstances.",
      ],
      [
        "Which of the following is most accurate regarding the reversal of an inventory writedown?",
        [
          "Permitted under both IFRS and U.S. GAAP, with required disclosure of the circumstances.",
          "Permitted under IFRS only, with required disclosure of the circumstances.",
          "Not permitted under either IFRS or U.S. GAAP.",
        ],
        1,
        "Seules les IFRS autorisent la reprise d'une dépréciation de stock (plafonnée au montant de la dépréciation d'origine), avec obligation d'en expliquer les circonstances. Les US GAAP l'interdisent purement et simplement.",
      ],
      [
        "A company reporting under U.S. GAAP writes down its inventory to net realizable value. In a later period, the inventory's value recovers. Under U.S. GAAP, the company:",
        [
          "may reverse the writedown, with disclosure of the circumstances.",
          "may reverse the writedown, without any disclosure required.",
          "may not reverse the writedown.",
        ],
        2,
        "Sous US GAAP, une dépréciation de stock ne peut jamais être reprise, même si la valeur du stock remonte par la suite — le nouveau coût déprécié devient la nouvelle base de coût.",
      ],
      // Concept 3 — Dépréciation de stock à la NRV + effet sur le quick ratio
      [
        "Information related to Bledsoe Corporation's inventory, as of December 31, 20x7: Estimated selling price $3,500,000; Estimated disposal costs $50,000; Estimated completion costs $300,000; Original FIFO cost $3,200,000; Replacement cost $3,300,000. Using the appropriate valuation method, what adjustment is necessary to accurately report Bledsoe's inventory at the end of 20x7, and will this adjustment affect Bledsoe's quick ratio?",
        [
          "$100,000 write-up; No effect on quick ratio.",
          "$50,000 write-down; No effect on quick ratio.",
          "$50,000 write-down; Yes, affects quick ratio.",
        ],
        1,
        "NRV = 3 500 000 $ − 300 000 $ − 50 000 $ = 3 150 000 $. Le coût d'origine (3 200 000 $) excédant la NRV, une dépréciation de 50 000 $ est nécessaire. Le stock étant exclu du quick ratio, cette dépréciation n'a aucun effet dessus.",
      ],
      [
        "A company's inventory has an estimated selling price of $5,000,000, estimated disposal costs of $100,000, estimated completion costs of $400,000, and an original cost of $4,600,000. Under the lower of cost or net realizable value method, what adjustment is necessary, and will it affect the company's quick ratio?",
        [
          "$100,000 write-down; no effect on quick ratio.",
          "$150,000 write-down; affects the quick ratio.",
          "$50,000 write-up; no effect on quick ratio.",
        ],
        0,
        "NRV = 5 000 000 $ − 400 000 $ − 100 000 $ = 4 500 000 $. Le coût d'origine (4 600 000 $) excède la NRV : dépréciation de 100 000 $ nécessaire. Comme toujours, le stock étant exclu du numérateur et du dénominateur du quick ratio, la dépréciation ne l'affecte pas.",
      ],
      [
        "A company's inventory has an estimated selling price of $2,000,000, estimated disposal costs of $30,000, estimated completion costs of $120,000, and an original cost of $1,900,000. Under the lower of cost or net realizable value method, what adjustment is necessary, and will it affect the company's quick ratio?",
        [
          "$50,000 write-down; no effect on quick ratio.",
          "$50,000 write-up; no effect on quick ratio.",
          "$50,000 write-down; affects the quick ratio.",
        ],
        0,
        "NRV = 2 000 000 $ − 120 000 $ − 30 000 $ = 1 850 000 $. Le coût d'origine (1 900 000 $) excède la NRV : dépréciation de 50 000 $. Aucun effet sur le quick ratio, le stock n'entrant jamais dans son calcul.",
      ],
      // Concept 4 — Effet d'une dépréciation de stock sur le ROA
      [
        "The effect of an inventory writedown on a firm's return on assets (ROA) is most accurately described as:",
        [
          "higher ROA in the current period and lower ROA in later periods.",
          "lower ROA in the current period and higher ROA in later periods.",
          "lower ROA in the current period and no effect on ROA in later periods.",
        ],
        1,
        "La dépréciation réduit le résultat net et les actifs dans la période courante, ce qui diminue le ROA. Dans les périodes futures, le stock déprécié réduit le coût des ventes et augmente le résultat net, ce qui, combiné à des actifs plus faibles, augmente le ROA.",
      ],
      [
        "A firm writes down its inventory to net realizable value in the current period. All else equal, this writedown will most likely:",
        [
          "increase ROA in the current period and decrease it in future periods.",
          "decrease ROA in the current period and increase it in future periods.",
          "have no effect on ROA in either the current or future periods.",
        ],
        1,
        "Même logique : la dépréciation pénalise le ROA dans l'immédiat (résultat net et actifs en baisse), puis l'améliore ensuite grâce à un coût des ventes futur plus faible.",
      ],
      [
        "Following an inventory writedown, a firm's return on assets (ROA) in the period immediately after the writedown, compared to what it would have been without the writedown, will most likely be:",
        [
          "higher, because future cost of goods sold is lower.",
          "lower, because future cost of goods sold is higher.",
          "unaffected, since the writedown is a one-time, non-recurring event.",
        ],
        0,
        "Une fois le stock déprécié, son coût comptable plus faible réduit le coût des ventes futur, ce qui augmente le résultat net (et donc le ROA) des périodes suivantes par rapport à un scénario sans dépréciation.",
      ],
      // Concept 5 — Signaux de croissance de la demande dans les stocks
      [
        "Tim Rogers is senior equity analyst with White Capital LLP. While analyzing the inventory disclosures of Drako Toys Inc., a toy manufacturer, Rogers concludes that Drako is expected to see above-average sales growth over the next three years. Which of the following disclosures would most likely support Rogers's conclusion?",
        [
          "Finished goods inventory growing faster than sales in the last two years.",
          "Increase in raw-materials and work-in-progress inventory and corresponding decline in finished goods inventory over the last two years.",
          "Increase in finished goods inventory and corresponding decline in raw-materials and work-in-progress inventory over the last two years.",
        ],
        1,
        "Une hausse des matières premières et des en-cours indique probablement une demande future anticipée à la hausse. À l'inverse, une hausse des produits finis avec une baisse des matières premières/en-cours peut signaler une baisse de la demande.",
      ],
      [
        "An analyst observes that a manufacturing company's finished goods inventory has grown faster than its sales over the past two years, while raw materials inventory has declined. This pattern would most likely suggest:",
        [
          "anticipated strong future demand growth.",
          "potential weakening demand for the company's products.",
          "an increase in the company's raw material costs.",
        ],
        1,
        "Des produits finis qui s'accumulent plus vite que les ventes, combinés à une baisse des matières premières (signe que la production ralentit), suggèrent que la demande faiblit — l'entreprise vend moins vite qu'elle ne produit.",
      ],
      [
        "Which of the following inventory disclosure patterns would most likely support an analyst's expectation of above-average future sales growth for a manufacturing company?",
        [
          "A decline in raw materials and work-in-process inventory, accompanied by growth in finished goods inventory.",
          "Growth in raw materials and work-in-process inventory, accompanied by a decline in finished goods inventory.",
          "Proportional growth across all inventory categories, in line with sales growth.",
        ],
        1,
        "Une hausse des matières premières et en-cours, combinée à une baisse des produits finis (qui se vendent vite), est le signal classique d'une entreprise qui se prépare à une demande future plus forte.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 5...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
