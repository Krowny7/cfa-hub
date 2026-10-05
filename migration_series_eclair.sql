-- Séries éclair : des séries de 5 questions de cours, sans calcul, à volonté.
-- Les 5 du jour sont les mêmes pour tout le monde ; une série éclair est
-- tirée pour soi, dans la même liste (cinq_questions), sans jamais reprendre
-- une question déjà vue en série tant qu'il en reste de nouvelles. Correction
-- question par question (on apprend en route), XP comme l'entraînement ciblé.
-- Les questions des défis du jour (les 30 et les 5) sont écartées : une série
-- ne doit pas montrer en avance la copie du classement.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_cinq_du_jour.sql et migration_question_flags.sql. Idempotent.

-- 1. Les séries (une ligne par série ; lues et écrites par les fonctions seulement)
CREATE TABLE IF NOT EXISTS eclair_series (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_ids uuid[]      NOT NULL,
  -- réponse donnée à chaque position (NULL : pas encore répondu)
  answers      int[]       NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  score        int,
  total        int
);
CREATE INDEX IF NOT EXISTS eclair_series_user_started ON eclair_series (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS eclair_series_user_finished ON eclair_series (user_id, finished_at DESC) WHERE finished_at IS NOT NULL;

ALTER TABLE eclair_series ENABLE ROW LEVEL SECURITY;
-- chacun relit ses séries rendues (activité, historique, stats) ; jamais
-- celles en cours, dont les réponses ne sont pas encore jugées
DROP POLICY IF EXISTS eclair_series_read_own ON eclair_series;
CREATE POLICY eclair_series_read_own ON eclair_series FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND finished_at IS NOT NULL);

-- 2. Tirage d'une série pour un joueur : d'abord des questions jamais vues en
--    série (une par matière tant que possible), sinon les plus anciennes
CREATE OR REPLACE FUNCTION _eclair_pick(p_uid uuid, p_exclude uuid[])
RETURNS uuid[]
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  WITH vues AS (
    SELECT q, max(e.started_at) AS vue_le
    FROM eclair_series e, unnest(e.question_ids) AS q
    WHERE e.user_id = p_uid
    GROUP BY q
  ),
  pool AS (
    SELECT cq.question_id, qs.folder_id, v.vue_le, random() AS r
    FROM cinq_questions cq
    JOIN quiz_questions qq ON qq.id = cq.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official = true AND qs.official_published = true
    LEFT JOIN vues v ON v.q = cq.question_id
    WHERE coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
      AND NOT (cq.question_id = ANY (coalesce(p_exclude, '{}'::uuid[])))
  ),
  ranked AS (
    SELECT question_id, vue_le, r,
           row_number() OVER (PARTITION BY folder_id ORDER BY (vue_le IS NOT NULL), vue_le, r) AS rn
    FROM pool
  )
  SELECT array_agg(question_id ORDER BY ord)
  FROM (
    SELECT question_id, row_number() OVER (ORDER BY (vue_le IS NOT NULL), rn, vue_le, r) AS ord
    FROM ranked
    ORDER BY (vue_le IS NOT NULL), rn, vue_le, r
    LIMIT 5
  ) x;
$$;

