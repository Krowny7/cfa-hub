// Seed script — QCM + Exercices Système Instruments Dérivés (CFA Level I,
// R68-R77). Contenu vérifié depuis la banque de practice exams CFA (voir
// mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Derivatives/Reading 68-77 — Answers
// Remplace l'ancien set QCM plat "Instruments Dérivés" (15 questions
// génériques) par 3 sets par sous-thème (107 questions). Anglais, format 3
// choix A/B/C. Ajoute un premier set Exercices (7 questions de calcul).
// Usage: node scripts/seed-derivatives.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Instruments Dérivés (Système)";

const qcmData = loadJson("qcm_derivatives.json");
const exData = loadJson("exercises_derivatives.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Derivative Features, Instruments & Uses — QCM (R68–R70)",
    questions: byReading(qcmData, [68, 69, 70]),
  },
  {
    title: "Arbitrage, Forward, Futures & Swap Pricing — QCM (R71–R74)",
    questions: byReading(qcmData, [71, 72, 73, 74]),
  },
  {
    title: "Option Pricing, Parity & Binomial Model — QCM (R75–R77)",
    questions: byReading(qcmData, [75, 76, 77]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Derivatives Pricing & Valuation — Exercises (R69, R75, R77)",
    questions: byReading(exData, [69, 75, 77]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Instruments Dérivés...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Instruments Dérivés"],
  });

  console.log("\nExercices Instruments Dérivés...");
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
