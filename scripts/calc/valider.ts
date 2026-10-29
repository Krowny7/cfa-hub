// Contrôle des catalogues de calcul (lib/calc/<matière>.ts), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/calc/valider.ts [chemin/vers/lib/calc/<matière>.ts …]
// Sans argument : tous les catalogues du registre (lib/calc/index.ts).
// Vérifie : clés de type et identifiants de question uniques (dans le fichier et entre fichiers),
// 5 questions par niveau et par type, réponses finies, décimales entières ≥ 0, données non vides,
// correction non vide, unité connue, et exactement 5 types « top » par matière, tous essentiels
// (exception : une matière de moins de 5 types, comme Ethics, n'a pas de Top 5 : 0 « top » attendu).
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { CalcCatalog } from "../../lib/calc/types";
import { CALC_LEVELS } from "../../lib/calc/types";

const UNITES = new Set(["%", "$", "x", "years", "bp", ""]);
/** Taille du Top 5 d'une matière. Ethics n'a que 2 types de calcul utiles à l'examen (allocation d'IPO, rendement d'un
 *  composite GIPS) : un « Top 5 » de 2 n'aurait pas de sens, ses types restent simplement « essentiels » (0 top). */
const topsAttendus = (nbTypes: number): number => (nbTypes < 5 ? 0 : 5);
let ko = 0;
const err = (m: string) => {
  ko++;
  console.log("KO   " + m);
};

async function catalogues(): Promise<CalcCatalog[]> {
  const args = process.argv.slice(2);
  if (!args.length) {
    const idx = await import("../../lib/calc/index");
    return idx.CALC_SUBJECTS.map((s) => idx.calcCatalog(s.topic)).filter((c): c is CalcCatalog => !!c);
  }
  const out: CalcCatalog[] = [];
  for (const a of args) {
    const mod = (await import(pathToFileURL(resolve(a)).href)) as Record<string, unknown>;
    const c = Object.values(mod).find((v): v is CalcCatalog => !!v && typeof v === "object" && "topic" in v && "types" in v);
    if (!c) err(`${a} : aucun export CalcCatalog`);
    else out.push(c);
  }
  return out;
}

const idsVus = new Map<string, string>();
async function main() {
for (const c of await catalogues()) {
  const cles = new Set<string>();
  let tops = 0;
  for (const t of c.types) {
    const ou = `${c.topic}/${t.key}`;
    if (cles.has(t.key)) err(`${ou} : clé de type en double`);
    cles.add(t.key);
    if (t.top) {
      tops++;
      if (t.tier !== "essentiel") err(`${ou} : top mais pas essentiel`);
    }
    if (!t.formulas.length) err(`${ou} : aucune formule`);
    for (const lv of CALC_LEVELS) {
      const n = t.questions.filter((q) => q.level === lv).length;
      if (n !== 5) err(`${ou} : ${n} question(s) au niveau ${lv} (5 attendues)`);
    }
    for (const q of t.questions) {
      const qo = `${ou}/${q.id}`;
      if (idsVus.has(q.id)) err(`${qo} : identifiant déjà pris (${idsVus.get(q.id)})`);
      idsVus.set(q.id, ou);
      if (!Number.isFinite(q.answer)) err(`${qo} : réponse non finie (${q.answer})`);
      if (!Number.isInteger(q.decimals) || q.decimals < 0) err(`${qo} : décimales invalides`);
      if (!UNITES.has(q.unit)) err(`${qo} : unité inconnue « ${q.unit} »`);
      if (!q.prompt.trim()) err(`${qo} : énoncé vide`);
      if (!q.data.length || q.data.some((d) => !d.label.trim() || !d.value.trim())) err(`${qo} : données vides`);
      if (!q.solution.length) err(`${qo} : correction vide`);
      if (/NaN|undefined|Infinity/.test(JSON.stringify(q))) err(`${qo} : « NaN/undefined/Infinity » dans le texte`);
    }
  }
  const attendus = topsAttendus(c.types.length);
  if (tops !== attendus) err(`${c.topic} : ${tops} type(s) top (${attendus} attendu${attendus > 1 ? "s" : ""})`);
  console.log(`${c.topic} : ${c.types.length} types, ${c.types.reduce((n, t) => n + t.questions.length, 0)} questions, ${tops} top`);
}
console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
}
void main();
