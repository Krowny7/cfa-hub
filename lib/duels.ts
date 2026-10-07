import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_ELO, eloDelta, eloStakes, kFactor } from "@/lib/ranks";
import { libellePresence } from "@/lib/presence";

// Duels : types partagés et appels aux RPC de migration_duels_elo.sql.
// Module neutre (pas de "use client") : utilisable avec le client Supabase
// serveur comme avec le client navigateur. La correction et l'ELO sont
// entièrement côté serveur : rien ici ne voit la bonne réponse avant la fin
// du duel. Tant que la migration n'est pas appliquée, les lectures renvoient
// des valeurs vides et duelsReady() renvoie false.

export const DUEL_QUESTIONS = 30;
export const DUEL_MINUTES = 45;
export const DUEL_WINDOW_HOURS = 48;
/** Un duel terminé reste dans la liste « À revoir » pendant 14 jours (la revue, elle, reste ouverte). */
export const DUEL_REVIEW_DAYS = 14;

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
  /**
   * Réponse de l'adversaire (migration_duel_review.sql, duel terminé
   * seulement). Absent tant que la migration n'est pas appliquée, ou pour un
   * duel clos sans adversaire : la revue s'affiche alors sans sa colonne.
   */
  theirAnswered?: boolean;
  theirSelectedIndex?: number | null;
  theirIsCorrect?: boolean;
};

/** Duel terminé, dans la liste « À revoir » du lobby. */
export type DuelReviewEntry = {
  id: string;
  opponentId: string | null;
  opponentName: string | null;
  myScore: number | null;
  theirScore: number | null;
  /** nombre de questions du duel */
  total: number;
  myDelta: number | null;
  /** null : match nul */
  won: boolean | null;
  finishedAt: string;
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

/**
 * Correction du joueur, une fois le duel terminé ([] sinon). Avec
 * migration_duel_review.sql : aussi la réponse de l'adversaire, et la
 * correction d'un duel refusé ou expiré que le joueur a joué.
 */
export async function getDuelReview(supabase: SupabaseClient, duelId: string): Promise<DuelReviewItem[]> {
  try {
    const { data, error } = await supabase.rpc("duel_review", { p_duel_id: duelId });
    if (error || !Array.isArray(data)) return [];
    return (data as Raw[]).map((r) => {
      const item: DuelReviewItem = {
        position: num(r.position),
        questionId: String(r.question_id),
        prompt: String(r.prompt ?? ""),
        choices: Array.isArray(r.choices) ? (r.choices as unknown[]).map((c) => String(c)) : [],
        correctIndex: num(r.correct_index, -1),
        explanation: str(r.explanation),
        topic: str(r.topic),
        selectedIndex: numOrNull(r.selected_index),
        isCorrect: Boolean(r.is_correct),
      };
      // Clé présente et renseignée seulement après la migration, duel terminé
      if (r.their_answered !== undefined && r.their_answered !== null) {
        item.theirAnswered = Boolean(r.their_answered);
        item.theirSelectedIndex = numOrNull(r.their_selected_index);
        item.theirIsCorrect = Boolean(r.their_is_correct);
      }
      return item;
    });
  } catch {
    return [];
  }
}

/** La revue contient-elle les réponses de l'adversaire ? */
export function reviewHasOpponent(review: DuelReviewItem[]) {
  return review.length > 0 && review.some((r) => r.theirAnswered !== undefined);
}

/**
 * Question décisive : les deux copies suivent les mêmes questions dans le
 * même ordre ; on compte l'écart de bonnes réponses question après question.
 * La décisive est celle où le vainqueur au score passe devant pour de bon
 * (un seul des deux a juste, et l'écart ne revient plus à zéro ensuite).
 * null : pas de réponses adverses, ou égalité au score (départagée au temps).
 */
export function decisiveQuestion(review: DuelReviewItem[]): { position: number; forMe: boolean } | null {
  if (!review.some((r) => r.theirAnswered)) return null;
  let diff = 0;
  let take: number | null = null;
  for (const r of [...review].sort((a, b) => a.position - b.position)) {
    const before = Math.sign(diff);
    diff += (r.isCorrect ? 1 : 0) - (r.theirIsCorrect ? 1 : 0);
    const after = Math.sign(diff);
    if (after !== 0 && after !== before) take = r.position;
  }
  if (diff === 0 || take === null) return null;
  return { position: take, forMe: diff > 0 };
}

type ReviewRow = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  challenger_delta: number | null;
  opponent_delta: number | null;
  winner_id: string | null;
  finished_at: string | null;
  question_ids: string[] | null;
};

