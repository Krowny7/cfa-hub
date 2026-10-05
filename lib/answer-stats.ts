// Questions répondues, toutes sources confondues : duels, défi du jour,
// examens blancs, examens officiels, QCM, sessions ciblées et fiches. Recoupe les tables où
// chaque parcours enregistre ses réponses, puis range tout par matière (les
// 10 du CFA Niveau I), par thème (reading, page de fiche, session de mock) et
// par passage (un duel, une session, un quiz de page…).
//
// Module neutre (pas de "use client"). Le chargement (`getAnswerStats`) est
// réservé au serveur : il lit des tables protégées avec le client admin
// quand la RLS bloque (duel_answers), toujours filtrées sur UN joueur, et ne
// renvoie que des comptes (jamais une bonne réponse). Les petites fonctions
// de calcul (`tallyOf`, libellés) servent aussi aux composants clients.
//
// Sources et règles :
// - Duels : duel_answers (une ligne par réponse), seulement pour les duels
//   clos (terminés, ou refusés / expirés après avoir joué, ou échus) : les
//   scores restent cachés jusqu'à la fin du duel.
// - Défi du jour : daily_answers (une ligne par réponse ; client admin, pas
//   de policy) et daily_challenges (chrono, ordre des questions), seulement
//   pour les copies rendues ou échues : rien n'est jugé avant la fin d'une
//   copie. Sans la clé admin, les copies rendues comptent au score
//   (daily_attempts), rangées dans « Plusieurs matières ». Tables absentes
//   (migration du défi pas encore appliquée) : la source reste vide.
// - Examens blancs : mock_exam_results.answers (réponse par question, jugée
//   avec la clé côté serveur) ; mock_exam_attempts (reprises) ne gardent que
//   le score, rangé dans « Plusieurs matières ».
// - Examens : les mocks officiels (dossier « Mocks Officiels (Système) »)
//   joués en entier dans /qcm (quiz_attempts, score par passage), et /exam
//   quand il y écrit son résultat.
// - QCM : les autres QCM joués en entier (quiz_attempts) et les sessions
//   chronométrées en mode QCM (practice_sessions).
// - Sessions ciblées : practice_session_results, au détail par question
//   quand les réponses sont gardées, sinon au score (matière unique, ou
//   « Plusieurs matières »).
// - Fiches : quiz_answer_log (une ligne par réponse, rangée par passage).
// Une question passée sans réponse (chrono écoulé) ne compte pas comme
// répondue. Aucune réponse n'est comptée deux fois : chaque parcours écrit
// dans une seule de ces tables.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUBJECTS, parseDrillTitle, subjectByDrillTitle } from "@/components/reviser/catalog";
import { fmtShortDate } from "@/components/classement/format";
import type { Seance } from "@/lib/forme";

// ---------------------------------------------------------------------------
// Types et libellés (partagés avec les composants)
// ---------------------------------------------------------------------------

export const ANSWER_SOURCES = ["duel", "daily", "eclair", "mock", "exam", "qcm", "practice", "calc", "fiche"] as const;
export type AnswerSource = (typeof ANSWER_SOURCES)[number];
export type SourceFilter = AnswerSource | "all";

export const SOURCE_LABELS: Record<AnswerSource, string> = {
  duel: "Duels",
  daily: "Défi du jour",
  eclair: "Séries éclair",
  mock: "Examens blancs",
  exam: "Examens officiels",
  qcm: "QCM",
  practice: "Sessions ciblées",
  calc: "Calculs",
  fiche: "Fiches",
};

/** Où aller jouer chaque source (états vides). */
export const SOURCE_HREFS: Record<AnswerSource, string> = {
  duel: "/duel",
  daily: "/defi",
  eclair: "/eclair",
  mock: "/mock-exams",
  exam: "/official-exams",
  qcm: "/qcm",
  practice: "/practice",
  calc: "/calculs",
  fiche: "/fiches",
};

/** [répondues, justes] */
export type Tally = [number, number];
/** Comptes par source (une source absente = 0). */
export type BySource = Partial<Record<AnswerSource, Tally>>;

export type AnswerPassage = {
  id: string;
  source: AnswerSource;
  /** « Duel contre Paul », « Session ciblée », « Quiz de la page »… */
  label: string;
  /** date ISO du passage (tri) et sa forme courte, calculée côté serveur (« 3 oct. ») */
  at: string;
  date: string;
  href: string | null;
  n: number;
  ok: number;
};

export type AnswerTheme = {
  key: string;
  /** « Bond Valuation & Yield Measures », « Market Efficiency », « Mock A · Session 1 » */
  label: string;
  /** repère court : « R54–R56 » (readings), « p. 3 » (page de fiche), null sinon */
  tag: string | null;
  by: BySource;
  /** les plus récents d'abord (liste bornée, voir `more`) */
  passages: AnswerPassage[];
  /** passages non listés (les plus anciens) */
  more: number;
};

/** Matière du programme, ou regroupement : « mixed » (plusieurs matières, sans détail) et « other » (hors programme). */
export type AnswerSubject = {
  key: string;
  name: string;
  /** code court (FSA, EQ…), vide pour les regroupements */
  code: string;
  pseudo: boolean;
  by: BySource;
  themes: AnswerTheme[];
  /** ses séances (part de chaque passage dans la matière), les plus récentes d'abord : la « forme » (lib/forme) */
  seances?: Seance[];
};

