import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ELO, eloDelta, eloStakes, kFactor } from "@/lib/ranks";

// Duels : types partagés et appels aux RPC de migration_duels_elo.sql.
// Module neutre (pas de "use client") : utilisable avec le client Supabase
// serveur comme avec le client navigateur. La correction et l'ELO sont
// entièrement côté serveur : rien ici ne voit la bonne réponse avant la fin
// du duel. Tant que la migration n'est pas appliquée, les lectures renvoient
// des valeurs vides et duelsReady() renvoie false.

export const DUEL_QUESTIONS = 30;
export const DUEL_MINUTES = 45;
export const DUEL_WINDOW_HOURS = 48;

/** Noms courts des matières (clés de lib/practiceTopics.ts), comme sur les maquettes. */
export const DUEL_TOPIC_LABELS: Record<string, string> = {
  ethics: "Ethics",
  quant: "Quant",
  economics: "Economics",
  fsa: "FSA",
  corporate: "Corporate Issuers",
  equity: "Equity",
  fixed_income: "Fixed Income",
  derivatives: "Derivatives",
  alternatives: "Alternatives",
  portfolio: "Portfolio",
};

export function duelTopicLabel(key: string | null | undefined) {
  if (!key) return "Autre";
  return DUEL_TOPIC_LABELS[key] ?? key;
}

export type DuelStatus = "pending" | "active" | "finished" | "declined" | "expired";
export type DuelMode = "random" | "challenge";

/** Joueur proposé dans le lobby (suggestion ou recherche). */
export type DuelPlayerCard = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  lastActiveAt: string | null;
};

/** Un joueur dans un duel. score/seconds/delta/eloBefore : seulement une fois le duel terminé. */
export type DuelPlayerState = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  elo: number;
  gamesPlayed: number;
  startedAt: string | null;
  finishedAt: string | null;
  answered: number;
  score: number | null;
  seconds: number | null;
  delta: number | null;
  eloBefore: number | null;
};

export type DuelState = {
  id: string;
  status: DuelStatus;
  mode: DuelMode;
  questionCount: number;
  timeLimitSeconds: number;
  createdAt: string;
  acceptedAt: string | null;
  expiresAt: string;
  finishedAt: string | null;
  serverNow: string;
  winnerId: string | null;
  rematchOf: string | null;
  iAmChallenger: boolean;
  me: DuelPlayerState;
  them: DuelPlayerState | null;
};

/** Question telle que le joueur la reçoit : jamais de bonne réponse. */
export type DuelQuestion = {
  position: number;
  id: string;
  prompt: string;
  choices: string[];
  topic: string | null;
};

export type DuelStart =
  | { finished: true; status: DuelStatus }
  | {
      finished: false;
      status: DuelStatus;
      startedAt: string;
      serverNow: string;
      timeLimitSeconds: number;
      questions: DuelQuestion[];
      answers: { position: number; selectedIndex: number | null }[];
    };

export type DuelAnswerResult = {
  ok: boolean;
  answered: number;
  opponentAnswered: number;
  finished: boolean;
  status: DuelStatus;
};

export type DuelReviewItem = {
  position: number;
  questionId: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string | null;
  topic: string | null;
  selectedIndex: number | null;
  isCorrect: boolean;
};

/** Duel en attente ou en cours, vu par le joueur (pour le lobby). */
export type OpenDuel = {
  id: string;
  status: DuelStatus;
  mode: DuelMode;
  /** l'autre joueur a lancé le défi */
  incoming: boolean;
  opponentId: string | null;
  opponentName: string | null;
  opponentElo: number | null;
  expiresAt: string;
  createdAt: string;
  myStarted: boolean;
  myFinished: boolean;
  theirStarted: boolean;
  theirFinished: boolean;
};

// ---------------------------------------------------------------------------
// Conversions (les RPC renvoient du JSON en snake_case)

