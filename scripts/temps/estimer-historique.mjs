// Le temps passé sur le site AVANT le compteur exact : une estimation d'après
// les traces horodatées, écrite dans temps_site.secondes_estimees, jour par
// jour (jour de Paris). secondes_mesurees (le compteur) et maj ne sont
// jamais écrits. migration_temps_site.sql doit être collée.
//
// La méthode, pour chaque joueur :
// 1. Les intervalles connus ([début, fin], ou [fin − durée, fin]) :
//    - séances d'entraînement (practice_session_results : fin − duration_seconds, 4 h au plus) ;
//    - examens blancs (mock_exam_results : fin − duration_seconds, 4 h 30 au plus) ;
//    - Ateliers clos (ateliers : fin − secondes, le chrono arrêts déduits, 3 h au plus) ;
//    - défis du jour (daily_attempts : [début, fin] s'il a duré 1 h au plus, sinon fin − seconds) ;
//    - séries éclair (eclair_series : [début, fin], 30 min au plus) ;
//    - écoute d'un cours notée par le Codex (codex_evenements « cours_ecoute » : quand − minutes, 15 min au plus).
//    Un intervalle trop long (un onglet resté ouvert) ou incomplet ne vaut
//    que ses instants, comme une trace ponctuelle (point 2) : on reste un
//    minimum.
// 2. Les traces ponctuelles : les réponses (quiz_answer_log, daily_answers,
//    duel_answers), l'XP (xp_events), les fiches ouvertes et flashcards
//    revues notées par le Codex (codex_evenements), la dernière mise à jour
//    de chaque paquet de flashcards (flashcard_progress), et les instants des
//    intervalles écartés. Triées, elles forment des séances : deux traces
//    séparées de 15 min au plus sont de la même séance. Une séance vaut
//    dernier − premier + 2 min (les 2 min avant la première trace : la
//    première question lue), soit l'intervalle [premier − 2 min, dernier].
// 3. L'union de tous ces intervalles (rien n'est compté deux fois), coupée à
//    --jusqua, découpée par jour de Paris (minuit à minuit), 24 h par jour au
//    plus.
// C'est un minimum : la lecture des fiches, l'écoute des cours (avant le
// Codex) et les flashcards n'ont presque pas laissé de trace.
//
// Idempotent : chaque passage recalcule tout, puis écrit secondes_estimees de
// chaque jour (upsert) ; un jour qui avait une estimation et n'en a plus
// repasse à 0. Les tables lues page par page (1 000 lignes), triées sur une
// clé stable ; une table absente est sautée (le résultat le dit).
//
//   node scripts/temps/estimer-historique.mjs --essai --jusqua <ISO>        n'écrit rien : le résultat par joueur
//   node scripts/temps/estimer-historique.mjs --jusqua <ISO>                écrit
//   node scripts/temps/estimer-historique.mjs --joueur <uuid> --essai       un seul joueur
//   node scripts/temps/estimer-historique.mjs --essai --sortie <fichier>    le détail par jour, en JSON, dans ce fichier
// --jusqua : seules les traces d'avant comptent ; passe l'instant de mise en
// ligne du compteur exact (ex. 2026-10-26T18:00:00+01:00) : ce qui suit est
// mesuré. Sans --jusqua : maintenant, mais un joueur que le compteur a déjà
// mesuré voit son estimation s'arrêter au minuit (Paris) de son premier jour
// mesuré, pour ne rien compter deux fois.
// À lancer depuis la racine du dépôt (.env.local : l'URL et la clé service).
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

// ── Les arguments ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const valeur = (nom) => {
  const i = args.indexOf(nom);
  return i >= 0 ? (args[i + 1] ?? null) : null;
};
const essai = args.includes("--essai");
const joueur = valeur("--joueur");
const jusquaBrut = valeur("--jusqua");
const sortie = valeur("--sortie");
if (joueur && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(joueur)) {
  console.error(`--joueur : un uuid attendu (reçu « ${joueur} »)`);
  process.exit(1);
}
const jusqua = jusquaBrut ? Date.parse(jusquaBrut) : Date.now();
if (!Number.isFinite(jusqua)) {
  console.error(`--jusqua : une date ISO attendue (reçu « ${jusquaBrut} »), par exemple 2026-10-26T18:00:00+01:00`);
  process.exit(1);
}
if (jusqua > Date.now() + 60_000) {
  console.error("--jusqua est dans le futur : passe l'instant de mise en ligne du compteur (ou rien : maintenant).");
  process.exit(1);
}
const jusquaIso = new Date(jusqua).toISOString();

