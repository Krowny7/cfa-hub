// Upload initial des PDFs FSA et Portfolio Management vers le bucket privé
// "fiches" — même pattern que upload-fiche-equity.mjs. Pas de sauvegarde
// nécessaire : premier upload pour ces deux topics (vérifié via
// supabase.storage.from("fiches").list()).
// Usage: node scripts/upload-fiche-fsa-pm.mjs
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

const FILES = [
  ["C:\\Users\\chaum\\Downloads\\fsa_vault_sheet_full.pdf", "financial-statement-analysis.pdf"],
  ["C:\\Users\\chaum\\Downloads\\pm_vault_sheet_full.pdf", "portfolio-management.pdf"],
];

async function main() {
  for (const [localPath, storagePath] of FILES) {
    const file = readFileSync(localPath);
    const { error } = await supabase.storage.from("fiches").upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) throw error;
    console.log(`✅ Uploadé : ${storagePath} (${(file.length / 1024 / 1024).toFixed(2)} Mo)`);
  }
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
