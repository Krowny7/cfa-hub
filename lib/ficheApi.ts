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
};

export type FicheApi = {
  // Corrige côté serveur (award_quiz_question_xp) : seule source de la bonne
  // réponse, qui n'est jamais envoyée au client avant tentative.
  submitAnswer(setId: string, questionId: string, selectedIndex: number): Promise<SubmitResult>;
  logAnswer(row: NewAnswer): Promise<void>;
  // available=false : la table n'existe pas encore (migration pas appliquée)
  // ou la requête a échoué — l'interface reste utilisable, sans historique.
  fetchLog(setIds: string[]): Promise<{ rows: AnswerRow[]; available: boolean }>;
  resetLog(setIds: string[]): Promise<void>;
  fetchReview(questionIds: string[]): Promise<Record<string, { correctIndex: number; explanation: string | null }>>;
};

const PAGE = 1000; // limite de lignes par requête côté PostgREST

export function createSupabaseFicheApi(supabase: SupabaseClient): FicheApi {
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
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { error } = await supabase.from("quiz_answer_log").insert({ ...row, user_id: auth.user.id });
      if (error) throw error;
    },

    async fetchLog(setIds) {
      if (setIds.length === 0) return { rows: [], available: true };
      const rows: AnswerRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("quiz_answer_log")
          .select("question_id,set_id,is_correct,selected_index,run_id,mode,answered_at")
          .in("set_id", setIds)
          .order("answered_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) return { rows: [], available: false };
        rows.push(...((data ?? []) as AnswerRow[]));
        if (!data || data.length < PAGE) break;
      }
      return { rows, available: true };
    },

    async resetLog(setIds) {
      if (setIds.length === 0) return;
      const { error } = await supabase.from("quiz_answer_log").delete().in("set_id", setIds);
      if (error) throw error;
    },

    async fetchReview(questionIds) {
      if (questionIds.length === 0) return {};
      const { data, error } = await supabase.rpc("get_answered_question_review", {
        p_question_ids: questionIds,
      });
      if (error) return {};
      const out: Record<string, { correctIndex: number; explanation: string | null }> = {};
      for (const r of (data ?? []) as { question_id: string; correct_index: number; explanation: string | null }[]) {
        out[r.question_id] = { correctIndex: r.correct_index, explanation: r.explanation };
      }
      return out;
    },
  };
}
