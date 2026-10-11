// Le vainqueur du jour : la meilleure copie des 30 d'HIER, pour la bannière de
// l'accueil (components/accueil/VainqueurDuJour.tsx). Lecture seule, côté
// serveur : le classement d'un jour passé (RPC du défi, figé une fois le jour
// passé), puis ce qu'il faut pour son insigne (ELO, maîtrise, place) et sa
// bannière de profil. Tout dégrade proprement : pas de défi hier, pas de
// copie rendue, RPC absente → null (la bannière n'apparaît pas), jamais d'exception.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDailyBoard, shiftDay } from "@/lib/daily";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO, PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { lireStyle } from "@/lib/profil/donnees";
import { masteryByUser } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";

export type VainqueurDuJour = {
  /** le jour des 30 (hier), « 2026-10-10 » */
  day: string;
  userId: string;
  name: string;
  isMe: boolean;
  score: number;
  total: number;
  seconds: number;
  /** copies rendues ce jour-là, le vainqueur compris */
  players: number;
  /** palier de son insigne (index dans TIERS) */
  tier: number;
  /** pas encore assez de parties pour un rang : insigne grisé */
  placement: boolean;
  /** l'image de bannière de son profil, sinon null (la bannière prend sa peinture par défaut) */
  bannerUrl: string | null;
};

/**
 * @param today le jour d'aujourd'hui (Paris), « 2026-10-11 » : on lit la veille
 * @param admin client admin pour la maîtrise (facultatif : sans lui, pas de verrou de palier)
 */
export async function lireVainqueurDuJour(sb: SupabaseClient, admin: SupabaseClient | null, meId: string, today: string): Promise<VainqueurDuJour | null> {
  try {
    const day = shiftDay(today, -1);
    const board = await getDailyBoard(sb, day, 1);
    const top = board?.rows[0];
    if (!board || !board.exists || !top || !top.total) return null;
    const [{ data: rating }, { style }, maitrises, place] = await Promise.all([
      sb.from("ratings").select("elo,games_played").eq("user_id", top.userId).maybeSingle(),
      lireStyle(sb, top.userId),
      masteryByUser(admin, [top.userId]),
      getLeaderboardRank(sb, top.userId),
    ]);
    const r = rating as { elo?: number; games_played?: number } | null;
    const elo = r?.elo ?? DEFAULT_ELO;
    const rk = rankFor(elo, maitrises.get(top.userId) ?? null, place);
    return {
      day,
      userId: top.userId,
      name: displayName(top.username, top.userId),
      isMe: top.userId === meId,
      score: top.score,
      total: top.total,
      seconds: top.seconds,
      players: Math.max(board.players, 1),
      tier: rk.tierIndex,
      placement: (r?.games_played ?? 0) < PLACEMENT_GAMES,
      bannerUrl: style.bannerUrl,
    };
  } catch {
    return null;
  }
}
