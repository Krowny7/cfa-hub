// Seed script — quiz de "drill" associé à la page 5 de la fiche PDF FSA
// (Analysis of Inventories). Structure : 5 concepts × (1 question
// officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page5.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 5 (Analysis of Inventories)",
    difficulty: 2,
    questions: [
      // Concept 1 — FIFO/LIFO et sens de variation des prix (officielle)
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
      // Variante angle différent — le "pourquoi" mécanique, pas la direction de l'inégalité
      [
        "Which of the following best explains why, in a period of decreasing prices, the FIFO inventory method results in a lower gross profit than the LIFO method?",
        [
          "FIFO expenses the most recently purchased, lower-cost units first.",
          "FIFO expenses the earliest purchased, higher-cost units first, while LIFO expenses the most recent, lower-cost units.",
          "FIFO and LIFO always produce an identical gross profit, regardless of the direction prices move.",
        ],
        1,
        "En prix décroissants, les unités les plus ANCIENNES sont les plus CHÈRES. Le FIFO les vend en premier, ce qui gonfle le coût des ventes et réduit la marge brute ; le LIFO vend les unités récentes, moins chères, avec l'effet inverse. Comprendre ce mécanisme, pas seulement le sens de l'inégalité, est l'objectif ici.",
      ],
      // Variante plus difficile — situer le coût moyen pondéré entre FIFO et LIFO
      [
        "A company reports cost of goods sold of $600,000 under FIFO and $550,000 under LIFO for a period of declining prices. If the company had instead used the weighted average cost method, its cost of goods sold most likely would have been:",
        [
          "equal to the FIFO figure of $600,000.",
          "equal to the LIFO figure of $550,000.",
          "between $550,000 and $600,000.",
        ],
        2,
        "Le coût moyen pondéré mélange les coûts de toutes les unités disponibles à la vente : son résultat se situe toujours ENTRE les valeurs obtenues sous FIFO et sous LIFO, jamais à l'une des deux extrémités — que les prix montent ou baissent.",
      ],

      // Concept 2 — Reprise de dépréciation de stock, IFRS vs US GAAP (officielle)
      [
        "Under which financial reporting standards is a firm required to discuss the circumstances when reversing an inventory writedown?",
        ["Neither IFRS nor U.S. GAAP.", "Both IFRS and U.S. GAAP.", "IFRS, but not U.S. GAAP."],
        2,
        "Les reprises de dépréciation de stock sont autorisées sous IFRS mais interdites sous US GAAP. Une entreprise IFRS qui reprend une dépréciation doit en mentionner les circonstances.",
      ],
      // Variante angle différent — la règle elle-même (possible ou pas), pas l'obligation de divulgation
      [
        "A company reporting under U.S. GAAP writes down its inventory to net realizable value. In a later period, the inventory's value recovers. Under U.S. GAAP, the company:",
        ["may reverse the writedown, with disclosure of the circumstances.", "may reverse the writedown, without any disclosure required.", "may not reverse the writedown."],
        2,
        "Contrairement à la question officielle (qui porte sur l'obligation de DIVULGATION sous IFRS), cette variante teste si la reprise elle-même est seulement AUTORISÉE ou non : sous US GAAP, elle est purement et simplement interdite — la question de la divulgation ne se pose donc même pas.",
      ],
      // Variante plus difficile — comparer l'impact chiffré sur deux entreprises (IFRS vs GAAP)
      [
        "Two otherwise identical companies, one reporting under IFRS and one under U.S. GAAP, each wrote down inventory by $500,000 in Year 1 due to a temporary market downturn. In Year 2, both companies' inventory values fully recover, and each reverses the writedown to the extent permitted by its standard. Which of the following best describes the difference in Year 2 gross profit between the two companies, all else equal?",
        [
          "The IFRS company's Year 2 gross profit will be $500,000 higher than the U.S. GAAP company's, due to the permitted reversal.",
          "Both companies will report identical Year 2 gross profit, since the writedowns occurred in Year 1.",
          "The U.S. GAAP company's Year 2 gross profit will be higher, since it cannot reverse the writedown.",
        ],
        0,
        "Seule l'entreprise IFRS peut reprendre la dépréciation : son coût des ventes en Année 2 sera donc plus bas de 500 000 $ (l'inventaire revient à sa valeur d'origine), ce qui se traduit par une marge brute supérieure de 500 000 $ par rapport à l'entreprise US GAAP, qui reste bloquée à la valeur dépréciée.",
      ],

      // Concept 3 — Dépréciation à la NRV + effet sur le quick ratio (officielle)
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
      // Variante angle différent — la règle complète "lower of cost or market" (US GAAP) avec bornes, pas la NRV seule (IFRS)
      [
        "A company reporting under U.S. GAAP determines the following for a class of inventory: cost $500,000; replacement cost $420,000; net realizable value (NRV) $460,000; NRV less a normal profit margin $400,000. Under the lower of cost or market rule, the inventory should be reported at:",
        ["$400,000.", "$420,000.", "$460,000."],
        1,
        "Sous la règle « lower of cost or market » (US GAAP), le « market » retenu est le coût de remplacement, plafonné à la NRV et plancher à NRV moins marge normale. Ici, 420 000 $ se situe déjà entre les deux bornes (400 000 $ et 460 000 $), donc market = 420 000 $. Le coût (500 000 $) excédant ce market, le stock est reporté à 420 000 $ — une règle plus riche que la simple comparaison coût/NRV utilisée sous IFRS.",
      ],
      // Variante plus difficile — calculer l'IMPACT CHIFFRÉ sur le current ratio (pas le quick ratio, piège)
      [
        "A company's inventory has a cost of $2,000,000 and a net realizable value of $1,850,000, requiring a $150,000 writedown. Before the writedown, current assets were $5,000,000 (including the $2,000,000 of inventory) and current liabilities were $2,500,000. After the writedown, the company's current ratio is closest to:",
        ["1.94.", "2.00.", "2.06."],
        0,
        "Nouveaux actifs courants = 5 000 000 − 150 000 = 4 850 000 $. Current ratio = 4 850 000 $ / 2 500 000 $ = 1,94. Piège classique : contrairement au quick ratio (qui exclut le stock et n'est jamais affecté), le CURRENT ratio INCLUT le stock et diminue bien après une dépréciation.",
      ],

      // Concept 4 — Effet d'une dépréciation de stock sur le ROA (officielle)
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
      // Variante angle différent — comparer PLUSIEURS ratios face au même événement (pas seulement le ROA)
      [
        "Following an inventory writedown in the current period, which of the following ratios would most likely INCREASE in the current period, holding all else equal?",
        ["Return on assets (ROA).", "Total asset turnover (revenue / average total assets).", "Gross profit margin."],
        1,
        "La rotation des actifs augmente dans la période courante car les actifs totaux diminuent (dépréciation) alors que le chiffre d'affaires n'est pas affecté. Le ROA, lui, diminue dans l'immédiat car le résultat net baisse aussi. La marge brute diminue également, la dépréciation passant généralement par le coût des ventes.",
      ],
      // Variante plus difficile — effet PERMANENT sur plusieurs années, pas seulement "période suivante"
      [
        "A firm writes down inventory by $200,000 in Year 1 — a one-time event with no effect on future purchasing or pricing decisions. In Year 2, all of the written-down inventory is sold. Assuming no other changes, how would Year 2's ROA compare to what it would have been had the writedown never occurred?",
        [
          "Higher, because Year 2 assets are permanently lower from the writedown while COGS on that inventory is also permanently lower, boosting Year 2 net income relative to a smaller asset base.",
          "Lower, because the writedown permanently damaged the company's future earning power.",
          "Unaffected, since the writedown was a one-time, non-recurring event fully resolved in Year 1.",
        ],
        0,
        "L'effet de la dépréciation ne s'arrête pas à l'année suivante : le stock déprécié garde un coût comptable plus faible pour toujours (sauf nouvelle dépréciation), ce qui réduit durablement le coût des ventes futur et augmente le résultat net futur, combiné à une base d'actifs plus faible — un double effet positif sur le ROA qui perdure au-delà d'une seule période.",
      ],

      // Concept 5 — Signaux de croissance de la demande dans les stocks (officielle)
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
      // Variante angle différent — le signal INVERSE (faiblesse de la demande), pas la croissance
      [
        "An analyst observes that a manufacturing company's finished goods inventory has grown faster than its sales over the past two years, while raw materials inventory has declined. This pattern would most likely suggest:",
        ["anticipated strong future demand growth.", "potential weakening demand for the company's products.", "an increase in the company's raw material costs."],
        1,
        "Des produits finis qui s'accumulent plus vite que les ventes, combinés à une baisse des matières premières (signe que la production ralentit), suggèrent que la demande faiblit — l'entreprise vend moins vite qu'elle ne produit, le signal opposé de la question officielle.",
      ],
      // Variante plus difficile — synthétiser le signal des stocks avec un signal contradictoire venu des créances
      [
        "A toy manufacturer reports the following year-over-year changes: raw materials inventory +15%, work-in-process inventory +18%, finished goods inventory −5%, and sales +3%. Separately, the company's days sales outstanding (DSO) has increased from 35 to 55 days over the same period. How should an analyst most appropriately reconcile these two sets of signals?",
        [
          "Both signals point unambiguously to strong, healthy demand growth ahead.",
          "The inventory pattern suggests anticipated demand growth, but the sharp rise in DSO raises a separate concern about the quality of that growth.",
          "The two signals directly contradict each other, so the analyst should disregard the DSO increase entirely.",
        ],
        1,
        "Le signal des stocks (matières premières et en-cours en forte hausse, produits finis en baisse) suggère une préparation à une demande future plus forte. Mais la forte hausse du DSO (clients qui paient plus lentement) est un signal distinct et préoccupant, potentiellement révélateur de « channel stuffing » ou de clients en difficulté — les deux signaux doivent être combinés, pas opposés l'un à l'autre.",
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
