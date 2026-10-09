"use server";

import { createClient } from "@/lib/supabase/server";
import { lireCarte, type CarteData } from "@/lib/profil/carte";

// La carte joueur au toucher (components/profil/CarteJoueur.tsx) : pour un
// joueur connecté seulement.

export async function carteJoueur(id: string): Promise<CarteData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const moi = auth.user?.id;
  if (!moi) return null;
  return lireCarte(supabase, id, moi);
}
