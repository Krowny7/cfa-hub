"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcQuestion } from "@/lib/calc/index";
import { checkCalcInput, correctionSteps } from "@/lib/calc/engine";
import type { CalcTopic } from "@/lib/calc/types";
import { fonctionAbsente, type ReponseCalc, type ResultatLancer } from "@/lib/atelier-seance";
import { lireSeance, poolCalcul } from "./donnees";

// Actions serveur de l'Atelier (migration_atelier.sql) : lancer (le pool de
// questions vient de la base ; celui des calculs, du code, ajouté avec la
// clé service), et répondre à un calcul (corrigé ici, inscrit au journal des
// calculs avec la session du joueur, puis noté dans l'Atelier avec la clé
// service : le navigateur ne peut pas forger un calcul juste). Les réponses
// aux questions passent directement par atelier_repondre.

function admin() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/** Lance un Atelier sur 1 à 3 notions (ou rend celui en cours). */
export async function lancerAtelier(notions: string[]): Promise<ResultatLancer> {
  const liste = Array.isArray(notions) ? notions.filter((x) => typeof x === "string").slice(0, 3) : [];
  if (!liste.length) return { kind: "vide" };
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { kind: "erreur" };
  const { data, error } = await sb.rpc("atelier_lancer", { p_notions: liste });
  if (error) return fonctionAbsente(error) ? { kind: "indisponible" } : { kind: "erreur" };
  let seance = lireSeance(data);
  if (!seance) return { kind: "vide" };
  // un nouvel Atelier (rien de répondu, pas encore de calcul) : son pool de calcul
  const nouveau = seance.ordre.length === 0 && !seance.items.some((x) => x.k === "calc");
  const cle = nouveau ? admin() : null;
  if (cle) {
    try {
      const { items, avant } = await poolCalcul(sb, seance.notions);
      if (items.length) {
        const r = await cle.rpc("atelier_ajouter_calc", { p_uid: auth.user.id, p_id: seance.id, p_items: items, p_avant: avant });
        if (!r.error) seance = lireSeance(r.data) ?? seance;
      }
    } catch {
      // sans calcul, l'Atelier remplace le bloc par des questions neuves
    }
  }
  return { kind: "ok", seance };
}

/** Répond à un calcul de l'Atelier (premier passage ou re-test). */
export async function repondreCalcAtelier(input: { id: string; i: number; raw: string; retest: boolean; secondes: number }): Promise<ReponseCalc> {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ferme: false, status: "erreur", message: "Connecte-toi pour répondre." };
  const { data: ligne, error } = await sb.from("ateliers").select("pool").eq("id", String(input?.id ?? "")).eq("user_id", auth.user.id).maybeSingle();
  const pool = (ligne?.pool ?? []) as { i: number; k: string; q: string; t: string; m: string }[];
  const it = error ? null : (pool.find((x) => x.i === Number(input?.i)) ?? null);
  if (!it || it.k !== "calc") return { ferme: false, status: "erreur", message: "Ce calcul n'est pas dans ton Atelier." };
  const q = calcQuestion(it.m as CalcTopic, it.t, it.q);
  if (!q) return { ferme: false, status: "erreur", message: "Ce calcul n'existe plus." };
  const r = checkCalcInput(q, String(input.raw ?? "").slice(0, 40));
  if (r === null) return { ferme: false, status: "erreur", message: "Écris un nombre : 8,5 ou 8.5." };
  if (r.status === "format") return { ferme: false, status: "format", indice: r.hint ?? "Vérifie l'unité demandée." };
  const cle = admin();
  if (!cle) return { ferme: false, status: "erreur", message: "La correction n'est pas disponible pour l'instant." };
  const juste = r.status === "juste";
  const noter = await cle.rpc("atelier_noter_calc", {
    p_uid: auth.user.id,
    p_id: input.id,
    p_i: it.i,
    p_ok: juste,
    p_valeur: r.value,
    p_retest: input.retest === true,
    p_secondes: Math.round(Number(input.secondes) || 0),
  });
  if (noter.error) return { ferme: false, status: "erreur", message: "La réponse n'est pas partie. Réessaie." };
  const n = (noter.data ?? {}) as { ferme?: boolean; deja?: boolean; is_correct?: boolean; valeur?: number | null; xp?: number };
  if (n.ferme) return { ferme: true };
  // une réponse déjà donnée reste la réponse ; une nouvelle entre aussi au journal des calculs
  if (!n.deja) {
    try {
      await sb.from("calc_attempts").insert({ topic: it.m, type_key: it.t, question_id: q.id, level: q.level, value: r.value, correct: juste });
    } catch {
      // journal des calculs absent : l'Atelier garde la réponse
    }
  }
  return {
    ferme: false,
    status: (n.deja ? n.is_correct === true : juste) ? "juste" : "faux",
    valeur: n.deja ? (n.valeur ?? null) : r.value,
    bonne: q.answer,
    solution: correctionSteps(q.solution),
    xp: Number(n.xp) || 0,
  };
}
