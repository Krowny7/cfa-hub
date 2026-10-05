// « Ratures » (Moi › Erreurs) : agrège le journal des réponses aux quiz de
// fiches (quiz_answer_log) avec la même règle que les fiches (lib/ficheLog) :
// une question est « à reprendre » tant qu'elle n'a pas été réussie 2 fois
// d'affilée après une erreur. Quand elle sort du carnet, elle est « rayée » :
// on raye, on n'efface pas (les rayures se comptent et restent visibles).
// Côté serveur uniquement. Jamais de bonne réponse ici : seulement l'énoncé,
// la fiche et la page, pour renvoyer vers la fiche.
import type { SupabaseClient } from "@supabase/supabase-js";
import { STREAK_TO_CLEAR, computeQuestionStates, type AnswerRow } from "@/lib/ficheLog";
import type { FicheErrors, FicheErrorGroup, FicheErrorItem } from "@/components/moi/types";

const PAGE = 1000;
const MAX_ROWS = 20000;
const ITEMS_SHOWN = 30;
const RAYEES_SHOWN = 6;
const WEEK_MS = 7 * 86_400_000;

// Fiches PDF (titre des sets de drill : « <Fiche> — Drill Fiche Page N (…) »).
const FICHES: Record<string, string> = {
  "Fixed Income": "/fiches/fixed-income",
  Equity: "/fiches/equity",
  "Financial Statement Analysis": "/fiches/financial-statement-analysis",
  "Portfolio Management": "/fiches/portfolio-management",
};

function ficheOf(title: string, setId: string) {
  const name = title.split(" — ")[0].trim() || title;
  const page = Number(/Page ([0-9]+)/.exec(title)?.[1]);
  return { fiche: name, href: FICHES[name] ? `${FICHES[name]}?onglet=erreurs` : `/qcm/${setId}`, page: Number.isFinite(page) ? page : null };
}

export const NO_ERRORS: FicheErrors = { available: true, total: 0, answered: 0, groups: [], items: [], rayees: [], reprises: { semaine: 0, total: 0 } };

/**
 * Les rayures du journal : chaque fois qu'une question quitte le carnet (la
 * réussite qui complète STREAK_TO_CLEAR bonnes réponses d'affilée). Une
 * question peut être rayée plusieurs fois. Lignes triées par date croissante.
 */
function rayures(rows: AnswerRow[]): { question_id: string; at: string }[] {
  const st = new Map<string, { wrong: number; streak: number; pool: boolean }>();
  const out: { question_id: string; at: string }[] = [];
  for (const r of rows) {
    const s = st.get(r.question_id) ?? { wrong: 0, streak: 0, pool: false };
    if (r.is_correct) s.streak += 1;
    else {
      s.wrong += 1;
      s.streak = 0;
    }
    const pool = s.wrong > 0 && s.streak < STREAK_TO_CLEAR;
    if (s.pool && !pool) out.push({ question_id: r.question_id, at: r.answered_at });
    s.pool = pool;
    st.set(r.question_id, s);
  }
  return out;
}

/**
 * @param supabase client de l'utilisateur (le journal est protégé par RLS)
 * @param reader client pour lire titres de sets et énoncés (admin si dispo)
 * @param now instant de référence (rayures de la semaine)
 */
