// Salles : ce que lit la carte d'entrée de S'affronter (côté serveur de la page).
// La carte n'affiche aucune liste (elles vivent sur /salles) : une seule lecture
// légère, qui ne lève jamais d'exception, pour savoir si la migration est là.
// Sans elle (migration_salles.sql), `pret` est faux et la carte dit que les
// salles arrivent ; une autre erreur laisse `pret` vrai, /salles dira ce qu'il en est.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMesSalles } from "./api";
import type { EntreeSalles } from "./types";

export async function lireEntreeSalles(supabase: SupabaseClient): Promise<EntreeSalles> {
  const mes = await getMesSalles(supabase);
  return { pret: mes.ok || !mes.migrationAbsente };
}
