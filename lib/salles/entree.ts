// Salles : ce que lit la carte d'entrée de S'affronter (côté serveur de la page). Les deux
// lectures de /salles, sans jamais lever d'exception : la carte d'aperçu en garde le compte
// et les 3 salles les plus vivantes (la partie en cours d'abord, puis les siennes). Sans la
// migration (migration_salles.sql), `pret` est faux et la carte dit que les salles arrivent ;
// une autre erreur laisse `pret` vrai, sans aperçu.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getMesSalles, getSallesPubliques } from "./api";
import type { ApercuSalle, EntreeSalles } from "./types";

const LIGNES = 3;

export async function lireEntreeSalles(supabase: SupabaseClient): Promise<EntreeSalles> {
  const [mes, publiques] = await Promise.all([getMesSalles(supabase), getSallesPubliques(supabase)]);
  const pret = mes.ok || !mes.migrationAbsente;
  if (!mes.ok || !publiques.ok) return { pret, apercu: null };

  const salles = new Map<string, ApercuSalle & { activite: string }>();
  for (const s of publiques.data) salles.set(s.id, { id: s.id, nom: s.nom, nbPresents: s.nbPresents, enCours: s.enCours, mienne: s.dejaMembre, activite: s.derniereActivite });
  for (const s of mes.data) salles.set(s.id, { id: s.id, nom: s.nom, nbPresents: s.nbPresents, enCours: s.enCours, mienne: true, activite: s.derniereActivite });

  const toutes = [...salles.values()].sort((a, b) => Number(b.enCours) - Number(a.enCours) || b.nbPresents - a.nbPresents || Number(b.mienne) - Number(a.mienne) || b.activite.localeCompare(a.activite));
  return {
    pret,
    apercu: {
      salles: toutes.slice(0, LIGNES).map(({ activite: _activite, ...s }) => s),
      total: toutes.length,
      enCours: toutes.filter((s) => s.enCours).length,
    },
  };
}
