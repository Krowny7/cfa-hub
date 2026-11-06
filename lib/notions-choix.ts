import type { SupabaseClient } from "@supabase/supabase-js";

// Le choix par notion : ce qu'on peut cocher, ce qui est à travailler, et le calcul du résumé.
// Partagé par l'entraînement ciblé et les Salles (migration_notions_choix.sql).

export type SourceNotions = "practice" | "banque" | "mocks";
export type ConceptDispo = { concept: string; total: number };
export type NotionDispo = { notion: string; total: number; concepts: ConceptDispo[] };
export type NotionATravailler = { notion: string; joueurs: number };
export type ChoixNotionsValeur = { notions: string[]; concepts: string[] };

export const CHOIX_VIDE: ChoixNotionsValeur = { notions: [], concepts: [] };

/** La matière d'une notion : « fixed_income:11 » donne « fixed_income ». */
export const matiereDeNotion = (notion: string) => notion.split(":")[0];

export const choixVide = (v: ChoixNotionsValeur) => v.notions.length + v.concepts.length === 0;

/** Les matières touchées par le choix, concepts compris. */
export function matieresDuChoix(v: ChoixNotionsValeur, dispo: NotionDispo[]): string[] {
  const m = new Set(v.notions.map(matiereDeNotion));
  const voulus = new Set(v.concepts);
  for (const n of dispo) if (n.concepts.some((c) => voulus.has(c.concept))) m.add(matiereDeNotion(n.notion));
  return [...m];
}

/** Les questions couvertes : une notion cochée compte déjà ses concepts. */
export function questionsDuChoix(v: ChoixNotionsValeur, dispo: NotionDispo[]): number {
  const notions = new Set(v.notions);
  const concepts = new Set(v.concepts);
  let total = 0;
  for (const n of dispo) {
    if (notions.has(n.notion)) total += n.total;
    else for (const c of n.concepts) if (concepts.has(c.concept)) total += c.total;
  }
  return total;
}

/** Sans accents ni majuscules, pour la recherche. */
export const plat = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const liste = <T,>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export async function lireNotionsDisponibles(sb: SupabaseClient, source: SourceNotions): Promise<NotionDispo[]> {
  const { data, error } = await sb.rpc("notions_disponibles", { p_source: source });
  if (error) throw new Error(error.message);
  return liste<NotionDispo>(data);
}

/** Dans une Salle : celles des joueurs présents ; sinon les miennes. Une erreur ici n'empêche pas de choisir. */
export async function lireNotionsATravailler(sb: SupabaseClient, salleId?: string): Promise<NotionATravailler[]> {
  const { data, error } = salleId ? await sb.rpc("salle_notions_a_travailler", { p_salle_id: salleId }) : await sb.rpc("mes_notions_a_travailler");
  return error ? [] : liste<NotionATravailler>(data);
}
