// Le Codex, côté serveur : lit la base (migration_codex.sql), fait tourner le
// moteur (lib/codex/moteur.ts), écrit la progression et les récompenses, et
// rend la vue de l'écran (lib/codex/vue.ts). Tout passe par le client service
// role (comme les sceaux) : les joueurs n'écrivent rien eux-mêmes.
//
// REPLI : sans la migration (table ou fonction absente), sans clé admin ou au
// moindre souci, on rend VUE_INDISPONIBLE (disponible: false) et le site
// marche comme avant ; rien ne lève. Un calcul est mis en mémoire 45 s par
// joueur (le Codex ne clignote pas, la base n'est pas martelée) ; `force`
// (fin de séance, action du joueur) le contourne.
// Module serveur.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { jourParis } from "@/lib/objectif";
import { decaleJour, lireObjectifMeta } from "@/lib/objectif-calc";
import { visiteVue } from "@/lib/presentation";
import { baseAbsente } from "@/lib/profil/sceaux-base";
import { lireNotionsJoueur, pointsFaiblesLegers } from "@/components/moi/points-faibles-data";
import { ACTES, contenuDuProgramme } from "@/lib/codex/catalogue";
import {
  LECTURE_VIDE, demandesActivite, devoiler, evaluer, indexerLecture, lireActivite, lireMetaCodex, planifier, recommander, remplacantContrat, tirerContrats,
  type ContratTire, type Entree, type LectureSql, type LigneProgression, type Resultat,
} from "@/lib/codex/moteur";
import { VUE_INDISPONIBLE, construireVue, type VueCodex } from "@/lib/codex/vue";
import type { Emplacement } from "@/lib/codex/types";

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

type Retour = { vue: VueCodex; entree: Entree | null; resultat: Resultat | null };

