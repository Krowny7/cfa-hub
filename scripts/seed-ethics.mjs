// Seed script — QCM Système Éthique et Standards Professionnels (CFA Level
// I, R89-R91.9). Contenu vérifié depuis la banque de practice exams CFA
// (voir mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Ethical and professional standard/Reading 89-91.9 — Answers
// Remplace l'ancien set QCM plat "Éthique et Standards Professionnels" (15
// questions génériques) par 5 sets par sous-thème (384 questions). Anglais,
// format 3 choix A/B/C. Pas d'Exercices pour ce topic (purement conceptuel,
// aucun calcul).
// NOTE: Readings 92 (GIPS) et 93 (Ethics Application) pas encore extraits —
// à ajouter dans un futur passage.
// Usage: node scripts/seed-ethics.mjs
import { getOwnerId, ensureFolder, seedQuizSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Éthique et Standards Professionnels (Système)";

const qcmData = loadJson("qcm_ethics.json");

function byReading(nums) {
  return qcmData.filter((r) => nums.some((n) => r.reading === n)).flatMap((r) => r.questions);
}

const QUIZ_SETS = [
  {
    title: "Ethics & Trust, Code of Standards — QCM (R89–R90)",
    questions: byReading(["Reading 89", "Reading 90"]),
  },
  {
    title: "Guidance for Standard I — QCM (R91.1–R91.2)",
    questions: byReading(["Reading 91.1", "Reading 91.2"]),
  },
  {
    title: "Guidance for Standards II & III — QCM (R91.3–R91.5)",
    questions: byReading(["Reading 91.3", "Reading 91.4", "Reading 91.5"]),
  },
  {
    title: "Guidance for Standards IV & V — QCM (R91.6–R91.7)",
    questions: byReading(["Reading 91.6", "Reading 91.7"]),
  },
  {
    title: "Guidance for Standards VI & VII — QCM (R91.8–R91.9)",
    questions: byReading(["Reading 91.8", "Reading 91.9"]),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("QCM Éthique et Standards Professionnels...");
  const qcmTotal = await seedQuizSets({
    ownerId,
    folderId,
    sets: QUIZ_SETS,
    oldTitles: ["Éthique et Standards Professionnels"],
  });

  console.log(`\n✅ Terminé. ${qcmTotal} questions QCM (R92-R93 pas encore couverts).`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
