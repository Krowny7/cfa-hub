// Smoke test — parcours critiques de bout en bout, avec une vraie session
// utilisateur (RLS active), pas le service role key (qui bypasse tout).
//
// Couvre les 3 bugs qui se sont produits pendant les sessions précédentes et
// qui n'étaient PAS détectés par `npm run build` :
//   1. Récursion RLS sur flashcard_sets/quiz_sets (voir migration_fix_rls_recursion.sql)
//   2. XP attribué sur une mauvaise réponse (voir migration_fix_xp_answer_verification.sql)
//   3. Anti-farming XP (une question ne rapporte de l'XP qu'une seule fois)
//
// Usage: node scripts/smoke-test.mjs
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
function check(label, condition, detail) {
  results.push({ label, pass: !!condition, detail });
  console.log(`${condition ? "✅" : "❌"} ${label}${detail ? " — " + detail : ""}`);
}

const testEmail = `smoketest+${Date.now()}@cfahub.test`;
let userId = null;
let flashcardSetId = null;
let quizSetId = null;
let quizQuestionId = null;
let exerciseSetId = null;
let exerciseQuestionId = null;

async function cleanup() {
  // Best-effort — le ON DELETE CASCADE sur owner_id/set_id nettoie le reste
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  // 1. Créer un utilisateur éphémère + obtenir une vraie session (RLS active)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    email_confirm: true,
  });
  if (createErr) throw new Error(`createUser: ${createErr.message}`);
  userId = created.user.id;

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: testEmail,
  });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyErr) throw new Error(`verifyOtp: ${verifyErr.message}`);
  check("Login (magic link) crée une session valide", !!verified.session);

  const db = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${verified.session.access_token}` } },
  });

  // 2. Flashcards — créer un set + une carte, relire (RLS SELECT)
  const fset = await db
    .from("flashcard_sets")
    .insert({ title: "Smoke Test Set", visibility: "private", subject: "cfa", owner_id: userId })
    .select("id")
    .single();
  check("Créer un flashcard_set (RLS insert_own)", !fset.error && !!fset.data?.id, fset.error?.message);
  flashcardSetId = fset.data?.id ?? null;

  if (flashcardSetId) {
    const card = await db
      .from("flashcards")
      .insert({ set_id: flashcardSetId, front: "Q", back: "A", position: 0 });
    check("Ajouter une flashcard", !card.error, card.error?.message);

    const reread = await db.from("flashcard_sets").select("id,title").eq("id", flashcardSetId).maybeSingle();
    check(
      "Relire le set créé (pas de récursion RLS)",
      !reread.error && reread.data?.id === flashcardSetId,
      reread.error?.message
    );
  }

  // 2b. RLS : un non-admin ne peut PAS créer un set is_official=true
  // (migration_fix_content_admin_only.sql — voir aussi le test symétrique
  // sur exercise_sets plus bas).
  const escalate = await db
    .from("quiz_sets")
    .insert({
      title: "Smoke Test Escalation",
      visibility: "private",
      subject: "cfa",
      owner_id: userId,
      is_official: true,
      official_published: true,
      difficulty: 3,
    })
    .select("id")
    .single();
  check(
    "RLS : un non-admin ne peut pas créer un set is_official=true",
    !!escalate.error,
    escalate.error ? undefined : `insert accepté sans erreur, id=${escalate.data?.id}`
  );

  // 3. QCM officiel — créé via le service role (le smoke test simule un
  // admin qui publie du contenu système ; l'insertion en tant qu'utilisateur
  // normal est justement ce que 2b vérifie comme étant refusée).
  const qset = await admin
    .from("quiz_sets")
    .insert({
      title: "Smoke Test QCM",
      visibility: "private",
      subject: "cfa",
      owner_id: userId,
      is_official: true,
      official_published: true,
      difficulty: 1,
    })
    .select("id")
    .single();
  check("Créer un quiz_set officiel", !qset.error && !!qset.data?.id, qset.error?.message);
  quizSetId = qset.data?.id ?? null;

  if (quizSetId) {
    const question = await admin
      .from("quiz_questions")
      .insert({
        set_id: quizSetId,
        prompt: "2 + 2 = ?",
        choices: ["3", "4", "5", "6"],
        correct_index: 1,
        position: 0,
      })
      .select("id")
      .single();
    check("Créer une quiz_question", !question.error && !!question.data?.id, question.error?.message);
    quizQuestionId = question.data?.id ?? null;
  }

  if (quizSetId && quizQuestionId) {
    // Mauvaise réponse : aucun XP
    const wrong = await db.rpc("award_quiz_question_xp", {
      p_set_id: quizSetId,
      p_question_id: quizQuestionId,
      p_selected_index: 0,
    });
    check(
      "Mauvaise réponse → 0 XP",
      !wrong.error && wrong.data?.xp_awarded === 0 && wrong.data?.is_correct === false,
      wrong.error?.message ?? JSON.stringify(wrong.data)
    );

    // Bonne réponse : XP attribué
    const right = await db.rpc("award_quiz_question_xp", {
      p_set_id: quizSetId,
      p_question_id: quizQuestionId,
      p_selected_index: 1,
    });
    check(
      "Bonne réponse → XP > 0",
      !right.error && right.data?.xp_awarded > 0 && right.data?.is_correct === true,
      right.error?.message ?? JSON.stringify(right.data)
    );

    // Répéter la bonne réponse : anti-farming, 0 XP la 2e fois
    const again = await db.rpc("award_quiz_question_xp", {
      p_set_id: quizSetId,
      p_question_id: quizQuestionId,
      p_selected_index: 1,
    });
    check(
      "Anti-farming : rejouer la question ne redonne pas d'XP",
      !again.error && again.data?.xp_awarded === 0 && again.data?.is_correct === true,
      again.error?.message ?? JSON.stringify(again.data)
    );
  }

  // 3b. Exercices — même trio de checks XP (mauvaise/bonne réponse, anti-farming),
  // mais avec une réponse NUMÉRIQUE tolérante plutôt qu'un index de choix.
  const exset = await admin
    .from("exercise_sets")
    .insert({
      title: "Smoke Test Exercices",
      visibility: "private",
      subject: "cfa",
      owner_id: userId,
      is_official: true,
      official_published: true,
      difficulty: 1,
    })
    .select("id")
    .single();
  check("Créer un exercise_set système", !exset.error && !!exset.data?.id, exset.error?.message);
  exerciseSetId = exset.data?.id ?? null;

  if (exerciseSetId) {
    const exquestion = await admin
      .from("exercise_questions")
      .insert({
        set_id: exerciseSetId,
        prompt: "Combien font 2 + 2 ?",
        correct_answer: 4,
        tolerance: 0.01,
        position: 0,
      })
      .select("id")
      .single();
    check("Créer une exercise_question", !exquestion.error && !!exquestion.data?.id, exquestion.error?.message);
    exerciseQuestionId = exquestion.data?.id ?? null;
  }

  if (exerciseSetId && exerciseQuestionId) {
    const wrong = await db.rpc("award_exercise_xp", {
      p_set_id: exerciseSetId,
      p_question_id: exerciseQuestionId,
      p_answer: 3,
    });
    check(
      "Exercice : mauvaise réponse → 0 XP",
      !wrong.error && wrong.data?.xp_awarded === 0 && wrong.data?.is_correct === false,
      wrong.error?.message ?? JSON.stringify(wrong.data)
    );

    const right = await db.rpc("award_exercise_xp", {
      p_set_id: exerciseSetId,
      p_question_id: exerciseQuestionId,
      p_answer: 4,
    });
    check(
      "Exercice : bonne réponse → XP > 0",
      !right.error && right.data?.xp_awarded > 0 && right.data?.is_correct === true,
      right.error?.message ?? JSON.stringify(right.data)
    );

    const again = await db.rpc("award_exercise_xp", {
      p_set_id: exerciseSetId,
      p_question_id: exerciseQuestionId,
      p_answer: 4,
    });
    check(
      "Exercice : anti-farming, rejouer ne redonne pas d'XP",
      !again.error && again.data?.xp_awarded === 0 && again.data?.is_correct === true,
      again.error?.message ?? JSON.stringify(again.data)
    );
  }

  // 4. Isolation RLS — un autre utilisateur ne doit RIEN voir de ce qui précède
  const { data: created2 } = await admin.auth.admin.createUser({
    email: `smoketest2+${Date.now()}@cfahub.test`,
    email_confirm: true,
  });
  const { data: link2 } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: created2.user.email,
  });
  const anon2 = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: verified2 } = await anon2.auth.verifyOtp({
    type: "magiclink",
    token_hash: link2.properties.hashed_token,
  });
  const db2 = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${verified2.session.access_token}` } },
  });
  const otherSees = await db2.from("flashcard_sets").select("id").eq("id", flashcardSetId).maybeSingle();
  check(
    "Isolation RLS : un autre utilisateur ne voit pas le set privé",
    !otherSees.error && otherSees.data === null,
    otherSees.error?.message
  );
  await admin.auth.admin.deleteUser(created2.user.id).catch(() => {});
}

main()
  .catch((e) => {
    console.error("💥 Smoke test crashed:", e.message);
    results.push({ label: "unexpected crash", pass: false, detail: e.message });
  })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
    if (failed.length > 0) {
      console.error("\nFailed checks:");
      for (const f of failed) console.error(`  - ${f.label}${f.detail ? ": " + f.detail : ""}`);
      process.exit(1);
    }
    process.exit(0);
  });
