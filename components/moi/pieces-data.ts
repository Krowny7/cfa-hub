// Moi › Mes pièces : l'étagère du joueur (lib/profil/etagere.ts), lue
// seulement quand l'onglet est ouvert. Ce qui ouvre les pièces : questions,
// pic, sceaux, quêtes du Codex, trophées, programmes menés (Acquis complet,
// comme à l'enregistrement du profil) ; ce qu'il porte : son style.
// Chaque lecture dégrade proprement (Codex, trophées ou colonnes v3 absents :
// les pièces correspondantes restent en silhouette). Côté serveur uniquement.
import type { SupabaseClient } from "@supabase/supabase-js";
import { datesDuPic, lireNom, lireStyle, statsProfil } from "@/lib/profil/donnees";
import { sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import { lireAcquis } from "@/lib/profil/acquis";
import { etagere, type Etagere } from "@/lib/profil/etagere";
import { nomTitre } from "@/lib/profil/styles";
import type { ProfilStats, StyleProfil } from "@/lib/profil/catalogue";

export type DonneesEtagere = {
  etagere: Etagere;
  /** le style porté (l'aperçu de la feuille part de lui) */
  style: StyleProfil;
  /** la table du profil existe (sinon : rien ne se porte encore) */
  disponible: boolean;
  nomComplet: string | null;
  /** le titre porté, lisible */
  titre: string | null;
  stats: ProfilStats;
};

export async function lireEtagere(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string): Promise<DonneesEtagere> {
  const statsLues = statsProfil(userId, supabase);
  const [lu, nom, stats, sceaux, datesPic, acquis] = await Promise.all([
    lireStyle(admin ?? supabase, userId),
    lireNom(supabase, userId),
    statsLues,
    statsLues.then((s) => sceauxDuJoueur(userId, s)),
    datesDuPic(supabase, userId),
    statsLues.then((s) => lireAcquis(admin ?? supabase, userId, { stats: s, sceaux: [], datesPic: [] })),
  ]);
  return {
    etagere: etagere({ ...acquis, sceaux: sceaux.etats, datesPic }, lu.style, lu.style.bannerUrl),
    style: lu.style,
    disponible: lu.disponible,
    nomComplet: nom?.nom ?? null,
    titre: nomTitre(lu.style.titre),
    stats,
  };
}
