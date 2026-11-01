"use server";

import { createClient } from "@/lib/supabase/server";

// La relance de « Ton rival » (accueil). Un clic sur « Relancer Marie » appelle
// la fonction SQL `relancer(p_a)` (migration_accueil.sql) avec la session du
// joueur : une relance par joueur relancé et par jour, trois par jour au plus,
// écrites par la base elle-même (la table n'accepte aucune écriture directe).
// Sans la migration, la fonction n'existe pas : « indisponible », et la carte
// n'affiche déjà pas le bouton.

export type StatutRelance = "ok" | "deja" | "limite" | "indisponible" | "connexion";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Relance un joueur. ok : envoyée ; deja : déjà relancé aujourd'hui ; limite : trois relances aujourd'hui ; connexion : pas connecté. */
export async function relancerRival(idAutre: string): Promise<StatutRelance> {
  if (typeof idAutre !== "string" || !UUID.test(idAutre)) return "indisponible";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "connexion";
  try {
    const { data, error } = await supabase.rpc("relancer", { p_a: idAutre });
    if (error) return "indisponible";
    return data === "ok" ? "ok" : data === "deja" ? "deja" : data === "limite" ? "limite" : "indisponible";
  } catch {
    return "indisponible";
  }
}
