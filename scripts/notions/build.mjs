// Génère lib/notions.ts, le référentiel des notions (un Learning Module du
// programme = une notion), à partir de :
//   - scripts/notions/referentiel.mjs : numéros de reading et libellés courts (écrits à la main) ;
//   - lib/courses.ts : le titre officiel de chaque LM (un chapitre par LM) ;
//   - lib/calc : les types de calcul, rattachés par leur `source` (« LM 8 · … ») ;
//   - les scripts de drill : les pages de fiche où chaque notion est travaillée ;
//   - les textes de la banque (extraire_banque.py) : contrôle des titres et
//     reading de chaque question officielle des drills.
// Le script s'arrête sur toute incohérence (un reading sur deux LM, un titre
// de la banque qui ne suit pas le chapitre du cours, un calcul sans LM).
//
// Usage (depuis la racine du dépôt) :
//   node scripts/notions/build.mjs <dossier des textes de la banque>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyserDrills, chapitresDesCours, chargerTextes, drillsDuDepot, mots, notionsBrutes } from "./commun.mjs";
import { MATIERES, SOUS_PARTIES, TITRES_SCHWESER } from "./referentiel.mjs";

const [dossierTextes] = process.argv.slice(2);
if (!dossierTextes) {
  console.error("usage : node scripts/notions/build.mjs <dossier des textes de la banque>");
  process.exit(1);
}
const depot = process.cwd();
const erreurs = [];
const lire = (...p) => readFileSync(join(depot, ...p), "utf8").replace(/\r\n/g, "\n");

// ── titres officiels : les chapitres des cours ─────────────────────
const chapitres = chapitresDesCours(depot);
const textes = chargerTextes(dossierTextes);
const proches = (a, b) => {
  const x = new Set(mots(a));
  const y = new Set(mots(b));
  const communs = [...x].filter((m) => y.has(m)).length;
  return communs / Math.max(x.size, y.size) >= 0.6;
};
for (const m of MATIERES) {
  const titres = chapitres.get(m.cours);
  if (!titres) erreurs.push(`${m.cle} : cours « ${m.cours} » absent de lib/courses.ts`);
  else if (titres.length !== m.courts.length) erreurs.push(`${m.cle} : ${titres.length} chapitres dans le cours, ${m.courts.length} libellés`);
  if (m.banque.length !== m.courts.length || m.schweser.length !== m.courts.length) erreurs.push(`${m.cle} : numéros de reading incomplets`);
  m.banque.forEach((r, i) => {
    const t = textes.get(String(r)) ?? textes.get(`${r}.1`);
    if (!t) erreurs.push(`${m.cle} LM ${i + 1} : reading ${r} absent de la banque`);
    else if (textes.has(String(r)) && titres && !proches(t.titre, titres[i])) erreurs.push(`${m.cle} LM ${i + 1} : banque « ${t.titre} » ≠ cours « ${titres[i]} »`);
  });
}
const brutes = notionsBrutes(); // lève une erreur si un reading tombe sur deux LM

// ── calculs : lib/calc/index.ts (catalogues ouverts) puis chaque catalogue ──
const index = lire("lib", "calc", "index.ts");
const slugDe = Object.fromEntries([...index.matchAll(/\{ topic: "([a-z_]+)", slug: "([a-z-]+)"/g)].map((x) => [x[1], x[2]]));
const fichierDe = Object.fromEntries([...index.matchAll(/import \{ ([A-Z_]+) \} from "\.\/([a-z]+)";/g)].map((x) => [x[1], x[2]]));
const ouverts = /const CATALOGS[^=]*= \{([^}]*)\}/.exec(index)?.[1] ?? "";
const calculs = new Map(); // notion → [{ cle, nom, href }]
for (const [, topic, constante] of ouverts.matchAll(/([a-z_]+): ([A-Z_]+)/g)) {
  const src = lire("lib", "calc", `${fichierDe[constante]}.ts`);
  const liste = new RegExp(`export const ${constante}: CalcCatalog = \\{[^]*?types: \\[([^\\]]*)\\]`).exec(src)?.[1] ?? "";
  for (const nomConst of liste.split(",").map((x) => x.trim()).filter(Boolean)) {
    const bloc = new RegExp(`const ${nomConst}: CalcType = \\{\\n([^]*?)\\n\\};`).exec(src)?.[1] ?? "";
    const champ = (c) => {
      const l = new RegExp(`^  ${c}: (".*"),$`, "m").exec(bloc)?.[1];
      return l ? JSON.parse(l) : null;
    };
    const cle = champ("key");
    const nom = champ("name");
    const source = champ("source") ?? "";
    // « LM 8 · Titre », « Quant LM 1 · Titre », « LM Titre du chapitre · LOS … »
    let notion = null;
    const num = /^(?:(Quant) )?LM ([0-9]+) · (.+)$/.exec(source);
    const parTitre = /^LM (.+?) · /.exec(source);
    if (num) {
      const matiere = num[1] ? "quant" : topic;
      notion = brutes.find((n) => n.matiere === matiere && n.lm === Number(num[2]));
      const titre = chapitres.get(MATIERES.find((m) => m.cle === matiere).cours)?.[Number(num[2]) - 1] ?? "";
      if (notion && !num[3].startsWith(titre.split(":")[0])) erreurs.push(`calcul ${cle} : « ${source} » ne correspond pas au chapitre « ${titre} »`);
    } else if (parTitre) {
      const titres = chapitres.get(MATIERES.find((m) => m.cle === topic).cours) ?? [];
      const lm = titres.findIndex((t) => t === parTitre[1]) + 1;
      notion = lm ? brutes.find((n) => n.matiere === topic && n.lm === lm) : null;
    }
    if (!cle || !nom || !notion) {
      erreurs.push(`calcul ${nomConst} (${topic}) : LM introuvable dans « ${source} »`);
      continue;
    }
    if (!calculs.has(notion.id)) calculs.set(notion.id, []);
    calculs.get(notion.id).push({ cle, nom, href: `/calculs/${slugDe[topic]}/${cle}` });
  }
}

