// Le Codex, côté serveur : lit la base (migration_codex.sql), fait tourner le
// moteur (lib/codex/moteur.ts) sur l'arbre du programme actif du joueur
// (codex_programmes_joueur ; sans elle, CFA I), écrit la progression et les
// récompenses, et rend la vue de l'écran (lib/codex/vue.ts). Tout passe par le client service
// role (comme les sceaux) : les joueurs n'écrivent rien eux-mêmes.
//
// REPLI : sans la migration (table ou fonction absente) ou sans clé admin, on
// rend VUE_INDISPONIBLE (disponible: false) et le site marche comme avant ;
// rien ne lève. Au moindre souci ensuite (lecture qui échoue, exception), on
// sert le DERNIER état calculé du jour plutôt que « indisponible », et
// l'erreur est consignée (codex_erreurs, migration_codex_v3.sql ; silencieux
// sans elle). Une écriture refusée n'éteint plus rien : la vue évaluée est
// servie, les récompenses partiront au calcul suivant.
// UN SEUL CALCUL À LA FOIS par joueur : les lectures simultanées (barre du
// haut, accueil, panneau) rejoignent le calcul en cours ; un calcul est
// ensuite gardé 45 s (le Codex ne clignote pas, la base n'est pas martelée) ;
// `force` (fin de séance, action du joueur) en lance un neuf.
// Module serveur.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { jourParis } from "@/lib/objectif";
import { decaleJour, lireObjectifMeta } from "@/lib/objectif-calc";
import { visiteVue } from "@/lib/presentation";
import { baseAbsente } from "@/lib/profil/sceaux-base";
import { lireNotionsJoueur, pointsFaiblesLegers } from "@/components/moi/points-faibles-data";
import { PROGRAMME, contenuDuProgramme, filDesActes } from "@/lib/codex/catalogue";
import {
  LECTURE_VIDE, actesClosDe, actesDuJoueur, budgetDuJour, contexteDestination, demandesActivite, devoiler, emplacementsDe, evaluer, evaluerObjectifs, indexerLecture, joursAvantExamen, lireActivite, lireMetaCodex, parametresDe, phaseJoueur, planifier, recommander, remplacantContrat, tirerContrats,
  type ContratTire, type Entree, type LectureSql, type LigneProgression, type Resultat,
} from "@/lib/codex/moteur";
import { VUE_INDISPONIBLE, construireVue, vueSansFetes, type VueCodex } from "@/lib/codex/vue";
import { panneauAGarder, panneauDe, panneauDuCache, type Panneau } from "@/lib/codex/panneau";
import { CAPACITES_TOUTES, avecMesuresV3, mesuresV3DeLecture, mesuresV3DeReponse, type MesuresV3 } from "@/lib/codex/mesures-v3";
import { COLONNES_JOUEUR, COLONNES_V3, ecarter, reglageDe, type ReglageJour } from "@/lib/codex/reglage";
import { catalogueComplet, jourJDuProgramme, lireProgrammesJoueur, programmeActif, suiteDe, type DefinitionProgramme, type ProgrammeJoueur } from "@/lib/codex/programmes";
import { maitriseDuCodex } from "@/lib/codex/cap";
import { cochesValides, lireMalle, momentCalme, momentDe, pinceauPose } from "@/lib/codex/calendrier";
import { COLONNES_SEANCE, SONDES_SEANCE, aRecomposer, composerSeance, ecartesSeance, faitsDeSeance, instantaneSeance, lireSeanceGardee, revoirCodexDe, versStockage, type SeanceGardee, type VueSeance } from "@/lib/codex/seance";
import { lireSobre } from "@/lib/codex/sobre";
import { nomActe, titreClair } from "@/lib/codex/titres-clairs";
import { MAX_RECUPERER, cleRecuperer, familleDe, titreHorsVue, TEXTES_RECUPERER, type ARecuperer } from "@/lib/codex/recuperer";
import type { Budget, Capacites, Emplacement } from "@/lib/codex/types";
import { bandesValides, vueRythme } from "@/lib/codex/rythme";
import { lireRythme, poserSemaine, poserVerdict } from "@/lib/codex/rythme-serveur";
import { recalageVerdict, type StatutVerdict } from "@/lib/codex/plan";
import type { Commande } from "@/lib/codex/catalogue";

export type Joueur = Pick<User, "id" | "user_metadata" | "created_at">;