// ── Les réglages de la méthode ─────────────────────────────────────────────
const MIN = 60_000;
const H = 3_600_000;
/** deux traces séparées de 15 min au plus : la même séance */
const ECART_SEANCE = 15 * MIN;
/** une séance commence 2 min avant sa première trace */
const AVANT_PREMIERE = 2 * MIN;
/** au-delà, un intervalle ne vaut que ses instants */
const PLAFOND = { seance: 4 * H, examen: 4.5 * H, atelier: 3 * H, defi: 1 * H, eclair: 30 * MIN, cours: 15 * MIN };

// ── Les jours de Paris ─────────────────────────────────────────────────────
const JOUR = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const HEURE = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const jourDe = (ms) => JOUR.format(new Date(ms));
const lendemain = (j) => new Date(Date.parse(`${j}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
/** Minuit à Paris, le jour j (AAAA-MM-JJ) : UTC+2 l'été, UTC+1 l'hiver. */
function minuit(j) {
  const base = Date.parse(`${j}T00:00:00Z`);
  for (const decalage of [2, 1]) {
    const x = base - decalage * H;
    if (jourDe(x) === j && HEURE.format(new Date(x)) === "00:00") return x;
  }
  return base - H;
}
const heures = (s) => {
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
};

// ── Les lectures, page par page ────────────────────────────────────────────
const sautees = [];

/** Toutes les lignes d'une table (filtrées ; avec --joueur, les siennes : `cle`), par pages de 1 000, triées sur une clé stable. */
async function tout(table, colonnes, ordre, filtre, cle = "user_id") {
  const out = [];
  for (let de = 0; ; de += 1000) {
    let q = db.from(table).select(colonnes);
    if (joueur) q = q.eq(cle, joueur);
    if (filtre) q = filtre(q);
    for (const o of ordre) q = q.order(o, { ascending: true });
    const { data, error } = await q.range(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** Comme tout(), mais une table absente (ou une colonne) est sautée : le résultat le dit. */
async function lire(table, colonnes, ordre, filtre) {
  try {
    const lignes = await tout(table, colonnes, ordre, filtre);
    console.log(`  ${table} : ${lignes.length} ligne${lignes.length > 1 ? "s" : ""}`);
    return lignes;
  } catch (e) {
    console.warn(`  ! ${table} sautée : ${e.message}`);
    sautees.push(table);
    return [];
  }
}

// ── Les traces de chaque joueur ────────────────────────────────────────────
/** joueur → { points: ms[], intervalles: [ms, ms][], sources: { nom: n } } */
const traces = new Map();
const de = (u) => {
  let x = traces.get(u);
  if (!x) traces.set(u, (x = { points: [], intervalles: [], sources: {} }));
  return x;
};
const ms = (iso) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t) ? t : null;
};
const noter = (x, src) => (x.sources[src] = (x.sources[src] ?? 0) + 1);
/** Une trace ponctuelle (avant --jusqua). */
function point(u, t, src) {
  if (!u || t === null || t >= jusqua) return;
  const x = de(u);
  x.points.push(t);
  noter(x, src);
}
/** Un intervalle connu [a, b], coupé à --jusqua ; trop long ou incomplet : ses instants seulement. */
function intervalle(u, a, b, plafond, src) {
  if (!u) return;
  if (a === null || b === null || !(b > a) || b - a > plafond) {
    point(u, a, src);
    point(u, b, src);
    return;
  }
  if (a >= jusqua) return;
  const x = de(u);
  x.intervalles.push([a, Math.min(b, jusqua)]);
  noter(x, src);
}
const avant = (col) => (q) => q.lt(col, jusquaIso);
const secondes = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n * 1000 : null;
};

console.log(`Estimation du temps sur le site, traces d'avant ${jusquaIso}${joueur ? `, joueur ${joueur}` : ", tous les joueurs"}${essai ? " (essai : rien n'est écrit)" : ""}`);
console.log("Lecture des traces :");

for (const r of await lire("quiz_answer_log", "user_id,answered_at", ["id"], avant("answered_at"))) point(r.user_id, ms(r.answered_at), "réponses (fiches, QCM)");
for (const r of await lire("daily_answers", "user_id,answered_at", ["challenge_id", "user_id", "position"], avant("answered_at"))) point(r.user_id, ms(r.answered_at), "réponses (défis du jour)");
for (const r of await lire("duel_answers", "user_id,answered_at", ["duel_id", "user_id", "position"], avant("answered_at"))) point(r.user_id, ms(r.answered_at), "réponses (duels)");
for (const r of await lire("xp_events", "user_id,occurred_at", ["id"], avant("occurred_at"))) point(r.user_id, ms(r.occurred_at), "XP");
for (const r of await lire("flashcard_progress", "user_id,updated_at", ["user_id", "deck_key"], avant("updated_at"))) point(r.user_id, ms(r.updated_at), "flashcards");
// une durée trop longue (onglet resté ouvert) : seulement l'instant de fin (le début calculé n'est pas une trace)
for (const r of await lire("practice_session_results", "user_id,completed_at,duration_seconds", ["id"], avant("completed_at"))) {
  const fin = ms(r.completed_at);
  const d = secondes(r.duration_seconds);
  if (fin !== null && d !== null && d <= PLAFOND.seance) intervalle(r.user_id, fin - d, fin, PLAFOND.seance, "séances");
  else point(r.user_id, fin, "séances");
}
for (const r of await lire("mock_exam_results", "user_id,completed_at,duration_seconds", ["id"], avant("completed_at"))) {
  const fin = ms(r.completed_at);
  const d = secondes(r.duration_seconds);
  if (fin !== null && d !== null && d <= PLAFOND.examen) intervalle(r.user_id, fin - d, fin, PLAFOND.examen, "examens blancs");
  else point(r.user_id, fin, "examens blancs");
}
for (const r of await lire("ateliers", "user_id,started_at,vu_at,finished_at,secondes", ["id"], avant("started_at"))) {
  const fin = ms(r.finished_at);
  const d = secondes(r.secondes);
  if (fin !== null && d !== null && d <= PLAFOND.atelier) intervalle(r.user_id, fin - d, fin, PLAFOND.atelier, "Ateliers");
  else for (const t of [r.started_at, r.vu_at, r.finished_at]) point(r.user_id, ms(t), "Ateliers");
}
for (const r of await lire("daily_attempts", "user_id,started_at,finished_at,seconds", ["challenge_id", "user_id"], avant("started_at"))) {
  const debut = ms(r.started_at);
  const fin = ms(r.finished_at);
  const d = secondes(r.seconds);
  if (debut !== null && fin !== null && fin - debut > 0 && fin - debut <= PLAFOND.defi) intervalle(r.user_id, debut, fin, PLAFOND.defi, "défis du jour");
  else if (fin !== null && d !== null && d <= PLAFOND.defi) intervalle(r.user_id, fin - d, fin, PLAFOND.defi, "défis du jour");
  else {
    point(r.user_id, debut, "défis du jour");
    point(r.user_id, fin, "défis du jour");
  }
}
for (const r of await lire("eclair_series", "user_id,started_at,finished_at", ["id"], avant("started_at"))) intervalle(r.user_id, ms(r.started_at), ms(r.finished_at), PLAFOND.eclair, "séries éclair");
for (const r of await lire("codex_evenements", "user_id,type,quand,champs", ["id"], avant("quand"))) {
  const quand = ms(r.quand);
  const minutes = Number(r.champs?.minutes);
  if (r.type === "cours_ecoute" && quand !== null && Number.isFinite(minutes) && minutes > 0) intervalle(r.user_id, quand - Math.min(minutes * MIN, PLAFOND.cours), quand, PLAFOND.cours, "cours écoutés");
  else point(r.user_id, quand, r.type === "fiche_ouverte" ? "fiches ouvertes" : r.type === "flashcards_revues" ? "flashcards" : "Codex");
}

// ── Ce que la table sait déjà : le compteur, les estimations d'avant ───────
let tableAbsente = false;
const lireTemps = async (filtre) => {
  try {
    return await tout("temps_site", "user_id,jour,secondes_mesurees,secondes_estimees", ["user_id", "jour"], filtre);
  } catch (e) {
    tableAbsente = true;
    console.warn(`  ! temps_site illisible : ${e.message}`);
    return [];
  }
};
const mesures = await lireTemps((q) => q.gt("secondes_mesurees", 0));
const anciennes = tableAbsente ? [] : await lireTemps((q) => q.gt("secondes_estimees", 0));
if (tableAbsente && !essai) {
  console.error("La table temps_site n'existe pas : colle d'abord migration_temps_site.sql dans le SQL Editor de Supabase.");
  process.exit(1);
}
/** le premier jour mesuré de chaque joueur */
const premierMesure = new Map();
for (const r of mesures) if (!premierMesure.has(r.user_id) || r.jour < premierMesure.get(r.user_id)) premierMesure.set(r.user_id, r.jour);

// ── Les joueurs ────────────────────────────────────────────────────────────
const profils = await tout("profiles", "id,username", ["id"], null, "id").catch((e) => {
  console.error(`profiles illisible : ${e.message}`);
  process.exit(1);
});
const nomDe = new Map(profils.map((p) => [p.id, p.username || p.id.slice(0, 8)]));

// ── Le calcul ──────────────────────────────────────────────────────────────
/** Les séances des traces ponctuelles : [premier − 2 min, dernier], deux traces à 15 min au plus. */
function seances(points) {
  const p = [...points].sort((a, b) => a - b);
  const out = [];
  let debut = null;
  let fin = null;
  for (const t of p) {
    if (debut !== null && t - fin <= ECART_SEANCE) {
      fin = t;
      continue;
    }
    if (debut !== null) out.push([debut - AVANT_PREMIERE, fin]);
    debut = t;
    fin = t;
  }
  if (debut !== null) out.push([debut - AVANT_PREMIERE, fin]);
  return out;
}
/** L'union d'intervalles (triés, fusionnés quand ils se touchent). */
function union(intervalles) {
  const tries = intervalles.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [a, b] of tries) {
    const dernier = out[out.length - 1];
    if (dernier && a <= dernier[1]) dernier[1] = Math.max(dernier[1], b);
    else out.push([a, b]);
  }
  return out;
}
/** Les secondes de chaque jour de Paris (24 h au plus). */
function parJour(intervalles) {
  const jours = new Map();
  for (const [a0, b] of intervalles) {
    let a = a0;
    while (a < b) {
      const j = jourDe(a);
      const bout = Math.min(b, minuit(lendemain(j)));
      if (!(bout > a)) break;
      jours.set(j, (jours.get(j) ?? 0) + (bout - a));
      a = bout;
    }
  }
  const out = new Map();
  for (const [j, v] of [...jours].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    const s = Math.min(86_400, Math.round(v / 1000));
    if (s > 0) out.set(j, s);
  }
  return out;
}

