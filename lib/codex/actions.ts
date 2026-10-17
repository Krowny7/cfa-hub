"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { changerContrat, choisirSemaine, ecrireMalle, lireCodex, lirePanneau, marquerRetroVue, marquerSeance, marquerVus, oublierCodex, oublierPanneau, ouvrirProgramme, panneauGarde, recompenseEcrite, recupererCodex, reglerJour, saisirVerdict, type Joueur } from "@/lib/codex/serveur";
import { CIBLES_SEMAINE, COMMANDES, type Commande } from "@/lib/codex/catalogue";
import type { StatutVerdict } from "@/lib/codex/plan";
import { BILAN_VIDE, bilanDe, type BilanCodex, type FeteCodex } from "@/lib/codex/bilan";
import { MAX_RECUPERER, grandesFetes } from "@/lib/codex/recuperer";
import { PANNEAU_VIDE, panneauDe, type Panneau } from "@/lib/codex/panneau";
import { estBudget } from "@/lib/codex/reglage";
import { ECARTE_SEANCE, estGenreBloc, type VueSeance } from "@/lib/codex/seance";
import { MALLE_PRETE } from "@/lib/codex/calendrier";
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
    // la fin d'un outil : l'instantané du panneau n'est plus juste (le calcul qui suit le reposera)
    if (recalcul) await oublierPanneau(user.id);
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
  // faite, elle attend « Récupérer » : la réclamer la récupère
  if (ecrite?.attend) {
    const r = await recupererCodex(supabase, user, [{ quete: queteId, periode }]);
    if (!r.ok) return r;
    revalidatePath("/", "layout");
    return { ok: true, xp: r.xp, deja: false };
  }
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

/** Les clés reçues du navigateur : une liste de {quete, periode} bien formés, MAX_RECUPERER au plus ; null : refusées. */
function clesValides(x: unknown): { quete: string; periode: string }[] | null {
  if (!Array.isArray(x) || x.length > MAX_RECUPERER) return null;
  const out: { quete: string; periode: string }[] = [];
  for (const c of x) {
    const o = c as { quete?: unknown; periode?: unknown } | null;
    if (!o || typeof o.quete !== "string" || !o.quete || o.quete.length > 120 || typeof o.periode !== "string" || o.periode.length > 20) return null;
    out.push({ quete: o.quete, periode: o.periode });
  }
  return out;
}

/**
 * « Récupérer » (Codex simplifié) : verse les quêtes faites qui attendent le
 * clic (codex_recuperer, migration_codex_v3.sql §9) ; sans la §9, accuse
 * réception de celles déjà versées (la barre de niveau ne bouge pas).
 * `cles` : celles-là seulement ; absent : toutes. Rend les quêtes
 * récupérées, l'XP versée à ce clic, ce qui attend encore et les grandes
 * fêtes à jouer une par une (acte clos, « Maître de… », pièce gagnée). Le
 * niveau de la barre du haut se rafraîchit.
 */
export async function codexRecuperer(cles?: { quete: string; periode: string }[]): Promise<Resultat<{ recues: { quete: string; periode: string }[]; xp: number; restant: number; fetes: FeteCodex[] }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  const valides = cles === undefined ? null : clesValides(cles);
  if (cles !== undefined && !valides) return { ok: false, raison: "refus" };
  try {
    const r = await recupererCodex(supabase, user, valides);
    if (!r.ok) return r;
    revalidatePath("/", "layout");
    return { ok: true, recues: r.recues.map((x) => ({ quete: x.quete, periode: x.periode })), xp: r.xp, restant: r.restant, fetes: grandesFetes(r.recues, r.sobre) };
  } catch {
    return { ok: false, raison: "erreur" };
  }
}

/**
 * Le panneau « Tes quêtes » du sceau de la barre du haut, relu à son
 * ouverture (la barre reste montée d'une page à l'autre : ses données
 * vieillissent). Sans recalcul forcé : le Codex gardé 45 s en mémoire, sinon
 * l'instantané de moins de 10 min (codex_vue_cache), sinon un calcul.
 */
