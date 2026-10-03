import type { SupabaseClient } from "@supabase/supabase-js";
import { duelTopicLabel } from "@/lib/duels";

// Défi du jour (« Les 30 du jour ») : types partagés et appels aux RPC de
// migration_daily_challenge.sql. Module neutre (pas de "use client") :
// utilisable avec le client Supabase serveur comme avec le client navigateur.
// La correction est entièrement côté serveur : rien ici ne voit la bonne
// réponse avant que le joueur ait rendu sa copie. Tant que la migration
// n'est pas appliquée, getDaily() renvoie { kind: "soon" } et les autres
// lectures des valeurs vides.
//
// Pour les tuiles de l'accueil et de S'entraîner (phase 2) :
//   getTodayDaily(supabase, userId) → TodayDaily (un seul appel RPC, ne lève
//   jamais) : statut ("soon" | "unavailable" | "todo" | "playing" | "done"),
//   score, rang, nombre de joueurs, échéances, lien.

export const DAILY_QUESTIONS = 30;
export const DAILY_MINUTES = 45;
/** La copie d'un jour reste dans la liste « À revoir » pendant 14 jours (la revue, elle, reste ouverte). */
export const DAILY_REVIEW_DAYS = 14;
export const DAILY_HREF = "/defi";

// ---------------------------------------------------------------------------
// Jours (calendrier de Paris, clés « AAAA-MM-JJ »)

const TZ = "Europe/Paris";
const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** Jour calendaire à Paris, « AAAA-MM-JJ ». */
export function parisDay(d: Date = new Date()) {
  return DAY_FMT.format(d);
}

/** « 2026-10-03 » valide ? */
export function isDayKey(s: string | null | undefined): s is string {
  if (!s || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function shiftDay(key: string, days: number) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Nombre de jours entre deux clés (b − a). */
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / 86_400_000);
}

/**
 * long : « samedi 3 octobre » ; short : « sam. 3 oct. » ; day : « 3 octobre ».
 * L'année n'apparaît que si elle diffère de l'année en cours.
 */
export function dayLabel(key: string, style: "long" | "short" | "day" = "long", todayKey = parisDay()) {
  const d = new Date(key + "T12:00:00Z");
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4);
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { weekday: "short", day: "numeric", month: "short" }
      : style === "day"
        ? { day: "numeric", month: "long" }
        : { weekday: "long", day: "numeric", month: "long" };
  if (!sameYear) opts.year = "numeric";
  return d.toLocaleDateString("fr-FR", { ...opts, timeZone: "UTC" });
}

/** Page d'un jour, et sa revue (avec l'ancre d'une question). */
export const dayHref = (key: string) => `${DAILY_HREF}/${key}`;
export const reviewHref = (key: string, position?: number) =>
  `${DAILY_HREF}/${key}?revue=1${position === undefined ? "" : `#q-${position + 1}`}`;

// ---------------------------------------------------------------------------
// Types

/** Ma copie d'un jour. score / total / seconds / rank : seulement une fois rendue. */
export type DailyMe = {
  startedAt: string;
  finishedAt: string | null;
  /** fin du chrono (début + 45 min) */
  deadline: string;
  answered: number;
  score: number | null;
  total: number | null;
  seconds: number | null;
  rank: number | null;
};

export type DailyInfo = {
  day: string;
  today: string;
  isToday: boolean;
  /** false : pas de défi ce jour-là (passé sans joueur, futur, ou banque vide) */
  exists: boolean;
  reason: "future" | "no_bank" | "none" | null;
  questionCount: number;
  timeLimitSeconds: number;
  serverNow: string;
  /** minuit (Paris) à la fin du jour : plus personne ne peut commencer */
  closesAt: string | null;
  /** copies rendues */
  players: number;
  /** copies en cours */
  playing: number;
  topScore: number | null;
  me: DailyMe | null;
};

export type DailyLoad = { kind: "soon" } | { kind: "error" } | { kind: "ok"; info: DailyInfo };

/**
 * todo : à jouer aujourd'hui ; playing : copie en cours ; done : copie rendue ;
 * missed : jour passé sans copie ; unavailable : pas de défi (banque vide…).
 */
