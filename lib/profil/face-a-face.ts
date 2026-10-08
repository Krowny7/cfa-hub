import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DUEL_QUESTIONS } from "@/lib/duels";

// Le Face-à-face : les duels terminés entre celui qui regarde et le joueur
// du profil, lus avec le client de CELUI QUI REGARDE (politique
// duels_read_own de migration_duels_elo.sql : on ne lit que ses propres
// duels). Le bilan, les 5 derniers, le dernier, et le duel encore ouvert
// entre les deux s'il y en a un. null tant que les duels manquent.
// Module serveur.

export type DuelCommun = {
  id: string;
  /** fin du duel (ISO) */
  fin: string;
  /** null : match nul */
  gagne: boolean | null;
  monScore: number | null;
  sonScore: number | null;
  total: number;
  /** variation de mon ELO */
  monDelta: number | null;
};

export type FaceAFace = {
  /** du plus récent au plus ancien (50 au plus) */
  duels: DuelCommun[];
  victoires: number;
  defaites: number;
  nuls: number;
  /** un duel en attente ou en cours entre les deux */
  ouvert: string | null;
};

type Ligne = {
  id: string;
  status: string;
  challenger_id: string;
  challenger_score: number | null;
  opponent_score: number | null;
  challenger_delta: number | null;
  opponent_delta: number | null;
  winner_id: string | null;
  finished_at: string | null;
  question_ids: string[] | null;
};

/** Les duels entre `moi` (celui qui regarde, client `sb`) et `autre` ; une lecture par requête. */
export const faceAFace = cache(async (sb: SupabaseClient, moi: string, autre: string): Promise<FaceAFace | null> => {
  if (moi === autre) return null;
  try {
    const { data, error } = await sb
      .from("duels")
      .select("id,status,challenger_id,challenger_score,opponent_score,challenger_delta,opponent_delta,winner_id,finished_at,question_ids")
      .or(`and(challenger_id.eq.${moi},opponent_id.eq.${autre}),and(challenger_id.eq.${autre},opponent_id.eq.${moi})`)
      .in("status", ["finished", "pending", "active"])
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) return null;
    const lignes = (data ?? []) as Ligne[];
    const duels = lignes
      .filter((d) => d.status === "finished" && d.finished_at)
      .sort((a, b) => Date.parse(b.finished_at as string) - Date.parse(a.finished_at as string))
      .slice(0, 50)
      .map((d): DuelCommun => {
        const mien = d.challenger_id === moi;
        return {
          id: d.id,
          fin: d.finished_at as string,
          gagne: d.winner_id ? d.winner_id === moi : null,
          monScore: mien ? d.challenger_score : d.opponent_score,
          sonScore: mien ? d.opponent_score : d.challenger_score,
          total: d.question_ids?.length || DUEL_QUESTIONS,
          monDelta: mien ? d.challenger_delta : d.opponent_delta,
        };
      });
    return {
      duels,
      victoires: duels.filter((d) => d.gagne === true).length,
      defaites: duels.filter((d) => d.gagne === false).length,
      nuls: duels.filter((d) => d.gagne === null).length,
      ouvert: lignes.find((d) => d.status === "pending" || d.status === "active")?.id ?? null,
    };
  } catch {
    return null;
  }
});

export type Ecart = { key: string; points: number };

/**
 * Les matières mesurées des deux côtés, par écart : celles où l'autre te
 * devance (les plus grands écarts d'abord), celles où tu le devances.
 */
export function ecartsMatieres(
  siennes: { key: string; pct: number | null }[],
  miennes: { key: string; pct: number | null }[],
  n = 3,
): { ilDevance: Ecart[]; tuDevances: Ecart[]; communes: number } {
  const mien = new Map(miennes.map((m) => [m.key, m.pct]));
  const ecarts = siennes
    .filter((m) => m.pct !== null && mien.get(m.key) !== null && mien.get(m.key) !== undefined)
    .map((m) => ({ key: m.key, points: Math.round((m.pct as number) - (mien.get(m.key) as number)) }));
  return {
    ilDevance: ecarts.filter((e) => e.points > 0).sort((a, b) => b.points - a.points).slice(0, n),
    tuDevances: ecarts
      .filter((e) => e.points < 0)
      .map((e) => ({ key: e.key, points: -e.points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, n),
    communes: ecarts.length,
  };
}
