// Seed script — complète Analyse des États Financiers avec R39-R40
// (Financial Analysis Techniques, Introduction to Financial Statement
// Modeling), qui manquaient de scripts/seed-fsa.mjs. Additif : ne touche
// pas aux sets R29-R38 déjà seedés.
// Usage: node scripts/seed-fsa-r39-40.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Analyse des États Financiers (Système)";

const data = loadJson("qcm_fsa_readings39_40.json");

function byReading(nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions.map((q) => q.slice(0, 4)));
}

function calcOnly(nums) {
  return data
    .filter((r) => nums.some((n) => r.reading === `Reading ${n}`))
    .flatMap((r) => r.questions.filter((q) => q[4]).map((q) => q.slice(0, 4)));
}

const QUIZ_SETS = [
  {
    title: "Financial Analysis Techniques & Modeling — QCM (R39–R40)",
    questions: byReading([39, 40]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Financial Analysis Techniques & Modeling — Exercises (R39–R40)",
    questions: calcOnly([39, 40]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Analyse des États Financiers (R39-R40)...");
  const qcmTotal = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log("\nExercices Analyse des États Financiers (R39-R40)...");
  const exTotal = await seedExerciseSets({ ownerId, folderId: exFolderId, sets: EXERCISE_SETS });

  console.log(`\n✅ Terminé. ${qcmTotal} questions QCM, ${exTotal} exercices ajoutés.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
