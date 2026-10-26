// Upload des fiches tirées des flashcards d'une matière vers le bucket privé
// "fiches" (même pattern que upload-one-pagers.mjs, clé service-role de
// .env.local) : les mini-fiches A5 des paquets « flashcards-<slug>-<n>.pdf »
// (n = 1 à 4) et le one-pager A4 de toutes les cartes « flashcards-<slug>.pdf ».
// Les noms sont ceux de fichePaquetFile / ficheCartesFile dans
// components/reviser/catalog.ts : les garder alignés. Une version déjà dans le
// bucket est d'abord copiée sous un nom daté (….sauvegarde-AAAA-MM-JJ-HHMM.pdf),
// puis chaque envoi est vérifié par une URL signée.
// Le dossier source est passé en argument (jamais codé en dur dans le dépôt) :
// il contient <slug>-1.pdf … <slug>-4.pdf et <slug>-60.pdf, et les mêmes en .webp (un fichier manquant est
// signalé et sauté).
// Usage: node scripts/upload-fiches-flashcards.mjs <dossier/des/pdf> <slug>   (ex. fixed-income)
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUCKET = "fiches";

function loadEnv(path) {
  const out = {};
  const txt = readFileSync(path, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const [dossier, slug] = process.argv.slice(2);
if (!dossier || !existsSync(dossier) || !slug || !/^[a-z-]+$/.test(slug)) {
  console.error("Usage: node scripts/upload-fiches-flashcards.mjs <dossier contenant <slug>-1..4.pdf et <slug>-60.pdf> <slug>");
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

/** fichier local → nom dans le bucket */
const FICHES = [
  ...[1, 2, 3, 4].map((n) => [`${slug}-${n}.pdf`, `flashcards-${slug}-${n}.pdf`]),
  [`${slug}-60.pdf`, `flashcards-${slug}.pdf`],
  // les mêmes en image (WebP) : les mémos affichés sous la révision (memoPaquetImage / memoCartesImage)
  ...[1, 2, 3, 4].map((n) => [`${slug}-${n}.webp`, `flashcards-${slug}-${n}.webp`]),
  [`${slug}-60.webp`, `flashcards-${slug}.webp`],
];
const typeDe = (nom) => (nom.endsWith(".webp") ? "image/webp" : "application/pdf");

/** AAAA-MM-JJ-HHMM, heure locale. */
function horodatage(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function existants() {
  const { data, error } = await supabase.storage.from(BUCKET).list("", { search: `flashcards-${slug}`, limit: 1000 });
  if (error) throw error;
  return new Set((data ?? []).map((f) => f.name));
}

async function envoyer(nomLocal, cible, deja, stamp) {
  const local = join(dossier, nomLocal);
  if (!existsSync(local)) {
    console.warn(`! ${nomLocal} absent du dossier, sauté.`);
    return false;
  }
  const file = readFileSync(local);
  const type = typeDe(cible);
  const signature = type === "image/webp" ? file.subarray(8, 12).toString("latin1") === "WEBP" : file.subarray(0, 5).toString("latin1") === "%PDF-";
  if (!signature) {
    throw new Error(`${local} n'est pas un ${type === "image/webp" ? "WebP" : "PDF"}`);
  }
  if (deja.has(cible)) {
    const copie = cible.replace(/[.]pdf$/, `.sauvegarde-${stamp}.pdf`);
    const { error: e } = await supabase.storage.from(BUCKET).copy(cible, copie);
    if (e) throw e;
    console.log(`  ancienne version sauvegardée : ${copie}`);
  }
  const { error } = await supabase.storage.from(BUCKET).upload(cible, file, {
    contentType: type,
    upsert: true,
  });
  if (error) throw error;
  const { data: signed, error: e2 } = await supabase.storage.from(BUCKET).createSignedUrl(cible, 60);
  if (e2) throw e2;
  const res = await fetch(signed.signedUrl, { method: "HEAD" });
  const ok = res.ok && (res.headers.get("content-type") ?? "") === type;
  console.log(`${ok ? "✓" : "✗"} ${cible} (${(file.length / 1024).toFixed(0)} Ko) — vérification URL signée :`, res.status, res.headers.get("content-type"));
  return ok;
}

async function main() {
  const deja = await existants();
  const stamp = horodatage();
  let reussis = 0;
  for (const [nomLocal, cible] of FICHES) {
    if (await envoyer(nomLocal, cible, deja, stamp)) reussis++;
  }
  console.log(`\n${reussis}/${FICHES.length} fiches en ligne et vérifiées.`);
  if (reussis < FICHES.length) process.exit(1);
}

main().catch((e) => {
  console.error("Erreur:", e);
  process.exit(1);
});
