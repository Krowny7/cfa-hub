// Salles : ce que lit la carte d'entrée de S'affronter (côté serveur de la
// page). Une seule lecture groupée, qui ne lève jamais d'exception : sans la
// migration (migration_salles.sql), `pret` est faux et la carte dit que les
// salles arrivent ; une autre erreur laisse `pret` vrai avec des listes vides
// et `erreur`.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMesSalles, getSallesPubliques } from "./api";
import type { EntreeSalles } from "./types";

export async function lireEntreeSalles(supabase: SupabaseClient): Promise<EntreeSalles> {
  const [publiques, mes] = await Promise.all([getSallesPubliques(supabase), getMesSalles(supabase)]);
  if ((!publiques.ok && publiques.migrationAbsente) || (!mes.ok && mes.migrationAbsente)) return { pret: false, publiques: [], mes: [] };
  return {
    pret: true,
    erreur: !publiques.ok || !mes.ok ? true : undefined,
    publiques: publiques.ok ? publiques.data : [],
    mes: mes.ok ? mes.data : [],
  };
}
