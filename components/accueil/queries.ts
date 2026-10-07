import type { SupabaseClient } from "@supabase/supabase-js";
import { getCourse } from "@/lib/courses";
import { computeQuestionStates, type AnswerRow } from "@/lib/ficheLog";
import { MIN_QUESTIONS_FOR_SIGNAL } from "@/lib/mastery";
import { TOPICS } from "@/lib/practiceTopics";
import { parseDrillTitle, subjectByDrillTitle, subjectByKey } from "@/components/reviser/catalog";
import type { ActivityWeek, ErrorsSummary, MockExamCard, ResumeItem } from "@/components/accueil/types";
import { SOURCES_RATURE } from "@/lib/voice-z1";

// Lectures serveur de l'accueil. Chaque fonction dégrade proprement : table
// absente, droit refusé ou réseau coupé → valeur vide, jamais d'exception
// (l'accueil doit toujours s'afficher). À appeler depuis app/dashboard.

type Client = SupabaseClient;

const TZ = "Europe/Paris";
const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

/** Jour calendaire à Paris, « AAAA-MM-JJ ». */
export function parisDay(d: Date) {
  return DAY_FMT.format(d);
}

function shiftDay(key: string, days: number) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Activité : questions répondues par jour (semaine en cours, lundi → dimanche)

type DatedCount = { at: string; n: number; correct: number };

async function safeRows<T>(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await run();
    if (error || !Array.isArray(data)) return [];
    return data as T[];
  } catch {
    return [];
  }
}

/**
 * Questions répondues aujourd'hui et sur la semaine, toutes sources
 * confondues : quiz des fiches (une ligne par réponse), sessions QCM,
 * sessions d'entraînement ciblé, examens blancs et leurs reprises, duels
 * réglés, copies rendues du défi du jour (daily_attempts) et séries éclair
 * (eclair_series), si leurs migrations sont appliquées ; sinon la lecture
 * échoue et ne compte rien.
 * Lit aussi les 8 derniers jours (série) : `activeDays`.
 */
