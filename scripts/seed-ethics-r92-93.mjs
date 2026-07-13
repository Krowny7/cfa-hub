// Seed script — complète Éthique et Standards Professionnels avec R92-R93
// (GIPS, Ethics Application), qui manquaient de scripts/seed-ethics.mjs.
// Additif : ne touche pas aux 5 sets R89-R91.9 déjà seedés. Pas d'exercices
// pour ce topic (purement conceptuel).
// Usage: node scripts/seed-ethics-r92-93.mjs
import { getOwnerId, ensureFolder, seedQuizSets, loadJson } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Éthique et Standards Professionnels (Système)";

const qcmData = loadJson("qcm_ethics_r92_93.json");

const QUIZ_SETS = [
  {
    title: "GIPS & Ethics Application — QCM (R92–R93)",
    questions: qcmData.flatMap((r) => r.questions),
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("QCM Éthique (R92-R93)...");
  const qcmTotal = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${qcmTotal} questions QCM ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