export type DailyPhase = "todo" | "playing" | "done" | "missed" | "unavailable";

export function dailyPhase(info: DailyInfo): DailyPhase {
  if (!info.exists) return "unavailable";
  if (info.me?.finishedAt) return "done";
  if (info.me) return "playing";
  return info.isToday ? "todo" : "missed";
}

export type DailyBoardRow = {
  rank: number;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  score: number;
  total: number;
  seconds: number;
  finishedAt: string;
  isMe: boolean;
};

export type DailyBoard = {
  day: string;
  exists: boolean;
  players: number;
  playing: number;
  rows: DailyBoardRow[];
  /** ma ligne, même hors des premiers */
  me: DailyBoardRow | null;
};

/** Question telle que le joueur la reçoit pendant le défi : jamais de bonne réponse. */
export type DailyQuestion = {
  position: number;
  id: string;
  prompt: string;
  choices: string[];
  topic: string | null;
};

export type DailyStart =
  | { finished: true; day: string }
  | {
      finished: false;
      day: string;
      startedAt: string;
      serverNow: string;
      timeLimitSeconds: number;
      deadline: string;
      questions: DailyQuestion[];
      answers: { position: number; selectedIndex: number | null }[];
    };

export type DailyAnswerResult = { ok: boolean; answered: number; finished: boolean };

/** Une question corrigée (mêmes champs que la revue des duels, plus la réussite des joueurs). */
export type DailyReviewItem = {
  position: number;
  questionId: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string | null;
  topic: string | null;
  selectedIndex: number | null;
  isCorrect: boolean;
  /** copies rendues ce jour-là */
  players: number;
  /** joueurs (copies rendues) qui ont trouvé la question */
  successCount: number;
  /** en %, null s'il n'y a pas de joueur */
  successRate: number | null;
};

/** Un jour de l'historique, avec ma copie si j'ai joué. */
export type DailyHistoryEntry = {
  day: string;
  questionCount: number;
  players: number;
  topScore: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  score: number | null;
  total: number | null;
  seconds: number | null;
  rank: number | null;
};

/** Résumé léger du défi du jour, pour les tuiles (accueil, S'entraîner). */
export type TodayDaily = {
  status: "soon" | "unavailable" | "todo" | "playing" | "done";
  day: string;
  href: string;
  players: number;
  playing: number;
  topScore: number | null;
  questionCount: number;
  answered: number;
  score: number | null;
  total: number | null;
  rank: number | null;
  seconds: number | null;
  /** copie en cours : fin du chrono */
  deadline: string | null;
  /** minuit (Paris) */
  closesAt: string | null;
};

// ---------------------------------------------------------------------------
// Conversions (les RPC renvoient du JSON en snake_case)

