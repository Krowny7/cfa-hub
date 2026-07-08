// Seed script — QCM + Exercices Système Investissements Alternatifs (CFA
// Level I, R78-R84). Contenu vérifié depuis la banque de practice exams CFA
// (voir mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Alternative Investment/Reading 78-84 — Answers
// Remplace l'ancien set QCM plat "Investissements Alternatifs" (15 questions
// génériques, non sourcées) par 3 sets par sous-thème. Contenu en anglais
// (fidèle au format réel de l'examen CFA), format 3 choix A/B/C.
// Usage: node scripts/seed-altinvest.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Investissements Alternatifs (Système)";

const qcmData = loadJson("qcm_altinvest.json");
const exData = loadJson("exercises_altinvest.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Alternative Investment Features & Performance — QCM (R78–R79)",
    questions: byReading(qcmData, [78, 79]),
  },
  {
    title: "Private Capital, Real Estate & Natural Resources — QCM (R80–R82)",
    questions: byReading(qcmData, [80, 81, 82]),
  },
  {
    title: "Hedge Funds & Digital Assets — QCM (R83–R84)",
    questions: byReading(qcmData, [83, 84]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Alternative Investment Fees & Returns — Exercises (R78–R79)",
    questions: byReading(exData, [78, 79]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Investissements Alternatifs...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Investissements Alternatifs"],
  });

  console.log("\nExercices Investissements Alternatifs...");
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
