import { SUBJECTS } from "@/components/reviser/catalog";
import { TOPICS } from "@/lib/practiceTopics";
import type { TopicRailItem } from "@/components/ui/TopicRail";
import { infobulleMaitrise, type StatutMaitrise } from "@/lib/maitrise";

// Cartes du sélecteur de matières (components/ui/TopicRail), préparées côté
// serveur à partir des vraies données : ordre officiel du programme, code
// court, maîtrise. Module neutre (pas de "use client").

type Row = { key: string; pct: number | null; statut?: StatutMaitrise; answered?: number };

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
  const parCle = new Map(rows.map((r) => [r.key, r]));
  return SUBJECTS.map((s, i) => {
    const r = parCle.get(s.key);
    const p = r?.pct ?? null;
    // une maîtrise provisoire (10 à 39 réponses) s'écrit « ≈ 52 % »
    const provisoire = p !== null && r?.statut ? infobulleMaitrise({ statut: r.statut, n: r.answered ?? 0 }) : null;
    return { key: s.key, index: i + 1, name: s.name, code: s.code, pct: p, ...(provisoire ? { provisoire } : {}), ...(extra?.(s.key, p) ?? {}) };
  });
}

/** Lien vers une matière depuis les rangées de matières (accueil, Moi) : sa fiche de révision ; sans fiche, Réviser. */
export const reviserHref = (key: string) => {
  const fiche = SUBJECTS.find((s) => s.key === key)?.fiche;
  return fiche ? `/fiches/${fiche}` : "/reviser";
};
