-- ============================================================================
-- Défi du jour (V5) — « Les 30 du jour ».
-- À appliquer APRÈS migration_duels_elo.sql (déjà en production) : on y
-- réutilise _duel_pick_questions et _rl_topic_key, sans les modifier.
--
-- Le principe :
--   • chaque jour (date de Paris), les MÊMES 30 questions pour tout le monde,
--     dans le même ordre, tirées comme les duels (_duel_pick_questions(30) :
--     QCM officiels publiés des dossiers « (Système) », pondérés par
--     matière). Le défi du jour est créé paresseusement par le premier joueur
--     qui l'ouvre (pas de tâche planifiée) ; le tirage évite autant que
--     possible les questions des 14 défis précédents (meilleur de 3 tirages) ;
--   • une seule copie par joueur et par jour, chrono tenu par le serveur
--     (45 min, même règle que les duels : la copie est rendue d'office à la
--     fin du temps, 20 s de marge réseau pour la dernière réponse) ;
--   • on ne peut COMMENCER le défi que le jour même ; une copie commencée à
--     23 h 50 garde ses 45 minutes ;
--   • pas d'ELO : un classement du jour (score, puis temps), visible de tous
--     les joueurs connectés ; ex aequo au score et à la seconde = même rang ;
--   • la revue (bonnes réponses, explications, taux de réussite des joueurs
--     par question) ne s'ouvre qu'au joueur qui a rendu sa copie, et reste
--     ouverte sans limite de durée (rien n'est supprimé).
--
-- Sécurité :
--   • la bonne réponse n'est jamais envoyée avant la fin de la copie du
--     joueur : daily_start ne renvoie que id/prompt/choices, daily_answer
--     corrige côté serveur sans renvoyer la correction, daily_review refuse
--     tant que la copie n'est pas rendue ;
--   • le score d'une copie n'est rempli qu'à sa clôture ;
--   • aucune écriture directe : pas de policy INSERT/UPDATE/DELETE, tout
--     passe par les fonctions SECURITY DEFINER ci-dessous.
--
-- RLS :
--   • daily_challenges, daily_answers : aucune lecture client (RPC seulement) ;
--   • daily_attempts : chaque joueur lit ses propres copies (pour compter ses
--     questions du jour, comme les duels ; score vide tant qu'elle est ouverte).
--
-- Aucune table existante modifiée, aucune fonction existante remplacée.
-- Idempotent : peut être rejoué sans risque.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_challenges (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- jour calendaire à Paris
  day                date        NOT NULL,
  domain             text        NOT NULL DEFAULT 'finance',
  program            text        NOT NULL DEFAULT 'cfa-l1',
  -- les mêmes questions, dans le même ordre, pour tout le monde
  question_ids       uuid[]      NOT NULL,
  time_limit_seconds int         NOT NULL DEFAULT 2700,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_challenges_one_per_day UNIQUE (program, day)
);

-- Une copie par joueur et par défi.
CREATE TABLE IF NOT EXISTS daily_attempts (
  challenge_id uuid        NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day          date        NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  -- remplis à la clôture de la copie seulement
  score        int,
  total        int,
  seconds      int,
  PRIMARY KEY (challenge_id, user_id)
);

-- Réponses horodatées ; la première réponse validée est définitive.
CREATE TABLE IF NOT EXISTS daily_answers (
  challenge_id   uuid        NOT NULL,
  user_id        uuid        NOT NULL,
  position       int         NOT NULL,
  question_id    uuid        NOT NULL,
  selected_index int,
  is_correct     boolean     NOT NULL DEFAULT false,
  answered_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id, position),
  FOREIGN KEY (challenge_id, user_id) REFERENCES daily_attempts(challenge_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS daily_challenges_day ON daily_challenges (program, day DESC);
CREATE INDEX IF NOT EXISTS daily_attempts_user_day ON daily_attempts (user_id, day DESC);
CREATE INDEX IF NOT EXISTS daily_attempts_board ON daily_attempts (challenge_id, score DESC, seconds) WHERE finished_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS daily_attempts_open ON daily_attempts (started_at) WHERE finished_at IS NULL;
CREATE INDEX IF NOT EXISTS daily_answers_user_time ON daily_answers (user_id, answered_at DESC);


-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_answers    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_attempts_read_own" ON daily_attempts;
CREATE POLICY "daily_attempts_read_own" ON daily_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- daily_challenges, daily_answers : volontairement aucune policy (ni
-- lecture ni écriture client) — tout passe par les RPC daily_*.


-- ----------------------------------------------------------------------------
-- 3. OUTILS INTERNES (non exposés aux clients)
-- ----------------------------------------------------------------------------

-- Aujourd'hui, à Paris.
CREATE OR REPLACE FUNCTION _daily_today()
RETURNS date
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (now() AT TIME ZONE 'Europe/Paris')::date; $$;

-- Minuit (heure de Paris) à la fin du jour donné : plus personne ne peut
-- commencer ce défi après.
CREATE OR REPLACE FUNCTION _daily_day_end(p_day date)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT ((p_day + 1)::timestamp AT TIME ZONE 'Europe/Paris'); $$;

-- Défi d'un jour : le crée s'il s'agit d'aujourd'hui et qu'il n'existe pas
-- encore (NULL si la banque de questions est vide ; jamais de création pour
-- un autre jour). Concurrence : un seul défi par jour (contrainte unique).
CREATE OR REPLACE FUNCTION _daily_ensure(p_day date)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id      uuid;
  v_recent  uuid[];
  v_try     uuid[];
  v_ids     uuid[];
  v_best    int;
  v_overlap int;
BEGIN
  SELECT id INTO v_id FROM daily_challenges WHERE program = 'cfa-l1' AND day = p_day;
  IF v_id IS NOT NULL OR p_day IS DISTINCT FROM _daily_today() THEN
    RETURN v_id;
  END IF;

  -- Questions des 14 défis précédents : à éviter si possible.
  SELECT coalesce(array_agg(DISTINCT q), '{}'::uuid[])
  INTO v_recent
  FROM daily_challenges dc, unnest(dc.question_ids) AS q
  WHERE dc.program = 'cfa-l1' AND dc.day >= p_day - 14 AND dc.day < p_day;

  FOR i IN 1..3 LOOP
    v_try := _duel_pick_questions(30);
    SELECT count(*) INTO v_overlap FROM unnest(v_try) AS x WHERE x = ANY (v_recent);
    IF v_ids IS NULL OR v_overlap < v_best THEN
      v_ids := v_try;
      v_best := v_overlap;
    END IF;
    EXIT WHEN v_best = 0;
  END LOOP;

  IF coalesce(array_length(v_ids, 1), 0) < 10 THEN
    RETURN NULL;
  END IF;

  INSERT INTO daily_challenges (day, question_ids)
  VALUES (p_day, v_ids)
  ON CONFLICT (program, day) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM daily_challenges WHERE program = 'cfa-l1' AND day = p_day;
  END IF;
  RETURN v_id;
END;
$$;

-- Défi existant d'un jour (sans création).
CREATE OR REPLACE FUNCTION _daily_find(p_day date)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM daily_challenges WHERE program = 'cfa-l1' AND day = p_day; $$;

-- Clôt une copie ouverte à l'instant p_at : score, nombre de questions,
-- temps (plafonné au chrono). Sans effet sur une copie déjà close.
CREATE OR REPLACE FUNCTION _daily_close(p_challenge uuid, p_user uuid, p_at timestamptz)
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  UPDATE daily_attempts a
  SET finished_at = p_at,
      score = (SELECT count(*)::int FROM daily_answers x
               WHERE x.challenge_id = a.challenge_id AND x.user_id = a.user_id AND x.is_correct),
      total = coalesce(array_length(c.question_ids, 1), 0),
      seconds = least(c.time_limit_seconds, greatest(0, floor(extract(epoch FROM (p_at - a.started_at)))::int))
  FROM daily_challenges c
  WHERE c.id = a.challenge_id
    AND a.challenge_id = p_challenge
    AND a.user_id = p_user
    AND a.finished_at IS NULL;
$$;

-- Rend d'office les copies dont le chrono est écoulé (marge de 20 s, comme
-- duel_answer), datées de la fin exacte du chrono. p_challenge NULL : tous
-- les défis. Renvoie le nombre de copies closes.
CREATE OR REPLACE FUNCTION _daily_settle_due(p_challenge uuid)
RETURNS int
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  WITH done AS (
    UPDATE daily_attempts a
    SET finished_at = a.started_at + make_interval(secs => c.time_limit_seconds),
        score = (SELECT count(*)::int FROM daily_answers x
                 WHERE x.challenge_id = a.challenge_id AND x.user_id = a.user_id AND x.is_correct),
        total = coalesce(array_length(c.question_ids, 1), 0),
        seconds = c.time_limit_seconds
    FROM daily_challenges c
    WHERE c.id = a.challenge_id
      AND a.finished_at IS NULL
      AND (p_challenge IS NULL OR a.challenge_id = p_challenge)
      AND now() > a.started_at + make_interval(secs => c.time_limit_seconds + 20)
    RETURNING 1
  )
  SELECT count(*)::int FROM done;
$$;

-- Classement d'un défi : copies rendues, meilleur score d'abord, puis le
-- plus rapide ; même score et même temps = même rang.
CREATE OR REPLACE FUNCTION _daily_board(p_challenge uuid)
RETURNS TABLE (rank int, user_id uuid, score int, total int, seconds int, finished_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (rank() OVER (ORDER BY a.score DESC, a.seconds ASC))::int,
         a.user_id, a.score, a.total, a.seconds, a.finished_at
  FROM daily_attempts a
  WHERE a.challenge_id = p_challenge AND a.finished_at IS NOT NULL;
$$;

-- Ma copie (NULL si je n'ai pas commencé). Score, temps et rang : seulement
-- une fois la copie rendue.
CREATE OR REPLACE FUNCTION _daily_me_json(p_challenge uuid, p_user uuid)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'started_at', a.started_at,
    'finished_at', a.finished_at,
    'deadline', a.started_at + make_interval(secs => c.time_limit_seconds),
    'answered', (SELECT count(*) FROM daily_answers x WHERE x.challenge_id = a.challenge_id AND x.user_id = a.user_id),
    'score', a.score,
    'total', a.total,
    'seconds', a.seconds,
    'rank', CASE WHEN a.finished_at IS NOT NULL THEN
              (SELECT b.rank FROM _daily_board(a.challenge_id) b WHERE b.user_id = a.user_id) END
  )
  FROM daily_attempts a
  JOIN daily_challenges c ON c.id = a.challenge_id
  WHERE a.challenge_id = p_challenge AND a.user_id = p_user;
$$;


-- ----------------------------------------------------------------------------
-- 4. RPC (joueurs connectés)
-- ----------------------------------------------------------------------------

-- Le défi d'un jour (aujourd'hui par défaut ; créé à la première ouverture
-- du jour) : format, horaires, nombre de joueurs et ma copie. Ne contient
-- jamais de question ni de bonne réponse.
CREATE OR REPLACE FUNCTION daily_get(p_day date DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_today date := _daily_today();
  v_day   date := coalesce(p_day, _daily_today());
  v_id    uuid;
  c       daily_challenges%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_day <= v_today THEN
    v_id := _daily_ensure(v_day);
  END IF;
  IF v_id IS NULL THEN
    RETURN json_build_object(
      'day', v_day,
      'today', v_today,
      'is_today', v_day = v_today,
      'exists', false,
      'server_now', now(),
      'reason', CASE WHEN v_day > v_today THEN 'future' WHEN v_day = v_today THEN 'no_bank' ELSE 'none' END
    );
  END IF;

  PERFORM _daily_settle_due(v_id);
  SELECT * INTO c FROM daily_challenges WHERE id = v_id;

  RETURN json_build_object(
    'day', c.day,
    'today', v_today,
    'is_today', c.day = v_today,
    'exists', true,
    'question_count', coalesce(array_length(c.question_ids, 1), 0),
    'time_limit_seconds', c.time_limit_seconds,
    'server_now', now(),
    'closes_at', _daily_day_end(c.day),
    'players', (SELECT count(*) FROM daily_attempts WHERE challenge_id = c.id AND finished_at IS NOT NULL),
    'playing', (SELECT count(*) FROM daily_attempts WHERE challenge_id = c.id AND finished_at IS NULL),
    'top_score', (SELECT max(score) FROM daily_attempts WHERE challenge_id = c.id AND finished_at IS NOT NULL),
    'me', _daily_me_json(c.id, v_uid)
  );
END;
$$;

-- Commence (le jour même seulement) ou reprend ma copie : démarre le chrono
-- au premier appel et renvoie les questions SANS la bonne réponse, avec mes
-- réponses déjà données (reprise après un rechargement).
CREATE OR REPLACE FUNCTION daily_start(p_day date)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_today     date := _daily_today();
  v_day       date := coalesce(p_day, _daily_today());
  v_id        uuid;
  c           daily_challenges%ROWTYPE;
  a           daily_attempts%ROWTYPE;
  v_questions json;
  v_answers   json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND username IS NOT NULL) THEN
    RAISE EXCEPTION 'Complète ton profil avant de jouer.';
  END IF;

  v_id := CASE WHEN v_day = v_today THEN _daily_ensure(v_day) ELSE _daily_find(v_day) END;
  IF v_id IS NULL THEN
    IF v_day = v_today THEN
      RAISE EXCEPTION 'Le défi du jour n''est pas disponible pour le moment.';
    END IF;
    RAISE EXCEPTION 'Ce défi est clos : celui d''aujourd''hui t''attend.';
  END IF;
  PERFORM _daily_settle_due(v_id);
  SELECT * INTO c FROM daily_challenges WHERE id = v_id;

  SELECT * INTO a FROM daily_attempts WHERE challenge_id = v_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    IF v_day <> v_today THEN
      RAISE EXCEPTION 'Ce défi est clos : celui d''aujourd''hui t''attend.';
    END IF;
    INSERT INTO daily_attempts (challenge_id, user_id, day)
    VALUES (v_id, v_uid, c.day)
    ON CONFLICT (challenge_id, user_id) DO NOTHING;
    SELECT * INTO a FROM daily_attempts WHERE challenge_id = v_id AND user_id = v_uid FOR UPDATE;
  END IF;

  IF a.finished_at IS NOT NULL THEN
    RETURN json_build_object('finished', true, 'day', c.day);
  END IF;

  SELECT json_agg(json_build_object(
    'position', t.pos - 1,
    'id', qq.id,
    'prompt', qq.prompt,
    'choices', qq.choices,
    'topic', _rl_topic_key(lf.name)
  ) ORDER BY t.pos)
  INTO v_questions
  FROM unnest(c.question_ids) WITH ORDINALITY AS t(qid, pos)
  JOIN quiz_questions qq ON qq.id = t.qid
  JOIN quiz_sets qs ON qs.id = qq.set_id
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id;

  SELECT coalesce(json_agg(json_build_object('position', x.position, 'selected_index', x.selected_index) ORDER BY x.position), '[]'::json)
  INTO v_answers
  FROM daily_answers x
  WHERE x.challenge_id = v_id AND x.user_id = v_uid;

  RETURN json_build_object(
    'finished', false,
    'day', c.day,
    'started_at', a.started_at,
    'server_now', now(),
    'time_limit_seconds', c.time_limit_seconds,
    'deadline', a.started_at + make_interval(secs => c.time_limit_seconds),
    'questions', coalesce(v_questions, '[]'::json),
    'answers', v_answers
  );
END;
$$;

-- Enregistre une réponse (définitive) et la corrige côté serveur, sans
-- renvoyer la correction. Rend la copie automatiquement à la dernière
-- question.
CREATE OR REPLACE FUNCTION daily_answer(p_day date, p_position int, p_selected int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_id       uuid;
  c          daily_challenges%ROWTYPE;
  a          daily_attempts%ROWTYPE;
  v_limit    interval;
  v_n        int;
  v_qid      uuid;
  v_correct  int;
  v_nchoices int;
  v_answered int;
  v_done     boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_id := _daily_find(p_day);
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Défi introuvable.';
  END IF;
  SELECT * INTO c FROM daily_challenges WHERE id = v_id;
  SELECT * INTO a FROM daily_attempts WHERE challenge_id = v_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commence le défi avant de répondre.';
  END IF;
  IF a.finished_at IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'finished', true);
  END IF;

  v_limit := make_interval(secs => c.time_limit_seconds);
  -- 20 s de marge pour la latence réseau, au-delà la copie est rendue d'office
  IF now() > a.started_at + v_limit + interval '20 seconds' THEN
    PERFORM _daily_close(v_id, v_uid, a.started_at + v_limit);
    RETURN json_build_object('ok', false, 'finished', true);
  END IF;

  v_n := coalesce(array_length(c.question_ids, 1), 0);
  IF p_position IS NULL OR p_position < 0 OR p_position >= v_n THEN
    RAISE EXCEPTION 'Question invalide.';
  END IF;
  v_qid := c.question_ids[p_position + 1];

  SELECT correct_index, coalesce(array_length(choices, 1), 0)
  INTO v_correct, v_nchoices
  FROM quiz_questions WHERE id = v_qid;
  IF p_selected IS NULL OR p_selected < 0 OR p_selected >= coalesce(v_nchoices, 0) THEN
    RAISE EXCEPTION 'Réponse invalide.';
  END IF;

  INSERT INTO daily_answers (challenge_id, user_id, position, question_id, selected_index, is_correct)
  VALUES (v_id, v_uid, p_position, v_qid, p_selected, coalesce(p_selected = v_correct, false))
  ON CONFLICT (challenge_id, user_id, position) DO NOTHING;

  SELECT count(*) INTO v_answered FROM daily_answers WHERE challenge_id = v_id AND user_id = v_uid;
  IF v_answered >= v_n THEN
    PERFORM _daily_close(v_id, v_uid, least(now(), a.started_at + v_limit));
    v_done := true;
  END IF;

  RETURN json_build_object('ok', true, 'answered', v_answered, 'finished', v_done);
END;
$$;

-- Rendre ma copie (les questions sans réponse comptent fausses). Renvoie ma
-- copie close (score, temps, rang).
CREATE OR REPLACE FUNCTION daily_finish(p_day date)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
  c     daily_challenges%ROWTYPE;
  a     daily_attempts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_id := _daily_find(p_day);
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Défi introuvable.';
  END IF;
  SELECT * INTO c FROM daily_challenges WHERE id = v_id;
  SELECT * INTO a FROM daily_attempts WHERE challenge_id = v_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu n''as pas commencé ce défi.';
  END IF;
  IF a.finished_at IS NULL THEN
    PERFORM _daily_close(v_id, v_uid, least(now(), a.started_at + make_interval(secs => c.time_limit_seconds)));
  END IF;
  RETURN json_build_object('finished', true, 'day', c.day, 'me', _daily_me_json(v_id, v_uid));
END;
$$;

-- Classement d'un jour, visible de tous les joueurs connectés : rang,
-- pseudo, score, temps (jamais de réponse). `me` : ma ligne, même hors des
-- p_limit premiers.
CREATE OR REPLACE FUNCTION daily_leaderboard(p_day date DEFAULT NULL, p_limit int DEFAULT 100)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date := coalesce(p_day, _daily_today());
  v_id  uuid;
  v_lim int := greatest(1, least(coalesce(p_limit, 100), 500));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_id := _daily_find(v_day);
  IF v_id IS NULL THEN
    RETURN json_build_object('day', v_day, 'exists', false, 'players', 0, 'playing', 0, 'rows', '[]'::json, 'me', NULL);
  END IF;
  PERFORM _daily_settle_due(v_id);

  RETURN json_build_object(
    'day', v_day,
    'exists', true,
    'players', (SELECT count(*) FROM daily_attempts WHERE challenge_id = v_id AND finished_at IS NOT NULL),
    'playing', (SELECT count(*) FROM daily_attempts WHERE challenge_id = v_id AND finished_at IS NULL),
    'rows', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.rank, t.finished_at), '[]'::json)
      FROM (
        SELECT b.rank, b.user_id, p.username, p.avatar_url, b.score, b.total, b.seconds, b.finished_at,
               b.user_id = v_uid AS is_me
        FROM _daily_board(v_id) b
        LEFT JOIN profiles p ON p.id = b.user_id
        ORDER BY b.rank, b.finished_at
        LIMIT v_lim
      ) t
    ),
    'me', (
      SELECT row_to_json(t)
      FROM (
        SELECT b.rank, b.user_id, p.username, p.avatar_url, b.score, b.total, b.seconds, b.finished_at, true AS is_me
        FROM _daily_board(v_id) b
        LEFT JOIN profiles p ON p.id = b.user_id
        WHERE b.user_id = v_uid
      ) t
    )
  );
