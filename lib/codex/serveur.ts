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
  LECTURE_VIDE, actesDuJoueur, budgetDuJour, contexteDestination, demandesActivite, devoiler, evaluer, evaluerObjectifs, indexerLecture, joursAvantExamen, lireActivite, lireMetaCodex, planifier, recommander, remplacantContrat, tirerContrats,
  type ContratTire, type Entree, type LectureSql, type LigneProgression, type Resultat,
} from "@/lib/codex/moteur";
import { VUE_INDISPONIBLE, construireVue, vueSansFetes, type VueCodex } from "@/lib/codex/vue";
import { panneauAGarder, panneauDe, panneauDuCache, type Panneau } from "@/lib/codex/panneau";
import { CAPACITES_TOUTES, MESURES_V3_VIDES, avecMesuresV3, mesuresV3De, mesuresV3DeLecture, type MesuresV3 } from "@/lib/codex/mesures-v3";
import { COLONNES_JOUEUR, COLONNES_V3, ecarter, reglageDe, type ReglageJour } from "@/lib/codex/reglage";
import { catalogueComplet, lireProgrammesJoueur, programmeActif, suiteDe, type DefinitionProgramme, type ProgrammeJoueur } from "@/lib/codex/programmes";
import { maitriseDuCodex } from "@/lib/codex/cap";
import { COLONNES_SEANCE, SONDES_SEANCE, aRecomposer, composerSeance, ecartesSeance, faitsDeSeance, instantaneSeance, lireSeanceGardee, revoirCodexDe, versStockage, type SeanceGardee, type VueSeance } from "@/lib/codex/seance";
import type { Budget, Capacites, Emplacement } from "@/lib/codex/types";

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

/** codex_lire : les compteurs, les mesures, les spéciaux ; et « v3 » (les mesures v3, brutes) quand la §5 est collée. */
async function lire(a: SupabaseClient, id: string, demandes: unknown[], jour: string): Promise<(LectureSql & { v3?: unknown }) | null> {
  try {
    const { data, error } = await a.rpc("codex_lire", { p_user: id, p_demandes: demandes, p_jour: jour });
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
    // une autre erreur (réseau) : rien de réglé aujourd'hui, sans basculer sur le compte
    return reglageDe({ ligne: error ? null : (data as Parameters<typeof reglageDe>[0]["ligne"]), absente: !!error && baseAbsente(error) }, user.user_metadata, jour);
  } catch {
    return reglageDe({ ligne: null, absente: true }, user.user_metadata, jour);
  }
}

/** Les programmes du joueur (codex_programmes_joueur, V3 §1.6) ; table absente ou illisible : aucun (CFA I actif). */
async function lireProgrammes(a: SupabaseClient, id: string): Promise<ProgrammeJoueur[]> {
  try {
    const { data, error } = await a.from("codex_programmes_joueur").select("programme,statut,jour_j,mene_le").eq("user_id", id).limit(50);
    return error ? [] : lireProgrammesJoueur(data);
  } catch {
    return [];
  }
}

/**
 * Les mesures v3 et les capacités de la base (codex_mesures_v3, V3 §1.8), lues
 * à part : sans la §5 de migration_codex_v3.sql (codex_lire ne les rend pas),
 * ou si codex_lire ne les a pas rendues. Fonction absente ou en erreur : la
 * base ne sait rien faire de nouveau (CAPACITES_VIDE), les mesures v3 restent
 * inconnues.
 */
