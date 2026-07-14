// Seed script — QCM + Exercices Système Fixed Income v2 (CFA Level I,
// R49-R67, 19 lectures). Remplace le set QCM v1 (160 questions, sourcé
// d'un dossier moins complet et antérieur à cette session) par le contenu
// complet et vérifié de la banque cfa_practice_exams (414 questions,
// 100% de couverture confirmée contre les totaux déclarés dans chaque
// PDF). Anglais, format 3 choix A/B/C.
// Usage: node scripts/seed-fixed-income-v2.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const qcmData = loadJson("qcm_fixed_income_v2.json");
const exData = loadJson("exercises_fixed_income_v2.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Fixed-Income Instruments & Markets — QCM (R49–R53)",
    questions: byReading(qcmData, [49, 50, 51, 52, 53]),
  },
  {
    title: "Bond Valuation & Yield Measures — QCM (R54–R56)",
    questions: byReading(qcmData, [54, 55, 56]),
  },
  {
    title: "Term Structure & Interest Rate Risk — QCM (R57–R58)",
    questions: byReading(qcmData, [57, 58]),
  },
  {
    title: "Duration, Convexity & Empirical Measures — QCM (R59–R61)",
    questions: byReading(qcmData, [59, 60, 61]),
  },
  {
    title: "Credit Analysis — QCM (R62–R64)",
    questions: byReading(qcmData, [62, 63, 64]),
  },
  {
    title: "Securitization, ABS & MBS — QCM (R65–R67)",
    questions: byReading(qcmData, [65, 66, 67]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Instruments & Cash Flows — Exercises (R49–R50)",
    questions: byReading(exData, [49, 50]),
  },
  {
    title: "Bond Valuation & Yield Measures — Exercises (R54–R56)",
    questions: byReading(exData, [54, 55, 56]),
  },
  {
    title: "Term Structure & Interest Rate Risk — Exercises (R57–R58)",
    questions: byReading(exData, [57, 58]),
  },
  {
    title: "Duration, Convexity & Empirical Measures — Exercises (R59–R61)",
    questions: byReading(exData, [59, 60, 61]),
  },
  {
    title: "Credit Analysis — Exercises (R62, R64)",
    questions: byReading(exData, [62, 64]),
  },
  {
    title: "Securitization & ABS — Exercises (R66)",
    questions: byReading(exData, [66]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Fixed Income v2...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: [
      "Fixed-Income Instruments & Markets — QCM (R47–R51)",
      "Bond Valuation & Yield Measures — QCM (R52–R54)",
      "Term Structure of Interest Rates — QCM (R55)",
      "Interest Rate Risk: Duration & Convexity — QCM (R56–R59)",
      "Credit Analysis — QCM (R60–R62)",
      "Securitization, ABS & MBS — QCM (R63–R65)",
    ],
  });

  console.log("\nExercices Fixed Income v2 (remplace les 3 anciens sets qui se chevauchaient avec R57/R59/R60)...");
  const exTotal = await seedExerciseSets({
    ownerId,
    folderId: exFolderId,
    sets: EXERCISE_SETS,
    oldTitles: [
      "Yield-Based Duration Measures — Exercises (R59)",
      "Yield-Based Convexity & Portfolio Properties — Exercises (R60)",
      "Term Structure: Spot, Par & Forward Curves — Exercises (R57)",
    ],
  });

  console.log(`\n✅ Terminé. ${qcmTotal} questions QCM, ${exTotal} exercices ajoutés.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
