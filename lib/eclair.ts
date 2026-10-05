import type { SupabaseClient } from "@supabase/supabase-js";

// Séries éclair : des séries de 5 questions de cours, sans calcul, à volonté
// (migration_series_eclair.sql). Tirées pour soi dans la liste des 5 du jour,
// sans revoir une question tant qu'il en reste de nouvelles ; correction
// question par question. Les 5 du jour, eux, sont les mêmes pour tout le monde.

export const ECLAIR_HREF = "/eclair";

export type EclairQuestion = {
  position: number;
  id: string;
  prompt: string;
  choices: string[];
  /** clé de matière (ethics, quant…) */
  topic: string | null;
  /** réponse donnée ; null tant qu'on n'a pas répondu */
  selectedIndex: number | null;
  /** la correction, seulement une fois répondu */
  correctIndex: number | null;
  explanation: string | null;
};

export type EclairSerie = {
  id: string;
  startedAt: string;
  questions: EclairQuestion[];
};

export type EclairStart = { kind: "ok"; serie: EclairSerie } | { kind: "soon" } | { kind: "error"; message: string };

export type EclairAnswer = { selectedIndex: number | null; correctIndex: number | null; explanation: string | null; isCorrect: boolean };

export type EclairFinish = { score: number; total: number; seconds: number; xpAwarded: number; today: number };

/** Mes séries rendues : aujourd'hui (jour de Paris), en tout, et les dernières. */
export type EclairStats = {
  today: number;
  total: number;
  /** précision des 20 dernières séries (%) ; null sans série */
  recentPct: number | null;
};

type Raw = Record<string, unknown>;
const num = (v: unknown, d = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
const numOrNull = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

/** RPC absente (migration pas encore collée) : la page dit « bientôt ». */
function absente(message: string | undefined, code?: string) {
  return code === "PGRST202" || code === "42883" || /could not find the function|does not exist/i.test(message ?? "");
}

function toQuestion(r: Raw): EclairQuestion {
  return {
    position: num(r.position),
    id: String(r.id ?? ""),
    prompt: String(r.prompt ?? ""),
    choices: Array.isArray(r.choices) ? (r.choices as unknown[]).map(String) : [],
    topic: r.topic ? String(r.topic) : null,
    selectedIndex: numOrNull(r.selected_index),
    correctIndex: numOrNull(r.correct_index),
    explanation: r.explanation ? String(r.explanation) : null,
  };
}

/** Commence une série, ou reprend celle en cours. */
export async function startEclair(supabase: SupabaseClient): Promise<EclairStart> {
  const { data, error } = await supabase.rpc("eclair_start");
  if (error) return absente(error.message, error.code) ? { kind: "soon" } : { kind: "error", message: error.message };
  const r = (data ?? {}) as Raw;
  if (!r.id) return { kind: "soon" };
  const questions = Array.isArray(r.questions) ? (r.questions as Raw[]).map(toQuestion).sort((a, b) => a.position - b.position) : [];
  return { kind: "ok", serie: { id: String(r.id), startedAt: String(r.started_at ?? ""), questions } };
}

/** Répond (définitivement) et reçoit la correction. */
export async function answerEclair(supabase: SupabaseClient, serieId: string, position: number, choice: number): Promise<EclairAnswer> {
  const { data, error } = await supabase.rpc("eclair_answer", { p_id: serieId, p_position: position, p_choice: choice });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Raw;
  return {
    selectedIndex: numOrNull(r.selected_index),
    correctIndex: numOrNull(r.correct_index),
    explanation: r.explanation ? String(r.explanation) : null,
    isCorrect: r.is_correct === true,
  };
}

/** Rend la série : score, XP gagné, séries rendues aujourd'hui. */
export async function finishEclair(supabase: SupabaseClient, serieId: string): Promise<EclairFinish> {
  const { data, error } = await supabase.rpc("eclair_finish", { p_id: serieId });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Raw;
  return { score: num(r.score), total: num(r.total), seconds: num(r.seconds), xpAwarded: num(r.xp_awarded), today: num(r.today) };
}

/** Minuit à Paris, en ISO (même calcul que parisMidnight, module serveur de l'anneau du jour). */
function debutDuJourParis(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
  const jour = fmt.format(now);
  const base = Date.parse(jour + "T00:00:00Z");
  for (const h of [1, 2, 0]) {
    const c = base - h * 3600_000;
    if (fmt.format(new Date(c)) === jour && fmt.format(new Date(c - 1)) !== jour) return new Date(c).toISOString();
  }
  return new Date(base - 3600_000).toISOString();
}

/** Mes séries rendues (table absente : null, l'entrée reste discrète). */
export async function getEclairStats(supabase: SupabaseClient, userId: string): Promise<EclairStats | null> {
  try {
    const depuis = debutDuJourParis();
    const [jour, tout, recentes] = await Promise.all([
      supabase.from("eclair_series").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("finished_at", depuis),
      supabase.from("eclair_series").select("id", { count: "exact", head: true }).eq("user_id", userId).not("finished_at", "is", null),
      supabase.from("eclair_series").select("score,total").eq("user_id", userId).not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(20),
    ]);
    if (jour.error || tout.error || recentes.error) return null;
    const rows = (recentes.data ?? []) as { score: number | null; total: number | null }[];
    const justes = rows.reduce((s, r) => s + num(r.score), 0);
    const total = rows.reduce((s, r) => s + num(r.total), 0);
    return { today: jour.count ?? 0, total: tout.count ?? 0, recentPct: total > 0 ? Math.round((justes / total) * 100) : null };
  } catch {
    return null;
  }
}