const resultats = [];
let ignores = 0;
for (const [u, x] of traces) {
  if (!nomDe.has(u)) {
    ignores++;
    continue;
  }
  // sans --jusqua : rien après le minuit du premier jour mesuré
  const pm = premierMesure.get(u);
  const coupure = !jusquaBrut && pm ? Math.min(jusqua, minuit(pm)) : jusqua;
  const points = x.points.filter((t) => t < coupure);
  const connus = x.intervalles.map(([a, b]) => [a, Math.min(b, coupure)]).filter(([a, b]) => b > a);
  const s = seances(points).map(([a, b]) => [a, Math.min(b, coupure)]);
  const jours = parJour(union([...connus, ...s]));
  const total = [...jours.values()].reduce((t, v) => t + v, 0);
  resultats.push({ id: u, nom: nomDe.get(u), total, jours, seances: s.length, intervalles: connus.length, traces: x.points.length, sources: x.sources, coupe: coupure < jusqua ? pm : null, mesureAvant: jusquaBrut && pm && pm < jourDe(jusqua) ? pm : null });
}
resultats.sort((a, b) => b.total - a.total);

// ── Le résultat ────────────────────────────────────────────────────────────
console.log("");
console.log(`Par joueur (${resultats.length}) :`);
for (const r of resultats) {
  const js = [...r.jours.keys()];
  const plage = js.length ? `du ${js[0]} au ${js[js.length - 1]}` : "aucun jour";
  const src = Object.entries(r.sources)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
  console.log(`- ${r.nom} (${r.id.slice(0, 8)}) : ≈ ${heures(r.total)} sur ${js.length} jour${js.length > 1 ? "s" : ""} (${plage}) · ${r.seances} séance${r.seances > 1 ? "s" : ""} de traces, ${r.intervalles} intervalle${r.intervalles > 1 ? "s" : ""} connu${r.intervalles > 1 ? "s" : ""}`);
  if (src) console.log(`    traces : ${src}`);
  if (r.coupe) console.log(`    déjà mesuré depuis le ${r.coupe} : l'estimation s'arrête à ce minuit`);
  if (r.mesureAvant) console.log(`    ATTENTION : mesuré dès le ${r.mesureAvant}, avant --jusqua : ces jours-là peuvent compter deux fois (avance --jusqua)`);
}
const totalTous = resultats.reduce((t, r) => t + r.total, 0);
console.log("");
console.log(`Total : ≈ ${heures(totalTous)} pour ${resultats.length} joueur${resultats.length > 1 ? "s" : ""}.`);
if (ignores) console.log(`${ignores} identifiant${ignores > 1 ? "s" : ""} de traces sans profil, ignoré${ignores > 1 ? "s" : ""}.`);
if (sautees.length) console.log(`Tables sautées (absentes ou illisibles) : ${sautees.join(", ")}.`);