function admin(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

const MEMO_MS = 45_000;
const MEMO = new Map<string, { at: number; vue: VueCodex }>();
/** Le dernier état réussi de chaque joueur (même jour) : servi si un calcul échoue. */
const DERNIER = new Map<string, VueCodex>();
/** Les calculs en cours, partagés par les lectures simultanées d'un même joueur. */
const ENCOURS = new Map<string, Promise<Retour>>();
/** Les erreurs déjà écrites dans la console par cette instance (une fois chacune). */
const SIGNALEES = new Set<string>();

type Retour = { vue: VueCodex; entree: Entree | null; resultat: Resultat | null };

/** Change la vue gardée d'un joueur (fanfare jouée, dévoilement écrit) sans la recalculer. */
function patcher(userId: string, f: (v: VueCodex) => VueCodex) {
  const m = MEMO.get(userId);
  if (m) MEMO.set(userId, { ...m, vue: f(m.vue) });
  const d = DERNIER.get(userId);
  if (d) DERNIER.set(userId, f(d));
}

/** Au plus tant de joueurs gardés par l'instance (DERNIER) : les plus anciens partent d'abord. */
const GARDES_MAX = 500;

/**
 * Garde la vue calculée d'un joueur (mémo de 45 s et dernier état réussi). Au
 * passage, les mémos périmés et les états d'un autre jour partent (seul celui
 * du jour sert au repli) : les Map ne grossissent pas avec les joueurs passés
 * par l'instance.
 */
function garder(userId: string, vue: VueCodex) {
  const now = Date.now();
  for (const [k, m] of MEMO) if (now - m.at >= MEMO_MS) MEMO.delete(k);
  for (const [k, d] of DERNIER) if (d.jour !== vue.jour) DERNIER.delete(k);
  MEMO.set(userId, { at: now, vue });
  DERNIER.delete(userId);
  DERNIER.set(userId, vue);
  for (const k of DERNIER.keys()) {
    if (DERNIER.size <= GARDES_MAX) break;
    DERNIER.delete(k);
  }
}

/** Le repli : le dernier état réussi du jour, sinon « indisponible ». */
function repli(userId: string, jour: string): Retour {
  const d = DERNIER.get(userId);
  return { vue: d && d.jour === jour ? { ...d, nouvelles: [] } : VUE_INDISPONIBLE(jour), entree: null, resultat: null };
}

/** Consigne une erreur du Codex (codex_erreurs) ; la console ne la voit qu'une fois par instance. */
async function consigner(a: SupabaseClient, userId: string, quete: string, message: string) {
  const cle = `${quete}|${message}`;
  if (!SIGNALEES.has(cle) && SIGNALEES.size < 200) {
    SIGNALEES.add(cle);
    console.error(`codex${quete ? ` (${quete})` : ""}:`, message);
  }
  try {
    await a.rpc("codex_erreur_noter", { p_user: userId, p_quete: quete.slice(0, 120), p_periode: "", p_message: message.slice(0, 1000) });
  } catch {
    // sans migration_codex_v3.sql : la console suffit
  }
}

/** La surcharge codex_lire(…, p_v3) manquait à cette date (ms) : on n'y revient qu'après QUATRE_MS. */
let quatreAbsente = 0;
const QUATRE_MS = 10 * 60_000;

/**
 * codex_lire : les compteurs, les mesures, les spéciaux ; et « v3 » (les
 * mesures v3, brutes) quand la §5 est collée. `v3` faux : sans elles (la
 * lecture de l'activité, ou des mesures déjà lues à part), par la surcharge à
 * p_v3 ; absente (fichier d'avant, ou §5 pas collée), l'appel ordinaire.
 */
async function lire(a: SupabaseClient, id: string, demandes: unknown[], jour: string, v3 = true): Promise<(LectureSql & { v3?: unknown }) | null> {
  try {
    let r = !v3 && Date.now() - quatreAbsente >= QUATRE_MS ? await a.rpc("codex_lire", { p_user: id, p_demandes: demandes, p_jour: jour, p_v3: false }) : null;
    if (r?.error && baseAbsente(r.error)) {
      quatreAbsente = Date.now();
      r = null;
    }
    const { data, error } = r ?? (await a.rpc("codex_lire", { p_user: id, p_demandes: demandes, p_jour: jour }));
    if (error || !data || typeof data !== "object") return null;
    const d = data as Partial<LectureSql> & { v3?: unknown };
    return { compteurs: d.compteurs ?? {}, mesures: d.mesures ?? {}, speciaux: d.speciaux ?? {}, v3: d.v3 };
  } catch {
    return null;
  }
}

async function lireLignes(a: SupabaseClient, id: string): Promise<LigneProgression[] | null> {
  try {
    const { data, error } = await a.from("codex_progression").select("quete_id,periode,etat,progression,cible,ouverte_le,terminee_le,recompensee_le,retro,xp,cosmetique,titre,vu").eq("user_id", id).limit(5000);
    if (error) return null;
    return ((data ?? []) as LigneProgression[]).map((l) => ({ ...l, progression: Number(l.progression), cible: l.cible === null ? null : Number(l.cible) }));
  } catch {
    return null;
  }
}

async function lireContrats(a: SupabaseClient, id: string, jours: string[]): Promise<Map<string, ContratTire[]>> {
  const out = new Map<string, ContratTire[]>();
  try {
    const { data, error } = await a.from("codex_contrats").select("jour,emplacement,modele,params,change").eq("user_id", id).in("jour", jours);
    if (error) return out;
    for (const r of (data ?? []) as { jour: string; emplacement: Emplacement; modele: string; params: ContratTire["params"]; change: boolean }[]) {
      const j = String(r.jour).slice(0, 10);
      out.set(j, [...(out.get(j) ?? []), { emplacement: r.emplacement, modele: r.modele, params: r.params ?? {}, change: !!r.change }]);
    }
  } catch {
    // table absente : pas de contrats
  }
  return out;
}

async function pointsFaibles(supabase: SupabaseClient): Promise<{ notion: string; score: number }[]> {
  try {
    const base = await lireNotionsJoueur(supabase);
    if (!base) return [];
    return pointsFaiblesLegers(base, Date.now()).liste.map((p) => ({ notion: p.lm ?? p.cle, score: p.score }));
  } catch {
    return [];
  }
}

/**
 * Le réglage du jour (budget, quêtes écartées, capacités vues) : les colonnes
 * v3 de codex_joueur, lues à part (une colonne absente ne coûte rien à la
 * lecture principale) ; sans elles (§2 pas collée), le compte.
 */
async function lireReglage(a: SupabaseClient, user: Joueur, jour: string): Promise<ReglageJour> {
  try {
    const { data, error } = await a.from("codex_joueur").select(COLONNES_V3).eq("user_id", user.id).maybeSingle();
    // une autre erreur (réseau) : rien de réglé aujourd'hui, sans basculer sur le compte, et le marqueur
    // du rattrapage inconnu (pas « jamais vu » : tout le nouveau passerait en rétro)
    const absente = !!error && baseAbsente(error);
    return reglageDe({ ligne: error ? null : (data as Parameters<typeof reglageDe>[0]["ligne"]), absente, panne: !!error && !absente }, user.user_metadata, jour);
  } catch {
    // l'appel a levé : le budget du compte faute de mieux, le marqueur inconnu (il peut être en base)
    return reglageDe({ ligne: null, absente: true, panne: true }, user.user_metadata, jour);
  }
}

/** Les programmes du joueur (codex_programmes_joueur, V3 §1.6) ; table absente ou illisible : aucun (CFA I actif). */
async function lireProgrammes(a: SupabaseClient, id: string): Promise<ProgrammeJoueur[]> {
  try {
    const { data, error } = await a.from("codex_programmes_joueur").select("programme,statut,jour_j,mene_le,debut").eq("user_id", id).limit(50);
    return error ? [] : lireProgrammesJoueur(data);
  } catch {
    return [];
  }
}

/**
 * Les mesures v3 et les capacités de la base (codex_mesures_v3, V3 §1.8), lues
 * à part : sans la §5 de migration_codex_v3.sql (codex_lire ne les rend pas),
 * ou si codex_lire ne les a pas rendues. Fonction absente : la base ne sait
 * rien faire de nouveau (CAPACITES_VIDE), les mesures v3 restent inconnues.
 * Une autre erreur (réseau, délai, panne) : null. Le calcul s'arrête alors
 * (repli) : sans capacités, des quêtes passeraient hors jeu et un acte se
 * clorait sans elles, pour de bon.
 */
async function lireMesuresV3(a: SupabaseClient, id: string, programme: string): Promise<MesuresV3 | null> {
  try {
    const r = await a.rpc("codex_mesures_v3", { p_user: id, p_programme: programme });
    return mesuresV3DeReponse(r, baseAbsente(r.error));
  } catch {
    return mesuresV3DeReponse(null, false);
  }
}

/**
 * Le marqueur du rattrapage (V3 §1.9), écrit après une écriture réussie du
 * lot : codex_joueur.capacites_vues (§2) ; sans elle, le compte
 * (user_metadata.rl_codex.capacites_vues, par la clé service : aucun cookie
 * à poser pendant un rendu). Un échec se rejoue au calcul suivant.
 */
async function ecrireCapacitesVues(a: SupabaseClient, user: Joueur, ou: ReglageJour["ou"], vues: Capacites) {
  try {
    if (ou === "base") {
      const { error } = await a.rpc("codex_joueur_capacites", { p_user: user.id, p_vues: vues });
      if (!error || !baseAbsente(error)) return;
    }
    const rl_codex = { ...((user.user_metadata as { rl_codex?: Record<string, unknown> } | null)?.rl_codex ?? {}), capacites_vues: vues };
    await a.auth.admin.updateUserById(user.id, { user_metadata: { rl_codex } });
  } catch {
    // rejoué au calcul suivant
  }
}

async function dateExamenDe(a: SupabaseClient, id: string): Promise<string | null> {
  try {
    const { data, error } = await a.from("profiles").select("exam_date").eq("id", id).maybeSingle();
    if (error) return null;
    const d = (data as { exam_date?: string | null } | null)?.exam_date ?? null;
    return d ? String(d).slice(0, 10) : null;
  } catch {
    return null;
  }
}

// ── La séance du jour (V3 §6.2) ────────────────────────────────────────

/**
 * La séance du jour gardée en base (codex_seances, migration_codex_v3.sql §6).
 * `absente` : la §6 n'est pas collée (la séance vit alors dans la mémoire de
 * l'instance) ; `lue` faux : une autre erreur, on ne réécrit rien ce coup-ci.
 */
async function lireSeance(a: SupabaseClient, id: string, jour: string): Promise<{ gardee: SeanceGardee | null; absente: boolean; lue: boolean }> {
  try {
    const { data, error } = await a.from("codex_seances").select(COLONNES_SEANCE).eq("user_id", id).eq("jour", jour).maybeSingle();
    if (error) return { gardee: null, absente: baseAbsente(error), lue: false };
    return { gardee: lireSeanceGardee(data), absente: false, lue: true };
  } catch {
    return { gardee: null, absente: false, lue: false };
  }
}

/** Sans la §6 : la dernière séance calculée aujourd'hui par cette instance tient lieu de séance gardée. */
function seanceEnMemoire(userId: string, jour: string): SeanceGardee | null {
  const s = DERNIER.get(userId)?.seance;
  return s && s.jour === jour ? { budget: s.budget, blocs: s.blocs, faits: s.faits, lanceeLe: s.lanceeLe, finieLe: s.finieLe, avant: s.avant ?? null } : null;
}

/**
 * La séance du jour, une fois le Codex évalué. Ses blocs faits se lisent sur
 * leurs objectifs (demandés à codex_lire avec le reste : Entree.seance) ; la
 * séance gardée tient tant que le budget du jour ne change pas et qu'aucun de
 * ses blocs à faire n'est écarté ; sinon elle est recomposée, blocs faits en
 * tête, et reposée en base. Une écriture ratée ne coûte rien : elle se rejoue
 * au calcul suivant. null : rien à proposer.
 */
async function seanceDuJour(
  a: SupabaseClient,
  user: Joueur,
  o: { entree: Entree; resultat: Resultat; vue: VueCodex; lus: ReturnType<typeof faitsDeSeance>; actif: DefinitionProgramme; lue: Awaited<ReturnType<typeof lireSeance>>; precedente: SeanceGardee | null },
): Promise<VueSeance | null> {
  const { entree, resultat, vue, precedente } = o;
  const jour = entree.jour;
  const { cinqFait, trenteFait, faits } = o.lus;
  const budget = budgetDuJour(entree);
  const ecartes = ecartesSeance(entree.ecartees ?? []);
  const recomposer = aRecomposer(precedente, budget, ecartes, faits);
  let blocs = precedente?.blocs ?? [];
  if (recomposer) {
    const contenu = entree.contenu ?? contenuDuProgramme();
    const dest = contexteDestination(entree, resultat);
    blocs = composerSeance({
      jour, phase: resultat.phase, joursAvant: joursAvantExamen(jour, entree.jourJ), budget,
      maitrise: maitriseDuCodex(contenu, entree.lecture.mesures),
      revoir: revoirCodexDe(entree.lecture.mesures),
      cinqFait, trenteFait,
      // les 30 du jour existent chaque jour (la page /defi les tire au premier passage)
      trenteDispo: o.actif.outils.has("trente"),
      questionsTotal: (entree.lecture.mesures.jours ?? []).reduce((s, j) => s + j.n, 0),
      notionsNonVues: contenu.map((m) => ({ matiere: m.key, n: dest.notionsNonVues[m.key] ?? 0, total: m.notions })),
      contrats: vue.contrats, def: o.actif, ecartes, dest,
      blocsFaits: (precedente?.blocs ?? []).filter((b) => faits.includes(b.genre)),
      recalage: recalageVerdict(entree.verdict, jour),
    }).blocs;
  }
  if (!blocs.length) return null;
  const gardee = !o.lue.absente && o.lue.lue;
  if (gardee) {
    try {
      if (recomposer) {
        const { error } = await a.rpc("codex_seance_poser", { p_user: user.id, p_jour: jour, p_budget: budget, p_blocs: versStockage(blocs), p_ecartes: ecartes });
        if (error) await consigner(a, user.id, "", `codex_seance_poser : ${error.message}`);
      }
      const nouveaux = faits.filter((g) => !(precedente?.faits ?? []).includes(g));
      if (nouveaux.length) await a.rpc("codex_seance_marquer", { p_user: user.id, p_jour: jour, p_quoi: "fait", p_val: nouveaux });
    } catch {
      // reposée au calcul suivant
    }
  }
  const dans = faits.filter((g) => blocs.some((b) => b.genre === g));
  const tenue = blocs.every((b) => dans.includes(b.genre));
  // un bloc à faire de plus (recomposée) : la séance n'est plus finie
  const finieLe = recomposer && !tenue ? null : (precedente?.finieLe ?? null);
  const lanceeLe = precedente?.lanceeLe ?? null;
  return { jour, budget, phase: resultat.phase, blocs, duree: blocs.reduce((s, b) => s + b.duree, 0), faits: dans, lancee: !!lanceeLe, lanceeLe, finie: tenue || !!finieLe, finieLe, gardee, avant: lanceeLe ? (precedente?.avant ?? null) : null };
}

// ── L'instantané du panneau (codex_vue_cache, V3 §6.2) ─────────────────

/** Garde le panneau et la séance du dernier calcul ; un échec ne coûte rien (la barre recalcule). */
async function poserCache(a: SupabaseClient, userId: string, jour: string, vue: VueCodex) {
  try {
    await a.rpc("codex_vue_cache_poser", { p_user: userId, p_jour: jour, p_panneau: panneauAGarder(panneauDe(vue)), p_seance: vue.seance });
  } catch {
    // sans la §6, ou la base occupée : rien de gardé
  }
}

/** L'instantané n'est plus juste (fin d'un outil, récompenses annoncées) : le prochain panneau se recalcule. */
export async function oublierPanneau(userId: string) {
  const a = admin();
  if (!a) return;
  try {
    await a.rpc("codex_vue_cache_marquer", { p_user: userId });
  } catch {
    // sans la §6 : pas d'instantané
  }
}

/**
 * L'XP totale du joueur (profiles.xp_total), pour la ligne de niveau en tête
 * du panneau « Aujourd'hui » : là où l'XP récupérée arrive. Lue à part, jamais
 * gardée (le panneau, lui, l'est 10 min). null : illisible.
 */
export async function lireXpTotal(supabase: SupabaseClient, userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.from("profiles").select("xp_total").eq("id", userId).maybeSingle();
    if (error || !data) return null;
    const xp = Number((data as { xp_total?: unknown }).xp_total);
    return Number.isFinite(xp) ? Math.max(0, xp) : null;
  } catch {
    return null;
  }
}

