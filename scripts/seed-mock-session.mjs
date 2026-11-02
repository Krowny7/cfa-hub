// Seed script — importe une session de mock officiel CFA niveau I (90 QCM)
// depuis scripts/data/<fichier>.json : { num, topic, prompt, choices,
// correct_index, explanation }. Énoncés et choix tels que l'export officiel
// fourni par l'utilisateur (en anglais) ; explication = traduction française
// du corrigé officiel de la bonne réponse, comme pour la session 1 du mock A.
//
// Crée, dans le dossier "Mocks Officiels (Système)" :
//   - un quiz_set par matière (« Mock B — Session 1 — Économie »…), pour
//     s'entraîner sur une seule matière à la fois ;
//   - un quiz_set « Complet (90 questions) » dans l'ordre d'origine, pour
//     repasser la session entière (il donne aussi l'ordre de l'examen aux Salles).
//
// Usage : node scripts/seed-mock-session.mjs mock_b_session1 "Mock B — Session 1"
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOLDER_NAME = "Mocks Officiels (Système)";

// Mêmes libellés que les sets de la session 1 et que lib/practiceTopics.ts.
const TOPIC_LABELS = {
  ethics: "Éthique et Standards Professionnels",
  quant: "Méthodes Quantitatives",
  economics: "Économie",
  fsa: "Analyse des États Financiers",
  corporate: "Finance d'Entreprise",
  equity: "Investissements en Actions",
  fixed_income: "Fixed Income",
  derivatives: "Instruments Dérivés",
  alternatives: "Investissements Alternatifs",
  portfolio: "Gestion de Portefeuille",
};

const [fichier, examLabel] = process.argv.slice(2);
if (!fichier || !/^Mock [A-Z] — Session [0-9]$/.test(examLabel ?? "")) {
  console.error('Usage : node scripts/seed-mock-session.mjs <fichier sans .json> "Mock B — Session 1"');
  process.exit(1);
}

function loadQuestions() {
  const raw = JSON.parse(readFileSync(join(__dirname, "data", `${fichier}.json`), "utf8"));
  const nums = new Set(raw.map((q) => q.num));
  if (raw.length !== 90 || nums.size !== 90) throw new Error(`${raw.length} questions (${nums.size} numéros distincts), 90 attendues.`);
  for (const q of raw) {
    if (!TOPIC_LABELS[q.topic]) throw new Error(`Q${q.num} : matière inconnue « ${q.topic} ».`);
    if (!Array.isArray(q.choices) || q.choices.length !== 3 || ![0, 1, 2].includes(q.correct_index)) throw new Error(`Q${q.num} : choix ou bonne réponse invalides.`);
    if (!/^Correct : /.test(q.explanation ?? "")) throw new Error(`Q${q.num} : l'explication doit commencer par « Correct : ».`);
  }
  return raw.slice().sort((a, b) => a.num - b.num);
}

const toSeedFormat = (q) => [q.prompt, q.choices, q.correct_index, q.explanation];

async function main() {
  const questions = loadQuestions();
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");

  const sets = [];
  for (const [topic, label] of Object.entries(TOPIC_LABELS)) {
    const duTopic = questions.filter((q) => q.topic === topic);
    if (duTopic.length) sets.push({ title: `${examLabel} — ${label}`, difficulty: 2, questions: duTopic.map(toSeedFormat) });
  }
  sets.push({ title: `${examLabel} — Complet (90 questions)`, difficulty: 2, questions: questions.map(toSeedFormat) });

  console.log(`Import ${examLabel} : ${sets.length - 1} matières + le set complet…`);
  const total = await seedQuizSets({ ownerId, folderId, sets });
  console.log(`\n✅ Terminé. ${total} lignes de questions insérées (90 questions x 2 : par matière + set complet).`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
