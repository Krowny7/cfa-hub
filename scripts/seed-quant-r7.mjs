// Seed script — complète Méthodes Quantitatives avec R7 (Estimation and
// Inference). Le corrigé PDF de la banque de practice exams pour cette
// lecture était un fichier vide (0 octet, vérifié dans les deux versions du
// zip source) — impossible à récupérer depuis cette banque. Contenu de
// remplacement sourcé depuis le manuel Schweser (Book 1, Module Quiz 7.1 +
// son corrigé officiel), donc vérifié mais plus court (3 questions au lieu
// d'une vingtaine dans un QBank complet).
// Usage: node scripts/seed-quant-r7.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Méthodes Quantitatives (Système)";

const QUIZ_SETS = [
  {
    title: "Estimation and Inference — QCM (R7)",
    questions: [
      [
        "A simple random sample is a sample drawn in such a way that each member of the population has:",
        ["some chance of being selected in the sample.", "an equal chance of being included in the sample.", "a 1% chance of being included in the sample."],
        1,
        "In a simple random sample, each element of the population has an equal probability of being selected. The 1% chance option would only be equal if there were exactly 100 elements in the population.",
      ],
      [
        "To apply the central limit theorem to the sampling distribution of the sample mean, the sample is usually considered to be large if n is at least:",
        ["20.", "25.", "30."],
        2,
        "Sample sizes of 30 or greater are typically considered large enough for the central limit theorem to apply.",
      ],
      [
        "Which of the following techniques to improve the accuracy of confidence intervals on a statistic is most computationally demanding?",
        ["Jackknife resampling.", "Systematic resampling.", "Bootstrap resampling."],
        2,
        "Bootstrap resampling, which repeatedly draws samples of equal size from a large dataset, is more computationally demanding than the jackknife. Systematic resampling is not a defined technique in this context.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  console.log("QCM Méthodes Quantitatives (R7)...");
  const qcmTotal = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });

  console.log(`\n✅ Terminé. ${qcmTotal} questions QCM ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