// ── pages de fiche : où chaque notion est travaillée dans les drills ──
const { pages, notes } = analyserDrills(depot, textes, drillsDuDepot(depot));
const fiches = new Map(); // notion → Map(href → nombre de concepts)
for (const p of pages.filter((x) => x.version === "actuelle")) {
  for (const c of p.concepts) {
    if (!c.notion) continue;
    if (!fiches.has(c.notion)) fiches.set(c.notion, new Map());
    const cle = `${p.fiche}|${p.page}`;
    fiches.get(c.notion).set(cle, (fiches.get(c.notion).get(cle) ?? 0) + 1);
  }
}

if (erreurs.length) {
  console.error(erreurs.map((e) => "  " + e).join("\n"));
  process.exit(1);
}

// ── écriture de lib/notions.ts ─────────────────────────────────────
// Valeur → littéral TypeScript : en ligne si c'est court, sinon un élément par ligne.
function enTs(v, retrait) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const dedans = retrait + "  ";
  const tableau = Array.isArray(v);
  const parties = tableau ? v.map((x) => enTs(x, dedans)) : Object.entries(v).map(([k, x]) => `${/^[a-zA-Z]+$/.test(k) ? k : JSON.stringify(k)}: ${enTs(x, dedans)}`);
  if (!parties.length) return tableau ? "[]" : "{}";
  const enLigne = tableau ? `[${parties.join(", ")}]` : `{ ${parties.join(", ")} }`;
  if (!enLigne.includes("\n") && retrait.length + enLigne.length <= 100 && retrait !== "") return enLigne;
  return (tableau ? "[\n" : "{\n") + parties.map((x) => `${dedans}${x},\n`).join("") + retrait + (tableau ? "]" : "}");
}

const notions = brutes.map((n) => {
  const m = MATIERES.find((x) => x.cle === n.matiere);
  const titre = chapitres.get(m.cours)[n.lm - 1];
  const pagesDeFiche = [...(fiches.get(n.id) ?? new Map())]
    .map(([k, nb]) => ({ fiche: k.split("|")[0], page: Number(k.split("|")[1]), nb }))
    .sort((a, b) => b.nb - a.nb || a.page - b.page)
    .map(({ fiche, page }) => ({ href: `/fiches/${fiche}?page=${page}`, page }));
  const sousParties = n.matiere === "ethics" ? Object.entries(SOUS_PARTIES).filter(([r]) => r.startsWith(`${n.banque}.`)) : [];
  return {
    id: n.id,
    matiere: n.matiere,
    lm: n.lm,
    titre,
    court: n.court,
    readings: { banque: n.banque, schweser: n.schweser },
    ...(sousParties.length ? { sousParties: sousParties.map(([reading, libelle]) => ({ reading, libelle })) } : {}),
    cours: `/courses/${m.cours}?module=${n.lm}`,
    calculs: calculs.get(n.id) ?? [],
    fiches: pagesDeFiche,
    flashcards: (m.flashcards ?? []).filter((f) => f.lm.includes(n.lm)).map((f) => f.titre),
  };
});

