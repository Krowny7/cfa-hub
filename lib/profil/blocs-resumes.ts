// Les résumés que montrent les blocs de la page de profil, tirés de ce que
// le serveur a lu (questions répondues, trophées, Journal) : de petites
// données sérialisables (lib/profil/blocs-donnees.ts), sans fonction ni Map,
// pour que la page n'envoie au client que ce qu'elle affiche.
// Appelé seulement par app/people/[id]/page.tsx et ModePersonnaliser.tsx.

import { ANSWER_SOURCES, SOURCE_LABELS, tallyOf, type AnswerStats } from "@/lib/answer-stats";
import type { LigneTrophee } from "@/lib/trophees";
import type { Journal } from "@/lib/profil/journal";
import type { ExtraitJournal, ResumeReponses, ResumeTrophees } from "@/lib/profil/blocs-donnees";

/** Les questions répondues : total, justes, précision et sources non vides (de la plus jouée à la moins jouée) ; null si rien n'a pu être lu. */
export function resumeReponses(s: AnswerStats): ResumeReponses | null {
  if (!s.available) return null;
  const t = tallyOf(s.by);
  const sources = ANSWER_SOURCES.map((source) => ({ source, nom: SOURCE_LABELS[source], n: tallyOf(s.by, source).n }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  return { total: t.n, justes: t.ok, precision: t.pct, sources, incomplet: s.missing.length > 0 };
}

/** Les trophées : les lignes et ce qui dit si toutes les sources ont été lues (la fonction auMoins ne passe pas au client). */
export function resumeTrophees(c: { lignes: LigneTrophee[]; complet: boolean }): ResumeTrophees {
  return { lignes: c.lignes, complet: c.complet };
}

/** L'extrait du Journal : la courbe d'ELO des 90 jours (90 points au plus, les derniers) et les 4 derniers événements. */
export function extraitJournal(j: Journal): ExtraitJournal {
  return {
    depart: j.courbe.depart,
    points: j.courbe.points.map((p) => p.apres).slice(-90),
    matchs: j.courbe.matchs,
    evenements: j.evenements.slice(0, 4),
  };
}
