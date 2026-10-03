// Chargement des données de l'espace Classement (et des profils), côté
// serveur uniquement : certaines lectures passent par le client admin
// (service role) pour agréger les résultats de tous les joueurs. Ne jamais
// importer ce module depuis un composant client. Tout dégrade proprement :
// table absente ou clé admin manquante → valeurs vides, jamais d'exception.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { MIN_QUESTIONS_FOR_SIGNAL, programMastery, type TopicMastery } from "@/lib/mastery";
import { TOPICS } from "@/lib/practiceTopics";
import type { LeaderboardRow } from "@/lib/rating";
import { displayName } from "@/components/classement/format";
import type { BoardRow, NextExam, PastExam } from "@/components/classement/types";

/** Client admin, ou null si la clé de service n'est pas configurée. */
export function tryAdmin(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

type ResultRow = { user_id: string; topics: string[] | null; score: number | null; total: number | null };

/**
 * Maîtrise du programme de plusieurs joueurs (même règle que lib/mastery :
 * sessions mono-thème, minimum de questions, matières non travaillées = 0).
 */
export async function masteryByUser(admin: SupabaseClient | null, userIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!admin || userIds.length === 0) return out;
  try {
    const { data, error } = await admin
      .from("practice_session_results")
      .select("user_id,topics,score,total")
      .in("user_id", userIds)
      .limit(20000);
    if (error || !data) return out;
    const agg = new Map<string, Map<string, { correct: number; total: number }>>();
    for (const r of data as ResultRow[]) {
      const topics = r.topics ?? [];
      if (topics.length !== 1) continue;
      const perUser = agg.get(r.user_id) ?? new Map<string, { correct: number; total: number }>();
      const a = perUser.get(topics[0]) ?? { correct: 0, total: 0 };
      a.correct += r.score ?? 0;
      a.total += r.total ?? 0;
      perUser.set(topics[0], a);
      agg.set(r.user_id, perUser);
    }
    for (const id of userIds) {
      const perUser = agg.get(id);
      const topics: TopicMastery[] = TOPICS.map((t) => {
        const a = perUser?.get(t.key);
        const pct = a && a.total >= MIN_QUESTIONS_FOR_SIGNAL ? Math.round((a.correct / a.total) * 100) : null;
        return { key: t.key, label: t.label, pct, answered: a?.total ?? 0 };
      });
      out.set(id, programMastery(topics));
    }
  } catch {
    // pas de maîtrise : les badges s'affichent sans verrou
  }
  return out;
}

/** Variation d'ELO du dernier match de chaque joueur (table rating_events). */
export async function lastDeltaByUser(admin: SupabaseClient | null, userIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!admin || userIds.length === 0) return out;
  try {
    const { data, error } = await admin
      .from("rating_events")
      .select("user_id,delta,created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error || !data) return out;
    for (const r of data as Array<{ user_id: string; delta: number }>) {
      if (!out.has(r.user_id)) out.set(r.user_id, Number(r.delta) || 0);
    }
  } catch {
    // table pas encore créée
  }
  return out;
}

