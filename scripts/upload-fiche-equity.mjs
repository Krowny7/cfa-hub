// Upload initial du PDF de la fiche Equity vers le bucket privé "fiches"
// (voir migration_fiches_storage.sql) — même pattern que l'upload initial
// de fixed-income.pdf, fait via service-role, pas depuis l'app.
// Usage: node scripts/upload-fiche-equity.mjs
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

const PDF_PATH = "C:\\Users\\chaum\\Downloads\\equity_vault_sheet_full.pdf";
const STORAGE_PATH = "equity.pdf";

async function main() {
  const file = readFileSync(PDF_PATH);
  const { error } = await supabase.storage.from("fiches").upload(STORAGE_PATH, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  console.log(`✅ Uploadé : ${STORAGE_PATH} (${(file.length / 1024 / 1024).toFixed(2)} Mo)`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
