"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/browser";

// Questions marquées (migration_question_flags.sql) : le joueur marque une
// question qu'il vient de croiser, juste ou fausse, pour revoir la notion
// plus tard (Moi › Marquées). Flashcards marquées (migration_flashcard_flags.sql) :
// de même pour une carte révisée, à retrouver dans Moi › Marquées et à
// réviser à part (/flashcards/marquees).
// Un magasin par sorte de marque (creerMagasin : sa table, sa colonne, sa clé
// sur l'appareil) : les marques du joueur sont chargées une fois par page et
// partagées par tous les boutons (magasin de module) ; la bascule est
// immédiate, puis écrite en base. Les listes de marquées demandent une
// relecture (frais) : à leur ouverture et au retour sur l'onglet, pour une
// marque posée ou retirée ailleurs (autre onglet, autre appareil) depuis.
// Tant que la table manque (migration pas encore collée) ou injoignable,
// les marques sont gardées sur l'appareil ; au premier chargement où la
// table répond, elles rejoignent le compte (`rejointes` les compte, pour
// rafraîchir une page rendue avant : SynchroMarquesCartes).

export type SourceMarque = "fiche" | "session" | "defi" | "eclair" | "duel" | "qcm" | "examen" | "atelier";
/** Où une flashcard a été marquée : la révision d'un paquet, d'une matière, des marquées, ou la liste « Le set ». */
export type SourceMarqueCarte = "paquet" | "matiere" | "marquees" | "liste";

type Etat = {
  ids: ReadonlySet<string>;
  pret: boolean;
  connecte: boolean;
  local: boolean;
  /** marques gardées sur l'appareil qui ont rejoint le compte depuis l'ouverture du site (cumul) */
  rejointes: number;
};
/** Une marque gardée sur l'appareil (écrite { question_id | card_id, source, created_at }). */
type MarqueLocale = { id: string; source: string | null; created_at: string };

const VIDE: Etat = { ids: new Set(), pret: false, connecte: false, local: false, rejointes: 0 };
const lireVide = () => VIDE;

let sb: ReturnType<typeof createClient> | null = null;
const client = () => (sb ??= createClient());

// Banc d'essai local (sessionStorage) : marques sur l'appareil, sans compte.
const CLE_ESSAI = "rl_marques_essai";
const tableAbsente = (code?: string) => code === "PGRST205" || code === "42P01";

/**
 * Un magasin de marques : la table (question_flags), sa colonne d'id
 * (question_id) et le préfixe de la clé des marques gardées sur l'appareil
 * (« rl_marques » → rl_marques:<uid>).
 */
