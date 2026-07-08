// Seed script — QCM + Exercices Système Gestion de Portefeuille (CFA
// Level I, R20-R21, R85-R88). Contenu vérifié depuis la banque de practice
// exams CFA (voir mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Portofolio management part 1/Reading 20-21 — Answers
//   Practise Exams/Portofolio management part 2/Reading 85-88 — Answers
// Remplace l'ancien set QCM plat "Gestion de Portefeuille" (15 questions
// génériques) par 4 sets par sous-thème. Anglais, format 3 choix A/B/C.
// Usage: node scripts/seed-portfolio.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Gestion de Portefeuille (Système)";

const qcmData = loadJson("qcm_portfolio.json");
const exData = loadJson("exercises_portfolio.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Portfolio Risk and Return: Part I — QCM (R20)",
    questions: byReading(qcmData, [20]),
  },
  {
    title: "Portfolio Risk and Return: Part II — QCM (R21)",
    questions: byReading(qcmData, [21]),
  },
  {
    title: "Portfolio Management Overview & Planning — QCM (R85–R86)",
    questions: byReading(qcmData, [85, 86]),
  },
  {
    title: "Behavioral Biases & Risk Management — QCM (R87–R88)",
    questions: byReading(qcmData, [87, 88]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Portfolio Risk and Return: Part I — Exercises (R20)",
    questions: byReading(exData, [20]),
  },
  {
    title: "Portfolio Risk and Return: Part II — Exercises (R21)",
    questions: byReading(exData, [21]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Gestion de Portefeuille...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Gestion de Portefeuille"],
  });

  console.log("\nExercices Gestion de Portefeuille...");
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