/**
 * Le panneau de la barre du haut : le calcul gardé 45 s s'il y en a un ;
 * sinon l'instantané de moins de 10 min, s'il n'est pas marqué ; sinon un
 * calcul complet. Sans la §6 : comme avant (le calcul).
 */
export async function lirePanneau(supabase: SupabaseClient, user: Joueur): Promise<Panneau> {
  return (await panneauGarde(user.id)) ?? panneauDe(await lireCodex(supabase, user));
}

/**
 * Le panneau déjà calculé, sans rien calculer : le calcul gardé 45 s, sinon
 * l'instantané de moins de 10 min s'il n'est pas marqué ; null sinon (et
 * toujours sans la §6, hors du mémo). La pastille de séance s'en contente au
 * fil des pages : le calcul complet reste à l'ouverture du sceau et au Codex.
 */
export async function panneauGarde(userId: string): Promise<Panneau | null> {
  const memo = MEMO.get(userId);
  if (memo && Date.now() - memo.at < MEMO_MS) return panneauDe(memo.vue);
  const a = admin();
  if (!a) return null;
  try {
    const { data, error } = await a.from("codex_vue_cache").select("jour,panneau,calcule_le,a_recalculer").eq("user_id", userId).maybeSingle();
    return error ? null : panneauDuCache(data, jourParis(), Date.now());
  } catch {
    // sans la §6 : rien de gardé
    return null;
  }
}

