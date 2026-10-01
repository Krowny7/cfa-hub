-- Journal des réponses aux quiz de fiches : une ligne par réponse, rattachée
-- au compte. C'est le socle des fonctions "Mes erreurs", progression par
-- page, graphique de progression et export pour l'IA sur les fiches
-- (components/FicheWorkspace.tsx).
--
-- Jusqu'ici, seule la PREMIÈRE bonne réponse était mémorisée
-- (quiz_question_progress, pour l'anti-farming XP) et les stats par set
-- vivaient en localStorage — impossible de retrouver les questions ratées.
--
-- run_id regroupe les réponses d'une même série (un quiz de page, un
-- "rejouer mes erreurs" ou un bilan aléatoire) pour tracer une courbe de
-- score par série. Attention : ON DELETE CASCADE sur set_id/question_id —
-- re-seeder un set de drill (le script supprime puis recrée par titre)
-- efface donc le journal associé, puisque les questions changent d'id.

CREATE TABLE IF NOT EXISTS quiz_answer_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id         uuid        NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
  question_id    uuid        NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  is_correct     boolean     NOT NULL,
  selected_index integer     NOT NULL,
  run_id         uuid        NOT NULL,
  mode           text        NOT NULL CHECK (mode IN ('page', 'errors', 'mixed')),
  answered_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_answer_log_user_set_idx
  ON quiz_answer_log (user_id, set_id, answered_at);
CREATE INDEX IF NOT EXISTS quiz_answer_log_user_question_idx
  ON quiz_answer_log (user_id, question_id, answered_at);

ALTER TABLE quiz_answer_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answer_log_select_own" ON quiz_answer_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "answer_log_insert_own" ON quiz_answer_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- Le bouton "Réinitialiser" de l'interface supprime ses propres lignes.
CREATE POLICY "answer_log_delete_own" ON quiz_answer_log
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Correction (bonne réponse + explication) des questions que l'utilisateur
-- a DÉJÀ répondues. Sert à l'export "Copier pour l'IA" de la liste d'erreurs,
-- où le client n'a plus les corrections (elles ne sont révélées qu'après
-- tentative, voir migration_fix_answer_leak.sql). Ne renvoie rien pour une
-- question jamais tentée : pas de fuite de réponses.
CREATE OR REPLACE FUNCTION get_answered_question_review(p_question_ids uuid[])
RETURNS TABLE (question_id uuid, correct_index integer, explanation text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT q.id, q.correct_index, q.explanation
  FROM quiz_questions q
  WHERE q.id = ANY(p_question_ids)
    AND EXISTS (
      SELECT 1 FROM quiz_answer_log l
      WHERE l.user_id = auth.uid() AND l.question_id = q.id
    );
$$;

REVOKE ALL ON FUNCTION get_answered_question_review(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_answered_question_review(uuid[]) TO authenticated;
