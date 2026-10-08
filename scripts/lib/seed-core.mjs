// Coeur partagé des scripts de seed QCM/Exercices — évite de dupliquer la
// logique Supabase (env, owner, dossier, delete-then-insert) dans chaque
// script par topic. Format question partout : [prompt, choices[3],
// correct_index, explanation].
import { createClient } from "@supabase/supabase-js";
import { exigerLangues } from "./langue.mjs";
import { etiqueter } from "../notions/etiquettes.mjs";
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

// Notion et concept des questions d'un seed (colonnes de migration_notions.sql),
// d'après scripts/notions/rattachement.json : un re-seed les remet d'office.
async function poserNotions(setIds) {
  const r = await etiqueter(supabase, { setIds });
  if (r.absentes) return console.log("  (notions : migration_notions.sql pas encore collée, rien posé)");
  if (r.ecrites) console.log(`  notions posées sur ${r.ecrites} questions`);
  if (r.sansDonnee) console.log(`  ${r.sansDonnee} questions sans notion connue : relancer scripts/notions/rattacher.mjs puis synchroniser.mjs`);
}

// sets: [{ title, questions: [[prompt, choices, correct_index, explanation], ...] }]
export async function seedQuizSets({ ownerId, folderId, sets, oldTitles = [] }) {
  exigerLangues(sets); // énoncé et choix en anglais, explication en français (scripts/lib/langue.mjs)
  const titlesToDelete = [...new Set([...sets.map((s) => s.title), ...oldTitles])];
  // is_official (pas owner_id) : le contenu Système remplacé peut avoir été
  // créé par un autre compte admin — voir la note sur ensureFolder.
  const { data: toDelete } = await supabase.from("quiz_sets").select("id").eq("is_official", true).in("title", titlesToDelete);
  if (toDelete?.length) {
    await supabase.from("quiz_questions").delete().in("set_id", toDelete.map((s) => s.id));
    await supabase.from("quiz_sets").delete().in("id", toDelete.map((s) => s.id));
  }

  let total = 0;
  const setIds = [];
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
    setIds.push(newSet.id);
  }
  await poserNotions(setIds);
  return total;
}

// La série de réserve d'un set : « Réserve — <titre> », officielle mais non
// publiée (ni fiche, ni banque, ni QCM : la fiche lit ses sets par début de
// titre). Créée au premier besoin.
async function serieReserve({ ownerId, folderId, title, difficulty }) {
  const reserve = `Réserve — ${title}`;
  const { data: found, error } = await supabase.from("quiz_sets").select("id").eq("is_official", true).eq("title", reserve);
  if (error) throw error;
  if (found?.length) return found[0].id;
  const { data: created, error: insErr } = await supabase
    .from("quiz_sets")
    .insert({ title: reserve, visibility: "private", subject: "cfa", owner_id: ownerId, folder_id: folderId, is_official: true, official_published: false, cfa_level: 1, difficulty: difficulty ?? 2 })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created.id;
}

