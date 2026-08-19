-- Permet de repasser un examen blanc déjà terminé, en mode entraînement :
--   - le premier essai reste "l'officiel" (mock_exam_results, inchangé,
--     compte pour le classement, conserve les réponses pour la correction) ;
--   - les essais suivants ("attempts") sont juste des entraînements : on
--     garde le score pour pouvoir le consulter plus tard, mais PAS les
--     réponses données (gain de place, et ça reste un essai secondaire).
-- Deux modes : 'full' (toutes les questions de l'examen) ou 'wrong_only'
-- (uniquement les questions ratées — ou non répondues — au tout premier
-- essai officiel).

CREATE TABLE IF NOT EXISTS mock_exam_attempts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          uuid        REFERENCES mock_exams(id) ON DELETE CASCADE NOT NULL,
  user_id          uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mode             text        CHECK (mode IN ('full', 'wrong_only')) NOT NULL,
  score            int         NOT NULL,
  total            int         NOT NULL,
  duration_seconds int,
  completed_at     timestamptz DEFAULT now()
);

ALTER TABLE mock_exam_attempts ENABLE ROW LEVEL SECURITY;

-- Pas de policy INSERT/UPDATE/DELETE : les écritures ne passent que par
-- submit_mock_exam_attempt (SECURITY DEFINER, bypass RLS en interne), donc
-- personne ne peut insérer un score bidon directement sur la table.
CREATE POLICY "mock_exam_attempts_read_own" ON mock_exam_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS mock_exam_attempts_exam_user
  ON mock_exam_attempts(exam_id, user_id, completed_at DESC);

CREATE OR REPLACE FUNCTION public.user_completed_mock_exam(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mock_exam_results
    WHERE exam_id = p_exam_id AND user_id = auth.uid()
  );
$$;

-- Questions pour un essai d'entraînement — jamais correct_index/explanation
-- (même principe que pour l'examen officiel, voir
-- migration_mock_exam_secure_submit.sql).
CREATE OR REPLACE FUNCTION get_mock_exam_retake_questions(p_exam_id uuid, p_mode text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_answers jsonb;
  v_result  json;
BEGIN
  IF NOT user_completed_mock_exam(p_exam_id) THEN
    RAISE EXCEPTION 'No completed attempt for this exam';
  END IF;
  IF p_mode NOT IN ('full', 'wrong_only') THEN
    RAISE EXCEPTION 'Invalid mode';
  END IF;

  IF p_mode = 'full' THEN
    SELECT json_agg(json_build_object(
      'id', qq.id, 'prompt', qq.prompt, 'choices', qq.choices, 'position', meq.position
    ) ORDER BY meq.position)
    INTO v_result
    FROM mock_exam_questions meq
    JOIN quiz_questions qq ON qq.id = meq.question_id
    WHERE meq.exam_id = p_exam_id;
  ELSE
    SELECT answers INTO v_answers
    FROM mock_exam_results
    WHERE exam_id = p_exam_id AND user_id = auth.uid();

    WITH given AS (
      SELECT
        (elem->>'question_id')::uuid AS question_id,
        NULLIF(elem->>'selected_index', '')::int AS selected_index
      FROM jsonb_array_elements(v_answers) AS elem
    )
    SELECT json_agg(json_build_object(
      'id', qq.id, 'prompt', qq.prompt, 'choices', qq.choices, 'position', meq.position
    ) ORDER BY meq.position)
    INTO v_result
    FROM mock_exam_questions meq
    JOIN quiz_questions qq ON qq.id = meq.question_id
    JOIN given g ON g.question_id = qq.id
    WHERE meq.exam_id = p_exam_id
      AND (g.selected_index IS NULL OR g.selected_index != qq.correct_index);
  END IF;

  RETURN coalesce(v_result, '[]'::json);
END;
$$;

-- Soumission d'un essai d'entraînement : recalcule le set de questions
-- attendu côté serveur (jamais de confiance dans la liste envoyée par le
-- client), score contre la vraie clé de correction, renvoie la correction
-- complète pour affichage immédiat mais ne stocke QUE le score (pas les
-- réponses) dans mock_exam_attempts.
CREATE OR REPLACE FUNCTION submit_mock_exam_attempt(p_exam_id uuid, p_mode text, p_answers jsonb, p_duration_seconds int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_orig_answers jsonb;
  v_score        int := 0;
  v_total        int := 0;
  v_review       json;
BEGIN
  IF NOT user_completed_mock_exam(p_exam_id) THEN
    RAISE EXCEPTION 'No completed attempt for this exam';
  END IF;
  IF p_mode NOT IN ('full', 'wrong_only') THEN
    RAISE EXCEPTION 'Invalid mode';
  END IF;

  SELECT answers INTO v_orig_answers
  FROM mock_exam_results
  WHERE exam_id = p_exam_id AND user_id = auth.uid();

  WITH given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(p_answers) AS elem
  ),
  orig_given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(v_orig_answers) AS elem
  ),
  target_questions AS (
    SELECT meq.position, meq.question_id
    FROM mock_exam_questions meq
    LEFT JOIN orig_given og ON og.question_id = meq.question_id
    WHERE meq.exam_id = p_exam_id
      AND (p_mode = 'full' OR og.selected_index IS NULL OR og.selected_index != (
        SELECT correct_index FROM quiz_questions WHERE id = meq.question_id
      ))
  ),
  scored AS (
    SELECT
      tq.position,
      qq.id AS question_id,
      qq.prompt,
      qq.choices,
      qq.correct_index,
      qq.explanation,
      lf.name AS topic,
      g.selected_index,
      (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index) AS is_correct
    FROM target_questions tq
    JOIN quiz_questions qq ON qq.id = tq.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    LEFT JOIN given g ON g.question_id = qq.id
    ORDER BY tq.position
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
    ) ORDER BY position)
  INTO v_score, v_total, v_review
  FROM scored;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No questions to score for this mode';
  END IF;

  INSERT INTO mock_exam_attempts (exam_id, user_id, mode, score, total, duration_seconds)
  VALUES (p_exam_id, auth.uid(), p_mode, v_score, v_total, p_duration_seconds);

  RETURN json_build_object('score', v_score, 'total', v_total, 'review', v_review);
END;
$$;