export async function loadActivity(supabase: Client, userId: string, now = new Date()): Promise<ActivityWeek> {
  const today = parisDay(now);
  const dow = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7;
  const monday = shiftDay(today, -dow);
  // Depuis le lundi, ou 8 jours en arrière (la série) si c'est plus tôt ; un
  // jour de marge : le lundi à Paris commence la veille au soir en UTC.
  const from = shiftDay(today, -8) < monday ? shiftDay(today, -8) : monday;
  const since = new Date(shiftDay(from, -1) + "T00:00:00Z").toISOString();

  type DuelRow = {
    challenger_id: string;
    question_ids: string[] | null;
    challenger_score: number | null;
    opponent_score: number | null;
    challenger_finished_at: string | null;
    opponent_finished_at: string | null;
    finished_at: string | null;
  };

  const [fiche, qcm, practice, mock, retakes, duels, daily, quizzes, eclair] = await Promise.all([
    safeRows<{ answered_at: string; is_correct: boolean }>(() =>
      supabase.from("quiz_answer_log").select("answered_at,is_correct").eq("user_id", userId).gte("answered_at", since).limit(5000),
    ),
    safeRows<{ occurred_at: string; correct: number; total: number; mode: string }>(() =>
      supabase.from("practice_sessions").select("occurred_at,correct,total,mode").eq("user_id", userId).gte("occurred_at", since).limit(500),
    ),
    safeRows<{ completed_at: string; score: number; total: number }>(() =>
      supabase.from("practice_session_results").select("completed_at,score,total").eq("user_id", userId).gte("completed_at", since).limit(500),
    ),
    safeRows<{ completed_at: string; score: number; total: number }>(() =>
      supabase.from("mock_exam_results").select("completed_at,score,total").eq("user_id", userId).gte("completed_at", since).limit(100),
    ),
    safeRows<{ completed_at: string; score: number; total: number }>(() =>
      supabase.from("mock_exam_attempts").select("completed_at,score,total").eq("user_id", userId).gte("completed_at", since).limit(100),
    ),
    // Duels réglés (les réponses détaillées ne sont pas lisibles côté client :
    // on compte les questions du duel et le score révélé au règlement).
    safeRows<DuelRow>(() =>
      supabase
        .from("duels")
        .select("challenger_id,question_ids,challenger_score,opponent_score,challenger_finished_at,opponent_finished_at,finished_at")
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq("status", "finished")
        .gte("finished_at", since)
        .limit(100),
    ),
    // Défi du jour : copies rendues (score rempli à la clôture seulement ;
    // une copie en cours est ajoutée par withLiveDaily, sans sa justesse).
    safeRows<{ finished_at: string; score: number | null; total: number | null }>(() =>
      supabase.from("daily_attempts").select("finished_at,score,total").eq("user_id", userId).gte("finished_at", since).limit(20),
    ),
    // QCM joués en entier (/qcm) et copies du mode examen (/exam).
    safeRows<{ created_at: string; score: number; total: number }>(() =>
      supabase.from("quiz_attempts").select("created_at,score,total").eq("user_id", userId).gte("created_at", since).limit(500),
    ),
    // Séries éclair rendues (table absente avant la migration : rien).
    safeRows<{ finished_at: string; score: number | null; total: number | null }>(() =>
      supabase.from("eclair_series").select("finished_at,score,total").eq("user_id", userId).gte("finished_at", since).limit(500),
    ),
  ]);

  const all: DatedCount[] = [
    ...fiche.map((r) => ({ at: r.answered_at, n: 1, correct: r.is_correct ? 1 : 0 })),
    // Les sessions de flashcards ne sont pas des questions : seules les sessions QCM comptent.
    ...qcm.filter((r) => r.mode === "qcm").map((r) => ({ at: r.occurred_at, n: Number(r.total) || 0, correct: Number(r.correct) || 0 })),
    ...[...practice, ...mock, ...retakes].map((r) => ({ at: r.completed_at, n: Number(r.total) || 0, correct: Number(r.score) || 0 })),
    ...duels.map((r) => {
      const mine = r.challenger_id === userId;
      return {
        at: (mine ? r.challenger_finished_at : r.opponent_finished_at) ?? r.finished_at ?? "",
        n: r.question_ids?.length ?? 0,
        correct: Number(mine ? r.challenger_score : r.opponent_score) || 0,
      };
    }),
    ...daily.map((r) => ({ at: r.finished_at, n: Number(r.total) || 0, correct: Number(r.score) || 0 })),
    ...quizzes.map((r) => ({ at: r.created_at, n: Number(r.total) || 0, correct: Number(r.score) || 0 })),
    ...eclair.map((r) => ({ at: r.finished_at, n: Number(r.total) || 0, correct: Number(r.score) || 0 })),
  ];

  const byDay = new Map<string, { n: number; correct: number }>();
  for (const r of all) {
    if (!r.at || r.n <= 0) continue;
    const key = parisDay(new Date(r.at));
    const a = byDay.get(key) ?? { n: 0, correct: 0 };
    a.n += r.n;
    a.correct += r.correct;
    byDay.set(key, a);
  }

  const days = DAY_LETTERS.map((label, i) => {
    const key = shiftDay(monday, i);
    const a = byDay.get(key);
    return { key, label, count: a?.n ?? 0, correct: a?.correct ?? 0, isToday: key === today, future: key > today };
  });
  const activeDays = Array.from(byDay.entries())
    .filter(([, a]) => a.n > 0)
    .map(([k]) => k)
    .sort();
  return { today: byDay.get(today)?.n ?? 0, days, activeDays };
}

/**
 * Recale la journée sur le défi du jour (getTodayDaily, qui compte les
 * réponses données ; la justesse reste cachée jusqu'à la copie rendue) :
 * - copie encore ouverte : ses réponses s'ajoutent (sinon l'anneau
 *   reculerait d'autant en revenant sur l'accueil au milieu du défi) ;
 * - copie rendue aujourd'hui : daily_attempts ne garde que le nombre de
 *   questions du défi ; on retire celles laissées sans réponse.
 */
export function withLiveDaily(activity: ActivityWeek, daily: { status: string; answered: number; total?: number | null; day?: string } | null): ActivityWeek {
  const todayKey0 = activity.days.find((x) => x.isToday)?.key;
  if (daily && daily.status === "done" && daily.total && daily.answered < daily.total && (!daily.day || daily.day === todayKey0)) {
    const off = Math.min(activity.today, daily.total - daily.answered);
    if (off <= 0) return activity;
    return { ...activity, today: activity.today - off, days: activity.days.map((x) => (x.isToday ? { ...x, count: Math.max(0, x.count - off) } : x)) };
  }
  const n = daily && daily.status === "playing" ? Math.max(0, daily.answered) : 0;
  if (n === 0) return activity;
  const days = activity.days.map((x) => (x.isToday ? { ...x, count: x.count + n } : x));
  const todayKey = activity.days.find((x) => x.isToday)?.key;
  const activeDays = todayKey && !(activity.activeDays ?? []).includes(todayKey) ? [...(activity.activeDays ?? []), todayKey] : activity.activeDays;
  return { today: activity.today + n, days, activeDays };
}