/**
 * Duels terminés ces `days` derniers jours (14 par défaut), du plus récent au
 * plus ancien : la liste « À revoir ». Au-delà, la revue reste ouverte
 * (rien n'est supprimé), le duel quitte seulement cette liste.
 */
export async function getReviewableDuels(
  supabase: SupabaseClient,
  userId: string,
  { days = DUEL_REVIEW_DAYS, limit = 12 }: { days?: number; limit?: number } = {},
): Promise<DuelReviewEntry[]> {
  try {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("duels")
      .select("id,challenger_id,opponent_id,challenger_score,opponent_score,challenger_delta,opponent_delta,winner_id,finished_at,question_ids")
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "finished")
      .gte("finished_at", since)
      .order("finished_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const rows = data as ReviewRow[];
    const others = Array.from(
      new Set(rows.map((d) => (d.challenger_id === userId ? d.opponent_id : d.challenger_id)).filter((x): x is string => !!x)),
    );
    const names = new Map<string, string | null>();
    if (others.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username").in("id", others);
      (profs ?? []).forEach((p: { id: string; username: string | null }) => names.set(p.id, p.username));
    }
    return rows
      .filter((d) => !!d.finished_at)
      .map((d) => {
        const mine = d.challenger_id === userId;
        const other = mine ? d.opponent_id : d.challenger_id;
        return {
          id: d.id,
          opponentId: other,
          opponentName: other ? names.get(other) ?? null : null,
          myScore: mine ? d.challenger_score : d.opponent_score,
          theirScore: mine ? d.opponent_score : d.challenger_score,
          total: d.question_ids?.length || DUEL_QUESTIONS,
          myDelta: mine ? d.challenger_delta : d.opponent_delta,
          won: d.winner_id ? d.winner_id === userId : null,
          finishedAt: d.finished_at as string,
        };
      });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Revue : fenêtre « à revoir » et export « Copier pour l'IA »

/** Fin de la fenêtre « à revoir » d'un duel terminé. */
export function reviewUntil(finishedAt: string, days = DUEL_REVIEW_DAYS) {
  return new Date(new Date(finishedAt).getTime() + days * 86_400_000).toISOString();
}

/** « encore 13 j », « encore 5 h », « moins d'1 h » ; null une fois la fenêtre passée. */
export function reviewLeftLabel(finishedAt: string, nowIso: string, days = DUEL_REVIEW_DAYS): string | null {
  const ms = new Date(reviewUntil(finishedAt, days)).getTime() - new Date(nowIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = ms / 3_600_000;
  if (h < 1) return "moins d'1 h";
  if (h < 24) return `encore ${Math.round(h)} h`;
  return `encore ${Math.max(1, Math.round(h / 24))} j`;
}

/** Part de la fenêtre « à revoir » restante, de 0 à 1 (barre de temps). */
export function reviewLeftRatio(finishedAt: string, nowIso: string, days = DUEL_REVIEW_DAYS) {
  const ms = new Date(reviewUntil(finishedAt, days)).getTime() - new Date(nowIso).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.min(1, Math.max(0, ms / (days * 86_400_000)));
}

const AI_LETTERS = ["A", "B", "C", "D", "E"];

export type DuelAiScope = "errors" | "all";

/**
 * Texte « Copier pour l'IA » d'un duel : même format que l'export des
 * sessions (PracticeSession, buildAiExportText), avec le contexte du duel.
 * Les questions gardent leur numéro dans le duel (Q7 reste Q7).
 */
export function buildDuelAiExport(
  review: DuelReviewItem[],
  ctx: { scope: DuelAiScope; myScore: number; theirScore: number | null; total: number },
) {
  const items = ctx.scope === "errors" ? review.filter((q) => !q.isCorrect) : review;
  const pct = ctx.total > 0 ? Math.round((ctx.myScore / ctx.total) * 100) : 0;
  const vs = ctx.theirScore === null ? "" : ` contre ${ctx.theirScore}/${ctx.total}`;
  const context = `Duel CFA Niveau I, ${ctx.total} questions, score ${ctx.myScore}/${ctx.total}${vs}${ctx.theirScore === null ? " (duel non disputé)" : ""}.`;
  const header =
    ctx.scope === "errors"
      ? `DUEL CFA — MES ERREURS (${items.length} question${items.length > 1 ? "s" : ""}) — ${ctx.myScore}/${ctx.total} (${pct}%)${vs}\n` +
        `Contexte : ${context}\n` +
        `Voici les questions que j'ai ratées lors d'un duel CFA Level I (questions type examen, les mêmes pour mon adversaire et moi). Pour chaque question : mon énoncé, mes choix, ma réponse, la bonne réponse et l'explication officielle. ` +
        `Peux-tu me faire un bilan de mes points faibles par thème, et m'expliquer plus en détail chacune de ces erreurs ?\n\n`
      : `DUEL CFA — ${ctx.myScore}/${ctx.total} (${pct}%)${vs}\n` +
        `Contexte : ${context}\n` +
        `Voici mes réponses à un duel CFA Level I (questions type examen, les mêmes pour mon adversaire et moi). Pour chaque question : mon énoncé, mes choix, ma réponse, la bonne réponse et l'explication officielle. ` +
        `Peux-tu me faire un bilan de mes points faibles par thème, et m'expliquer plus en détail les questions où je me suis trompé ?\n\n`;
  const body = items
    .map((q) => {
      const letter = (i: number) => AI_LETTERS[i] ?? String(i + 1);
      const choicesText = q.choices.map((c, ci) => `${letter(ci)}) ${c}`).join("\n");
      const myAnswer = q.selectedIndex === null ? "Non répondue" : `${letter(q.selectedIndex)}) ${q.choices[q.selectedIndex] ?? ""}`;
      const correctAnswer = q.correctIndex >= 0 ? `${letter(q.correctIndex)}) ${q.choices[q.correctIndex] ?? ""}` : "Non disponible";
      return (
        `Q${q.position + 1} [${duelTopicLabel(q.topic)}] — ${q.isCorrect ? "CORRECT" : "INCORRECT"}\n` +
        `${q.prompt}\n${choicesText}\n` +
        `Ma réponse : ${myAnswer}\n` +
        `Bonne réponse : ${correctAnswer}\n` +
        (q.explanation ? `Explication : ${q.explanation}\n` : "")
      );
    })
    .join("\n");
  return header + body;
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
  const now = new Date(nowIso).getTime();
  const secondes = (now - new Date(lastActiveAt).getTime()) / 1000;
  if (!Number.isFinite(secondes)) return "pas encore actif";
  // mêmes mots que la présence (lib/presence) : « en ligne », « il y a 3 h », « hier »…
  return libellePresence({ visible: true, secondsAgo: Math.max(0, secondes), at: now }, { court: true, now }) ?? "pas encore actif";
}

/** « 31 h », « 45 min » restantes avant une échéance. */
export function timeLeftLabel(untilIso: string, nowIso: string) {
  const min = (new Date(untilIso).getTime() - new Date(nowIso).getTime()) / 60000;
  if (!Number.isFinite(min) || min <= 0) return "expiré";
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  return `${Math.round(min / 60)} h`;
}
