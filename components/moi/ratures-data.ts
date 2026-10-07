// Le carnet de ratures (Moi › Erreurs, migration_ratures.sql) : toutes les
// questions manquées, d'où qu'elles viennent, gardées jusqu'à ce que le
// joueur les retire. Lecture par pages (get_ratures) : la première page
// arrive avec la page Moi, les suivantes à la demande (RaturesTab). Les
// fonctions de mise en forme servent aussi côté navigateur.
import type { SupabaseClient } from "@supabase/supabase-js";
import { rubriqueDe } from "@/components/moi/marquees-data";

export const PAGE_RATURES = 20;

export type RatureItem = {
  questionId: string;
  prompt: string;
  choices: string[];
  correctIndex: number | null;
  explanation: string | null;
  /** la dernière mauvaise réponse donnée */
  lastSelected: number | null;
  misses: number;
  sources: string[];
  lastSource: string;
  lastMissedAt: string;
  firstMissedAt: string;
  /** bonnes réponses depuis la dernière erreur */
  correctSince: number;
  removedAt: string | null;
  /** la fiche (« Fiche Fixed Income ») ou la matière */
  rubrique: string;
  page: number | null;
  href: string | null;
};

export type RaturesPage = {
  /** ratures au carnet (non retirées) */
  total: number;
  retirees: number;
  retireesSemaine: number;
  /** ratures de la vue demandée (filtre de source, ou retirées) */
  filtre: number;
  /** ratures au carnet par source */
  sources: Record<string, number>;
  items: RatureItem[];
};

/** available : false tant que la migration manque (l'onglet garde l'ancien carnet des fiches). */
export type Ratures = ({ available: true } & RaturesPage) | { available: false };

type Ligne = {
  question_id: string;
  prompt: string;
  choices: string[] | null;
  correct_index: number | null;
  explanation: string | null;
  last_selected: number | null;
  misses: number;
  sources: string[] | null;
  last_source: string;
  last_missed_at: string;
  first_missed_at: string;
  correct_since: number;
  removed_at: string | null;
  set_title: string | null;
  folder_name: string | null;
};

type Brut = { total: number; retirees: number; retirees_semaine: number; filtre: number; sources: Record<string, number> | null; items: Ligne[] | null };

export function pageDe(r: Brut): RaturesPage {
  return {
    total: Number(r.total) || 0,
    retirees: Number(r.retirees) || 0,
    retireesSemaine: Number(r.retirees_semaine) || 0,
    filtre: Number(r.filtre) || 0,
    sources: r.sources ?? {},
    items: (r.items ?? []).map((l) => ({
      questionId: l.question_id,
      prompt: l.prompt,
      choices: l.choices ?? [],
      correctIndex: l.correct_index,
      explanation: l.explanation,
      lastSelected: l.last_selected,
      misses: Number(l.misses) || 1,
      sources: l.sources ?? [],
      lastSource: l.last_source,
      lastMissedAt: l.last_missed_at,
      firstMissedAt: l.first_missed_at,
      correctSince: Number(l.correct_since) || 0,
      removedAt: l.removed_at,
      ...rubriqueDe(l.set_title, l.folder_name),
    })),
  };
}

/** Une page du carnet (navigateur comme serveur). */
export async function lireRatures(supabase: SupabaseClient, { source = null, retirees = false, offset = 0 }: { source?: string | null; retirees?: boolean; offset?: number } = {}) {
  const { data, error } = await supabase.rpc("get_ratures", { p_source: source, p_retirees: retirees, p_limit: PAGE_RATURES, p_offset: offset });
  if (error) return { error };
  return { page: pageDe(data as Brut) };
}

/** La première page, avec la page Moi. */
export async function getRatures(supabase: SupabaseClient): Promise<Ratures> {
  try {
    const r = await lireRatures(supabase);
    if ("error" in r) return { available: false };
    return { available: true, ...r.page };
  } catch {
    return { available: false };
  }
}
