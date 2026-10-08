// Pose la notion et le concept des questions (colonnes quiz_questions.notion
// et .concept, migration_notions.sql) d'après scripts/notions/rattachement.json,
// produit par rattacher.mjs. La correspondance passe par l'empreinte de
// l'énoncé, pas par l'id : elle survit à seedQuizSets, qui efface et réinsère.
// Idempotent : seules les questions dont la valeur change sont écrites, et
// une question absente du fichier n'est pas touchée.
// Utilisé par scripts/lib/seed-core.mjs (après chaque seed) et par
// synchroniser.mjs (toute la base, ou le fichier SQL à coller).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { empreinte } from "./commun.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));

/** empreinte de l'énoncé → { notion, concept } */
export function chargerRattachement() {
  const brut = JSON.parse(readFileSync(join(ICI, "rattachement.json"), "utf8"));
  return new Map(Object.entries(brut).map(([e, [notion, concept]]) => [e, { notion, concept }]));
}

/** Les écritures à faire : questions [{ id, prompt, notion, concept }] → [{ notion, concept, ids }]. */
export function ecrituresAFaire(questions, rattachement) {
  const groupes = new Map();
  let inchangees = 0;
  let sansDonnee = 0;
  for (const q of questions) {
    const voulu = rattachement.get(empreinte(q.prompt));
    if (!voulu) {
      sansDonnee++;
      continue;
    }
    if ((q.notion ?? null) === voulu.notion && (q.concept ?? null) === voulu.concept) {
      inchangees++;
      continue;
    }
    const cle = JSON.stringify([voulu.notion, voulu.concept]);
    if (!groupes.has(cle)) groupes.set(cle, { notion: voulu.notion, concept: voulu.concept, ids: [] });
    groupes.get(cle).ids.push(q.id);
  }
  return { groupes: [...groupes.values()], inchangees, sansDonnee };
}

const colonnesAbsentes = (e) => e && (e.code === "42703" || e.code === "PGRST204" || /column .*(notion|concept)/i.test(e.message ?? ""));

/**
 * Pose notion et concept sur les questions des sets donnés (toutes si
 * setIds est vide). Rend { ecrites, inchangees, sansDonnee }, ou
 * { absentes: true } tant que migration_notions.sql n'est pas collée.
 */
export async function etiqueter(supabase, { setIds = [], ecrire = true } = {}) {
  const questions = [];
  for (let de = 0; ; de += 1000) {
    let req = supabase.from("quiz_questions").select("id,prompt,notion,concept").order("id").range(de, de + 999);
    if (setIds.length) req = req.in("set_id", setIds);
    const { data, error } = await req;
    if (colonnesAbsentes(error)) return { absentes: true };
    if (error) throw error;
    questions.push(...data);
    if (data.length < 1000) break;
  }
  const { groupes, inchangees, sansDonnee } = ecrituresAFaire(questions, chargerRattachement());
  let ecrites = 0;
  for (const g of groupes) {
    for (let i = 0; i < g.ids.length; i += 200) {
      const lot = g.ids.slice(i, i + 200);
      if (ecrire) {
        const { error } = await supabase.from("quiz_questions").update({ notion: g.notion, concept: g.concept }).in("id", lot);
        if (error) throw error;
      }
      ecrites += lot.length;
    }
  }
  return { ecrites, inchangees, sansDonnee };
}

const litteral = (v) => (v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

/**
 * Le remplissage en SQL, à coller dans le SQL Editor après migration_notions.sql :
 * une ligne par couple (notion, concept), avec la liste de ses empreintes.
 * Rejouable : n'écrit que les questions dont la valeur change.
 */
export function sqlRemplissage(rattachement, entete) {
  const groupes = new Map();
  for (const [e, v] of rattachement) {
    const cle = JSON.stringify([v.notion, v.concept]);
    if (!groupes.has(cle)) groupes.set(cle, { ...v, empreintes: [] });
    groupes.get(cle).empreintes.push(e);
  }
  const lignes = [...groupes.values()].map((g) => `  (${litteral(g.notion)}, ${litteral(g.concept)}, '{${g.empreintes.sort().join(",")}}'::text[])`);
  return `${entete}
UPDATE quiz_questions q
SET notion = v.notion, concept = v.concept
FROM (
  SELECT x.notion, x.concept, unnest(x.empreintes) AS empreinte
  FROM (VALUES
${lignes.join(",\n")}
  ) AS x(notion, concept, empreintes)
) AS v
WHERE left(md5(q.prompt), 16) = v.empreinte
  AND (q.notion IS DISTINCT FROM v.notion OR q.concept IS DISTINCT FROM v.concept);
`;
}
