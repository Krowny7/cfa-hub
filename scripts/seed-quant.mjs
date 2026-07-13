// Seed script — QCM + Exercices Système Méthodes Quantitatives (CFA Level
// I, R1-R11). Contenu vérifié depuis la banque de practice exams CFA (voir
// mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Quantitative Method/Reading 1-11 — Answers
// Remplace les 2 anciens sets QCM plats "Méthodes Quantitatives" / "—
// Approfondi" (15+25 questions génériques) par 5 sets par sous-thème (265
// questions). Anglais, format 3 choix A/B/C. Ajoute 4 sets Exercices (152
// questions de calcul).
// NOTE: Reading 7 (Estimation and Inference) exclu — son PDF corrigé
// était corrompu/vide dans la source, aucune copie alternative trouvée.
// Usage: node scripts/seed-quant.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Méthodes Quantitatives (Système)";

const qcmData = loadJson("qcm_quant.json");
const exData = loadJson("exercises_quant.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Rates, Returns & Time Value of Money — QCM (R1–R2)",
    questions: byReading(qcmData, [1, 2]),
  },
  {
    title: "Statistical Measures & Probability Trees — QCM (R3–R4)",
    questions: byReading(qcmData, [3, 4]),
  },
  {
    title: "Portfolio Mathematics & Simulation Methods — QCM (R5–R6)",
    questions: byReading(qcmData, [5, 6]),
  },
  {
    title: "Hypothesis Testing & Tests of Independence — QCM (R8–R9)",
    questions: byReading(qcmData, [8, 9]),
  },
  {
    title: "Simple Linear Regression & Big Data — QCM (R10–R11)",
    questions: byReading(qcmData, [10, 11]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Rates, Returns & Time Value of Money — Exercises (R1–R2)",
    questions: byReading(exData, [1, 2]),
  },
  {
    title: "Statistical Measures & Probability Trees — Exercises (R3–R4)",
    questions: byReading(exData, [3, 4]),
  },
  {
    title: "Portfolio Mathematics — Exercises (R5)",
    questions: byReading(exData, [5]),
  },
  {
    title: "Hypothesis Testing & Regression — Exercises (R8–R10)",
    questions: byReading(exData, [8, 9, 10]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Méthodes Quantitatives...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Méthodes Quantitatives", "Méthodes Quantitatives — Approfondi"],
  });

  console.log("\nExercices Méthodes Quantitatives...");
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
