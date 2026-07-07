// Seed script — Exercices Système Fixed Income (CFA Level I), format QCM à
// 3 options fidèle au format réel du CFA ("... is closest to:"), en anglais.
// Valeurs numériques sourcées et vérifiées depuis
// "_Projet__Fiche_Exercice_Fixed_Income.pdf" (bloc "Mini-calculs" et "Étude
// de cas"), corrigé vérifié dans le document — jamais recalculées à la main
// sans corrigé. Les distracteurs reflètent des erreurs de calcul plausibles
// (oubli d'un facteur, poids d'interpolation inversés, moyenne simple au
// lieu d'une pondération, etc.), dans l'esprit des distracteurs officiels CFA.
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
const SET_TITLE = "Duration, Convexity & Term Structure — Exercises";

// Chaque question : [prompt, choices[3], correct_index, explanation]
const QUESTIONS = [
  [
    "A bond has an initial price V0 = 106.4177 at an initial YTM y0 = 9% (par value 100, 10-year maturity, 10% coupon). You observe V+ = 106.3507 for y0 + 1bp and V− = 106.4847 for y0 − 1bp. Using PVBP ≈ (V− − V+) / 2, the PVBP is closest to:",
    ["0.034", "0.067", "0.134"],
    1,
    "PVBP ≈ (106.4847 − 106.3507) / 2 = 0.134 / 2 = 0.0670 (per 100 of par value). A is half this value (forgetting to divide by 2 a second time); C is the undivided difference V− − V+.",
  ],
  [
    "Using the PVBP of 0.0670 found above (V0 = 106.4177), the approximate modified duration, D̂mod ≈ PVBP / (V0 × 10⁻⁴), is closest to:",
    ["3.15", "6.30", "12.60"],
    1,
    "D̂mod = 0.0670 / (106.4177 × 0.0001) = 0.0670 / 0.01064177 ≈ 6.30. A and C are half and double this value, from common scaling errors in the 10⁻⁴ factor.",
  ],
  [
    "A bond has P0 = 102.40, modified duration Dmod = 7.2, and convexity C = 60. For a 50 bp increase in yield, the estimated percentage price change, ΔP/P ≈ −Dmod×Δy + ½×C×Δy², is closest to:",
    ["−3.60%", "−3.53%", "−3.64%"],
    1,
    "ΔP/P ≈ −7.2(0.005) + 0.5(60)(0.005)² = −0.036 + 0.00075 = −0.03525, or −3.53%. A ignores the convexity adjustment entirely (duration effect only); C subtracts the convexity term instead of adding it.",
  ],
  [
    "Using the −3.53% price change estimated above and P0 = 102.40, the approximate resulting price, P1 = P0 × (1 + ΔP/P), is closest to:",
    ["98.71", "98.79", "98.88"],
    1,
    "P1 ≈ 102.40 × (1 − 0.03525) ≈ 98.79. A uses the duration-only estimate (−3.60%); C incorrectly subtracts percentage points from the price instead of multiplying.",
  ],
  [
    "Given the par curve y(6 months) = 1.81% and y(2 years) = 2.91%, using linear interpolation the 1-year rate, ŷ(1yr), is closest to:",
    ["2.18%", "2.36%", "2.54%"],
    0,
    "ŷ(1yr) = 1.81%×(2−1)/(2−0.5) + 2.91%×(1−0.5)/(2−0.5) ≈ 2.18%. B is the simple (unweighted) average of the two rates; C results from swapping the interpolation weights.",
  ],
  [
    "Given the par curve y(2 years) = 2.91% and y(5 years) = 4.18%, using linear interpolation the 3-year rate, ŷ(3yr), is closest to:",
    ["3.33%", "3.55%", "3.76%"],
    0,
    "ŷ(3yr) = 2.91%×(5−3)/(5−2) + 4.18%×(3−2)/(5−2) ≈ 3.33%. B is the simple average of the two rates; C results from swapping the interpolation weights.",
  ],
  [
    "Given the same par curve, y(2 years) = 2.91% and y(5 years) = 4.18%, using linear interpolation the 4-year rate, ŷ(4yr), is closest to:",
    ["3.33%", "3.55%", "3.76%"],
    2,
    "ŷ(4yr) = 2.91%×(5−4)/(5−2) + 4.18%×(4−2)/(5−2) ≈ 3.76%. A results from swapping the interpolation weights; B is the simple average of the two rates.",
  ],
  [
    "With annual compounding, the 1-year spot rate s1 = 2.00% and the 2-year spot rate s2 = 2.50%. Using f1,2 = (1+s2)²/(1+s1) − 1, the 1-year forward rate one year from today is closest to:",
    ["0.49%", "0.50%", "3.00%"],
    2,
    "f1,2 = (1.025)²/1.02 − 1 = 1.050625/1.02 − 1 ≈ 3.00%. A comes from forgetting to square (1+s2); B is the naive difference s2 − s1, which ignores compounding.",
  ],
  [
    "A bond portfolio has an initial value V0 = 17,305,472. After a 100 bp parallel increase in yields, its value falls to V = 16,306,000. The percentage loss, (V − V0)/V0, is closest to:",
    ["−4.16%", "−5.78%", "−6.39%"],
    1,
    "(16,306,000 − 17,305,472) / 17,305,472 ≈ −5.78%. A and C are the standalone percentage losses of each individual bond in the portfolio (4.16% and 6.39%), which understate or overstate the blended portfolio result depending on position weights.",
  ],
  [
    "One position in a bond portfolio has V0 = 4,789,382 and, after a 50 bp increase in yields, V+50 = 4,688,324. Using PVBP ≈ (V0 − V+50) / 50, the position's PVBP (per basis point) is closest to:",
    ["1,010.58", "2,021.16", "4,042.32"],
    1,
    "PVBP ≈ (4,789,382 − 4,688,324) / 50 = 101,058 / 50 = 2,021.16 per basis point. A results from dividing by 100 instead of 50; C from dividing by 25 instead of 50.",
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

  console.log(`Suppression de l'ancien set (si déjà seedé)...`);
  await supabase.from("exercise_sets").delete().eq("owner_id", ownerId).eq("title", SET_TITLE);
  await supabase.from("exercise_sets").delete().eq("owner_id", ownerId).eq("title", "Duration, convexité & structure des taux — Exercices");

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

  const rows = QUESTIONS.map(([prompt, choices, correct_index, explanation], i) => ({
    set_id: newSet.id,
    prompt,
    choices,
    correct_index,
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
