-- Mini-sessions d'entraînement à la carte : l'utilisateur choisit un ou
-- plusieurs des 10 topics du curriculum CFA Level I, et un format (180
-- questions = examen complet, ou 90 = une demi-session), et reçoit pour
-- chaque topic choisi le nombre de questions qu'il aurait dans un vrai
-- examen de ce format (même table de poids officiels que
-- publish_mock_exam, voir migration_mock_exam_weighted_selection.sql),
-- SANS renormaliser entre les topics sélectionnés — si Ethics pèse 17.5%
-- d'un 180Q, une session Ethics-only ou Ethics+Fixed-Income contient
-- toutes les deux round(17.5% * 180) = 32 questions d'Ethics.
--
-- Comme pour les essais d'entraînement (mock_exam_attempts), seul le score
-- est conservé en historique (practice_session_results), jamais le détail
-- des réponses -- la correction n'est affichée qu'une fois, juste après la
-- soumission.

CREATE TABLE IF NOT EXISTS practice_session_results (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  topics           text[]      NOT NULL,
  format           int         NOT NULL,
  question_count   int         NOT NULL,
  score            int         NOT NULL,
  total            int         NOT NULL,
  duration_seconds int,
  completed_at     timestamptz DEFAULT now()
);

ALTER TABLE practice_session_results ENABLE ROW LEVEL SECURITY;

-- Pas de policy INSERT : les écritures ne passent que par
-- submit_practice_session (SECURITY DEFINER, bypass RLS en interne).
CREATE POLICY "practice_session_results_read_own" ON practice_session_results
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS practice_session_results_user
  ON practice_session_results(user_id, completed_at DESC);

-- Génère une session à la volée (jamais persistée côté serveur avant
-- soumission) — comme pour les examens, jamais correct_index/explanation
-- tant que ce n'est pas soumis.
CREATE OR REPLACE FUNCTION generate_practice_session(p_topics text[], p_format int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF p_format NOT IN (90, 180) THEN
    RAISE EXCEPTION 'Invalid format';
  END IF;
  IF p_topics IS NULL OR array_length(p_topics, 1) IS NULL THEN
    RAISE EXCEPTION 'No topics selected';
  END IF;

  WITH weights(topic_key, folder_name, weight) AS (
    VALUES
      ('ethics',       'Éthique et Standards Professionnels (Système)', 17.5),
      ('quant',        'Méthodes Quantitatives (Système)', 7.5),
      ('economics',    'Économie (Système)', 7.5),
      ('fsa',          'Analyse des États Financiers (Système)', 12.5),
      ('corporate',    'Finance d''Entreprise (Système)', 7.5),
      ('equity',       'Investissements en Actions (Système)', 12.5),
      ('fixed_income', 'Fixed Income (Système)', 12.5),
      ('derivatives',  'Instruments Dérivés (Système)', 6.5),
      ('alternatives', 'Investissements Alternatifs (Système)', 8.5),
      ('portfolio',    'Gestion de Portefeuille (Système)', 10.0)
  ),
  selected_topics AS (
    SELECT topic_key, folder_name, round(weight / 100.0 * p_format)::int AS alloc
    FROM weights
    WHERE topic_key = ANY(p_topics)
  ),
  picked AS (
    SELECT
      qq.id AS question_id,
      qq.prompt,
      qq.choices,
      st.topic_key,
      row_number() OVER (PARTITION BY st.topic_key ORDER BY random()) AS rn
    FROM selected_topics st
    JOIN library_folders lf ON lf.name = st.folder_name AND lf.kind = 'quizzes'
    JOIN quiz_sets qs ON qs.folder_id = lf.id AND qs.is_official = true AND qs.official_published = true
    JOIN quiz_questions qq ON qq.set_id = qs.id
  ),
  final_pick AS (
    SELECT p.question_id, p.prompt, p.choices
    FROM picked p
    JOIN selected_topics st ON st.topic_key = p.topic_key
    WHERE p.rn <= st.alloc
  )
  SELECT json_agg(json_build_object(
    'id', question_id, 'prompt', prompt, 'choices', choices, 'position', pos
  ) ORDER BY pos)
  INTO v_result
  FROM (
    SELECT question_id, prompt, choices, row_number() OVER (ORDER BY random()) - 1 AS pos
    FROM final_pick
  ) shuffled;

  RETURN coalesce(v_result, '[]'::json);
END;
$$;

-- Score une session soumise contre la vraie clé de correction, renvoie la
-- correction complète pour affichage immédiat, et ne conserve que le score
-- dans practice_session_results (jamais les réponses).
CREATE OR REPLACE FUNCTION submit_practice_session(p_topics text[], p_format int, p_answers jsonb, p_duration_seconds int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_score  int := 0;
  v_total  int := 0;
  v_review json;
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
      g.selected_index,
      (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index) AS is_correct
    FROM given g
    JOIN quiz_questions qq ON qq.id = g.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
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
    ))
  INTO v_score, v_total, v_review
  FROM scored;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No answers submitted';
  END IF;

  INSERT INTO practice_session_results (user_id, topics, format, question_count, score, total, duration_seconds)
  VALUES (auth.uid(), p_topics, p_format, v_total, v_score, v_total, p_duration_seconds);

  RETURN json_build_object('score', v_score, 'total', v_total, 'review', v_review);
END;
$$;
