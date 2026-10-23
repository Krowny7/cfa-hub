// Upload des 10 one-pagers (une page A4 PDF par matière) vers le bucket privé
// "fiches", sous le nom "one-pager-<slug>.pdf" — même pattern que
// upload-fiche-alternatives.mjs, via la clé service-role de .env.local.
// Pour chaque matière : si une version existe déjà dans le bucket, elle est
// d'abord copiée sous un nom daté (one-pager-<slug>.sauvegarde-AAAA-MM-JJ-HHMM.pdf)
// avant d'être remplacée ; puis l'envoi est vérifié par une URL signée.
// Le dossier source est passé en argument (jamais codé en dur dans le dépôt) :
// il contient <slug>.pdf pour chaque slug ci-dessous (un PDF manquant est
// signalé et sauté). Les slugs sont ceux de `onePager` dans
// components/reviser/catalog.ts : les garder alignés.
// Usage: node scripts/upload-one-pagers.mjs <dossier/des/pdf>
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUCKET = "fiches";
const SLUGS = [
  "ethics",
  "quant",
  "economics",
  "corporate-issuers",
  "fsa",
  "equity",
  "fixed-income",
  "derivatives",
  "alternatives",
  "portfolio-management",
];
const storagePath = (slug) => `one-pager-${slug}.pdf`;

function loadEnv(path) {
  const out = {};
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const dossier = process.argv[2];
if (!dossier || !existsSync(dossier)) {
  console.error("Usage: node scripts/upload-one-pagers.mjs <dossier contenant <slug>.pdf>");
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

/** Noms déjà présents dans le bucket parmi les one-pagers (une seule requête). */
async function existants() {
  const { data, error } = await supabase.storage.from(BUCKET).list("", { search: "one-pager-", limit: 1000 });
  if (error) throw error;
  return new Set((data ?? []).map((f) => f.name));
}

async function envoyer(slug, deja, stamp) {
  const local = join(dossier, `${slug}.pdf`);
  const cible = storagePath(slug);
  if (!existsSync(local)) {
    console.warn(`! ${slug} : ${slug}.pdf absent du dossier, sauté.`);
    return false;
  }
  const file = readFileSync(local);
  if (file.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error(`${local} n'est pas un PDF`);
  }
  if (deja.has(cible)) {
    const copie = cible.replace(/[.]pdf$/, `.sauvegarde-${stamp}.pdf`);
    const { error: e } = await supabase.storage.from(BUCKET).copy(cible, copie);
    if (e) throw e;
    console.log(`  ancienne version sauvegardée : ${copie}`);
  }
  const { error } = await supabase.storage.from(BUCKET).upload(cible, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  const { data: signed, error: e2 } = await supabase.storage.from(BUCKET).createSignedUrl(cible, 60);
  if (e2) throw e2;
  const res = await fetch(signed.signedUrl, { method: "HEAD" });
  const ok = res.ok && (res.headers.get("content-type") ?? "").includes("pdf");
  console.log(
    `${ok ? "✓" : "✗"} ${cible} (${(file.length / 1024).toFixed(0)} Ko) — vérification URL signée :`,
    res.status,
    res.headers.get("content-type"),
    res.headers.get("content-length"),
  );
  return ok;
}

async function main() {
  const inconnus = readdirSync(dossier).filter((f) => f.toLowerCase().endsWith(".pdf") && !SLUGS.includes(f.replace(/[.]pdf$/i, "")));
  if (inconnus.length) console.warn(`! PDF ignorés (slug inconnu) : ${inconnus.join(", ")}`);

  const deja = await existants();
  const stamp = horodatage();
  let reussis = 0;
  for (const slug of SLUGS) {
    if (await envoyer(slug, deja, stamp)) reussis++;
  }
  console.log(`\n${reussis}/${SLUGS.length} one-pagers en ligne et vérifiés.`);
  if (reussis < SLUGS.length) process.exit(1);
}

main().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