/** Le calcul complet : lit, évalue, écrit les récompenses, bâtit la vue (le dévoilement est écrit par lireCodex). */
async function calculer(supabase: SupabaseClient, user: Joueur): Promise<Retour> {
  const jour = jourParis();
  const now = new Date();
  const a = admin();
  const vide: Retour = { vue: VUE_INDISPONIBLE(jour), entree: null, resultat: null };
  if (!a) return vide;
  try {
    const hier = decaleJour(jour, -1);
    const [joueurR, reglage, lignes, contratsParJour, dateExamen, pf, programmes, seanceLue, rythmeLu] = await Promise.all([
      a.from("codex_joueur").select(COLONNES_JOUEUR).eq("user_id", user.id).maybeSingle(),
      lireReglage(a, user, jour),
      lireLignes(a, user.id),
      lireContrats(a, user.id, [jour, hier]),
      dateExamenDe(a, user.id),
      pointsFaibles(supabase),
      lireProgrammes(a, user.id),
      lireSeance(a, user.id, jour),
      lireRythme(a, user, jour),
    ]);
    // le programme actif (sans ligne : CFA I) ; son jour J, sinon, pour CFA I seulement, celui du profil
    // (le repli d'avant la v3, V3 §1.6) : un programme suivant daté sans jour J posé n'hérite pas de la
    // date passée de CFA I, sa phase suit l'avancement
    const actif = programmeActif(programmes);
    const ligneActive = programmes.find((p) => p.programme === actif.cle && p.statut === "actif");
    const jourJ = jourJDuProgramme(actif, programmes.find((p) => p.programme === actif.cle), dateExamen);
    // les mesures v3 et les capacités : rendues par codex_lire quand la §5 est collée (journal 3 au dernier
    // calcul : une seule lecture des réponses, V3 §12.3bis) ; sinon lues à part, pendant le tirage des contrats
    // (codex_lire ne les recalcule pas alors : p_v3 à faux)
    const v3Apart = reglage.capacitesVues?.journal === 3 ? null : lireMesuresV3(a, user.id, actif.cle);
    if (joueurR.error && baseAbsente(joueurR.error)) return vide;
    // une lecture ratée de codex_joueur ferait passer le joueur pour neuf (tout rétroactif) : on s'arrête là
    if (joueurR.error) {
      await consigner(a, user.id, "", `codex_joueur illisible : ${joueurR.error.message}`);
      return repli(user.id, jour);
    }
    if (lignes === null) {
      await consigner(a, user.id, "", "codex_progression illisible");
      return repli(user.id, jour);
    }
    const joueur = joueurR.data as { premier_calcul: string; dernier_calcul: string } | null;
    // l'arbre du programme actif (CFA I : le catalogue par défaut du moteur)
    const contenu = actif.matieres();
    // la malle de l'examen (V3 §7.3) : dans le compte, rien en base
    const malle = lireMalle(user.user_metadata, actif.cle);
    const entree: Entree = {
      ...(actif.cle === PROGRAMME ? {} : { catalogue: catalogueComplet(actif.cle) }),
      contenu,
      now,
      jour,
      jourJ,
      objectif: lireObjectifMeta(user.user_metadata),
      visiteVue: visiteVue(user.user_metadata),
      progression: lignes,
      contrats: contratsParJour.get(jour) ?? [],
      premier: !joueur,
      dernierCalcul: joueur ? new Date(joueur.dernier_calcul) : null,
      lecture: LECTURE_VIDE,
      pointsFaibles: pf,
      budget: reglage.budget,
      ecartees: reglage.ecartees,
      programmes,
      capacitesVues: reglage.capacitesVues,
      malleCoches: malle.length,
      // le rythme long (V3 §10.2 à §10.5) : le sprint, la semaine choisie, le verdict de la dernière session
      premierCalcul: joueur?.premier_calcul ?? null,
      semaine: rythmeLu.semaine,
      verdict: rythmeLu.verdicts.find((v) => v.programme === actif.cle) ?? null,
      // « versées d'office » : rien n'attend « Récupérer » (lib/codex/recuperer)
      sobre: lireSobre(user),
    };
    // la séance du jour déjà proposée (en base ; sans la §6, celle de cette instance) : les objectifs de
    // ses blocs et les sondes du jour (5 et 30 rendus) partent avec les compteurs des quêtes
    const seancePrecedente = seanceLue.absente ? seanceEnMemoire(user.id, jour) : seanceLue.gardee;
    // le jour J et le lendemain : pas de séance (V3 §7.4, §7.5) ; ces moments ne dépendent que du jour J
    // (sans lui, momentDe rend « courant » ou « après » : la phase passée ici n'y change rien)
    const sansSeance = pinceauPose(momentDe(actif.examen ? joursAvantExamen(jour, jourJ) : null, "fondations"));
    entree.seance = { objectifs: [...SONDES_SEANCE, ...(seancePrecedente?.blocs ?? []).map((b) => b.objectif)], lanceeLe: seancePrecedente?.lanceeLe ?? null };

    // les contrats du jour : tirés une fois (la base garde le premier tirage) ; un seul en veillée
    // (le jour d'un retour, la reprise douce est seule : rien à compléter)
    if (entree.contrats.length < emplacementsDe(phaseJoueur(entree, actesClosDe(entree.progression))).length && !entree.contrats.some((c) => c.modele === "reprise")) {
      // l'activité seule : pas de mesures v3 (lues plus bas avec tous les compteurs)
      const mesures = await lire(a, user.id, demandesActivite(contenu, jour), jour, false);
      if (!mesures) {
        await consigner(a, user.id, "", "codex_lire (tirage des contrats) a échoué");
        return repli(user.id, jour);
      }
      entree.activite = lireActivite(contenu, mesures);
      const hierMap = Object.fromEntries((contratsParJour.get(hier) ?? []).map((c) => [c.emplacement, c.modele]));
      const tirage = tirerContrats({ ...entree, lecture: mesures }, user.id, hierMap);
      if (tirage.length) {
        const { data, error } = await a.rpc("codex_contrats_poser", { p_user: user.id, p_jour: jour, p_tirage: tirage });
        if (!error && Array.isArray(data)) entree.contrats = data as ContratTire[];
        else entree.contrats = tirage;
      }
    }

    // ce que la base sait faire décide des quêtes suivies, donc des compteurs demandés : connu d'avance
    // quand les mesures sont lues à part ; sinon on demande les compteurs de tout ce qu'elle pourrait
    // suivre (les compteurs en trop ne coûtent rien), et codex_lire dit ce qu'elle sait faire
    // (en panne : null, comme sans lecture à part ; codex_lire ou une seconde lecture les rendront, sinon repli)
    const v3Lu = v3Apart ? await v3Apart : null;
    entree.capacites = v3Lu?.capacites ?? CAPACITES_TOUTES;
    // les compteurs de toutes les quêtes, en un seul appel
    const demandes = planifier(entree);
    const lu = await lire(a, user.id, demandes, jour, !v3Lu);
    if (!lu) {
      await consigner(a, user.id, "", "codex_lire a échoué");
      return repli(user.id, jour);
    }
    const { v3: v3Brut, ...lecture } = lu;
    // codex_lire sans « v3 » (§5 pas collée, ou mesures en panne, consignée) : l'appel à part
    const v3 = v3Lu ?? mesuresV3DeLecture(v3Brut, actif.cle) ?? (await lireMesuresV3(a, user.id, actif.cle));
    // mesures v3 en panne : ne rien évaluer ni écrire sans elles (aucun acte clos, aucun lot)
    if (!v3) {
      await consigner(a, user.id, "", "codex_mesures_v3 illisible");
      return repli(user.id, jour);
    }
    entree.capacites = v3.capacites;
    entree.lecture = { ...lecture, mesures: avecMesuresV3(lecture.mesures, v3) };
    const compteurs = indexerLecture(demandes, entree.lecture);
    // les blocs faits de la séance gardée, lus sur les mêmes compteurs ; lancée et tenue, elle verse le bonus du trio
    const seanceLus = faitsDeSeance(seancePrecedente, evaluerObjectifs(entree, compteurs, entree.seance.objectifs));
    entree.seance = { ...entree.seance, tenue: !sansSeance && seanceLus.tenue };
    let resultat = evaluer(entree, compteurs);

    // l'écriture : récompenses uniques, ouvertures, progression
    let nouvelles: VueCodex["nouvelles"] = [];
    let retro: VueCodex["retro"] = null;
    if (resultat.lot.length || entree.premier) {
      const { data, error } = await a.rpc("codex_ecrire", { p_user: user.id, p_lot: resultat.lot, p_budget_retro: resultat.budgetRetro });
      if (error) {
        if (baseAbsente(error)) return vide;
        // écriture refusée en entier (sans migration_codex_v3.sql, une seule ligne en conflit suffit) :
        // la vue évaluée est servie quand même, les récompenses partiront au prochain calcul
        await consigner(a, user.id, "", `codex_ecrire : ${error.message}`);
      }
      const w = (error ? null : data) as { recompenses?: { quete: string; periode: string; xp: number; nominal: number; cosmetique: string | null; titre: string | null; retro: boolean }[]; retro?: VueCodex["retro"] } | null;
      retro = w?.retro ?? null;
      // les titres clairs (Codex simplifié §4), comme la vue
      const titres = new Map(resultat.etats.map((s) => [s.quete.id, titreClair(s.quete, { params: parametresDe(entree, s), contenu: entree.contenu })]));
      for (const x of actesDuJoueur(entree)) titres.set(`acte:${x.id}`, nomActe(x));
      nouvelles = (w?.recompenses ?? []).filter((x) => !x.retro).map((x) => ({ quete: x.quete, periode: x.periode, xp: x.xp, nominal: x.nominal, cosmetique: x.cosmetique, titre: x.titre, titreQuete: titres.get(x.quete) ?? x.quete }));
      // le lot est écrit : le rattrapage est fait, son marqueur peut avancer (V3 §1.9)
      if (!error && resultat.capacitesVues) await ecrireCapacitesVues(a, user, reglage.ou, resultat.capacitesVues);
      // relire les lignes écrites (XP versée, fanfare) et réévaluer sans rappeler la base
      const apres = error ? null : await lireLignes(a, user.id);
      if (apres) {
        entree.progression = apres;
        entree.premier = false;
        resultat = evaluer(entree, compteurs);
      }
    } else if (!retro) {
      const j = await a.rpc("codex_ecrire", { p_user: user.id, p_lot: [], p_budget_retro: 0 }).then((x) => x, () => null);
      retro = (j?.data as { retro?: VueCodex["retro"] } | null)?.retro ?? null;
      if (j && !j.error && resultat.capacitesVues) await ecrireCapacitesVues(a, user, reglage.ou, resultat.capacitesVues);
    }

    // le mode sobre verse d'office : ce qui attendait encore le clic (d'avant l'interrupteur) est versé sans bouton
    if (entree.sobre && entree.progression.some((l) => l.etat === "terminee")) {
      const verse = await recupererEnBase(a, user.id, null);
      const apres = verse ? await lireLignes(a, user.id) : null;
      if (apres) {
        entree.progression = apres;
        resultat = evaluer(entree, compteurs);
      }
    }

    // un programme sans examen est mené quand le dernier acte de sa trame se clôt (V3 §1.6) ; sans §3, rien
    const fil = filDesActes(actif);
    if (!actif.examen && ligneActive && fil.length && resultat.actesClos.includes(fil[fil.length - 1].id)) {
      try {
        const { error } = await a.rpc("codex_programme_poser", { p_user: user.id, p_programme: actif.cle, p_statut: "mene", p_jour_j: null });
        if (!error) entree.programmes = programmes.map((p) => (p === ligneActive ? { ...p, statut: "mene" as const } : p));
      } catch {
        // reposé au calcul suivant
      }
    }

    // le dévoilement progressif
    const meta = lireMetaCodex(user.user_metadata);
    const faites = new Set(resultat.etats.filter((s) => s.fait).map((s) => `${s.quete.id}|${s.periode}`));
    const questions = (lecture.mesures.jours ?? []).reduce((s, j) => s + j.n, 0);
    // les derniers jours (veillée, malle, jour J) : rien de neuf ne se dévoile, le dévoilement reprend après (V3 §7.1)
    const calme = momentCalme(momentDe(actif.examen ? joursAvantExamen(jour, jourJ) : null, resultat.phase));
    const devoile = calme
      ? { devoile: meta.devoile, jours: meta.jours, nouveaux: [], change: false }
      : devoiler(meta, { inscritLe: lecture.mesures.inscrit_le ?? user.created_at ?? null, questions, faites, now, jour });

    const reco = recommander(entree, resultat);
    const changementFait = entree.contrats.some((c) => c.change);
    const construite = construireVue(entree, resultat, reco, { devoile, nouvelles, retro, changementFait, joueur: user.id, malle, sobre: lireSobre(user) });
    // la séance et le rythme long sont secondaires : une panne de l'un ne coûte que lui (le lot est déjà
    // écrit, la vue principale et ses nouvelles doivent être servies et annoncées)
    let seance: VueSeance | null = null;
    try {
      seance = sansSeance ? null : await seanceDuJour(a, user, { entree, resultat, vue: construite, lus: seanceLus, actif, lue: seanceLue, precedente: seancePrecedente });
    } catch (x) {
      await consigner(a, user.id, "", `seance : ${x instanceof Error ? x.message : String(x)}`);
    }
    let rythme: VueCodex["rythme"] = null;
    try {
      rythme = vueRythme(entree, compteurs, { semaineDispo: rythmeLu.semaineDispo, capacites: entree.capacites, moment: construite.moment, verdicts: rythmeLu.verdicts });
    } catch (x) {
      await consigner(a, user.id, "", `rythme : ${x instanceof Error ? x.message : String(x)}`);
    }
    const vue: VueCodex = { ...construite, seance, rythme };
    garder(user.id, vue);
    // l'instantané du panneau, pour la barre du haut (§6 collée seulement)
    if (!seanceLue.absente) await poserCache(a, user.id, jour, vue);
    return { vue, entree, resultat };
  } catch (e) {
    await consigner(a, user.id, "", e instanceof Error ? e.message : String(e));
    return repli(user.id, jour);
  }
}

