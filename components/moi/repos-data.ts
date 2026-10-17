// Moi › Réglages : les jours de repos et de pause déjà posés (table
// serie_pauses, migration du Codex §8, V3 §10.4), depuis un an (les règles
// de serie_pause_poser comptent aussi les jours passés : la semaine en cours,
// l'année glissante, les pauses qui se suivent) jusqu'à plus tard.
// null : la table n'est pas encore là, le réglage ne s'affiche pas.
// Côté serveur uniquement (le réglage lui-même pose et retire par le client).
import type { SupabaseClient } from "@supabase/supabase-js";
import { baseAbsente } from "@/lib/profil/sceaux-base";
import { jourParis } from "@/lib/objectif";
import { ajouterJours, type JourPause } from "@/components/moi/repos";

/** `poses` : depuis aujourd'hui - 364 jours (passés compris ; le réglage n'affiche que ceux d'aujourd'hui et après). */
export type ReposInitial = { aujourdhui: string; poses: JourPause[] };

/** Le premier jour lu : celui que regarde la base pour l'année glissante. */
export const debutLecturePauses = (aujourdhui: string) => ajouterJours(aujourdhui, -364);

export async function lirePauses(sb: SupabaseClient, now = new Date()): Promise<ReposInitial | null> {
  const aujourdhui = jourParis(now);
  try {
    const { data, error } = await sb.from("serie_pauses").select("jour,genre").gte("jour", debutLecturePauses(aujourdhui)).order("jour").limit(800);
    if (error) return baseAbsente(error) ? null : { aujourdhui, poses: [] };
    const poses = (Array.isArray(data) ? data : []).flatMap((r: { jour?: unknown; genre?: unknown }): JourPause[] =>
      typeof r.jour === "string" && (r.genre === "repos" || r.genre === "pause") ? [{ jour: r.jour.slice(0, 10), genre: r.genre }] : [],
    );
    return { aujourdhui, poses };
  } catch {
    return null;
  }
}
