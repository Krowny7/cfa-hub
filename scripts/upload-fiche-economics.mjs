// Upload du PDF de la fiche Economics vers le bucket privé "fiches"
// (chemin "economics.pdf") — même pattern que upload-fiche-fsa-pm.mjs, via
// la clé service-role de .env.local. Le chemin du PDF est passé en argument
// (jamais codé en dur dans le dépôt).
// Usage: node scripts/upload-fiche-economics.mjs <chemin/du/economics_vault_sheet_full.pdf>
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

const localPath = process.argv[2];
if (!localPath) {
  console.error("Usage: node scripts/upload-fiche-economics.mjs <pdf>");
  process.exit(1);
}

const env = loadEnv(join(__dirname, "..", ".env.local"));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const file = readFileSync(localPath);
  const { error } = await supabase.storage.from("fiches").upload("economics.pdf", file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  console.log(`Uploadé : economics.pdf (${(file.length / 1024 / 1024).toFixed(2)} Mo)`);
  const { data: signed, error: e2 } = await supabase.storage.from("fiches").createSignedUrl("economics.pdf", 60);
  if (e2) throw e2;
  const res = await fetch(signed.signedUrl, { method: "HEAD" });
  console.log("Vérification (URL signée 60 s) :", res.status, res.headers.get("content-type"), res.headers.get("content-length"));
}

main().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
