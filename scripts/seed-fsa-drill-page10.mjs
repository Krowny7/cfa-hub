// Seed script — quiz de "drill" associé à la page 10 de la fiche PDF FSA
// (Financial Analysis Techniques). Structure : 5 concepts × (1 question
// officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Usage: node scripts/seed-fsa-drill-page10.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 10 (Financial Analysis Techniques)",
    difficulty: 2,
    questions: [
      // Concept 1 — Ratio de couverture des intérêts (officielle)
      [
        "Paragon Company's operating profits are $100,000, interest expense is $25,000, and earnings before taxes are $75,000. What is Paragon's interest coverage ratio?",
        ["1 time.", "3 times.", "4 times."],
        2,
        "Ratio de couverture des intérêts = résultat opérationnel (EBIT) / charge d'intérêt = 100 000 $ / 25 000 $ = 4.",
      ],
      // Variante angle différent — reverse-engineering : ratio et intérêt donnés, retrouver l'EBIT
      [
        "A company's interest coverage ratio is 5.0, and its interest expense for the year was $40,000. The company's operating profit (EBIT) for the year was closest to:",
        ["$8,000.", "$45,000.", "$200,000."],
        2,
        "EBIT = ratio de couverture × charge d'intérêt = 5,0 × 40 000 $ = 200 000 $. Il faut ici remonter du ratio vers l'EBIT, l'inverse du calcul habituel.",
      ],
      // Variante plus difficile — dériver l'EBIT depuis un compte de résultat complet, avec un piège (taux d'impôt inutile)
      [
        "A company's income statement shows revenue of $800,000, COGS of $500,000, SG&A of $150,000, and interest expense of $25,000. The company's tax rate is 30%. The interest coverage ratio is closest to:",
        ["4.2.", "6.0.", "8.6."],
        1,
        "EBIT = 800 000 − 500 000 − 150 000 = 150 000 $. Couverture des intérêts = 150 000 $ / 25 000 $ = 6,0. Le taux d'imposition de 30 % est une donnée-piège : il n'intervient jamais dans ce ratio, qui se calcule toujours avant impôt et avant intérêt.",
      ],

      // Concept 2 — Calcul de la rotation des stocks (officielle)
      [
        "During 2007, Brownfield Incorporated purchased $140 million of inventory. For the year just ended, Brownfield reported cost of goods sold of $130 million. Inventory at year-end was $45 million. Calculate inventory turnover for the year.",
        ["2.89.", "3.25.", "3.71."],
        1,
        "Stock initial = coût des ventes + stock final − achats = 130 + 45 − 140 = 35 M$. Stock moyen = (35 + 45)/2 = 40 M$. Rotation = 130 M$ / 40 M$ = 3,25.",
      ],
      // Variante angle différent — reverse-engineering : rotation et stock moyen donnés, retrouver le COGS
      [
        "A company's inventory turnover ratio is 4.5, and its average inventory for the year was $80,000. The company's cost of goods sold for the year was closest to:",
        ["$17,778.", "$360,000.", "$84,500."],
        1,
        "Coût des ventes = rotation × stock moyen = 4,5 × 80 000 $ = 360 000 $. Il faut ici remonter de la rotation vers le coût des ventes, l'inverse du calcul habituel.",
      ],
      // Variante plus difficile — convertir en jours de stock ET comparer à un concurrent
      [
        "A company has an inventory turnover ratio of 5.0 for the year. Assuming a 365-day year, the company's days of inventory on hand (DOH) is closest to how many days more or less than a competitor whose DOH is 60 days?",
        ["13 days more.", "13 days less.", "5 days more."],
        0,
        "DOH = 365 / 5,0 = 73 jours. Comparé au concurrent (60 jours), l'entreprise détient son stock 73 − 60 = 13 jours de plus. Il faut d'abord convertir la rotation en jours avant de pouvoir comparer, une étape supplémentaire par rapport au simple calcul de rotation.",
      ],

      // Concept 3 — Composantes du DuPont en trois parties (officielle)
      [
        "Which of the following ratios is a component of the original (three-part) DuPont equation?",
        ["Debt-to-equity ratio.", "Asset turnover.", "Gross profit margin."],
        1,
        "L'approche DuPont en trois parties est : marge nette × rotation des actifs × ratio de levier (actifs/capitaux propres). Le debt-to-equity et la marge brute n'en font pas partie.",
      ],
      // Variante angle différent — ce qui N'EST PAS une composante (piège plus proche : interest coverage)
      [
        "Which of the following is NOT one of the three components of the original DuPont equation?",
        ["Net profit margin.", "Asset turnover.", "Interest coverage ratio."],
        2,
        "Le ratio de couverture des intérêts n'apparaît dans aucune version du DuPont (ni à trois, ni à cinq parties). Les trois composantes originales sont la marge nette, la rotation des actifs, et le levier financier.",
      ],
      // Variante plus difficile — calculer le levier à partir du bilan puis appliquer l'équation complète
      [
        "A company has a net profit margin of 8%, an asset turnover of 1.5, and total assets of $2,000,000 financed by $800,000 of debt and $1,200,000 of equity. Using the three-part DuPont equation, the company's return on equity (ROE) is closest to:",
        ["12.0%.", "16.7%.", "20.0%."],
        2,
        "Levier financier = actifs totaux / capitaux propres = 2 000 000 $ / 1 200 000 $ ≈ 1,667. ROE = marge nette × rotation des actifs × levier = 0,08 × 1,5 × 1,667 ≈ 20,0 %. Il faut d'abord calculer le levier à partir des données du bilan avant d'appliquer l'équation, contrairement à la question officielle où le levier n'intervient pas.",
      ],

      // Concept 4 — Le fardeau d'intérêt dans le DuPont étendu (officielle)
      [
        "From the extended (5-part) DuPont equation, which of the following components describes the equation EBT / EBIT?",
        ["Tax burden.", "Interest burden.", "Financial leverage."],
        1,
        "EBT / EBIT est le fardeau d'intérêt (interest burden), montrant qu'un levier plus élevé entraîne des charges d'intérêt plus élevées qui peuvent compenser les bénéfices du levier sur le ROE.",
      ],
      // Variante angle différent — une AUTRE composante du DuPont étendu (marge EBIT), pas le fardeau d'intérêt
      [
        "In the extended (5-part) DuPont decomposition of ROE, the ratio of EBIT to revenue represents the:",
        ["tax burden.", "interest burden.", "operating (EBIT) profit margin."],
        2,
        "EBIT / Revenue est la marge opérationnelle (EBIT margin), une composante du DuPont étendu distincte du fardeau d'intérêt (EBT/EBIT) et du fardeau fiscal (NI/EBT).",
      ],
      // Variante plus difficile — calculer DEUX fardeaux à partir d'un compte de résultat complet
      [
        "A company reports revenue of $1,000,000, EBIT of $200,000, EBT of $150,000, and net income of $105,000. The company's tax burden and interest burden, respectively, are closest to:",
        ["0.70 and 0.75.", "0.75 and 0.70.", "0.70 and 0.70."],
        0,
        "Fardeau fiscal = résultat net / EBT = 105 000 $ / 150 000 $ = 0,70. Fardeau d'intérêt = EBT / EBIT = 150 000 $ / 200 000 $ = 0,75. Il faut calculer les deux ratios sans les inverser, une confusion fréquente puisqu'ils se ressemblent.",
      ],

      // Concept 5 — Tendances de marges brute et nette (officielle)
      [
        "Income statements for Royal, Inc. show Sales of $78 million (20X0) and $82 million (20X1); Cost of Goods Sold of $47 million (20X0) and $48 million (20X1); Earnings after Taxes of $7 million (20X0) and $6 million (20X1). With respect to Royal's gross profit margin and net profit margin trends:",
        [
          "both gross profit margin and net profit margin increased in 20X1.",
          "gross profit margin increased in 20X1 but net profit margin decreased.",
          "gross profit margin decreased but net profit margin increased in 20X1.",
        ],
        1,
        "Marge brute : 39,7 % (20X0) → 41,5 % (20X1), en hausse. Marge nette : 9,0 % (20X0) → 7,3 % (20X1), en baisse — les deux tendances divergent.",
      ],
      // Variante angle différent — expliquer la CAUSE d'un tel écart, pas le calculer à partir de chiffres bruts
      [
        "A company's gross profit margin increased while its net profit margin decreased over the same period. Which of the following would most likely explain this combination of trends?",
        [
          "Cost of goods sold grew slower than revenue, while expenses below the gross profit line grew faster than revenue.",
          "Cost of goods sold grew faster than revenue, while all other expenses remained proportional to revenue.",
          "Both cost of goods sold and operating expenses grew slower than revenue.",
        ],
        0,
        "Une marge brute en hausse combinée à une marge nette en baisse signifie que le contrôle des coûts s'est amélioré AU-DESSUS de la ligne brute (COGS), mais s'est détérioré EN DESSOUS (charges d'exploitation, financières, ou exceptionnelles) — cette variante teste la logique explicative plutôt que le simple calcul.",
      ],
      // Variante plus difficile — identifier le point d'inflexion sur TROIS années
      [
        "A company's gross profit margin was 35% in Year 1, 38% in Year 2, and 36% in Year 3. Its net profit margin was 10% in Year 1, 9% in Year 2, and 11% in Year 3. Based on this data, between which two years did the relationship between the gross and net profit margin trends most likely reverse?",
        ["Between Year 1 and Year 2.", "Between Year 2 and Year 3.", "The relationship never reverses across the three years."],
        1,
        "Entre les années 1 et 2, la marge brute monte (35→38 %) pendant que la marge nette baisse (10→9 %) — une divergence. Entre les années 2 et 3, c'est l'inverse : la marge brute baisse (38→36 %) pendant que la marge nette monte (9→11 %). C'est donc entre l'année 2 et l'année 3 que la relation s'inverse — une lecture sur trois périodes, plus exigeante qu'une simple comparaison entre deux années.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 10...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
