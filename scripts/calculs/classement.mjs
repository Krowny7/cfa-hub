// Le classement « demande un calcul » de la banque (quiz_questions.calcul,
// migration_ratures_calcul.sql : le carnet « Sans calcul »), gardé dans le
// dépôt : scripts/calculs/classement.json, { "<empreinte de l'énoncé>": true
// | false }. Indexé par l'énoncé, pas par l'id : il survit à seedQuizSets,
// qui efface et réinsère les questions sous de nouveaux id (comme
// scripts/notions/rattachement.json pour les notions). Écrit par
// scripts/calculs/appliquer.mjs ; lu par scripts/lib/seed-core.mjs, qui le
// préfère à l'estimation automatique (scripts/lib/calcul-heuristique.mjs)
// pour toute question qu'il insère.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { empreinte } from "../notions/commun.mjs";
import { estCalcul } from "../lib/calcul-heuristique.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
export const FICHIER_CLASSEMENT = join(ICI, "classement.json");
const EMPREINTE = /^[0-9a-f]{16}$/;

/** L'empreinte d'un énoncé (left(md5(prompt), 16) en SQL). */
export const empreinteEnonce = (prompt) => empreinte(String(prompt ?? ""));

/** empreinte de l'énoncé → true | false ; fichier absent : vide. Un fichier illisible lève une erreur (avant toute écriture en base). */
export function chargerClassement(fichier = FICHIER_CLASSEMENT) {
  if (!existsSync(fichier)) return new Map();
  const brut = JSON.parse(readFileSync(fichier, "utf8"));
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) throw new Error(`${fichier} : un objet { "<empreinte>": true | false } est attendu`);
  return new Map(Object.entries(brut).filter(([e, v]) => EMPREINTE.test(e) && typeof v === "boolean"));
}

/** Le classement de la question s'il est connu, sinon l'estimation automatique. */
export function calculDe(prompt, choices, classement) {
  const v = classement?.get(empreinteEnonce(prompt));
  return typeof v === "boolean" ? v : estCalcul(prompt, choices);
}

/**
 * Range des questions classées [{ prompt, calcul }] dans le classement
 * (modifié sur place). Un même énoncé classé des deux façons dans le lot est
 * retiré du classement (l'estimation automatique le reprendra). Rend
 * { ajoutees, changees, conflits }.
 */
export function fusionner(classement, questions) {
  const lot = new Map();
  const conflits = new Set();
  for (const { prompt, calcul } of questions) {
    if (typeof calcul !== "boolean") continue;
    const e = empreinteEnonce(prompt);
    if (lot.has(e) && lot.get(e) !== calcul) conflits.add(e);
    lot.set(e, calcul);
  }
  let ajoutees = 0;
  let changees = 0;
  for (const [e, v] of lot) {
    if (conflits.has(e)) {
      classement.delete(e);
      continue;
    }
    if (!classement.has(e)) ajoutees++;
    else if (classement.get(e) !== v) changees++;
    classement.set(e, v);
  }
  return { ajoutees, changees, conflits: conflits.size };
}

/** Écrit le classement, empreintes triées (un diff lisible d'une fois à l'autre). */
export function ecrireClassement(classement, fichier = FICHIER_CLASSEMENT) {
  const trie = Object.fromEntries([...classement].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  writeFileSync(fichier, JSON.stringify(trie, null, 2) + "\n", "utf8");
}
