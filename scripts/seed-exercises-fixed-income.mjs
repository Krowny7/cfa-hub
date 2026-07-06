// Seed script — Exercices Système Fixed Income (CFA Level I).
// Sourcé depuis "_Projet__Fiche_Exercice_Fixed_Income.pdf" (bloc "Mini-calculs"
// et "Étude de cas"), réponses vérifiées contre le corrigé du document —
// jamais recalculées à la main sans corrigé.
// Usage: node scripts/seed-exercises-fixed-income.mjs
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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FOLDER_NAME = "Fixed Income (Système)";
const SET_TITLE = "Duration, convexité & structure des taux — Exercices";

// Chaque question : [prompt, correct_answer, tolerance, unit, explanation]
const QUESTIONS = [
  [
    "Une obligation a un prix initial V0 = 106,4177 pour un TRA y0 = 9 % (nominal 100, maturité 10 ans, coupon 10 %). On observe V+ = 106,3507 pour y0+1bp et V− = 106,4847 pour y0−1bp. Calcule une estimation centrale de la PVBP : PVBP ≈ (V− − V+) / 2.",
    0.067,
    0.002,
    null,
    "PVBP ≈ (106,4847 − 106,3507) / 2 = 0,134 / 2 = 0,0670 (par 100 de nominal).",
  ],
  [
    "À partir du résultat précédent (PVBP ≈ 0,0670, V0 = 106,4177), déduis une approximation de la duration modifiée : D̂mod ≈ PVBP / (V0 × 10⁻⁴).",
    6.30,
    0.1,
    null,
    "D̂mod = 0,0670 / (106,4177 × 0,0001) = 0,0670 / 0,01064177 ≈ 6,30.",
  ],
  [
    "Une obligation a P0 = 102,40, Dmod = 7,2, convexité C = 60. Estime la variation relative de prix (en %) pour une hausse de taux de +50 bp : ΔP/P ≈ −Dmod×Δy + ½×C×Δy² (Δy en décimal, 50 bp = 0,005).",
    -3.525,
    0.05,
    "%",
    "ΔP/P ≈ −7,2×0,005 + 0,5×60×0,005² = −0,036 + 0,00075 = −0,03525, soit −3,525 %.",
  ],
  [
    "Avec la variation relative de −3,525 % trouvée précédemment et P0 = 102,40, calcule le prix approximatif P1 = P0 × (1 + ΔP/P).",
    98.79,
    0.05,
    null,
    "P1 ≈ 102,40 × (1 − 0,03525) ≈ 98,79.",
  ],
  [
    "Sur la courbe des taux : y(6 mois) = 1,81 %, y(2 ans) = 2,91 %. Par interpolation linéaire, calcule ŷ(1 an) en % : ŷ = y1×(t2−t)/(t2−t1) + y2×(t−t1)/(t2−t1).",
    2.18,
    0.02,
    "%",
    "ŷ(1 an) = 1,81%×(2−1)/(2−0,5) + 2,91%×(1−0,5)/(2−0,5) ≈ 2,18 %.",
  ],
  [
    "Sur la courbe des taux : y(2 ans) = 2,91 %, y(5 ans) = 4,18 %. Par interpolation linéaire, calcule ŷ(3 ans) en %.",
    3.33,
    0.02,
    "%",
    "ŷ(3 ans) = 2,91%×(5−3)/(5−2) + 4,18%×(3−2)/(5−2) ≈ 3,33 %.",
  ],
  [
    "Sur la courbe des taux : y(2 ans) = 2,91 %, y(5 ans) = 4,18 %. Par interpolation linéaire, calcule ŷ(4 ans) en %.",
    3.76,
    0.02,
    "%",
    "ŷ(4 ans) = 2,91%×(5−4)/(5−2) + 4,18%×(4−2)/(5−2) ≈ 3,76 %.",
  ],
  [
    "Avec capitalisation annuelle, s1 = 2,00 % et s2 = 2,50 %. Calcule le forward 1 an dans 1 an (en %) : f1,2 = (1+s2)²/(1+s1) − 1.",
    3.00,
    0.02,
    "%",
    "f1,2 = (1,025)²/1,02 − 1 = 1,050625/1,02 − 1 ≈ 0,0300, soit 3,00 %.",
  ],
  [
    "Un portefeuille obligataire a une valeur initiale V0 = 17 305 472. Après un choc parallèle de +100 bp, sa valeur devient V = 16 306 000. Calcule la perte en % (valeur négative) : (V−V0)/V0 × 100.",
    -5.78,
    0.05,
    "%",
    "(16 306 000 − 17 305 472) / 17 305 472 × 100 ≈ −5,78 %.",
  ],
  [
    "Obligation d'un portefeuille : V0 = 4 789 382, V(+50 bp) = 4 688 324. Calcule la PVBP approximée (valeur monétaire par point de base) : PVBP ≈ (V0 − V+50) / 50.",
    2021.16,
    5,
    null,
    "PVBP ≈ (4 789 382 − 4 688 324) / 50 = 101 058 / 50 = 2 021,16 par point de base.",
  ],
];

const OWNER_EMAIL = "chaumonttheo@gmail.com";

async function main() {
  console.log(`Recherche du owner (${OWNER_EMAIL})...`);
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 100 });
  if (userErr) throw userErr;
  const owner = users.users.find((u) => u.email === OWNER_EMAIL);
  if (!owner) {
    console.error(`Utilisateur ${OWNER_EMAIL} introuvable.`);
    process.exit(1);
  }
  const ownerId = owner.id;

  console.log(`Suppression de l'ancien set "${SET_TITLE}" (si déjà seedé)...`);
  await supabase.from("exercise_sets").delete().eq("owner_id", ownerId).eq("title", SET_TITLE);

  console.log(`Création/recherche du dossier "${FOLDER_NAME}"...`);
  let { data: folder } = await supabase
    .from("library_folders")
    .select("id")
    .eq("name", FOLDER_NAME)
    .eq("kind", "exercises")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!folder) {
    const { data: newFolder, error: folderErr } = await supabase
      .from("library_folders")
      .insert({ name: FOLDER_NAME, kind: "exercises", owner_id: ownerId })
      .select("id")
      .single();
    if (folderErr) throw folderErr;
    folder = newFolder;
  }

  console.log(`\nCréation du set: ${SET_TITLE} (${QUESTIONS.length} exercices)`);
  const { data: newSet, error: setErr } = await supabase
    .from("exercise_sets")
    .insert({
      title: SET_TITLE,
      visibility: "public",
      subject: "cfa",
      owner_id: ownerId,
      folder_id: folder.id,
      is_official: true,
      official_published: true,
      cfa_level: 1,
      difficulty: 2,
    })
    .select("id")
    .single();
  if (setErr) throw setErr;

  const rows = QUESTIONS.map(([prompt, correct_answer, tolerance, unit, explanation], i) => ({
    set_id: newSet.id,
    prompt,
    correct_answer,
    tolerance,
    unit,
    explanation,
    position: i + 1,
  }));

  const { error: qErr } = await supabase.from("exercise_questions").insert(rows);
  if (qErr) throw qErr;

  console.log(`✓ ${rows.length} exercices insérés (set ${newSet.id})`);
  console.log("\n✅ Terminé.");
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
