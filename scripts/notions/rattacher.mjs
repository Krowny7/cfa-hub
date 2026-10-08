// Rattache chaque question de la base à sa notion (Learning Module) et, quand
// on le connaît, à son concept. Lit la base de production (clé service de
// .env.local, LECTURE SEULE), les textes de la banque et les scripts de drill
// (version actuelle et historique git), puis écrit le fichier de données
// scripts/notions/rattachement.json : empreinte de l'énoncé → [notion, concept].
// L'empreinte (16 premiers caractères de md5 de l'énoncé) survit à un nouveau
// seed : seedQuizSets change les id, pas les énoncés.
//
// Règles, de la plus sûre à la moins sûre :
//   1. Drill (et sa réserve) : l'énoncé est retrouvé dans un script de drill ;
//      la notion est celle du reading de la question officielle du concept
//      (retrouvée dans la banque, sinon citée en commentaire, sinon le LM qui
//      donne son titre à la page) ; le concept est le commentaire du script.
//   2. QCM de la banque « … (R59–R61) » : un seul reading, toutes ses
//      questions ; sinon chaque énoncé est cherché dans les textes des
//      readings du titre, et les questions non retrouvées prennent le reading
//      de leurs voisines quand elles sont entourées du même (les seeds rangent
//      les questions reading par reading).
//   3. Examens blancs : seulement les énoncés retrouvés tels quels dans la
//      banque ; les autres restent au niveau de la matière (inscrits dans le
//      fichier avec [null, null] : sans notion, et c'est voulu).
// Concept des questions d'Ethics « Guidance for Standards » : leur sous-partie
// de la banque, sauf R91.1, fourre-tout, où il se lit dans l'explication de
// la banque (voir conceptDeQuestion dans commun.mjs).
// Dans le doute, pas de notion : la question reste comptée dans sa matière.
//
// Usage (depuis la racine du dépôt), dans l'ordre :
//   python -I scripts/notions/extraire_banque.py <banque> <textes>
//   node scripts/notions/rattacher.mjs <textes> <rapport.md>    (→ rattachement.json)
//   node scripts/notions/build.mjs <textes>                     (→ lib/notions.ts)
//   node scripts/notions/synchroniser.mjs [--ecrire | --sql <fichier>]
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { analyserDrills, chargerTextes, conceptDeQuestion, conceptDeReading, drillsDuDepot, empreinte, lireTitreDrill, notionDeReading, numerotationDuTitre, readingDe, readingsDuTitre, scores } from "./commun.mjs";
import { ARBITRAGES, DOSSIERS, MATIERES } from "./referentiel.mjs";