export async function codexPanneau(): Promise<Panneau> {
  const { supabase, user } = await joueur();
  if (!user) return PANNEAU_VIDE;
  try {
    return await lirePanneau(supabase, user);
  } catch {
    return PANNEAU_VIDE;
  }
}

/**
 * Le panneau déjà calculé (mémo de 45 s ou instantané de moins de 10 min),
 * sans jamais lancer de calcul : null s'il n'y en a pas. La pastille de
 * séance le relit au fil des pages ; le calcul complet reste réservé à
 * l'ouverture du sceau, aux pages du Codex et aux fins d'outil.
 */
export async function codexPanneauGarde(): Promise<Panneau | null> {
  const { user } = await joueur();
  if (!user) return null;
  try {
    return await panneauGarde(user.id);
  } catch {
    return null;
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

/**
 * « J'ai [15] [30] [60] [90] min » : le temps que le joueur se donne
 * aujourd'hui ; les quêtes plus longues reculent et la séance du jour se
 * recompose (ses blocs faits restent). Aussi « Encore un bloc ? » (le budget
 * du dessus).
 */
export async function codexSeanceBudget(budget: number): Promise<Resultat<{ panneau: Panneau; seance: VueSeance | null }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!estBudget(budget)) return { ok: false, raison: "refus" };
  const r = await reglerJour(supabase, user, { budget });
  if (!r.ok) return r;
  revalidatePath("/codex");
  return { ok: true, panneau: panneauDe(r.vue), seance: r.vue.seance };
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

/**
 * La malle de l'examen (J-3 à J-1, V3 §7.3) : les cases cochées, gardées dans
 * le compte. `vue` : le Codex recalculé quand la malle vient d'être prête (ou
 * ne l'est plus) ; null sinon.
 */
export async function codexMalle(coches: string[]): Promise<Resultat<{ coches: string[]; vue: VueCodex | null }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!Array.isArray(coches) || coches.length > 20) return { ok: false, raison: "refus" };
  const r = await ecrireMalle(supabase, user, coches, MALLE_PRETE);
  if (!r.ok) return r;
  if (r.vue) revalidatePath("/codex");
  return { ok: true, coches: r.coches, vue: r.vue };
}

/**
 * Le choix du lundi (V3 §10.3) : la cible de la semaine (3, 4 ou 5 jours
 * d'encre) et sa commande. Le premier choix de la semaine gagne. Rend le
 * Codex recalculé (les contrats de la semaine ont changé).
 */
export async function codexChoisirSemaine(cible: number, commande: Commande): Promise<Resultat<{ vue: VueCodex }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!(CIBLES_SEMAINE as readonly number[]).includes(cible) || !COMMANDES.some((c) => c.id === commande)) return { ok: false, raison: "refus" };
  const r = await choisirSemaine(supabase, user, { cible, commande });
  if (!r.ok) return r;
  revalidatePath("/codex");
  return { ok: true, vue: r.vue };
}

/** Le verdict de l'examen (V3 §10.5) : admis, pas cette fois (bandes facultatives par matière) ou reporté. Rien n'est public. */
export async function codexVerdict(statut: StatutVerdict, bandes: Record<string, string> = {}): Promise<Resultat<{ vue: VueCodex }>> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!["admis", "pas_cette_fois", "reporte"].includes(statut) || !bandes || typeof bandes !== "object") return { ok: false, raison: "refus" };
  const r = await saisirVerdict(supabase, user, statut, bandes);
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
    // rl_codex garde aussi le marqueur du rattrapage (capacites_vues, sans la §2) : on ne l'écrase pas
    // (user vient de getUser : ses métadonnées sont celles du compte)
    const avant = (user.user_metadata as { rl_codex?: Record<string, unknown> } | undefined)?.rl_codex ?? {};
    const { error } = await supabase.auth.updateUser({ data: { rl_codex: { ...avant, devoile: "tout", jours: [] } } });
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
