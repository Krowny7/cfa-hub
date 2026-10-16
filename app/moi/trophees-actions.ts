"use server";

import { createClient } from "@/lib/supabase/server";
import { mesTropheesDepuis, type TropheeGagne } from "@/lib/trophees";

// Les trophées du joueur connecté gagnés depuis un instant (ISO), pour
// l'annonce de fin de séance (AnnonceTrophee) : mes_trophees_depuis, lue
// avec sa session (la base lit auth.uid()). Sans migration_v3_profil.sql §2,
// hors connexion ou au moindre souci : aucun, sans bruit.
export async function tropheesDepuis(depuis: string): Promise<TropheeGagne[]> {
  if (typeof depuis !== "string" || !Number.isFinite(Date.parse(depuis))) return [];
  try {
    const supabase = await createClient();
    return await mesTropheesDepuis(supabase, depuis);
  } catch {
    return [];
  }
}
