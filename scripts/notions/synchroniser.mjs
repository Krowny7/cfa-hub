// Remet la notion et le concept de toutes les questions d'après
// scripts/notions/rattachement.json (voir etiquettes.mjs). Rejouable à volonté.
// À lancer depuis la racine du dépôt, une fois migration_notions.sql collée :
//   node scripts/notions/synchroniser.mjs                  (essai : compte, n'écrit rien)
//   node scripts/notions/synchroniser.mjs --ecrire         (écrit dans la base, clé service)
//   node scripts/notions/synchroniser.mjs --sql <fichier>  (le même remplissage en SQL, à coller)
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chargerRattachement, etiqueter, sqlRemplissage } from "./etiquettes.mjs";

const ecrire = process.argv.includes("--ecrire");
const iSql = process.argv.indexOf("--sql");
const fichierSql = iSql > 0 ? process.argv[iSql + 1] : null;

if (fichierSql) {
  const r = chargerRattachement();
  const entete = `-- Remplissage de quiz_questions.notion et .concept (${r.size} énoncés), généré par
-- scripts/notions/synchroniser.mjs --sql depuis scripts/notions/rattachement.json.
-- À coller dans le SQL Editor de Supabase APRÈS migration_notions.sql.
-- Rejouable : n'écrit que les questions dont la valeur change.`;
  fs.writeFileSync(fichierSql, sqlRemplissage(r, entete));
  console.log(`${fichierSql} : ${r.size} énoncés, ${Math.round(fs.statSync(fichierSql).size / 1024)} Ko`);
  process.exit(0);
}

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const r = await etiqueter(db, { ecrire });
if (r.absentes) {
  console.log("colonnes notion et concept absentes : colle d'abord migration_notions.sql");
  process.exit(1);
}
console.log(`${r.ecrites} questions ${ecrire ? "écrites" : "à écrire"}, ${r.inchangees} déjà à jour, ${r.sansDonnee} sans notion connue`);
if (!ecrire) console.log("essai : rien n'est écrit (--ecrire pour remplir la base)");
