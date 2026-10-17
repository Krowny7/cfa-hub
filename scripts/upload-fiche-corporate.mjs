// Upload du PDF de la fiche Corporate Issuers vers le bucket privé "fiches"
// (chemin "corporate-issuers.pdf") — même pattern que upload-fiche-economics.mjs,
// via la clé service-role de .env.local. Si une version existe déjà dans le
// bucket, elle est d'abord copiée sous un nom daté
// (corporate-issuers.sauvegarde-AAAA-MM-JJ-HHMM.pdf) avant d'être remplacée.
// Le chemin du PDF est passé en argument (jamais codé en dur dans le dépôt).
// PDF produit par : python scripts/pdf/build_qcm_pages.py corporate <synthese.pdf> <sortie.pdf>
// Usage: node scripts/upload-fiche-corporate.mjs <chemin/du/corporate-issuers.pdf>
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUCKET = "fiches";
const STORAGE_PATH = "corporate-issuers.pdf";

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
  console.error("Usage: node scripts/upload-fiche-corporate.mjs <pdf>");
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

/** AAAA-MM-JJ-HHMM, heure locale. */
function horodatage(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function sauvegarderAncienne() {
  const { data, error } = await supabase.storage.from(BUCKET).list("", { search: STORAGE_PATH });
  if (error) throw error;
  if (!(data ?? []).some((f) => f.name === STORAGE_PATH)) {
    console.log(`Pas d'ancienne version de ${STORAGE_PATH} : premier envoi, rien à sauvegarder.`);
    return;
  }
  const copie = STORAGE_PATH.replace(/[.]pdf$/, `.sauvegarde-${horodatage()}.pdf`);
  const { error: e } = await supabase.storage.from(BUCKET).copy(STORAGE_PATH, copie);
  if (e) throw e;
  console.log(`Ancienne version sauvegardée : ${copie}`);
}

async function main() {
  const file = readFileSync(localPath);
  if (file.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error(`${localPath} n'est pas un PDF`);
  }
  await sauvegarderAncienne();
  const { error } = await supabase.storage.from(BUCKET).upload(STORAGE_PATH, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  console.log(`Uploadé : ${STORAGE_PATH} (${(file.length / 1024 / 1024).toFixed(2)} Mo)`);
  const { data: signed, error: e2 } = await supabase.storage.from(BUCKET).createSignedUrl(STORAGE_PATH, 60);
  if (e2) throw e2;
  const res = await fetch(signed.signedUrl, { method: "HEAD" });
  console.log("Vérification (URL signée 60 s) :", res.status, res.headers.get("content-type"), res.headers.get("content-length"));
}

main().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
