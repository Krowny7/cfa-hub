"use server";

import { lireNotionsJoueur, pointsFaiblesLegers } from "@/components/moi/points-faibles-data";
import type { NotionATravailler } from "@/lib/notions-choix";
import { createClient } from "@/lib/supabase/server";

/** Le badge « À travailler » du joueur seul : la liste de ses points faibles, celle de Moi. */
export async function mesNotionsATravailler(): Promise<NotionATravailler[]> {
  const supabase = await createClient();
  const base = await lireNotionsJoueur(supabase);
  if (!base) return [];
  return pointsFaiblesLegers(base, Date.now()).liste.flatMap((p) => (p.lm ? [{ notion: p.lm, joueurs: 1 }] : []));
}