const [dossierTextes, fichierRapport] = process.argv.slice(2);
if (!dossierTextes || !fichierRapport) {
  console.error("usage : node scripts/notions/rattacher.mjs <dossier des textes de la banque> <rapport.md>");
  process.exit(1);
}
const SORTIE = "scripts/notions/rattachement.json";
const MOCKS = "Mocks Officiels (Système)";
// Règle des examens blancs non retrouvés : laissés exprès au niveau de la
// matière, ils figurent dans le fichier avec [null, null], pour que les seeds
// et synchroniser.mjs ne les comptent pas parmi les questions inconnues.
const EXAMEN_BLANC = "examen blanc";
// libellés des matières dans les titres des examens blancs (lib/practiceTopics.ts)
const MATIERE_DU_MOCK = {
  "Éthique et Standards Professionnels": "ethics",
  "Méthodes Quantitatives": "quant",
  "Économie": "economics",
  "Analyse des États Financiers": "fsa",
  "Finance d'Entreprise": "corporate",
  "Investissements en Actions": "equity",
  "Fixed Income": "fixed_income",
  "Instruments Dérivés": "derivatives",
  "Investissements Alternatifs": "alternatives",
  "Gestion de Portefeuille": "portfolio",
};

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function tout(table, colonnes, ordre) {
  const out = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await db.from(table).select(colonnes).order(ordre).range(de, de + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const textes = chargerTextes(dossierTextes);
const { pages, notes } = analyserDrills(process.cwd(), textes, drillsDuDepot(process.cwd()));

// énoncé de drill → notion et concept (version actuelle d'abord, puis l'historique)
const parEnonceDrill = new Map();
for (const p of [...pages.filter((x) => x.version === "actuelle"), ...pages.filter((x) => x.version !== "actuelle")]) {
  for (const q of p.questions) {
    if (parEnonceDrill.has(q.prompt)) continue;
    const c = p.concepts[q.concept];
    parEnonceDrill.set(q.prompt, { notion: c.notion, concept: c.libelle, origine: p.version === "actuelle" ? "drill" : "drill (historique)" });
  }
}

const readingsDeMatiere = (cle) => {
  const m = MATIERES.find((x) => x.cle === cle);
  const racines = new Set(m.banque.map(String));
  return new Set([...textes.keys()].filter((r) => racines.has(r.split(".")[0])));
};

const [sets, dossiers, questions] = await Promise.all([
  tout("quiz_sets", "id,title,folder_id,is_official", "id"),
  tout("library_folders", "id,name", "id"),
  tout("quiz_questions", "id,set_id,prompt,position", "id"),
]);
const nomDossier = new Map(dossiers.map((d) => [d.id, d.name]));
const questionsDuSet = new Map();
for (const q of questions) {
  if (!questionsDuSet.has(q.set_id)) questionsDuSet.set(q.set_id, []);
  questionsDuSet.get(q.set_id).push(q);
}

const resultat = new Map(); // question id → { notion, concept, regle }
const ambigus = [];
const parSet = [];

function poser(q, notion, concept, regle) {
  resultat.set(q.id, { notion: notion ?? null, concept: concept ?? null, regle });
}

for (const s of sets) {
  const qs = (questionsDuSet.get(s.id) ?? []).sort((a, b) => a.position - b.position);
  const dossier = nomDossier.get(s.folder_id) ?? "";
  const drill = lireTitreDrill(s.title);
  // readings du titre, ramenés à la numérotation de la banque (anciens titres Schweser)
  const plage = readingsDuTitre(s.title).map((r) => (numerotationDuTitre(s.title) === "schweser" ? String(notionDeReading(r, "schweser")?.banque ?? r) : r));
  let genre = "autre";

  if (!s.is_official) {
    for (const q of qs) poser(q, null, null, "série d'un joueur");
  } else if (drill) {
    genre = drill.reserve ? "réserve de drill" : "drill";
    const matiere = DOSSIERS[dossier];
    for (const q of qs) {
      const d = parEnonceDrill.get(q.prompt);
      if (d?.notion) {
        poser(q, d.notion, d.concept, d.origine);
        continue;
      }
      const lu = matiere ? readingDe(q.prompt, textes, readingsDeMatiere(matiere)) : { reading: null };
      if (lu.reading) poser(q, notionDeReading(lu.reading).id, d?.concept ?? conceptDeQuestion(q.prompt, lu.reading, textes), "énoncé retrouvé dans la banque");
      else {
        poser(q, null, d?.concept ?? null, d ? "drill sans notion" : "énoncé introuvable");
        ambigus.push({ set: s.title, position: q.position, prompt: q.prompt, raison: d ? "concept sans notion" : "énoncé absent des scripts de drill et de la banque" });
      }
    }
  } else if (dossier === MOCKS) {
    genre = "examen blanc";
    const libelle = s.title.split(" — ")[2]?.trim() ?? "";
    const matiere = MATIERE_DU_MOCK[libelle] ?? null;
    const candidats = matiere ? readingsDeMatiere(matiere) : null;
    for (const q of qs) {
      const lu = readingDe(q.prompt, textes, candidats);
      if (lu.reading) poser(q, notionDeReading(lu.reading).id, conceptDeQuestion(q.prompt, lu.reading, textes), "examen blanc : énoncé retrouvé dans la banque");
      else poser(q, null, null, EXAMEN_BLANC);
    }
  } else if (plage.length) {
    genre = "QCM de la banque";
    const racines = [...new Set(plage.map((r) => r.split(".")[0]))];
    if (racines.length === 1 && !plage.some((r) => conceptDeReading(r))) {
      const n = notionDeReading(plage[0]);
      for (const q of qs) poser(q, n?.id, parEnonceDrill.get(q.prompt)?.concept ?? conceptDeReading(plage[0]), "QCM d'un seul reading");
    } else {
      // énoncé par énoncé, parmi les readings du titre
      const candidats = new Set(plage);
      const lus = qs.map((q) => readingDe(q.prompt, textes, candidats).reading);
      const connus = lus.map((r, i) => ({ r, i })).filter((x) => x.r);
      const monotone = connus.every((x, j) => j === 0 || plage.indexOf(x.r) >= plage.indexOf(connus[j - 1].r));
      const regles = lus.map((r) => (r ? "énoncé retrouvé dans la banque" : null));
      if (monotone) {
        for (let i = 0; i < lus.length; i++) {
          if (lus[i]) continue;
          const avant = connus.filter((x) => x.i < i).at(-1)?.r ?? null;
          const apres = connus.find((x) => x.i > i)?.r ?? null;
          if (avant && avant === apres) {
            lus[i] = avant;
            regles[i] = "entre deux questions du même reading";
          } else if (!avant && apres === plage[0]) {
            lus[i] = apres;
            regles[i] = "avant la première question du premier reading";
          } else if (avant === plage.at(-1) && !apres) {
            lus[i] = avant;
            regles[i] = "après la dernière question du dernier reading";
          } else if (avant && apres) {
            // à la frontière de deux readings : le plus proche des deux textes, s'il se distingue
            // (net écart, ou des passages retrouvés d'un seul côté)
            const sc = scores(qs[i].prompt, textes, new Set([avant, apres]));
            if (sc[0].score > 0 && (sc[0].score - sc[1].score >= 0.1 || sc[1].score === 0)) {
              lus[i] = sc[0].reading;
              regles[i] = "frontière de deux readings, texte le plus proche";
            } else if (ARBITRAGES[empreinte(qs[i].prompt)]) {
              lus[i] = ARBITRAGES[empreinte(qs[i].prompt)].reading;
              regles[i] = "tranché à la main (referentiel.mjs)";
            } else ambigus.push({ set: s.title, position: qs[i].position, prompt: qs[i].prompt, raison: `entre le reading ${avant} et le reading ${apres}` });
          } else ambigus.push({ set: s.title, position: qs[i].position, prompt: qs[i].prompt, raison: "aucun voisin rattaché" });
        }
      } else {
        notes.push(`${s.title} : readings dans le désordre, pas de déduction par voisinage`);
      }
      qs.forEach((q, i) => {
        const n = lus[i] ? notionDeReading(lus[i]) : null;
        const concept = parEnonceDrill.get(q.prompt)?.concept ?? (lus[i] ? conceptDeQuestion(q.prompt, lus[i], textes) : null);
        poser(q, n?.id, concept, regles[i] ?? "non rattachée");
      });
    }
  } else {
    for (const q of qs) poser(q, null, null, "série sans reading");
  }

  const avec = qs.filter((q) => resultat.get(q.id)?.notion).length;
  parSet.push({ titre: s.title, genre, total: qs.length, avec, sans: qs.length - avec });
}

// ── par empreinte d'énoncé, avec contrôle des doublons ─────────────
const parEmpreinte = new Map();
const conflits = [];
for (const q of questions) {
  const r = resultat.get(q.id);
  if (!r || (!r.notion && !r.concept && r.regle !== EXAMEN_BLANC)) continue;
  const e = empreinte(q.prompt);
  const deja = parEmpreinte.get(e);
  if (!deja) {
    parEmpreinte.set(e, { notion: r.notion, concept: r.concept, prompt: q.prompt });
    continue;
  }
  if (deja.prompt !== q.prompt) throw new Error(`collision d'empreinte ${e}`);
  if ((r.notion && deja.notion && deja.notion !== r.notion) || (r.concept && deja.concept && deja.concept !== r.concept)) {
    conflits.push({ prompt: q.prompt, a: `${deja.notion} / ${deja.concept}`, b: `${r.notion} / ${r.concept}` });
  }
  // un doublon complète l'autre (la copie d'une officielle dans un QCM prend le concept du drill)
  deja.notion ??= r.notion;
  deja.concept ??= r.concept;
}
for (const c of conflits) notes.push(`doublon d'énoncé en désaccord (le premier est gardé) : ${c.a} contre ${c.b} — « ${c.prompt.slice(0, 80)} »`);

const donnees = {};
for (const e of [...parEmpreinte.keys()].sort()) {
  const v = parEmpreinte.get(e);
  donnees[e] = [v.notion, v.concept];
}
fs.writeFileSync(
  SORTIE,
  "{\n" +
    Object.entries(donnees)
      .map(([e, v]) => `  ${JSON.stringify(e)}: ${JSON.stringify(v)}`)
      .join(",\n") +
    "\n}\n",
);

// ── rapport de couverture ──────────────────────────────────────────
const total = questions.length;
const rattachees = questions.filter((q) => resultat.get(q.id)?.notion).length;
const avecConcept = questions.filter((q) => resultat.get(q.id)?.concept).length;
const parNotion = new Map();
for (const q of questions) {
  const n = resultat.get(q.id)?.notion;
  if (n) parNotion.set(n, (parNotion.get(n) ?? 0) + 1);
}
const toutes = MATIERES.flatMap((m) => m.courts.map((c, i) => ({ id: `${m.cle}:${i + 1}`, court: c })));
const vides = toutes.filter((n) => !parNotion.has(n.id));
const parRegle = new Map();
for (const r of resultat.values()) parRegle.set(r.regle, (parRegle.get(r.regle) ?? 0) + 1);

const L = [];
L.push("# Rattachement des questions aux notions", "");
L.push(`- Questions en base : ${total}`);
L.push(`- Rattachées à une notion : ${rattachees} (${Math.round((rattachees / total) * 100)} %)`);
L.push(`- Sans notion : ${total - rattachees}`);
L.push(`- Avec un concept : ${avecConcept}`);
const voulus = [...parEmpreinte.values()].filter((v) => !v.notion && !v.concept).length;
L.push(`- Énoncés distincts dans ${SORTIE} : ${parEmpreinte.size}, dont ${voulus} laissés exprès sans notion (examens blancs)`);
L.push(`- Notions sans aucune question : ${vides.length}${vides.length ? " — " + vides.map((n) => `${n.id} ${n.court}`).join(", ") : ""}`);
L.push("", "## Par règle", "");
for (const [r, n] of [...parRegle].sort((a, b) => b[1] - a[1])) L.push(`- ${r} : ${n}`);
L.push("", "## Par série", "", "| Série | Genre | Questions | Avec notion | Sans |", "|---|---|---:|---:|---:|");
for (const p of parSet.sort((a, b) => a.titre.localeCompare(b.titre))) L.push(`| ${p.titre} | ${p.genre} | ${p.total} | ${p.avec} | ${p.sans} |`);
L.push("", "## Par notion", "", "| Notion | Libellé | Questions |", "|---|---|---:|");
for (const n of toutes) L.push(`| ${n.id} | ${n.court} | ${parNotion.get(n.id) ?? 0} |`);
const TRANCHES = ["frontière de deux readings, texte le plus proche", "tranché à la main (referentiel.mjs)", "avant la première question du premier reading", "après la dernière question du dernier reading"];
const titreDuSet = new Map(sets.map((s) => [s.id, s.title]));
const tranches = questions.filter((q) => TRANCHES.includes(resultat.get(q.id)?.regle));
L.push("", `## Cas tranchés par une règle de voisinage ou à la main (${tranches.length})`, "");
for (const q of tranches) {
  const r = resultat.get(q.id);
  L.push(`- ${titreDuSet.get(q.set_id)} · position ${q.position} → ${r.notion} (${r.regle}) — « ${q.prompt.replace(/\s+/g, " ").slice(0, 100)} »`);
}
L.push("", `## Cas ambigus laissés sans notion (${ambigus.length})`, "");
for (const a of ambigus) L.push(`- ${a.set} · position ${a.position} : ${a.raison} — « ${a.prompt.replace(/\s+/g, " ").slice(0, 100)} »`);
L.push("", `## Remarques (${notes.length})`, "");
for (const n of notes) L.push(`- ${n}`);
fs.writeFileSync(fichierRapport, L.join("\n") + "\n");

console.log(`${rattachees} questions sur ${total} rattachées à une notion, ${avecConcept} avec un concept`);
console.log(`${parEmpreinte.size} énoncés dans ${SORTIE}, ${ambigus.length} cas ambigus, ${conflits.length} doublons en désaccord`);
console.log(`rapport : ${fichierRapport}`);