type Raw = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const num = (v: unknown, d = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
const numOrNull = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const dayKey = (v: unknown) => String(v ?? "").slice(0, 10);

function toMe(r: Raw | null | undefined): DailyMe | null {
  if (!r || !r.started_at) return null;
  return {
    startedAt: String(r.started_at),
    finishedAt: str(r.finished_at),
    deadline: String(r.deadline ?? r.started_at),
    answered: num(r.answered),
    score: numOrNull(r.score),
    total: numOrNull(r.total),
    seconds: numOrNull(r.seconds),
    rank: numOrNull(r.rank),
  };
}

function toInfo(r: Raw): DailyInfo {
  const reason = str(r.reason);
  return {
    day: dayKey(r.day),
    today: dayKey(r.today),
    isToday: Boolean(r.is_today),
    exists: Boolean(r.exists),
    reason: reason === "future" || reason === "no_bank" || reason === "none" ? reason : null,
    questionCount: num(r.question_count, DAILY_QUESTIONS),
    timeLimitSeconds: num(r.time_limit_seconds, DAILY_MINUTES * 60),
    serverNow: String(r.server_now ?? new Date().toISOString()),
    closesAt: str(r.closes_at),
    players: num(r.players),
    playing: num(r.playing),
    topScore: numOrNull(r.top_score),
    me: toMe(r.me as Raw | null),
  };
}

function toBoardRow(r: Raw): DailyBoardRow {
  return {
    rank: num(r.rank, 1),
    userId: String(r.user_id),
    username: str(r.username),
    avatarUrl: str(r.avatar_url),
    score: num(r.score),
    total: num(r.total, DAILY_QUESTIONS),
    seconds: num(r.seconds),
    finishedAt: String(r.finished_at ?? ""),
    isMe: Boolean(r.is_me),
  };
}

function toQuestion(r: Raw): DailyQuestion {
  return {
    position: num(r.position),
    id: String(r.id),
    prompt: String(r.prompt ?? ""),
    choices: Array.isArray(r.choices) ? (r.choices as unknown[]).map((c) => String(c)) : [],
    topic: str(r.topic),
  };
}

/** La RPC n'existe pas encore (migration non appliquée). */
function isMissing(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  if (error.code === "PGRST202" || error.code === "42883" || error.code === "42P01") return true;
  const m = (error.message ?? "").toLowerCase();
  return m.includes("could not find the function") || (m.includes("function") && m.includes("does not exist"));
}

function rpcError(error: { message?: string } | null): Error {
  return new Error(error?.message || "Erreur");
}

// ---------------------------------------------------------------------------
// Lectures (ne lèvent jamais d'exception)

/** Le défi d'un jour (aujourd'hui par défaut ; créé à la première ouverture du jour). */
export async function getDaily(supabase: SupabaseClient, day: string | null = null): Promise<DailyLoad> {
  try {
    const { data, error } = await supabase.rpc("daily_get", { p_day: day });
    if (error) return isMissing(error) ? { kind: "soon" } : { kind: "error" };
    if (!data || typeof data !== "object") return { kind: "error" };
    return { kind: "ok", info: toInfo(data as Raw) };
  } catch {
    return { kind: "error" };
  }
}

/** Classement d'un jour (null si indisponible). */
export async function getDailyBoard(supabase: SupabaseClient, day: string, limit = 100): Promise<DailyBoard | null> {
  try {
    const { data, error } = await supabase.rpc("daily_leaderboard", { p_day: day, p_limit: limit });
    if (error || !data) return null;
    const r = data as Raw;
    return {
      day: dayKey(r.day ?? day),
      exists: Boolean(r.exists),
      players: num(r.players),
      playing: num(r.playing),
      rows: Array.isArray(r.rows) ? (r.rows as Raw[]).map(toBoardRow) : [],
      me: r.me ? toBoardRow(r.me as Raw) : null,
    };
  } catch {
    return null;
  }
}

/** Correction de ma copie, une fois rendue ([] sinon). */
export async function getDailyReview(supabase: SupabaseClient, day: string): Promise<DailyReviewItem[]> {
  try {
    const { data, error } = await supabase.rpc("daily_review", { p_day: day });
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
      players: num(r.players),
      successCount: num(r.success_count),
      successRate: numOrNull(r.success_rate),
    }));
  } catch {
    return [];
  }
}

/** Les derniers défis (aujourd'hui compris), du plus récent au plus ancien. */
export async function getDailyHistory(supabase: SupabaseClient, limit = 30): Promise<DailyHistoryEntry[]> {
  try {
    const { data, error } = await supabase.rpc("daily_history", { p_limit: limit });
    if (error || !Array.isArray(data)) return [];
    return (data as Raw[]).map((r) => ({
      day: dayKey(r.day),
      questionCount: num(r.question_count, DAILY_QUESTIONS),
      players: num(r.players),
      topScore: numOrNull(r.top_score),
      startedAt: str(r.started_at),
      finishedAt: str(r.finished_at),
      score: numOrNull(r.score),
      total: numOrNull(r.total),
      seconds: numOrNull(r.seconds),
      rank: numOrNull(r.rank),
    }));
  } catch {
    return [];
  }
}

/**
 * Résumé du défi du jour pour une tuile : un seul appel, jamais d'exception.
 * `userId` n'est pas transmis (la RPC lit la session) : il sert seulement à
 * ne rien demander pour un visiteur déconnecté.
 */