/** Nombre de joueurs classés (lignes de `ratings`). */
export async function countPlayers(supabase: SupabaseClient): Promise<number | null> {
  try {
    const { count, error } = await supabase.from("ratings").select("user_id", { count: "exact", head: true });
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

/** Lignes de classement enrichies (maîtrise, dernier delta, « toi »). */
export function toBoardRows(
  rows: LeaderboardRow[],
  meId: string,
  mastery: Map<string, number>,
  deltas: Map<string, number>,
): BoardRow[] {
  return rows.map((r) => ({
    userId: r.userId,
    name: displayName(r.username, r.userId),
    avatarUrl: r.avatarUrl,
    elo: r.elo,
    gamesPlayed: r.gamesPlayed,
    rank: r.rank,
    mastery: mastery.has(r.userId) ? (mastery.get(r.userId) as number) : null,
    lastDelta: deltas.has(r.userId) ? (deltas.get(r.userId) as number) : null,
    isMe: r.userId === meId,
  }));
}

type ExamRow = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  question_count: number;
  status: "draft" | "open" | "closed";
  window_days?: number | null;
};

/**
 * Prochain examen blanc classé : le plus proche dont la fenêtre de passage
 * n'est pas terminée, en privilégiant ceux ouverts aux inscriptions.
 */
export async function getNextRankedExam(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string): Promise<NextExam | null> {
  try {
    let rows: ExamRow[] = [];
    const cols = "id,title,scheduled_at,duration_minutes,question_count,status";
    const withWindow = await supabase.from("mock_exams").select(cols + ",window_days").neq("status", "closed").order("scheduled_at", { ascending: true }).limit(20);
    if (!withWindow.error && withWindow.data) rows = withWindow.data as unknown as ExamRow[];
    else {
      // colonne window_days absente (ancienne base) : fenêtre de 3 jours par défaut
      const plain = await supabase.from("mock_exams").select(cols).neq("status", "closed").order("scheduled_at", { ascending: true }).limit(20);
      if (plain.error || !plain.data) return null;
      rows = plain.data as unknown as ExamRow[];
    }
    const now = Date.now();
    const live = rows
      .map((e) => {
        const at = new Date(e.scheduled_at).getTime();
        const win = (e.window_days ?? 3) * 86_400_000;
        return { e, start: at - win, end: at + win };
      })
      .filter((x) => x.end >= now);
    const pick = live.find((x) => x.e.status === "open") ?? live[0];
    if (!pick) return null;
    const exam = pick.e;

    const [{ data: reg }, registrants] = await Promise.all([
      supabase.from("mock_exam_registrations").select("exam_id").eq("exam_id", exam.id).eq("user_id", userId).maybeSingle(),
      (async () => {
        if (!admin) return null;
        try {
          const { count, error } = await admin
            .from("mock_exam_registrations")
            .select("user_id", { count: "exact", head: true })
            .eq("exam_id", exam.id);
          return error ? null : count ?? 0;
        } catch {
          return null;
        }
      })(),
    ]);

    return {
      id: exam.id,
      title: exam.title,
      scheduledAt: exam.scheduled_at,
      durationMinutes: exam.duration_minutes,
      questionCount: exam.question_count,
      status: exam.status,
      registered: Boolean(reg),
      registrants,
      windowOpen: now >= pick.start && now <= pick.end,
      windowEnd: new Date(pick.end).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Examens blancs classés terminés (les plus récents), avec mon score et la
 * variation d'ELO reçue à la clôture. Résultats ou ELO absents → null.
 */
export async function getPastRankedExams(supabase: SupabaseClient, userId: string, limit = 5): Promise<PastExam[]> {
  try {
    const { data, error } = await supabase
      .from("mock_exams")
      .select("id,title,scheduled_at,question_count")
      .eq("status", "closed")
      .order("scheduled_at", { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) return [];
    const exams = data as Array<{ id: string; title: string; scheduled_at: string; question_count: number }>;
    const ids = exams.map((e) => e.id);

    const [results, events] = await Promise.all([
      (async () => {
        try {
          const r = await supabase.from("mock_exam_results").select("exam_id,score,total").eq("user_id", userId).in("exam_id", ids);
          return r.error || !r.data ? [] : (r.data as Array<{ exam_id: string; score: number | null; total: number | null }>);
        } catch {
          return [];
        }
      })(),
      (async () => {
        try {
          const r = await supabase.from("rating_events").select("ref_id,delta").eq("user_id", userId).eq("source", "mock_exam").in("ref_id", ids);
          return r.error || !r.data ? [] : (r.data as Array<{ ref_id: string; delta: number }>);
        } catch {
          return [];
        }
      })(),
    ]);
    const byExam = new Map(results.map((r) => [r.exam_id, r]));
    const deltaByExam = new Map(events.map((e) => [e.ref_id, Number(e.delta) || 0]));

    return exams.map((e) => {
      const r = byExam.get(e.id);
      return {
        id: e.id,
        title: e.title,
        scheduledAt: e.scheduled_at,
        questionCount: e.question_count,
        score: r?.score ?? null,
        total: r?.total ?? null,
        delta: deltaByExam.has(e.id) ? (deltaByExam.get(e.id) as number) : null,
      };
    });
  } catch {
    return [];
  }
}
