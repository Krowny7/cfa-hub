-- Se retester sur ses ratures : des questions du même concept, jamais les mêmes.
-- Pour chaque rature, une question voisine : d'abord du même concept, sinon de la même notion,
-- en préférant celles que le joueur n'a jamais vues. Mêmes questions que l'entraînement ciblé :
-- la banque, sans les mocks officiels. Idempotent : se recolle sans effet.

CREATE OR REPLACE FUNCTION public.generate_similaires(p_questions uuid[], p_n integer DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nb  int;
  v_n   int;
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_questions IS NULL OR cardinality(p_questions) = 0 OR cardinality(p_questions) > 100 THEN
    RAISE EXCEPTION 'Aucune rature à retravailler.';
  END IF;

  SELECT count(*)::int INTO v_nb FROM quiz_questions WHERE id = ANY (p_questions) AND notion IS NOT NULL;
  IF v_nb = 0 THEN
    RETURN '[]'::json;
  END IF;
  -- une question par rature, entre 5 et 30
  v_n := least(greatest(coalesce(p_n, v_nb), 5), 30);

  WITH sources AS (
    SELECT q.notion, q.concept, md5(q.prompt) AS empreinte
    FROM quiz_questions q
    WHERE q.id = ANY (p_questions) AND q.notion IS NOT NULL
  ),
  groupes AS (
    SELECT s.notion, s.concept, count(*)::int AS poids FROM sources s GROUP BY 1, 2
  ),
  pool AS (
    SELECT qq.id, qq.prompt, qq.choices, qq.notion, qq.concept
    FROM _salle_pool('banque') pl
    JOIN quiz_questions qq ON qq.id = pl.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE coalesce(lf.name, '') <> 'Mocks Officiels (Système)'
      AND qq.notion IN (SELECT g.notion FROM groupes g)
      AND qq.id <> ALL (p_questions)
      AND md5(qq.prompt) NOT IN (SELECT s.empreinte FROM sources s)
  ),
  vues AS (
    SELECT DISTINCT r.question_id FROM _reponses_joueur(v_uid) r
  ),
  candidates AS (
    SELECT g.notion AS g_notion, g.concept AS g_concept, p.concept AS q_concept, g.poids, p.id, p.prompt, p.choices,
           row_number() OVER (
             PARTITION BY g.notion, g.concept
             ORDER BY (p.concept IS NOT DISTINCT FROM g.concept) DESC, (v.question_id IS NOT NULL), random()
           ) AS rn
    FROM groupes g
    JOIN pool p ON p.notion = g.notion
    LEFT JOIN vues v ON v.question_id = p.id
  ),
  -- chaque rature appelle une question à son tour ; un même énoncé ne sort qu'une fois
  uniques AS (
    SELECT DISTINCT ON (md5(c.prompt)) c.*, (c.rn - 1) / c.poids AS tour
    FROM candidates c
    ORDER BY md5(c.prompt), (c.rn - 1) / c.poids, c.rn
  ),
  tirees AS (
    SELECT u.* FROM uniques u ORDER BY u.tour, random() LIMIT v_n
  )
  SELECT coalesce(json_agg(json_build_object(
           'id', t.id,
           'prompt', t.prompt,
           'choices', t.choices,
           'position', t.pos,
           'topic', split_part(t.g_notion, ':', 1),
           'notion', t.g_notion,
           'concept', t.q_concept
         ) ORDER BY t.pos), '[]'::json)
  INTO v_res
  FROM (SELECT x.*, row_number() OVER (ORDER BY random()) - 1 AS pos FROM tirees x) t;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_similaires(uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_similaires(uuid[], integer) TO authenticated;
