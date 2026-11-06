-- Examens blancs : plus aucune fonction ne corrige une question d'un examen en
-- cours pour un joueur qui n'a pas rendu sa copie.
--
-- Le trou : submit_practice_session corrigeait n'importe quel identifiant reçu.
-- Un joueur inscrit lisait les id de son examen, appelait la fonction depuis la
-- console et repartait avec correct_index et explanation, sur une copie qui
-- compte pour l'ELO et le trophée. award_quiz_question_xp, noter_reponse(s) et
-- get_answered_question_review ouvraient la même porte, cette dernière par une
-- ligne de quiz_answer_log écrite à la main.
--
-- Quatre choix, chacun pour une raison mesurée en base :
--
-- 1. On ne refuse pas la séance, on retire les questions. Les examens puisent
--    dans la banque de l'entraînement (178 questions d'examen sur 178 dans les
--    2 789 du tirage) : une séance de 90 en contient environ 3. Un RAISE aurait
--    fait échouer presque toutes les séances complètes d'un joueur inscrit, à
--    la remise de sa copie. Les tirages écartent donc ces questions, et la
--    correction retire celles d'une séance tirée avant la publication.
--
-- 2. La garde vaut pour tout joueur sans copie, inscrit ou non. Se désinscrire
--    est permis (mock_exam_registrations_own) : s'inscrire, lire les id, se
--    désinscrire, corriger, se réinscrire suffirait sinon.
--
-- 3. Elle part de la publication, pas du début de la fenêtre : la RLS de
--    mock_exam_questions montre les id à un inscrit dès que l'examen est publié.
--
-- 4. Elle s'arrête à _mock_exam_fin, que submit_mock_exam respecte désormais.
--    Sans cela, la copie restait recevable tant que le statut valait 'open',
--    donc pour toujours : il suffisait d'attendre la fin de la garde.
--
-- La policy mock_exam_results_own_write disparaît : elle laissait un joueur
-- écrire lui-même sa ligne de résultat, donc sa note, sans passer par la
-- correction. Seule submit_mock_exam (SECURITY DEFINER) écrit dans cette table.
--
-- Ce que cette migration ne ferme pas : la lecture directe de
-- quiz_questions.correct_index, ouverte à tout compte connecté, dont dépendent
-- ExamClient et SessionClient (ils corrigent dans le navigateur).
--
-- Rejouable : CREATE OR REPLACE et DROP POLICY IF EXISTS, aucune donnée touchée.

-- ---------------------------------------------------------------------------
-- 1. La fin d'un examen : fin de fenêtre, plus une durée d'épreuve commencée à
--    la dernière minute, plus 15 minutes de marge pour la remise.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._mock_exam_fin(p_e mock_exams)
RETURNS timestamptz
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT p_e.scheduled_at + make_interval(hours => p_e.window_days * 24, mins => p_e.duration_minutes + 15);
$$;

REVOKE ALL ON FUNCTION public._mock_exam_fin(mock_exams) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Les questions gardées pour un joueur : celles des examens publiés, pas
--    encore finis, où il n'a pas de copie.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._questions_gardees(p_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT meq.question_id
  FROM mock_exams e
  JOIN mock_exam_questions meq ON meq.exam_id = e.id
  WHERE e.status = 'open'
    AND now() <= _mock_exam_fin(e)
    AND NOT EXISTS (
      SELECT 1 FROM mock_exam_results r
      WHERE r.exam_id = e.id AND r.user_id = p_uid
    );
$$;

