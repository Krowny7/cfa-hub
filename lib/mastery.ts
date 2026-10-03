// Maîtrise par matière du programme CFA Niveau I, calculée côté serveur.
// Une matière n'est comptée qu'à partir de sessions mono-thème (une session
// à plusieurs thèmes ne dit pas lequel a fait chuter le score) et d'un
// minimum de questions, pour ne pas juger sur un seul essai malchanceux.
// La maîtrise du programme est la moyenne des 10 matières, celles jamais
// travaillées comptant pour 0 : elle mesure la connaissance de TOUT le
// programme (c'est elle qui verrouille les paliers du haut, voir lib/ranks.ts).
// Module neutre (pas de "use client") : à appeler depuis des composants serveur.
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOPICS } from "@/lib/practiceTopics";

export const MIN_QUESTIONS_FOR_SIGNAL = 5;

export type TopicMastery = { key: string; label: string; pct: number | null; answered: number };

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

/** Maîtrise d'un utilisateur, matière par matière (pct null = pas assez de questions). */
export async function getTopicMastery(supabase: SupabaseClient, userId: string): Promise<TopicMastery[]> {
  let rows: ResultRow[] = [];
  try {
    const { data } = await supabase.from("practice_session_results").select("topics,score,total").eq("user_id", userId).limit(500);
    rows = (data as ResultRow[] | null) ?? [];
  } catch {
    rows = [];
  }
  const agg = aggregate(rows);
  return TOPICS.map((t) => {
    const a = agg.get(t.key);
    const pct = a && a.total >= MIN_QUESTIONS_FOR_SIGNAL ? Math.round((a.correct / a.total) * 100) : null;
    return { key: t.key, label: t.label, pct, answered: a?.total ?? 0 };
  });
}

/** Maîtrise du programme : moyenne des matières, celles non travaillées comptant 0. */
export function programMastery(topics: TopicMastery[]) {
  if (!topics.length) return 0;
  return Math.round(topics.reduce((s, t) => s + (t.pct ?? 0), 0) / topics.length);
}

/**
 * Moyenne des joueurs, matière par matière (pour les radars « toi contre la
 * moyenne »). À appeler avec le client admin (service role) : il faut lire
 * les résultats de tous les utilisateurs. Seuls les joueurs ayant assez de
 * questions dans une matière entrent dans sa moyenne.
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
