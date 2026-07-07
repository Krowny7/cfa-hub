-- ============================================================================
-- Exercices → format QCM à 3 options (A/B/C), fidèle au vrai format CFA
-- ("... is closest to:") au lieu d'une réponse numérique libre à taper.
--
-- exercise_questions passe de (correct_answer numeric, tolerance, unit) à
-- (choices jsonb, correct_index integer) — même forme que quiz_questions.
-- Les anciennes colonnes numériques sont supprimées : le nouveau format les
-- remplace entièrement, aucun exercice existant n'en dépend après réécriture
-- du contenu Fixed Income (scripts/seed-exercises-fixed-income.mjs).
-- ============================================================================

ALTER TABLE exercise_questions ADD COLUMN IF NOT EXISTS choices jsonb;
ALTER TABLE exercise_questions ADD COLUMN IF NOT EXISTS correct_index integer;

-- Vide la table avant de retirer les anciennes colonnes NOT NULL-compatibles —
-- le seul set existant (Fixed Income) est de toute façon réécrit par le script
-- de seed juste après cette migration.
DELETE FROM exercise_questions;

ALTER TABLE exercise_questions ALTER COLUMN choices SET NOT NULL;
ALTER TABLE exercise_questions ALTER COLUMN correct_index SET NOT NULL;
ALTER TABLE exercise_questions DROP COLUMN IF EXISTS correct_answer;
ALTER TABLE exercise_questions DROP COLUMN IF EXISTS tolerance;
ALTER TABLE exercise_questions DROP COLUMN IF EXISTS unit;

-- award_exercise_xp vérifie désormais correct_index (comme
-- award_quiz_question_xp) au lieu d'une tolérance numérique.
CREATE OR REPLACE FUNCTION award_exercise_xp(
  p_set_id uuid,
  p_question_id uuid,
  p_selected_index integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_official      boolean;
  v_published     boolean;
  v_difficulty    integer;
  v_correct_index integer;
  v_explanation   text;
  v_is_correct    boolean;
  v_already       boolean;
  v_xp            integer := 0;
  v_xp_total      integer;
BEGIN
  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM exercise_sets WHERE id = p_set_id;

  SELECT correct_index, explanation INTO v_correct_index, v_explanation
  FROM exercise_questions
  WHERE id = p_question_id AND set_id = p_set_id;

  v_is_correct := (v_correct_index IS NOT NULL AND p_selected_index = v_correct_index);

  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) OR NOT v_is_correct THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', COALESCE(v_is_correct, false),
      'correct_index', v_correct_index,
      'explanation', v_explanation
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM exercise_question_progress
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) INTO v_already;

  IF v_already THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
      'correct_index', v_correct_index, 'explanation', v_explanation
    );
  END IF;

  v_xp := CASE COALESCE(v_difficulty, 1)
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    ELSE 10
  END;

  INSERT INTO exercise_question_progress (user_id, question_id)
  VALUES (auth.uid(), p_question_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO xp_events (user_id, xp, source, meta)
  VALUES (
    auth.uid(), v_xp, 'exercise_question',
    jsonb_build_object('set_id', p_set_id, 'question_id', p_question_id)
  );

  UPDATE profiles
  SET xp_total = xp_total + v_xp
  WHERE id = auth.uid()
  RETURNING xp_total INTO v_xp_total;

  RETURN json_build_object(
    'xp_awarded', v_xp, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
    'correct_index', v_correct_index, 'explanation', v_explanation
  );
END;
$$;
