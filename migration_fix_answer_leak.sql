-- ============================================================================
-- Fix: ne plus envoyer la bonne réponse au client avant qu'il ait répondu.
--
-- Constat (revue de code) : app/qcm/[id]/page.tsx et app/exercises/[id]/page.tsx
-- envoyaient correct_index / correct_answer / explanation dans le payload
-- initial de la page, avant toute tentative de réponse — visible dans le
-- state React / l'onglet réseau du navigateur. Le RPC de XP revérifiait déjà
-- tout côté serveur (pas de farming possible), mais ça cassait la propriété
-- "quiz honnête" : n'importe qui pouvait inspecter la page et voir la réponse
-- avant de répondre.
--
-- Fix : les deux RPC award_*_xp renvoient désormais la bonne réponse (et son
-- explication) dans leur résultat JSON — le client ne la reçoit qu'APRÈS avoir
-- soumis une réponse. Le code applicatif (app/*/[id]/page.tsx +
-- components/Quiz*/Exercise*) est mis à jour en miroir dans le même commit.
-- ============================================================================

CREATE OR REPLACE FUNCTION award_quiz_question_xp(
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
  FROM quiz_sets WHERE id = p_set_id;

  SELECT correct_index, explanation INTO v_correct_index, v_explanation
  FROM quiz_questions
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
    SELECT 1 FROM quiz_question_progress
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

  INSERT INTO quiz_question_progress (user_id, question_id)
  VALUES (auth.uid(), p_question_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO xp_events (user_id, xp, source, meta)
  VALUES (
    auth.uid(), v_xp, 'quiz_question',
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

CREATE OR REPLACE FUNCTION award_exercise_xp(
  p_set_id uuid,
  p_question_id uuid,
  p_answer numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_official      boolean;
  v_published     boolean;
  v_difficulty    integer;
  v_correct       numeric;
  v_tolerance     numeric;
  v_explanation   text;
  v_is_correct    boolean;
  v_already       boolean;
  v_xp            integer := 0;
  v_xp_total      integer;
BEGIN
  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM exercise_sets WHERE id = p_set_id;

  SELECT correct_answer, tolerance, explanation INTO v_correct, v_tolerance, v_explanation
  FROM exercise_questions
  WHERE id = p_question_id AND set_id = p_set_id;

  v_is_correct := (v_correct IS NOT NULL AND abs(p_answer - v_correct) <= COALESCE(v_tolerance, 0.01));

  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) OR NOT v_is_correct THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', COALESCE(v_is_correct, false),
      'correct_answer', v_correct,
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
      'correct_answer', v_correct, 'explanation', v_explanation
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
    'correct_answer', v_correct, 'explanation', v_explanation
  );
END;
$$;