export async function getTodayDaily(supabase: SupabaseClient, userId: string | null): Promise<TodayDaily> {
  const day = parisDay();
  const empty: TodayDaily = {
    status: "unavailable",
    day,
    href: DAILY_HREF,
    players: 0,
    playing: 0,
    topScore: null,
    questionCount: DAILY_QUESTIONS,
    answered: 0,
    score: null,
    total: null,
    rank: null,
    seconds: null,
    deadline: null,
    closesAt: null,
  };
  if (!userId) return empty;
  const load = await getDaily(supabase, null);
  if (load.kind === "soon") return { ...empty, status: "soon" };
  if (load.kind === "error") return empty;
  const info = load.info;
  const phase = dailyPhase(info);
  return {
    status: phase === "missed" ? "unavailable" : phase,
    day: info.day || day,
    href: DAILY_HREF,
    players: info.players,
    playing: info.playing,
    topScore: info.topScore,
    questionCount: info.questionCount,
    answered: info.me?.answered ?? 0,
    score: info.me?.score ?? null,
    total: info.me?.total ?? null,
    rank: info.me?.rank ?? null,
    seconds: info.me?.seconds ?? null,
    deadline: info.me && !info.me.finishedAt ? info.me.deadline : null,
    closesAt: info.closesAt,
  };
}

// ---------------------------------------------------------------------------
// Actions (lèvent une Error au message lisible en cas d'échec)

export async function startDaily(supabase: SupabaseClient, day: string): Promise<DailyStart> {
  const { data, error } = await supabase.rpc("daily_start", { p_day: day });
  if (error || !data) throw rpcError(error);
  const r = data as Raw;
  if (r.finished) return { finished: true, day: dayKey(r.day ?? day) };
  return {
    finished: false,
    day: dayKey(r.day ?? day),
    startedAt: String(r.started_at),
    serverNow: String(r.server_now),
    timeLimitSeconds: num(r.time_limit_seconds, DAILY_MINUTES * 60),
    deadline: String(r.deadline),
    questions: Array.isArray(r.questions) ? (r.questions as Raw[]).map(toQuestion) : [],
    answers: Array.isArray(r.answers)
      ? (r.answers as Raw[]).map((a) => ({ position: num(a.position), selectedIndex: numOrNull(a.selected_index) }))
      : [],
  };
}

export async function answerDaily(supabase: SupabaseClient, day: string, position: number, selected: number): Promise<DailyAnswerResult> {
  const { data, error } = await supabase.rpc("daily_answer", { p_day: day, p_position: position, p_selected: selected });
  if (error || !data) throw rpcError(error);
  const r = data as Raw;
  return { ok: Boolean(r.ok), answered: num(r.answered), finished: Boolean(r.finished) };
}

export async function finishDaily(supabase: SupabaseClient, day: string): Promise<DailyMe | null> {
  const { data, error } = await supabase.rpc("daily_finish", { p_day: day });
  if (error || !data) throw rpcError(error);
  return toMe((data as Raw).me as Raw | null);
}

/** Message d'erreur affichable : les messages des RPC sont déjà en français. */
export function dailyErrorMessage(e: unknown, fallback = "Quelque chose a coincé — réessaie dans un instant.") {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes("not authenticated") || lower.includes("jwt")) return "Session expirée — recharge la page et reconnecte-toi.";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "Erreur réseau — vérifie ta connexion et réessaie.";
  if (lower.includes("could not find the function") || lower.includes("does not exist")) return "Le défi du jour arrive bientôt.";
  if (/[a-zà-ÿ]/i.test(raw) && raw.trim().endsWith(".") && !lower.includes("violates") && !lower.includes("relation")) return raw;
  return fallback;
}

// ---------------------------------------------------------------------------
// Voix « Le Trait » du défi (à harmoniser avec lib/voice.ts en phase 2)

export const DAILY_VOICE = {
  title: "Les 30 du jour.",
  start: "À toi le trait.",
  handedIn: "Copie rendue.",
  counting: "On compte les traits…",
  boardEmpty: "Personne n'a encore rendu sa copie. Le premier trait est à toi.",
  boardFrozen: "Classement définitif.",
  missed: "Tu n'as pas joué ce jour-là.",
  closed: "Ce défi est clos : celui d'aujourd'hui t'attend.",
  historyEmpty: "Ton historique commence aujourd'hui.",
  soonTitle: "Le défi du jour arrive bientôt.",
  soonText: "Chaque jour, les mêmes 30 questions pour tout le monde, une seule copie, et le classement du jour.",
  unavailable: "Le défi du jour n'est pas disponible pour le moment. Réessaie dans un instant.",
} as const;

