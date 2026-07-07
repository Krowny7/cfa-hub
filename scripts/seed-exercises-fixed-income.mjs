// Seed script — Exercices Système Fixed Income (CFA Level I), format QCM à
// 3 options fidèle au format réel du CFA ("... is closest to:"), en anglais.
// Contenu sourcé et vérifié depuis la banque de practice exams CFA (voir
// mémoire cfa-practice-exams-bank.md) :
//   Practise Exams/Fixed income/Reading 59 (Duration) — Answers
//   Practise Exams/Fixed income/Reading 60 (Convexity) — Answers
//   Practise Exams/Fixed income/Reading 57 (Term Structure) — Answers
// Seules les questions nécessitant un vrai calcul ont été retenues (les
// questions purement conceptuelles restent hors scope des Exercices — elles
// relèvent du QCM). Réponses et choix repris tels quels du corrigé vérifié —
// jamais recalculés à la main sans lui.
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

// Chaque question : [prompt, choices[3], correct_index, explanation]
const DURATION_SET = {
  title: "Yield-Based Duration Measures — Exercises (R59)",
  questions: [
    [
      "The price value of a basis point (PVBP) for an 18-year, 8% annual-pay bond with a par value of $1,000 and a yield of 9% is closest to:",
      ["$0.44", "$0.80", "$0.82"],
      2,
      "Initial price (N=18, PMT=80, FV=1000, I/Y=9%) = 912.44. Price with yield +1bp (I/Y=9.01%) = 911.63. PVBP = 912.44 − 911.63 = 0.82.",
    ],
    [
      "A 30-year semi-annual coupon bond issued today with market rates at 6.75% pays a 6.75% coupon. If the market yield declines by 30 basis points, the price increases to $1,039.59. If the market yield rises by 30 basis points, the price decreases to $962.77. The bond's approximate modified duration is closest to:",
      ["1.3", "12.8", "3.9"],
      1,
      "Approximate modified duration = (V− − V+) / (2 × V0 × Δy). Initial price is par ($1,000) since the bond is issued today at par: (1,039.59 − 962.77) / (2 × 1,000 × 0.003) = 76.82 / 6.00 = 12.80.",
    ],
    [
      "Martina Whittaker runs a fixed-income portfolio that contains a $12 million full price position in the corporate bonds of Dewey Treadmills. She has calculated an annual modified duration of 8.0 for the Dewey bonds. The money duration of the position is closest to:",
      ["$9.6 million", "$48.0 million", "$96.0 million"],
      2,
      "Money duration = annual modified duration × portfolio value = 8 × $12 million = $96,000,000.",
    ],
    [
      "Consider a 25-year, $1,000 par semiannual-pay bond with a 7.5% coupon and a 9.25% YTM. Based on a yield change of 50 basis points, the approximate modified duration of the bond is closest to:",
      ["10.03", "12.50", "8.73"],
      0,
      "Current price (N=50, PMT=37.50, I/Y=4.625) = $830.54. Price at +50bp (I/Y=4.875) = $790.59. Price at −50bp (I/Y=4.375) = $873.93. Approximate modified duration = (873.93 − 790.59) / (2 × 830.54 × 0.005) = 10.03.",
    ],
    [
      "A non-callable bond with 10 years remaining maturity has an annual coupon of 5.5% and a $1,000 par value. The yield to maturity on the bond is 4.7%. The estimated price change of the bond using duration if rates rise by 75 basis points is closest to:",
      ["-$5.68", "-$47.34", "-$61.10"],
      2,
      "Current price (N=10, PMT=55, I/Y=4.7) = $1,062.68. Price at +75bp (I/Y=5.45%) = $1,003.78. Price at −75bp (I/Y=3.95%) = $1,126.03. Modified duration = (1,126.03 − 1,003.78) / (2 × 1,062.68 × 0.0075) = 7.67. Estimated price change = −(7.67)(0.75%) × $1,062.68 = −$61.10.",
    ],
    [
      "The price value of a basis point (PVBP) for a 7-year, 10% semiannual-pay bond with a par value of $1,000 and a yield of 6% is closest to:",
      ["$0.28", "$0.64", "$0.92"],
      1,
      "Initial price (N=14, PMT=50, I/Y=3%) = $1,225.92. Price at yield +1bp (I/Y=3.005%) = $1,225.28. PVBP = 1,225.92 − 1,225.28 = 0.64.",
    ],
    [
      "The current price of a $1,000 par value, 6-year, 4.2% semiannual coupon bond is $958.97. The bond's price value of a basis point is closest to:",
      ["$4.20", "$5.01", "$0.50"],
      2,
      "First find YTM: PV=−958.97, FV=1,000, PMT=21, N=12 → I/Y=2.5% semiannual, or 5.0% annualized. Price at yield +1bp (I/Y=2.505%) = $958.47. PVBP = 958.97 − 958.47 = 0.50.",
    ],
    [
      "The approximate modified duration of an option-free 20-year 7% annual-pay par bond, based on a 25 basis point change in yield, is closest to:",
      ["5.3", "10.6", "13.7"],
      1,
      "At a yield of 7.25%, price = 97.402; at 6.75%, price = 102.701. Approximate modified duration = (102.701 − 97.402) / (2 × 100 × 0.0025) = 10.60.",
    ],
    [
      "The current price of an annual-pay bond is 102.50 per 100 of face value. If its YTM increases by 0.5% the price decreases to 100, and if its YTM decreases by 0.5% the price increases to 105.5. The approximate modified duration of the bond is closest to:",
      ["5.37", "5.48", "5.50"],
      0,
      "Approximate modified duration = (105.50 − 100) / (2 × 102.50 × 0.005) = 5.37.",
    ],
    [
      "An investor finds that for a 1% increase in yield to maturity, a bond's price will decrease by 4.21% compared to a 4.45% increase in value for a 1% decline in YTM. If the bond is currently trading at par value, the bond's approximate modified duration is closest to:",
      ["43.30", "4.33", "8.66"],
      1,
      "Approximate modified duration = (V− − V+) / [2 × V0 × Δy] = (104.45 − 95.79) / (2 × 100 × 0.01) = 4.33.",
    ],
    [
      "A $100,000 par value bond has a full price of $99,300, a Macaulay duration of 6.5, and an annual modified duration of 6.1. The bond's money duration per $100 par value is closest to:",
      ["$606", "$645", "$6.06"],
      0,
      "Money duration per $100 par value = annual modified duration × full price per $100 par value = 6.1 × $99.30 = $605.73.",
    ],
    [
      "A bond with a yield to maturity of 8.0% is priced at 96.00. If its yield increases to 8.3% its price will decrease to 94.06. If its yield decreases to 7.7% its price will increase to 98.47. The modified duration of the bond is closest to:",
      ["4.34", "7.66", "2.75"],
      1,
      "The change in yield is 30 basis points. Approximate modified duration = (98.47 − 94.06) / (2 × 96.00 × 0.003) = 7.66.",
    ],
    [
      "An option-free 5-year 6% annual-pay bond is selling at $979.22 per $1,000 of par value and has a Macaulay duration of 4.4587. The bond's modified duration is closest to:",
      ["4.187", "4.206", "4.246"],
      0,
      "First find YTM: N=5, PV=−979.22, PMT=60, FV=1,000 → I/Y=6.5%. Modified duration = Macaulay duration / (1 + YTM) = 4.4587 / 1.065 = 4.187.",
    ],
  ],
};