/** Un seul calcul à la fois par joueur : une lecture simple rejoint celui en cours ; une lecture forcée en lance un neuf, que les suivantes rejoignent. */
function calculUnique(supabase: SupabaseClient, user: Joueur, force: boolean): Promise<Retour> {
  const enCours = ENCOURS.get(user.id);
  if (!force && enCours) return enCours;
  const p = calculer(supabase, user).finally(() => {
    if (ENCOURS.get(user.id) === p) ENCOURS.delete(user.id);
  });
  ENCOURS.set(user.id, p);
  return p;
}

/** Écrit le dévoilement dans le compte (user_metadata rl_codex), une fois. */
async function persisterDevoile(supabase: SupabaseClient, userId: string, vue: VueCodex) {
  const d = vue.devoile;
  if (!d?.change) return;
  try {
    // rl_codex garde aussi le marqueur du rattrapage (capacites_vues, sans la §2) : on ne l'écrase pas
    const { data } = await supabase.auth.getUser();
    const avant = (data.user?.user_metadata as { rl_codex?: Record<string, unknown> } | undefined)?.rl_codex ?? {};
    await supabase.auth.updateUser({ data: { rl_codex: { ...avant, devoile: d.devoile, jours: d.jours } } });
    patcher(userId, (v) => (v.devoile ? { ...v, devoile: { ...v.devoile, change: false } } : v));
  } catch {
    // le dévoilement se recalcule à la prochaine visite
  }
}

