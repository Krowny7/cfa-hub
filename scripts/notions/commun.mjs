// Outils partagés par build.mjs (référentiel lib/notions.ts) et rattacher.mjs
// (question → notion) : textes de la banque, recherche d'un énoncé dans ces
// textes, lecture des scripts de drill (version actuelle et historique git),
// passage d'un numéro de reading à sa notion.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DRILLS, MATIERES, SOUS_PARTIES, TITRES_SCHWESER } from "./referentiel.mjs";

/** Empreinte d'un énoncé : les 16 premiers caractères de md5, comme left(md5(prompt), 16) en SQL. */
export function empreinte(prompt) {
  return createHash("md5").update(prompt, "utf8").digest("hex").slice(0, 16);
}

/** Mots d'un texte, sans accents ni ponctuation. */
export function mots(texte) {
  return (texte ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

const K = 5;
function bardeaux(liste) {
  const out = new Set();
  if (liste.length < K) {
    if (liste.length) out.add(liste.join(" "));
    return out;
  }
  for (let i = 0; i + K <= liste.length; i++) out.add(liste.slice(i, i + K).join(" "));
  return out;
}

/** Textes de la banque (R59.txt, R91.3.txt… produits par extraire_banque.py) : reading → { titre, bardeaux, plat }. */
export function chargerTextes(dossier) {
  const textes = new Map();
  for (const f of readdirSync(dossier)) {
    const m = /^R(\d+(?:\.\d+)?)\.txt$/.exec(f);
    if (!m) continue;
    const brut = readFileSync(join(dossier, f), "utf8");
    const titre = (/^# (.*)$/m.exec(brut)?.[1] ?? "").trim();
    const liste = mots(brut);
    textes.set(m[1], { titre, bardeaux: bardeaux(liste), plat: " " + liste.join(" ") + " " });
  }
  if (!textes.size) throw new Error(`aucun fichier R<n>.txt dans ${dossier} : lance d'abord extraire_banque.py`);
  return textes;
}

/**
 * Part de l'énoncé retrouvée dans chaque reading (0 à 1), de la meilleure à la
 * moins bonne. Un énoncé très court est cherché tel quel.
 */
export function scores(prompt, textes, candidats = null) {
  const liste = mots(prompt);
  const b = bardeaux(liste);
  const out = [];
  for (const [r, t] of textes) {
    if (candidats && !candidats.has(r)) continue;
    let n = 0;
    if (liste.length < K) n = t.plat.includes(" " + liste.join(" ") + " ") ? 1 : 0;
    else for (const x of b) if (t.bardeaux.has(x)) n++;
    out.push({ reading: r, score: b.size ? n / b.size : 0 });
  }
  return out.sort((a, c) => c.score - a.score);
}

// Seuils : un énoncé recopié de la banque y est retrouvé à plus de 60 % (mise
// en page du PDF, tableaux reformatés) ; une variante écrite à la main reste
// sous 30 %. L'écart entre les deux premiers readings tranche les doublons.
export const SEUIL = 0.6;
export const ECART = 0.25;

/** Le reading d'un énoncé, s'il est retrouvé sans ambiguïté. */
export function readingDe(prompt, textes, candidats = null) {
  const s = scores(prompt, textes, candidats);
  const [a, b] = s;
  if (!a || a.score < SEUIL) return { reading: null, meilleur: a ?? null, second: b ?? null, raison: "absent" };
  if (b && a.score - b.score < ECART) return { reading: null, meilleur: a, second: b, raison: "ambigu" };
  return { reading: a.reading, meilleur: a, second: b ?? null, raison: "ok" };
}

// ── readings ↔ notions ─────────────────────────────────────────────

/** Toutes les notions, dans l'ordre des matières puis des LM. */
export function notionsBrutes() {
  const out = [];
  for (const m of MATIERES) {
    m.courts.forEach((court, i) => {
      out.push({ id: `${m.cle}:${i + 1}`, matiere: m.cle, lm: i + 1, court, banque: m.banque[i], schweser: m.schweser[i] });
    });
  }
  return out;
}

const PAR_BANQUE = new Map();
const PAR_SCHWESER = new Map();
for (const n of notionsBrutes()) {
  if (PAR_BANQUE.has(n.banque)) throw new Error(`reading ${n.banque} (banque) sur deux notions`);
  if (PAR_SCHWESER.has(n.schweser)) throw new Error(`reading ${n.schweser} (Schweser) sur deux notions`);
  PAR_BANQUE.set(n.banque, n);
  PAR_SCHWESER.set(n.schweser, n);
}

/** La notion d'un reading (« 59 », « 91.3 »…) dans une numérotation. */
export function notionDeReading(reading, numerotation = "banque") {
  const n = Math.floor(Number(reading));
  return (numerotation === "schweser" ? PAR_SCHWESER : PAR_BANQUE).get(n) ?? null;
}

/** Le concept porté par le reading lui-même (sous-parties de Guidance for Standards). */
export function conceptDeReading(reading) {
  return SOUS_PARTIES[String(reading)] ?? null;
}

/** Les readings d'un titre « … (R59–R61) », « … (R45, R47) », « … (R91.3–R91.5) ». */
export function readingsDuTitre(titre) {
  const m = /\(((?:R[0-9.]+(?:–R[0-9.]+)?)(?:, R[0-9.]+(?:–R[0-9.]+)?)*)\)\s*$/.exec(titre ?? "");
  if (!m) return [];
  const out = [];
  for (const morceau of m[1].split(", ")) {
    const [a, b] = morceau.split("–").map((x) => x.replace(/^R/, ""));
    if (!b) {
      out.push(a);
      continue;
    }
    const [ea, sa] = a.split(".");
    const [eb, sb] = b.split(".");
    if (sa !== undefined && sb !== undefined && ea === eb) for (let i = Number(sa); i <= Number(sb); i++) out.push(`${ea}.${i}`);
    else for (let i = Number(ea); i <= Number(eb); i++) out.push(String(i));
  }
  return out;
}

export const numerotationDuTitre = (titre) => (TITRES_SCHWESER.includes(titre) ? "schweser" : "banque");

// ── drills ─────────────────────────────────────────────────────────

const CONCEPT = /^(\s*)\/\/\s*Concept\s+(\d+)\s*[—–-]\s*(.+?)\s*$/;

/** Libellé d'un concept sans sa parenthèse finale d'origine (« (officielle, Reading 58) »). */
function nettoyer(libelle) {
  return libelle.replace(/\s*\((?:officielle|banque)[^()]*\)\s*$/i, "").trim();
}

/** Lit un script de drill : ses sets, et pour chaque question son concept (libellé, reading cité). */
export function lireDrill(texte) {
  const source = texte.replace(/\r\n/g, "\n");
  const debut = source.indexOf("const QUIZ_SETS = [");
  if (debut < 0) return null;
  const fin = source.indexOf("\n];", debut);
  if (fin < 0) return null;
  const litteral = source.slice(debut + "const QUIZ_SETS = ".length, fin + 3);
  let sets;
  try {
    sets = new Function(`return ${litteral}`)();
  } catch {
    return null;
  }
  // repère les commentaires de concept et les débuts de question (même retrait)
  const lignes = litteral.split("\n");
  const premier = lignes.map((l) => CONCEPT.exec(l)).find(Boolean);
  if (!premier || sets.length !== 1) return null;
  const retrait = premier[1];
  const concepts = [];
  const parQuestion = [];
  for (const l of lignes) {
    const c = CONCEPT.exec(l);
    if (c && c[1] === retrait) {
      const lu = /Reading\s+([0-9]+(?:\.[0-9]+)?)/i.exec(c[3]);
      concepts.push({ k: Number(c[2]), libelle: nettoyer(c[3]), reading: lu ? lu[1] : null });
    } else if (l === `${retrait}[` && concepts.length) parQuestion.push(concepts.length - 1);
  }
  const set = sets[0];
  if (parQuestion.length !== set.questions.length) return null;
  return {
    titre: set.title,
    concepts,
    questions: set.questions.map((q, i) => ({ prompt: q[0], concept: parQuestion[i], officielle: i === 0 || parQuestion[i - 1] !== parQuestion[i] })),
  };
}

/** Les scripts de drill du dépôt, version actuelle d'abord puis toutes les versions de l'historique git. */
export function drillsDuDepot(depot) {
  const dossier = join(depot, "scripts");
  const fichiers = readdirSync(dossier).filter((f) => /^seed-.+-drill-page[0-9]+\.mjs$/.test(f));
  const out = [];
  for (const f of fichiers) {
    const actuel = lireDrill(readFileSync(join(dossier, f), "utf8"));
    if (actuel) out.push({ fichier: f, version: "actuelle", ...actuel });
    let shas = [];
    try {
      shas = execFileSync("git", ["-C", depot, "log", "--format=%H", "--", `scripts/${f}`], { encoding: "utf8" }).split("\n").filter(Boolean);
    } catch {
      shas = [];
    }
    for (const sha of shas) {
      let src;
      try {
        src = execFileSync("git", ["-C", depot, "show", `${sha}:scripts/${f}`], { encoding: "utf8", maxBuffer: 1 << 26 });
      } catch {
        continue;
      }
      const lu = lireDrill(src);
      if (lu) out.push({ fichier: f, version: sha.slice(0, 7), ...lu });
    }
  }
  return out;
}

/** « Fixed Income — Drill Fiche Page 4 (…) » (ou sa réserve) → { prefixe, page, theme, reserve }. */
export function lireTitreDrill(titre) {
  const reserve = (titre ?? "").startsWith("Réserve — ");
  const brut = reserve ? titre.slice("Réserve — ".length) : titre ?? "";
  const m = /^(.+?) — Drill Fiche Page ([0-9]+)(?: \((.+)\))?/.exec(brut);
  return m ? { prefixe: m[1].trim(), page: Number(m[2]), theme: m[3] ?? null, reserve, titre: brut } : null;
}

/** Titres des chapitres de chaque cours (lib/courses.ts) : slug → titres, dans l'ordre. */
export function chapitresDesCours(depot) {
  const src = readFileSync(join(depot, "lib", "courses.ts"), "utf8").replace(/\r\n/g, "\n");
  const out = new Map();
  const blocs = src.split(/\n  \{\n/).slice(1);
  for (const b of blocs) {
    const slug = /slug: "([^"]+)"/.exec(b)?.[1];
    if (!slug) continue;
    out.set(slug, [...b.matchAll(/\{ title: "([^"]+)", start: [0-9.]+ \}/g)].map((m) => m[1]));
  }
  return out;
}

const pareil = (a, b) => mots(a.replace(/&/g, " and ")).join(" ") === mots(b.replace(/&/g, " and ")).join(" ");

/**
 * Notion de chaque concept de chaque drill (version actuelle et historique).
 * Le reading d'un concept est celui de sa question officielle, retrouvée dans
 * la banque ; à défaut, celui cité dans le commentaire ; à défaut, le LM dont
 * le titre est le thème de la page. Les deux variantes suivent l'officielle.
 */
export function analyserDrills(depot, textes, drills) {
  const chapitres = chapitresDesCours(depot);
  const notes = [];
  const pages = [];
  for (const d of drills) {
    const t = lireTitreDrill(d.titre);
    const def = t && DRILLS[t.prefixe];
    if (!def) {
      notes.push(`${d.fichier} (${d.version}) : titre de drill inconnu « ${d.titre} »`);
      continue;
    }
    const matiere = MATIERES.find((m) => m.cle === def.matiere);
    const candidats = new Set(matiere.banque.map(String));
    for (const r of [...textes.keys()]) if (candidats.has(r.split(".")[0])) candidats.add(r);
    const titresLm = chapitres.get(matiere.cours) ?? [];
    const lmDuTheme = t.theme ? titresLm.findIndex((x) => pareil(x, t.theme)) + 1 : 0;
    const concepts = d.concepts.map((c, i) => {
      const officielle = d.questions.find((q) => q.concept === i && q.officielle)?.prompt ?? "";
      const lu = readingDe(officielle, textes, candidats);
      let reading = lu.reading;
      let methode = "banque";
      if (reading && c.reading && Math.floor(Number(reading)) !== Math.floor(Number(c.reading)) && d.version === "actuelle") {
        notes.push(`${d.fichier} concept ${c.k} : le commentaire cite le reading ${c.reading}, l'énoncé est dans le reading ${reading} (retenu)`);
      }
      if (!reading && c.reading) {
        reading = c.reading;
        methode = "commentaire";
      }
      let notion = reading ? notionDeReading(reading) : null;
      if (notion && notion.matiere !== def.matiere) {
        notes.push(`${d.fichier} concept ${c.k} : reading ${reading} hors de la matière, ignoré`);
        notion = null;
      }
      if (!notion && lmDuTheme) {
        notion = notionsBrutes().find((n) => n.matiere === def.matiere && n.lm === lmDuTheme);
        methode = "thème de la page";
      }
      if (!notion) methode = "aucune";
      if (d.version === "actuelle" && methode !== "banque") notes.push(`${d.fichier} concept ${c.k} « ${c.libelle} » : notion ${notion?.id ?? "aucune"} (${methode})`);
      return { k: c.k, libelle: c.libelle, notion: notion?.id ?? null, methode };
    });
    pages.push({ ...d, matiere: def.matiere, fiche: def.fiche, page: t.page, concepts });
  }
  return { pages, notes };
}
