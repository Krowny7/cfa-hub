// Moi › Réglages : les jours de repos et de pause déjà posés (table
// serie_pauses, migration du Codex §8, V3 §10.4), d'aujourd'hui à plus tard.
// null : la table n'est pas encore là, le réglage ne s'affiche pas.
// Côté serveur uniquement (le réglage lui-même pose et retire par le client).
import type { SupabaseClient } from "@supabase/supabase-js";
import { baseAbsente } from "@/lib/profil/sceaux-base";
import { jourParis } from "@/lib/objectif";
import type { JourPause } from "@/components/moi/repos";

export type ReposInitial = { aujourdhui: string; poses: JourPause[] };

export async function lirePauses(sb: SupabaseClient, now = new Date()): Promise<ReposInitial | null> {
  const aujourdhui = jourParis(now);
  try {
    const { data, error } = await sb.from("serie_pauses").select("jour,genre").gte("jour", aujourdhui).order("jour").limit(400);
    if (error) return baseAbsente(error) ? null : { aujourdhui, poses: [] };
    const poses = (Array.isArray(data) ? data : []).flatMap((r: { jour?: unknown; genre?: unknown }): JourPause[] =>
      typeof r.jour === "string" && (r.genre === "repos" || r.genre === "pause") ? [{ jour: r.jour.slice(0, 10), genre: r.genre }] : [],
    );
    return { aujourdhui, poses };
  } catch {
    return null;
  }
}