const CONVEXITY_SET = {
  title: "Yield-Based Convexity & Portfolio Properties — Exercises (R60)",
  questions: [
    [
      "A fixed-income portfolio has a market value of $7,545,000 and a portfolio duration of 6.24. If the yield for all securities in the portfolio declines by 25 basis points, the change in the market value of the portfolio is closest to:",
      ["a decrease of approximately $117,700", "an increase of approximately $117,700", "an increase of approximately 6.24%"],
      1,
      "Expected change in value = $7,545,000 × 6.24 × 0.0025 = $117,702. A decrease in yields causes an increase in portfolio value.",
    ],
    [
      "An annual-pay bond is priced at 101.50. If its yield to maturity decreases 100 basis points, its price will increase to 105.90. If its yield to maturity increases 100 basis points, its price will decrease to 97.30. The bond's approximate modified convexity is closest to:",
      ["0.2", "19.7", "4.2"],
      1,
      "Approximate modified convexity = [V− + V+ − 2V0] / [V0 × (Δy)²] = [105.90 + 97.30 − 2(101.50)] / [101.50 × (0.01)²] = 19.70.",
    ],
    [
      "A bond is priced at 95.80. Using a pricing model, an analyst estimates that a 25 bp parallel upward shift in the yield curve would decrease the bond's price to 94.75, while a 25 bp parallel downward shift would increase its price to 96.75. The bond's effective convexity is closest to:",
      ["3,340", "4", "-167"],
      2,
      "Approximate effective convexity = [V− + V+ − 2V0] / [V0 × (Δcurve)²] = [96.75 + 94.75 − 2(95.80)] / [95.80 × (0.0025)²] = −167.01.",
    ],
    [
      "The annual convexity of a bond is calculated as 12.35. If the full price of the bond position is $1.5 million and the bond matures in three years, the money convexity is closest to:",
      ["$55,575,000", "$6,175,000", "$18,525,000"],
      2,
      "Money convexity = annual convexity × full price of the position = 12.35 × $1,500,000 = $18,525,000. The maturity of the bond does not impact the calculation.",
    ],
    [
      "A bond currently trading at 102.5 percent of par value has an approximate modified duration of 6.5 and an approximate convexity of 28.0. If the bond's yield increases by 200 basis points, its estimated price is closest to:",
      ["89.75", "89.18", "90.32"],
      0,
      "Estimated %ΔPrice = −6.5(0.02) + 0.5(28.0)(0.02)² = −0.1244. Estimated price = 102.5 × (1 − 0.1244) = 89.75.",
    ],
    [
      "A bond is currently priced at 92.35. If the calculated modified duration is 3.27 and the convexity is 15.74, the expected price change due to a 25 basis point decrease in yields is closest to:",
      ["0.8126%", "0.8028%", "0.8224%"],
      2,
      "%ΔPrice = −ModDur × Δy + ½ × Convexity × Δy² = (−3.27 × −0.0025) + (0.5 × 15.74 × 0.0025²) = 0.008224, or 0.8224%.",
    ],
    [
      "A bond is currently priced at 92.35. If the calculated modified duration is 3.27 and the convexity is 15.74, the expected new price of the bond due to a 50 basis point increase in yields is closest to:",
      ["91.591", "90.859", "93.878"],
      1,
      "%ΔPrice = (−3.27 × 0.005) + (0.5 × 15.74 × 0.005²) = −1.615%. New price = 92.35 × (1 − 0.01615) = 90.859.",
    ],
    [
      "A bond portfolio consists of a AAA bond, a AA bond, and an A bond, priced at $1,050, $1,000, and $950 respectively, with durations of 8, 6, and 4 respectively. The duration of the portfolio is closest to:",
      ["6.00", "6.07", "6.67"],
      1,
      "Portfolio duration = weighted average of individual durations, weighted by value: 8×(1050/3000) + 6×(1000/3000) + 4×(950/3000) = 2.80 + 2.00 + 1.27 = 6.07.",
    ],
  ],
};