export type AnswerStats = {
  /** false : aucune table lisible (ancienne base, erreur) */
  available: boolean;
  /** sources qu'on n'a pas pu lire (ex. duels sans clé admin) : leurs comptes manquent */
  missing: AnswerSource[];
  /** total par source */
  by: BySource;
  /** les 10 matières dans l'ordre officiel (même vides), puis les regroupements non vides */
  subjects: AnswerSubject[];
  /** toutes les séances, les plus récentes d'abord (le récent global) */
  seances?: Seance[];
};

export const EMPTY_ANSWER_STATS: AnswerStats = { available: false, missing: [], by: {}, subjects: [] };

// ---------------------------------------------------------------------------
// Petits calculs (client et serveur)
// ---------------------------------------------------------------------------

export type TallyView = { n: number; ok: number; pct: number | null };

/** Répondues, justes et précision (%) d'un niveau, pour une source ou toutes. */
export function tallyOf(by: BySource, filter: SourceFilter = "all"): TallyView {
  let n = 0;
  let ok = 0;
  for (const s of ANSWER_SOURCES) {
    if (filter !== "all" && filter !== s) continue;
    const t = by[s];
    if (!t) continue;
    n += t[0];
    ok += t[1];
  }
  return { n, ok, pct: n > 0 ? Math.round((ok / n) * 100) : null };
}

export function addTally(by: BySource, source: AnswerSource, n: number, ok: number) {
  if (n <= 0) return;
  const t = by[source] ?? [0, 0];
  t[0] += n;
  t[1] += ok;
  by[source] = t;
}

/** Version allégée pour un profil public : matières et sources, sans thèmes, passages ni séances. */
export function summarizeAnswerStats(s: AnswerStats): AnswerStats {
  return { ...s, seances: undefined, subjects: s.subjects.map((x) => ({ ...x, themes: [], seances: undefined })) };
}

// ---------------------------------------------------------------------------
// Rattachement d'un set de questions à une matière et à un thème
// ---------------------------------------------------------------------------

const MOCKS_FOLDER = "Mocks Officiels (Système)";

/** Dossier « (Système) » (français ou anglais) → clé de matière. */
const FOLDER_SUBJECT = new Map<string, string>();
for (const s of SUBJECTS) for (const f of s.flashcardFolders) FOLDER_SUBJECT.set(f, s.key);

/** Matière d'après un nom (« Méthodes Quantitatives », « Fixed Income »…). */
function subjectByName(name: string): string | null {
  const n = name.trim();
  if (!n) return null;
  return FOLDER_SUBJECT.get(`${n} (Système)`) ?? SUBJECTS.find((s) => s.name.toLowerCase() === n.toLowerCase())?.key ?? null;
}

type Placement = { subject: string; themeKey: string; label: string; tag: string | null; order: number };

/** Reading de tête d'un repère « R91.1–R91.2 » (ordre des thèmes). */
function readingOrder(tag: string) {
  const m = /R([0-9]+(?:[.][0-9]+)?)/.exec(tag);
  return m ? Number(m[1]) : 900;
}

/**
 * Range un set : matière (dossier, sinon début du titre), thème (reading de
 * la banque, page de fiche, session de mock officiel) et ordre d'affichage.
 */
export function placeSet(setId: string, title: string | null, folder: string | null): Placement {
  const t = (title ?? "").trim();

  if (folder === MOCKS_FOLDER) {
    // « Mock A — Session 1 — Économie[ — Variantes] » / « … — Complet (90 questions) »
    const parts = t.split(" — ");
    const exam = parts.slice(0, 2).join(" · ") || "Mock officiel";
    const rest = parts.slice(2);
    const variants = rest[rest.length - 1] === "Variantes";
    const subject = rest[0] && !rest[0].startsWith("Complet") ? subjectByName(rest[0]) : null;
    const label = `${exam}${variants ? " · variantes" : ""}${subject ? "" : " · complet"}`;
    return { subject: subject ?? "mixed", themeKey: `set:${setId}`, label, tag: null, order: 500 + (variants ? 1 : 0) };
  }

  const qcm = /^(.*) — QCM \(([^)]+)\)$/.exec(t);
  if (qcm) {
    return { subject: (folder && FOLDER_SUBJECT.get(folder)) || subjectByName(t.split(" — ")[0]) || "other", themeKey: `set:${setId}`, label: qcm[1], tag: qcm[2], order: readingOrder(qcm[2]) };
  }

  const drill = subjectByDrillTitle(t);
  if (drill || / — Drill Fiche Page [0-9]/.test(t)) {
    const { page, theme } = parseDrillTitle(t);
    const subject = drill?.key ?? (folder && FOLDER_SUBJECT.get(folder)) ?? "other";
    return { subject, themeKey: `set:${setId}`, label: theme ?? (page !== null ? `Page ${page}` : t), tag: page !== null ? `p. ${page}` : null, order: 1000 + (page ?? 99) };
  }

  const subject = (folder && FOLDER_SUBJECT.get(folder)) || subjectByName(t.split(" — ")[0]) || "other";
  return { subject, themeKey: `set:${setId}`, label: t || "Questions", tag: null, order: 2000 };
}

const SUBJECT_NAMES: Record<string, string> = Object.fromEntries(SUBJECTS.map((s) => [s.key, s.name]));
const TOPIC_NAMES = (keys: string[]) => keys.map((k) => SUBJECTS.find((s) => s.key === k)?.short ?? k);

