-- Deux améliorations pour les sessions d'entraînement ciblé (/practice) :
--
-- 1) Persistance complète : contrairement au choix fait pour les essais de
--    reprise d'examen (mock_exam_attempts, volontairement score-only pour
--    gagner de la place), ici l'utilisateur veut pouvoir revenir sur une
--    ancienne session et revoir sa correction / recopier pour IA bien après
--    coup. On stocke donc les réponses données (comme mock_exam_results),
--    et get_practice_session_review reconstruit la correction à la demande.
--
-- 2) Branchement sur le système d'XP : chaque question réussie pour la
--    PREMIÈRE fois (tous modes confondus — QCM, exercices, examen blanc,
--    entraînement ciblé partagent la même table anti-farming
--    quiz_question_progress) rapporte du XP, exactement comme
--    award_quiz_question_xp/award_exercise_xp (10/15/20 XP selon la
--    difficulty du set). Réutiliser quiz_question_progress évite tout
--    double-comptage entre les différentes fonctionnalités.

ALTER TABLE practice_session_results ADD COLUMN IF NOT EXISTS answers jsonb;

CREATE OR REPLACE FUNCTION submit_practice_session(p_topics text[], p_format int, p_answers jsonb, p_duration_seconds int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_score      int := 0;
  v_total      int := 0;
  v_review     json;
  v_xp_awarded int := 0;
BEGIN
  IF p_format NOT IN (90, 180) THEN
    RAISE EXCEPTION 'Invalid format';
  END IF;

  WITH given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(p_answers) AS elem
  ),
  scored AS (
    SELECT
      qq.id AS question_id,
      qq.prompt,
      qq.choices,
      qq.correct_index,
      qq.explanation,
      lf.name AS topic,
      qs.difficulty,
      g.selected_index,
      (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index) AS is_correct
    FROM given g
    JOIN quiz_questions qq ON qq.id = g.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  ),
  -- Anti-farming : seules les questions réussies et jamais créditées avant
  -- (tous modes confondus) rapportent du XP.
  credited AS (
    INSERT INTO quiz_question_progress (user_id, question_id)
    SELECT auth.uid(), s.question_id
    FROM scored s
    WHERE s.is_correct
      AND NOT EXISTS (
        SELECT 1 FROM quiz_question_progress qp
        WHERE qp.user_id = auth.uid() AND qp.question_id = s.question_id
      )
    ON CONFLICT DO NOTHING
    RETURNING question_id
  ),
  xp_calc AS (
    SELECT
      c.question_id,
      s.topic,
      CASE COALESCE(s.difficulty, 1) WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END AS xp
    FROM credited c
    JOIN scored s ON s.question_id = c.question_id
  ),
  ins_events AS (
    INSERT INTO xp_events (user_id, xp, source, meta)
    SELECT auth.uid(), xp, 'practice_session', jsonb_build_object('question_id', question_id, 'topic', topic)
    FROM xp_calc
    RETURNING xp
  )
  SELECT
    count(*) FILTER (WHERE is_correct),
    count(*),
    json_agg(json_build_object(
      'question_id', question_id,
      'prompt', prompt,
      'choices', choices,
      'correct_index', correct_index,
      'explanation', explanation,
      'topic', topic,
      'selected_index', selected_index,
      'is_correct', is_correct
    )),
    (SELECT coalesce(sum(xp), 0) FROM ins_events)
  INTO v_score, v_total, v_review, v_xp_awarded
  FROM scored;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No answers submitted';
  END IF;

  IF v_xp_awarded > 0 THEN
    UPDATE profiles SET xp_total = xp_total + v_xp_awarded WHERE id = auth.uid();
  END IF;

  INSERT INTO practice_session_results (user_id, topics, format, question_count, score, total, duration_seconds, answers)
  VALUES (auth.uid(), p_topics, p_format, v_total, v_score, v_total, p_duration_seconds, p_answers);

  RETURN json_build_object('score', v_score, 'total', v_total, 'review', v_review, 'xp_awarded', v_xp_awarded);
END;
$$;

-- Reconstruit la correction complète d'une ancienne session à partir des
-- réponses stockées — même principe que get_mock_exam_review.
CREATE OR REPLACE FUNCTION get_practice_session_review(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_answers jsonb;
  v_review  json;
BEGIN
  SELECT answers INTO v_answers
  FROM practice_session_results
  WHERE id = p_session_id AND user_id = auth.uid();

  IF v_answers IS NULL THEN
    RAISE EXCEPTION 'No stored answers for this session';
  END IF;

  WITH given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(v_answers) AS elem
  )
  SELECT json_agg(json_build_object(
    'question_id', qq.id,
    'prompt', qq.prompt,
    'choices', qq.choices,
    'correct_index', qq.correct_index,
    'explanation', qq.explanation,
    'topic', lf.name,
    'selected_index', g.selected_index,
    'is_correct', (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index)
  ))
  INTO v_review
  FROM given g
  JOIN quiz_questions qq ON qq.id = g.question_id
  JOIN quiz_sets qs ON qs.id = qq.set_id
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id;

  RETURN v_review;
END;
$$;
