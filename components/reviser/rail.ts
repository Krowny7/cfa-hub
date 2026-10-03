import { SUBJECTS } from "@/components/reviser/catalog";
import { TOPICS } from "@/lib/practiceTopics";
import type { TopicRailItem } from "@/components/ui/TopicRail";

// Cartes du sélecteur de matières (components/ui/TopicRail), préparées côté
// serveur à partir des vraies données : ordre officiel du programme, code
// court, maîtrise. Module neutre (pas de "use client").

type Row = { key: string; pct: number | null };

/** « 07 » */
export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Poids officiel de la matière à l'examen (milieu de fourchette, en %). */
export function examWeight(key: string): number | null {
  return TOPICS.find((t) => t.key === key)?.weight ?? null;
}

/** « 17,5 % de l'examen » */
export function weightLabel(key: string) {
  const w = examWeight(key);
  return w === null ? null : `${String(w).replace(".", ",")} % de l'examen`;
}

/**
 * Les 10 matières dans l'ordre officiel, prêtes pour TopicRail. `rows`
 * donne la maîtrise (dans n'importe quel ordre, matières absentes = non
 * mesurées) ; `extra` ajoute lien, note ou formats matière par matière.
 */
export function subjectRail(rows: Row[], extra?: (key: string, pct: number | null) => Partial<TopicRailItem>): TopicRailItem[] {
  const pct = new Map(rows.map((r) => [r.key, r.pct]));
  return SUBJECTS.map((s, i) => {
    const p = pct.get(s.key) ?? null;
    return { key: s.key, index: i + 1, name: s.name, code: s.code, pct: p, ...(extra?.(s.key, p) ?? {}) };
  });
}

/** Lien vers la matière dans Réviser (fiche, cours et cartes de la matière). */
export const reviserHref = (key: string) => `/reviser?matiere=${encodeURIComponent(key)}`;