export async function getFicheErrors(supabase: SupabaseClient, reader: SupabaseClient, userId: string, now = Date.now()): Promise<FicheErrors> {
  const rows: AnswerRow[] = [];
  try {
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await supabase
        .from("quiz_answer_log")
        .select("question_id,set_id,is_correct,selected_index,run_id,mode,answered_at")
        .eq("user_id", userId)
        .order("answered_at", { ascending: true })
        .range(from, from + PAGE - 1);
      // Table absente (migration pas appliquée) : les réponses restent dans
      // le navigateur, visibles depuis chaque fiche.
      if (error) return { ...NO_ERRORS, available: false };
      rows.push(...((data ?? []) as AnswerRow[]));
      if (!data || data.length < PAGE) break;
    }
  } catch {
    return { ...NO_ERRORS, available: false };
  }
  if (rows.length === 0) return NO_ERRORS;
  rows.sort((a, b) => (a.answered_at < b.answered_at ? -1 : a.answered_at > b.answered_at ? 1 : 0));

  const states = computeQuestionStates(rows);
  const lastWrong = new Map<string, string>();
  const setOfQuestion = new Map<string, string>();
  for (const r of rows) {
    setOfQuestion.set(r.question_id, r.set_id);
    if (!r.is_correct) lastWrong.set(r.question_id, r.answered_at);
  }

  // rayures : le compte (semaine, depuis le début) et les dernières questions rayées encore hors du carnet
  const events = rayures(rows);
  const reprises = { semaine: events.filter((e) => new Date(e.at).getTime() >= now - WEEK_MS).length, total: events.length };
  const clearedAt = new Map<string, string>();
  for (const e of events) clearedAt.set(e.question_id, e.at);
  const rayeesIds = [...clearedAt.entries()]
    .filter(([id]) => !states.get(id)?.inErrorPool)
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .slice(0, RAYEES_SHOWN)
    .map(([id]) => id);

  const pool = [...states.entries()].filter(([, s]) => s.inErrorPool).map(([id, s]) => ({ id, wrong: s.wrong }));
  if (pool.length === 0 && rayeesIds.length === 0) return { ...NO_ERRORS, answered: states.size, reprises };

  const ids = [...pool.map((p) => p.id), ...rayeesIds];
  const setIds = [...new Set(ids.map((id) => setOfQuestion.get(id)).filter((x): x is string => !!x))];
  const titles = new Map<string, string>();
  const prompts = new Map<string, string>();
  // questions sorties de leur page (rangées dans une réserve quand une fiche
  // est raccourcie) : plus rien à reprendre sur la fiche, on ne les compte plus
  const retirees = new Set<string>();
  try {
    const [{ data: sets }, { data: questions }] = await Promise.all([
      reader.from("quiz_sets").select("id,title").in("id", setIds),
      reader.from("quiz_questions").select("id,prompt,set_id").in("id", ids.slice(0, 1000)),
    ]);
    (sets ?? []).forEach((s: { id: string; title: string }) => titles.set(s.id, s.title));
    (questions ?? []).forEach((q: { id: string; prompt: string; set_id: string }) => {
      prompts.set(q.id, q.prompt);
      if (q.set_id !== setOfQuestion.get(q.id)) retirees.add(q.id);
    });
  } catch {
    // titres indisponibles : on garde les compteurs
  }

  const itemOf = (id: string, wrong: number): FicheErrorItem => {
    const setId = setOfQuestion.get(id) ?? "";
    const f = ficheOf(titles.get(setId) ?? "Fiche", setId);
    return {
      questionId: id,
      setId,
      prompt: prompts.get(id) ?? "Question de fiche",
      fiche: f.fiche,
      href: f.href,
      page: f.page,
      wrong,
      lastWrongAt: lastWrong.get(id) ?? "",
    };
  };

  const items = pool
    .filter((p) => !retirees.has(p.id))
    .map((p) => itemOf(p.id, p.wrong))
    .sort((a, b) => (a.lastWrongAt < b.lastWrongAt ? 1 : -1));
  const rayees = rayeesIds.filter((id) => !retirees.has(id)).map((id) => ({ ...itemOf(id, states.get(id)?.wrong ?? 1), clearedAt: clearedAt.get(id) ?? null }));

  const byFiche = new Map<string, FicheErrorGroup>();
  for (const it of items) {
    const g = byFiche.get(it.fiche) ?? { fiche: it.fiche, href: it.href, count: 0, pages: [] };
    g.count += 1;
    if (it.page !== null && !g.pages.includes(it.page)) g.pages.push(it.page);
    byFiche.set(it.fiche, g);
  }
  const groups = [...byFiche.values()].map((g) => ({ ...g, pages: g.pages.sort((a, b) => a - b) })).sort((a, b) => b.count - a.count);

  return { available: true, total: items.length, answered: states.size, groups, items: items.slice(0, ITEMS_SHOWN), rayees, reprises };
}
