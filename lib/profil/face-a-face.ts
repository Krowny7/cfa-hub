import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DUEL_QUESTIONS } from "@/lib/duels";

// Le Face-à-face : les duels terminés entre celui qui regarde et le joueur
// du profil, lus avec le client de CELUI QUI REGARDE (politique
// duels_read_own de migration_duels_elo.sql : on ne lit que ses propres
// duels). Le bilan (compté sur tous les duels de la paire), les 50 derniers,
// et le duel encore ouvert entre les deux s'il y en a un. null tant que les
// duels manquent. Module serveur.

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
  /** le bilan : tous les duels terminés de la paire, sans limite */
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
  expires_at: string | null;
  time_limit_seconds: number | null;
  challenger_started_at: string | null;
  challenger_finished_at: string | null;
  opponent_started_at: string | null;
  opponent_finished_at: string | null;
};

/**
 * Un duel en attente ou en cours que duel_refresh_mine réglerait à la
 * prochaine visite de /duel (même règle que migration_duels_elo.sql) :
 * fenêtre dépassée, chrono écoulé d'un côté, ou les deux copies rendues. La
 * base ne règle les duels qu'à la demande : on ne le montre pas comme ouvert.
 */
function aRegler(d: Ligne, maintenant: number): boolean {
  const limite = (d.time_limit_seconds ?? 0) * 1000;
  const ecoule = (debut: string | null, fin: string | null) => !!debut && !fin && Date.parse(debut) + limite < maintenant;
  return (
    (!!d.expires_at && Date.parse(d.expires_at) < maintenant) ||
    ecoule(d.challenger_started_at, d.challenger_finished_at) ||
    ecoule(d.opponent_started_at, d.opponent_finished_at) ||
    (d.status === "active" && !!d.challenger_finished_at && !!d.opponent_finished_at)
  );
}

/** Les duels entre `moi` (celui qui regarde, client `sb`) et `autre` ; une lecture par requête. */
export const faceAFace = cache(async (sb: SupabaseClient, moi: string, autre: string): Promise<FaceAFace | null> => {
  if (moi === autre) return null;
  try {
    const paire = `and(challenger_id.eq.${moi},opponent_id.eq.${autre}),and(challenger_id.eq.${autre},opponent_id.eq.${moi})`;
    // le bilan se compte à part, sur tous les duels terminés de la paire
    const compte = (gagnant: string | null) => {
      const q = sb.from("duels").select("id", { count: "exact", head: true }).or(paire).eq("status", "finished");
      return gagnant ? q.eq("winner_id", gagnant) : q.is("winner_id", null);
    };
    const [{ data, error }, v, d, n] = await Promise.all([
      sb
        .from("duels")
        .select(
          "id,status,challenger_id,challenger_score,opponent_score,challenger_delta,opponent_delta,winner_id,finished_at,question_ids,expires_at,time_limit_seconds,challenger_started_at,challenger_finished_at,opponent_started_at,opponent_finished_at",
        )
        .or(paire)
        .in("status", ["finished", "pending", "active"])
        .order("created_at", { ascending: false })
        .limit(60),
      compte(moi),
      compte(autre),
      compte(null),
    ]);
    if (error || v.error || d.error || n.error) return null;
    const lignes = (data ?? []) as Ligne[];
    const duels = lignes
      .filter((l) => l.status === "finished" && l.finished_at)
      .sort((a, b) => Date.parse(b.finished_at as string) - Date.parse(a.finished_at as string))
      .slice(0, 50)
      .map((l): DuelCommun => {
        const mien = l.challenger_id === moi;
        return {
          id: l.id,
          fin: l.finished_at as string,
          gagne: l.winner_id ? l.winner_id === moi : null,
          monScore: mien ? l.challenger_score : l.opponent_score,
          sonScore: mien ? l.opponent_score : l.challenger_score,
          total: l.question_ids?.length || DUEL_QUESTIONS,
          monDelta: mien ? l.challenger_delta : l.opponent_delta,
        };
      });
    const maintenant = Date.now();
    return {
      duels,
      victoires: v.count ?? 0,
      defaites: d.count ?? 0,
      nuls: n.count ?? 0,
      ouvert: lignes.find((l) => (l.status === "pending" || l.status === "active") && !aRegler(l, maintenant))?.id ?? null,
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
