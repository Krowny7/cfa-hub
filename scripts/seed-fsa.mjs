// Seed script — QCM + Exercices Système Analyse des États Financiers (CFA
// Level I, R29-R38). Contenu vérifié depuis la banque de practice exams
// CFA (voir mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Financial statement analysis/Reading 29-38 — Answers
// Remplace l'ancien set QCM plat "Analyse des États Financiers" (15
// questions génériques) par 4 sets par sous-thème (316 questions).
// Anglais, format 3 choix A/B/C. Ajoute 2 sets Exercices (105 questions
// de calcul).
// NOTE: Readings 39 (Financial Analysis Techniques) et 40 (Introduction
// to Financial Statement Modeling) pas encore extraits — à ajouter dans
// un futur passage.
// Usage: node scripts/seed-fsa.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Analyse des États Financiers (Système)";

const qcmData = loadJson("qcm_fsa_partial.json");
const exData = loadJson("exercises_fsa_partial.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Introduction to FSA & Income Statements — QCM (R29–R30)",
    questions: byReading(qcmData, [29, 30]),
  },
  {
    title: "Balance Sheets & Statements of Cash Flows — QCM (R31–R33)",
    questions: byReading(qcmData, [31, 32, 33]),
  },
  {
    title: "Inventories & Long-Term Assets — QCM (R34–R35)",
    questions: byReading(qcmData, [34, 35]),
  },
  {
    title: "Liabilities, Equity, Income Taxes & Reporting Quality — QCM (R36–R38)",
    questions: byReading(qcmData, [36, 37, 38]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Income Statements, Balance Sheets & Cash Flows — Exercises (R30–R33)",
    questions: byReading(exData, [30, 31, 32, 33]),
  },
  {
    title: "Inventories, Long-Term Assets & Income Taxes — Exercises (R34–R35, R37)",
    questions: byReading(exData, [34, 35, 37]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Analyse des États Financiers...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Analyse des États Financiers"],
  });

  console.log("\nExercices Analyse des États Financiers...");
  const exTotal = await seedExerciseSets({
    ownerId,
    folderId: exFolderId,
    sets: EXERCISE_SETS,
  });

  console.log(`\n✅ Terminé. ${qcmTotal} questions QCM, ${exTotal} exercices (R39-R40 pas encore couverts).`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
