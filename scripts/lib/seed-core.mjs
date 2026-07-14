// Coeur partagé des scripts de seed QCM/Exercices — évite de dupliquer la
// logique Supabase (env, owner, dossier, delete-then-insert) dans chaque
// script par topic. Format question partout : [prompt, choices[3],
// correct_index, explanation].
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const out = {};
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv(join(__dirname, "..", "..", ".env.local"));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

export const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OWNER_EMAIL = "chaumonttheo@gmail.com";

export async function getOwnerId() {
  const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
  if (error) throw error;
  const owner = users.users.find((u) => u.email === OWNER_EMAIL);
  if (!owner) throw new Error(`Utilisateur ${OWNER_EMAIL} introuvable.`);
  return owner.id;
}

// Recherche par nom+kind SEULEMENT (pas de filtre owner_id) — le contenu
// Système peut avoir été créé par un autre compte admin (piège déjà
// rencontré : filtrer par owner_id a fait créer des dossiers dupliqués et
// laissé les anciens sets génériques orphelins, invisibles aux scripts
// suivants). Un dossier "Système" doit être unique par nom+kind, peu
// importe qui l'a créé.
export async function ensureFolder(ownerId, folderName, kind) {
  let { data: folder } = await supabase
    .from("library_folders")
    .select("id")
    .eq("name", folderName)
    .eq("kind", kind)
    .maybeSingle();

  if (!folder) {
    const { data: newFolder, error } = await supabase
      .from("library_folders")
      .insert({ name: folderName, kind, owner_id: ownerId })
      .select("id")
      .single();
    if (error) throw error;
    folder = newFolder;
  }
  return folder.id;
}

// sets: [{ title, questions: [[prompt, choices, correct_index, explanation], ...] }]
export async function seedQuizSets({ ownerId, folderId, sets, oldTitles = [] }) {
  const titlesToDelete = [...new Set([...sets.map((s) => s.title), ...oldTitles])];
  // is_official (pas owner_id) : le contenu Système remplacé peut avoir été
  // créé par un autre compte admin — voir la note sur ensureFolder.
  const { data: toDelete } = await supabase.from("quiz_sets").select("id").eq("is_official", true).in("title", titlesToDelete);
  if (toDelete?.length) {
    await supabase.from("quiz_questions").delete().in("set_id", toDelete.map((s) => s.id));
    await supabase.from("quiz_sets").delete().in("id", toDelete.map((s) => s.id));
  }

  let total = 0;
  for (const set of sets) {
    const { data: newSet, error: setErr } = await supabase
      .from("quiz_sets")
      .insert({
        title: set.title,
        visibility: "public",
        subject: "cfa",
        owner_id: ownerId,
        folder_id: folderId,
        is_official: true,
        official_published: true,
        cfa_level: 1,
        difficulty: set.difficulty ?? 2,
      })
      .select("id")
      .single();
    if (setErr) throw setErr;

    const rows = set.questions.map(([prompt, choices, correct_index, explanation], i) => ({
      set_id: newSet.id,
      prompt,
      choices,
      correct_index,
      explanation,
      position: i + 1,
    }));
    const { error: qErr } = await supabase.from("quiz_questions").insert(rows);
    if (qErr) throw qErr;

    console.log(`  ✓ QCM "${set.title}" — ${rows.length} questions (set ${newSet.id})`);
    total += rows.length;
  }
  return total;
}

// sets: [{ title, questions: [[prompt, choices, correct_index, explanation], ...] }]
export async function seedExerciseSets({ ownerId, folderId, sets, oldTitles = [] }) {
  const titlesToDelete = [...new Set([...sets.map((s) => s.title), ...oldTitles])];
  // is_official (pas owner_id) — voir la note sur seedQuizSets.
  const { data: toDelete } = await supabase.from("exercise_sets").select("id").eq("is_official", true).in("title", titlesToDelete);
  if (toDelete?.length) {
    await supabase.from("exercise_questions").delete().in("set_id", toDelete.map((s) => s.id));
    await supabase.from("exercise_sets").delete().in("id", toDelete.map((s) => s.id));
  }

  let total = 0;
  for (const set of sets) {
    const { data: newSet, error: setErr } = await supabase
      .from("exercise_sets")
      .insert({
        title: set.title,
        visibility: "public",
        subject: "cfa",
        owner_id: ownerId,
        folder_id: folderId,
        is_official: true,
        official_published: true,
        cfa_level: 1,
        difficulty: set.difficulty ?? 2,
      })
      .select("id")
      .single();
    if (setErr) throw setErr;

    const rows = set.questions.map(([prompt, choices, correct_index, explanation], i) => ({
      set_id: newSet.id,
      prompt,
      choices,
      correct_index,
      explanation,
      position: i + 1,
    }));
    const { error: qErr } = await supabase.from("exercise_questions").insert(rows);
    if (qErr) throw qErr;

    console.log(`  ✓ Exercices "${set.title}" — ${rows.length} questions (set ${newSet.id})`);
    total += rows.length;
  }
  return total;
}

export function loadJson(scratchpadFile) {
  const base = "C:\\Users\\chaum\\AppData\\Local\\Temp\\claude\\C--Users-chaum-Documents-M-moire-Code-memoire\\93b73519-41cb-401d-844c-42e8f5c2d955\\scratchpad";
  return JSON.parse(readFileSync(join(base, scratchpadFile), "utf8"));
}

// Regroupe une liste de {reading, title, questions} extraite en sets de N
// lectures max, avec un titre auto-généré "<titres> — QCM (R.. – R..)".
export function groupReadingsIntoSets(readingGroups, labelSuffix, maxReadingsPerSet = 3) {
  const sets = [];
  for (let i = 0; i < readingGroups.length; i += maxReadingsPerSet) {
    const chunk = readingGroups.slice(i, i + maxReadingsPerSet);
    const readingNums = chunk.map((r) => r.reading.replace(/^Reading\s*/i, ""));
    const rangeLabel =
      readingNums.length > 1 ? `R${readingNums[0]}–R${readingNums[readingNums.length - 1]}` : `R${readingNums[0]}`;
    const titleLabel = chunk.map((r) => r.title).join(" & ");
    sets.push({
      title: `${titleLabel} — ${labelSuffix} (${rangeLabel})`,
      questions: chunk.flatMap((r) => r.questions),
    });
  }
  return sets;
}