/**
 * La vue du Codex d'un joueur (page /codex, carte « Prochaine quête » ailleurs).
 * `force` : recalcule tout de suite (fin de séance) ; sinon un calcul de moins
 * de 45 s est réutilisé. `persister` : écrit le dévoilement dans le compte
 * (seulement depuis une action serveur, pas pendant un rendu).
 */
export async function lireCodex(supabase: SupabaseClient, user: Joueur, opts: { force?: boolean; persister?: boolean } = {}): Promise<VueCodex> {
  const memo = MEMO.get(user.id);
  const lue = !opts.force && memo && Date.now() - memo.at < MEMO_MS ? { ...memo.vue, nouvelles: [] } : (await calculUnique(supabase, user, !!opts.force)).vue;
  // le mode sobre se relit à chaque visite : l'interrupteur agit sans attendre la fin du mémo
  const sobre = lireSobre(user);
  const vue = lue.sobre === sobre ? lue : { ...lue, sobre };
  if (opts.persister && vue.devoile?.change) await persisterDevoile(supabase, user.id, vue);
  return vue;
}

/** La récompense d'une quête telle qu'elle est écrite (codex_progression), sans recalcul ; null : pas encore faite. `attend` : faite, elle attend « Récupérer ». */
export async function recompenseEcrite(userId: string, queteId: string, periode: string): Promise<{ xp: number; vu: boolean; attend: boolean } | null | "indisponible"> {
  const a = admin();
  if (!a) return "indisponible";
  try {
    const { data, error } = await a.from("codex_progression").select("etat,xp,vu").eq("user_id", userId).eq("quete_id", queteId).eq("periode", periode).maybeSingle();
    if (error) return "indisponible";
    const l = data as { etat: string; xp: number | string; vu: boolean } | null;
    return l && (l.etat === "recompensee" || l.etat === "terminee") ? { xp: Number(l.xp) || 0, vu: !!l.vu, attend: l.etat === "terminee" } : null;
  } catch {
    return "indisponible";
  }
}

/** Les compteurs et la décision d'un changement de contrat (une seule fois par jour). */
export async function changerContrat(supabase: SupabaseClient, user: Joueur, emplacement: Emplacement): Promise<{ ok: true; vue: VueCodex } | { ok: false; raison: "connexion" | "indisponible" | "refus" | "aucun" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const { entree } = await calculer(supabase, user);
  if (!entree) return { ok: false, raison: "indisponible" };
  // l'activité par matière (contrat « prend la poussière ») n'est lue qu'au tirage : la relire pour le remplaçant
  if (!entree.activite) {
    const act = await lire(a, user.id, demandesActivite(entree.contenu ?? contenuDuProgramme(), entree.jour), entree.jour, false);
    if (act) entree.activite = lireActivite(entree.contenu ?? contenuDuProgramme(), act);
  }
  const actuel = entree.contrats.find((c) => c.emplacement === emplacement);
  if (!actuel) return { ok: false, raison: "aucun" };
  const autre = remplacantContrat(entree, user.id, emplacement, actuel.modele);
  if (!autre) return { ok: false, raison: "aucun" };
  const { error } = await a.rpc("codex_contrat_changer", { p_user: user.id, p_jour: entree.jour, p_emplacement: emplacement, p_modele: autre.modele, p_params: autre.params });
  if (error) return { ok: false, raison: baseAbsente(error) ? "indisponible" : "refus" };
  return { ok: true, vue: (await calculUnique(supabase, user, true)).vue };
}

/**
 * Le réglage du jour du joueur : son budget (« J'ai 30 min ») et/ou une quête
 * écartée (« Une autre idée ? », jusqu'à demain). Écrit en base
 * (codex_joueur_regler) ; sans la §2, dans le compte (rl_codex_jour). Puis le
 * Codex est recalculé.
 */