END;
$$;

-- Correction de ma copie, seulement une fois rendue (ou son chrono écoulé) :
-- questions, bonne réponse, explication, ma réponse, et la part des joueurs
-- (copies rendues) qui ont trouvé chaque question.
CREATE OR REPLACE FUNCTION daily_review(p_day date)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_id      uuid;
  c         daily_challenges%ROWTYPE;
  a         daily_attempts%ROWTYPE;
  v_players int;
  v_review  json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_id := _daily_find(p_day);
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Défi introuvable.';
  END IF;
  PERFORM _daily_settle_due(v_id);
  SELECT * INTO c FROM daily_challenges WHERE id = v_id;
  SELECT * INTO a FROM daily_attempts WHERE challenge_id = v_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu n''as pas joué ce défi.';
  END IF;
  IF a.finished_at IS NULL THEN
    RAISE EXCEPTION 'La correction s''ouvre quand tu as rendu ta copie.';
  END IF;

  SELECT count(*) INTO v_players FROM daily_attempts WHERE challenge_id = v_id AND finished_at IS NOT NULL;

  SELECT json_agg(json_build_object(
    'position', t.pos - 1,
    'question_id', qq.id,
    'prompt', qq.prompt,
    'choices', qq.choices,
    'correct_index', qq.correct_index,
    'explanation', qq.explanation,
    'topic', _rl_topic_key(lf.name),
    'selected_index', x.selected_index,
    'is_correct', coalesce(x.is_correct, false),
    'answered_at', x.answered_at,
    'players', v_players,
    'success_count', s.n,
    'success_rate', CASE WHEN v_players > 0 THEN round(100.0 * s.n / v_players)::int END
  ) ORDER BY t.pos)
  INTO v_review
  FROM unnest(c.question_ids) WITH ORDINALITY AS t(qid, pos)
  JOIN quiz_questions qq ON qq.id = t.qid
  JOIN quiz_sets qs ON qs.id = qq.set_id
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  LEFT JOIN daily_answers x ON x.challenge_id = v_id AND x.user_id = v_uid AND x.position = t.pos - 1
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n
    FROM daily_answers y
    JOIN daily_attempts ya ON ya.challenge_id = y.challenge_id AND ya.user_id = y.user_id AND ya.finished_at IS NOT NULL
    WHERE y.challenge_id = v_id AND y.position = t.pos - 1 AND y.is_correct
  ) s ON true;

  RETURN coalesce(v_review, '[]'::json);
END;
$$;

-- Les derniers défis (aujourd'hui compris), du plus récent au plus ancien :
-- nombre de joueurs, meilleur score, et ma copie si j'ai joué.
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
      WHERE c.program = 'cfa-l1' AND c.day <= _daily_today()
      ORDER BY c.day DESC
      LIMIT v_lim
    ) t
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 5. DROITS D'EXÉCUTION
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION _daily_today() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_day_end(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_ensure(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_find(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_close(uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_settle_due(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_board(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _daily_me_json(uuid, uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION daily_get(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION daily_start(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION daily_answer(date, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION daily_finish(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION daily_leaderboard(date, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION daily_review(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION daily_history(int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION daily_get(date) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_start(date) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_answer(date, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_finish(date) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_leaderboard(date, int) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_review(date) TO authenticated;
GRANT EXECUTE ON FUNCTION daily_history(int) TO authenticated;
