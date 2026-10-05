-- ============================================================================
-- « Les 5 du jour » — le défi éclair, à côté des « 30 du jour ».
-- À appliquer APRÈS migration_daily_challenge.sql. Idempotent.
--
-- Le principe :
--   • chaque jour, les MÊMES 5 questions pour tout le monde, tirées d'une
--     liste de questions de cours, sans calcul et courtes (table
--     cinq_questions, remplie à part) : de quoi jouer en 2 minutes, dans le
--     bus ; 5 matières différentes autant que possible, en évitant les
--     questions des 14 jours précédents ;
--   • chrono de 5 minutes (largement assez), une copie par jour, classement
--     du jour et revue, exactement comme les 30 du jour.
--
-- Comment : le moteur des 30 du jour est réutilisé tel quel. Ses deux
-- fonctions de recherche (_daily_find, _daily_ensure) et l'historique
-- (daily_history) ne lisent plus le programme « cfa-l1 » en dur mais un
-- réglage de la transaction (rl.daily_program, « cfa-l1 » par défaut :
-- les 30 du jour ne changent pas). Les fonctions cinq_* fixent ce réglage à
-- « cfa-l1-cinq » puis appellent les fonctions daily_* existantes.
-- Aucune table existante modifiée ; les signatures des fonctions daily_*
-- ne changent pas.
-- ============================================================================

-- 1. La liste des questions éligibles (remplie par un script, lecture RPC seulement)
CREATE TABLE IF NOT EXISTS cinq_questions (
  question_id uuid        PRIMARY KEY REFERENCES quiz_questions(id) ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cinq_questions ENABLE ROW LEVEL SECURITY;
-- volontairement aucune policy : ni lecture ni écriture client

-- 2. Le programme de la transaction (« cfa-l1 » par défaut : les 30 du jour)
CREATE OR REPLACE FUNCTION _daily_program()
RETURNS text
LANGUAGE sql STABLE SET search_path = public
AS $$ SELECT coalesce(nullif(current_setting('rl.daily_program', true), ''), 'cfa-l1'); $$;

-- 3. Tirage des 5 : une question par matière d'abord (au hasard), puis on complète
CREATE OR REPLACE FUNCTION _cinq_pick_questions(p_count int)
RETURNS uuid[]
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  WITH pool AS (
    SELECT cq.question_id, qs.folder_id, random() AS r
    FROM cinq_questions cq
    JOIN quiz_questions qq ON qq.id = cq.question_id
    JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official = true AND qs.official_published = true
    WHERE coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
  ),
  ranked AS (
    SELECT question_id, r, row_number() OVER (PARTITION BY folder_id ORDER BY r) AS rn FROM pool
  )
  SELECT array_agg(question_id ORDER BY rn, r)
  FROM (SELECT question_id, rn, r FROM ranked ORDER BY rn, r LIMIT p_count) x;
$$;

-- 4. Défi d'un jour, selon le programme de la transaction (même logique que
--    l'original pour les 30 : 30 questions, 45 min, au moins 10 questions)
CREATE OR REPLACE FUNCTION _daily_ensure(p_day date)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prog    text := _daily_program();
  v_cinq    boolean := _daily_program() = 'cfa-l1-cinq';
  v_min     int := 10; -- questions au moins pour ouvrir le défi (5 pour les 5 du jour)
  v_id      uuid;
  v_recent  uuid[];
  v_try     uuid[];
  v_ids     uuid[];
  v_best    int;
  v_overlap int;
BEGIN
  SELECT id INTO v_id FROM daily_challenges WHERE program = v_prog AND day = p_day;
  IF v_id IS NOT NULL OR p_day IS DISTINCT FROM _daily_today() THEN
    RETURN v_id;
  END IF;

  -- Questions des 14 défis précédents (du même programme) : à éviter si possible.
  SELECT coalesce(array_agg(DISTINCT q), '{}'::uuid[])
  INTO v_recent
  FROM daily_challenges dc, unnest(dc.question_ids) AS q
  WHERE dc.program = v_prog AND dc.day >= p_day - 14 AND dc.day < p_day;

  FOR i IN 1..3 LOOP
    v_try := CASE WHEN v_cinq THEN _cinq_pick_questions(5) ELSE _duel_pick_questions(30) END;
    SELECT count(*) INTO v_overlap FROM unnest(v_try) AS x WHERE x = ANY (v_recent);
    IF v_ids IS NULL OR v_overlap < v_best THEN
      v_ids := v_try;
      v_best := v_overlap;
    END IF;
    EXIT WHEN v_best = 0;
  END LOOP;

  IF v_cinq THEN
    v_min := 5;
  END IF;
  IF coalesce(array_length(v_ids, 1), 0) < v_min THEN
    RETURN NULL;
  END IF;

  INSERT INTO daily_challenges (day, program, question_ids, time_limit_seconds)
  VALUES (p_day, v_prog, v_ids, CASE WHEN v_cinq THEN 300 ELSE 2700 END)
  ON CONFLICT (program, day) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM daily_challenges WHERE program = v_prog AND day = p_day;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION _daily_find(p_day date)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM daily_challenges WHERE program = _daily_program() AND day = p_day; $$;

-- 5. L'historique, selon le programme (corps identique à l'original sinon)
CREATE OR REPLACE FUNCTION daily_history(p_limit int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_lim int := greatest(1, least(coalesce(p_limit, 30), 120));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Mes copies restées ouvertes au-delà du chrono (onglet fermé) : rendues.
  PERFORM _daily_settle_due(c.id)
  FROM daily_challenges c
  JOIN daily_attempts a ON a.challenge_id = c.id AND a.user_id = v_uid AND a.finished_at IS NULL;

  RETURN (
    SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.day DESC), '[]'::json)
    FROM (
      SELECT c.day,
             coalesce(array_length(c.question_ids, 1), 0) AS question_count,
             (SELECT count(*) FROM daily_attempts x WHERE x.challenge_id = c.id AND x.finished_at IS NOT NULL) AS players,
             (SELECT max(x.score) FROM daily_attempts x WHERE x.challenge_id = c.id AND x.finished_at IS NOT NULL) AS top_score,
             a.started_at,
             a.finished_at,
             a.score,
             a.total,
             a.seconds,
             CASE WHEN a.finished_at IS NOT NULL THEN
               (SELECT b.rank FROM _daily_board(c.id) b WHERE b.user_id = v_uid) END AS rank
      FROM daily_challenges c
      LEFT JOIN daily_attempts a ON a.challenge_id = c.id AND a.user_id = v_uid
      WHERE c.program = _daily_program() AND c.day <= _daily_today()
      ORDER BY c.day DESC
      LIMIT v_lim
    ) t
  );
