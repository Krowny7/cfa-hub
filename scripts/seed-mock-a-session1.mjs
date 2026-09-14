// Seed script — importe les 90 questions officielles de "2026 CFA Program
// LI Mock Exam A — Session 1" (Ethics/GIPS, Quant, Economics, FSA,
// Corporate Issuers), fournies verbatim par l'utilisateur (export texte de
// sa correction de mock exam), dans scripts/data/mock_a_session1.json.
// Aucune génération : prompt/choices/correct_index/explanation sont repris
// tels quels, en anglais (langue de la source officielle).
//
// Crée, dans le dossier "Mocks Officiels (Système)" :
//   - un quiz_set par thème (les 27 Ethics, 14 Quant, 14 Economics, 22 FSA,
//     13 Corporate Issuers de cette session), pour pouvoir s'entraîner sur
//     un seul thème à la fois ;
//   - un quiz_set "Complet" avec les 90 questions dans l'ordre d'origine,
//     pour repasser la session entière telle quelle.
//
// Usage: node scripts/seed-mock-a-session1.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOLDER_NAME = "Mocks Officiels (Système)";
const EXAM_LABEL = "Mock A — Session 1";

// Classification par thème, établie par lecture du contenu de chaque
// question (le mock ne les groupe pas consécutivement par thème dans son
// export). Numéros = position d'origine (1-90) dans l'export utilisateur.
const TOPIC_QUESTION_NUMBERS = {
  ethics: Array.from({ length: 27 }, (_, i) => i + 1), // 1-27
  quant: [33, 35, 39, 41, 43, 53, 55, 59, 69, 70, 75, 76, 80, 86],
  economics: [29, 31, 32, 34, 40, 46, 49, 52, 57, 63, 74, 77, 79, 82],
  fsa: [28, 30, 36, 38, 42, 44, 45, 47, 48, 50, 51, 54, 60, 62, 66, 68, 72, 73, 78, 84, 88, 89],
  corporate: [37, 56, 58, 61, 64, 65, 67, 71, 81, 83, 85, 87, 90],
};

const TOPIC_LABELS = {
  ethics: "Éthique et Standards Professionnels",
  quant: "Méthodes Quantitatives",
  economics: "Économie",
  fsa: "Analyse des États Financiers",
  corporate: "Finance d'Entreprise",
};

function loadQuestions() {
  const raw = JSON.parse(readFileSync(join(__dirname, "data", "mock_a_session1.json"), "utf8"));
  const byNum = new Map(raw.map((q) => [q.num, q]));
  const total = raw.length;
  const covered = new Set(Object.values(TOPIC_QUESTION_NUMBERS).flat());
  if (covered.size !== total) {
    throw new Error(`Topic classification covers ${covered.size} of ${total} questions — check TOPIC_QUESTION_NUMBERS.`);
  }
  return { raw, byNum };
}

function toSeedFormat(q) {
  return [q.prompt, q.choices, q.correct_index, q.explanation];
}

async function main() {
  const { raw, byNum } = loadQuestions();
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  const sets = [];

  for (const [topicKey, numbers] of Object.entries(TOPIC_QUESTION_NUMBERS)) {
    const questions = numbers
      .sort((a, b) => a - b)
      .map((n) => toSeedFormat(byNum.get(n)));
    sets.push({
      title: `${EXAM_LABEL} — ${TOPIC_LABELS[topicKey]}`,
      difficulty: 2,
      questions,
    });
  }

  sets.push({
    title: `${EXAM_LABEL} — Complet (90 questions)`,
    difficulty: 2,
    questions: raw
      .slice()
      .sort((a, b) => a.num - b.num)
      .map(toSeedFormat),
  });

  console.log(`Import ${EXAM_LABEL}...`);
  const total = await seedQuizSets({ ownerId, folderId, sets });
  console.log(`\n✅ Terminé. ${total} lignes de questions insérées (90 questions x 2, une fois par thème + une fois dans le set complet).`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