export async function reglerJour(supabase: SupabaseClient, user: Joueur, quoi: { budget?: Budget; ecarter?: string }): Promise<{ ok: true; vue: VueCodex } | { ok: false; raison: "indisponible" | "refus" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const jour = jourParis();
  const reglage = await lireReglage(a, user, jour);
  const ecartees = quoi.ecarter ? ecarter(reglage, quoi.ecarter) : null;
  let joueur: Joueur = user;
  let enBase = reglage.ou === "base";
  if (enBase) {
    try {
      const { error } = await a.rpc("codex_joueur_regler", { p_user: user.id, p_budget: quoi.budget ?? null, p_ecartees: ecartees ? { jour, ids: ecartees } : null });
      if (error && !baseAbsente(error)) return { ok: false, raison: "refus" };
      enBase = !error;
    } catch {
      return { ok: false, raison: "refus" };
    }
  }
  if (!enBase) {
    const rl_codex_jour = { jour, budget: quoi.budget ?? reglage.budget, ecartees: ecartees ?? reglage.ecartees };
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { rl_codex_jour } });
      if (error) return { ok: false, raison: "refus" };
      if (data.user) joueur = data.user;
    } catch {
      return { ok: false, raison: "refus" };
    }
  }
  MEMO.delete(user.id);
  const { vue } = await calculUnique(supabase, joueur, true);
  return vue.disponible ? { ok: true, vue } : { ok: false, raison: "indisponible" };
}

/**
 * Une marque sur la séance du jour (V3 §6.2, §6.6) : « vue » (première
 * fois affichée), « lancee » (« Commencer » : les blocs comptent dès
 * maintenant, l'instantané est pris), « finie » (« J'arrête là »). En base
 * (codex_seance_marquer) ; sans la §6, dans la séance gardée par cette
 * instance (`gardee` faux : « Continuer » se garde aussi dans le navigateur).
 * Puis le Codex est recalculé (sauf pour « vue », une simple trace).
 */
export async function marquerSeance(supabase: SupabaseClient, user: Joueur, quoi: "vue" | "lancee" | "finie"): Promise<{ ok: true; vue: VueCodex; gardee: boolean } | { ok: false; raison: "indisponible" | "refus" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const jour = jourParis();
  let gardee = false;
  try {
    const { data, error } = await a.rpc("codex_seance_marquer", { p_user: user.id, p_jour: jour, p_quoi: quoi, p_val: null });
    if (error && !baseAbsente(error)) return { ok: false, raison: "refus" };
    gardee = !error && data !== null;
    const v = MEMO.get(user.id)?.vue ?? DERNIER.get(user.id);
    if (gardee && quoi === "lancee" && v?.disponible && v.jour === jour) {
      await a.rpc("codex_seance_marquer", { p_user: user.id, p_jour: jour, p_quoi: "avant", p_val: instantaneSeance(v) });
    }
  } catch {
    return { ok: false, raison: "refus" };
  }
  if (!gardee && quoi !== "vue") {
    const maintenant = new Date().toISOString();
    patcher(user.id, (v) => (v.seance && v.seance.jour === jour
      ? { ...v, seance: quoi === "lancee" ? { ...v.seance, lancee: true, lanceeLe: v.seance.lanceeLe ?? maintenant, avant: v.seance.avant ?? instantaneSeance(v) } : { ...v.seance, finie: true, finieLe: v.seance.finieLe ?? maintenant } }
      : v));
  }
  if (quoi === "vue") {
    const v = MEMO.get(user.id)?.vue ?? DERNIER.get(user.id);
    return v ? { ok: true, vue: v, gardee } : { ok: false, raison: "indisponible" };
  }
  MEMO.delete(user.id);
  const { vue } = await calculUnique(supabase, user, true);
  return vue.disponible ? { ok: true, vue, gardee } : { ok: false, raison: "indisponible" };
}

/**
 * « Ouvrir CFA II » (la route de Milan, V3 §1.6) : le programme proposé
 * devient l'actif (codex_programme_poser), l'ancien reste mené. Refusé si ce
 * n'est pas la suite du joueur ou qu'elle n'est pas publique ; sans §3 :
 * indisponible. Puis le Codex est recalculé.
 */
export async function ouvrirProgramme(supabase: SupabaseClient, user: Joueur, programme: string): Promise<{ ok: true; vue: VueCodex } | { ok: false; raison: "indisponible" | "refus" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const suite = suiteDe(await lireProgrammes(a, user.id));
  if (!suite || suite.cle !== programme || !suite.public) return { ok: false, raison: "refus" };
  try {
    const { error } = await a.rpc("codex_programme_poser", { p_user: user.id, p_programme: programme, p_statut: "actif", p_jour_j: null });
    if (error) return { ok: false, raison: baseAbsente(error) ? "indisponible" : "refus" };
  } catch {
    return { ok: false, raison: "refus" };
  }
  MEMO.delete(user.id);
  const { vue } = await calculUnique(supabase, user, true);
  return vue.disponible ? { ok: true, vue } : { ok: false, raison: "indisponible" };
}

/**
 * Le choix du lundi (V3 §10.3) : la cible et la commande de la semaine,
 * gardées en base (codex_semaine) ; le banquier vise la matière lourde la plus
 * faible du dernier calcul. Puis le Codex recalculé avec les contrats de la
 * commande. Sans la §8 de migration_codex_v3.sql : indisponible.
 */
export async function choisirSemaine(supabase: SupabaseClient, user: Joueur, choix: { cible: number; commande: Commande }): Promise<{ ok: true; vue: VueCodex } | { ok: false; raison: "indisponible" | "refus" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const { entree } = choix.commande === "banquier" ? await calculUnique(supabase, user, false) : { entree: null };
  const r = await poserSemaine(a, user, jourParis(), choix, entree);
  if (!r.ok) return r;
  MEMO.delete(user.id);
  const { vue } = await calculUnique(supabase, user, true);
  return vue.disponible ? { ok: true, vue } : { ok: false, raison: "indisponible" };
}

/**
 * Le verdict de l'examen (V3 §10.5), pour la session du jour J passé : gardé
 * en base (codex_resultat ; sans la §8, dans le compte). « Admis » mène le
 * programme : le Codex recalculé propose la suite.
 */
export async function saisirVerdict(supabase: SupabaseClient, user: Joueur, statut: StatutVerdict, bandes: unknown): Promise<{ ok: true; vue: VueCodex } | { ok: false; raison: "indisponible" | "refus" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const v = (await lireCodex(supabase, user)).rythme?.verdict;
  if (!v) return { ok: false, raison: "refus" };
  const r = await poserVerdict(a, supabase, user, { programme: v.programme, session: v.session, statut, bandes: bandesValides(bandes, v.matieres.map((m) => m.cle)) });
  if (!r.ok) return r;
  MEMO.delete(user.id);
  // sans la §8, le verdict est dans le compte : le calcul relit l'utilisateur à jour
  const { data } = await supabase.auth.getUser();
  const { vue } = await calculUnique(supabase, data.user ?? user, true);
  return vue.disponible ? { ok: true, vue } : { ok: false, raison: "indisponible" };
}

/**
 * La malle de l'examen (V3 §7.3) : les cases cochées, gardées dans le compte
 * (user_metadata.rl_malle = { programme, coches }, aucun SQL). La vue gardée
 * est corrigée sur place ; le Codex n'est recalculé (la quête « La malle est
 * prête » versée) qu'au passage du seuil de cinq cases.
 */
