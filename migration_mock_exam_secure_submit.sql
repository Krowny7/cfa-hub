-- Corrige une fuite de réponses sur les examens blancs : la page envoyait
-- correct_index/explanation au navigateur dès le début de l'examen (avant
-- même de répondre), visible via les devtools — même piège déjà corrigé
-- pour les QCM/exercices (voir migration_fix_answer_leak.sql). Ici, la
-- correction se fait ENTIÈREMENT côté serveur, comme pour
-- award_quiz_question_xp / award_exercise_xp.
--
-- Stocke aussi les réponses données par l'utilisateur (colonne `answers`)
-- pour que la correction (bonnes/mauvaises réponses) reste consultable en
-- revenant sur la page plus tard, pas seulement juste après avoir rendu
-- la copie.

ALTER TABLE mock_exam_results ADD COLUMN IF NOT EXISTS answers jsonb;

CREATE OR REPLACE FUNCTION submit_mock_exam(p_exam_id uuid, p_answers jsonb, p_duration_seconds int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_registered  boolean;
  v_status      text;
  v_score       int := 0;
  v_total       int := 0;
  v_review      json;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = auth.uid()
  ) INTO v_registered;

  IF NOT v_registered THEN
    RAISE EXCEPTION 'Not registered for this exam';
  END IF;

  SELECT status INTO v_status FROM mock_exams WHERE id = p_exam_id;
  IF v_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Exam is not open';
  END IF;

  IF EXISTS(SELECT 1 FROM mock_exam_results WHERE exam_id = p_exam_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Already submitted';
  END IF;

  -- p_answers: [{"question_id": "...", "selected_index": 0|1|2|null}, ...]
  WITH given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(p_answers) AS elem
  ),
  scored AS (
    SELECT
      meq.position,
      qq.id AS question_id,
      qq.prompt,
      qq.choices,
      qq.correct_index,
      qq.explanation,
      g.selected_index,
      (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index) AS is_correct
    FROM mock_exam_questions meq
    JOIN quiz_questions qq ON qq.id = meq.question_id
    LEFT JOIN given g ON g.question_id = qq.id
    WHERE meq.exam_id = p_exam_id
    ORDER BY meq.position
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
      'selected_index', selected_index,
      'is_correct', is_correct
    ) ORDER BY position)
  INTO v_score, v_total, v_review
  FROM scored;

  INSERT INTO mock_exam_results (exam_id, user_id, score, total, duration_seconds, answers)
  VALUES (p_exam_id, auth.uid(), v_score, v_total, p_duration_seconds, p_answers);

  RETURN json_build_object('score', v_score, 'total', v_total, 'review', v_review);
END;
$$;

-- get_mock_exam_review : reconstruit la correction pour un utilisateur qui a
-- déjà rendu sa copie (revisite la page plus tard) — mêmes données que la
-- réponse de submit_mock_exam, sans jamais exposer correct_index avant la
-- soumission (ce SELECT n'est utilisé qu'après avoir vérifié qu'un résultat
-- existe déjà pour cet utilisateur).
CREATE OR REPLACE FUNCTION get_mock_exam_review(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_answers jsonb;
  v_review  json;
BEGIN
  SELECT answers INTO v_answers
  FROM mock_exam_results
  WHERE exam_id = p_exam_id AND user_id = auth.uid();

  IF v_answers IS NULL THEN
    RAISE EXCEPTION 'No submitted result for this exam';
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
    'selected_index', g.selected_index,
    'is_correct', (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index)
  ) ORDER BY meq.position)
  INTO v_review
  FROM mock_exam_questions meq
  JOIN quiz_questions qq ON qq.id = meq.question_id
  LEFT JOIN given g ON g.question_id = qq.id
  WHERE meq.exam_id = p_exam_id;

  RETURN v_review;
END;
$$;