REVOKE ALL ON FUNCTION public._questions_gardees(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. La copie d'examen : plus de remise une fois l'examen fini.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_mock_exam(p_exam_id uuid, p_answers jsonb, p_duration_seconds integer)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registered  boolean;
  v_status      text;
  v_fin         timestamptz;
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

  SELECT e.status, _mock_exam_fin(e) INTO v_status, v_fin FROM mock_exams e WHERE e.id = p_exam_id;
  IF v_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Exam is not open';
  END IF;

  IF now() > v_fin THEN
    RAISE EXCEPTION 'Exam window is over';
  END IF;

  IF EXISTS(SELECT 1 FROM mock_exam_results WHERE exam_id = p_exam_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Already submitted';
  END IF;

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
      lf.name AS topic,
      g.selected_index,
      (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index) AS is_correct
    FROM mock_exam_questions meq
    JOIN quiz_questions qq ON qq.id = meq.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
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
      'topic', topic,
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

-- La copie ne s'écrit plus à la main.
DROP POLICY IF EXISTS mock_exam_results_own_write ON public.mock_exam_results;

-- ---------------------------------------------------------------------------
-- 4. La correction d'une séance : les questions gardées sortent de la note, de
--    la correction et de la copie conservée, que relit
--    get_practice_session_review et d'où partent les ratures.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_practice_session(p_topics text[], p_format integer, p_answers jsonb, p_duration_seconds integer)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score      int := 0;
  v_total      int := 0;
  v_review     json;
  v_xp_awarded int := 0;
  v_id         uuid;
  v_answers    jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_format NOT IN (90, 180) THEN
    RAISE EXCEPTION 'Invalid format';
  END IF;

  SELECT coalesce(jsonb_agg(a.elem ORDER BY a.rang), '[]'::jsonb)
  INTO v_answers
  FROM jsonb_array_elements(p_answers) WITH ORDINALITY AS a(elem, rang)
  WHERE (a.elem->>'question_id')::uuid NOT IN (SELECT _questions_gardees(auth.uid()));

  WITH given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(v_answers) AS elem
  ),
  scored AS (
    SELECT
      qq.id AS question_id,
      qq.prompt,
      qq.choices,
      qq.correct_index,
      qq.explanation,
      lf.name AS topic,
      qs.difficulty,
      g.selected_index,
      (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index) AS is_correct
    FROM given g
    JOIN quiz_questions qq ON qq.id = g.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  ),
  credited AS (
    INSERT INTO quiz_question_progress (user_id, question_id)
    SELECT auth.uid(), s.question_id
    FROM scored s
    WHERE s.is_correct
      AND NOT EXISTS (
        SELECT 1 FROM quiz_question_progress qp
        WHERE qp.user_id = auth.uid() AND qp.question_id = s.question_id
      )
    ON CONFLICT DO NOTHING
    RETURNING question_id
  ),
  xp_calc AS (
    SELECT
      c.question_id,
      s.topic,
      CASE COALESCE(s.difficulty, 1) WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END AS xp
    FROM credited c
    JOIN scored s ON s.question_id = c.question_id
  ),
  ins_events AS (
    INSERT INTO xp_events (user_id, xp, source, meta)
    SELECT auth.uid(), xp, 'practice_session', jsonb_build_object('question_id', question_id, 'topic', topic)
    FROM xp_calc
    RETURNING xp
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
    )),
    (SELECT coalesce(sum(xp), 0) FROM ins_events)
  INTO v_score, v_total, v_review, v_xp_awarded
  FROM scored;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No answers submitted';
  END IF;

  IF v_xp_awarded > 0 THEN
    UPDATE profiles SET xp_total = xp_total + v_xp_awarded WHERE id = auth.uid();
  END IF;

  INSERT INTO practice_session_results (user_id, topics, format, question_count, score, total, duration_seconds, answers)
  VALUES (auth.uid(), p_topics, p_format, v_total, v_score, v_total, p_duration_seconds, v_answers)
  RETURNING id INTO v_id;

  RETURN json_build_object('id', v_id, 'score', v_score, 'total', v_total, 'review', v_review, 'xp_awarded', v_xp_awarded);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Les trois tirages de l'entraînement écartent les questions gardées : une
--    séance normale ne perd rien à la correction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_practice_session(p_topics text[], p_format integer)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
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
    WHERE qq.id NOT IN (SELECT _questions_gardees(auth.uid()))
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

CREATE OR REPLACE FUNCTION public.generate_practice_notions(p_notions text[], p_concepts text[], p_n integer)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
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
      AND qq.id NOT IN (SELECT _questions_gardees(auth.uid()))
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

CREATE OR REPLACE FUNCTION public.generate_similaires(p_questions uuid[], p_n integer DEFAULT NULL::integer)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
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
      AND qq.id NOT IN (SELECT _questions_gardees(v_uid))
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

-- ---------------------------------------------------------------------------
-- 6. Les autres corrections à la demande : même garde.
-- ---------------------------------------------------------------------------

-- QCM, fiches, révision : ni verdict ni bonne réponse. Les trois clients savent
-- déjà afficher une réponse sans correction ; une erreur bloquerait le QCM.
CREATE OR REPLACE FUNCTION public.award_quiz_question_xp(p_set_id uuid, p_question_id uuid, p_selected_index integer)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_official      boolean;
  v_published     boolean;
  v_difficulty    integer;
  v_correct_index integer;
  v_explanation   text;
  v_is_correct    boolean;
  v_already       boolean;
  v_xp            integer := 0;
  v_xp_total      integer;
