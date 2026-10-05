// Contrôle de la règle de langue sur la base (lecture seule) : énoncé et
// choix en anglais, explication en français, pour toutes les questions des
// séries officielles publiées (fiches, banque, défi, duels, sessions).
//   node scripts/verifier-langues.mjs            (depuis la racine du dépôt)
//   node scripts/verifier-langues.mjs --details  (liste chaque question)
// Code de sortie 1 s'il reste des écarts. Lit .env.local (clé service).
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { REGLE_LANGUE, ecartsDeLangue } from "./lib/langue.mjs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const details = process.argv.includes("--details");

async function tout(table, colonnes, filtre = (q) => q) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await filtre(db.from(table).select(colonnes)).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const series = await tout("quiz_sets", "id,title", (q) => q.eq("is_official", true).eq("official_published", true));
const titres = new Map(series.map((s) => [s.id, s.title]));
const questions = (await tout("quiz_questions", "id,set_id,prompt,choices,explanation")).filter((q) => titres.has(q.set_id));

const parSerie = new Map();
let total = 0;
for (const q of questions) {
  const ecarts = ecartsDeLangue(q);
  if (!ecarts.length) continue;
  total++;
  const titre = titres.get(q.set_id);
  parSerie.set(titre, [...(parSerie.get(titre) ?? []), { id: q.id, ecarts }]);
}

console.log(REGLE_LANGUE);
console.log(`${questions.length} questions officielles · ${total} à corriger`);
for (const [titre, liste] of [...parSerie].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`- ${titre} : ${liste.length}`);
  if (details) for (const x of liste) console.log(`    ${x.id} : ${x.ecarts.join(", ")}`);
}
process.exit(total ? 1 : 0);
