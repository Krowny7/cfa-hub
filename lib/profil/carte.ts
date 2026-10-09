import type { SupabaseClient } from "@supabase/supabase-js";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import { lireStyle, statsProfil } from "@/lib/profil/donnees";
import { posesDe, sceauxDe, type EtatSceau } from "@/lib/profil/sceaux";
import type { StyleProfil } from "@/lib/profil/catalogue";

// La carte joueur (components/profil/CarteJoueur.tsx), côté serveur : ce
// qu'il faut pour la feuille ouverte au toucher d'un joueur (classement,
// lobby des duels, amis) : bannière et sceau, rang et pic, niveau, ses 3
// sceaux posés. Rien de privé : ce que l'en-tête de son profil montre à
// tout le monde. Module serveur (l'action : app/people/carte.ts).

export type CarteData = {
  id: string;
  nom: string;
  avatarUrl: string | null;
  style: Pick<StyleProfil, "banner" | "bannerUrl" | "bannerPos" | "accent" | "frame">;
  niveau: number;
  elo: number;
  mastery: number | null;
  place: number | null;
  gamesPlayed: number;
  /** meilleur palier atteint (index dans TIERS) */
  pic: number;
  poses: EtatSceau[];
  /** la carte de celui qui regarde */
  moi: boolean;
};

/** La carte du joueur `id`, lue avec `sb` (les exploits : client admin s'il existe) ; null s'il n'existe pas. */
export async function lireCarte(sb: SupabaseClient, id: string, moi: string | null): Promise<CarteData | null> {
  try {
    const [{ data: profil }, { data: rating }, { style }, stats, place, maitrises] = await Promise.all([
      sb.from("profiles").select("id,username,avatar_url,xp_total").eq("id", id).maybeSingle(),
      sb.from("ratings").select("elo,games_played").eq("user_id", id).maybeSingle(),
      lireStyle(sb, id),
      statsProfil(id, sb),
      getLeaderboardRank(sb, id),
      masteryByUser(tryAdmin(), [id]),
    ]);
    if (!profil) return null;
    const p = profil as { id: string; username: string | null; avatar_url: string | null; xp_total: number | null };
    const r = rating as { elo?: number; games_played?: number } | null;
    return {
      id,
      nom: displayName(p.username, id),
      avatarUrl: p.avatar_url,
      style: { banner: style.banner, bannerUrl: style.bannerUrl, bannerPos: style.bannerPos, accent: style.accent, frame: style.frame },
      niveau: levelInfoFromXp(Number(p.xp_total ?? 0) || 0).level,
      elo: r?.elo ?? DEFAULT_ELO,
      mastery: maitrises.get(id) ?? null,
      place,
      gamesPlayed: r?.games_played ?? 0,
      pic: stats.palierMax,
      poses: posesDe(sceauxDe(stats)),
      moi: moi === id,
    };
  } catch {
    return null;
  }
}
