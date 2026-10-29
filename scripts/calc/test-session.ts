// Session ciblée de calculs : répartition par niveau, ajustement au vivier,
// tirage sans doublon, réglages dans l'adresse.
// npx tsx --tsconfig tsconfig.json scripts/calc/test-session.ts
import { drawSession } from "../../lib/calc/session-draw";
import {
  MIX_PRESETS,
  SESSION_COUNTS,
  apportion,
  configFromParams,
  configFromStored,
  configToParams,
  configToStored,
  defaultConfig,
  melanger,
  mixOf,
  normalizeMix,
  parseDiff,
  pickSpread,
  planSession,
  setMixLevel,
  snapCount,
  splitCount,
  type ParNiveau,
} from "../../lib/calc/session";
import { CALC_LEVELS } from "../../lib/calc/types";
import { phraseAjustement, phraseRepartition } from "../../components/calculs/voice";

let ko = 0;
const ok = (nom: string, bon: boolean, detail = "") => {
  if (!bon) ko++;
  console.log(`${bon ? "ok  " : "KO  "} ${nom}${bon ? "" : detail ? ` → ${detail}` : ""}`);
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const P = (facile: number, moyen: number, difficile: number): ParNiveau => ({ facile, moyen, difficile });
const somme = (p: ParNiveau) => CALC_LEVELS.reduce((s, l) => s + p[l], 0);

// générateur déterministe (mulberry32)
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------------------
// Répartition : arrondi juste, somme = N
ok("10 questions à 50/30/20 → 5, 3, 2", eq(splitCount(10, P(50, 30, 20)), P(5, 3, 2)));
ok("10 questions à 34/33/33 → 4, 3, 3 (le reste va à la plus forte part)", eq(splitCount(10, P(34, 33, 33)), P(4, 3, 3)));
ok("5 questions à 34/33/33 → 2, 2, 1", eq(splitCount(5, P(34, 33, 33)), P(2, 2, 1)));
ok("15 questions à 20/30/50 → 3, 4, 8", eq(splitCount(15, P(20, 30, 50)), P(3, 4, 8)));
ok("un niveau seul : tout sur le niveau", eq(splitCount(30, P(0, 100, 0)), P(0, 30, 0)));
ok("apportion sans poids : zéros", eq(apportion(7, [0, 0, 0]), [0, 0, 0]));

let fautes = 0;
let essais = 0;
for (let n = 1; n <= 50; n++) {
  for (let f = 0; f <= 100; f += 5) {
    for (let m = 0; m <= 100 - f; m += 5) {
      const mix = P(f, m, 100 - f - m);
      const r = splitCount(n, mix);
      essais++;
      if (somme(r) !== n || CALC_LEVELS.some((l) => r[l] < 0 || (mix[l] === 0 && r[l] !== 0) || Math.abs(r[l] - (n * mix[l]) / 100) >= 1)) fautes++;
    }
  }
}
for (const p of MIX_PRESETS) for (let n = 1; n <= 50; n++) if (somme(splitCount(n, p.mix)) !== n) fautes++;
ok(`somme = N et écart < 1 sur ${essais} combinaisons (N de 1 à 50, pas de 5 %)`, fautes === 0, `${fautes} faute(s)`);

// curseurs : la somme reste à 100
let curseurs = 0;
for (let f = 0; f <= 100; f += 7)
  for (let m = 0; m <= 100 - f; m += 11) {
    const mix = normalizeMix(P(f, m, 100 - f - m));
    for (const l of CALC_LEVELS) for (let v = 0; v <= 100; v += 3) if (somme(setMixLevel(mix, l, v)) !== 100 || setMixLevel(mix, l, v)[l] !== v) curseurs++;
  }
ok("setMixLevel : la somme reste 100 et le niveau réglé prend sa valeur", curseurs === 0, `${curseurs} faute(s)`);
ok("curseur à 100 : les deux autres tombent à 0", eq(setMixLevel(P(50, 30, 20), "moyen", 100), P(0, 100, 0)));
ok("curseur depuis 0/0/100 : le reste va au seul niveau non nul", eq(setMixLevel(P(0, 0, 100), "facile", 50), P(50, 0, 50)));
ok("curseur depuis un niveau à 100 vers 0 : le reste se partage", eq(setMixLevel(P(100, 0, 0), "facile", 0), P(0, 50, 50)));
ok("mélange tordu ramené à 100", somme(normalizeMix({ facile: 80, moyen: 80, difficile: 80 })) === 100 && eq(normalizeMix({}), P(50, 30, 20)));

// ---------------------------------------------------------------------------
// Ajustement au vivier
{
  const p = planSession(30, P(0, 0, 100), P(50, 50, 25));
  ok("un seul niveau trop court : la session est plus courte, jamais complétée par un autre niveau", p.total === 25 && eq(p.retenu, P(0, 0, 25)) && eq(p.courts, ["difficile"]));
  const q = planSession(20, P(50, 30, 20), P(4, 50, 50));
  ok("niveau court dans un mélange : le manque passe aux autres niveaux du mélange", q.total === 20 && q.retenu.facile === 4 && q.retenu.moyen + q.retenu.difficile === 16 && eq(q.courts, ["facile"]), JSON.stringify(q));
  const r = planSession(10, P(50, 0, 50), P(3, 50, 50));
  ok("un niveau à 0 % ne reçoit jamais le manque", r.total === 10 && r.retenu.moyen === 0 && r.retenu.facile === 3 && r.retenu.difficile === 7, JSON.stringify(r));
  const s = planSession(50, P(34, 33, 33), P(5, 5, 5));
  ok("vivier épuisé partout : total = vivier", s.total === 15 && eq(s.retenu, P(5, 5, 5)));
  const t = planSession(10, P(50, 30, 20), P(100, 100, 100));
  ok("assez de questions : rien à ajuster", eq(t.retenu, P(5, 3, 2)) && t.courts.length === 0 && phraseAjustement(10, t, P(100, 100, 100)) === null);
  let somPlan = 0;
  for (let n = 5; n <= 50; n += 5) for (const d of [P(0, 0, 0), P(3, 8, 1), P(20, 20, 20), P(60, 60, 60)]) for (const pr of MIX_PRESETS) {
    const pl = planSession(n, pr.mix, d);
    if (pl.total !== Math.min(n, somme(d)) && CALC_LEVELS.some((l) => pr.mix[l] > 0 && pl.retenu[l] < d[l] && pl.total < n)) somPlan++;
    if (CALC_LEVELS.some((l) => pl.retenu[l] > d[l])) somPlan++;
  }
  ok("jamais plus de questions que le vivier, jamais de manque évitable", somPlan === 0, `${somPlan} faute(s)`);
  ok("phrase d'ajustement honnête", /Difficile : 25 questions dans ces matières pour 30 demandées/.test(phraseAjustement(30, p, P(50, 50, 25)) ?? "") && /25 questions au lieu de 30/.test(phraseAjustement(30, p, P(50, 50, 25)) ?? ""), phraseAjustement(30, p, P(50, 50, 25)) ?? "null");
}
ok("phrase de répartition", phraseRepartition(P(5, 3, 2)) === "10 questions : 5 faciles, 3 moyennes, 2 difficiles", phraseRepartition(P(5, 3, 2)));
ok("phrase de répartition d'un niveau seul", phraseRepartition(P(0, 0, 10)) === "10 questions difficiles" && phraseRepartition(P(1, 0, 0)) === "1 question facile");

// ---------------------------------------------------------------------------
// Tirage sans doublon
{
  const g = [["a1", "a2", "a3", "a4", "a5"], ["b1", "b2", "b3", "b4", "b5"], ["c1", "c2", "c3", "c4", "c5"]];
  const r = seeded(7);
  const x = pickSpread(g, 7, r);
  const parGroupe = g.map((grp) => x.filter((v) => grp.includes(v)).length).sort();
  ok("pickSpread : 7 éléments distincts, répartis 3-2-2", x.length === 7 && new Set(x).size === 7 && eq(parGroupe, [2, 2, 3]), JSON.stringify(x));
  ok("pickSpread : plus que le vivier → tout le vivier, une fois", pickSpread(g, 99, r).length === 15 && new Set(pickSpread(g, 99, r)).size === 15);
  ok("pickSpread : groupes vides ignorés", pickSpread([[], ["z"]], 3, r).length === 1);
  const m = melanger(["a", "a", "a", "b", "b", "b", "c", "c"], (v) => v, seeded(3));
  ok("melanger : même contenu, voisins différents quand c'est possible", m.length === 8 && m.slice().sort().join("") === "aaabbbcc" && m.every((v, i) => i === 0 || v !== m[i - 1]), m.join(""));
}

{
  let fautesTirage = 0;
  const topics = ["ethics", "quant", "fsa", "equity", "portfolio", "alternatives"];
  for (let k = 0; k < 60; k++) {
    const rand = seeded(1000 + k);
    const choisies = topics.filter((_, i) => (k >> i) % 2 === 1 || i === k % topics.length);
    const count = SESSION_COUNTS[k % SESSION_COUNTS.length];
    const mix = k % 4 === 0 ? P(0, 0, 100) : k % 4 === 1 ? P(50, 30, 20) : k % 4 === 2 ? P(34, 33, 33) : P(20, 30, 50);
    const d = drawSession({ topics: choisies, count, mix }, rand);
    if (!d) {
      fautesTirage++;
      continue;
    }
    const cles = d.items.map((i) => `${i.topic}|${i.typeKey}|${i.q.id}`);
    const parNiveau = P(0, 0, 0);
    for (const i of d.items) parNiveau[i.q.level] += 1;
    if (d.items.length !== count || new Set(cles).size !== cles.length) fautesTirage++;
    if (!eq(parNiveau, d.plan.retenu) || !eq(d.plan.retenu, splitCount(count, mix))) fautesTirage++;
    if (d.items.some((i) => !choisies.includes(i.topic))) fautesTirage++;
    if (Object.keys(d.types).length === 0 || d.items.some((i) => !d.types[`${i.topic}|${i.typeKey}`])) fautesTirage++;
  }
  ok("drawSession (60 tirages, vrais catalogues) : N questions, sans doublon, au bon nombre par niveau, dans les matières choisies", fautesTirage === 0, `${fautesTirage} faute(s)`);

  const d1 = drawSession({ topics: ["portfolio"], count: 10, mix: P(0, 100, 0) }, seeded(5))!;
  ok("10 questions d'une matière de 19 types : 10 types différents", new Set(d1.items.map((i) => i.typeKey)).size === 10);
  const d2 = drawSession({ topics: ["alternatives"], count: 50, mix: P(0, 0, 100) }, seeded(6))!;
  ok("50 questions d'une matière de 11 types : réparties (4 ou 5 par type), sans doublon", d2.items.length === 50 && new Set(d2.items.map((i) => i.q.id)).size === 50 && Object.keys(d2.types).length === 11);
  const privees = d2.items.some((i) => Object.keys(i.q).some((k) => !["id", "level", "prompt", "data", "unit", "decimals"].includes(k)));
  ok("le tirage ne contient ni réponse, ni correction, ni tolérance", !privees && !JSON.stringify(d2).includes("solution") && !JSON.stringify(d2).includes("answer"));
  const d3 = drawSession({ topics: ["quant"], count: 10, mix: P(50, 30, 20) }, seeded(1))!;
  const d4 = drawSession({ topics: ["quant"], count: 10, mix: P(50, 30, 20) }, seeded(2))!;
  ok("deux tirages différents ne donnent pas la même liste", d3.items.map((i) => i.q.id).join() !== d4.items.map((i) => i.q.id).join());
  ok("aucune matière ouverte → null", drawSession({ topics: [], count: 10, mix: P(50, 30, 20) }) === null && drawSession({ topics: ["nimporte"], count: 10, mix: P(50, 30, 20) }) === null);
  const d5 = drawSession({ topics: ["quant", "quant"], count: 999, mix: {} })!;
  ok("entrées bancales : nombre borné à 50, mélange par défaut, matière dédoublonnée", d5.items.length === 50 && eq(d5.plan.retenu, splitCount(50, P(50, 30, 20))));
  const d6 = drawSession({ topics: ["quant"], count: "abc", mix: null })!;
  ok("nombre illisible → 10", d6.items.length === 10);
}

// ---------------------------------------------------------------------------
// Réglages : adresse et mémoire
{
  const slugs = ["ethics", "quant", "economics", "corporate-issuers", "fsa", "equity", "fixed-income", "derivatives", "alternatives", "portfolio-management"];
  const get = (o: Record<string, string>) => (k: string) => o[k];
  ok("adresse sans réglage → null", configFromParams(get({}), slugs) === null);
  const c = configFromParams(get({ matieres: "fsa,quant", n: "20", diff: "30-30-40" }), slugs)!;
  ok("lecture de l'adresse", eq(c.matieres, ["quant", "fsa"]) && c.count === 20 && eq(mixOf(c.diff), P(30, 30, 40)));
  ok("toutes", configFromParams(get({ matieres: "toutes" }), slugs)!.matieres.length === slugs.length);
  ok("matière inconnue ignorée, nombre fantaisiste ramené au pas de 5", eq(configFromParams(get({ matieres: "xx,fsa", n: "12" }), slugs)!.matieres, ["fsa"]) && snapCount("12") === 10 && snapCount("13") === 15 && snapCount("999") === 50 && snapCount("0") === 5);
  ok("diff illisible → mélange par défaut", eq(configFromParams(get({ n: "10", diff: "n'importe quoi" }), slugs)!.diff, defaultConfig(slugs).diff));
  ok("diff : niveau seul et mélange à 120 % ramené à 100", eq(parseDiff("moyen"), { kind: "niveau", level: "moyen" }) && somme(mixOf(parseDiff("60-60-0")!)) === 100);
  const p = configToParams(c, slugs);
  const retour = configFromParams((k) => p[k], slugs)!;
  ok("aller-retour adresse", eq(retour, c) && p.diff === "30-30-40" && p.n === "20" && p.matieres === "quant,fsa", JSON.stringify(p));
  const niv = { ...c, diff: { kind: "niveau" as const, level: "difficile" as const } };
  ok("aller-retour d'un niveau seul", eq(configFromParams((k) => configToParams(niv, slugs)[k], slugs), niv));
  const st = configFromStored(JSON.parse(JSON.stringify(configToStored(c, slugs))), slugs);
  ok("aller-retour localStorage", eq(st, c), JSON.stringify(st));
  ok("localStorage corrompu → null", configFromStored("x", slugs) === null && configFromStored({ matieres: 3, count: {}, diff: [] }, slugs) === null && configFromStored(null, slugs) === null);
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
