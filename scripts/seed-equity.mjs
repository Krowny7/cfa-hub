// Seed script — QCM + Exercices Système Investissements en Actions (CFA
// Level I, R41-R48). Contenu vérifié depuis la banque de practice exams
// CFA (voir mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Equity Investments/Reading 41-48 — Answers
// Remplace l'ancien set QCM plat "Investissements en Actions" (15
// questions génériques) par 4 sets par sous-thème (415 questions).
// Anglais, format 3 choix A/B/C. Ajoute 3 sets Exercices (130 questions
// de calcul, dont beaucoup issues de la valorisation actions R48).
// Usage: node scripts/seed-equity.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Investissements en Actions (Système)";

const qcmData = loadJson("qcm_equity.json");
const exData = loadJson("exercises_equity.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Market Organization, Structure & Indexes — QCM (R41–R42)",
    questions: byReading(qcmData, [41, 42]),
  },
  {
    title: "Market Efficiency & Equity Securities Overview — QCM (R43–R44)",
    questions: byReading(qcmData, [43, 44]),
  },
  {
    title: "Company & Industry Analysis — QCM (R45–R47)",
    questions: byReading(qcmData, [45, 46, 47]),
  },
  {
    title: "Equity Valuation: Concepts and Basic Tools — QCM (R48)",
    questions: byReading(qcmData, [48]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Market Organization & Indexes — Exercises (R41–R42)",
    questions: byReading(exData, [41, 42]),
  },
  {
    title: "Company Analysis & Forecasting — Exercises (R45, R47)",
    questions: byReading(exData, [45, 47]),
  },
  {
    title: "Equity Valuation — Exercises (R48)",
    questions: byReading(exData, [48]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Investissements en Actions...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Investissements en Actions"],
  });

  console.log("\nExercices Investissements en Actions...");
  const exTotal = await seedExerciseSets({
    ownerId,
    folderId: exFolderId,
    sets: EXERCISE_SETS,
  });

  console.log(`\n✅ Terminé. ${qcmTotal} questions QCM, ${exTotal} exercices.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