function creerMagasin<S extends string>(table: string, colonne: string, prefixeLocal: string) {
  let etat: Etat = VIDE;
  const abonnes = new Set<() => void>();
  const publier = (e: Etat) => {
    etat = e;
    abonnes.forEach((f) => f());
  };
  const abonner = (f: () => void) => {
    abonnes.add(f);
    return () => abonnes.delete(f);
  };
  const lire = () => etat;

  let uid: string | null = null;
  let chargement: Promise<void> | null = null;
  /** le dernier chargement est fini (une relecture peut partir) */
  let charge = false;
  /** bascules pas encore écrites en base : une relecture attend qu'elles aient abouti */
  let enVol = 0;
  let relireEnsuite = false;
  /** marques de l'appareil passées sur le compte (cumul, voir Etat.rejointes) */
  let rejointes = 0;

  const cleLocale = (u: string) => `${prefixeLocal}:${u}`;
  function lireLocal(u: string): MarqueLocale[] {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(cleLocale(u)) ?? "[]");
      if (!Array.isArray(v)) return [];
      return v
        .filter((m): m is Record<string, unknown> => !!m && typeof m === "object" && typeof (m as Record<string, unknown>)[colonne] === "string")
        .map((m) => ({
          id: m[colonne] as string,
          source: typeof m.source === "string" ? m.source : null,
          created_at: typeof m.created_at === "string" ? m.created_at : new Date().toISOString(),
        }));
    } catch {
      return [];
    }
  }
  function ecrireLocal(u: string, liste: MarqueLocale[]) {
    try {
      if (liste.length) localStorage.setItem(cleLocale(u), JSON.stringify(liste.map((m) => ({ [colonne]: m.id, source: m.source, created_at: m.created_at }))));
      else localStorage.removeItem(cleLocale(u));
    } catch {
      // stockage indisponible : la marque ne vit que pendant la page
    }
  }

  /** Lit les marques (une fois par page) ; `relecture` : la base remplace l'état connu. */
  function charger(relecture = false): Promise<void> {
    if (chargement) return chargement;
    charge = false;
    chargement = (async () => {
      let essai = false;
      try {
        essai = sessionStorage.getItem(CLE_ESSAI) === "1";
      } catch {
        // pas de session de navigation
      }
      if (essai) {
        uid = "essai";
        publier({ ids: new Set(lireLocal(uid).map((m) => m.id)), pret: true, connecte: true, local: true, rejointes });
        return;
      }
      const { data: s } = await client().auth.getSession();
      uid = s.session?.user.id ?? null;
      if (!uid) {
        publier({ ...VIDE, pret: true, rejointes });
        return;
      }
      const locales = lireLocal(uid);
      const { data, error } = await client().from(table).select(colonne);
      if (error) {
        // relecture ratée sans que la table manque (réseau) : on garde ce qu'on sait
        if (relecture && !tableAbsente(error.code)) {
          publier({ ...etat, pret: true });
          return;
        }
        publier({ ids: new Set(locales.map((m) => m.id)), pret: true, connecte: true, local: true, rejointes });
        return;
      }
      const ids = new Set(((data ?? []) as unknown as Record<string, string>[]).map((r) => r[colonne]));
      // les marques gardées sur l'appareil rejoignent le compte (une à une : une
      // question ou une carte supprimée entre-temps ne bloque pas les autres)
      const restantes: MarqueLocale[] = [];
      for (const m of locales) {
        if (ids.has(m.id)) continue;
        const { error: e } = await client()
          .from(table)
          .upsert({ user_id: uid, [colonne]: m.id, source: m.source, created_at: m.created_at }, { onConflict: `user_id,${colonne}`, ignoreDuplicates: true });
        if (e && !/foreign key|23503/i.test(`${e.code} ${e.message}`)) restantes.push(m);
        else if (!e) {
          ids.add(m.id);
          rejointes++;
        }
      }
      ecrireLocal(uid, restantes);
      publier({ ids, pret: true, connecte: true, local: false, rejointes });
    })()
      .catch(() => publier({ ...etat, pret: true }))
      .finally(() => {
        charge = true;
      });
    return chargement;
  }

  /**
   * Relit les marques en base (une liste de marquées qui s'ouvre, l'onglet qui
   * revient au premier plan). Un chargement en cours suffit ; une bascule pas
   * encore écrite est attendue (sinon la base, lue avant elle, l'effacerait de
   * l'écran).
   */
  function recharger(): Promise<void> {
    if (!chargement || !charge) return charger();
    if (enVol > 0) {
      relireEnsuite = true;
      return chargement;
    }
    chargement = null;
    return charger(true);
  }

  async function basculer(id: string, source: S) {
    enVol++;
    try {
      await charger();
      if (!uid || !etat.connecte) return;
      const avait = etat.ids.has(id);
      const ids = new Set(etat.ids);
      if (avait) ids.delete(id);
      else ids.add(id);
      publier({ ...etat, ids });

      const enLocal = () => {
        const liste = lireLocal(uid!).filter((m) => m.id !== id);
        if (!avait) liste.unshift({ id, source, created_at: new Date().toISOString() });
        ecrireLocal(uid!, liste);
      };
      if (etat.local) return enLocal();

      const { error } = avait
        ? await client().from(table).delete().eq(colonne, id)
        : await client().from(table).upsert({ user_id: uid, [colonne]: id, source }, { onConflict: `user_id,${colonne}`, ignoreDuplicates: true });
      if (!error) return;
      if (tableAbsente(error.code)) {
        // la table manque : on continue sur l'appareil
        publier({ ...etat, local: true });
        enLocal();
        return;
      }
      // autre échec : la marque revient à son état d'avant
      const retour = new Set(etat.ids);
      if (avait) retour.add(id);
      else retour.delete(id);
      publier({ ...etat, ids: retour });
    } finally {
      enVol--;
      if (enVol === 0 && relireEnsuite) {
        relireEnsuite = false;
        void recharger();
      }
    }
  }

  /**
   * L'état partagé du magasin (vide au rendu serveur), chargé au montage.
   * `frais` : relu en base au montage et au retour sur l'onglet ; d'ici la fin
   * de la première relecture, l'état se dit « pas prêt » (une carte marquée
   * ailleurs ne passe pas pour retirée le temps de la relire).
   */
  function useEtat(frais = false): Etat {
    const e = useSyncExternalStore(abonner, lire, lireVide);
    const [relu, setRelu] = useState(!frais);
    useEffect(() => {
      if (!frais) {
        void charger();
        return;
      }
      let vivant = true;
      void recharger().then(() => {
        if (vivant) setRelu(true);
      });
      const auPremierPlan = () => {
        if (document.visibilityState === "visible") void recharger();
      };
      document.addEventListener("visibilitychange", auPremierPlan);
      return () => {
        vivant = false;
        document.removeEventListener("visibilitychange", auPremierPlan);
      };
    }, [frais]);
    return useMemo(() => (relu || !e.pret ? e : { ...e, pret: false }), [e, relu]);
  }

  /** Des marques attendent-elles sur l'appareil de ce joueur (lu après le montage seulement) ? */
  const enAttente = (u: string) => lireLocal(u).length > 0;

  return { useEtat, basculer, enAttente };
}

