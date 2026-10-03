// « Toutes mes erreurs » : agrège le journal des réponses aux quiz de fiches
// (quiz_answer_log) avec la même règle que les fiches (lib/ficheLog) : une
// question est « à revoir » tant qu'elle n'a pas été réussie 2 fois d'affilée
// après une erreur. Côté serveur uniquement. Jamais de bonne réponse ici :
// seulement l'énoncé, la fiche et la page, pour renvoyer vers la fiche.
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeQuestionStates, type AnswerRow } from "@/lib/ficheLog";
import type { FicheErrors, FicheErrorGroup, FicheErrorItem } from "@/components/moi/types";

const PAGE = 1000;
const MAX_ROWS = 20000;
const ITEMS_SHOWN = 30;

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

export const NO_ERRORS: FicheErrors = { available: true, total: 0, answered: 0, groups: [], items: [] };

/**
 * @param supabase client de l'utilisateur (le journal est protégé par RLS)
 * @param reader client pour lire titres de sets et énoncés (admin si dispo)
 */
export async function getFicheErrors(supabase: SupabaseClient, reader: SupabaseClient, userId: string): Promise<FicheErrors> {
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

  const states = computeQuestionStates(rows);
  const lastWrong = new Map<string, string>();
  const setOfQuestion = new Map<string, string>();
  for (const r of rows) {
    setOfQuestion.set(r.question_id, r.set_id);
    if (!r.is_correct) lastWrong.set(r.question_id, r.answered_at);
  }
  const pool = [...states.entries()].filter(([, s]) => s.inErrorPool).map(([id, s]) => ({ id, wrong: s.wrong }));
  if (pool.length === 0) return { ...NO_ERRORS, answered: states.size };

  const setIds = [...new Set(pool.map((p) => setOfQuestion.get(p.id)).filter((x): x is string => !!x))];
  const titles = new Map<string, string>();
  const prompts = new Map<string, string>();
  try {
    const [{ data: sets }, { data: questions }] = await Promise.all([
      reader.from("quiz_sets").select("id,title").in("id", setIds),
      reader.from("quiz_questions").select("id,prompt").in("id", pool.map((p) => p.id).slice(0, 1000)),
    ]);
    (sets ?? []).forEach((s: { id: string; title: string }) => titles.set(s.id, s.title));
    (questions ?? []).forEach((q: { id: string; prompt: string }) => prompts.set(q.id, q.prompt));
  } catch {
    // titres indisponibles : on garde les compteurs
  }

  const items: FicheErrorItem[] = pool
    .map((p) => {
      const setId = setOfQuestion.get(p.id) ?? "";
      const f = ficheOf(titles.get(setId) ?? "Fiche", setId);
      return {
        questionId: p.id,
        setId,
        prompt: prompts.get(p.id) ?? "Question de fiche",
        fiche: f.fiche,
        href: f.href,
        page: f.page,
        wrong: p.wrong,
        lastWrongAt: lastWrong.get(p.id) ?? "",
      };
    })
    .sort((a, b) => (a.lastWrongAt < b.lastWrongAt ? 1 : -1));

  const byFiche = new Map<string, FicheErrorGroup>();
  for (const it of items) {
    const g = byFiche.get(it.fiche) ?? { fiche: it.fiche, href: it.href, count: 0, pages: [] };
    g.count += 1;
    if (it.page !== null && !g.pages.includes(it.page)) g.pages.push(it.page);
    byFiche.set(it.fiche, g);
  }
  const groups = [...byFiche.values()].map((g) => ({ ...g, pages: g.pages.sort((a, b) => a - b) })).sort((a, b) => b.count - a.count);

  return { available: true, total: items.length, answered: states.size, groups, items: items.slice(0, ITEMS_SHOWN) };
}
