// Le dernier vainqueur des 30 : la meilleure copie du dernier jour passé où quelqu'un
// a rendu la sienne, pour la bannière de l'accueil (components/accueil/lobby/BandeVainqueur.tsx).
// Hier d'abord, puis on remonte : la carte reste un jour sans copie. Lecture seule, côté
// serveur : le classement d'un jour passé (RPC du défi, figé une fois le jour passé), puis
// sa bannière de profil (son image, et la couleur de contour qu'il a choisie, composée ou
// simple). Tout dégrade proprement : aucune copie, RPC absente → null, jamais d'exception.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDailyBoard, shiftDay, type DailyBoard } from "@/lib/daily";
import type { PaletteCle } from "@/lib/palettes";
import { lireStyle } from "@/lib/profil/donnees";
import { encreDe } from "@/lib/profil/banniere";
import { displayName } from "@/components/classement/format";

export type VainqueurDuJour = {
  /** le jour de ces 30, « 2026-10-10 » */
  day: string;
  userId: string;
  name: string;
  isMe: boolean;
  score: number;
  total: number;
  seconds: number;
  /** copies rendues ce jour-là, le vainqueur compris */
  players: number;
  /** l'image de bannière de son profil, sinon null (la bannière prend sa peinture par défaut) */
  bannerUrl: string | null;
  /** la couleur du contour de sa bannière (composée : composition.encre ; simple : celle du fanion) ; absente ou null : le liquide de son rang */
  encre?: PaletteCle | null;
};

const plage = (de: number, a: number) => Array.from({ length: a - de + 1 }, (_, i) => de + i);
/** Les jours à remonter : hier seul (le cas courant, une lecture), puis par paquets lus en parallèle. */
const RECULS = [[1], plage(2, 14), plage(15, 60)];

async function dernierClassement(sb: SupabaseClient, today: string): Promise<DailyBoard | null> {
  for (const paquet of RECULS) {
    const boards = await Promise.all(paquet.map((n) => getDailyBoard(sb, shiftDay(today, -n), 1)));
    const trouve = boards.find((b) => b?.exists && b.rows[0]?.total);
    if (trouve) return trouve;
  }
  return null;
}

/** @param today le jour d'aujourd'hui (Paris), « 2026-10-11 » : on lit à partir de la veille */
export async function lireVainqueurDuJour(sb: SupabaseClient, meId: string, today: string): Promise<VainqueurDuJour | null> {
  try {
    const board = await dernierClassement(sb, today);
    const top = board?.rows[0];
    if (!board || !top) return null;
    const { style } = await lireStyle(sb, top.userId);
    return {
      day: board.day,
      userId: top.userId,
      name: displayName(top.username, top.userId),
      isMe: top.userId === meId,
      score: top.score,
      total: top.total,
      seconds: top.seconds,
      players: Math.max(board.players, 1),
      bannerUrl: style.bannerUrl,
      // la couleur de sa composition, ou celle de son fanion (choisie sans composer)
      encre: encreDe(style),
    };
  } catch {
    return null;
  }
}
