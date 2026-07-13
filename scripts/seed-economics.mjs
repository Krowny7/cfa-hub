// Seed script — QCM + Exercices Système Économie (CFA Level I, R12-R19).
// Contenu vérifié depuis la banque de practice exams CFA (voir mémoire
// cfa-practice-exams-bank.md) :
//   Practise Exams/Economics/Reading 12-19 — Answers
// Remplace les 2 anciens sets QCM plats "Économie" / "Économie —
// Approfondi" (15+25 questions génériques) par 4 sets par sous-thème (221
// questions). Anglais, format 3 choix A/B/C. Ajoute un set Exercices (28
// questions de calcul, essentiellement le change/taux de change).
// Usage: node scripts/seed-economics.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Économie (Système)";

const qcmData = loadJson("qcm_economics.json");
const exData = loadJson("exercises_economics.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Firms, Market Structures & Business Cycles — QCM (R12–R13)",
    questions: byReading(qcmData, [12, 13]),
  },
  {
    title: "Fiscal & Monetary Policy — QCM (R14–R15)",
    questions: byReading(qcmData, [14, 15]),
  },
  {
    title: "Geopolitics & International Trade — QCM (R16–R17)",
    questions: byReading(qcmData, [16, 17]),
  },
  {
    title: "Capital Flows, FX & Exchange Rate Calculations — QCM (R18–R19)",
    questions: byReading(qcmData, [18, 19]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Monetary Policy & Exchange Rate Calculations — Exercises (R15, R18–R19)",
    questions: byReading(exData, [15, 18, 19]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Économie...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Économie", "Économie — Approfondi"],
  });

  console.log("\nExercices Économie...");
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
