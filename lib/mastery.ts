// Maîtrise par matière du programme CFA Niveau I, calculée côté serveur.
// Depuis le Codex v3, c'est la maîtrise unique (lib/maitrise.ts) : toutes
// les réponses du joueur, les 60 plus récentes de chaque matière, un pct dès
// 10 réponses, provisoire jusqu'à 40. Chaque matière garde aussi l'ancienne
// mesure : sessions mono-thème (une session à plusieurs thèmes ne dit pas
// lequel a fait chuter le score) et un minimum de questions, pour ne pas
// juger sur un seul essai malchanceux. C'est elle seule qui verrouille les
// paliers du haut (programMastery, voir lib/ranks.ts) : aucun rang ne bouge,
// et la TopBar, l'accueil, le profil, le classement et la saison montrent le
// même rang (V3 §4.5).
// Module neutre (pas de "use client") : à appeler depuis des composants serveur.
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOPICS } from "@/lib/practiceTopics";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANCIENNE_MIN_QUESTIONS, lireAncienne, lireMaitrise, type Maitrise, type StatutMaitrise } from "@/lib/maitrise";

export const MIN_QUESTIONS_FOR_SIGNAL = ANCIENNE_MIN_QUESTIONS;

export type TopicMastery = {
  key: string;
  label: string;
  /** maîtrise unique dès 10 réponses (provisoire jusqu'à 40) ; null : pas encore mesurée */
  pct: number | null;
  /** réponses comptées dans la matière */
  answered: number;
  statut?: StatutMaitrise;
  /** l'ancienne mesure : le verrou des rangs la lit seule */
  ancienne?: number | null;
  /** la dernière réponse de la matière (ISO) */
  derniere?: string | null;
};

type ResultRow = { user_id?: string; topics: string[] | null; score: number | null; total: number | null };

function aggregate(rows: ResultRow[]) {
  const agg = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    const topics = r.topics ?? [];
    if (topics.length !== 1) continue;
    const a = agg.get(topics[0]) ?? { correct: 0, total: 0 };
    a.correct += r.score ?? 0;
    a.total += r.total ?? 0;
    agg.set(topics[0], a);
  }
  return agg;
}

// La TopBar puis la page lisent la maîtrise à chaque visite : une lecture
// par requête et par joueur (cache de React, indexé par l'id seul : le
// client Supabase change d'identité d'un composant à l'autre), gardée 60 s
// (comme les 45 s du Codex : la base n'est pas martelée).
const MEMO_MS = 60_000;
const MEMO = new Map<string, { at: number; lecture: Promise<Maitrise> }>();
const parRequete = cache((_userId: string): { lecture: Promise<Maitrise> | null } => ({ lecture: null }));

function clientAdmin(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function lireGardee(supabase: SupabaseClient, userId: string): Promise<Maitrise> {
  const now = Date.now();
  const memo = MEMO.get(userId);
  if (memo && now - memo.at < MEMO_MS) return memo.lecture;
  for (const [k, v] of MEMO) if (now - v.at >= MEMO_MS) MEMO.delete(k);
  const lecture = lireMaitrise(clientAdmin(), supabase, userId);
  MEMO.set(userId, { at: now, lecture });
  return lecture;
}

/** La maîtrise complète d'un joueur (préparation, couverture, détail par matière). */
export function getMaitrise(supabase: SupabaseClient, userId: string): Promise<Maitrise> {
  const r = parRequete(userId);
  r.lecture ??= lireGardee(supabase, userId);
  return r.lecture;
}

/** Maîtrise d'un utilisateur, matière par matière (pct null = pas encore mesurée). */
export async function getTopicMastery(supabase: SupabaseClient, userId: string): Promise<TopicMastery[]> {
  const m = await getMaitrise(supabase, userId);
  return m.matieres.map((x) => ({ key: x.cle, label: x.nom, pct: x.pct, answered: x.total, statut: x.statut, ancienne: x.ancienne, derniere: x.derniere }));
}

/** L'ancienne mesure seule (sessions mono-thème, 5 questions au moins), au format d'avant. */
export async function getTopicMasteryAncienne(supabase: SupabaseClient, userId: string): Promise<TopicMastery[]> {
  const mesures = await lireAncienne(supabase, userId);
  return TOPICS.map((t) => {
    const a = mesures.find((x) => x.cle === t.key);
    return { key: t.key, label: t.label, pct: a?.pct ?? null, answered: a?.questions ?? 0, ancienne: a?.pct ?? null };
  });
}

/**
 * Maîtrise du programme, pour le verrou des rangs : moyenne des matières sur
 * l'ancienne mesure, celles non travaillées comptant 0. Une liste lue à
 * l'ancienne, sans le champ `ancienne` (classement), se lit sur pct.
 */
export function programMastery(topics: TopicMastery[]) {
  if (!topics.length) return 0;
  return Math.round(topics.reduce((s, t) => s + ((t.ancienne !== undefined ? t.ancienne : t.pct) ?? 0), 0) / topics.length);
}

/**
 * Moyenne des joueurs, matière par matière (pour les radars « toi contre la
 * moyenne »). À appeler avec le client admin (service role) : il faut lire
 * les résultats de tous les utilisateurs. Seuls les joueurs ayant assez de
 * questions dans une matière entrent dans sa moyenne. Ancienne règle (V3,
 * U1), comme la saison et les pourcentages du classement.
 */
export async function getTopicAverages(admin: SupabaseClient): Promise<Record<string, number | null>> {
  let rows: ResultRow[] = [];
  try {
    const { data } = await admin.from("practice_session_results").select("user_id,topics,score,total").limit(20000);
    rows = (data as ResultRow[] | null) ?? [];
  } catch {
    rows = [];
  }
  const perUser = new Map<string, ResultRow[]>();
  for (const r of rows) {
    if (!r.user_id) continue;
    const list = perUser.get(r.user_id) ?? [];
    list.push(r);
    perUser.set(r.user_id, list);
  }
  const sums = new Map<string, { sum: number; n: number }>();
  for (const list of perUser.values()) {
    for (const [key, a] of aggregate(list)) {
      if (a.total < MIN_QUESTIONS_FOR_SIGNAL) continue;
      const s = sums.get(key) ?? { sum: 0, n: 0 };
      s.sum += (a.correct / a.total) * 100;
      s.n += 1;
      sums.set(key, s);
    }
  }
  return Object.fromEntries(TOPICS.map((t) => [t.key, sums.get(t.key) ? Math.round(sums.get(t.key)!.sum / sums.get(t.key)!.n) : null]));
}
