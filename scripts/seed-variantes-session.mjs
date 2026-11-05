// Importe une session de variantes : des questions écrites pour le site à partir des concepts
// d'anciens mocks, pas des questions officielles. Deux séries : « Variantes » raisonne dans le même
// sens que le concept de départ, « Variantes inverses » le prend à rebours (calcul inversé, cas
// limite, fait qui renverse la conclusion). Données : scripts/data/<fichier>.json
// { num, topic, prompt, choices, correct_index, explanation }, énoncés et choix en anglais,
// explications en français.
//
// Crée, dans le dossier « Mocks Officiels (Système) », une série par matière et une série
// « Complet (N questions) » dans l'ordre de la session, comme pour un mock officiel.
//
// Usage : node scripts/seed-variantes-session.mjs variantes_1_session1 "Variantes 1 — Session 1"
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FOLDER_NAME = "Mocks Officiels (Système)";

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
if (!fichier || !/^Variantes( inverses)? [0-9] — Session [0-9]$/.test(examLabel ?? "")) {
  console.error('Usage : node scripts/seed-variantes-session.mjs <fichier sans .json> "Variantes inverses 1 — Session 1"');
  process.exit(1);
}

function loadQuestions() {
  const raw = JSON.parse(readFileSync(join(__dirname, "data", `${fichier}.json`), "utf8"));
  const nums = new Set(raw.map((q) => q.num));
  if (raw.length === 0 || nums.size !== raw.length) throw new Error(`${raw.length} questions, ${nums.size} numéros distincts.`);
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
  sets.push({ title: `${examLabel} — Complet (${questions.length} questions)`, difficulty: 2, questions: questions.map(toSeedFormat) });

  console.log(`Import ${examLabel} : ${sets.length - 1} matières + la série complète…`);
  const total = await seedQuizSets({ ownerId, folderId, sets });
  console.log(`\n✅ Terminé. ${total} lignes de questions insérées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