type Raw = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const num = (v: unknown, d = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
const numOrNull = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

function toPlayerCard(r: Raw): DuelPlayerCard {
  return {
    userId: String(r.user_id),
    username: str(r.username),
    avatarUrl: str(r.avatar_url),
    elo: num(r.elo, DEFAULT_ELO),
    gamesPlayed: num(r.games_played),
    lastActiveAt: str(r.last_active_at),
  };
}

function toPlayerState(r: Raw): DuelPlayerState {
  return {
    id: String(r.id),
    username: str(r.username),
    avatarUrl: str(r.avatar_url),
    elo: num(r.elo, DEFAULT_ELO),
    gamesPlayed: num(r.games_played),
    startedAt: str(r.started_at),
    finishedAt: str(r.finished_at),
    answered: num(r.answered),
    score: numOrNull(r.score),
    seconds: numOrNull(r.seconds),
    delta: numOrNull(r.delta),
    eloBefore: numOrNull(r.elo_before),
  };
}

function toState(r: Raw): DuelState {
  return {
    id: String(r.id),
    status: r.status as DuelStatus,
    mode: (r.mode as DuelMode) ?? "challenge",
    questionCount: num(r.question_count, DUEL_QUESTIONS),
    timeLimitSeconds: num(r.time_limit_seconds, DUEL_MINUTES * 60),
    createdAt: String(r.created_at),
    acceptedAt: str(r.accepted_at),
    expiresAt: String(r.expires_at),
    finishedAt: str(r.finished_at),
    serverNow: String(r.server_now ?? new Date().toISOString()),
    winnerId: str(r.winner_id),
    rematchOf: str(r.rematch_of),
    iAmChallenger: Boolean(r.i_am_challenger),
    me: toPlayerState((r.me ?? {}) as Raw),
    them: r.them ? toPlayerState(r.them as Raw) : null,
  };
}

function toQuestion(r: Raw): DuelQuestion {
  return {
    position: num(r.position),
    id: String(r.id),
    prompt: String(r.prompt ?? ""),
    choices: Array.isArray(r.choices) ? (r.choices as unknown[]).map((c) => String(c)) : [],
    topic: str(r.topic),
  };
}

function rpcError(error: { message?: string } | null): Error {
  return new Error(error?.message || "Erreur");
}

// ---------------------------------------------------------------------------
// Lectures (ne lèvent jamais d'exception)

/** La migration des duels est-elle appliquée ? */
export async function duelsReady(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await supabase.from("duels").select("id", { count: "exact", head: true }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Règle les duels du joueur arrivés à échéance (chrono, 48 h). */
export async function refreshMyDuels(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.rpc("duel_refresh_mine");
  } catch {
    // migration absente : rien à régler
  }
}

/** État d'un duel (null si introuvable, pas à toi, ou migration absente). */
export async function getDuelState(supabase: SupabaseClient, duelId: string): Promise<DuelState | null> {
  try {
    const { data, error } = await supabase.rpc("duel_state", { p_duel_id: duelId });
    if (error || !data) return null;
    return toState(data as Raw);
  } catch {
    return null;
  }
}

export async function getDuelSuggestions(supabase: SupabaseClient, limit = 6): Promise<DuelPlayerCard[]> {
  try {
    const { data, error } = await supabase.rpc("duel_suggestions", { p_limit: limit });
    if (error || !Array.isArray(data)) return [];
    return (data as Raw[]).map(toPlayerCard);
  } catch {
    return [];
  }
}

export async function searchDuelPlayers(supabase: SupabaseClient, query: string): Promise<DuelPlayerCard[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const { data, error } = await supabase.rpc("duel_search_players", { p_query: q });
    if (error || !Array.isArray(data)) return [];
    return (data as Raw[]).map(toPlayerCard);
  } catch {
    return [];
  }
}

/** Fiche d'un joueur précis (lien /duel?adversaire=<id>), via les tables publiques. */
export async function getPlayerCard(supabase: SupabaseClient, userId: string): Promise<DuelPlayerCard | null> {
  try {
    const [{ data: prof }, { data: rating }] = await Promise.all([
      supabase.from("profiles").select("id,username,avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("ratings").select("elo,games_played").eq("user_id", userId).maybeSingle(),
    ]);
    const p = prof as { id: string; username: string | null; avatar_url: string | null } | null;
    if (!p || !p.username) return null;
    const r = rating as { elo?: number; games_played?: number } | null;
    return {
      userId: p.id,
      username: p.username,
      avatarUrl: p.avatar_url,
      elo: r?.elo ?? DEFAULT_ELO,
      gamesPlayed: r?.games_played ?? 0,
      lastActiveAt: null,
    };
  } catch {
    return null;
  }
}

type OpenRow = {
  id: string;
  status: DuelStatus;
  mode: DuelMode;
  challenger_id: string;
  opponent_id: string | null;
  created_at: string;
  expires_at: string;
  challenger_started_at: string | null;
  challenger_finished_at: string | null;
  opponent_started_at: string | null;
  opponent_finished_at: string | null;
};

/** Duels en attente ou en cours du joueur, les plus urgents d'abord. */
export async function getMyOpenDuels(supabase: SupabaseClient, userId: string): Promise<OpenDuel[]> {
  try {
    const { data, error } = await supabase
      .from("duels")
      .select(
        "id,status,mode,challenger_id,opponent_id,created_at,expires_at,challenger_started_at,challenger_finished_at,opponent_started_at,opponent_finished_at",
      )
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .in("status", ["pending", "active"])
      .order("expires_at", { ascending: true })
      .limit(20);
    if (error || !data) return [];
    const rows = data as OpenRow[];
    const others = Array.from(
      new Set(rows.map((d) => (d.challenger_id === userId ? d.opponent_id : d.challenger_id)).filter((x): x is string => !!x)),
    );
    const names = new Map<string, string | null>();
    const elos = new Map<string, number>();
    if (others.length) {
      const [{ data: profs }, { data: ratings }] = await Promise.all([
        supabase.from("profiles").select("id,username").in("id", others),
        supabase.from("ratings").select("user_id,elo").in("user_id", others),
      ]);
      (profs ?? []).forEach((p: { id: string; username: string | null }) => names.set(p.id, p.username));
      (ratings ?? []).forEach((r: { user_id: string; elo: number }) => elos.set(r.user_id, r.elo));
    }
    return rows.map((d) => {
      const mine = d.challenger_id === userId;
      const other = mine ? d.opponent_id : d.challenger_id;
      return {
        id: d.id,
        status: d.status,
        mode: d.mode,
        incoming: !mine,
        opponentId: other,
        opponentName: other ? names.get(other) ?? null : null,
        opponentElo: other ? elos.get(other) ?? DEFAULT_ELO : null,
        expiresAt: d.expires_at,
        createdAt: d.created_at,
        myStarted: !!(mine ? d.challenger_started_at : d.opponent_started_at),
        myFinished: !!(mine ? d.challenger_finished_at : d.opponent_finished_at),
        theirStarted: !!(mine ? d.opponent_started_at : d.challenger_started_at),
        theirFinished: !!(mine ? d.opponent_finished_at : d.challenger_finished_at),
      };
    });
  } catch {
    return [];
  }
}

/** Correction du joueur, une fois le duel terminé ([] sinon). */
export async function getDuelReview(supabase: SupabaseClient, duelId: string): Promise<DuelReviewItem[]> {
  try {
    const { data, error } = await supabase.rpc("duel_review", { p_duel_id: duelId });
    if (error || !Array.isArray(data)) return [];
    return (data as Raw[]).map((r) => ({
      position: num(r.position),
      questionId: String(r.question_id),
      prompt: String(r.prompt ?? ""),
      choices: Array.isArray(r.choices) ? (r.choices as unknown[]).map((c) => String(c)) : [],
      correctIndex: num(r.correct_index, -1),
      explanation: str(r.explanation),
      topic: str(r.topic),
      selectedIndex: numOrNull(r.selected_index),
      isCorrect: Boolean(r.is_correct),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Actions (lèvent une Error au message lisible en cas d'échec)

export async function createDuel(
  supabase: SupabaseClient,
  opponentId: string | null = null,
  rematchOf: string | null = null,
): Promise<{ id: string; existing: boolean; joined: boolean }> {
  const { data, error } = await supabase.rpc("duel_create", { p_opponent_id: opponentId, p_rematch_of: rematchOf });
  if (error || !data) throw rpcError(error);
  const r = data as Raw;
  return { id: String(r.id), existing: Boolean(r.existing), joined: Boolean(r.joined) };
}

export async function respondDuel(supabase: SupabaseClient, duelId: string, accept: boolean): Promise<DuelStatus> {
  const { data, error } = await supabase.rpc("duel_respond", { p_duel_id: duelId, p_accept: accept });
  if (error || !data) throw rpcError(error);
  return (data as Raw).status as DuelStatus;
}

export async function startDuel(supabase: SupabaseClient, duelId: string): Promise<DuelStart> {
  const { data, error } = await supabase.rpc("duel_start", { p_duel_id: duelId });
  if (error || !data) throw rpcError(error);
  const r = data as Raw;
  if (r.finished) return { finished: true, status: r.status as DuelStatus };
  return {
    finished: false,
    status: r.status as DuelStatus,
    startedAt: String(r.started_at),
    serverNow: String(r.server_now),
    timeLimitSeconds: num(r.time_limit_seconds, DUEL_MINUTES * 60),
    questions: Array.isArray(r.questions) ? (r.questions as Raw[]).map(toQuestion) : [],
    answers: Array.isArray(r.answers)
      ? (r.answers as Raw[]).map((a) => ({ position: num(a.position), selectedIndex: numOrNull(a.selected_index) }))
      : [],
  };
}

export async function answerDuel(supabase: SupabaseClient, duelId: string, position: number, selected: number): Promise<DuelAnswerResult> {
  const { data, error } = await supabase.rpc("duel_answer", { p_duel_id: duelId, p_position: position, p_selected: selected });
  if (error || !data) throw rpcError(error);
  const r = data as Raw;
  return {
    ok: Boolean(r.ok),
    answered: num(r.answered),
    opponentAnswered: num(r.opponent_answered),
    finished: Boolean(r.finished),
    status: r.status as DuelStatus,
  };
}

export async function finishDuel(supabase: SupabaseClient, duelId: string): Promise<DuelStatus> {
  const { data, error } = await supabase.rpc("duel_finish", { p_duel_id: duelId });
  if (error || !data) throw rpcError(error);
  return (data as Raw).status as DuelStatus;
}

/** Message d'erreur affichable : les messages des RPC sont déjà en français. */
export function duelErrorMessage(e: unknown, fallback = "Quelque chose a coincé — réessaie dans un instant.") {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes("not authenticated") || lower.includes("jwt")) return "Session expirée — recharge la page et reconnecte-toi.";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "Erreur réseau — vérifie ta connexion et réessaie.";
  if (lower.includes("could not find the function") || lower.includes("does not exist")) return "Les duels arrivent bientôt.";
  // Messages écrits pour les joueurs dans la migration : en français, finissent par un point.
  if (/[a-zà-ÿ]/i.test(raw) && raw.trim().endsWith(".") && !lower.includes("violates") && !lower.includes("relation")) return raw;
  return fallback;
}

// ---------------------------------------------------------------------------
// Enjeux et libellés

export type Range = { lo: number; hi: number };

/** Enjeu contre un joueur précis : gain, nul, perte (K selon le placement du joueur). */
export function stakesAgainst(myElo: number, myGames: number, theirElo: number) {
  const k = kFactor(myGames);
  const { win, loss } = eloStakes(myElo, theirElo, k);
  return { win, draw: eloDelta(myElo, theirElo, 0.5, k), loss };
}

/** Enjeu d'un duel au hasard : adversaire attendu entre ton ELO −100 et +100. */
export function randomStakes(myElo: number, myGames: number): { win: Range; draw: Range; loss: Range } {
  const weaker = stakesAgainst(myElo, myGames, myElo - 100);
  const stronger = stakesAgainst(myElo, myGames, myElo + 100);
  return {
    win: { lo: weaker.win, hi: stronger.win },
    draw: { lo: weaker.draw, hi: stronger.draw },
    loss: { lo: stronger.loss, hi: weaker.loss },
  };
}

/** Nombre signé avec le vrai signe moins typographique : +18, −14, 0. */
export function signed(n: number) {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

/** « 31:42 » (ou « 1:02:03 »). */
export function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** « en ligne », « il y a 2 h », « il y a 3 j », « pas encore actif ». */
export function activityLabel(lastActiveAt: string | null, nowIso: string) {
  if (!lastActiveAt) return "pas encore actif";
  const diff = (new Date(nowIso).getTime() - new Date(lastActiveAt).getTime()) / 60000;
  if (!Number.isFinite(diff)) return "pas encore actif";
  if (diff < 15) return "en ligne";
  if (diff < 60) return `il y a ${Math.round(diff)} min`;
  if (diff < 60 * 24) return `il y a ${Math.round(diff / 60)} h`;
  if (diff < 60 * 24 * 30) return `il y a ${Math.round(diff / 1440)} j`;
  return "il y a longtemps";
}

/** « 31 h », « 45 min » restantes avant une échéance. */
export function timeLeftLabel(untilIso: string, nowIso: string) {
  const min = (new Date(untilIso).getTime() - new Date(nowIso).getTime()) / 60000;
  if (!Number.isFinite(min) || min <= 0) return "expiré";
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  return `${Math.round(min / 60)} h`;
}
