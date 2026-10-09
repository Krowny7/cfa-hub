import type { SupabaseClient } from "@supabase/supabase-js";
import { SANS_TAMPON, TAMPONS_LISTE, type ComptesTampons, type Tampon } from "@/lib/profil/tampons";

// Le social du profil, côté serveur (migration_profil_social.sql) : les
// comptes de tampons d'un joueur et « Depuis ta dernière visite ». Tant que
// la migration manque (PGRST202, 42883… : la fonction n'existe pas), ou sur
// toute autre erreur, tout rend null et rien de social ne s'affiche.
// Module serveur.

type LigneTampons = { cible: string; bravo: number; respect: number; revanche: number; mien: string | null };

/** Les comptes de tampons de `pour` sur ces cibles (100 au plus), vus par le joueur connecté ; null sans la migration. */
export async function lireTampons(sb: SupabaseClient, pour: string, cibles: string[]): Promise<Record<string, ComptesTampons> | null> {
  try {
    const { data, error } = await sb.rpc("rl_tampons", { p_pour: pour, p_cibles: [...new Set(cibles)].slice(0, 100) });
    if (error) return null;
    const out: Record<string, ComptesTampons> = {};
    for (const l of (data ?? []) as LigneTampons[]) {
      const mien = TAMPONS_LISTE.includes(l.mien as Tampon) ? (l.mien as Tampon) : null;
      out[l.cible] = { ...SANS_TAMPON, bravo: Number(l.bravo) || 0, respect: Number(l.respect) || 0, revanche: Number(l.revanche) || 0, mien };
    }
    return out;
  } catch {
    return null;
  }
}

export type Retour = {
  /** la visite précédente a eu lieu (sinon : première visite, seule la semaine compte) */
  depuis: boolean;
  /** joueurs distincts sur 7 jours (rl_mes_visites) */
  semaine: number;
  /** joueurs distincts depuis la visite précédente */
  visiteurs: number;
  tampons: Record<Tampon, number>;
  /** variation d'ELO depuis, et l'ELO au début (null : aucun match) */
  elo: number;
  eloAvant: number | null;
  /** la place au classement au début (null sous 1 850 : elle ne sert qu'au Top 10) */
  placeAvant: number | null;
  victoires: number;
};

type RetourBrut = {
  depuis: string | null;
  visiteurs: number;
  tampons: Partial<Record<Tampon, number>> | null;
  elo: number;
  elo_avant: number | null;
  place_avant?: number | null;
  victoires: number;
};

/**
 * Je regarde mon profil : ce qui s'est passé depuis ma visite précédente (la
 * base note ce passage ; une visite dure tant qu'on revient dans les 30 min,
 * recharger ne remet rien à zéro), et combien de joueurs l'ont vu sur 7
 * jours. null sans la migration.
 */
export async function monRetour(sb: SupabaseClient): Promise<Retour | null> {
  try {
    const [{ data, error }, semaine] = await Promise.all([sb.rpc("rl_mon_retour"), sb.rpc("rl_mes_visites", { p_jours: 7 })]);
    if (error || !data) return null;
    const r = data as RetourBrut;
    return {
      depuis: !!r.depuis,
      semaine: Number(semaine.data) || 0,
      visiteurs: Number(r.visiteurs) || 0,
      tampons: { bravo: Number(r.tampons?.bravo) || 0, respect: Number(r.tampons?.respect) || 0, revanche: Number(r.tampons?.revanche) || 0 },
      elo: Number(r.elo) || 0,
      eloAvant: r.elo_avant === null || r.elo_avant === undefined ? null : Number(r.elo_avant),
      placeAvant: r.place_avant === null || r.place_avant === undefined ? null : Number(r.place_avant),
      victoires: Number(r.victoires) || 0,
    };
  } catch {
    return null;
  }
}
