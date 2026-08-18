-- Donne, pour un examen déjà terminé par l'utilisateur, la répartition par
-- thème de TOUS les participants ayant soumis (pas juste la sienne), pour
-- comparer les points faibles/forts par catégorie façon relevé de notes CFA.
-- Réutilise les réponses stockées (mock_exam_results.answers) de chaque
-- participant — aucune correct_index/prompt n'est renvoyée, uniquement des
-- agrégats (correct/total/pct) par thème, cohérent avec le classement déjà
-- public entre inscrits (mock_exam_results_read_inscrit).

CREATE OR REPLACE FUNCTION get_mock_exam_topic_breakdown_all(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT user_registered_for_mock_exam(p_exam_id) THEN
    RAISE EXCEPTION 'Not registered for this exam';
  END IF;

  WITH per_user_answers AS (
    SELECT
      mer.user_id,
      p.username,
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM mock_exam_results mer
    CROSS JOIN LATERAL jsonb_array_elements(mer.answers) AS elem
    LEFT JOIN profiles p ON p.id = mer.user_id
    WHERE mer.exam_id = p_exam_id
  ),
  joined AS (
    SELECT
      pua.user_id,
      pua.username,
      lf.name AS topic,
      (pua.selected_index IS NOT NULL AND pua.selected_index = qq.correct_index) AS is_correct
    FROM per_user_answers pua
    JOIN quiz_questions qq ON qq.id = pua.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  ),
  agg AS (
    SELECT
      user_id, username, topic,
      count(*) FILTER (WHERE is_correct) AS correct,
      count(*) AS total
    FROM joined
    GROUP BY user_id, username, topic
  )
  SELECT json_agg(json_build_object(
    'user_id', user_id,
    'username', username,
    'topic', topic,
    'correct', correct,
    'total', total,
    'pct', round(100.0 * correct / total)
  ) ORDER BY topic, username)
  INTO v_result
  FROM agg;

  RETURN coalesce(v_result, '[]'::json);
END;
$$;