// Comme seedQuizSets, mais met le set à jour EN PLACE au lieu de le supprimer
// puis le recréer : le journal de réponses (quiz_answer_log, en ON DELETE
// CASCADE sur set_id et question_id) est ainsi conservé. Une question déjà en
// base dont l'énoncé est identique garde son id (et donc son historique) ;
// les nouvelles sont insérées ; celles qui ne figurent plus dans la liste (et
// les doublons d'énoncé) sont rangées dans sa série de réserve, non publiée,
// avec leur historique : rien n'est effacé.
// sets: [{ title, questions: [[prompt, choices, correct_index, explanation], ...] }]
export async function syncQuizSets({ ownerId, folderId, sets }) {
  exigerLangues(sets); // énoncé et choix en anglais, explication en français (scripts/lib/langue.mjs)
  let total = 0;
  for (const set of sets) {
    const { data: found, error: findErr } = await supabase
      .from("quiz_sets")
      .select("id")
      .eq("is_official", true)
      .eq("title", set.title);
    if (findErr) throw findErr;
    if (!found?.length) {
      total += await seedQuizSets({ ownerId, folderId, sets: [set] });
      continue;
    }
    if (found.length > 1) throw new Error(`Plusieurs sets officiels "${set.title}" : à nettoyer à la main.`);
    const setId = found[0].id;

    const { data: existing, error: exErr } = await supabase.from("quiz_questions").select("id, prompt, position").eq("set_id", setId);
    if (exErr) throw exErr;
    // Décale les positions existantes pour éviter toute collision pendant la mise à jour
    for (const q of existing) {
      const { error } = await supabase.from("quiz_questions").update({ position: q.position + 1000 }).eq("id", q.id);
      if (error) throw error;
    }
    const free = new Map();
    for (const q of existing) if (!free.has(q.prompt)) free.set(q.prompt, q.id);
    const matched = new Set();

    let kept = 0;
    const inserts = [];
    for (const [i, [prompt, choices, correct_index, explanation]] of set.questions.entries()) {
      const id = free.get(prompt);
      if (id) {
        free.delete(prompt);
        matched.add(id);
        const { error } = await supabase.from("quiz_questions").update({ choices, correct_index, explanation, position: i + 1 }).eq("id", id);
        if (error) throw error;
        kept++;
      } else {
        inserts.push({ set_id: setId, prompt, choices, correct_index, explanation, position: i + 1 });
      }
    }
    if (inserts.length) {
      const { error } = await supabase.from("quiz_questions").insert(inserts);
      if (error) throw error;
    }
    // retirées du set (doublons d'énoncé compris) : pas effacées, rangées dans
    // une série de réserve non publiée, avec leur historique de réponses
    const stale = existing.map((q) => q.id).filter((id) => !matched.has(id));
    if (stale.length) {
      const reserveId = await serieReserve({ ownerId, folderId, title: set.title, difficulty: set.difficulty });
      const { data: last } = await supabase.from("quiz_questions").select("position").eq("set_id", reserveId).order("position", { ascending: false }).limit(1);
      let pos = (last?.[0]?.position ?? 0) + 1;
      for (const id of stale) {
        const { error } = await supabase.from("quiz_questions").update({ set_id: reserveId, position: pos++ }).eq("id", id);
        if (error) throw error;
      }
    }
    console.log(`  ✓ QCM "${set.title}" — ${set.questions.length} questions (${kept} conservées avec leur historique, ${inserts.length} ajoutées, ${stale.length} rangées dans la réserve)`);
    total += set.questions.length;
    await poserNotions([setId]);
  }
  return total;
}

// sets: [{ title, questions: [[prompt, choices, correct_index, explanation], ...] }]
export async function seedExerciseSets({ ownerId, folderId, sets, oldTitles = [] }) {
  exigerLangues(sets); // énoncé et choix en anglais, explication en français (scripts/lib/langue.mjs)
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

// sets: [{ title, cards: [[front, back], ...] }]
export async function seedFlashcardSets({ ownerId, folderId, sets, oldTitles = [] }) {
  const titlesToDelete = [...new Set([...sets.map((s) => s.title), ...oldTitles])];
  // is_official (pas owner_id) — voir la note sur seedQuizSets.
  const { data: toDelete } = await supabase.from("flashcard_sets").select("id").eq("is_official", true).in("title", titlesToDelete);
  if (toDelete?.length) {
    await supabase.from("flashcards").delete().in("set_id", toDelete.map((s) => s.id));
    await supabase.from("flashcard_sets").delete().in("id", toDelete.map((s) => s.id));
  }

  let total = 0;
  for (const set of sets) {
    const { data: newSet, error: setErr } = await supabase
      .from("flashcard_sets")
      .insert({
        title: set.title,
        visibility: "public",
        subject: "cfa",
        owner_id: ownerId,
        folder_id: folderId,
        is_official: true,
        official_published: true,
      })
      .select("id")
      .single();
    if (setErr) throw setErr;

    const rows = set.cards.map(([front, back], i) => ({
      set_id: newSet.id,
      front,
      back,
      position: i + 1,
    }));
    const { error: cErr } = await supabase.from("flashcards").insert(rows);
    if (cErr) throw cErr;

    console.log(`  ✓ Flashcards "${set.title}" — ${rows.length} cartes (set ${newSet.id})`);
    total += rows.length;
  }
  return total;
}

export function loadJson(scratchpadFile) {
  // dossier des JSON source, passé par l'environnement (jamais de chemin local
  // codé en dur dans le dépôt : un antislash suivi d'un chiffre hexadécimal
  // casse le CSS Tailwind du site)
  const base = process.env.RL_SEED_DATA;
  if (!base) throw new Error("RL_SEED_DATA : indique le dossier des fichiers JSON source (ex. RL_SEED_DATA=... node scripts/seed-xxx.mjs)");
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
