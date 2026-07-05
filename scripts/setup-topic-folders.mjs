// One-off script: organize existing/future Système content into per-topic
// folders (flashcards, quizzes, exercises), even for topics with no content
// yet — so the folder structure is ready as content gets added.
//
// Also cleans up "Revenu Fixe" (old flat QCM set, 15 questions), a leftover
// from before Fixed Income was reorganized into 6 subtheme sets — the
// original cleanup script silently matched 0 rows because this set belongs
// to a different account (akrown7@gmail.com) than the one used for the
// Fixed Income rebuild (chaumonttheo@gmail.com).
//
// Usage: node scripts/setup-topic-folders.mjs
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
const env = loadEnv(join(__dirname, "..", ".env.local"));

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Sujets CFA Level I couverts par les fiches (/fiches) + le contenu système
// existant. "matches" = titres exacts de quiz_sets déjà en base à rattacher
// à ce dossier (le set principal + son éventuelle variante "— Approfondi").
const TOPICS = [
  { name: "Éthique et Standards Professionnels", matches: ["Éthique et Standards Professionnels"] },
  { name: "Méthodes Quantitatives", matches: ["Méthodes Quantitatives", "Méthodes Quantitatives — Approfondi"] },
  { name: "Économie", matches: ["Économie", "Économie — Approfondi"] },
  { name: "Analyse des États Financiers", matches: ["Analyse des États Financiers"] },
  { name: "Finance d'Entreprise", matches: ["Finance d'Entreprise", "Finance d'Entreprise — Approfondi"] },
  { name: "Investissements en Actions", matches: ["Investissements en Actions"] },
  { name: "Instruments Dérivés", matches: ["Instruments Dérivés"] },
  { name: "Fixed Income", matches: [] }, // déjà organisé (folder existant)
  { name: "Investissements Alternatifs", matches: ["Investissements Alternatifs"] },
  { name: "Gestion de Portefeuille", matches: ["Gestion de Portefeuille"] },
];

async function findOwnerByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`User ${email} not found`);
  return user.id;
}

async function ensureFolder(name, kind, ownerId) {
  const { data: existing } = await supabase
    .from("library_folders")
    .select("id")
    .eq("name", name)
    .eq("kind", kind)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("library_folders")
    .insert({ name, kind, owner_id: ownerId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function main() {
  const quizOwnerId = await findOwnerByEmail("akrown7@gmail.com"); // owner of the pre-existing official QCM sets
  const otherOwnerId = await findOwnerByEmail("chaumonttheo@gmail.com"); // owner used for Fixed Income + all new content

  console.log("Suppression de l'ancien set 'Revenu Fixe' (superseded)...");
  const { error: delErr } = await supabase.from("quiz_sets").delete().eq("title", "Revenu Fixe").eq("is_official", true);
  if (delErr) throw delErr;

  for (const topic of TOPICS) {
    // Quiz folder + reattach existing official sets to it
    if (topic.matches.length > 0) {
      const folderId = await ensureFolder(`${topic.name} (Système)`, "quizzes", quizOwnerId);
      const { error } = await supabase
        .from("quiz_sets")
        .update({ folder_id: folderId })
        .in("title", topic.matches)
        .eq("is_official", true);
      if (error) throw error;
      console.log(`✓ QCM "${topic.name}" -> dossier créé/mis à jour, ${topic.matches.length} set(s) rattaché(s)`);
    } else {
      console.log(`- QCM "${topic.name}" : déjà organisé, ignoré`);
    }

    // Flashcards folder (empty for now, except Fixed Income which already has one)
    if (topic.name !== "Fixed Income") {
      await ensureFolder(`${topic.name} (Système)`, "flashcards", otherOwnerId);
      console.log(`✓ Flashcards "${topic.name}" -> dossier prêt (vide)`);
    }

    // Exercises folder (empty for all topics, including Fixed Income)
    await ensureFolder(`${topic.name} (Système)`, "exercises", otherOwnerId);
    console.log(`✓ Exercices "${topic.name}" -> dossier prêt (vide)`);
  }

  console.log("\n✅ Terminé.");
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
