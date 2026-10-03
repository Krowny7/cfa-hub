// Envoi d'un cours complet (deck PDF + audio narré) dans le bucket privé
// "courses" (URL signées, même principe que "fiches"), sous <nom>.pdf et
// <nom>.mp3. Les fichiers sources vivent hors du dépôt : on passe leurs
// chemins en argument pour qu'aucun chemin propre à la machine ne soit
// écrit ici (un chemin de scratchpad codé en dur a déjà cassé le scan de
// Tailwind). La page correspondante est décrite dans lib/courses.ts.
// Usage: node scripts/upload-course.mjs <nom> <pdfPath> <audioPath>
import { readFileSync } from "node:fs";
import { supabase } from "./lib/seed-core.mjs";

const [, , name, pdfPath, audioPath] = process.argv;
if (!name || !pdfPath || !audioPath) {
  console.error("Usage: node scripts/upload-course.mjs <nom> <pdfPath> <audioPath>");
  process.exit(1);
}

const pdfBuf = readFileSync(pdfPath);
const { error: e1 } = await supabase.storage
  .from("courses")
  .upload(`${name}.pdf`, pdfBuf, { contentType: "application/pdf", upsert: true });
if (e1) throw e1;
console.log(`${name}.pdf envoyé,`, pdfBuf.length, "octets");

const audioBuf = readFileSync(audioPath);
const { error: e2 } = await supabase.storage
  .from("courses")
  .upload(`${name}.mp3`, audioBuf, { contentType: "audio/mpeg", upsert: true });
if (e2) throw e2;
console.log(`${name}.mp3 envoyé,`, audioBuf.length, "octets");
