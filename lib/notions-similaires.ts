import { TOPIC_LABELS } from "@/lib/practiceTopics";

// Se retester sur ses ratures : le lien vers /practice, et le bilan de fin, concept par concept.
// Les questions viennent de generate_similaires (migration_notions_similaires.sql). Module pur.

/** Au-delà, l'adresse s'allonge pour rien : une séance compte 30 questions au plus. */
export const MAX_RATURES = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Les questions ratées, sans doublon ni vide (un calcul n'a pas de question). */
export const raturesUniques = (ids: (string | null | undefined)[]): string[] => [...new Set(ids.filter((id): id is string => !!id && UUID_RE.test(id)))];

/** Celles qui partent au tirage : au-delà du plafond, réparties sur toute la copie plutôt que les premières. */
export function ratures(ids: (string | null | undefined)[]): string[] {
  const toutes = raturesUniques(ids);
  if (toutes.length <= MAX_RATURES) return toutes;
  return Array.from({ length: MAX_RATURES }, (_, i) => toutes[Math.floor((i * toutes.length) / MAX_RATURES)]);
}

export const lienSimilaires = (ids: string[]): string => `/practice?similaires=${ids.join(",")}`;

/** Le paramètre d'adresse : rien de ce qui n'est pas un identifiant ne passe. */
export const lireSimilaires = (brut: string | null | undefined): string[] => ratures((brut ?? "").split(","));

/** Ce qu'une question du retest vient vérifier. */
export type CibleRetest = { questionId: string; topic: string; notion: string; concept: string | null };

export type VerdictRetest = "compris" | "en_progres" | "fragile";

export type LigneBilan = { cle: string; libelle: string; justes: number; total: number; verdict: VerdictRetest };

const ORDRE: Record<VerdictRetest, number> = { fragile: 0, en_progres: 1, compris: 2 };

/** Concept par concept : compris s'il est tout juste, fragile s'il est tout faux ; ce qui coince d'abord. */
export function bilanRetest(cibles: CibleRetest[], review: { question_id: string; is_correct: boolean }[]): LigneBilan[] {
  const justes = new Map(review.map((r) => [r.question_id, r.is_correct]));
  const groupes = new Map<string, { libelle: string; justes: number; total: number }>();
  for (const c of cibles) {
    const juste = justes.get(c.questionId);
    if (juste === undefined) continue;
    const cle = c.concept ?? c.notion;
    const g = groupes.get(cle) ?? { libelle: c.concept ?? TOPIC_LABELS[c.topic] ?? c.topic, justes: 0, total: 0 };
    g.total++;
    if (juste) g.justes++;
    groupes.set(cle, g);
  }
  return [...groupes]
    .map(([cle, g]): LigneBilan => ({ cle, ...g, verdict: g.justes === g.total ? "compris" : g.justes === 0 ? "fragile" : "en_progres" }))
    .sort((a, b) => ORDRE[a.verdict] - ORDRE[b.verdict] || a.justes / a.total - b.justes / b.total || a.libelle.localeCompare(b.libelle, "fr"));
}
