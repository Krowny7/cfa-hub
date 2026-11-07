// Envoi d'une partie de vidéo résumé (MP4 + affiche JPG) dans le bucket privé "courses", sous
// videos/<nom>.mp4 et videos/<nom>.jpg (URL signées, comme les cours complets). Les fichiers sources
// vivent hors du dépôt (atelier cfa-work/videos) : leurs chemins passent en argument, jamais écrits ici.
// La page correspondante est décrite dans lib/videos.ts. Limite de Supabase : 50 Mo par fichier.
// Usage: node scripts/upload-video.mjs <nom> <mp4Path> [jpgPath]
import { readFileSync } from "node:fs";
import { supabase } from "./lib/seed-core.mjs";

const [, , nom, mp4Path, jpgPath] = process.argv;
if (!nom || !mp4Path) {
  console.error("Usage: node scripts/upload-video.mjs <nom> <mp4Path> [jpgPath]");
  process.exit(1);
}

const envois = [[`videos/${nom}.mp4`, mp4Path, "video/mp4"]];
if (jpgPath) envois.push([`videos/${nom}.jpg`, jpgPath, "image/jpeg"]);
for (const [cle, chemin, type] of envois) {
  const buf = readFileSync(chemin);
  if (buf.length > 50 * 1024 * 1024) throw new Error(`${cle} : ${buf.length} octets, au-dessus de la limite de 50 Mo`);
  const { error } = await supabase.storage.from("courses").upload(cle, buf, { contentType: type, upsert: true });
  if (error) throw error;
  console.log(`${cle} envoyé,`, buf.length, "octets");
}