// ---------------------------------------------------------------------------
// Lecture des tables (serveur)
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE = 1000;
const MAX_ROWS = 50_000;
const IN_CHUNK = 120; // identifiants par requête « in » (URL courte)
const PASSAGES_PER_THEME = 40;
const SEANCES_MAX = 150; // séances gardées par matière pour la forme (récent, bougie)

type Res<T> = { data: T[] | null; error: unknown };

/** Toutes les lignes (pages de 1000) ; null si la table est illisible. */
async function readAll<T>(make: (from: number, to: number) => PromiseLike<Res<T>>): Promise<T[] | null> {
  const out: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let res: Res<T>;
    try {
      res = await make(from, from + PAGE - 1);
    } catch {
      return from === 0 ? null : out;
    }
    if (res.error) return from === 0 ? null : out;
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function readOnce<T>(p: PromiseLike<Res<T>>): Promise<T[] | null> {
  try {
    const res = await p;
    return res.error ? null : res.data ?? [];
  } catch {
    return null;
  }
}

/** Lignes d'une table par identifiants, par paquets (quelques requêtes en parallèle) ; null si un paquet échoue. */
async function readIds<T>(ids: string[], make: (chunk: string[]) => PromiseLike<Res<T>>): Promise<T[] | null> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) chunks.push(ids.slice(i, i + IN_CHUNK));
  const out: T[] = [];
  let failed = false;
  for (let i = 0; i < chunks.length; i += 6) {
    const res = await Promise.all(chunks.slice(i, i + 6).map((c) => readOnce(make(c))));
    for (const r of res) {
      if (r) out.push(...r);
      else failed = true;
    }
  }
  return failed ? null : out;
}

/** Comme readIds, en gardant ce qui a pu être lu. */
async function readByIds<T>(ids: string[], make: (chunk: string[]) => PromiseLike<Res<T>>): Promise<T[]> {
  return (await readIds(ids, make)) ?? [];
}

type DuelRow = {
  id: string;
  status: string;
  challenger_id: string;
  opponent_id: string | null;
  challenger_started_at: string | null;
  opponent_started_at: string | null;
  challenger_finished_at: string | null;
  opponent_finished_at: string | null;
  expires_at: string | null;
  finished_at: string | null;
  created_at: string;
};
type DuelAnswerRow = { duel_id: string; question_id: string; selected_index: number | null; is_correct: boolean | null };
type DailyAttemptRow = { challenge_id: string; day: string; started_at: string; finished_at: string | null; score: number | null; total: number | null };
type CalcRow = { topic: string; type_key: string; level: string; correct: boolean; answered_at: string };
type DailyAnswerRow = { challenge_id: string; position: number; question_id: string | null; selected_index: number | null; is_correct: boolean | null };
type DailyChallengeRow = { id: string; question_ids: string[] | null; time_limit_seconds: number | null; program?: string | null };
type MockResultRow = { exam_id: string; answers: unknown; score: number | null; total: number | null; completed_at: string | null };
type MockAttemptRow = { id: string; exam_id: string; score: number | null; total: number | null; completed_at: string | null };
type QuizAttemptRow = { id: string; set_id: string; score: number | null; total: number | null; created_at: string | null };
type SetSessionRow = { id: string; set_id: string | null; set_title: string | null; correct: number | null; total: number | null; occurred_at: string | null };
type PracticeRow = { id: string; topics: string[] | null; score: number | null; total: number | null; answers: unknown; completed_at: string | null };
type EclairRow = { id: string; question_ids: string[] | null; answers: (number | null)[] | null; score: number | null; total: number | null; finished_at: string | null };
type LogRow = { set_id: string; is_correct: boolean; run_id: string; mode: string | null; answered_at: string };
type QuestionRow = { id: string; set_id: string; correct_index: number | null };
type SetRow = { id: string; title: string | null; folder_id: string | null };

type Given = { question_id: string; selected_index: number | null };

/** Réponses gardées en jsonb : [{question_id, selected_index}] ; null si absentes ou illisibles. */
function parseGiven(v: unknown): Given[] | null {
  if (!Array.isArray(v)) return null;
  const out: Given[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object") continue;
    const q = (x as { question_id?: unknown }).question_id;
    const s = (x as { selected_index?: unknown }).selected_index;
    if (typeof q !== "string") continue;
    const n = s === null || s === undefined || s === "" ? null : Number(s);
    out.push({ question_id: q, selected_index: n === null || !Number.isFinite(n) ? null : n });
  }
  return out;
}

const num = (v: unknown) => Math.max(0, Number(v) || 0);

/** Chrono du défi du jour (45 min) et marge réseau de la dernière réponse, comme le serveur. */
const DAILY_LIMIT_S = 2700;
const DAILY_GRACE_MS = 20_000;

/** Une copie du défi est close : rendue, ou son chrono est échu (le serveur la rendra d'office). */
function dailyClosed(a: DailyAttemptRow, limitS: number | null | undefined, now: number) {
  if (a.finished_at) return true;
  const start = new Date(a.started_at).getTime();
  return Number.isFinite(start) && start + (limitS || DAILY_LIMIT_S) * 1000 + DAILY_GRACE_MS < now;
}

