"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { changerContrat, lireCodex, marquerRetroVue, marquerSeance, marquerVus, oublierCodex, ouvrirProgramme, recompenseEcrite, reglerJour, type Joueur } from "@/lib/codex/serveur";
import { BILAN_VIDE, bilanDe, type BilanCodex } from "@/lib/codex/bilan";
import { PANNEAU_VIDE, panneauDe, type Panneau } from "@/lib/codex/panneau";
import { estBudget } from "@/lib/codex/reglage";
import { ECARTE_SEANCE, estGenreBloc, type VueSeance } from "@/lib/codex/seance";
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
 * Le point léger, pour les écrans qui ne sont pas le Codex (fin de séance,
 * accueil) : recalcule tout de suite, verse les récompenses, écrit le
 * dévoilement dans le compte, et ne rend que ce qu'il faut fêter ou annoncer.
 * `recalcul: false` (l'accueil, qui vient de calculer) : la vue gardée suffit,
 * seul le dévoilement est écrit.
 */
export async function codexPoint(opts: { recalcul?: boolean } = {}): Promise<BilanCodex> {
  const { supabase, user } = await joueur();
  if (!user) return BILAN_VIDE;
  const recalcul = opts?.recalcul !== false;
  try {
    return bilanDe(await lireCodex(supabase, user, { force: recalcul, persister: true }));
  } catch {
    return BILAN_VIDE;
  }
}

/**
 * « Réclamer » une récompense. Le Codex verse déjà tout seul les récompenses
 * à chaque synchronisation : ceci lit la ligne écrite (sans recalcul) ; ce
 * n'est que si elle n'est pas encore écrite (remplie depuis le dernier
 * calcul) qu'un calcul complet sert de filet. Idempotent : réclamer deux
 * fois ne verse qu'une fois.
 */
export async function codexReclamer(queteId: string, periode = ""): Promise<Resultat<{ xp: number; deja: boolean }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  return reclamerPour(supabase, user, queteId, periode);
}

async function reclamerPour(supabase: Awaited<ReturnType<typeof createClient>>, user: Joueur, queteId: string, periode: string): Promise<Resultat<{ xp: number; deja: boolean }>> {
  if (typeof queteId !== "string" || queteId.length > 120 || typeof periode !== "string") return { ok: false, raison: "refus" };
  const ecrite = await recompenseEcrite(user.id, queteId, periode);
  if (ecrite === "indisponible") return { ok: false, raison: "indisponible" };
  if (ecrite) return { ok: true, xp: ecrite.xp, deja: ecrite.vu };
  const vue = await lireCodex(supabase, user, { force: true, persister: true });
  if (!vue.disponible) return { ok: false, raison: "indisponible" };
  const recue = vue.nouvelles.find((n) => n.quete === queteId && n.periode === periode);
  if (recue) return { ok: true, xp: recue.xp, deja: false };
  const toutes = [...vue.trame.flatMap((a) => a.quetes), ...vue.hebdo, ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.exploits, ...vue.contrats.map((c) => c.ligne)];
  const ligne = toutes.find((l) => l.id === queteId && l.periode === periode);
  if (ligne?.etat === "terminee") return { ok: true, xp: ligne.xpVersee ?? 0, deja: true };
  return { ok: false, raison: "aucun" };
}

/**
 * Le panneau « Tes quêtes » du sceau de la barre du haut, relu à son
 * ouverture (la barre reste montée d'une page à l'autre : ses données
 * vieillissent). Sans recalcul forcé : le Codex est gardé 45 s en mémoire.
 */
export async function codexPanneau(): Promise<Panneau> {
  const { supabase, user } = await joueur();
  if (!user) return PANNEAU_VIDE;
  try {
    return panneauDe(await lireCodex(supabase, user));
  } catch {
    return PANNEAU_VIDE;
  }
}

/**
 * « Une autre idée ? » sous ta prochaine quête : elle est écartée jusqu'à
 * demain (le moteur ne la propose plus aujourd'hui ; elle reste dans
 * l'arbre), et le panneau se relit avec la suivante.
 */
export async function codexAutreIdee(queteId: string): Promise<Resultat<{ panneau: Panneau }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (typeof queteId !== "string" || !queteId || queteId.length > 120) return { ok: false, raison: "refus" };
  const r = await reglerJour(supabase, user, { ecarter: queteId });
  if (!r.ok) return r;
  revalidatePath("/codex");
  return { ok: true, panneau: panneauDe(r.vue) };
}

/** « J'ai [15] [30] [60] [90] min » : le temps que le joueur se donne aujourd'hui ; les quêtes plus longues reculent. */
export async function codexSeanceBudget(budget: number): Promise<Resultat<{ panneau: Panneau }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!estBudget(budget)) return { ok: false, raison: "refus" };
  const r = await reglerJour(supabase, user, { budget });
  if (!r.ok) return r;
  revalidatePath("/codex");
  return { ok: true, panneau: panneauDe(r.vue) };
}

/** Ce que rendent les gestes de la séance du jour : la séance et le panneau relus ; `gardee` faux : la base ne la garde pas (« Continuer » se garde aussi dans le navigateur). */
type RetourSeance = Resultat<{ seance: VueSeance | null; panneau: Panneau; gardee: boolean }>;

async function marquer(quoi: "lancee" | "finie"): Promise<RetourSeance> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  const r = await marquerSeance(supabase, user, quoi);
  if (!r.ok) return r;
  revalidatePath("/codex");
  return { ok: true, seance: r.vue.seance, panneau: panneauDe(r.vue), gardee: r.gardee };
}

/** « Commencer » la séance du jour : ses blocs comptent dès maintenant, et l'instantané « avant » est pris. */
export async function codexSeanceLancer(): Promise<RetourSeance> {
  return marquer("lancee");
}

/** « J'arrête là » : la séance du jour est finie, même si tous ses blocs ne sont pas faits. */
export async function codexSeanceFinir(): Promise<RetourSeance> {
  return marquer("finie");
}

/** La séance du jour a été affichée (la trace « proposée, vue, lancée », V3 §6.6) ; silencieux. */
export async function codexSeanceVue(): Promise<boolean> {
  const { supabase, user } = await joueur();
  if (!user) return false;
  try {
    return (await marquerSeance(supabase, user, "vue")).ok;
  } catch {
    return false;
  }
}

/**
 * « Une autre idée ? » sur un bloc de la séance : son genre est écarté pour
 * la journée (rangé avec les quêtes écartées, « seance:coince ») et la séance
 * est recomposée ; un bloc fait n'est jamais retiré.
 */
export async function codexSeanceAutre(genre: string): Promise<RetourSeance> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!estGenreBloc(genre)) return { ok: false, raison: "refus" };
  const r = await reglerJour(supabase, user, { ecarter: `${ECARTE_SEANCE}${genre}` });
  if (!r.ok) return r;
  revalidatePath("/codex");
  return { ok: true, seance: r.vue.seance, panneau: panneauDe(r.vue), gardee: !!r.vue.seance?.gardee };
}

/** « Ouvrir CFA II » : le programme suivant devient l'actif, une fois le sien mené (la route de Milan). */
export async function codexOuvrirProgramme(programme: string): Promise<Resultat<{ vue: VueCodex }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (typeof programme !== "string" || !/^[a-z]+\/[a-z0-9-]{2,40}$/.test(programme)) return { ok: false, raison: "refus" };
  const r = await ouvrirProgramme(supabase, user, programme);
  if (!r.ok) return r;
  revalidatePath("/codex");
  return { ok: true, vue: r.vue };
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
