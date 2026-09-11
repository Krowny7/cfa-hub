-- Rend le graphique de progression de l'entraînement ciblé visible sur le
-- profil public (/people/[id]), dans le même esprit que les trophées et
-- l'XP déjà publics. N'expose que ce qu'il faut pour tracer la courbe
-- (topics/format/score/total/date) — jamais answers/review (le contenu des
-- questions et réponses reste strictement privé, get_practice_session_review
-- continue de vérifier user_id = auth.uid()).

CREATE OR REPLACE FUNCTION get_user_practice_progress(p_user_id uuid)
RETURNS json
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT coalesce(json_agg(json_build_object(
    'id', id,
    'topics', topics,
    'format', format,
    'score', score,
    'total', total,
    'completed_at', completed_at
  ) ORDER BY completed_at), '[]'::json)
  FROM practice_session_results
  WHERE user_id = p_user_id;
$$;
