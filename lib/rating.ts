import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ELO } from "@/lib/ranks";

// Lecture de l'ELO, de son historique et des duels — contrat partagé par
// l'accueil, le classement et la page Moi. Toutes les fonctions dégradent
// proprement tant que la migration des duels n'est pas appliquée (tables
// absentes → valeurs par défaut / listes vides), jamais d'exception.
//
// Pour l'instant `ratings` porte le rang du domaine Finance (CFA Niveau I) ;
// `rating_events.domain` prépare les autres domaines.

export type RatingSource = "duel" | "mock_exam" | "placement";

export type RatingEvent = {
  id: string;
  source: RatingSource;
  refId: string | null;
  eloBefore: number;
  eloAfter: number;
  delta: number;
  createdAt: string;
};

export type DuelStatus = "pending" | "active" | "finished" | "declined" | "expired";

export type DuelSummary = {
  id: string;
  status: DuelStatus;
  /** true si c'est l'autre joueur qui a lancé le défi */
  incoming: boolean;
  opponentId: string | null;
  opponentName: string | null;
  opponentAvatar: string | null;
  myScore: number | null;
  theirScore: number | null;
  myDelta: number | null;
  /** null tant que le duel n'est pas terminé (ou en cas d'égalité parfaite) */
  won: boolean | null;
  createdAt: string;
  finishedAt: string | null;
};

export type LeaderboardRow = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  rank: number;
};

export async function getMyRating(supabase: SupabaseClient, userId: string): Promise<{ elo: number; gamesPlayed: number }> {
  try {
    const { data } = await supabase.from("ratings").select("elo,games_played").eq("user_id", userId).maybeSingle();
    const row = data as { elo?: number; games_played?: number } | null;
    return { elo: row?.elo ?? DEFAULT_ELO, gamesPlayed: row?.games_played ?? 0 };
  } catch {
    return { elo: DEFAULT_ELO, gamesPlayed: 0 };
  }
}

/** Historique ELO, du plus ancien au plus récent. */
export async function getRatingHistory(supabase: SupabaseClient, userId: string, limit = 60): Promise<RatingEvent[]> {
  try {
    const { data, error } = await supabase
      .from("rating_events")
      .select("id,source,ref_id,elo_before,elo_after,delta,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>)
      .map((r) => ({
        id: String(r.id),
        source: r.source as RatingSource,
        refId: (r.ref_id as string | null) ?? null,
        eloBefore: Number(r.elo_before),
        eloAfter: Number(r.elo_after),
        delta: Number(r.delta),
        createdAt: String(r.created_at),
      }))
      .reverse();
  } catch {
    return [];
  }
}

type DuelRow = {
  id: string;
  status: DuelStatus;
  challenger_id: string;
  opponent_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  challenger_delta: number | null;
  opponent_delta: number | null;
  winner_id: string | null;
  created_at: string;
  finished_at: string | null;
};

const DUEL_COLS =
  "id,status,challenger_id,opponent_id,challenger_score,opponent_score,challenger_delta,opponent_delta,winner_id,created_at,finished_at";

async function summarize(supabase: SupabaseClient, userId: string, rows: DuelRow[]): Promise<DuelSummary[]> {
  const otherIds = Array.from(
    new Set(rows.map((d) => (d.challenger_id === userId ? d.opponent_id : d.challenger_id)).filter((x): x is string => !!x)),
  );
  const names = new Map<string, { username: string | null; avatar_url: string | null }>();
  if (otherIds.length) {
    const { data } = await supabase.from("profiles").select("id,username,avatar_url").in("id", otherIds);
    (data ?? []).forEach((p: { id: string; username: string | null; avatar_url: string | null }) => names.set(p.id, p));
  }
  return rows.map((d) => {
    const mine = d.challenger_id === userId;
    const other = mine ? d.opponent_id : d.challenger_id;
    const p = other ? names.get(other) : undefined;
    return {
      id: d.id,
      status: d.status,
      incoming: !mine,
      opponentId: other,
      opponentName: p?.username ?? null,
      opponentAvatar: p?.avatar_url ?? null,
      myScore: mine ? d.challenger_score : d.opponent_score,
      theirScore: mine ? d.opponent_score : d.challenger_score,
      myDelta: mine ? d.challenger_delta : d.opponent_delta,
      won: d.status === "finished" && d.winner_id ? d.winner_id === userId : null,
      createdAt: d.created_at,
      finishedAt: d.finished_at,
    };
  });
}

/** Derniers duels terminés du joueur, du plus récent au plus ancien. */
export async function getRecentDuels(supabase: SupabaseClient, userId: string, limit = 5): Promise<DuelSummary[]> {
  try {
    const { data, error } = await supabase
      .from("duels")
      .select(DUEL_COLS)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return summarize(supabase, userId, data as DuelRow[]);
  } catch {
    return [];
  }
}

/** Défis en attente ou en cours (reçus et lancés). */
export async function getOpenChallenges(supabase: SupabaseClient, userId: string): Promise<DuelSummary[]> {
  try {
    const { data, error } = await supabase
      .from("duels")
      .select(DUEL_COLS)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !data) return [];
    return summarize(supabase, userId, data as DuelRow[]);
  } catch {
    return [];
  }
}

