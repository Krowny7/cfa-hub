-- Choisir ses questions par notion : dans l'entraînement ciblé et dans les Salles.
-- Une notion = un Learning Module (« fsa:3 ») ; un concept = une idée plus fine dans une notion.
-- Une notion « à travailler » : au moins 8 réponses sur 90 jours et une réussite lissée sous
-- 65 %, les mêmes bases que les points faibles (lib/points-faibles.ts). Dans une Salle, le
-- calcul porte sur les joueurs présents.
-- Rien n'est supprimé hors l'ancienne signature de _salle_tirer_questions, remplacée ici.
-- Idempotent : se recolle sans effet.

-- 1. Les notions et les concepts qu'on peut choisir, avec leur nombre de questions
CREATE OR REPLACE FUNCTION public.notions_disponibles(p_source text DEFAULT 'banque')
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
  IF p_source IS NULL OR p_source NOT IN ('practice', 'banque', 'mocks') THEN
    RAISE EXCEPTION 'La source des questions est inconnue.';
  END IF;
  WITH pool AS (
    SELECT qq.notion, qq.concept
    FROM _salle_pool(CASE WHEN p_source = 'mocks' THEN 'mocks' ELSE 'banque' END) pl
    JOIN quiz_questions qq ON qq.id = pl.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE qq.notion IS NOT NULL
      AND (p_source <> 'practice' OR coalesce(lf.name, '') <> 'Mocks Officiels (Système)')
  ),
  concepts AS (
    SELECT notion, concept, count(*)::int AS total
    FROM pool
    WHERE concept IS NOT NULL
    GROUP BY 1, 2
    HAVING count(*) >= 3
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

-- 2. Les notions à travailler d'un joueur, de la plus faible à la moins faible
CREATE OR REPLACE FUNCTION public._notions_a_travailler(p_uid uuid)
RETURNS TABLE(notion text, reussite numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT qq.notion,
         round((sum(CASE WHEN r.ok THEN 1 ELSE 0 END) + 3.25) / (count(*) + 5.0), 3) AS reussite
  FROM _reponses_joueur(p_uid) r
  JOIN quiz_questions qq ON qq.id = r.question_id
  WHERE qq.notion IS NOT NULL AND r.at >= now() - interval '90 days'
  GROUP BY qq.notion
  HAVING count(*) >= 8 AND (sum(CASE WHEN r.ok THEN 1 ELSE 0 END) + 3.25) / (count(*) + 5.0) < 0.65
  ORDER BY 2, 1
  LIMIT 15;
$$;

REVOKE ALL ON FUNCTION public._notions_a_travailler(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mes_notions_a_travailler()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT coalesce(json_agg(json_build_object('notion', t.notion, 'joueurs', 1) ORDER BY t.reussite), '[]'::json)
  INTO v_res
  FROM _notions_a_travailler(auth.uid()) t;
  RETURN v_res;
END;
$$;

-- 3. Dans une Salle : les notions à travailler des joueurs présents, les plus partagées d'abord
CREATE OR REPLACE FUNCTION public.salle_notions_a_travailler(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _salle_est_membre(p_salle_id, auth.uid()) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  SELECT coalesce(json_agg(json_build_object('notion', x.notion, 'joueurs', x.joueurs) ORDER BY x.joueurs DESC, x.notion), '[]'::json)
  INTO v_res
  FROM (
    SELECT t.notion, count(*)::int AS joueurs
    FROM salle_membres m
    CROSS JOIN LATERAL _notions_a_travailler(m.user_id) t
    WHERE m.salle_id = p_salle_id AND (m.user_id = auth.uid() OR m.vu_le > now() - interval '90 seconds')
    GROUP BY t.notion
  ) x;
  RETURN v_res;
END;
$$;

-- 4. Une séance ciblée sur des notions et des concepts, répartie à parts égales entre eux
CREATE OR REPLACE FUNCTION public.generate_practice_notions(p_notions text[], p_concepts text[], p_n integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notions text[] := coalesce(p_notions, '{}');
  v_concepts text[] := coalesce(p_concepts, '{}');
  v_res json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_n IS NULL OR p_n < 5 OR p_n > 180 THEN
    RAISE EXCEPTION 'Invalid size';
  END IF;
  IF cardinality(v_notions) + cardinality(v_concepts) = 0 THEN
    RAISE EXCEPTION 'No notions selected';
  END IF;
  WITH pool AS (
    SELECT qq.id, qq.prompt, qq.choices, qq.notion,
           CASE WHEN qq.notion = ANY (v_notions) THEN qq.notion ELSE 'c:' || qq.concept END AS groupe
    FROM _salle_pool('banque') pl
    JOIN quiz_questions qq ON qq.id = pl.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE coalesce(lf.name, '') <> 'Mocks Officiels (Système)'
      AND (qq.notion = ANY (v_notions) OR qq.concept = ANY (v_concepts))
  ),
  rang AS (
    SELECT p.*, row_number() OVER (PARTITION BY p.groupe ORDER BY random()) AS rn FROM pool p
  ),
  tires AS (
    SELECT r.* FROM rang r ORDER BY r.rn, random() LIMIT p_n
  )
  SELECT coalesce(json_agg(json_build_object(
           'id', s.id, 'prompt', s.prompt, 'choices', s.choices, 'position', s.pos, 'topic', split_part(s.notion, ':', 1)
         ) ORDER BY s.pos), '[]'::json)
  INTO v_res
  FROM (SELECT t.*, row_number() OVER (ORDER BY random()) - 1 AS pos FROM tires t) s;
  RETURN v_res;
END;
$$;

-- 5. Le tirage d'une Salle sait se limiter à des notions et des concepts
DROP FUNCTION IF EXISTS public._salle_tirer_questions(text, text[], text, integer);

CREATE OR REPLACE FUNCTION public._salle_tirer_questions(p_source text, p_topics text[], p_diff text, p_n integer, p_notions text[] DEFAULT NULL, p_concepts text[] DEFAULT NULL)
RETURNS TABLE(question_id uuid, topic text, diff text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.question_id, r.topic, r.diff
  FROM (
    SELECT pl.question_id,
           pl.topic,
           pl.diff,
           CASE WHEN p_diff = 'melange' OR pl.diff = p_diff THEN 0 ELSE 1 END AS ecart,
           row_number() OVER (
             PARTITION BY (CASE
                             WHEN cardinality(coalesce(p_notions, '{}')) + cardinality(coalesce(p_concepts, '{}')) = 0 THEN pl.topic
                             WHEN qq.notion = ANY (coalesce(p_notions, '{}')) THEN qq.notion
                             ELSE 'c:' || qq.concept
                           END),
                          (CASE WHEN p_diff = 'melange' OR pl.diff = p_diff THEN 0 ELSE 1 END)
             ORDER BY random()
           ) AS rn
    FROM _salle_pool(p_source) pl
    JOIN quiz_questions qq ON qq.id = pl.question_id
    WHERE pl.topic = ANY (p_topics)
      AND (
        cardinality(coalesce(p_notions, '{}')) + cardinality(coalesce(p_concepts, '{}')) = 0
        OR qq.notion = ANY (coalesce(p_notions, '{}'))
        OR qq.concept = ANY (coalesce(p_concepts, '{}'))
      )
  ) r
  ORDER BY r.ecart, r.rn, random()
  LIMIT greatest(p_n, 0);
$$;

REVOKE ALL ON FUNCTION public._salle_tirer_questions(text, text[], text, integer, text[], text[]) FROM PUBLIC, anon, authenticated;

-- 6. Les réglages gardent les notions choisies, et le lancement s'en sert
DO $m$
DECLARE
  d text := pg_get_functiondef('public._salle_params(jsonb)'::regprocedure);
  n text;
BEGIN
  IF position('v_notions' IN d) = 0 THEN
    n := replace(d, $a$  v_chrono text;
BEGIN$a$, $a$  v_chrono text;
  v_notions jsonb := '[]'::jsonb;
  v_concepts jsonb := '[]'::jsonb;
BEGIN$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_params : déclarations introuvables'; END IF;
    d := n;
    n := replace(d, $a$  RETURN jsonb_build_object(
    'type', v_type,
    'nombre', v_nombre,
    'source', v_source,
    'topics', to_jsonb(v_topics),
    'difficulte', v_diff,
    'temps', v_temps,
    'part_calculs', v_part,
    'chrono', v_chrono
  );$a$, $a$  IF jsonb_typeof(p -> 'notions') = 'array' THEN
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

  RETURN jsonb_build_object(
    'type', v_type,
    'nombre', v_nombre,
    'source', v_source,
    'topics', to_jsonb(v_topics),
    'difficulte', v_diff,
    'temps', v_temps,
    'part_calculs', v_part,
    'chrono', v_chrono
  ) || CASE WHEN jsonb_array_length(v_notions) + jsonb_array_length(v_concepts) > 0
            THEN jsonb_build_object('notions', v_notions, 'concepts', v_concepts) ELSE '{}'::jsonb END;$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_params : retour introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

DO $m$
DECLARE
  d text := pg_get_functiondef('public.lancer_session(uuid,jsonb,jsonb)'::regprocedure);
  n text;
BEGIN
  IF position($a$v_p -> 'notions'$a$ IN d) = 0 THEN
    n := replace(d, $a$        v_p ->> 'difficulte',
        v_nq
      ) x$a$, $a$        v_p ->> 'difficulte',
        v_nq,
        ARRAY(SELECT jsonb_array_elements_text(coalesce(v_p -> 'notions', '[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(coalesce(v_p -> 'concepts', '[]'::jsonb)))
      ) x$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : tirage introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;