BEGIN
  IF p_question_id IN (SELECT _questions_gardees(auth.uid())) THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', false,
      'correct_index', NULL::integer,
      'explanation', NULL::text
    );
  END IF;

  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM quiz_sets WHERE id = p_set_id;

  SELECT correct_index, explanation INTO v_correct_index, v_explanation
  FROM quiz_questions
  WHERE id = p_question_id AND set_id = p_set_id;

  v_is_correct := (v_correct_index IS NOT NULL AND p_selected_index = v_correct_index);

  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) OR NOT v_is_correct THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', COALESCE(v_is_correct, false),
      'correct_index', v_correct_index,
      'explanation', v_explanation
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM quiz_question_progress
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) INTO v_already;

  IF v_already THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
      'correct_index', v_correct_index, 'explanation', v_explanation
    );
  END IF;

  v_xp := CASE COALESCE(v_difficulty, 1)
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    ELSE 10
  END;

  INSERT INTO quiz_question_progress (user_id, question_id)
  VALUES (auth.uid(), p_question_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO xp_events (user_id, xp, source, meta)
  VALUES (
    auth.uid(), v_xp, 'quiz_question',
    jsonb_build_object('set_id', p_set_id, 'question_id', p_question_id)
  );

  UPDATE profiles
  SET xp_total = xp_total + v_xp
  WHERE id = auth.uid()
  RETURNING xp_total INTO v_xp_total;

  RETURN json_build_object(
    'xp_awarded', v_xp, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
    'correct_index', v_correct_index, 'explanation', v_explanation
  );
END;
$$;

-- Le carnet de ratures : noter_reponse rend un verdict, et une rature porte la
-- bonne réponse. Les clients ignorent le retour de noter_reponse.
CREATE OR REPLACE FUNCTION public.noter_reponse(p_question_id uuid, p_selected_index integer, p_source text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bon int;
  v_n   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source NOT IN ('qcm', 'session') THEN
    RAISE EXCEPTION 'Invalid source';
  END IF;
  IF p_question_id IN (SELECT _questions_gardees(v_uid)) THEN
    RETURN NULL;
  END IF;
  SELECT correct_index, coalesce(array_length(choices, 1), 0) INTO v_bon, v_n FROM quiz_questions WHERE id = p_question_id;
  IF v_n = 0 OR p_selected_index IS NULL OR p_selected_index < 0 OR p_selected_index >= v_n THEN
    RETURN NULL;
  END IF;
  PERFORM _rature_note(v_uid, p_question_id, p_source, p_selected_index = v_bon, p_selected_index, now(), now());
  RETURN p_selected_index = v_bon;
END;
$$;

-- lower() : _rature_copie accepte un identifiant en majuscules, pas la comparaison de textes.
CREATE OR REPLACE FUNCTION public.noter_reponses(p_items jsonb, p_source text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_n   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source NOT IN ('qcm', 'session', 'blanc') THEN
    RAISE EXCEPTION 'Invalid source';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN 0;
  END IF;
  v_n := least(jsonb_array_length(p_items), 300);
  PERFORM _rature_copie(
    v_uid,
    (SELECT jsonb_agg(x.e)
     FROM (SELECT e FROM jsonb_array_elements(p_items) AS e LIMIT 300) x
     WHERE lower(x.e->>'question_id') NOT IN (SELECT g::text FROM _questions_gardees(v_uid) AS g)),
    p_source, now(), p_source = 'blanc'
  );
  RETURN v_n;
END;
$$;

-- quiz_answer_log s'écrit depuis le navigateur : une ligne forgée ne doit créer ni
-- rature ni droit à la correction.
CREATE OR REPLACE FUNCTION public._rature_fiche()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.question_id NOT IN (SELECT _questions_gardees(NEW.user_id)) THEN
      PERFORM _rature_note(NEW.user_id, NEW.question_id, 'fiche', NEW.is_correct, NEW.selected_index, NEW.answered_at, least(NEW.answered_at, now()));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (fiche) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_answered_question_review(p_question_ids uuid[])
RETURNS TABLE(question_id uuid, correct_index integer, explanation text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.correct_index, q.explanation
  FROM quiz_questions q
  WHERE q.id = ANY(p_question_ids)
    AND q.id NOT IN (SELECT _questions_gardees(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM quiz_answer_log l
      WHERE l.user_id = auth.uid() AND l.question_id = q.id
    );
$$;

CREATE OR REPLACE FUNCTION public.get_flagged_questions()
RETURNS TABLE(question_id uuid, flagged_at timestamp with time zone, source text, prompt text, choices text[], set_title text, folder_name text, answered boolean, correct_index integer, explanation text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.question_id,
    f.created_at,
    f.source,
    q.prompt,
    q.choices,
    s.title,
    lf.name,
    r.repondue,
    CASE WHEN r.repondue THEN q.correct_index END,
    CASE WHEN r.repondue THEN q.explanation END
  FROM question_flags f
  JOIN quiz_questions q ON q.id = f.question_id
  JOIN quiz_sets s ON s.id = q.set_id
  LEFT JOIN library_folders lf ON lf.id = s.folder_id
  CROSS JOIN LATERAL (
    SELECT (
      q.id NOT IN (SELECT _questions_gardees(auth.uid()))
      AND (
         EXISTS (SELECT 1 FROM quiz_answer_log x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM daily_answers x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM duel_answers x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM quiz_question_progress x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM practice_session_results x WHERE x.user_id = auth.uid() AND x.answers @> jsonb_build_array(jsonb_build_object('question_id', q.id::text)))
      OR EXISTS (SELECT 1 FROM mock_exam_results x WHERE x.user_id = auth.uid() AND x.answers @> jsonb_build_array(jsonb_build_object('question_id', q.id::text)))
      OR EXISTS (SELECT 1 FROM quiz_attempts x WHERE x.user_id = auth.uid() AND x.answers @> jsonb_build_array(jsonb_build_object('question_id', q.id::text)))
      OR EXISTS (
        SELECT 1 FROM eclair_series x, unnest(x.question_ids) WITH ORDINALITY AS t(qid, pos)
        WHERE x.user_id = auth.uid() AND t.qid = q.id AND x.answers[t.pos] IS NOT NULL
      )
      )
    ) AS repondue
  ) r
  WHERE f.user_id = auth.uid()
  ORDER BY f.created_at DESC;
$$;
