import type { SupabaseClient } from "@supabase/supabase-js";
import { TIERS } from "@/lib/ranks";

// Les saisons du profil (migration_saisons.sql, étape 6) : des trimestres
// calés sur les sessions du CFA Level I (février, mai, août, novembre),
// sans remise à zéro de l'ELO. À la fin de chacune, le pic de la saison est
// gravé (« S1 · OR I »), pour de bon. La saison 1, « Novembre 2026 », va du
// 1er septembre au 1er décembre 2026 (heure de Paris).
// rl_saisons clôt au passage les saisons échues : c'est la clôture, sans
// tâche planifiée. Tant que la migration manque, ou sur toute autre erreur,
// lireSaisons rend null et aucune saison ne s'affiche.
// Module neutre : les types et la lecture (le client est passé en argument).

/** un palier gravé : index dans TIERS, division (null pour Top 10) */
export type PalierSaison = { palier: number; division: string | null };

export type ResultatSaison = {
  cle: string;
  numero: number;
  /** « Novembre 2026 » : la session visée */
  nom: string;
  /** premier et dernier jour, heure de Paris (AAAA-MM-JJ) */
  debut: string;
  dernierJour: string;
  pic: PalierSaison;
  eloPic: number;
  final: PalierSaison;
  eloFinal: number;
  place: number;
  matchs: number;
  /** joueurs gravés dans la saison */
  joueurs: number | null;
};

export type SaisonCourante = {
  cle: string;
  numero: number;
  nom: string;
  debut: string;
  dernierJour: string;
  /** la fin (ISO), pour le compte à rebours du navigateur */
  fin: string;
  /** le pic jusqu'ici du joueur regardé (null : pas de match classé cette saison) */
  moi: { pic: PalierSaison; eloPic: number; matchs: number } | null;
};

export type Saisons = { courante: SaisonCourante | null; palmares: ResultatSaison[] };

/** « Or I », « Top 10 » */
export const nomPalier = (p: PalierSaison) => `${TIERS[p.palier]?.name ?? ""}${p.division ? ` ${p.division}` : ""}`;

type Brut = Record<string, unknown>;
const ent = (v: unknown) => Number(v) || 0;
const palierDe = (p: unknown, d: unknown): PalierSaison => ({
  palier: Math.max(0, Math.min(TIERS.length - 1, ent(p))),
  division: d === "I" || d === "II" || d === "III" ? d : null,
});
const texte = (v: unknown) => (typeof v === "string" ? v : "");

/** Les saisons vues sur le profil de `userId` : la saison en cours et son palmarès ; null sans la migration. */
export async function lireSaisons(sb: SupabaseClient, userId: string): Promise<Saisons | null> {
  try {
    const { data, error } = await sb.rpc("rl_saisons", { p_user: userId });
    if (error || !data) return null;
    const r = data as { courante: Brut | null; palmares: Brut[] | null };
    const c = r.courante;
    const moi = c?.moi as Brut | null | undefined;
    return {
      courante: c
        ? {
            cle: texte(c.cle),
            numero: ent(c.numero),
            nom: texte(c.nom),
            debut: texte(c.debut),
            dernierJour: texte(c.dernier_jour),
            fin: texte(c.fin),
            moi: moi ? { pic: palierDe(moi.palier_pic, moi.division_pic), eloPic: ent(moi.elo_pic), matchs: ent(moi.matchs) } : null,
          }
        : null,
      palmares: (r.palmares ?? []).map((x) => ({
        cle: texte(x.cle),
        numero: ent(x.numero),
        nom: texte(x.nom),
        debut: texte(x.debut),
        dernierJour: texte(x.dernier_jour),
        pic: palierDe(x.palier_pic, x.division_pic),
        eloPic: ent(x.elo_pic),
        final: palierDe(x.palier_final, x.division_finale),
        eloFinal: ent(x.elo_final),
        place: Math.max(1, ent(x.place_finale)),
        matchs: ent(x.matchs),
        joueurs: x.joueurs === null || x.joueurs === undefined ? null : ent(x.joueurs),
      })),
    };
  } catch {
    return null;
  }
}