async function lire(a: SupabaseClient, id: string, demandes: unknown[], jour: string): Promise<LectureSql | null> {
  try {
    const { data, error } = await a.rpc("codex_lire", { p_user: id, p_demandes: demandes, p_jour: jour });
    if (error || !data || typeof data !== "object") return null;
    const d = data as Partial<LectureSql>;
    return { compteurs: d.compteurs ?? {}, mesures: d.mesures ?? {}, speciaux: d.speciaux ?? {} };
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

/** Le calcul complet : lit, évalue, écrit les récompenses, bâtit la vue. */
async function calculer(supabase: SupabaseClient, user: Joueur, { persister }: { persister: boolean }): Promise<Retour> {
  const jour = jourParis();
  const now = new Date();
  const a = admin();
  const vide: Retour = { vue: VUE_INDISPONIBLE(jour), entree: null, resultat: null };
  if (!a) return vide;
  try {
    const hier = decaleJour(jour, -1);
    const [joueurR, lignes, contratsParJour, jourJ, pf] = await Promise.all([
      a.from("codex_joueur").select("premier_calcul,dernier_calcul").eq("user_id", user.id).maybeSingle(),
      lireLignes(a, user.id),
      lireContrats(a, user.id, [jour, hier]),
      dateExamenDe(a, user.id),
      pointsFaibles(supabase),
    ]);
    if (lignes === null || (joueurR.error && baseAbsente(joueurR.error))) return vide;
    const joueur = joueurR.data as { premier_calcul: string; dernier_calcul: string } | null;
    const contenu = contenuDuProgramme();
    const entree: Entree = {
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
    };

    // les contrats du jour : tirés une fois (la base garde le premier tirage)
    if (entree.contrats.length < 3) {
      const mesures = await lire(a, user.id, demandesActivite(contenu, jour), jour);
      if (!mesures) return vide;
      entree.activite = lireActivite(contenu, mesures);
      const hierMap = Object.fromEntries((contratsParJour.get(hier) ?? []).map((c) => [c.emplacement, c.modele]));
      const tirage = tirerContrats({ ...entree, lecture: mesures }, user.id, hierMap);
      if (tirage.length) {
        const { data, error } = await a.rpc("codex_contrats_poser", { p_user: user.id, p_jour: jour, p_tirage: tirage });
        if (!error && Array.isArray(data)) entree.contrats = data as ContratTire[];
        else entree.contrats = tirage;
      }
    }

    // les compteurs de toutes les quêtes, en un seul appel
    const demandes = planifier(entree);
    const lecture = await lire(a, user.id, demandes, jour);
    if (!lecture) return vide;
    entree.lecture = lecture;
    const compteurs = indexerLecture(demandes, lecture);
    let resultat = evaluer(entree, compteurs);

    // l'écriture : récompenses uniques, ouvertures, progression
    let nouvelles: VueCodex["nouvelles"] = [];
    let retro: VueCodex["retro"] = null;
    if (resultat.lot.length || entree.premier) {
      const { data, error } = await a.rpc("codex_ecrire", { p_user: user.id, p_lot: resultat.lot, p_budget_retro: resultat.budgetRetro });
      if (error) {
        if (!baseAbsente(error)) console.error("codex_ecrire:", error.message);
        return vide;
      }
      const w = data as { recompenses?: { quete: string; periode: string; xp: number; nominal: number; cosmetique: string | null; titre: string | null; retro: boolean }[]; retro?: VueCodex["retro"] } | null;
      retro = w?.retro ?? null;
      const titres = new Map(resultat.etats.map((s) => [s.quete.id, s.quete.titre]));
      for (const x of ACTES) titres.set(`acte:${x.id}`, x.titre);
      nouvelles = (w?.recompenses ?? []).filter((x) => !x.retro).map((x) => ({ quete: x.quete, periode: x.periode, xp: x.xp, nominal: x.nominal, cosmetique: x.cosmetique, titre: x.titre, titreQuete: titres.get(x.quete) ?? x.quete }));
      // relire les lignes écrites (XP versée, fanfare) et réévaluer sans rappeler la base
      const apres = await lireLignes(a, user.id);
      if (apres) {
        entree.progression = apres;
        entree.premier = false;
        resultat = evaluer(entree, compteurs);
      }
    } else if (!retro) {
      const j = await a.rpc("codex_ecrire", { p_user: user.id, p_lot: [], p_budget_retro: 0 }).then((x) => x, () => null);
      retro = (j?.data as { retro?: VueCodex["retro"] } | null)?.retro ?? null;
    }

    // le dévoilement progressif
    const meta = lireMetaCodex(user.user_metadata);
    const faites = new Set(resultat.etats.filter((s) => s.fait).map((s) => `${s.quete.id}|${s.periode}`));
    const questions = (lecture.mesures.jours ?? []).reduce((s, j) => s + j.n, 0);
    const devoile = devoiler(meta, { inscritLe: lecture.mesures.inscrit_le ?? user.created_at ?? null, questions, faites, now, jour });
    if (persister && devoile.change) {
      try {
        await supabase.auth.updateUser({ data: { rl_codex: { devoile: devoile.devoile, jours: devoile.jours } } });
      } catch {
        // le dévoilement se recalcule à la prochaine visite
      }
    }

    const reco = recommander(entree, resultat);
    const changementFait = entree.contrats.some((c) => c.change);
    const vue = construireVue(entree, resultat, reco, { devoile, nouvelles, retro, changementFait });
    MEMO.set(user.id, { at: Date.now(), vue });
    return { vue, entree, resultat };
  } catch (e) {
    console.error("codex:", e instanceof Error ? e.message : e);
    return vide;
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
  if (!opts.force && memo && Date.now() - memo.at < MEMO_MS) return { ...memo.vue, nouvelles: [] };
  return (await calculer(supabase, user, { persister: !!opts.persister })).vue;
}

/** Les compteurs et la décision d'un changement de contrat (une seule fois par jour). */
export async function changerContrat(supabase: SupabaseClient, user: Joueur, emplacement: Emplacement): Promise<{ ok: true; vue: VueCodex } | { ok: false; raison: "connexion" | "indisponible" | "refus" | "aucun" }> {
  const a = admin();
  if (!a) return { ok: false, raison: "indisponible" };
  const { entree } = await calculer(supabase, user, { persister: false });
  if (!entree) return { ok: false, raison: "indisponible" };
  const actuel = entree.contrats.find((c) => c.emplacement === emplacement);
  if (!actuel) return { ok: false, raison: "aucun" };
  const autre = remplacantContrat(entree, user.id, emplacement, actuel.modele);
  if (!autre) return { ok: false, raison: "aucun" };
  const { error } = await a.rpc("codex_contrat_changer", { p_user: user.id, p_jour: entree.jour, p_emplacement: emplacement, p_modele: autre.modele, p_params: autre.params });
  if (error) return { ok: false, raison: baseAbsente(error) ? "indisponible" : "refus" };
  return { ok: true, vue: (await calculer(supabase, user, { persister: false })).vue };
}

/** Marque des fanfares comme jouées. */
export async function marquerVus(userId: string, quetes: string[]): Promise<boolean> {
  const a = admin();
  if (!a || !quetes.length) return false;
  try {
    const { error } = await a.rpc("codex_vus", { p_user: userId, p_quetes: quetes.slice(0, 100) });
    MEMO.delete(userId);
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
    MEMO.delete(userId);
    return !error;
  } catch {
    return false;
  }
}

/** Oublie le calcul en mémoire d'un joueur (après une séance). */
export const oublierCodex = (userId: string) => MEMO.delete(userId);
