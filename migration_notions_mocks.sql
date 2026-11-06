-- Le choix par notion arrive aussi sur les mocks officiels joués en Salle.
-- Idempotent : se recolle sans effet. Seule l'ancienne signature de notions_disponibles est retirée.

-- 1. Les notions d'un mock : celles des sessions choisies, avec leur nombre de questions
DROP FUNCTION IF EXISTS public.notions_disponibles(text);

CREATE OR REPLACE FUNCTION public.notions_disponibles(p_source text DEFAULT 'banque', p_examens text[] DEFAULT NULL, p_version text DEFAULT 'base')
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('practice', 'banque', 'mocks', 'examen') THEN
    RAISE EXCEPTION 'La source des questions est inconnue.';
  END IF;
  WITH pool AS (
    SELECT qq.notion, qq.concept
    FROM _salle_pool(CASE WHEN p_source = 'mocks' THEN 'mocks' ELSE 'banque' END) pl
    JOIN quiz_questions qq ON qq.id = pl.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE p_source <> 'examen'
      AND qq.notion IS NOT NULL
      AND (p_source <> 'practice' OR coalesce(lf.name, '') <> 'Mocks Officiels (Système)')
    UNION ALL
    SELECT qq.notion, qq.concept
    FROM _salle_pool_mock(coalesce(p_examens, '{}'), coalesce(p_version, 'base')) x
    JOIN quiz_questions qq ON qq.id = x.question_id
    WHERE p_source = 'examen' AND qq.notion IS NOT NULL
  ),
  concepts AS (
    SELECT notion, concept, count(*)::int AS total
    FROM pool
    WHERE concept IS NOT NULL
    GROUP BY 1, 2
    HAVING count(*) >= CASE WHEN p_source = 'examen' THEN 1 ELSE 3 END
  ),
  notions AS (
    SELECT notion, count(*)::int AS total FROM pool GROUP BY 1
  )
  SELECT coalesce(json_agg(json_build_object(
           'notion', n.notion,
           'total', n.total,
           'concepts', coalesce((
             SELECT json_agg(json_build_object('concept', c.concept, 'total', c.total) ORDER BY c.total DESC, c.concept)
             FROM concepts c WHERE c.notion = n.notion
           ), '[]'::json)
         ) ORDER BY n.notion), '[]'::json)
  INTO v_res
  FROM notions n;
  RETURN v_res;
END;
$$;

-- 2. Les réglages d'un mock gardent aussi les notions choisies
DO $m$
DECLARE
  d text := pg_get_functiondef('public._salle_params(jsonb)'::regprocedure);
  n text;
  bloc text := $a$  IF jsonb_typeof(p -> 'notions') = 'array' THEN
    SELECT coalesce(jsonb_agg(DISTINCT e), '[]'::jsonb) INTO v_notions
    FROM jsonb_array_elements_text(p -> 'notions') AS e
    WHERE e ~ '^[a-z_]+:[0-9]{1,2}$';
  END IF;
  IF jsonb_typeof(p -> 'concepts') = 'array' THEN
    SELECT coalesce(jsonb_agg(DISTINCT e), '[]'::jsonb) INTO v_concepts
    FROM jsonb_array_elements_text(p -> 'concepts') AS e
    WHERE char_length(e) BETWEEN 1 AND 300;
  END IF;
  IF jsonb_array_length(v_notions) > 100 OR jsonb_array_length(v_concepts) > 100 THEN
    RAISE EXCEPTION 'Trop de notions choisies.';
  END IF;

$a$;
BEGIN
  IF position($a$'ordre', v_ordre,
      'complet', v_complet,
      'chrono', v_chrono
    ) ||$a$ IN d) = 0 THEN
    n := replace(d, bloc, '');
    IF n = d THEN RAISE EXCEPTION '_salle_params : bloc des notions introuvable'; END IF;
    d := n;
    n := replace(d, $a$  IF v_source = 'examen' THEN
    IF jsonb_typeof(p -> 'examens')$a$, bloc || $a$  IF v_source = 'examen' THEN
    IF jsonb_typeof(p -> 'examens')$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_params : branche du mock introuvable'; END IF;
    d := n;
    n := replace(d, $a$      'ordre', v_ordre,
      'complet', v_complet,
      'chrono', v_chrono
    );$a$, $a$      'ordre', v_ordre,
      'complet', v_complet,
      'chrono', v_chrono
    ) || CASE WHEN jsonb_array_length(v_notions) + jsonb_array_length(v_concepts) > 0
              THEN jsonb_build_object('notions', v_notions, 'concepts', v_concepts) ELSE '{}'::jsonb END;$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_params : retour du mock introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- 3. Le tirage d'un mock se limite aux notions choisies
DO $m$
DECLARE
  d text := pg_get_functiondef('public.lancer_session(uuid,jsonb,jsonb)'::regprocedure);
  n text;
BEGIN
  IF position('JOIN quiz_questions qn' IN d) = 0 THEN
    n := replace(d, $a$        FROM _salle_pool_mock(ARRAY(SELECT jsonb_array_elements_text(v_p -> 'examens')), v_p ->> 'version') x
        WHERE x.topic = ANY (ARRAY(SELECT jsonb_array_elements_text(v_p -> 'topics')))
$a$, $a$        FROM _salle_pool_mock(ARRAY(SELECT jsonb_array_elements_text(v_p -> 'examens')), v_p ->> 'version') x
        JOIN quiz_questions qn ON qn.id = x.question_id
        WHERE x.topic = ANY (ARRAY(SELECT jsonb_array_elements_text(v_p -> 'topics')))
          AND (
            NOT (v_p ? 'notions')
            OR qn.notion = ANY (ARRAY(SELECT jsonb_array_elements_text(v_p -> 'notions')))
            OR qn.concept = ANY (ARRAY(SELECT jsonb_array_elements_text(v_p -> 'concepts')))
          )
$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : tirage du mock introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;