END;
$$;

-- 6. Les 5 du jour : mêmes fonctions, programme « cfa-l1-cinq » (réglage
--    local à la transaction de l'appel)
CREATE OR REPLACE FUNCTION cinq_get(p_day date DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true); RETURN daily_get(p_day); END; $$;

CREATE OR REPLACE FUNCTION cinq_start(p_day date)
RETURNS json LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true); RETURN daily_start(p_day); END; $$;

CREATE OR REPLACE FUNCTION cinq_answer(p_day date, p_position int, p_selected int)
RETURNS json LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true); RETURN daily_answer(p_day, p_position, p_selected); END; $$;

CREATE OR REPLACE FUNCTION cinq_finish(p_day date)
RETURNS json LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true); RETURN daily_finish(p_day); END; $$;

CREATE OR REPLACE FUNCTION cinq_leaderboard(p_day date DEFAULT NULL, p_limit int DEFAULT 100)
RETURNS json LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true); RETURN daily_leaderboard(p_day, p_limit); END; $$;

CREATE OR REPLACE FUNCTION cinq_review(p_day date)
RETURNS json LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true); RETURN daily_review(p_day); END; $$;

CREATE OR REPLACE FUNCTION cinq_history(p_limit int DEFAULT 30)
RETURNS json LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true); RETURN daily_history(p_limit); END; $$;

-- 7. Droits
REVOKE ALL ON FUNCTION _daily_program() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _cinq_pick_questions(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_ensure(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_find(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION daily_history(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION daily_history(int) TO authenticated;

REVOKE ALL ON FUNCTION cinq_get(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cinq_start(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cinq_answer(date, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cinq_finish(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cinq_leaderboard(date, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cinq_review(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cinq_history(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cinq_get(date) TO authenticated;
GRANT EXECUTE ON FUNCTION cinq_start(date) TO authenticated;
GRANT EXECUTE ON FUNCTION cinq_answer(date, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION cinq_finish(date) TO authenticated;
GRANT EXECUTE ON FUNCTION cinq_leaderboard(date, int) TO authenticated;
GRANT EXECUTE ON FUNCTION cinq_review(date) TO authenticated;
GRANT EXECUTE ON FUNCTION cinq_history(int) TO authenticated;
