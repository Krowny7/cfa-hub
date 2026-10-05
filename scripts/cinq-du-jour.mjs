// « Les 5 du jour » : la liste des questions éligibles (table cinq_questions,
// migration_cinq_du_jour.sql). Une question est retenue si elle vient de la
// banque du défi (10 dossiers « (Système) », officielle publiée) et qu'elle
// est théorique, sans calcul et courte :
//   - énoncé de 320 caractères au plus, sans tableau ni vignette ;
//   - aucun verbe de calcul (calculate, compute, closest to, approximately…) ;
//   - aucun nombre à décimales, montant, pourcentage ou nombre long dans
//     l'énoncé ; des réponses en mots (pas de chiffres, de %, de durées).
// La liste ne fait qu'ajouter (une question déjà dedans y reste) ; une
// question supprimée en sort d'elle-même (ON DELETE CASCADE).
//   node scripts/cinq-du-jour.mjs                 (essai : compte, n'écrit rien)
//   node scripts/cinq-du-jour.mjs --ecrire        (remplit la table)
//   node scripts/cinq-du-jour.mjs --liste <fichier.md>   (la liste lisible)
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ecrire = process.argv.includes("--ecrire");
const iListe = process.argv.indexOf("--liste");
const fichierListe = iListe > 0 ? process.argv[iListe + 1] : null;

// la banque du défi du jour (_duel_pick_questions) : dossier → matière
const DOSSIERS = {
  "Éthique et Standards Professionnels (Système)": "Ethics",
  "Méthodes Quantitatives (Système)": "Quantitative Methods",
  "Économie (Système)": "Economics",
  "Analyse des États Financiers (Système)": "Financial Statement Analysis",
  "Finance d'Entreprise (Système)": "Corporate Issuers",
  "Investissements en Actions (Système)": "Equity",
  "Fixed Income (Système)": "Fixed Income",
  "Instruments Dérivés (Système)": "Derivatives",
  "Investissements Alternatifs (Système)": "Alternative Investments",
  "Gestion de Portefeuille (Système)": "Portfolio Management",
};

const MAX_ENONCE = 320;
const CALCUL = /\b(calculate|calculated|compute|computed|closest to|approximately|estimate[sd]?|how much|how many|what is the (value|amount|price|return|yield|rate|ratio|duration|cost)|amount of|equal to)\b/i;
const NOMBRE_ENONCE = /\d+[.,]\d|[$€£¥]\s?\d|\d\s?%|\d{2,}\s?(bp|bps|basis points)|\b\d{3,}\b(?!\))/i;
const NOMBRE_CHOIX = /\d+[.,]\d|[$€£¥]\s?\d|\d\s?%|\b\d+\s?(x|times|years?|months?|days?)\b|^\s*[-−]?\d+(\.\d+)?\s*\.?\s*$/i;
const TABLEAU = /\t|\n.*\n/;

export function eligible(q) {
  const p = q.prompt ?? "";
  if (p.length > MAX_ENONCE) return "trop long";
  if (TABLEAU.test(p)) return "tableau ou vignette";
  if (CALCUL.test(p)) return "demande un calcul";
  if (NOMBRE_ENONCE.test(p)) return "chiffres dans l'énoncé";
  if ((q.choices ?? []).some((c) => NOMBRE_CHOIX.test(c))) return "réponses chiffrées";
  if ((q.choices ?? []).some((c) => c.length > 180)) return "réponses trop longues";
  return "ok";
}

async function tout(table, colonnes) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from(table).select(colonnes).range(de, de + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const dossiers = (await tout("library_folders", "id,name,kind")).filter((d) => d.kind === "quizzes" && DOSSIERS[d.name]);
const series = (await tout("quiz_sets", "id,folder_id,is_official,official_published")).filter((s) => s.is_official && s.official_published && dossiers.some((d) => d.id === s.folder_id));
const matiere = new Map(series.map((s) => [s.id, DOSSIERS[dossiers.find((d) => d.id === s.folder_id).name]]));
const questions = (await tout("quiz_questions", "id,set_id,prompt,choices")).filter((q) => matiere.has(q.set_id) && (q.choices?.length ?? 0) >= 2 && (q.choices?.length ?? 0) <= 5);

const raisons = {};
const retenues = [];
for (const q of questions) {
  const v = eligible(q);
  raisons[v] = (raisons[v] ?? 0) + 1;
  if (v === "ok") retenues.push({ ...q, matiere: matiere.get(q.set_id) });
}
const parMatiere = {};
for (const q of retenues) parMatiere[q.matiere] = (parMatiere[q.matiere] ?? 0) + 1;
console.log(`banque du défi : ${questions.length} · retenues : ${retenues.length}`);
console.log("par matière :", JSON.stringify(parMatiere));
console.log("écartées :", JSON.stringify(Object.fromEntries(Object.entries(raisons).filter(([k]) => k !== "ok"))));

if (fichierListe) {
  const md = [
    "# « Les 5 du jour » — questions retenues",
    "",
    `Banque du défi : ${questions.length} questions. Retenues : **${retenues.length}** (théoriques, sans calcul, courtes).`,
    "",
    ...Object.values(DOSSIERS).flatMap((m) => [
      `## ${m} (${parMatiere[m] ?? 0})`,
      "",
      ...retenues.filter((q) => q.matiere === m).map((q) => `- ${q.prompt.replace(/\s+/g, " ")}  \n  _${q.choices.join(" · ")}_`),
      "",
    ]),
  ].join("\n");
  fs.writeFileSync(fichierListe, md);
  console.log("liste écrite :", fichierListe);
}

if (!ecrire) {
  console.log("essai : rien n'est écrit (--ecrire pour remplir la table)");
  process.exit(0);
}
const { error: absente } = await db.from("cinq_questions").select("question_id").limit(1);
if (absente) {
  console.error("table cinq_questions absente : colle d'abord migration_cinq_du_jour.sql dans le SQL Editor");
  process.exit(1);
}
let ajoutees = 0;
for (let i = 0; i < retenues.length; i += 500) {
  const lot = retenues.slice(i, i + 500).map((q) => ({ question_id: q.id }));
  const { data, error } = await db.from("cinq_questions").upsert(lot, { onConflict: "question_id", ignoreDuplicates: true }).select("question_id");
  if (error) throw new Error(error.message);
  ajoutees += data?.length ?? 0;
}
const { count } = await db.from("cinq_questions").select("question_id", { count: "exact", head: true });
console.log(`ajoutées : ${ajoutees} · dans la liste : ${count}`);
