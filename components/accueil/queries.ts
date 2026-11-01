import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityWeek, MockExamCard } from "@/components/accueil/types";

// Lectures serveur de l'accueil. Chaque fonction dégrade proprement : table
// absente, droit refusé ou réseau coupé → valeur vide, jamais d'exception
// (l'accueil doit toujours s'afficher). À appeler depuis components/accueil/lobby/donnees.ts (et app/session).

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
 * (eclair_series), et les questions des Ateliers (ateliers ; les calculs
 * sont dans calc_attempts), si leurs migrations sont appliquées ; sinon la lecture
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

  const [fiche, qcm, practice, mock, retakes, duels, daily, quizzes, eclair, ateliers] = await Promise.all([
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
    // Ateliers : une ligne par Atelier, ses réponses dedans (table absente avant la migration : rien).
    safeRows<{ reponses: { k?: string; ok?: boolean; at?: string }[] | null }>(() =>
      supabase.from("ateliers").select("reponses").eq("user_id", userId).gte("vu_at", since).limit(100),
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
    ...ateliers.flatMap((r) => (Array.isArray(r.reponses) ? r.reponses : []).filter((x) => x.k !== "calc" && x.at).map((x) => ({ at: x.at as string, n: 1, correct: x.ok ? 1 : 0 }))),
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

/** Heure de Paris (0–23). */
export function parisHour(d: Date): number {
  return Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: TZ }).format(d)) % 24;
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

