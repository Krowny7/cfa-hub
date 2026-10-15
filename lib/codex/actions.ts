"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { changerContrat, lireCodex, marquerRetroVue, marquerVus, oublierCodex } from "@/lib/codex/serveur";
import type { Emplacement } from "@/lib/codex/types";
import type { VueCodex } from "@/lib/codex/vue";

// Les gestes du joueur sur son Codex, tous vérifiés ici (le joueur connecté,
// jamais un identifiant reçu du navigateur) et écrits côté serveur. Sans la
// migration (migration_codex.sql) : réponse « indisponible », rien ne casse.

async function joueur() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export type Resultat<T extends object = object> = ({ ok: true } & T) | { ok: false; raison: "connexion" | "indisponible" | "refus" | "aucun" | "erreur" };

/**
 * Recalcule le Codex TOUT DE SUITE (fin de séance, ouverture de la page) :
 * verse les récompenses des quêtes remplies (une seule fois), écrit le
 * dévoilement dans le compte, rend la vue. `nouvelles` : les récompenses
 * versées à cet appel (fanfare) ; `retro` : « Léonard a feuilleté ton
 * carnet » (à jouer une fois puis codexRetroVue).
 */
export async function codexSynchroniser(): Promise<VueCodex | null> {
  const { supabase, user } = await joueur();
  if (!user) return null;
  oublierCodex(user.id);
  return lireCodex(supabase, user, { force: true, persister: true });
}

/**
 * « Réclamer » une récompense : verse, si ce n'est pas déjà fait, la
 * récompense d'une quête dont l'objectif est rempli (le Codex les verse
 * déjà tout seul à chaque synchronisation : ceci sert de geste explicite
 * et de filet). Idempotent : réclamer deux fois ne verse qu'une fois.
 */
export async function codexReclamer(queteId: string, periode = ""): Promise<Resultat<{ xp: number; deja: boolean }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (typeof queteId !== "string" || queteId.length > 120 || typeof periode !== "string") return { ok: false, raison: "refus" };
  oublierCodex(user.id);
  const vue = await lireCodex(supabase, user, { force: true, persister: true });
  if (!vue.disponible) return { ok: false, raison: "indisponible" };
  const recue = vue.nouvelles.find((n) => n.quete === queteId && n.periode === periode);
  if (recue) return { ok: true, xp: recue.xp, deja: false };
  const toutes = [...vue.trame.flatMap((a) => a.quetes), ...vue.hebdo, ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.exploits, ...vue.contrats.map((c) => c.ligne)];
  const ligne = toutes.find((l) => l.id === queteId && l.periode === periode);
  if (ligne?.etat === "terminee") return { ok: true, xp: ligne.xpVersee ?? 0, deja: true };
  return { ok: false, raison: "aucun" };
}

/** Changer UN des contrats du jour (une seule fois par jour, pas un contrat déjà rempli). */
export async function codexChangerContrat(emplacement: Emplacement): Promise<Resultat<{ vue: VueCodex }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!["faiblesse", "entretien", "variete"].includes(emplacement)) return { ok: false, raison: "refus" };
  const r = await changerContrat(supabase, user, emplacement);
  if (!r.ok) return { ok: false, raison: r.raison === "connexion" ? "connexion" : r.raison };
  revalidatePath("/codex");
  return { ok: true, vue: r.vue };
}

/** Les fanfares de ces quêtes ont été jouées. */
export async function codexVus(quetes: string[]): Promise<boolean> {
  const { user } = await joueur();
  if (!user || !Array.isArray(quetes)) return false;
  return marquerVus(user.id, quetes.filter((q) => typeof q === "string"));
}

/** « Léonard a feuilleté ton carnet » a été joué. */
export async function codexRetroVue(): Promise<boolean> {
  const { user } = await joueur();
  if (!user) return false;
  return marquerRetroVue(user.id);
}

/** Le bouton « Tout montrer » (Codex et Réglages) : dévoile tout d'un coup et pour toujours. */
export async function codexToutMontrer(): Promise<Resultat> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  try {
    const { error } = await supabase.auth.updateUser({ data: { rl_codex: { devoile: "tout", jours: [] } } });
    if (error) return { ok: false, raison: "erreur" };
  } catch {
    return { ok: false, raison: "erreur" };
  }
  oublierCodex(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Note ce que le site ne suit pas ailleurs (appelé par le lecteur de cours,
 * les flashcards et l'ouverture d'une fiche) :
 *   cours_ecoute {matiere, minutes} · flashcards_revues {matiere?, cartes} · fiche_ouverte {matiere, fiche}
 * Silencieux : une erreur (migration absente, plafond du jour) ne gêne jamais le joueur.
 */
export async function codexNoter(type: "cours_ecoute" | "flashcards_revues" | "fiche_ouverte", champs: Record<string, string | number>): Promise<boolean> {
  const { supabase, user } = await joueur();
  if (!user) return false;
  try {
    const { error } = await supabase.rpc("codex_noter", { p_type: type, p_champs: champs });
    return !error;
  } catch {
    return false;
  }
}
