import type { SupabaseClient } from "@supabase/supabase-js";
import { atelierConseille } from "@/lib/atelier";
import { parisDay } from "@/lib/daily";
import { SEUIL_ACCUEIL, type TuilePointFaible } from "@/lib/points-faibles";
import { lireNotionsJoueur, pointsFaiblesLegers } from "@/components/moi/points-faibles-data";
import { lireDernierAtelier, lireEtatAtelier } from "@/app/atelier/donnees";

// La tuile « Ton point faible » de l'accueil (lecture serveur, à part de
// queries.ts : elle tire le catalogue des notions et de l'Atelier).

/**
 * Le point faible n° 1, s'il est net (score au-delà de SEUIL_ACCUEIL), et
 * l'action : l'Atelier quand il est conseillé (aucun Atelier clos, ou le jour
 * conseillé par le dernier est venu), sa reprise s'il est en cours, sinon la
 * carte de Moi › Stats. Lecture légère : points_faibles seule
 * (migration_notions.sql), jamais getAnswerStats. Notions pas encore en
 * place, pas assez de données, rien de net : null (pas de tuile).
 */
export async function loadPointFaible(supabase: SupabaseClient, userId: string, now = new Date()): Promise<TuilePointFaible | null> {
  try {
    const [base, etat, dernier] = await Promise.all([lireNotionsJoueur(supabase), lireEtatAtelier(supabase, userId), lireDernierAtelier(supabase, userId)]);
    if (!base?.remplie) return null;
    const p = pointsFaiblesLegers(base, now.getTime()).liste[0];
    if (!p || p.score <= SEUIL_ACCUEIL) return null;
    const action = !etat ? "voir" : etat.enCours ? "reprendre" : atelierConseille(dernier, parisDay(now)) ? "atelier" : "voir";
    return { libelle: p.libelle, repere: [p.matiereNom, p.repere].filter(Boolean).join(" · "), phrase: p.phrase, action };
  } catch {
    return null;
  }
}