const TERM_STRUCTURE_SET = {
  title: "Term Structure: Spot, Par & Forward Curves — Exercises (R57)",
  questions: [
    [
      "The two-year spot rate is 5.89% and the one-year forward rate one year from now is 6.05%. Assuming annual compounding, the one-year spot rate is closest to:",
      ["5.67%", "5.73%", "5.91%"],
      1,
      "spot rate(0,1) = (1+0.0589)² / (1+0.0605)¹ − 1 = 5.73%.",
    ],
    [
      "Using the spot rates below to price a bond, the present value of a three-year security that pays a fixed annual coupon of 6% is closest to:\n\nYear 1: 5.0% · Year 2: 5.5% · Year 3: 6.0%",
      ["102.46", "95.07", "100.10"],
      2,
      "Present value = 6/1.05 + 6/1.055² + 106/1.06³ = 100.10. (95.07 results if the final coupon payment is mistakenly neglected.)",
    ],
    [
      "The 1-year spot rate is 3.75%. The 1-year forward rate one year from today is 9.50%, and the 1-year forward rate two years from today is 15.80%. Based on annual compounding, the price an investor should pay for each $100 of par value of a three-year, zero-coupon bond is closest to:",
      ["$76", "$44", "$33"],
      0,
      "The 3-year spot rate: (1+Z3)³ = (1.0375)(1.095)(1.158) = 1.31556 → Z3 = 9.573%. Price = 100 / (1.0375 × 1.095 × 1.158) ≈ $76.02.",
    ],
    [
      "The one-year spot rate is 6% and the one-year forward rates starting in one, two, and three years respectively are 6.5%, 6.8%, and 7%. The four-year spot rate is closest to:",
      ["6.51%", "6.57%", "6.58%"],
      1,
      "Four-year spot rate = [(1.06)(1.065)(1.068)(1.07)]^(1/4) − 1 = 6.57%.",
    ],
    [
      "The six-year spot rate is 7% and the five-year spot rate is 6%. The implied one-year forward rate five years from now is closest to:",
      ["12.0%", "5.0%", "6.5%"],
      0,
      "5y1y = [(1.07)^6 / (1.06)^5] − 1 = [1.5 / 1.338] − 1 ≈ 12.0%.",
    ],
    [
      "Suppose the 3-year spot rate is 12.1% and the 2-year spot rate is 11.3%. The 1-year forward rate two years from today is closest to:",
      ["13.2%", "13.7%", "12.1%"],
      1,
      "(1+2y1y) = (1+S3)³ / (1+S2)² = (1.121)³ / (1.113)² ≈ 1.137, so 2y1y = 13.7%.",
    ],
    [
      "The one-year spot rate is 5% and the two-year spot rate is 6.5%. The one-year forward rate starting one year from now is closest to:",
      ["5.00%", "7.87%", "8.02%"],
      2,
      "One-year forward rate = 1.065² / 1.05 − 1 = 8.02%.",
    ],
    [
      "The current 4-year spot rate is 4% and the current 5-year spot rate is 5.5%. The 1-year forward rate in four years is closest to:",
      ["9.58%", "11.72%", "10.14%"],
      1,
      "4y1y = (1.055)^5 / (1.04)^4 − 1 = 11.72%.",
    ],
    [
      "A 3-year option-free bond (par value $1,000) has an annual coupon of 9%. Spot rates: year 1 = 6%, year 2 = 12%, year 3 = 13%. Using the arbitrage-free valuation approach, the bond price is closest to:",
      ["$912", "$968", "$1,080"],
      0,
      "Price = 90/(1.06) + 90/(1.12)² + 1,090/(1.13)³ = 84.91 + 71.75 + 755.42 = $912.08.",
    ],
    [
      "An investor just invested in a 2-year bond with a yield of 3.2% instead of the 5-year spot rate currently at 4.0%. What 3-year forward rate beginning two years from now would let the investor earn a return equivalent to the 5-year spot rate?",
      ["4.5%", "5.6%", "3.5%"],
      0,
      "(1.04^5 / 1.032^2)^(1/3) − 1 = 4.5%.",
    ],
    [
      "Assume the following government spot yield curve: 1-year = 5%, 2-year = 6%, 3-year = 7%. If a 3-year annual-pay government bond has a coupon of 6%, its yield to maturity is closest to:",
      ["6.08%", "6.92%", "7.00%"],
      1,
      "Bond price = 6/1.05 + 6/1.06² + 106/1.07³ = 97.58. Then N=3, PMT=6, FV=100, PV=−97.58 → I/Y = 6.92%.",
    ],
    [
      "The one-year spot rate is 7.00%. One-year forward rates are 8.15% one year from today, 10.30% two years from today, and 12.00% three years from today. The value today of a 4-year, $1,000 par value, zero-coupon bond is closest to:",
      ["$665", "$700", "$640"],
      1,
      "4-year spot rate = [(1.07)(1.0815)(1.103)(1.12)]^(1/4) − 1 = 9.35%. N=4, FV=1,000, I/Y=9.35 → PV ≈ $699.40.",
    ],
    [
      "A 4% Treasury bond has 2.5 years to maturity. Spot rates: 6mo=2%, 1yr=2.5%, 1.5yr=3%, 2yr=4%, 2.5yr=6%. The bond is currently selling for $976. The arbitrage profit, if any, that is possible is closest to:",
      ["$37.63", "$43.22", "$19.22"],
      2,
      "No-arbitrage price = 20/1.01 + 20/1.0125² + 20/1.015³ + 20/1.02⁴ + 1020/1.03⁵ = 19.80+19.51+19.13+18.48+879.86 = $956.78. Arbitrage profit = 976 − 956.78 = $19.22.",
    ],
  ],
};

const SETS = [DURATION_SET, CONVEXITY_SET, TERM_STRUCTURE_SET];

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

  console.log("Suppression des anciens sets Fixed Income Exercices (si déjà seedés)...");
  const oldTitles = [
    ...SETS.map((s) => s.title),
    "Duration, convexité & structure des taux — Exercices",
    "Duration, Convexity & Term Structure — Exercises",
  ];
  await supabase.from("exercise_sets").delete().eq("owner_id", ownerId).in("title", oldTitles);

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

  let total = 0;
  for (const set of SETS) {
    console.log(`\nCréation du set: ${set.title} (${set.questions.length} exercices)`);
    const { data: newSet, error: setErr } = await supabase
      .from("exercise_sets")
      .insert({
        title: set.title,
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

    console.log(`  ✓ ${rows.length} exercices insérés (set ${newSet.id})`);
    total += rows.length;
  }

  console.log(`\n✅ Terminé. ${total} exercices au total sur ${SETS.length} sets.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
