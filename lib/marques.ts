"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/browser";

// Questions marquées (migration_question_flags.sql) : le joueur marque une
// question qu'il vient de croiser, juste ou fausse, pour revoir la notion
// plus tard (Moi › Marquées). Les marques du joueur sont chargées une fois
// par page et partagées par tous les boutons (magasin de module) ; la
// bascule est immédiate, puis écrite en base.
// Tant que la table manque (migration pas encore collée) ou injoignable,
// les marques sont gardées sur l'appareil ; au premier chargement où la
// table répond, elles rejoignent le compte.

export type SourceMarque = "fiche" | "session" | "defi" | "duel" | "qcm" | "examen";

type Etat = { ids: ReadonlySet<string>; pret: boolean; connecte: boolean; local: boolean };
type MarqueLocale = { question_id: string; source: SourceMarque | null; created_at: string };

const VIDE: Etat = { ids: new Set(), pret: false, connecte: false, local: false };
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

let sb: ReturnType<typeof createClient> | null = null;
const client = () => (sb ??= createClient());
let uid: string | null = null;
let chargement: Promise<void> | null = null;

// Banc d'essai local (sessionStorage) : marques sur l'appareil, sans compte.
const CLE_ESSAI = "rl_marques_essai";
const cleLocale = (u: string) => `rl_marques:${u}`;
function lireLocal(u: string): MarqueLocale[] {
  try {
    const v = JSON.parse(localStorage.getItem(cleLocale(u)) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function ecrireLocal(u: string, liste: MarqueLocale[]) {
  try {
    if (liste.length) localStorage.setItem(cleLocale(u), JSON.stringify(liste));
    else localStorage.removeItem(cleLocale(u));
  } catch {
    // stockage indisponible : la marque ne vit que pendant la page
  }
}
const tableAbsente = (code?: string) => code === "PGRST205" || code === "42P01";

function charger(): Promise<void> {
  if (chargement) return chargement;
  chargement = (async () => {
    let essai = false;
    try {
      essai = sessionStorage.getItem(CLE_ESSAI) === "1";
    } catch {
      // pas de session de navigation
    }
    if (essai) {
      uid = "essai";
      publier({ ids: new Set(lireLocal(uid).map((m) => m.question_id)), pret: true, connecte: true, local: true });
      return;
    }
    const { data: s } = await client().auth.getSession();
    uid = s.session?.user.id ?? null;
    if (!uid) {
      publier({ ...VIDE, pret: true });
      return;
    }
    const locales = lireLocal(uid);
    const { data, error } = await client().from("question_flags").select("question_id");
    if (error) {
      publier({ ids: new Set(locales.map((m) => m.question_id)), pret: true, connecte: true, local: true });
      return;
    }
    const ids = new Set((data ?? []).map((r: { question_id: string }) => r.question_id));
    // les marques gardées sur l'appareil rejoignent le compte (une à une : une
    // question supprimée entre-temps ne bloque pas les autres)
    const restantes: MarqueLocale[] = [];
    for (const m of locales) {
      if (ids.has(m.question_id)) continue;
      const { error: e } = await client()
        .from("question_flags")
        .upsert({ user_id: uid, question_id: m.question_id, source: m.source, created_at: m.created_at }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
      if (e && !/foreign key|23503/i.test(`${e.code} ${e.message}`)) restantes.push(m);
      else if (!e) ids.add(m.question_id);
    }
    ecrireLocal(uid, restantes);
    publier({ ids, pret: true, connecte: true, local: false });
  })().catch(() => publier({ ...etat, pret: true }));
  return chargement;
}

async function basculer(questionId: string, source: SourceMarque) {
  await charger();
  if (!uid || !etat.connecte) return;
  const avait = etat.ids.has(questionId);
  const ids = new Set(etat.ids);
  if (avait) ids.delete(questionId);
  else ids.add(questionId);
  publier({ ...etat, ids });

  const enLocal = () => {
    const liste = lireLocal(uid!).filter((m) => m.question_id !== questionId);
    if (!avait) liste.unshift({ question_id: questionId, source, created_at: new Date().toISOString() });
    ecrireLocal(uid!, liste);
  };
  if (etat.local) return enLocal();

  const { error } = avait
    ? await client().from("question_flags").delete().eq("question_id", questionId)
    : await client().from("question_flags").upsert({ user_id: uid, question_id: questionId, source }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  if (!error) return;
  if (tableAbsente(error.code)) {
    // la table manque : on continue sur l'appareil
    publier({ ...etat, local: true });
    enLocal();
    return;
  }
  // autre échec : la marque revient à son état d'avant
  const retour = new Set(etat.ids);
  if (avait) retour.add(questionId);
  else retour.delete(questionId);
  publier({ ...etat, ids: retour });
}

/** Une question est-elle marquée ? Et de quoi la marquer / démarquer. */
export function useMarque(questionId: string) {
  const e = useSyncExternalStore(abonner, () => etat, () => VIDE);
  useEffect(() => {
    void charger();
  }, []);
  return {
    marquee: e.ids.has(questionId),
    pret: e.pret,
    connecte: e.connecte,
    basculer: (source: SourceMarque) => void basculer(questionId, source),
  };
}

/** Toutes les marques (Moi › Marquées, en repli quand la table manque). */
export function useMarques() {
  const e = useSyncExternalStore(abonner, () => etat, () => VIDE);
  useEffect(() => {
    void charger();
  }, []);
  return e;
}
