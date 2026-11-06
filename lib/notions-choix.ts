import type { SupabaseClient } from "@supabase/supabase-js";

// Le choix par notion : ce qu'on peut cocher, ce qui est à travailler, et le calcul du résumé.
// Partagé par l'entraînement ciblé et les Salles (migration_notions_choix.sql).

export type SourceNotions = "practice" | "banque" | "mocks" | "examen";
/** Un mock officiel : ses sessions et sa version (source « examen »). */
export type MockNotions = { examens: string[]; version: string };
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

/** Le choix, sans ce que la source ne propose plus (d'autres sessions de mock, par exemple). */
export function choixDisponible(v: ChoixNotionsValeur, dispo: NotionDispo[]): ChoixNotionsValeur {
  const notions = new Set(dispo.map((n) => n.notion));
  const concepts = new Set(dispo.flatMap((n) => n.concepts.map((c) => c.concept)));
  return { notions: v.notions.filter((n) => notions.has(n)), concepts: v.concepts.filter((c) => concepts.has(c)) };
}

/** Sans accents ni majuscules, pour la recherche. */
export const plat = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Le libellé répond-il à la recherche (déjà passée par plat) ? Une recherche courte vise le début d'un mot : « ips » ne tombe pas dans « relationships ». */
export function contientRecherche(texte: string, q: string): boolean {
  const p = plat(texte);
  if (q.length > 4 || /[^a-z0-9]/.test(q)) return p.includes(q);
  return p.split(/[^a-z0-9]+/).some((m) => m.startsWith(q));
}

const liste = <T,>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export async function lireNotionsDisponibles(sb: SupabaseClient, source: SourceNotions, mock?: MockNotions): Promise<NotionDispo[]> {
  const { data, error } = await sb.rpc("notions_disponibles", mock ? { p_source: source, p_examens: mock.examens, p_version: mock.version } : { p_source: source });
  if (error) throw new Error(error.message);
  return liste<NotionDispo>(data);
}

/** Dans une Salle : celles des joueurs présents, les communes d'abord. null : la lecture a échoué, ce qui n'empêche pas de choisir. */
export async function lireNotionsATravailler(sb: SupabaseClient, salleId: string): Promise<NotionATravailler[] | null> {
  const { data, error } = await sb.rpc("salle_notions_a_travailler", { p_salle_id: salleId });
  return error ? null : liste<NotionATravailler>(data);
}

/** Ce que plusieurs joueurs présents ont à travailler, et ce qui ne concerne qu'un seul. */
export function partagerFaibles<T extends { notion: string }>(lignes: T[], faibles: NotionATravailler[]): { communes: T[]; seules: T[] } {
  const joueurs = new Map(faibles.map((f) => [f.notion, f.joueurs]));
  return { communes: lignes.filter((l) => (joueurs.get(l.notion) ?? 0) >= 2), seules: lignes.filter((l) => (joueurs.get(l.notion) ?? 0) < 2) };
}