const questions = creerMagasin<SourceMarque>("question_flags", "question_id", "rl_marques");
const cartes = creerMagasin<SourceMarqueCarte>("flashcard_flags", "card_id", "rl_marques_cartes");

/** Une question est-elle marquée ? Et de quoi la marquer / démarquer. */
export function useMarque(questionId: string) {
  const e = questions.useEtat();
  return {
    marquee: e.ids.has(questionId),
    pret: e.pret,
    connecte: e.connecte,
    basculer: (source: SourceMarque) => void questions.basculer(questionId, source),
  };
}

/** Toutes les marques (Moi › Marquées, en repli quand la table manque). */
export function useMarques() {
  return questions.useEtat();
}

/**
 * Une flashcard est-elle marquée ? Et de quoi la marquer / démarquer.
 * `frais` : relue en base à l'ouverture et au retour sur l'onglet (la révision des marquées).
 */
export function useMarqueCarte(cardId: string, opts: { frais?: boolean } = {}) {
  const e = cartes.useEtat(!!opts.frais);
  return {
    marquee: e.ids.has(cardId),
    pret: e.pret,
    connecte: e.connecte,
    basculer: (source: SourceMarqueCarte) => void cartes.basculer(cardId, source),
  };
}

/**
 * Toutes les flashcards marquées (Moi › Marquées : cartes retirées grisées,
 * repli quand la table manque). `frais` : relues en base à l'ouverture et au
 * retour sur l'onglet.
 */
export function useMarquesCartes(opts: { frais?: boolean } = {}) {
  return cartes.useEtat(!!opts.frais);
}

/** Des flashcards marquées attendent-elles sur l'appareil de ce joueur ? À n'appeler qu'après le montage (localStorage). */
export function marquesCartesEnAttente(joueur: string): boolean {
  return cartes.enAttente(joueur);
}