-- 3. Clôture d'une série : note les réponses données, XP des premières bonnes
--    réponses (comme l'entraînement ciblé). Sans aucune réponse, la série
--    s'efface. Renvoie la série (ou NULL si effacée).
CREATE OR REPLACE FUNCTION _eclair_close(p_id uuid)
RETURNS eclair_series
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_s     eclair_series;
  v_score int := 0;
  v_total int := 0;
  v_xp    int := 0;
BEGIN
  SELECT * INTO v_s FROM eclair_series WHERE id = p_id FOR UPDATE;
  IF v_s.id IS NULL OR v_s.finished_at IS NOT NULL THEN
    RETURN v_s;
  END IF;

  WITH given AS (
    SELECT t.qid, v_s.answers[t.pos] AS sel
    FROM unnest(v_s.question_ids) WITH ORDINALITY AS t(qid, pos)
    WHERE v_s.answers[t.pos] IS NOT NULL
  ),
  scored AS (
    SELECT qq.id AS question_id, lf.name AS topic, qs.difficulty, (g.sel = qq.correct_index) AS ok
    FROM given g
    JOIN quiz_questions qq ON qq.id = g.qid
    JOIN quiz_sets qs ON qs.id = qq.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  ),
  credited AS (
    INSERT INTO quiz_question_progress (user_id, question_id)
    SELECT v_s.user_id, s.question_id
    FROM scored s
    WHERE s.ok
      AND NOT EXISTS (SELECT 1 FROM quiz_question_progress qp WHERE qp.user_id = v_s.user_id AND qp.question_id = s.question_id)
    ON CONFLICT DO NOTHING
    RETURNING question_id
  ),
  ins_events AS (
    INSERT INTO xp_events (user_id, xp, source, meta)
    SELECT v_s.user_id,
           CASE coalesce(s.difficulty, 1) WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END,
           'eclair',
           jsonb_build_object('question_id', c.question_id, 'topic', s.topic, 'series_id', v_s.id)
    FROM credited c
    JOIN scored s ON s.question_id = c.question_id
    RETURNING xp
  )
  SELECT count(*) FILTER (WHERE ok), count(*), (SELECT coalesce(sum(xp), 0) FROM ins_events)
  INTO v_score, v_total, v_xp
  FROM scored;

  IF v_total = 0 THEN
    DELETE FROM eclair_series WHERE id = p_id;
    RETURN NULL;
  END IF;

  IF v_xp > 0 THEN
    UPDATE profiles SET xp_total = xp_total + v_xp WHERE id = v_s.user_id;
  END IF;

  UPDATE eclair_series
  SET finished_at = now(), score = v_score, total = v_total
  WHERE id = p_id
  RETURNING * INTO v_s;
  RETURN v_s;
END;
$$;

-- Les questions d'une série, pour le joueur : la correction seulement pour
-- celles déjà répondues
CREATE OR REPLACE FUNCTION _eclair_json(p_s eclair_series)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'id', p_s.id,
    'started_at', p_s.started_at,
    'finished_at', p_s.finished_at,
    'score', p_s.score,
    'total', p_s.total,
    'questions', coalesce((
      SELECT json_agg(json_build_object(
        'position', t.pos - 1,
        'id', qq.id,
        'prompt', qq.prompt,
        'choices', qq.choices,
        'topic', _rl_topic_key(lf.name),
        'selected_index', p_s.answers[t.pos],
        'correct_index', CASE WHEN p_s.answers[t.pos] IS NOT NULL THEN qq.correct_index END,
        'explanation', CASE WHEN p_s.answers[t.pos] IS NOT NULL THEN qq.explanation END
      ) ORDER BY t.pos)
      FROM unnest(p_s.question_ids) WITH ORDINALITY AS t(qid, pos)
      JOIN quiz_questions qq ON qq.id = t.qid
      JOIN quiz_sets qs ON qs.id = qq.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    ), '[]'::json)
  );
$$;

-- 4. Commencer (ou reprendre) une série. Une série laissée en route depuis
--    plus de 6 heures est close avec les réponses déjà données.
CREATE OR REPLACE FUNCTION eclair_start()
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_s       eclair_series;
  v_old     uuid;
  v_today   date := _daily_today();
  v_exclude uuid[];
  v_ids     uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- une seule série à la fois par joueur (deux onglets : la même série)
  PERFORM pg_advisory_xact_lock(hashtext('eclair:' || v_uid::text));

  FOR v_old IN
    SELECT id FROM eclair_series
    WHERE user_id = v_uid AND finished_at IS NULL AND started_at < now() - interval '6 hours'
  LOOP
    PERFORM _eclair_close(v_old);
  END LOOP;

  SELECT * INTO v_s FROM eclair_series
  WHERE user_id = v_uid AND finished_at IS NULL
  ORDER BY started_at DESC LIMIT 1;
  IF v_s.id IS NOT NULL THEN
    RETURN _eclair_json(v_s);
  END IF;

  -- les défis du jour existent dès qu'on tire une série : leurs questions sont écartées
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true);
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', '', true);
  SELECT coalesce(array_agg(DISTINCT q), '{}'::uuid[]) INTO v_exclude
  FROM daily_challenges dc, unnest(dc.question_ids) AS q
  WHERE dc.day = v_today;

  v_ids := _eclair_pick(v_uid, v_exclude);
  IF coalesce(array_length(v_ids, 1), 0) < 5 THEN
    RETURN json_build_object('id', NULL, 'reason', 'no_bank');
  END IF;

  INSERT INTO eclair_series (user_id, question_ids, answers)
  VALUES (v_uid, v_ids, array_fill(NULL::int, ARRAY[array_length(v_ids, 1)]))
  RETURNING * INTO v_s;
  RETURN _eclair_json(v_s);
