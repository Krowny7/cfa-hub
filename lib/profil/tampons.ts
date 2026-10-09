// Les tampons du profil (migration_profil_social.sql) : trois choix, un par
// personne et par cible. Les cibles : 'profil', 'duel:<uuid>' (une victoire
// du Journal), 'rang:<uuid>' (une montée de palier du Journal, l'id de
// rating_events), 'sceau:<clé>'. Module neutre (client et serveur).

import type { EvenementJournal } from "@/lib/profil/journal";

export type Tampon = "bravo" | "respect" | "revanche";
export const TAMPONS_LISTE: Tampon[] = ["bravo", "respect", "revanche"];

/** Les comptes d'une cible, et le tampon que celui qui regarde y a posé. */
export type ComptesTampons = Record<Tampon, number> & { mien: Tampon | null };

export const SANS_TAMPON: ComptesTampons = { bravo: 0, respect: 0, revanche: 0, mien: null };

/**
 * Les tampons d'un joueur tels que les voit celui qui regarde : `peut` (il
 * peut tamponner : le profil d'un autre, hors aperçu) et les comptes par
 * cible (une cible sans tampon n'y est pas). null : migration absente, rien
 * de social ne s'affiche.
 */
export type TamponsJoueur = { pour: string; peut: boolean; parCible: Record<string, ComptesTampons> } | null;

export const CIBLE_PROFIL = "profil";

/** La cible d'une entrée du Journal (null : une série, qui ne se tamponne pas). */
export function cibleEntree(e: EvenementJournal): string | null {
  if (e.type === "victoire") return `duel:${e.cle.replace(/^duel-/, "")}`;
  if (e.type === "palier") return `rang:${e.cle.replace(/^palier-/, "")}`;
  return null;
}

export const totalTampons = (c: ComptesTampons) => c.bravo + c.respect + c.revanche;