/** Dernier jour (Paris) avec au moins une question répondue, toutes lectures confondues ; null si aucun. */
export function lastActiveDay(candidates: (string | null | undefined)[]): string | null {
  const keys = candidates.filter((x): x is string => !!x && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x)).sort();
  return keys.length ? keys[keys.length - 1] : null;
}

/** Jours calendaires entre deux clés « AAAA-MM-JJ » (b − a). */
export function daysBetweenKeys(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86_400_000);
}

/** Heure de Paris (0–23). */
export function parisHour(d: Date): number {
  return Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: TZ }).format(d)) % 24;
}

// ---------------------------------------------------------------------------
// Erreurs à revoir (quiz des fiches)

const LOG_PAGE = 1000;
const LOG_MAX_PAGES = 10;

/**
 * Questions des fiches ratées et pas encore réussies deux fois d'affilée —
 * exactement la liste « Mes erreurs » de chaque fiche (lib/ficheLog.ts),
 * regroupée par matière.
 */
export async function loadErrors(supabase: Client, admin: Client | null, userId: string): Promise<ErrorsSummary> {
  // le carnet de ratures (toutes sources), s'il existe : ses comptes, par source
  try {
    const { data, error } = await supabase.rpc("get_ratures", { p_source: null, p_retirees: false, p_limit: 1, p_offset: 0 });
    if (!error && data) {
      const r = data as { total: number; retirees: number; sources: Record<string, number> | null };
      const total = Number(r.total) || 0;
      const bySubject = SOURCES_RATURE.filter(([k]) => (r.sources?.[k] ?? 0) > 0)
        .map(([key, short]) => ({ key, short, count: Number(r.sources?.[key]) || 0, href: "/moi?onglet=erreurs" }))
        .sort((a, b) => b.count - a.count);
      return { available: true, carnet: true, total, answered: total + (Number(r.retirees) || 0), bySubject };
    }
  } catch {
    // carnet indisponible : le journal des fiches, comme avant
  }
  const rows: AnswerRow[] = [];
  try {
    for (let page = 0; page < LOG_MAX_PAGES; page++) {
      const from = page * LOG_PAGE;
      const { data, error } = await supabase
        .from("quiz_answer_log")
        .select("question_id,set_id,is_correct,selected_index,run_id,mode,answered_at")
        .eq("user_id", userId)
        .order("answered_at", { ascending: true })
        .range(from, from + LOG_PAGE - 1);
      if (error) return { available: false, total: 0, bySubject: [] };
      rows.push(...((data ?? []) as AnswerRow[]));
      if (!data || data.length < LOG_PAGE) break;
    }
  } catch {
    return { available: false, total: 0, bySubject: [] };
  }

  const states = computeQuestionStates(rows);
  const setOf = new Map(rows.map((r) => [r.question_id, r.set_id]));
  const perSet = new Map<string, number>();
  for (const [qid, s] of states) {
    if (!s.inErrorPool) continue;
    const set = setOf.get(qid);
    if (set) perSet.set(set, (perSet.get(set) ?? 0) + 1);
  }
  const total = Array.from(perSet.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return { available: true, total: 0, answered: states.size, bySubject: [] };

  const titles = new Map<string, string>();
  try {
    const { data } = await (admin ?? supabase).from("quiz_sets").select("id,title").in("id", Array.from(perSet.keys()));
    (data ?? []).forEach((s: { id: string; title: string }) => titles.set(s.id, s.title));
  } catch {
    // titres indisponibles : les erreurs restent comptées, sans matière
  }

  const perSubject = new Map<string, { key: string; short: string; count: number; href: string }>();
  for (const [setId, n] of perSet) {
    const subj = subjectByDrillTitle(titles.get(setId) ?? "");
    const key = subj?.key ?? "autre";
    const cur = perSubject.get(key) ?? { key, short: subj?.short ?? "Autres", count: 0, href: subj?.fiche ? `/fiches/${subj.fiche}?onglet=erreurs` : "/fiches" };
    cur.count += n;
    perSubject.set(key, cur);
  }
  return { available: true, total, answered: states.size, bySubject: Array.from(perSubject.values()).sort((a, b) => b.count - a.count) };
}

// ---------------------------------------------------------------------------
// Reprendre : la dernière chose travaillée, toutes sources confondues

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function courseAudio(subjectKey: string | undefined, theme: string | null) {
  const subj = subjectKey ? subjectByKey(subjectKey) : null;
  const course = subj?.course ? getCourse(subj.course) : null;
  if (!course) return null;
  if (theme) {
    const t = norm(theme);
    const i = course.chapters.findIndex((c) => {
      const n = norm(c.title);
      return n === t || n.includes(t) || t.includes(n);
    });
    if (i >= 0) return { href: `/courses/${course.slug}`, label: `Écouter le module ${i + 1}`, title: course.chapters[i].title };
  }
  return { href: `/courses/${course.slug}`, label: "Écouter le cours", title: course.title };
}

async function resumeFromFiche(supabase: Client, admin: Client | null, userId: string): Promise<ResumeItem | null> {
  try {
    const { data: last, error } = await supabase
      .from("quiz_answer_log")
      .select("set_id,run_id,mode,answered_at")
      .eq("user_id", userId)
      .order("answered_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !last) return null;
    const row = last as { set_id: string; run_id: string; mode: "page" | "errors" | "mixed"; answered_at: string };
    const db = admin ?? supabase;

    const [runRes, setRes, countRes] = await Promise.all([
      supabase.from("quiz_answer_log").select("question_id").eq("user_id", userId).eq("run_id", row.run_id).limit(500),
      db.from("quiz_sets").select("title").eq("id", row.set_id).maybeSingle(),
      row.mode === "page"
        ? db.from("quiz_questions").select("id", { count: "exact", head: true }).eq("set_id", row.set_id)
        : Promise.resolve({ count: null }),
    ]);
    const done = new Set(((runRes.data ?? []) as { question_id: string }[]).map((r) => r.question_id)).size;
    const title = (setRes.data as { title?: string } | null)?.title ?? "";
    const subj = subjectByDrillTitle(title);
    const { page, theme } = parseDrillTitle(title);
    const total = typeof countRes.count === "number" && countRes.count > 0 ? countRes.count : null;
    const finished = total !== null && done >= total;

    const where = [subj?.short ?? "Fiche"];
    let heading = theme ?? title.replace(/ — Drill Fiche.*$/, "") ?? "Quiz de fiche";
    if (row.mode === "page" && page) where.push(`fiche page ${page}`);
    if (row.mode === "errors") heading = "Mes erreurs à revoir";
    if (row.mode === "mixed") heading = "Bilan aléatoire";

    return {
      kind: "fiche",
      context: where.join(" · "),
      title: heading || "Quiz de fiche",
      done,
      total,
      progressLabel: "questions de la série",
      at: row.answered_at,
      href: subj?.fiche ? `/fiches/${subj.fiche}` : "/fiches",
      cta: finished ? "Rouvrir la fiche" : "Continuer le quiz",
      audio: courseAudio(subj?.key, row.mode === "page" ? theme : null),
    };
  } catch {
    return null;
  }
}

async function resumeFromSessions(supabase: Client, userId: string): Promise<ResumeItem | null> {
  try {
    const { data, error } = await supabase
      .from("practice_sessions")
      .select("set_id,set_title,mode,correct,total,occurred_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as { set_id: string; set_title: string; mode: "qcm" | "flashcards"; correct: number; total: number; occurred_at: string };
    const qcm = r.mode === "qcm";
    return {
      kind: qcm ? "qcm" : "flashcards",
      context: qcm ? "QCM" : "Flashcards",
      title: r.set_title,
      done: Number(r.correct) || 0,
      total: Number(r.total) || null,
      progressLabel: qcm ? "bonnes réponses" : "cartes sues",
      at: r.occurred_at,
      href: qcm ? `/qcm/${r.set_id}` : `/flashcards/${r.set_id}`,
      cta: qcm ? "Rejouer le QCM" : "Revoir les cartes",
      audio: null,
    };
  } catch {
    return null;
  }
}

async function resumeFromPractice(supabase: Client, userId: string): Promise<ResumeItem | null> {
  try {
    const { data, error } = await supabase
      .from("practice_session_results")
      .select("topics,score,total,completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as { topics: string[] | null; score: number; total: number; completed_at: string };
    const topics = r.topics ?? [];
    const single = topics.length === 1 ? subjectByKey(topics[0]) : null;
    return {
      kind: "practice",
      context: "Entraînement ciblé",
      title: single ? single.name : `${topics.length} matières`,
      done: Number(r.score) || 0,
      total: Number(r.total) || null,
      progressLabel: "bonnes réponses",
      at: r.completed_at,
      href: single ? `/practice?topic=${single.key}` : "/practice",
      cta: "Nouvelle session",
      audio: single ? courseAudio(single.key, null) : null,
    };
  } catch {
    return null;
  }
}

export async function loadResume(supabase: Client, admin: Client | null, userId: string): Promise<ResumeItem | null> {
  const items = await Promise.all([resumeFromFiche(supabase, admin, userId), resumeFromSessions(supabase, userId), resumeFromPractice(supabase, userId)]);
  return items.filter((x): x is ResumeItem => !!x).sort((a, b) => (a.at < b.at ? 1 : -1))[0] ?? null;
}

// ---------------------------------------------------------------------------
// Prochain examen blanc

function initials(name: string | null) {
  const parts = (name ?? "").trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

export async function loadNextMockExam(supabase: Client, admin: Client | null, userId: string, now = new Date()): Promise<MockExamCard | null> {
  try {
    type Row = { id: string; title: string; scheduled_at: string; duration_minutes: number; question_count: number; status: string; window_days?: number | null };
    const cols = "id,title,scheduled_at,duration_minutes,question_count,status";
    const list = (withWindow: boolean) =>
      supabase
        .from("mock_exams")
        .select(withWindow ? cols + ",window_days" : cols)
        .neq("status", "closed")
        .order("scheduled_at", { ascending: true })
        .limit(20);
    // window_days peut manquer sur une ancienne base : fenêtre de 3 jours par défaut
    let res = await list(true);
    if (res.error) res = await list(false);
    if (res.error || !res.data) return null;
    const exams = res.data as unknown as Row[];
    // Même règle que le classement : un examen reste d'actualité jusqu'à la fin
    // de sa fenêtre (date ± window_days), même s'il est encore marqué « open ».
    const live = exams.filter((e) => new Date(e.scheduled_at).getTime() + (e.window_days ?? 3) * 86_400_000 >= now.getTime());
    const exam = live.find((e) => e.status === "open") ?? live[0] ?? null;
    if (!exam) return null;

    const db = admin ?? supabase;
    const [mine, regs] = await Promise.all([
      supabase.from("mock_exam_registrations").select("exam_id").eq("exam_id", exam.id).eq("user_id", userId).maybeSingle(),
      db.from("mock_exam_registrations").select("user_id", { count: "exact" }).eq("exam_id", exam.id).limit(4),
    ]);
    const ids = ((regs.data ?? []) as { user_id: string }[]).map((r) => r.user_id);
    let names: (string | null)[] = [];
    if (ids.length) {
      const { data: profs } = await db.from("profiles").select("id,username").in("id", ids);
      const byId = new Map(((profs ?? []) as { id: string; username: string | null }[]).map((p) => [p.id, p.username]));
      names = ids.map((id) => byId.get(id) ?? null);
    }
    const when = new Date(exam.scheduled_at);
    const startOf = (d: Date) => new Date(parisDay(d) + "T12:00:00Z").getTime();
    return {
      id: exam.id,
      title: exam.title,
      scheduledAt: exam.scheduled_at,
      durationMinutes: Number(exam.duration_minutes) || 0,
      questionCount: Number(exam.question_count) || 0,
      open: exam.status === "open",
      daysLeft: Math.round((startOf(when) - startOf(now)) / 86_400_000),
      registered: !!mine.data,
      registrantCount: regs.count ?? ids.length,
      registrants: names.map(initials),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Maîtrise moyenne du programme chez les joueurs

/**
 * Moyenne, sur les joueurs, de la maîtrise du programme (même calcul que
 * programMastery : moyenne des 10 matières, une matière sans assez de
 * questions comptant 0). Seuls les joueurs ayant au moins une matière
 * mesurée entrent dans la moyenne. Client admin requis (tous les joueurs).
 */
export async function getProgramAverage(admin: Client | null): Promise<number | null> {
  if (!admin) return null;
  type Row = { user_id: string; topics: string[] | null; score: number | null; total: number | null };
  const rows = await safeRows<Row>(() => admin.from("practice_session_results").select("user_id,topics,score,total").limit(20000));
  const perUser = new Map<string, Map<string, { c: number; t: number }>>();
  for (const r of rows) {
    const topics = r.topics ?? [];
    if (!r.user_id || topics.length !== 1) continue;
    const m = perUser.get(r.user_id) ?? new Map<string, { c: number; t: number }>();
    const a = m.get(topics[0]) ?? { c: 0, t: 0 };
    a.c += r.score ?? 0;
    a.t += r.total ?? 0;
    m.set(topics[0], a);
    perUser.set(r.user_id, m);
  }
  const masteries: number[] = [];
  for (const m of perUser.values()) {
    let measured = 0;
    let sum = 0;
    for (const t of TOPICS) {
      const a = m.get(t.key);
      if (a && a.t >= MIN_QUESTIONS_FOR_SIGNAL) {
        measured++;
        sum += (a.c / a.t) * 100;
      }
    }
    if (measured > 0) masteries.push(sum / TOPICS.length);
  }
  return masteries.length ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : null;
}