/** Un duel est clos pour ce joueur : plus personne n'y répond, les scores peuvent se lire. */
function duelClosed(d: DuelRow, userId: string, now: number) {
  if (d.status === "finished") return true;
  const started = d.challenger_id === userId ? d.challenger_started_at : d.opponent_started_at;
  if (d.status === "declined" || d.status === "expired") return !!started;
  // en attente de règlement (échéance passée, réglé à la prochaine visite)
  return !!started && !!d.expires_at && new Date(d.expires_at).getTime() < now;
}

// Contributions élémentaires : un passage × un set (ou un regroupement).
type Target = { kind: "set"; setId: string; title?: string | null } | { kind: "bucket"; subject: string; themeKey: string; label: string; tag: string | null; order: number };
type Contrib = { source: AnswerSource; passage: string; target: Target; n: number; ok: number };
type PassageInfo = { source: AnswerSource; label: string; at: string; href: string | null };

export type AnswerStatsOptions = {
  /** false : profil public, sans thèmes ni passages (et sans lire les noms des adversaires) */
  detail?: boolean;
  /**
   * true si `reader` contourne la RLS (client admin). Sans lui, les réponses
   * de duels sont illisibles (aucune policy) : la source est marquée manquante.
   */
  privileged?: boolean;
  now?: number;
};

/**
 * Questions répondues par un joueur, rangées par matière → thème → passage.
 * @param reader client admin de préférence (sinon celui du joueur : ses propres lignes seulement)
 * @param userId le joueur dont on compte les réponses (toutes les lectures sont filtrées dessus)
 */