export async function ecrireMalle(supabase: SupabaseClient, user: Joueur, coches: unknown, pret: number): Promise<{ ok: true; coches: string[]; vue: VueCodex | null } | { ok: false; raison: "refus" }> {
  const valides = cochesValides(coches);
  const programme = programmeActif(await lireProgrammes(admin() ?? supabase, user.id)).cle;
  const avant = lireMalle(user.user_metadata, programme).length;
  let joueur: Joueur = user;
  try {
    const { data, error } = await supabase.auth.updateUser({ data: { rl_malle: { programme, coches: valides } } });
    if (error) return { ok: false, raison: "refus" };
    if (data.user) joueur = data.user;
  } catch {
    return { ok: false, raison: "refus" };
  }
  if ((avant >= pret) === (valides.length >= pret)) {
    patcher(user.id, (v) => (v.malle ? { ...v, malle: { coches: valides } } : v));
    return { ok: true, coches: valides, vue: null };
  }
  MEMO.delete(user.id);
  const { vue } = await calculUnique(supabase, joueur, true);
  return { ok: true, coches: valides, vue: vue.disponible ? vue : null };
}

// ── « Récupérer » (Codex simplifié, migration_codex_v3.sql §9) ──────────

type LigneRecuperee = { quete: string; periode: string; famille: string; xp: number; cosmetique: string | null; titre: string | null; terminee_le: string | null };

/**
 * codex_recuperer : verse les quêtes faites qui attendent (`cles` : celles-là
 * seulement ; null : toutes). null : la fonction manque (§9 pas collée) ou
 * l'appel a échoué (consigné) ; `refus` : l'échec n'est pas une absence.
 */
async function recupererEnBase(a: SupabaseClient, userId: string, cles: { quete: string; periode: string }[] | null): Promise<{ recuperees: LigneRecuperee[]; xp: number; restant: number } | null | "refus"> {
  try {
    const { data, error } = await a.rpc("codex_recuperer", { p_user: userId, p_cles: cles });
    if (error) {
      if (baseAbsente(error)) return null;
      await consigner(a, userId, "", `codex_recuperer : ${error.message}`);
      return "refus";
    }
    const d = (data ?? {}) as { recuperees?: LigneRecuperee[]; xp?: number; restant?: number };
    return { recuperees: Array.isArray(d.recuperees) ? d.recuperees : [], xp: Number(d.xp) || 0, restant: Number(d.restant) || 0 };
  } catch {
    return "refus";
  }
}

/**
 * Le clic « Récupérer » (lib/codex/recuperer) : verse les quêtes faites qui
 * attendent (codex_recuperer) et accuse réception de celles déjà versées
 * (repli sans la §9 : codex_vus). `cles` : celles-là seulement ; null :
 * toutes. Rend ce qui a été récupéré (titres et pièces lus dans la vue d'avant
 * le clic), l'XP versée à ce clic (0 pour le déjà versé) et ce qui attend
 * encore. La vue gardée et l'instantané du panneau sont ensuite oubliés : le
 * prochain calcul relit tout. Un double clic ne verse qu'une fois (la base).
 */
export async function recupererCodex(
  supabase: SupabaseClient,
  user: Joueur,
  cles: { quete: string; periode: string }[] | null,
): Promise<{ ok: true; recues: ARecuperer[]; xp: number; restant: number; sobre: boolean } | { ok: false; raison: "indisponible" | "refus" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const vue = await lireCodex(supabase, user);
  if (!vue.disponible) return { ok: false, raison: "indisponible" };
  const voulues = cles ? new Set(cles.map(cleRecuperer)) : null;
  const choisies = vue.aRecuperer.filter((x) => !voulues || voulues.has(cleRecuperer(x)));
  const parCle = new Map(vue.aRecuperer.map((x) => [cleRecuperer(x), x]));
  const recues: ARecuperer[] = [];
  let xp = 0;
  let restantBase: number | null = null;

  // à verser : toutes (la base peut en savoir plus que la vue gardée), ou celles demandées qui attendent
  const aVerser = cles ? cles.filter((c) => parCle.get(cleRecuperer(c))?.aVerser !== false) : null;
  if (!aVerser || aVerser.length) {
    const r = await recupererEnBase(a, user.id, aVerser ? aVerser.slice(0, MAX_RECUPERER) : null);
    if (r === "refus") return { ok: false, raison: "refus" };
    if (r) {
      xp = r.xp;
      restantBase = r.restant;
      for (const l of r.recuperees) {
        const connue = parCle.get(cleRecuperer(l));
        recues.push({
          ...(connue ?? { titre: titreHorsVue(l.quete) ?? TEXTES_RECUPERER.sansTitre, famille: familleDe(l.quete), le: null, recompense: null, piece: l.cosmetique ?? l.titre ?? null }),
          quete: l.quete,
          periode: l.periode,
          xp: Math.max(0, Number(l.xp) || 0),
          aVerser: true,
        });
      }
    }
  }

  // déjà versées : le clic en accuse réception (la fanfare est jouée par l'écran)
  const accuses = choisies.filter((x) => !x.aVerser);
  if (accuses.length) {
    const ok = await marquerVus(user.id, [...new Set(accuses.map((x) => x.quete))]);
    if (!ok && !recues.length) return { ok: false, raison: "refus" };
    if (ok) recues.push(...accuses);
  }

  const prises = new Set(recues.map(cleRecuperer));
  const restant = (restantBase ?? vue.aRecuperer.filter((x) => x.aVerser && !prises.has(cleRecuperer(x))).length) + vue.aRecuperer.filter((x) => !x.aVerser && !prises.has(cleRecuperer(x))).length;
  // la vue de repli ne les propose plus ; le prochain calcul relit tout (XP, possessions, fait aujourd'hui)
  patcher(user.id, (v) => ({ ...v, aRecuperer: v.aRecuperer.filter((x) => !prises.has(cleRecuperer(x))) }));
  MEMO.delete(user.id);
  await oublierPanneau(user.id);
  return { ok: true, recues, xp, restant, sobre: vue.sobre };
}

/** Marque des fanfares comme jouées ; la vue gardée est corrigée sur place (pas de recalcul). */
export async function marquerVus(userId: string, quetes: string[]): Promise<boolean> {
  const a = admin();
  if (!a || !quetes.length) return false;
  try {
    const { error } = await a.rpc("codex_vus", { p_user: userId, p_quetes: quetes.slice(0, 100) });
    if (!error) patcher(userId, (v) => vueSansFetes(v, quetes));
    else MEMO.delete(userId);
    // l'instantané du panneau annoncerait encore ces récompenses
    if (!error) await oublierPanneau(userId);
    return !error;
  } catch {
    return false;
  }
}

/** « Léonard a feuilleté ton carnet » a été joué. */
export async function marquerRetroVue(userId: string): Promise<boolean> {
  const a = admin();
  if (!a) return false;
  try {
    const { error } = await a.rpc("codex_retro_vue", { p_user: userId });
    if (!error) patcher(userId, (v) => ({ ...v, retro: null }));
    else MEMO.delete(userId);
    return !error;
  } catch {
    return false;
  }
}

/** Oublie le calcul en mémoire d'un joueur (après une séance). */
export const oublierCodex = (userId: string) => MEMO.delete(userId);
