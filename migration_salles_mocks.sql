-- migration_salles_mocks.sql — les mocks officiels dans les Salles.
--
-- Une nouvelle source de questions, « examen » : un ou plusieurs mocks
-- officiels du dossier « Mocks Officiels (Système) » (Mock A — Session 1…),
-- avec leurs questions d'origine, leurs variantes ou les deux, en entier ou
-- en partie, dans l'ordre de l'examen ou mélangées, et filtrés par matière.
-- Réglages en plus (params) pour source = 'examen' :
--   examens   ["Mock A — Session 1", "Mock B — Session 2", …] (au moins un)
--   version   base | variantes | tout
--   complet   true : toute la sélection ; false : « nombre » questions (5 à 600) au hasard
--   ordre     examen (ordre d'origine ; les variantes après, par matière) | melange
-- Ne touche à aucune donnée : fonctions seulement (CREATE OR REPLACE),
-- idempotent. _salle_params et lancer_session reprennent migration_salles.sql
-- à l'identique en dehors des blocs « examen ».

-- Les questions des mocks officiels choisis, avec leur matière, leur session,
-- et leur rang dans l'examen (le set « Complet » donne l'ordre d'origine).
CREATE OR REPLACE FUNCTION _salle_pool_mock(p_examens text[], p_version text)
RETURNS TABLE (question_id uuid, topic text, diff text, examen text, variante boolean, rang bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH mq AS (
    SELECT qq.id AS question_id,
           qq.prompt,
           qq.position,
           _salle_topic_nom(split_part(qs.title, ' — ', 3)) AS topic,
           CASE coalesce(qs.difficulty, 1) WHEN 3 THEN 'difficile' WHEN 2 THEN 'moyen' ELSE 'facile' END AS diff,
           split_part(qs.title, ' — ', 1) || ' — ' || split_part(qs.title, ' — ', 2) AS examen,
           split_part(qs.title, ' — ', 3) AS partie,
           split_part(qs.title, ' — ', 4) = 'Variantes' AS variante
    FROM quiz_questions qq
    JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official = true AND qs.official_published = true
    JOIN library_folders lf ON lf.id = qs.folder_id AND lf.name = 'Mocks Officiels (Système)'
    WHERE coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
      AND qs.title ~ '^Mock [A-Z] — Session [0-9] — '
  ),
  complet AS (
    SELECT mq.examen, mq.prompt, min(mq.position) AS pos
    FROM mq
    WHERE mq.partie LIKE 'Complet%'
    GROUP BY mq.examen, mq.prompt
  )
  SELECT m.question_id, m.topic, m.diff, m.examen, m.variante,
         array_position(p_examens, m.examen)::bigint * 100000
         + CASE WHEN m.variante THEN 50000 ELSE 0 END
         + CASE
             WHEN NOT m.variante AND c.pos IS NOT NULL THEN c.pos
             ELSE 1000
                  + coalesce(array_position(ARRAY['ethics', 'quant', 'economics', 'fsa', 'corporate', 'equity', 'fixed_income', 'derivatives', 'alternatives', 'portfolio'], m.topic), 11) * 1000
                  + m.position
           END AS rang
  FROM mq m
  LEFT JOIN complet c ON c.examen = m.examen AND c.prompt = m.prompt
  WHERE m.topic IS NOT NULL
    AND m.examen = ANY (p_examens)
    AND (p_version = 'tout' OR (p_version = 'variantes') = m.variante);
$$;

-- Les mocks officiels proposés dans les réglages : par session et par
-- matière, combien de questions d'origine et de variantes.
CREATE OR REPLACE FUNCTION salle_mocks_disponibles()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ex  text[];
  v_res json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT array_agg(DISTINCT split_part(qs.title, ' — ', 1) || ' — ' || split_part(qs.title, ' — ', 2))
  INTO v_ex
  FROM quiz_sets qs
  JOIN library_folders lf ON lf.id = qs.folder_id AND lf.name = 'Mocks Officiels (Système)'
  WHERE qs.is_official = true AND qs.official_published = true
    AND qs.title ~ '^Mock [A-Z] — Session [0-9] — ';
  SELECT coalesce(json_agg(t ORDER BY t.examen, t.topic), '[]'::json)
  INTO v_res
  FROM (
    SELECT pm.examen,
           pm.topic,
           (count(*) FILTER (WHERE NOT pm.variante))::int AS base,
           (count(*) FILTER (WHERE pm.variante))::int AS variantes
    FROM _salle_pool_mock(coalesce(v_ex, '{}'), 'tout') pm
    GROUP BY pm.examen, pm.topic
  ) t;
  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION _salle_params(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = public
AS $$
DECLARE
  v_type   text;
  v_nombre int;
  v_temps  int;
  v_part   int;
  v_source text;
  v_diff   text;
  v_topics text[];
  v_examens text[];
  v_version text;
  v_ordre text;
  v_complet boolean;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN
    RAISE EXCEPTION 'Réglages invalides.';
  END IF;

  v_type := p ->> 'type';
  IF v_type IS NULL OR v_type NOT IN ('questions', 'calculs', 'mixte') THEN
    RAISE EXCEPTION 'Choisis le type de partie : questions, calculs ou les deux mêlés.';
  END IF;

  IF coalesce(p ->> 'nombre', '') !~ '^[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'Indique le nombre de questions (de 5 à 50).';
  END IF;
  v_nombre := (p ->> 'nombre')::int;
  IF p ->> 'source' = 'examen' THEN
    IF v_nombre < 1 OR v_nombre > 600 THEN
      RAISE EXCEPTION 'Le nombre de questions va de 5 à 600 pour un mock.';
    END IF;
  ELSIF v_nombre < 5 OR v_nombre > 50 THEN
    RAISE EXCEPTION 'Le nombre de questions va de 5 à 50.';
  END IF;

  IF coalesce(p ->> 'temps', '45') !~ '^[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'Le temps par question va de 15 à 120 secondes.';
  END IF;
  v_temps := coalesce((p ->> 'temps')::int, 45);
  IF v_temps < 15 OR v_temps > 120 THEN
    RAISE EXCEPTION 'Le temps par question va de 15 à 120 secondes.';
  END IF;

  v_source := coalesce(nullif(p ->> 'source', ''), 'banque');
  IF v_source NOT IN ('banque', 'mocks', 'examen') THEN
    RAISE EXCEPTION 'La source des questions est la banque complète, les questions d''examen ou un mock officiel.';
  END IF;
  -- un mock officiel : des questions seulement (pas de calculs)
  IF v_source = 'examen' THEN
    v_type := 'questions';
  ELSIF v_type = 'calculs' THEN
    v_source := 'banque';
  END IF;

  v_diff := coalesce(nullif(p ->> 'difficulte', ''), 'melange');
  IF v_diff NOT IN ('facile', 'moyen', 'difficile', 'melange') THEN
    RAISE EXCEPTION 'La difficulté est facile, moyen, difficile ou mélangée.';
  END IF;

  IF v_type = 'mixte' THEN
    IF coalesce(p ->> 'part_calculs', '40') !~ '^[0-9]{1,3}$' THEN
      RAISE EXCEPTION 'La part de calculs va de 10 à 90 %%.';
    END IF;
    v_part := coalesce((p ->> 'part_calculs')::int, 40);
    IF v_part < 10 OR v_part > 90 THEN
      RAISE EXCEPTION 'La part de calculs va de 10 à 90 %%.';
    END IF;
  ELSIF v_type = 'calculs' THEN
    v_part := 100;
  ELSE
    v_part := 0;
  END IF;

  IF jsonb_typeof(p -> 'topics') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Choisis au moins une matière.';
  END IF;
  SELECT array_agg(c.k ORDER BY c.ord)
  INTO v_topics
  FROM unnest(ARRAY['ethics', 'quant', 'economics', 'fsa', 'corporate', 'equity', 'fixed_income', 'derivatives', 'alternatives', 'portfolio'])
       WITH ORDINALITY AS c(k, ord)
  WHERE c.k IN (SELECT jsonb_array_elements_text(p -> 'topics'));
  IF coalesce(array_length(v_topics, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Choisis au moins une matière.';
  END IF;

  IF v_source = 'examen' THEN
    IF jsonb_typeof(p -> 'examens') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Choisis au moins une session de mock.';
    END IF;
    SELECT array_agg(DISTINCT e ORDER BY e)
    INTO v_examens
    FROM jsonb_array_elements_text(p -> 'examens') AS e
    WHERE e ~ '^Mock [A-Z] — Session [0-9]$';
    IF coalesce(array_length(v_examens, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Choisis au moins une session de mock.';
    END IF;
    v_version := coalesce(nullif(p ->> 'version', ''), 'base');
    IF v_version NOT IN ('base', 'variantes', 'tout') THEN
      RAISE EXCEPTION 'Choisis les questions d''origine, les variantes ou les deux.';
    END IF;
    v_ordre := coalesce(nullif(p ->> 'ordre', ''), 'examen');
    IF v_ordre NOT IN ('examen', 'melange') THEN
      RAISE EXCEPTION 'L''ordre est celui de l''examen ou mélangé.';
    END IF;
    v_complet := coalesce(p ->> 'complet', 'true') = 'true';
    IF NOT v_complet AND v_nombre < 5 THEN
      RAISE EXCEPTION 'Le nombre de questions va de 5 à 600 pour un mock.';
    END IF;
    RETURN jsonb_build_object(
      'type', 'questions',
      'nombre', v_nombre,
      'source', 'examen',
      'topics', to_jsonb(v_topics),
      'difficulte', 'melange',
      'temps', v_temps,
      'part_calculs', 0,
      'examens', to_jsonb(v_examens),
      'version', v_version,
      'ordre', v_ordre,
      'complet', v_complet
    );
  END IF;

  RETURN jsonb_build_object(
    'type', v_type,
    'nombre', v_nombre,
    'source', v_source,
    'topics', to_jsonb(v_topics),
    'difficulte', v_diff,
    'temps', v_temps,
    'part_calculs', v_part
  );
END;
$$;

CREATE OR REPLACE FUNCTION lancer_session(p_salle_id uuid, p_params jsonb, p_calculs jsonb DEFAULT '[]'::jsonb)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c_decompte CONSTANT int := 8;
  c_pause    CONSTANT int := 5;
  v_uid      uuid := auth.uid();
  v_now      timestamptz := clock_timestamp();
  v_s        salles%ROWTYPE;
  v_p        jsonb;
  v_type     text;
  v_nombre   int;
  v_temps    int;
  v_nc_voulu int;
  v_nc       int := 0;
  v_nq       int := 0;
  v_ncalculs int;
  v_qids     uuid[] := '{}';
  v_qtopics  text[] := '{}';
  v_qdiffs   text[] := '{}';
  v_kinds    text[];
  v_total    int;
  v_numero   int;
  v_sid      uuid;
  v_started  timestamptz;
  v_pos      int;
  v_qi       int := 0;
  v_ci       int := 0;
  v_el       jsonb;
  v_q        quiz_questions%ROWTYPE;
  v_niveau   text;
  v_topic    text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND OR NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  IF v_s.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Seul l''admin de la salle peut lancer une partie.';
  END IF;

  PERFORM _salle_maj(p_salle_id);
  IF EXISTS (SELECT 1 FROM salle_sessions WHERE salle_id = p_salle_id AND statut <> 'terminee') THEN
    RAISE EXCEPTION 'Une partie est déjà en cours dans cette salle.';
  END IF;

  v_p := _salle_params(p_params);
  v_type := v_p ->> 'type';
  v_nombre := (v_p ->> 'nombre')::int;
  v_temps := (v_p ->> 'temps')::int;

  -- les calculs fournis
  IF p_calculs IS NULL OR jsonb_typeof(p_calculs) <> 'array' THEN
    p_calculs := '[]'::jsonb;
  END IF;
  v_ncalculs := jsonb_array_length(p_calculs);
  IF v_ncalculs > 100 THEN
    RAISE EXCEPTION 'Trop de calculs envoyés.';
  END IF;

  -- combien de calculs et de questions
  IF v_type = 'questions' THEN
    v_nc := 0;
  ELSIF v_type = 'calculs' THEN
    v_nc := least(v_nombre, v_ncalculs);
  ELSE
    v_nc_voulu := least(v_nombre - 1, greatest(1, floor(v_nombre * (v_p ->> 'part_calculs')::int / 100.0 + 0.5)::int));
    v_nc := least(v_nc_voulu, v_ncalculs);
  END IF;
  IF v_type <> 'calculs' THEN
    v_nq := v_nombre - v_nc;
  END IF;

  -- valider les calculs retenus
  FOR v_ci IN 0..(v_nc - 1) LOOP
    v_el := p_calculs -> v_ci;
    IF jsonb_typeof(v_el) <> 'object'
       OR coalesce(v_el ->> 'enonce', '') = ''
       OR char_length(v_el ->> 'enonce') > 2000
       OR coalesce(v_el ->> 'reponse', '') !~ '^-?[0-9]+([.][0-9]+)?([eE][-+]?[0-9]+)?$' THEN
      RAISE EXCEPTION 'Un des calculs envoyés est invalide.';
    END IF;
    IF coalesce(v_el ->> 'tolerance', '0') !~ '^[0-9]+([.][0-9]+)?([eE][-+]?[0-9]+)?$' THEN
      RAISE EXCEPTION 'Un des calculs envoyés est invalide.';
    END IF;
  END LOOP;

  -- un mock officiel : toute la sélection ou v_nq questions au hasard, dans
  -- l'ordre de l'examen ou mélangées
  IF v_nq > 0 AND v_p ->> 'source' = 'examen' THEN
    SELECT coalesce(array_agg(r.question_id ORDER BY r.cle), '{}'), coalesce(array_agg(r.topic ORDER BY r.cle), '{}'), coalesce(array_agg(r.diff ORDER BY r.cle), '{}')
    INTO v_qids, v_qtopics, v_qdiffs
    FROM (
      SELECT t.question_id, t.topic, t.diff,
             CASE WHEN v_p ->> 'ordre' = 'examen' THEN t.rang::float8 ELSE t.hasard END AS cle
      FROM (
        SELECT x.question_id, x.topic, x.diff, x.rang, random() AS hasard
        FROM _salle_pool_mock(ARRAY(SELECT jsonb_array_elements_text(v_p -> 'examens')), v_p ->> 'version') x
        WHERE x.topic = ANY (ARRAY(SELECT jsonb_array_elements_text(v_p -> 'topics')))
        ORDER BY hasard
        LIMIT CASE WHEN (v_p ->> 'complet')::boolean THEN NULL ELSE v_nq END
      ) t
    ) r;
    v_nq := coalesce(array_length(v_qids, 1), 0);
    IF (v_p ->> 'complet')::boolean THEN
      v_nombre := v_nq;
      v_p := jsonb_set(v_p, '{nombre}', to_jsonb(v_nq));
    END IF;

  -- tirer les questions, dans un ordre aléatoire
  ELSIF v_nq > 0 THEN
    SELECT coalesce(array_agg(t.question_id), '{}'), coalesce(array_agg(t.topic), '{}'), coalesce(array_agg(t.diff), '{}')
    INTO v_qids, v_qtopics, v_qdiffs
    FROM (
      SELECT x.question_id, x.topic, x.diff
      FROM _salle_tirer_questions(
        v_p ->> 'source',
        ARRAY(SELECT jsonb_array_elements_text(v_p -> 'topics')),
        v_p ->> 'difficulte',
        v_nq
      ) x
      ORDER BY random()
    ) t;
    v_nq := coalesce(array_length(v_qids, 1), 0);
  END IF;

  v_total := v_nq + v_nc;
  IF v_total < 3 THEN
    RAISE EXCEPTION 'Pas assez de contenu pour ces réglages (% disponible(s)) : élargis les matières, les sessions ou la source.', v_total;
  END IF;

  -- l'ordre des positions : questions et calculs mêlés
  SELECT array_agg(k.genre ORDER BY random())
  INTO v_kinds
  FROM (
    SELECT 'question'::text AS genre FROM generate_series(1, v_nq)
    UNION ALL
    SELECT 'calcul'::text FROM generate_series(1, v_nc)
  ) k;

  SELECT coalesce(max(numero), 0) + 1 INTO v_numero FROM salle_sessions WHERE salle_id = p_salle_id;
  v_started := v_now + make_interval(secs => c_decompte);

  INSERT INTO salle_sessions (salle_id, numero, statut, params, nb, temps, pause_s, lancee_par, started_at, fin_at)
  VALUES (
    p_salle_id,
    v_numero,
    'attente',
    v_p || jsonb_build_object('nb_questions', v_nq, 'nb_calculs', v_nc),
    v_total,
    v_temps,
    c_pause,
    v_uid,
    v_started,
    v_started + make_interval(secs => v_total * (v_temps + c_pause))
  )
  RETURNING id INTO v_sid;

  v_qi := 0;
  v_ci := 0;
  FOR v_pos IN 0..(v_total - 1) LOOP
    IF v_kinds[v_pos + 1] = 'question' THEN
      v_qi := v_qi + 1;
      SELECT * INTO v_q FROM quiz_questions WHERE id = v_qids[v_qi];
      INSERT INTO salle_items (session_id, position, origine, topic, difficulte, question_id, enonce, choix, bonne_index, explication)
      VALUES (
        v_sid, v_pos, 'question', v_qtopics[v_qi], v_qdiffs[v_qi], v_q.id,
        v_q.prompt, to_jsonb(v_q.choices), v_q.correct_index, v_q.explanation
      );
    ELSE
      v_el := p_calculs -> v_ci;
      v_ci := v_ci + 1;
      v_niveau := CASE WHEN v_el ->> 'niveau' IN ('facile', 'moyen', 'difficile') THEN v_el ->> 'niveau' ELSE 'moyen' END;
      v_topic := CASE
        WHEN v_el ->> 'topic' IN ('ethics', 'quant', 'economics', 'fsa', 'corporate', 'equity', 'fixed_income', 'derivatives', 'alternatives', 'portfolio')
        THEN v_el ->> 'topic'
        ELSE NULL
      END;
      INSERT INTO salle_items (session_id, position, origine, topic, difficulte, libelle, enonce, donnees, unite, decimales, bonne_valeur, tolerance, stricte, etapes)
      VALUES (
        v_sid, v_pos, 'calcul', v_topic, v_niveau,
        left(coalesce(v_el ->> 'libelle', ''), 120),
        v_el ->> 'enonce',
        CASE WHEN jsonb_typeof(v_el -> 'donnees') = 'array' THEN v_el -> 'donnees' ELSE '[]'::jsonb END,
        left(coalesce(v_el ->> 'unite', ''), 8),
        least(8, greatest(0, coalesce(nullif(v_el ->> 'decimales', '')::int, 2))),
        (v_el ->> 'reponse')::numeric,
        coalesce(nullif(v_el ->> 'tolerance', '')::numeric, 0.005),
        coalesce((v_el ->> 'stricte')::boolean, false),
        CASE WHEN jsonb_typeof(v_el -> 'etapes') = 'array' THEN v_el -> 'etapes' ELSE '[]'::jsonb END
      );
    END IF;
  END LOOP;

  UPDATE salles SET derniere_activite = v_now WHERE id = p_salle_id;

  RETURN json_build_object(
    'session_id', v_sid,
    'numero', v_numero,
    'nb', v_total,
    'nb_questions', v_nq,
    'nb_calculs', v_nc,
    'manque', v_total < v_nombre,
    'started_at', v_started,
    'server_now', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION _salle_pool_mock(text[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION salle_mocks_disponibles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION salle_mocks_disponibles() TO authenticated;
