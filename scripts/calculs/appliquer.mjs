// Pose quiz_questions.calcul (migration_ratures_calcul.sql : le carnet « Sans
// calcul ») depuis un classement JSON { "<id de question>": true | false }
// (true : la question demande un calcul). Écrit par paquets de 200 avec la clé
// service de .env.local. Rejouable : seules les questions dont la valeur
// change sont écrites ; un id absent de la banque est compté, jamais créé ;
// une question absente du fichier n'est pas touchée.
// Le classement est aussi rangé, par énoncé, dans scripts/calculs/
// classement.json (à commiter) : les id changent quand seedQuizSets efface et
// réinsère un topic, l'énoncé non ; scripts/lib/seed-core.mjs le reprend
// alors au lieu de l'estimation automatique.
// À lancer depuis la racine du dépôt, une fois la migration collée :
//   node scripts/calculs/appliquer.mjs <fichier.json>           (écrit dans la base)
//   node scripts/calculs/appliquer.mjs <fichier.json> --essai   (compte, n'écrit rien, ni base ni classement.json)
// Le chemin du fichier se passe en argument : jamais de chemin local codé en
// dur dans le dépôt (un antislash suivi d'un chiffre hexadécimal casse le CSS
// Tailwind du site).
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chargerClassement, ecrireClassement, fusionner } from "./classement.mjs";

const PAQUET = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const args = process.argv.slice(2);
const essai = args.includes("--essai");
const fichier = args.find((a) => !a.startsWith("--"));
if (!fichier) {
  console.error("Usage : node scripts/calculs/appliquer.mjs <fichier.json> [--essai]");
  process.exit(2);
}

// le classement
let brut;
try {
  brut = JSON.parse(fs.readFileSync(fichier, "utf8"));
} catch (e) {
  console.error(`${fichier} illisible : ${e.message}`);
  process.exit(2);
}
if (!brut || typeof brut !== "object" || Array.isArray(brut)) {
  console.error(`${fichier} : un objet { "<id>": true | false } est attendu`);
  process.exit(2);
}
const voulu = new Map();
const ignorees = [];
for (const [id, v] of Object.entries(brut)) {
  if (UUID.test(id) && typeof v === "boolean") voulu.set(id.toLowerCase(), v);
  else ignorees.push(id);
}
if (ignorees.length) console.log(`${ignorees.length} entrées ignorées (id non uuid ou valeur non booléenne), par ex. ${ignorees.slice(0, 3).join(", ")}`);
console.log(`${voulu.size} questions classées dans ${fichier} (${[...voulu.values()].filter(Boolean).length} avec calcul)`);
// le classement du dépôt, lu avant toute écriture (illisible : on s'arrête là)
const classement = chargerClassement();

// la base (clé service)
const ICI = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs
    .readFileSync(join(ICI, "..", "..", ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  process.exit(1);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const colonneAbsente = (e) => e && (e.code === "42703" || e.code === "PGRST204" || /column .*calcul/i.test(e.message ?? ""));
{
  const { error } = await db.from("quiz_questions").select("id,calcul").limit(1);
  if (colonneAbsente(error)) {
    console.error("La colonne quiz_questions.calcul n'existe pas : colle d'abord migration_ratures_calcul.sql dans le SQL Editor de Supabase. Rien n'est écrit.");
    process.exit(1);
  }
  if (error) throw error;
}

// ce qui change : la valeur en base, paquet par paquet ; et l'énoncé, pour le classement du dépôt
const ids = [...voulu.keys()];
const aEcrire = { true: [], false: [] };
const enonces = [];
let inchangees = 0;
let absentes = 0;
for (let i = 0; i < ids.length; i += PAQUET) {
  const lot = ids.slice(i, i + PAQUET);
  const { data, error } = await db.from("quiz_questions").select("id,calcul,prompt").in("id", lot);
  if (error) throw error;
  const enBase = new Map(data.map((r) => [r.id, r]));
  for (const id of lot) {
    const q = enBase.get(id);
    if (!q) {
      absentes++;
      continue;
    }
    enonces.push({ prompt: q.prompt, calcul: voulu.get(id) });
    if (q.calcul === voulu.get(id)) inchangees++;
    else aEcrire[String(voulu.get(id))].push(id);
  }
}

// l'écriture
const ecrites = { true: 0, false: 0 };
for (const v of [true, false]) {
  const liste = aEcrire[String(v)];
  for (let i = 0; i < liste.length; i += PAQUET) {
    const lot = liste.slice(i, i + PAQUET);
    if (essai) {
      ecrites[String(v)] += lot.length;
      continue;
    }
    const { data, error } = await db.from("quiz_questions").update({ calcul: v }).in("id", lot).select("id");
    if (error) throw error;
    ecrites[String(v)] += data.length;
  }
}
const total = ecrites.true + ecrites.false;
console.log(
  `${total} questions ${essai ? "à mettre à jour" : "mises à jour"} (${ecrites.true} avec calcul, ${ecrites.false} sans), ${inchangees} déjà à jour, ${absentes} absentes de la banque`,
);

// l'état de la banque
const compter = async (f) => {
  const { count, error } = await f(db.from("quiz_questions").select("id", { count: "exact", head: true }));
  if (error) throw error;
  return count ?? 0;
};
const [avec, sans, inconnues] = await Promise.all([compter((r) => r.eq("calcul", true)), compter((r) => r.eq("calcul", false)), compter((r) => r.is("calcul", null))]);
console.log(`Banque : ${avec} avec calcul, ${sans} sans, ${inconnues} inconnues (gardées par « Sans calcul »)`);

// le classement du dépôt, par énoncé (les questions présentes en base seulement)
const fusion = fusionner(classement, enonces);
if (!essai) ecrireClassement(classement);
console.log(
  `scripts/calculs/classement.json : ${fusion.ajoutees} énoncés ${essai ? "à ajouter" : "ajoutés"}, ${fusion.changees} ${essai ? "à changer" : "changés"}, ${classement.size} en tout` +
    (fusion.conflits ? ` ; ${fusion.conflits} énoncés classés des deux façons, laissés à l'estimation automatique` : "") +
    (essai ? "" : " (à commiter)"),
);
if (essai) console.log("essai : rien n'est écrit (relance sans --essai pour remplir la base et classement.json)");
