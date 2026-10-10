// Moi › Marquées : les questions que le joueur a marquées en les croisant
// (migration_question_flags.sql, get_flagged_questions). La bonne réponse et
// l'explication n'arrivent que pour une question déjà répondue (la fonction
// le vérifie). Côté serveur uniquement.
import type { SupabaseClient } from "@supabase/supabase-js";
import { FICHES } from "@/components/moi/errors-data";
import type { SourceMarque } from "@/lib/marques";

export type QuestionMarquee = {
  questionId: string;
  flaggedAt: string;
  source: SourceMarque | null;
  prompt: string;
  choices: string[];
  /** la fiche (« Fiche Fixed Income ») ou la matière (« Éthique et Standards Professionnels ») */
  rubrique: string;
  page: number | null;
  /** la page de fiche où la retrouver (null hors fiche, ou retirée de la fiche) */
  href: string | null;
  answered: boolean;
  correctIndex: number | null;
  explanation: string | null;
};

export type Marquees = { available: boolean; items: QuestionMarquee[] };

export const PAS_DE_MARQUES: Marquees = { available: true, items: [] };

type Ligne = {
  question_id: string;
  flagged_at: string;
  source: string | null;
  prompt: string;
  choices: string[] | null;
  set_title: string | null;
  folder_name: string | null;
  answered: boolean | null;
  correct_index: number | null;
  explanation: string | null;
};

const SOURCES = new Set<SourceMarque>(["fiche", "session", "defi", "eclair", "duel", "qcm", "examen", "atelier"]);

/** D'où vient la question : la fiche et sa page, sinon la matière (dossier « … (Système) »), sinon la série. */
export function rubriqueDe(setTitle: string | null, folder: string | null) {
  const titre = setTitle ?? "";
  const retiree = titre.startsWith("Réserve — ");
  const brut = retiree ? titre.slice("Réserve — ".length) : titre;
  const drill = /^(.+?) — Drill Fiche Page ([0-9]+)/.exec(brut);
  if (drill) {
    const fiche = drill[1].trim();
    const page = Number(drill[2]);
    return { rubrique: `Fiche ${fiche}`, page, href: !retiree && FICHES[fiche] ? `${FICHES[fiche]}?page=${page}` : null };
  }
  const matiere = (folder ?? "").replace(/\s*\(Système\)\s*$/, "").trim();
  return { rubrique: matiere || titre || "Questions", page: null, href: null };
}

export async function getMarquees(supabase: SupabaseClient): Promise<Marquees> {
  try {
    const { data, error } = await supabase.rpc("get_flagged_questions");
    // fonction absente (migration pas encore collée) : le panneau montre les marques gardées sur l'appareil
    if (error) return { available: false, items: [] };
    const items = ((data ?? []) as Ligne[]).map((l) => {
      const r = rubriqueDe(l.set_title, l.folder_name);
      return {
        questionId: l.question_id,
        flaggedAt: l.flagged_at,
        source: l.source && SOURCES.has(l.source as SourceMarque) ? (l.source as SourceMarque) : null,
        prompt: l.prompt,
        choices: l.choices ?? [],
        ...r,
        answered: !!l.answered,
        correctIndex: l.answered ? l.correct_index : null,
        explanation: l.answered ? l.explanation : null,
      };
    });
    return { available: true, items };
  } catch {
    return { available: false, items: [] };
  }
}
