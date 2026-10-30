// Salles : le lancement d'une partie, côté SERVEUR du site seulement.
//
// Les calculs (lib/calc) vivent dans des catalogues avec leurs réponses : ce
// module les importe, donc il ne doit JAMAIS être importé par un composant
// client (même règle que lib/calc/index.ts). Le seul chemin : une action
// serveur ("use server") ou une route qui appelle lancerSession() avec le
// client Supabase du serveur (lib/supabase/server) ; le navigateur de l'admin
// ne voit ni les calculs tirés, ni leurs réponses (il ne peut donc pas jouer
// avec). Les questions de cours, elles, sont tirées par la base
// (lancer_session).
//
// Exemple d'action serveur :
//   "use server";
//   export async function lancerPartie(salleId: string, params: unknown) {
//     return lancerSession(await createClient(), salleId, params);
//   }

import type { SupabaseClient } from "@supabase/supabase-js";
import { calcQuestion } from "@/lib/calc/index";
import { drawSession } from "@/lib/calc/session-draw";
import { correctionSteps, toleranceOf } from "@/lib/calc/engine";
import { MIX_DEFAUT, SESSION_MAX, SESSION_MIN, sessionTypeKey, type ParNiveau } from "@/lib/calc/session";
import type { CalcLevel } from "@/lib/calc/types";
import { lancerSessionBrute } from "./api";
import { repartirNombre, validerParams } from "./logique";
import type { CalculPourSalle, SalleDifficulte, SalleParams, SessionLancee } from "./types";

/** Le mélange de niveaux d'une difficulté de salle : un niveau seul, ou le mélange « progressif » de /calculs/session. */
export function mixDeDifficulte(d: SalleDifficulte): ParNiveau {
  if (d === "melange") return { ...MIX_DEFAUT };
  const mix: ParNiveau = { facile: 0, moyen: 0, difficile: 0 };
  mix[d as CalcLevel] = 100;
  return mix;
}

export type TirageCalculs = {
  calculs: CalculPourSalle[];
  /** combien on en voulait */
  demandes: number;
  /** le vivier des matières choisies est plus court que la demande */
  manque: boolean;
};

/**
 * Tire `n` calculs dans les matières choisies (mêmes catalogues et mêmes règles
 * de répartition que les sessions ciblées de /calculs/session : niveaux selon
 * la difficulté, types variés, jamais deux fois la même question), avec leur
 * réponse, leur tolérance et leur correction. Moins de `n` si le vivier est trop
 * court (`manque`) ; 0 si aucune des matières n'a de catalogue de calculs.
 */
export function tirerCalculs(params: Pick<SalleParams, "topics" | "difficulte">, n: number, rand: () => number = Math.random): TirageCalculs {
  const demandes = Math.max(0, Math.floor(n));
  if (demandes === 0) return { calculs: [], demandes, manque: false };
  // le moteur tire au moins 5 calculs ; on en garde les `demandes` premiers (déjà mêlés)
  const tirage = drawSession({ topics: params.topics, count: Math.min(SESSION_MAX, Math.max(SESSION_MIN, demandes)), mix: mixDeDifficulte(params.difficulte) }, rand);
  if (!tirage) return { calculs: [], demandes, manque: true };

  const calculs: CalculPourSalle[] = [];
  for (const item of tirage.items) {
    if (calculs.length >= demandes) break;
    const plein = calcQuestion(item.topic, item.typeKey, item.q.id);
    if (!plein) continue;
    const info = tirage.types[sessionTypeKey(item.topic, item.typeKey)];
    calculs.push({
      topic: item.topic,
      niveau: plein.level,
      libelle: info ? `${info.subject} · ${info.name}` : item.topic,
      enonce: plein.prompt,
      donnees: plein.data.map((d) => ({ label: d.label, value: d.value })),
      unite: plein.unit,
      decimales: plein.decimals,
      reponse: plein.answer,
      tolerance: toleranceOf(plein),
      stricte: !!plein.strict,
      etapes: correctionSteps(plein.solution),
    });
  }
  return { calculs, demandes, manque: calculs.length < demandes };
}

/**
 * Lance une partie dans une salle (l'appelant doit en être l'admin : le serveur
 * SQL le vérifie). Valide les réglages, tire les calculs ici si besoin, puis
 * appelle lancer_session, qui tire les questions, mêle le tout et fixe l'heure.
 * Lève une Error au message lisible (réglages invalides, pas admin, partie déjà
 * en cours, pas assez de contenu…).
 */
export async function lancerSession(supabase: SupabaseClient, salleId: string, brut: unknown, rand: () => number = Math.random): Promise<SessionLancee> {
  const v = validerParams(brut);
  if (!v.ok) throw new Error(v.erreurs.map((e) => e.message).join(" "));
  const params = v.params;

  const { calculs: voulus } = repartirNombre(params);
  let calculs: CalculPourSalle[] = [];
  if (voulus > 0) {
    calculs = tirerCalculs(params, voulus, rand).calculs;
    if (params.type === "calculs" && calculs.length === 0) {
      throw new Error("Aucun calcul n'est encore disponible pour ces matières : choisis-en d'autres, ou passe aux questions.");
    }
    // mélange sans calcul disponible : la base complète avec des questions
  }
  return lancerSessionBrute(supabase, salleId, params, calculs);
}
