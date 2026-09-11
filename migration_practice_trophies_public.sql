-- Rend les trophées d'entraînement ciblé visibles sur le profil public
-- (/people/[id]), comme l'XP/niveau déjà visibles pour tout le monde.
-- N'expose qu'un comptage agrégé (nombre de sujets par session réussie),
-- jamais le contenu/les scores détaillés des autres — practice_session_results
-- reste privé (RLS inchangée).

CREATE OR REPLACE FUNCTION get_user_practice_trophies(p_user_id uuid)
RETURNS TABLE(topic_count int, trophy_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT array_length(topics, 1) AS topic_count, count(*) AS trophy_count
  FROM practice_session_results
  WHERE user_id = p_user_id
    AND total > 0
    AND score::numeric / total >= 0.7
  GROUP BY array_length(topics, 1);
$$;