export async function getAnswerStats(reader: SupabaseClient, userId: string, opts: AnswerStatsOptions = {}): Promise<AnswerStats> {
  if (!UUID.test(userId)) return EMPTY_ANSWER_STATS;
  const detail = opts.detail !== false;
  const now = opts.now ?? Date.now();
  const missing = new Set<AnswerSource>();

  const [duels, duelAnswers, mockResults, mockAttempts, quizAttempts, setSessions, practice, log, dailyAttempts, dailyAnswers, calcRows, eclairRows] = await Promise.all([
    readOnce<DuelRow>(
      reader
        .from("duels")
        .select("id,status,challenger_id,opponent_id,challenger_started_at,opponent_started_at,challenger_finished_at,opponent_finished_at,expires_at,finished_at,created_at")
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .limit(5000),
    ),
    opts.privileged
      ? readAll<DuelAnswerRow>((a, b) => reader.from("duel_answers").select("duel_id,question_id,selected_index,is_correct").eq("user_id", userId).order("answered_at").range(a, b))
      : Promise.resolve(null),
    readOnce<MockResultRow>(reader.from("mock_exam_results").select("exam_id,answers,score,total,completed_at").eq("user_id", userId).limit(2000)),
    readOnce<MockAttemptRow>(reader.from("mock_exam_attempts").select("id,exam_id,score,total,completed_at").eq("user_id", userId).limit(5000)),
    readOnce<QuizAttemptRow>(reader.from("quiz_attempts").select("id,set_id,score,total,created_at").eq("user_id", userId).limit(10000)),
    readOnce<SetSessionRow>(reader.from("practice_sessions").select("id,set_id,set_title,correct,total,occurred_at").eq("user_id", userId).eq("mode", "qcm").limit(10000)),
    readOnce<PracticeRow>(reader.from("practice_session_results").select("id,topics,score,total,answers,completed_at").eq("user_id", userId).limit(5000)),
    readAll<LogRow>((a, b) => reader.from("quiz_answer_log").select("set_id,is_correct,run_id,mode,answered_at").eq("user_id", userId).order("answered_at").range(a, b)),
    // défi du jour : les copies (lisibles par le joueur), puis les réponses (admin seulement)
    readOnce<DailyAttemptRow>(reader.from("daily_attempts").select("challenge_id,day,started_at,finished_at,score,total").eq("user_id", userId).limit(2000)),
    opts.privileged
      ? readAll<DailyAnswerRow>((a, b) => reader.from("daily_answers").select("challenge_id,position,question_id,selected_index,is_correct").eq("user_id", userId).order("answered_at").range(a, b))
      : Promise.resolve(null),
    // exercices de calcul (migration_calc.sql ; table absente : source vide)
    readAll<CalcRow>((a, b) => reader.from("calc_attempts").select("topic,type_key,level,correct,answered_at").eq("user_id", userId).order("answered_at").range(a, b)),
    // séries éclair rendues (migration_series_eclair.sql ; table absente : source vide)
    readOnce<EclairRow>(reader.from("eclair_series").select("id,question_ids,answers,score,total,finished_at").eq("user_id", userId).not("finished_at", "is", null).limit(5000)),
  ]);

  if (duels === null || duelAnswers === null) missing.add("duel");
  if (mockResults === null && mockAttempts === null) missing.add("mock");
  if (quizAttempts === null) missing.add("exam");
  if (quizAttempts === null && setSessions === null) missing.add("qcm");
  if (practice === null) missing.add("practice");
  if (log === null) missing.add("fiche");
  if (calcRows === null) missing.add("calc");
  if (eclairRows === null) missing.add("eclair");

  // --- Questions à juger ou à ranger (duels, défi du jour, examens blancs, sessions ciblées)
  const closed = new Map<string, DuelRow>();
  for (const d of duels ?? []) if (duelClosed(d, userId, now)) closed.set(d.id, d);
  const duelRows = (duelAnswers ?? []).filter((a) => closed.has(a.duel_id));

  // Défi du jour : le chrono et l'ordre des questions de chaque défi joué
  // (client admin), pour ne compter que les copies closes. Une copie encore
  // ouverte ne compte jamais : sa justesse reste cachée jusqu'au bout.
  const dailyIds = [...new Set((dailyAttempts ?? []).map((a) => a.challenge_id))];
  const challenges =
    opts.privileged && dailyIds.length ? await readIds<DailyChallengeRow>(dailyIds, (c) => reader.from("daily_challenges").select("id,question_ids,time_limit_seconds,program").in("id", c)) : null;
  const challengeOf = new Map((challenges ?? []).map((c) => [c.id, c]));
  const dailyDone = new Map<string, DailyAttemptRow>();
  for (const a of dailyAttempts ?? []) if (dailyClosed(a, challengeOf.get(a.challenge_id)?.time_limit_seconds, now)) dailyDone.set(a.challenge_id, a);
  // détail par question : avec les réponses ET les défis lisibles ; sinon, au score
  const dailyDetail = dailyAnswers !== null && challenges !== null;
  const dailyRows = dailyDetail
    ? (dailyAnswers ?? [])
        .filter((a) => dailyDone.has(a.challenge_id))
        .map((a) => ({ ...a, question_id: a.question_id ?? challengeOf.get(a.challenge_id)?.question_ids?.[a.position] ?? null }))
    : [];

  // Réponses gardées par question (examens blancs, sessions ciblées) : à
  // juger avec la clé, lisible seulement côté admin. Sans elle, ces passages
  // comptent au score, comme les anciens résultats sans détail.
  const qids = new Set<string>();
  for (const a of duelRows) qids.add(a.question_id);
  for (const a of dailyRows) if (a.question_id) qids.add(a.question_id);
  // séries éclair : la position i de question_ids répond à answers[i]
  const eclairGiven = (eclairRows ?? []).map((r) => ({
    r,
    given: (r.question_ids ?? []).map((qid, i) => ({ question_id: qid, selected_index: r.answers?.[i] ?? null })).filter((g) => g.selected_index !== null),
  }));
  if (opts.privileged) for (const { given } of eclairGiven) for (const g of given) qids.add(g.question_id);
  const keyed = [...(mockResults ?? []), ...(practice ?? [])].flatMap((r) => parseGiven(r.answers) ?? []);
  if (opts.privileged) for (const g of keyed) qids.add(g.question_id);

  let questions = await readIds<QuestionRow>([...qids], (c) => reader.from("quiz_questions").select("id,set_id,correct_index").in("id", c));
  const judged = !!opts.privileged && questions !== null;
  if (questions === null) questions = (await readByIds<{ id: string; set_id: string }>([...qids], (c) => reader.from("quiz_questions").select("id,set_id").in("id", c))).map((q) => ({ ...q, correct_index: null }));
  const qmap = new Map(questions.map((q) => [q.id, q]));

  const mockGiven = (mockResults ?? []).map((r) => ({ r, given: judged ? parseGiven(r.answers) : null }));
  const practiceGiven = (practice ?? []).map((r) => ({ r, given: judged ? parseGiven(r.answers) : null }));

  // --- Contributions
  const contribs: Contrib[] = [];
  const passages = new Map<string, PassageInfo>();
  /**
   * Agrège des réponses par (passage, set). Une question retirée de la banque
   * depuis (set re-créé) ne peut plus être jugée : avec `storedScore` (score
   * gardé au moment du passage), ses justes se déduisent du score.
   */
  const perSet = (source: AnswerSource, passage: string, rows: { qid: string; answered: boolean; ok: boolean }[], storedScore?: number | null) => {
    const acc = new Map<string, [number, number]>();
    for (const r of rows) {
      if (!r.answered) continue;
      const setId = qmap.get(r.qid)?.set_id ?? "";
      const a = acc.get(setId) ?? [0, 0];
      a[0] += 1;
      a[1] += r.ok ? 1 : 0;
      acc.set(setId, a);
    }
    const gone = acc.get("");
    if (gone && storedScore != null) {
      let known = 0;
      for (const [setId, [, ok]] of acc) if (setId) known += ok;
      gone[1] = Math.max(0, Math.min(gone[0], storedScore - known));
    }
    for (const [setId, [n, ok]] of acc) {
      contribs.push({
        source,
        passage,
        target: setId ? { kind: "set", setId } : { kind: "bucket", subject: "other", themeKey: "deleted", label: "Questions retirées de la banque", tag: null, order: 3000 },
        n,
        ok,
      });
    }
  };

  // Duels
  const byDuel = new Map<string, { qid: string; answered: boolean; ok: boolean }[]>();
  for (const a of duelRows) {
    const list = byDuel.get(a.duel_id) ?? [];
    list.push({ qid: a.question_id, answered: a.selected_index !== null, ok: !!a.is_correct });
    byDuel.set(a.duel_id, list);
  }
  for (const [id, rows] of byDuel) {
    const d = closed.get(id)!;
    const mine = d.challenger_id === userId ? d.challenger_finished_at : d.opponent_finished_at;
    passages.set(`d:${id}`, { source: "duel", label: "Duel", at: d.finished_at ?? mine ?? d.created_at, href: `/duel/${id}?revue=1` });
    perSet("duel", `d:${id}`, rows);
  }

  // Défi du jour : un passage par copie close, détaillé par question avec la
  // clé admin, sinon au score de la copie rendue
  const byDaily = new Map<string, { qid: string; answered: boolean; ok: boolean }[]>();
  for (const a of dailyRows) {
    if (!a.question_id) continue;
    const list = byDaily.get(a.challenge_id) ?? [];
    list.push({ qid: a.question_id, answered: a.selected_index !== null, ok: !!a.is_correct });
    byDaily.set(a.challenge_id, list);
  }
  for (const [id, a] of dailyDone) {
    const pid = `dj:${id}`;
    // les 5 du jour (défi éclair) : leur programme, à défaut leurs 5 questions
    const prog = challengeOf.get(id)?.program;
    const cinq = prog ? prog === "cfa-l1-cinq" : num(a.total) === 5;
    passages.set(pid, { source: "daily", label: cinq ? "Les 5 du jour" : "Défi du jour", at: a.finished_at ?? a.started_at, href: `/defi${cinq ? "/cinq" : ""}/${String(a.day).slice(0, 10)}` });
    const rows = byDaily.get(id);
    if (rows) perSet("daily", pid, rows, a.score);
    else if (!dailyDetail && a.finished_at && num(a.total) > 0)
      contribs.push({
        source: "daily",
        passage: pid,
        target: { kind: "bucket", subject: "mixed", themeKey: "daily", label: "Défi du jour", tag: null, order: 650 },
        n: num(a.total),
        ok: Math.min(num(a.score), num(a.total)),
      });
  }

  // Séries éclair : un passage par série rendue, détaillé par question avec
  // la clé admin, sinon au score
  for (const { r, given } of eclairGiven) {
    const pid = `e:${r.id}`;
    passages.set(pid, { source: "eclair", label: "Série éclair", at: r.finished_at ?? "", href: "/eclair" });
    if (judged) {
      perSet(
        "eclair",
        pid,
        given.map((g) => ({ qid: g.question_id, answered: true, ok: qmap.get(g.question_id)?.correct_index === g.selected_index })),
        r.score,
      );
    } else if (num(r.total) > 0) {
      contribs.push({
        source: "eclair",
        passage: pid,
        target: { kind: "bucket", subject: "mixed", themeKey: "eclair", label: "Séries éclair", tag: null, order: 660 },
        n: num(r.total),
        ok: Math.min(num(r.score), num(r.total)),
      });
    }
  }

  // Examens blancs (premier essai, détaillé ; sinon au score) et reprises (au score)
  for (const { r, given } of mockGiven) {
    const id = `m:${r.exam_id}`;
    passages.set(id, { source: "mock", label: "Examen blanc", at: r.completed_at ?? "", href: `/mock-exams/${r.exam_id}` });
    if (given) {
      perSet(
        "mock",
        id,
        given.map((g) => ({ qid: g.question_id, answered: g.selected_index !== null, ok: g.selected_index !== null && qmap.get(g.question_id)?.correct_index === g.selected_index })),
        r.score,
      );
    } else {
      contribs.push({ source: "mock", passage: id, target: { kind: "bucket", subject: "mixed", themeKey: `exam:${r.exam_id}`, label: "Examen blanc", tag: null, order: 600 }, n: num(r.total), ok: num(r.score) });
    }
  }
  for (const r of mockAttempts ?? []) {
    const id = `ma:${r.id}`;
    passages.set(id, { source: "mock", label: "Examen blanc · reprise", at: r.completed_at ?? "", href: `/mock-exams/${r.exam_id}` });
    contribs.push({ source: "mock", passage: id, target: { kind: "bucket", subject: "mixed", themeKey: `exam:${r.exam_id}`, label: "Examen blanc", tag: null, order: 600 }, n: num(r.total), ok: num(r.score) });
  }

  // QCM et examens officiels joués en entier (score par passage, rangé par set)
  for (const r of quizAttempts ?? []) {
    const id = `qa:${r.id}`;
    passages.set(id, { source: "qcm", label: "QCM en entier", at: r.created_at ?? "", href: `/qcm/${r.set_id}` });
    contribs.push({ source: "qcm", passage: id, target: { kind: "set", setId: r.set_id }, n: num(r.total), ok: Math.min(num(r.score), num(r.total)) });
  }
  for (const r of setSessions ?? []) {
    const id = `ps:${r.id}`;
    passages.set(id, { source: "qcm", label: "Session chronométrée", at: r.occurred_at ?? "", href: "/session" });
    contribs.push({ source: "qcm", passage: id, target: r.set_id ? { kind: "set", setId: r.set_id, title: r.set_title } : { kind: "bucket", subject: subjectByName((r.set_title ?? "").split(" — ")[0]) ?? "other", themeKey: `title:${r.set_title}`, label: r.set_title || "QCM", tag: null, order: 2000 }, n: num(r.total), ok: Math.min(num(r.correct), num(r.total)) });
  }

  // Sessions ciblées
  for (const { r, given } of practiceGiven) {
    const id = `p:${r.id}`;
    const topics = r.topics ?? [];
    passages.set(id, { source: "practice", label: topics.length > 1 ? `Session ciblée · ${topicsShort(topics)}` : "Session ciblée", at: r.completed_at ?? "", href: "/practice" });
    if (given) {
      perSet(
        "practice",
        id,
        given.map((g) => ({ qid: g.question_id, answered: g.selected_index !== null, ok: g.selected_index !== null && qmap.get(g.question_id)?.correct_index === g.selected_index })),
        r.score,
      );
    } else if (topics.length === 1 && SUBJECT_NAMES[topics[0]]) {
      contribs.push({ source: "practice", passage: id, target: { kind: "bucket", subject: topics[0], themeKey: "practice-nodetail", label: "Sessions ciblées, sans détail par thème", tag: null, order: 2500 }, n: num(r.total), ok: num(r.score) });
    } else {
      contribs.push({ source: "practice", passage: id, target: { kind: "bucket", subject: "mixed", themeKey: "practice-mixed", label: "Sessions ciblées multi-matières", tag: null, order: 700 }, n: num(r.total), ok: num(r.score) });
    }
  }

  // Calculs : un passage = un type de calcul joué un jour donné ; le thème
  // est le type (nom lisible tiré de sa clé : le catalogue, qui contient les
  // réponses, reste côté serveur et n'est pas importé ici).
  const PARIS_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
  const parisDayKey = (iso: string) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) ? PARIS_DAY.format(t) : "?";
  };
  const calcName = (key: string) => {
    const t = key.replace(/-/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const calcPassages = new Map<string, { topic: string; key: string; at: string; n: number; ok: number }>();
  for (const r of calcRows ?? []) {
    const day = parisDayKey(r.answered_at);
    const pid = `c:${r.topic}:${r.type_key}:${day}`;
    const p = calcPassages.get(pid) ?? { topic: r.topic, key: r.type_key, at: r.answered_at, n: 0, ok: 0 };
    p.n += 1;
    p.ok += r.correct ? 1 : 0;
    if (r.answered_at > p.at) p.at = r.answered_at;
    calcPassages.set(pid, p);
  }
  for (const [pid, p] of calcPassages) {
    const subject = SUBJECT_NAMES[p.topic] ? p.topic : "other";
    passages.set(pid, { source: "calc", label: `Calculs · ${calcName(p.key)}`, at: p.at, href: `/calculs` });
    contribs.push({ source: "calc", passage: pid, target: { kind: "bucket", subject, themeKey: `calc:${p.key}`, label: `Calcul · ${calcName(p.key)}`, tag: null, order: 1800 }, n: p.n, ok: p.ok });
  }

  // Fiches : un passage = un run_id
  const runs = new Map<string, { mode: string | null; at: string; sets: Map<string, [number, number]> }>();
  for (const r of log ?? []) {
    const run = runs.get(r.run_id) ?? { mode: r.mode, at: r.answered_at, sets: new Map() };
    const a = run.sets.get(r.set_id) ?? [0, 0];
    a[0] += 1;
    a[1] += r.is_correct ? 1 : 0;
    run.sets.set(r.set_id, a);
    if (r.answered_at > run.at) run.at = r.answered_at;
    runs.set(r.run_id, run);
  }
  for (const [runId, run] of runs) {
    const id = `f:${runId}`;
    passages.set(id, { source: "fiche", label: run.mode === "errors" ? "Mes erreurs" : run.mode === "mixed" ? "Bilan aléatoire" : "Quiz de la page", at: run.at, href: null });
    for (const [setId, [n, ok]] of run.sets) contribs.push({ source: "fiche", passage: id, target: { kind: "set", setId }, n, ok });
  }

  // --- Sets, dossiers, titres d'examens, adversaires
  const setIds = [...new Set(contribs.flatMap((c) => (c.target.kind === "set" ? [c.target.setId] : [])))];
  const sets = await readByIds<SetRow>(setIds, (c) => reader.from("quiz_sets").select("id,title,folder_id").in("id", c));
  const folderIds = [...new Set(sets.map((s) => s.folder_id).filter((x): x is string => !!x))];
  const examIds = [...new Set([...(mockResults ?? []).map((r) => r.exam_id), ...(mockAttempts ?? []).map((r) => r.exam_id)])];
  const opponentIds = detail ? [...new Set([...closed.values()].filter((d) => byDuel.has(d.id)).map((d) => (d.challenger_id === userId ? d.opponent_id : d.challenger_id)).filter((x): x is string => !!x))] : [];
  const [folders, exams, opponents] = await Promise.all([
    readByIds<{ id: string; name: string }>(folderIds, (c) => reader.from("library_folders").select("id,name").in("id", c)),
    readByIds<{ id: string; title: string | null }>(examIds, (c) => reader.from("mock_exams").select("id,title").in("id", c)),
    readByIds<{ id: string; username: string | null }>(opponentIds, (c) => reader.from("profiles").select("id,username").in("id", c)),
  ]);
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  const setInfo = new Map(sets.map((s) => [s.id, { title: s.title, folder: s.folder_id ? folderName.get(s.folder_id) ?? null : null }]));
  const examTitle = new Map(exams.map((e) => [e.id, e.title?.trim() || "Examen blanc"]));
  const opponentName = new Map(opponents.map((p) => [p.id, p.username?.trim() || null]));

  // Libellés finaux des passages
  for (const [id, p] of passages) {
    if (id.startsWith("d:")) {
      const d = closed.get(id.slice(2));
      const other = d ? (d.challenger_id === userId ? d.opponent_id : d.challenger_id) : null;
      const name = other ? opponentName.get(other) : null;
      if (name) p.label = `Duel contre ${name}`;
    } else if (id.startsWith("m:")) {
      p.label = examTitle.get(id.slice(2)) ?? p.label;
    }
  }
  for (const r of mockAttempts ?? []) {
    const p = passages.get(`ma:${r.id}`);
    if (p) p.label = `${examTitle.get(r.exam_id) ?? "Examen blanc"} · reprise`;
  }

  // --- Arbre matière → thème → passage
  type ThemeAcc = { label: string; tag: string | null; order: number; by: BySource; passages: Map<string, { n: number; ok: number }> };
  type SubjectAcc = { by: BySource; themes: Map<string, ThemeAcc>; seances: Map<string, { n: number; ok: number }> };
  const subjects = new Map<string, SubjectAcc>();
  const total: BySource = {};
  const toutes = new Map<string, { n: number; ok: number }>();
  const cumuler = (m: Map<string, { n: number; ok: number }>, pid: string, n: number, ok: number) => {
    const v = m.get(pid) ?? { n: 0, ok: 0 };
    v.n += n;
    v.ok += ok;
    m.set(pid, v);
  };

  for (const c of contribs) {
    if (c.n <= 0) continue;
    let place: Placement;
    let source = c.source;
    if (c.target.kind === "set") {
      const info = setInfo.get(c.target.setId);
      place = placeSet(c.target.setId, info?.title ?? c.target.title ?? null, info?.folder ?? null);
      // un mock officiel joué en entier dans /qcm compte comme examen
      if (source === "qcm" && info?.folder === MOCKS_FOLDER) source = "exam";
      if (!info && !c.target.title) place = { subject: "other", themeKey: "deleted-set", label: "QCM supprimés depuis", tag: null, order: 3000 };
    } else {
      place = { subject: c.target.subject, themeKey: c.target.themeKey, label: c.target.label, tag: c.target.tag, order: c.target.order };
    }
    if (c.target.kind === "bucket" && c.target.themeKey.startsWith("exam:")) place.label = examTitle.get(c.target.themeKey.slice(5)) ?? place.label;

    const p = passages.get(c.passage);
    if (p && p.source !== source) {
      p.source = source;
      if (source === "exam") p.label = "Examen officiel";
    }

    addTally(total, source, c.n, c.ok);
    const s = subjects.get(place.subject) ?? { by: {}, themes: new Map(), seances: new Map() };
    addTally(s.by, source, c.n, c.ok);
    cumuler(s.seances, c.passage, c.n, c.ok);
    cumuler(toutes, c.passage, c.n, c.ok);
    const th = s.themes.get(place.themeKey) ?? { label: place.label, tag: place.tag, order: place.order, by: {}, passages: new Map() };
    addTally(th.by, source, c.n, c.ok);
    const pa = th.passages.get(c.passage) ?? { n: 0, ok: 0 };
    pa.n += c.n;
    pa.ok += c.ok;
    th.passages.set(c.passage, pa);
    s.themes.set(place.themeKey, th);
    subjects.set(place.subject, s);
  }

  const toThemes = (subject: string, s: SubjectAcc | undefined): AnswerTheme[] => {
    if (!s || !detail) return [];
    const fiche = SUBJECTS.find((x) => x.key === subject)?.fiche ?? null;
    return [...s.themes.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[1].label.localeCompare(b[1].label, "fr"))
      .map(([key, th]) => {
        const list: AnswerPassage[] = [...th.passages.entries()]
          .map(([pid, v]) => {
            const info = passages.get(pid);
            const at = info?.at ?? "";
            // passage de fiche : la fiche de la matière
            const href = info?.href ?? (pid.startsWith("f:") && fiche ? `/fiches/${fiche}` : null);
            return { id: pid, source: info?.source ?? "qcm", label: info?.label ?? "Passage", at, date: at ? fmtShortDate(at) : "", href, n: v.n, ok: v.ok };
          })
          .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
        return { key, label: th.label, tag: th.tag, by: th.by, passages: list.slice(0, PASSAGES_PER_THEME), more: Math.max(0, list.length - PASSAGES_PER_THEME) };
      });
  };

  // séances datées, les plus récentes d'abord (bornées : la forme ne regarde que le passé proche et la dispersion)
  const enSeances = (m: Map<string, { n: number; ok: number }> | undefined, max: number): Seance[] | undefined =>
    !m || !detail
      ? undefined
      : [...m.entries()]
          .map(([pid, v]) => {
            const info = passages.get(pid);
            return { n: v.n, ok: v.ok, at: info?.at ?? "", source: info?.source ?? "qcm" };
          })
          .filter((x) => x.at)
          .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
          .slice(0, max);

  const out: AnswerSubject[] = SUBJECTS.map((s) => ({
    key: s.key,
    name: s.name,
    code: s.code,
    pseudo: false,
    by: subjects.get(s.key)?.by ?? {},
    themes: toThemes(s.key, subjects.get(s.key)),
    seances: enSeances(subjects.get(s.key)?.seances, SEANCES_MAX),
  }));
  for (const [key, name] of [
    ["mixed", "Plusieurs matières"],
    ["other", "Hors programme"],
  ] as const) {
    const s = subjects.get(key);
    if (s && tallyOf(s.by).n > 0) out.push({ key, name, code: "", pseudo: true, by: s.by, themes: toThemes(key, s), seances: enSeances(s.seances, SEANCES_MAX) });
  }

  const readable = [duels, mockResults, mockAttempts, quizAttempts, setSessions, practice, log, dailyAttempts, eclairRows].some((x) => x !== null);
  return { available: readable, missing: [...missing], by: total, subjects: out, seances: enSeances(toutes, SEANCES_MAX * 2) };
}

/** Libellé court des matières d'une session (« FSA, Quant +2 »). */
export function topicsShort(keys: string[]) {
  const names = TOPIC_NAMES(keys);
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
}