/** Verdict d'une copie selon la précision (seuils des fins de session : 70 %). */
export function dailyVerdict(score: number, total: number): string {
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (total > 0 && score >= total) return "Page propre.";
  if (pct >= 85) return "Trait sûr.";
  if (pct >= 70) return "Trait tenu.";
  if (pct >= 50) return "Le trait tremble.";
  return "Premier jet.";
}

/** « 1er », « 2e », « 12e ». */
export function ordinal(n: number) {
  return n === 1 ? "1er" : `${n}e`;
}

/** « 2e sur 12 », « seul en lice ». */
export function rankLine(rank: number | null, players: number) {
  if (rank === null) return null;
  if (players <= 1) return "seul en lice";
  return `${ordinal(rank)} sur ${players}`;
}

/** Fin de la fenêtre « à revoir » : 14 jours après la copie rendue. */
export function reviewUntil(finishedAt: string, days = DAILY_REVIEW_DAYS) {
  return new Date(new Date(finishedAt).getTime() + days * 86_400_000).toISOString();
}

/** « encore 13 j », « encore 5 h » ; null une fois la fenêtre passée. */
export function reviewLeftLabel(finishedAt: string, nowIso: string, days = DAILY_REVIEW_DAYS): string | null {
  const ms = new Date(reviewUntil(finishedAt, days)).getTime() - new Date(nowIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = ms / 3_600_000;
  if (h < 1) return "moins d'1 h";
  if (h < 24) return `encore ${Math.round(h)} h`;
  return `encore ${Math.max(1, Math.round(h / 24))} j`;
}

/** « encore 6 h », « encore 25 min » avant une échéance ; null si passée. */
export function timeLeftLabel(untilIso: string | null, nowIso: string) {
  if (!untilIso) return null;
  const min = (new Date(untilIso).getTime() - new Date(nowIso).getTime()) / 60000;
  if (!Number.isFinite(min) || min <= 0) return null;
  if (min < 60) return `encore ${Math.max(1, Math.round(min))} min`;
  return `encore ${Math.floor(min / 60)} h`;
}

// ---------------------------------------------------------------------------
// « Copier pour l'IA » : même format que l'export des sessions
// (components/session/review.ts, buildAiExportText), avec le contexte du jour.

const AI_LETTERS = ["A", "B", "C", "D", "E"];

export type DailyAiScope = "errors" | "all";

export function buildDailyAiExport(
  review: DailyReviewItem[],
  ctx: { scope: DailyAiScope; day: string; score: number; total: number; rank: number | null; players: number },
) {
  const items = ctx.scope === "errors" ? review.filter((q) => !q.isCorrect) : review;
  const pct = ctx.total > 0 ? Math.round((ctx.score / ctx.total) * 100) : 0;
  const place = ctx.rank !== null && ctx.players > 1 ? `, ${ordinal(ctx.rank)} sur ${ctx.players} joueurs` : "";
  const context = `Défi du jour CFA Niveau I du ${dayLabel(ctx.day, "long", ctx.day)}, ${ctx.total} questions type examen (les mêmes pour tous les joueurs), score ${ctx.score}/${ctx.total}${place}.`;
  const header =
    ctx.scope === "errors"
      ? `DÉFI DU JOUR CFA — MES ERREURS (${items.length} question${items.length > 1 ? "s" : ""}) — ${ctx.score}/${ctx.total} (${pct}%)\n` +
        `Contexte : ${context}\n` +
        `Voici les questions que j'ai ratées au défi du jour CFA Level I. Pour chaque question : mon énoncé, mes choix, ma réponse, la bonne réponse et l'explication officielle. ` +
        `Peux-tu me faire un bilan de mes points faibles par thème, et m'expliquer plus en détail chacune de ces erreurs ?\n\n`
      : `DÉFI DU JOUR CFA — ${ctx.score}/${ctx.total} (${pct}%)\n` +
        `Contexte : ${context}\n` +
        `Voici mes réponses au défi du jour CFA Level I. Pour chaque question : mon énoncé, mes choix, ma réponse, la bonne réponse et l'explication officielle. ` +
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