async function lireMesuresV3(a: SupabaseClient, id: string, programme: string): Promise<MesuresV3> {
  try {
    const { data, error } = await a.rpc("codex_mesures_v3", { p_user: id, p_programme: programme });
    return error ? MESURES_V3_VIDES : mesuresV3De(data);
  } catch {
    return MESURES_V3_VIDES;
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
 * Le panneau de la barre du haut : le calcul gardé 45 s s'il y en a un ;
 * sinon l'instantané de moins de 10 min, s'il n'est pas marqué ; sinon un
 * calcul complet. Sans la §6 : comme avant (le calcul).
 */
export async function lirePanneau(supabase: SupabaseClient, user: Joueur): Promise<Panneau> {
  const memo = MEMO.get(user.id);
  if (memo && Date.now() - memo.at < MEMO_MS) return panneauDe(memo.vue);
  const a = admin();
  if (a) {
    try {
      const { data, error } = await a.from("codex_vue_cache").select("jour,panneau,calcule_le,a_recalculer").eq("user_id", user.id).maybeSingle();
      const p = error ? null : panneauDuCache(data, jourParis(), Date.now());
      if (p) return p;
    } catch {
      // sans la §6 : le calcul
    }
  }
  return panneauDe(await lireCodex(supabase, user));
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
    const [joueurR, reglage, lignes, contratsParJour, dateExamen, pf, programmes, seanceLue] = await Promise.all([
      a.from("codex_joueur").select(COLONNES_JOUEUR).eq("user_id", user.id).maybeSingle(),
      lireReglage(a, user, jour),
      lireLignes(a, user.id),
      lireContrats(a, user.id, [jour, hier]),
      dateExamenDe(a, user.id),
      pointsFaibles(supabase),
      lireProgrammes(a, user.id),
      lireSeance(a, user.id, jour),
    ]);
    // le programme actif (sans ligne : CFA I) ; son jour J, sinon celui du profil (le repli d'avant la v3)
    const actif = programmeActif(programmes);
    const ligneActive = programmes.find((p) => p.programme === actif.cle && p.statut === "actif");
    const jourJ = actif.examen ? (ligneActive?.jourJ ?? dateExamen) : null;
    // les mesures v3 et les capacités : rendues par codex_lire quand la §5 est collée (journal 3 au dernier
    // calcul : une seule lecture des réponses, V3 §12.3bis) ; sinon lues à part, pendant le tirage des contrats
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
    };
    // la séance du jour déjà proposée (en base ; sans la §6, celle de cette instance) : les objectifs de
    // ses blocs et les sondes du jour (5 et 30 rendus) partent avec les compteurs des quêtes
    const seancePrecedente = seanceLue.absente ? seanceEnMemoire(user.id, jour) : seanceLue.gardee;
    entree.seance = { objectifs: [...SONDES_SEANCE, ...(seancePrecedente?.blocs ?? []).map((b) => b.objectif)], lanceeLe: seancePrecedente?.lanceeLe ?? null };

    // les contrats du jour : tirés une fois (la base garde le premier tirage)
    if (entree.contrats.length < 3) {
      const mesures = await lire(a, user.id, demandesActivite(contenu, jour), jour);
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
    const v3Lu = v3Apart ? await v3Apart : null;
    entree.capacites = v3Lu?.capacites ?? CAPACITES_TOUTES;
    // les compteurs de toutes les quêtes, en un seul appel
    const demandes = planifier(entree);
    const lu = await lire(a, user.id, demandes, jour);
    if (!lu) {
      await consigner(a, user.id, "", "codex_lire a échoué");
      return repli(user.id, jour);
    }
    const { v3: v3Brut, ...lecture } = lu;
    // codex_lire sans « v3 » (§5 pas collée, ou mesures en panne, consignée) : l'appel à part
    const v3 = v3Lu ?? mesuresV3DeLecture(v3Brut, actif.cle) ?? (await lireMesuresV3(a, user.id, actif.cle));
    entree.capacites = v3.capacites;
    entree.lecture = { ...lecture, mesures: avecMesuresV3(lecture.mesures, v3) };
    const compteurs = indexerLecture(demandes, entree.lecture);
    // les blocs faits de la séance gardée, lus sur les mêmes compteurs ; lancée et tenue, elle verse le bonus du trio
    const seanceLus = faitsDeSeance(seancePrecedente, evaluerObjectifs(entree, compteurs, entree.seance.objectifs));
    entree.seance = { ...entree.seance, tenue: seanceLus.tenue };
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
      const titres = new Map(resultat.etats.map((s) => [s.quete.id, s.quete.titre]));
      for (const x of actesDuJoueur(entree)) titres.set(`acte:${x.id}`, x.titre);
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
    const devoile = devoiler(meta, { inscritLe: lecture.mesures.inscrit_le ?? user.created_at ?? null, questions, faites, now, jour });

    const reco = recommander(entree, resultat);
    const changementFait = entree.contrats.some((c) => c.change);
    const construite = construireVue(entree, resultat, reco, { devoile, nouvelles, retro, changementFait, joueur: user.id });
    const seance = await seanceDuJour(a, user, { entree, resultat, vue: construite, lus: seanceLus, actif, lue: seanceLue, precedente: seancePrecedente });
    const vue: VueCodex = { ...construite, seance };
    MEMO.set(user.id, { at: Date.now(), vue });
    DERNIER.set(user.id, vue);
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
  const vue = !opts.force && memo && Date.now() - memo.at < MEMO_MS ? { ...memo.vue, nouvelles: [] } : (await calculUnique(supabase, user, !!opts.force)).vue;
  if (opts.persister && vue.devoile?.change) await persisterDevoile(supabase, user.id, vue);
  return vue;
}

/** La récompense d'une quête telle qu'elle est écrite (codex_progression), sans recalcul ; null : pas encore versée. */
export async function recompenseEcrite(userId: string, queteId: string, periode: string): Promise<{ xp: number; vu: boolean } | null | "indisponible"> {
  const a = admin();
  if (!a) return "indisponible";
  try {
    const { data, error } = await a.from("codex_progression").select("etat,xp,vu").eq("user_id", userId).eq("quete_id", queteId).eq("periode", periode).maybeSingle();
    if (error) return "indisponible";
    const l = data as { etat: string; xp: number | string; vu: boolean } | null;
    return l && (l.etat === "recompensee" || l.etat === "terminee") ? { xp: Number(l.xp) || 0, vu: !!l.vu } : null;
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
    const act = await lire(a, user.id, demandesActivite(entree.contenu ?? contenuDuProgramme(), entree.jour), entree.jour);
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