END;
$$;

-- 5. Répondre à une question : réponse définitive, correction immédiate
CREATE OR REPLACE FUNCTION eclair_answer(p_id uuid, p_position int, p_choice int)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_s   eclair_series;
  v_q   quiz_questions;
  v_n   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM eclair_series WHERE id = p_id AND user_id = v_uid FOR UPDATE;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'Series not found';
  END IF;
  IF p_position IS NULL OR p_position < 0 OR p_position >= array_length(v_s.question_ids, 1) THEN
    RAISE EXCEPTION 'Invalid position';
  END IF;
  SELECT * INTO v_q FROM quiz_questions WHERE id = v_s.question_ids[p_position + 1];
  IF v_q.id IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  v_n := coalesce(array_length(v_q.choices, 1), 0);
  IF p_choice IS NULL OR p_choice < 0 OR p_choice >= v_n THEN
    RAISE EXCEPTION 'Invalid choice';
  END IF;

  -- première réponse seulement, et pas après la clôture
  IF v_s.finished_at IS NULL AND v_s.answers[p_position + 1] IS NULL THEN
    UPDATE eclair_series SET answers[p_position + 1] = p_choice WHERE id = p_id;
    v_s.answers[p_position + 1] := p_choice;
  END IF;

  RETURN json_build_object(
    'position', p_position,
    'selected_index', v_s.answers[p_position + 1],
    'correct_index', CASE WHEN v_s.answers[p_position + 1] IS NOT NULL THEN v_q.correct_index END,
    'explanation', CASE WHEN v_s.answers[p_position + 1] IS NOT NULL THEN v_q.explanation END,
    'is_correct', v_s.answers[p_position + 1] = v_q.correct_index
  );
END;
$$;

-- 6. Rendre la série : score, XP gagné, rang du jour (séries rendues aujourd'hui)
CREATE OR REPLACE FUNCTION eclair_finish(p_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_s      eclair_series;
  v_xp     int;
  v_today  int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM eclair_series WHERE id = p_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Series not found';
  END IF;
  v_s := _eclair_close(p_id);
  IF v_s.id IS NULL THEN
    RETURN json_build_object('id', NULL, 'score', 0, 'total', 0, 'xp_awarded', 0, 'today', 0);
  END IF;

  SELECT coalesce(sum(xp), 0) INTO v_xp FROM xp_events
  WHERE user_id = v_uid AND source = 'eclair' AND meta->>'series_id' = v_s.id::text;
  SELECT count(*) INTO v_today FROM eclair_series
  WHERE user_id = v_uid AND finished_at IS NOT NULL
    AND (finished_at AT TIME ZONE 'Europe/Paris')::date = _daily_today();

  RETURN json_build_object(
    'id', v_s.id,
    'score', v_s.score,
    'total', v_s.total,
    'seconds', least(extract(epoch FROM v_s.finished_at - v_s.started_at), 3600)::int,
    'xp_awarded', v_xp,
    'today', v_today
  );
END;
$$;

-- 7. Les questions marquées : une question vue en série éclair compte
--    comme répondue (même fonction que migration_question_flags.sql, une
--    source en plus)
CREATE OR REPLACE FUNCTION get_flagged_questions()
RETURNS TABLE (
  question_id   uuid,
  flagged_at    timestamptz,
  source        text,
  prompt        text,
  choices       text[],
  set_title     text,
  folder_name   text,
  answered      boolean,
  correct_index integer,
  explanation   text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
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
    ) AS repondue
  ) r
  WHERE f.user_id = auth.uid()
  ORDER BY f.created_at DESC;
$$;

-- 8. Droits
REVOKE ALL ON FUNCTION _eclair_pick(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _eclair_close(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _eclair_json(eclair_series) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION eclair_start() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION eclair_answer(uuid, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION eclair_finish(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_flagged_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION eclair_start() TO authenticated;
GRANT EXECUTE ON FUNCTION eclair_answer(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION eclair_finish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_flagged_questions() TO authenticated;
