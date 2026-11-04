import type { AnswerSource, AnswerStats } from "@/lib/answer-stats";

// Moi › Activités : tes séances, toutes sources confondues, de la plus récente à la plus
// ancienne. Une séance est rangée par matière et par thème dans lib/answer-stats ; on la
// recompose ici en additionnant ses morceaux (un mock de 90 questions couvre dix matières).
// Pur, sans accès à la base.

export type Activite = { id: string; source: AnswerSource; label: string; date: string; at: string; href: string | null; n: number; ok: number };

const ACTIVITES_MAX = 200;

export function activitesDe(stats: Pick<AnswerStats, "subjects"> | null): Activite[] {
  const parId = new Map<string, Activite>();
  for (const sujet of stats?.subjects ?? []) {
    for (const theme of sujet.themes) {
      for (const p of theme.passages) {
        const deja = parId.get(p.id);
        if (deja) {
          deja.n += p.n;
          deja.ok += p.ok;
        } else {
          parId.set(p.id, { id: p.id, source: p.source, label: p.label, date: p.date, at: p.at, href: p.href, n: p.n, ok: p.ok });
        }
      }
    }
  }
  return [...parId.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, ACTIVITES_MAX);
}
