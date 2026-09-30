// Seed script — quiz de "drill" associé à la page 10 de la fiche PDF FSA
// (Financial Analysis Techniques). Structure Fixed Income : 5 concepts ×
// 3 variantes (questions en anglais ; explications en français). Concept
// 1 = question officielle du PDF imprimé (qcm_data/fsa_raw.txt) ;
// variantes 2-3 testent le même concept différemment.
// Usage: node scripts/seed-fsa-drill-page10.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";

const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 10 (Financial Analysis Techniques)",
    difficulty: 2,
    questions: [
      // Concept 1 — Ratio de couverture des intérêts
      [
        "Paragon Company's operating profits are $100,000, interest expense is $25,000, and earnings before taxes are $75,000. What is Paragon's interest coverage ratio?",
        ["1 time.", "3 times.", "4 times."],
        2,
        "Ratio de couverture des intérêts = résultat opérationnel (EBIT) / charge d'intérêt = 100 000 $ / 25 000 $ = 4.",
      ],
      [
        "A company's operating profit is $150,000 and its interest expense is $30,000. The interest coverage ratio is closest to:",
        ["4 times.", "5 times.", "6 times."],
        1,
        "Ratio de couverture des intérêts = 150 000 $ / 30 000 $ = 5.",
      ],
      [
        "A company's operating profit is $120,000 and its interest expense is $40,000. The interest coverage ratio is closest to:",
        ["2 times.", "3 times.", "4 times."],
        1,
        "Ratio de couverture des intérêts = 120 000 $ / 40 000 $ = 3.",
      ],
      // Concept 2 — Calcul de la rotation des stocks
      [
        "During 2007, Brownfield Incorporated purchased $140 million of inventory. For the year just ended, Brownfield reported cost of goods sold of $130 million. Inventory at year-end was $45 million. Calculate inventory turnover for the year.",
        ["2.89.", "3.25.", "3.71."],
        1,
        "Stock initial = coût des ventes + stock final − achats = 130 + 45 − 140 = 35 M$. Stock moyen = (35 + 45)/2 = 40 M$. Rotation = 130 M$ / 40 M$ = 3,25.",
      ],
      [
        "A company purchased $200 million of inventory during the year and reported cost of goods sold of $180 million. Inventory at year-end was $60 million. Inventory turnover for the year is closest to:",
        ["3.00.", "3.60.", "4.50."],
        1,
        "Stock initial = 180 + 60 − 200 = 40 M$. Stock moyen = (40 + 60)/2 = 50 M$. Rotation = 180 M$ / 50 M$ = 3,60.",
      ],
      [
        "A company purchased $90 million of inventory during the year and reported cost of goods sold of $85 million. Inventory at year-end was $20 million. Inventory turnover for the year is closest to:",
        ["3.86.", "4.86.", "5.86."],
        1,
        "Stock initial = 85 + 20 − 90 = 15 M$. Stock moyen = (15 + 20)/2 = 17,5 M$. Rotation = 85 M$ / 17,5 M$ ≈ 4,86.",
      ],
      // Concept 3 — Composantes du DuPont en trois parties
      [
        "Which of the following ratios is a component of the original (three-part) DuPont equation?",
        ["Debt-to-equity ratio.", "Asset turnover.", "Gross profit margin."],
        1,
        "L'approche DuPont en trois parties est : marge nette × rotation des actifs × ratio de levier (actifs/capitaux propres). Le debt-to-equity et la marge brute n'en font pas partie.",
      ],
      [
        "The three-part DuPont equation decomposes return on equity into net profit margin, financial leverage, and:",
        ["interest burden.", "asset turnover.", "tax burden."],
        1,
        "La troisième composante du DuPont en trois parties est la rotation des actifs (asset turnover). Le fardeau d'intérêt et le fardeau fiscal n'apparaissent que dans la version étendue en cinq parties.",
      ],
      [
        "Which of the following is NOT one of the three components of the original DuPont equation?",
        ["Net profit margin.", "Asset turnover.", "Interest coverage ratio."],
        2,
        "Le ratio de couverture des intérêts n'apparaît dans aucune version du DuPont (ni la version à trois parties, ni celle à cinq parties). Les trois composantes originales sont la marge nette, la rotation des actifs, et le levier financier.",
      ],
      // Concept 4 — Le fardeau d'intérêt dans le DuPont étendu
      [
        "From the extended (5-part) DuPont equation, which of the following components describes the equation EBT / EBIT?",
        ["Tax burden.", "Interest burden.", "Financial leverage."],
        1,
        "EBT / EBIT est le fardeau d'intérêt (interest burden), montrant qu'un levier plus élevé entraîne des charges d'intérêt plus élevées qui peuvent compenser les bénéfices du levier sur le ROE.",
      ],
      [
        "In the extended (5-part) DuPont decomposition of ROE, the ratio of EBIT to revenue represents the:",
        ["tax burden.", "interest burden.", "operating (EBIT) profit margin."],
        2,
        "EBIT / Revenue est la marge opérationnelle (EBIT margin), une des cinq composantes du DuPont étendu, distincte du fardeau d'intérêt (EBT/EBIT) et du fardeau fiscal (NI/EBT).",
      ],
      [
        "Which component of the extended (5-part) DuPont equation is calculated as net income divided by EBT (earnings before tax)?",
        ["Interest burden.", "Tax burden.", "Financial leverage."],
        1,
        "NI / EBT est le fardeau fiscal (tax burden), qui mesure la part du résultat avant impôt conservée après impôt. EBT/EBIT est le fardeau d'intérêt, et le levier financier est actifs moyens/capitaux propres moyens.",
      ],
      // Concept 5 — Tendances de marges brute et nette
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
      [
        "Income statements for a company show: Sales of $100 million (Year 1) and $110 million (Year 2); Cost of Goods Sold of $60 million (Year 1) and $62 million (Year 2); Earnings after Taxes of $8 million (Year 1) and $7 million (Year 2). With respect to gross profit margin and net profit margin trends:",
        [
          "both margins increased in Year 2.",
          "gross profit margin increased but net profit margin decreased in Year 2.",
          "gross profit margin decreased but net profit margin increased in Year 2.",
        ],
        1,
        "Marge brute : 40,0 % (Année 1, 40/100) → 43,6 % (Année 2, 48/110), en hausse. Marge nette : 8,0 % (8/100) → 6,4 % (7/110), en baisse — le coût des ventes ralentit relativement aux ventes, mais des charges sous la ligne brute pèsent davantage sur le résultat net.",
      ],
      [
        "Income statements for a company show: Sales of $200 million (Year 1) and $210 million (Year 2); Cost of Goods Sold of $130 million (Year 1) and $145 million (Year 2); Earnings after Taxes of $10 million (Year 1) and $15 million (Year 2). With respect to the company's gross profit margin and net profit margin trends:",
        [
          "both margins increased in Year 2.",
          "gross profit margin increased but net profit margin decreased in Year 2.",
          "gross profit margin decreased but net profit margin increased in Year 2.",
        ],
        2,
        "Marge brute : 35,0 % (Année 1, 70/200) → 31,0 % (Année 2, 65/210), en baisse — le coût des ventes a progressé plus vite que les ventes. Marge nette : 5,0 % (10/200) → 7,1 % (15/210), en hausse — des économies réalisées plus bas dans le compte de résultat compensent largement la dégradation de la marge brute.",
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