/** Classement ELO (domaine Finance), du premier au dernier. */
export async function getLeaderboard(supabase: SupabaseClient, limit = 50): Promise<LeaderboardRow[]> {
  try {
    const { data, error } = await supabase
      .from("ratings")
      .select("user_id,elo,games_played")
      .order("elo", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const rows = data as Array<{ user_id: string; elo: number; games_played: number }>;
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .in("id", rows.map((r) => r.user_id));
    const byId = new Map((profs ?? []).map((p: { id: string; username: string | null; avatar_url: string | null }) => [p.id, p]));
    return rows.map((r, i) => ({
      userId: r.user_id,
      username: byId.get(r.user_id)?.username ?? null,
      avatarUrl: byId.get(r.user_id)?.avatar_url ?? null,
      elo: r.elo,
      gamesPlayed: r.games_played,
      rank: i + 1,
    }));
  } catch {
    return [];
  }
}

/** Place du joueur au classement (1 = premier), null s'il n'a pas de ligne. */
export async function getLeaderboardRank(supabase: SupabaseClient, userId: string): Promise<number | null> {
  try {
    const { elo } = await getMyRating(supabase, userId);
    const { data: own } = await supabase.from("ratings").select("user_id").eq("user_id", userId).maybeSingle();
    if (!own) return null;
    const { count, error } = await supabase.from("ratings").select("user_id", { count: "exact", head: true }).gt("elo", elo);
    if (error) return null;
    return (count ?? 0) + 1;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Examens blancs classés (voir migration_duels_elo.sql)

export type MockExamEloResult = {
  applied: boolean;
  /** 'already' | 'not_closed' | 'too_few' | 'not_found' | 'unavailable' */
  reason: string | null;
  participants: number | null;
};

/**
 * Applique l'ELO d'un examen blanc clos (idempotent : sans effet s'il l'a déjà
 * été, ou si l'examen n'est pas encore clos). Ne lève jamais d'exception :
 * migration absente → { applied: false, reason: "unavailable" }.
 */
export async function applyMockExamElo(supabase: SupabaseClient, examId: string): Promise<MockExamEloResult> {
  try {
    const { data, error } = await supabase.rpc("apply_mock_exam_elo", { p_exam_id: examId });
    if (error || !data) return { applied: false, reason: "unavailable", participants: null };
    const r = data as { applied?: boolean; reason?: string | null; participants?: number | null };
    return { applied: Boolean(r.applied), reason: r.reason ?? null, participants: r.participants ?? null };
  } catch {
    return { applied: false, reason: "unavailable", participants: null };
  }
}

/** Variation d'ELO de chaque participant d'un examen blanc ({} tant qu'elle n'est pas appliquée). */
export async function getMockExamEloDeltas(supabase: SupabaseClient, examId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from("rating_events")
      .select("user_id,delta")
      .eq("source", "mock_exam")
      .eq("ref_id", examId);
    if (error || !data) return {};
    const out: Record<string, number> = {};
    for (const r of data as Array<{ user_id: string; delta: number }>) out[r.user_id] = Number(r.delta) || 0;
    return out;
  } catch {
    return {};
  }
}

/** Date d'application de l'ELO d'un examen (null si pas encore, ou migration absente). */
export async function getMockExamEloAppliedAt(supabase: SupabaseClient, examIds: string[]): Promise<Record<string, string>> {
  if (!examIds.length) return {};
  try {
    const { data, error } = await supabase.from("mock_exams").select("id,elo_applied_at").in("id", examIds);
    if (error || !data) return {};
    const out: Record<string, string> = {};
    for (const r of data as Array<{ id: string; elo_applied_at: string | null }>) if (r.elo_applied_at) out[r.id] = r.elo_applied_at;
    return out;
  } catch {
    return {};
  }
}