if (sortie) {
  const json = {
    jusqua: jusquaIso,
    joueurs: resultats.map((r) => ({ id: r.id, nom: r.nom, secondes: r.total, heures: heures(r.total), coupe: r.coupe, sources: r.sources, jours: Object.fromEntries(r.jours) })),
  };
  fs.writeFileSync(sortie, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Détail par jour écrit dans ${sortie}.`);
}

// ── L'écriture ─────────────────────────────────────────────────────────────
if (essai) {
  console.log("Essai : rien n'a été écrit. Relance sans --essai pour écrire.");
  process.exit(0);
}

const lignes = [];
const ecrits = new Set();
for (const r of resultats) {
  for (const [jour, s] of r.jours) {
    lignes.push({ user_id: r.id, jour, secondes_estimees: s });
    ecrits.add(`${r.id}|${jour}`);
  }
}
// les jours qui avaient une estimation et n'en ont plus : remis à 0
let remis = 0;
for (const a of anciennes) {
  if (!nomDe.has(a.user_id) || ecrits.has(`${a.user_id}|${a.jour}`)) continue;
  lignes.push({ user_id: a.user_id, jour: a.jour, secondes_estimees: 0 });
  remis++;
}
for (let i = 0; i < lignes.length; i += 500) {
  // seul secondes_estimees est écrit : une ligne qui existe garde ses secondes mesurées et son maj
  const { error } = await db.from("temps_site").upsert(lignes.slice(i, i + 500), { onConflict: "user_id,jour" });
  if (error) {
    console.error(`Écriture interrompue (lignes ${i} à ${i + 499}) : ${error.message}`);
    process.exit(1);
  }
}
console.log(`Écrit : ${lignes.length - remis} jour${lignes.length - remis > 1 ? "s" : ""} estimé${lignes.length - remis > 1 ? "s" : ""}${remis ? `, ${remis} remis à 0` : ""}.`);
