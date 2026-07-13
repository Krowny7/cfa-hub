// Seed script — QCM + Exercices Système Finance d'Entreprise (CFA Level I,
// R22-R28). Contenu vérifié depuis la banque de practice exams CFA (voir
// mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Corporate issuers/Reading 22-28 — Answers
// Remplace les 2 anciens sets QCM plats "Finance d'Entreprise" / "—
// Approfondi" (15+25 questions génériques) par 3 sets par sous-thème (77
// questions). Anglais, format 3 choix A/B/C. Ajoute un set Exercices (11
// questions de calcul : working capital, capital budgeting, capital
// structure).
// Usage: node scripts/seed-corporate.mjs
import { getOwnerId, ensureFolder, seedQuizSets, seedExerciseSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Finance d'Entreprise (Système)";

const qcmData = loadJson("qcm_corporate.json");
const exData = loadJson("exercises_corporate.json");

function byReading(data, nums) {
  return data.filter((r) => nums.some((n) => r.reading === `Reading ${n}`)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Organizational Forms, Stakeholders & Governance — QCM (R22–R24)",
    questions: byReading(qcmData, [22, 23, 24]),
  },
  {
    title: "Working Capital & Capital Investments — QCM (R25–R26)",
    questions: byReading(qcmData, [25, 26]),
  },
  {
    title: "Capital Structure & Business Models — QCM (R27–R28)",
    questions: byReading(qcmData, [27, 28]),
  },
];

const EXERCISE_SETS = [
  {
    title: "Working Capital, Capital Investments & Structure — Exercises (R25–R27)",
    questions: byReading(exData, [25, 26, 27]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  const exFolderId = await ensureFolder(ownerId, FOLDER_NAME, "exercises");

  console.log("QCM Finance d'Entreprise...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Finance d'Entreprise", "Finance d'Entreprise — Approfondi"],
  });

  console.log("\nExercices Finance d'Entreprise...");
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
