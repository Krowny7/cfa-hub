import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnswerMode, AnswerRow } from "@/lib/ficheLog";

export type SubmitResult = {
  isCorrect: boolean;
  correctIndex: number | null;
  explanation: string | null;
  xp: number;
};

export type NewAnswer = {
  set_id: string;
  question_id: string;
  is_correct: boolean;
  selected_index: number;
  run_id: string;
  mode: AnswerMode;
  // Jamais envoyés à la base (pas de colonne) : gardés seulement dans la
  // sauvegarde locale de secours, pour que l'export "pour l'IA" puisse
  // donner la correction même sans la fonction SQL de révision.
  correct_index?: number | null;
  explanation?: string | null;
};

// "account" : enregistré sur le compte (quiz_answer_log), retrouvé sur tous
// les appareils. "device" : table absente/inaccessible, les réponses sont
// gardées dans ce navigateur et seront envoyées au compte dès qu'elle existe.
export type LogStorage = "account" | "device";

export type FicheApi = {
  // Corrige côté serveur (award_quiz_question_xp) : seule source de la bonne
  // réponse, qui n'est jamais envoyée au client avant tentative.
  submitAnswer(setId: string, questionId: string, selectedIndex: number): Promise<SubmitResult>;
  logAnswer(row: NewAnswer): Promise<void>;
  fetchLog(setIds: string[]): Promise<{ rows: AnswerRow[]; storage: LogStorage }>;
  resetLog(setIds: string[]): Promise<void>;
  fetchReview(questionIds: string[]): Promise<Record<string, { correctIndex: number; explanation: string | null }>>;
};

type LocalRow = AnswerRow & { correct_index?: number | null; explanation?: string | null };

const PAGE = 1000; // limite de lignes par requête côté PostgREST
const BATCH = 200;
const LOCAL_PREFIX = "cfa_fiche_log:";

function loadLocal(uid: string): LocalRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + uid);
    return raw ? (JSON.parse(raw) as LocalRow[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(uid: string, rows: LocalRow[]): void {
  try {
    if (rows.length === 0) localStorage.removeItem(LOCAL_PREFIX + uid);
    else localStorage.setItem(LOCAL_PREFIX + uid, JSON.stringify(rows));
  } catch {}
}

function toDbRow(r: LocalRow, uid: string) {
  const { correct_index: _c, explanation: _e, ...rest } = r;
  void _c;
  void _e;
  return { ...rest, user_id: uid };
}

export function createSupabaseFicheApi(supabase: SupabaseClient): FicheApi {
  // getSession lit la session en cache (pas d'aller-retour réseau).
  async function uid(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  }

  return {
    async submitAnswer(setId, questionId, selectedIndex) {
      const { data, error } = await supabase.rpc("award_quiz_question_xp", {
        p_set_id: setId,
        p_question_id: questionId,
        p_selected_index: selectedIndex,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as {
        is_correct?: boolean;
        correct_index?: number;
        explanation?: string | null;
        xp_awarded?: number;
      } | null;
      return {
        isCorrect: Boolean(row?.is_correct),
        correctIndex: typeof row?.correct_index === "number" ? row.correct_index : null,
        explanation: row?.explanation ?? null,
        xp: Number(row?.xp_awarded ?? 0) || 0,
      };
    },

    async logAnswer(row) {
      const id = await uid();
      if (!id) return;
      const local: LocalRow = { ...row, answered_at: new Date().toISOString() };
      const { error } = await supabase.from("quiz_answer_log").insert(toDbRow(local, id));
      if (!error) return;
      // Table absente (migration pas appliquée) ou réseau coupé : on ne perd
      // jamais la réponse, elle est gardée ici puis envoyée plus tard.
      saveLocal(id, [...loadLocal(id), local]);
    },

    async fetchLog(setIds) {
      const id = await uid();
      const local = id ? loadLocal(id) : [];
      const mine = local.filter((r) => setIds.includes(r.set_id));
      if (setIds.length === 0) return { rows: [], storage: "account" };

      const dbRows: AnswerRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("quiz_answer_log")
          .select("question_id,set_id,is_correct,selected_index,run_id,mode,answered_at")
          .in("set_id", setIds)
          .order("answered_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) return { rows: mine, storage: "device" };
        dbRows.push(...((data ?? []) as AnswerRow[]));
        if (!data || data.length < PAGE) break;
      }

      // La base répond : on y envoie ce qui avait été gardé localement
      // (uniquement les sets de cette fiche, dont l'existence est avérée).
      if (id && mine.length > 0) {
        let sent = 0;
        for (; sent < mine.length; sent += BATCH) {
          const batch = mine.slice(sent, sent + BATCH).map((r) => toDbRow(r, id));
          const { error } = await supabase.from("quiz_answer_log").insert(batch);
          if (error) break;
        }
        // Ce qui n'a pas pu partir (lot refusé) reste localement et sera
        // renvoyé au prochain chargement — sans doublon pour les lots déjà
        // acceptés.
        const remaining = mine.slice(sent);
        saveLocal(id, [...local.filter((r) => !setIds.includes(r.set_id)), ...remaining]);
        return { rows: [...dbRows, ...mine], storage: "account" };
      }
      return { rows: dbRows, storage: "account" };
    },

    async resetLog(setIds) {
      if (setIds.length === 0) return;
      const id = await uid();
      if (id) saveLocal(id, loadLocal(id).filter((r) => !setIds.includes(r.set_id)));
      const { error } = await supabase.from("quiz_answer_log").delete().in("set_id", setIds);
      // Table absente : rien d'autre à effacer que la copie locale.
      if (error && error.code !== "PGRST205" && error.code !== "42P01") throw error;
    },

    async fetchReview(questionIds) {
      if (questionIds.length === 0) return {};
      const out: Record<string, { correctIndex: number; explanation: string | null }> = {};
      const { data } = await supabase.rpc("get_answered_question_review", { p_question_ids: questionIds });
      for (const r of (data ?? []) as { question_id: string; correct_index: number; explanation: string | null }[]) {
        out[r.question_id] = { correctIndex: r.correct_index, explanation: r.explanation };
      }
      const id = await uid();
      if (id) {
        for (const r of loadLocal(id)) {
          if (!out[r.question_id] && typeof r.correct_index === "number") {
            out[r.question_id] = { correctIndex: r.correct_index, explanation: r.explanation ?? null };
          }
        }
      }
      return out;
    },
  };
}
