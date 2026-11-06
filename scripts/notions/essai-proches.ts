// Essaie la recherche par mots proches sur des termes, sans site ni base :
//   npx tsx --tsconfig ./tsconfig.json scripts/notions/essai-proches.ts "incentive fees" "frais de performance"
// Ou un terme par ligne dans un fichier : --fichier termes.txt
import fs from "node:fs";
import { contientRecherche, plat, type NotionDispo } from "@/lib/notions-choix";
import { chercherProches, type IndexMots } from "@/lib/notions-proches";

const index = JSON.parse(fs.readFileSync("public/notions-mots.json", "utf8")) as IndexMots;

// tout ce que l'index connaît : la recherche filtre ensuite sur ce que la source propose
const parNotion = new Map<string, NotionDispo>();
for (const [notion, concept, total] of index.cibles) {
  const n = parNotion.get(notion) ?? { notion, total: 0, concepts: [] };
  n.total += total;
  if (concept) n.concepts.push({ concept, total });
  parNotion.set(notion, n);
}
const dispo = [...parNotion.values()];

const args = process.argv.slice(2);
const i = args.indexOf("--fichier");
const termes = i >= 0 ? fs.readFileSync(args[i + 1], "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : args;

for (const terme of termes) {
  const q = plat(terme.trim());
  const direct = dispo.flatMap((n) => [n.notion, ...n.concepts.map((c) => c.concept)]).filter((x) => contientRecherche(x, q));
  console.log(`\n« ${terme} »${direct.length ? ` : ${direct.length} libellé(s) trouvé(s) directement` : ""}`);
  const proches = chercherProches(terme, index, dispo);
  if (proches.length === 0) console.log("  (rien de proche)");
  for (const p of proches) console.log(`  ${p.notion} : ${p.concepts.join(" | ") || "(la notion seule)"}`);
}
