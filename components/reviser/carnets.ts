import type { SupabaseClient } from "@supabase/supabase-js";
import { SUBJECTS, subjectByDrillTitle } from "@/components/reviser/catalog";
import { vuesParSet } from "@/components/reviser/parcours-data";

// L'avancement des fiches page par page, pour la rangée de carnets de /fiches (direction « le lieu,
// puis l'objet », 2026-11-13). Une page de fiche est FAITE quand chacune des questions de son quiz a
// reçu au moins une réponse (la même mesure que « fiche finie » sur la carte de Réviser :
// components/reviser/parcours.ts, avancementFiches) ; ENTAMÉE dès la première réponse. Le carnet
// conseillé est le même que celui de la carte : la première fiche entamée pas finie, sinon la
// première pas commencée. Calculs purs + une lecture (serveur).

export type Carnet = {
  key: string;
  code: string;
  nom: string;
  /** /fiches/<slug> ; null : pas encore de fiche */
  href: string | null;
  /** pages de quiz publiées pour la matière */
  pages: number;
  faites: number;
  entamees: number;
};

export type Carnets = { carnets: Carnet[]; conseil: string | null; pagesFaites: number; pagesTotal: number; finies: number; entamees: number; neuves: number };

type SetLu = { id: string; title: string; questions: number };

/** Les carnets des dix matières, dans l'ordre du programme ; `vues` null : avancement inconnu (zéro partout). */
export function carnetsDe(sets: SetLu[], vues: ReadonlyMap<string, number> | null): Carnets {
  const parMatiere = new Map<string, { pages: number; faites: number; entamees: number }>();
  for (const s of sets) {
    const m = subjectByDrillTitle(s.title);
    if (!m || !/ — Drill Fiche Page [0-9]+/.test(s.title) || s.questions <= 0) continue;
    const c = parMatiere.get(m.key) ?? { pages: 0, faites: 0, entamees: 0 };
    const v = Math.min(vues?.get(s.id) ?? 0, s.questions);
    c.pages += 1;
    if (v >= s.questions) c.faites += 1;
    else if (v > 0) c.entamees += 1;
    parMatiere.set(m.key, c);
  }
  const carnets: Carnet[] = SUBJECTS.map((s) => {
    const c = parMatiere.get(s.key) ?? { pages: 0, faites: 0, entamees: 0 };
    return { key: s.key, code: s.code, nom: s.name, href: s.fiche ? `/fiches/${s.fiche}` : null, ...c };
  });
  const ouverts = carnets.filter((c) => c.href && c.pages > 0);
  const etat = (c: Carnet) => (c.faites >= c.pages ? "finie" : c.faites + c.entamees > 0 ? "entamee" : "neuve");
  const conseil = (ouverts.find((c) => etat(c) === "entamee") ?? ouverts.find((c) => etat(c) === "neuve"))?.key ?? null;
  return {
    carnets,
    conseil: vues ? conseil : (ouverts[0]?.key ?? null),
    pagesFaites: carnets.reduce((a, c) => a + c.faites, 0),
    pagesTotal: carnets.reduce((a, c) => a + c.pages, 0),
    finies: ouverts.filter((c) => etat(c) === "finie").length,
    entamees: ouverts.filter((c) => etat(c) === "entamee").length,
    neuves: ouverts.filter((c) => etat(c) === "neuve").length,
  };
}

/**
 * Les pages de quiz des fiches (drills officiels publiés seulement, comme la carte de Réviser) et les
 * questions vues par le joueur. Les sets se lisent avec le client admin s'il existe ; toute erreur,
 * avancement illisible compris (comme lireFiches) : null (la page montre les carnets sans chiffre,
 * plutôt que des zéros pris pour le vrai état du joueur).
 */
export async function lireCarnets(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string): Promise<Carnets | null> {
  try {
    const [sets, vues] = await Promise.all([
      (admin ?? supabase)
        .from("quiz_sets")
        .select("id,title,quiz_questions(count)")
        .eq("is_official", true)
        .eq("official_published", true)
        .like("title", "% — Drill Fiche Page %")
        .limit(1000),
      vuesParSet(supabase, userId),
    ]);
    if (sets.error || !Array.isArray(sets.data) || !vues) return null;
    const lus = (sets.data as { id: string; title: string; quiz_questions: { count: number }[] | null }[]).map((s) => ({
      id: String(s.id),
      title: s.title,
      questions: Number(s.quiz_questions?.[0]?.count) || 0,
    }));
    if (!lus.length) return null;
    return carnetsDe(lus, vues);
  } catch {
    return null;
  }
}