const ts = `// Référentiel des notions du programme CFA Niveau I : une notion = un
// Learning Module (LM), ${notions.length} en tout. C'est l'unité que partagent les
// chapitres des cours audio (?module=N), les types de calcul (source « LM 8 · … »),
// les pages de fiche et les numéros de reading de la banque de questions.
// Module neutre (pas de "use client").
//
// FICHIER GÉNÉRÉ par scripts/notions/build.mjs : ne pas le modifier à la main.
// Les libellés courts et les numéros de reading se changent dans
// scripts/notions/referentiel.mjs, puis on relance le générateur.
//
// Deux numérotations des readings circulent dans le contenu : « banque »
// (banque de practice exams, titres « … — QCM (R59–R61) », commentaires des
// drills) et « schweser » (livres Schweser, anciens titres Fixed Income
// « (R47–R51) »). Les deux vont de 1 à 93 et se chevauchent.

export type Numerotation = "banque" | "schweser";

export type Notion = {
  /** « fixed_income:11 » : clé de matière (lib/practiceTopics.ts) et n° du LM */
  id: string;
  matiere: string;
  /** n° du LM dans la matière = n° du chapitre audio */
  lm: number;
  /** titre officiel anglais (chapitre de lib/courses.ts) */
  titre: string;
  /** libellé court français, celui que lit le joueur */
  court: string;
  readings: Record<Numerotation, number>;
  /** sous-parties de la banque (Guidance for Standards I–VII), qui servent de concept */
  sousParties?: { reading: string; libelle: string }[];
  /** chapitre du cours audio */
  cours: string;
  /** types de calcul rattachés */
  calculs: { cle: string; nom: string; href: string }[];
  /** pages de fiche où la notion est travaillée, la plus fournie d'abord */
  fiches: { href: string; page: number }[];
  /** titres des paquets de flashcards qui la couvrent */
  flashcards: string[];
};

export const NOTIONS: Notion[] = ${enTs(notions, "")};

const PAR_ID = new Map(NOTIONS.map((n) => [n.id, n]));
const PAR_READING: Record<Numerotation, Map<number, Notion>> = {
  banque: new Map(NOTIONS.map((n) => [n.readings.banque, n])),
  schweser: new Map(NOTIONS.map((n) => [n.readings.schweser, n])),
};

/** Les anciens titres de séries qui suivent la numérotation Schweser. */
const TITRES_SCHWESER = new Set(${enTs(TITRES_SCHWESER, "")});

export function notionParId(id: string | null | undefined): Notion | null {
  return id ? PAR_ID.get(id) ?? null : null;
}

export function notionsDeMatiere(matiere: string): Notion[] {
  return NOTIONS.filter((n) => n.matiere === matiere);
}

/** La notion d'un reading (« 59 », 91.3 → LM « Guidance for Standards I–VII »). */
export function notionParReading(reading: number | string, numerotation: Numerotation = "banque"): Notion | null {
  return PAR_READING[numerotation].get(Math.floor(Number(reading))) ?? null;
}

function numerotationDuTitre(titre: string): Numerotation {
  return TITRES_SCHWESER.has(titre) ? "schweser" : "banque";
}

/** Les readings d'un titre « … (R59–R61) », « … (R45, R47) », « … (R91.3–R91.5) » (parties entières). */
function readingsDuTitre(titre: string): number[] {
  const m = /\\(((?:R[0-9.]+(?:–R[0-9.]+)?)(?:, R[0-9.]+(?:–R[0-9.]+)?)*)\\)\\s*$/.exec(titre);
  if (!m) return [];
  const out = new Set<number>();
  for (const morceau of m[1].split(", ")) {
    const [a, b] = morceau.split("–").map((x) => Math.floor(Number(x.replace(/^R/, ""))));
    for (let i = a; i <= (b ?? a); i++) out.add(i);
  }
  return [...out];
}

/** Les notions d'une série d'après son titre, dans la bonne numérotation (vide si le titre n'a pas de plage R). */
export function notionsDuTitre(titre: string): Notion[] {
  const numerotation = numerotationDuTitre(titre);
  const out: Notion[] = [];
  for (const r of readingsDuTitre(titre)) {
    const n = notionParReading(r, numerotation);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}
`;
writeFileSync(join(depot, "lib", "notions.ts"), ts);
console.log(`lib/notions.ts : ${notions.length} notions, ${[...calculs.values()].flat().length} calculs, ${[...fiches.values()].reduce((s, m) => s + m.size, 0)} liens de fiche`);
for (const n of notes) console.log("  " + n);
