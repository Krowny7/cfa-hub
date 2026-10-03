-- ============================================================================
-- Duels et ELO (refonte V2) — l'ELO de la table `ratings` bouge enfin.
--
-- Deux sources font bouger l'ELO, chacune journalisée dans `rating_events` :
--
-- 1. Les DUELS, asynchrones. Deux joueurs passent les 30 mêmes questions
--    (tirées dans la banque des examens blancs : QCM officiels publiés des
--    dossiers « (Système) », pondérés comme publish_mock_exam), dans le même
--    ordre, 45 min chacun, quand ils veulent dans un délai de 48 h.
--      • « Défier quelqu'un » : défi en attente (pending) ; le challenger peut
--        jouer tout de suite, l'adversaire accepte (active) ou refuse.
--      • « Au hasard » : file ouverte. Si un autre joueur attend déjà un
--        adversaire, on le rejoint (ELO le plus proche d'abord) ; sinon on
--        ouvre un duel que le prochain joueur à chercher rejoindra.
--    Résultat quand les deux ont rendu leur copie : meilleur score gagne,
--    égalité → le plus rapide, même seconde → nul. À l'expiration (48 h) :
--    un défi jamais accepté expire sans effet ; dans un duel accepté, celui
--    qui n'a pas joué perd par forfait (0 point) ; si personne n'a joué, le
--    duel expire sans effet. Pas de tâche planifiée : l'expiration est
--    appliquée paresseusement par les RPC (duel_state, duel_refresh_mine…).
--    ELO façon échecs, K = 48 pendant le placement (games_played < 5) puis
--    32 — même règle que kFactor() dans lib/ranks.ts — arrondi comme
--    Math.round côté JS.
--
-- 2. Les EXAMENS BLANCS CLASSÉS. Une fois l'examen clos (statut 'closed' ou
--    fenêtre ±window_days dépassée), apply_mock_exam_elo(exam_id) applique
--    l'ELO de tous les participants (premier essai officiel, table
--    mock_exam_results) : chaque participant « joue » contre chacun des
--    autres (victoire si meilleur pourcentage, nul si égalité) avec un
--    facteur K/(n-1). Un examen pèse donc autant qu'un duel, quel que soit le
--    nombre de participants, et compte pour une partie (games_played + 1).
--    Idempotent : marqueur mock_exams.elo_applied_at + unicité des
--    événements. Appelable par n'importe quel joueur connecté (la page de
--    résultats l'appelle paresseusement après la clôture) : la fonction
--    vérifie elle-même la clôture, le résultat ne dépend pas de l'appelant.
--
-- Sécurité :
--   • la bonne réponse n'est jamais envoyée avant la fin du duel (duel_start
--     ne renvoie que id/prompt/choices ; duel_review n'ouvre la correction
--     qu'une fois le duel terminé) ; correction côté serveur (duel_answer) ;
--   • les scores restent cachés jusqu'à la fin : duels.*_score n'est rempli
--     qu'au règlement, duel_answers n'est lisible par aucun client ;
--   • aucune écriture directe : pas de policy INSERT/UPDATE/DELETE, tout
--     passe par les fonctions SECURITY DEFINER ci-dessous.
--
-- RLS :
--   • duels : chaque joueur lit les duels auxquels il participe ;
--   • duel_answers : aucune lecture client ;
--   • rating_events : lisible par tous les joueurs connectés (l'historique
--     ELO est public, comme la table `ratings` et le classement).
--
-- Idempotent : peut être rejoué sans risque.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rating_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain      text        NOT NULL DEFAULT 'finance',
  source      text        NOT NULL CHECK (source IN ('duel', 'mock_exam', 'placement')),
  ref_id      uuid,
  elo_before  int         NOT NULL,
  elo_after   int         NOT NULL,
  delta       int         NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS duels (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain                 text        NOT NULL DEFAULT 'finance',
  program                text        NOT NULL DEFAULT 'cfa-l1',
  -- 'challenge' = adversaire choisi, 'random' = file ouverte (opponent_id
  -- reste NULL tant que personne n'a rejoint)
  mode                   text        NOT NULL DEFAULT 'challenge' CHECK (mode IN ('random', 'challenge')),
  status                 text        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'active', 'finished', 'declined', 'expired')),
  challenger_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id            uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  -- les mêmes questions, dans le même ordre, pour les deux joueurs
  question_ids           uuid[]      NOT NULL,
  time_limit_seconds     int         NOT NULL DEFAULT 2700,
  challenger_started_at  timestamptz,
  challenger_finished_at timestamptz,
  opponent_started_at    timestamptz,
  opponent_finished_at   timestamptz,
  -- remplis au règlement seulement (les scores restent cachés jusqu'à la fin)
  challenger_score       int,
  opponent_score         int,
  challenger_seconds     int,
  opponent_seconds       int,
  challenger_elo_before  int,
  opponent_elo_before    int,
  challenger_delta       int,
  opponent_delta         int,
  winner_id              uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  rematch_of             uuid        REFERENCES duels(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  accepted_at            timestamptz,
  expires_at             timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  finished_at            timestamptz,
  CONSTRAINT duels_not_self CHECK (opponent_id IS NULL OR opponent_id <> challenger_id)
);

-- Réponses de chaque joueur, horodatées. La première réponse validée est
-- définitive (clé primaire duel/joueur/position).
CREATE TABLE IF NOT EXISTS duel_answers (
  duel_id        uuid        NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position       int         NOT NULL,
  question_id    uuid        NOT NULL,
  selected_index int,
  is_correct     boolean     NOT NULL DEFAULT false,
  answered_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (duel_id, user_id, position)
);

-- Examens blancs classés : marqueur d'application de l'ELO
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS elo_applied_at timestamptz;

CREATE INDEX IF NOT EXISTS rating_events_user_time ON rating_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rating_events_ref ON rating_events (source, ref_id);
-- Un seul événement par joueur et par duel / examen (filet d'idempotence)
CREATE UNIQUE INDEX IF NOT EXISTS rating_events_once ON rating_events (user_id, source, ref_id) WHERE ref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS duels_challenger ON duels (challenger_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS duels_opponent ON duels (opponent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS duels_open_queue ON duels (created_at) WHERE status = 'pending' AND mode = 'random' AND opponent_id IS NULL;
CREATE INDEX IF NOT EXISTS duel_answers_user_time ON duel_answers (user_id, answered_at DESC);


-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE rating_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_answers  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rating_events_read_all" ON rating_events;
CREATE POLICY "rating_events_read_all" ON rating_events
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "duels_read_own" ON duels;
CREATE POLICY "duels_read_own" ON duels
  FOR SELECT TO authenticated
  USING (challenger_id = auth.uid() OR opponent_id = auth.uid());

-- duel_answers : volontairement aucune policy (ni lecture ni écriture
-- client) — tout passe par duel_start / duel_answer / duel_review.


-- ----------------------------------------------------------------------------
-- 3. OUTILS INTERNES (non exposés aux clients)
-- ----------------------------------------------------------------------------

-- Dossier de la banque officielle → clé de matière (mêmes clés que
-- lib/practiceTopics.ts).
CREATE OR REPLACE FUNCTION _rl_topic_key(p_folder text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_folder
    WHEN 'Éthique et Standards Professionnels (Système)' THEN 'ethics'
    WHEN 'Méthodes Quantitatives (Système)'              THEN 'quant'
    WHEN 'Économie (Système)'                            THEN 'economics'
    WHEN 'Analyse des États Financiers (Système)'        THEN 'fsa'
    WHEN 'Finance d''Entreprise (Système)'               THEN 'corporate'
    WHEN 'Investissements en Actions (Système)'          THEN 'equity'
    WHEN 'Fixed Income (Système)'                        THEN 'fixed_income'
    WHEN 'Instruments Dérivés (Système)'                 THEN 'derivatives'
    WHEN 'Investissements Alternatifs (Système)'         THEN 'alternatives'
    WHEN 'Gestion de Portefeuille (Système)'             THEN 'portfolio'
  END;
$$;

-- Arrondi « au demi supérieur », identique à Math.round en JS (y compris
-- pour les nombres négatifs : -2.5 → -2), pour que l'enjeu affiché avant le
-- duel (eloStakes) corresponde au point près.
CREATE OR REPLACE FUNCTION _round_half_up(x numeric)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$ SELECT floor(x + 0.5)::int; $$;

-- Score attendu de A contre B (formule d'Elo).
CREATE OR REPLACE FUNCTION _elo_expected(p_a int, p_b int)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$ SELECT 1.0 / (1.0 + power(10.0, (p_b - p_a) / 400.0)); $$;

-- Facteur K : 48 pendant les 5 parties de placement, 32 ensuite.
CREATE OR REPLACE FUNCTION _rating_k(p_games int)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE WHEN coalesce(p_games, 0) < 5 THEN 48 ELSE 32 END; $$;

-- Dernière activité connue d'un joueur (XP, entraînement, examen, duel).
CREATE OR REPLACE FUNCTION _player_last_active(p_user uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT greatest(
    (SELECT max(occurred_at)  FROM xp_events                WHERE user_id = p_user),
    (SELECT max(completed_at) FROM practice_session_results WHERE user_id = p_user),
    (SELECT max(completed_at) FROM mock_exam_results        WHERE user_id = p_user),
    (SELECT max(answered_at)  FROM duel_answers             WHERE user_id = p_user)
  );
$$;

-- Le joueur participe-t-il à ce duel ?
CREATE OR REPLACE FUNCTION _duel_is_player(p_duel_id uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM duels
    WHERE id = p_duel_id AND (challenger_id = p_user OR opponent_id = p_user)
  );
$$;

-- Tire p_count questions dans la banque des examens blancs, pondérées par
-- matière comme publish_mock_exam (méthode du plus grand reste), complète au
-- hasard si une matière manque de questions, puis mélange l'ordre.
CREATE OR REPLACE FUNCTION _duel_pick_questions(p_count int)
RETURNS uuid[]
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ids  uuid[];
  v_more uuid[];
BEGIN
  WITH weights(folder_name, weight) AS (
    VALUES
      ('Éthique et Standards Professionnels (Système)', 17.5),
      ('Méthodes Quantitatives (Système)', 7.5),
      ('Économie (Système)', 7.5),
      ('Analyse des États Financiers (Système)', 12.5),
      ('Finance d''Entreprise (Système)', 7.5),
      ('Investissements en Actions (Système)', 12.5),
      ('Fixed Income (Système)', 12.5),
      ('Instruments Dérivés (Système)', 6.5),
      ('Investissements Alternatifs (Système)', 8.5),
      ('Gestion de Portefeuille (Système)', 10.0)
  ),
  total_weight AS (
    SELECT sum(weight) AS tw FROM weights
  ),
  raw_alloc AS (
    SELECT
      w.folder_name,
      floor(w.weight / tw.tw * p_count)::int AS base_count,
      (w.weight / tw.tw * p_count) - floor(w.weight / tw.tw * p_count) AS remainder
    FROM weights w, total_weight tw
  ),
  leftover AS (
    SELECT greatest(p_count - (SELECT coalesce(sum(base_count), 0) FROM raw_alloc), 0) AS n
  ),
  ranked AS (
    SELECT folder_name, base_count, row_number() OVER (ORDER BY remainder DESC) AS rn
    FROM raw_alloc
  ),
  final_alloc AS (
    SELECT folder_name, base_count + CASE WHEN rn <= (SELECT n FROM leftover) THEN 1 ELSE 0 END AS alloc
    FROM ranked
  ),
  pool AS (
    SELECT qq.id AS question_id, lf.name AS folder_name
    FROM library_folders lf
    JOIN quiz_sets qs ON qs.folder_id = lf.id AND qs.is_official = true AND qs.official_published = true
    JOIN quiz_questions qq ON qq.set_id = qs.id
    WHERE lf.kind = 'quizzes'
      AND lf.name IN (SELECT folder_name FROM weights)
      AND coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
  ),
  picked AS (
    SELECT question_id, folder_name, row_number() OVER (PARTITION BY folder_name ORDER BY random()) AS rn
    FROM pool
  )
  SELECT array_agg(p.question_id)
  INTO v_ids
  FROM picked p
  JOIN final_alloc fa ON fa.folder_name = p.folder_name
  WHERE p.rn <= fa.alloc;

  v_ids := coalesce(v_ids, '{}'::uuid[]);

  IF coalesce(array_length(v_ids, 1), 0) < p_count THEN
    SELECT array_agg(x.id)
    INTO v_more
    FROM (
      SELECT qq.id
      FROM library_folders lf
      JOIN quiz_sets qs ON qs.folder_id = lf.id AND qs.is_official = true AND qs.official_published = true
      JOIN quiz_questions qq ON qq.set_id = qs.id
      WHERE lf.kind = 'quizzes'
        AND lf.name LIKE '%(Système)'
        AND coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
        AND NOT (qq.id = ANY (v_ids))
      ORDER BY random()
      LIMIT p_count - coalesce(array_length(v_ids, 1), 0)
    ) x;
    v_ids := v_ids || coalesce(v_more, '{}'::uuid[]);
  END IF;

  SELECT array_agg(t.id ORDER BY random()) INTO v_ids FROM unnest(v_ids) AS t(id);
  RETURN coalesce(v_ids, '{}'::uuid[]);
END;
$$;

-- Règle un duel s'il est mûr (les deux copies rendues, ou délai dépassé).
-- Appelée par toutes les RPC qui touchent un duel : c'est elle qui applique
-- paresseusement chronos écoulés, expirations, forfaits et ELO. Atomique
-- (verrou sur la ligne du duel puis sur les deux lignes de `ratings`, dans
-- un ordre stable) et idempotente (ne fait rien sur un duel déjà réglé).
-- Renvoie le statut du duel après passage.
CREATE OR REPLACE FUNCTION _duel_settle(p_duel_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  d         duels%ROWTYPE;
  v_now     timestamptz := now();
  v_limit   interval;
  v_expired boolean;
  v_c_done  boolean;
  v_o_done  boolean;
  v_c_score int := 0;
  v_o_score int := 0;
  v_c_sec   int;
  v_o_sec   int;
  v_s       numeric;
  v_c_elo   int;
  v_o_elo   int;
  v_c_games int;
  v_o_games int;
  v_c_delta int;
  v_o_delta int;
BEGIN
  SELECT * INTO d FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF d.status NOT IN ('pending', 'active') THEN
    RETURN d.status;
  END IF;

  v_limit := make_interval(secs => d.time_limit_seconds);
  v_expired := v_now > d.expires_at;

  -- Chrono écoulé : la copie est rendue d'office à la fin du temps imparti.
  IF d.challenger_started_at IS NOT NULL AND d.challenger_finished_at IS NULL
     AND v_now > d.challenger_started_at + v_limit THEN
    d.challenger_finished_at := d.challenger_started_at + v_limit;
  END IF;
  IF d.opponent_started_at IS NOT NULL AND d.opponent_finished_at IS NULL
     AND v_now > d.opponent_started_at + v_limit THEN
    d.opponent_finished_at := d.opponent_started_at + v_limit;
  END IF;

  v_c_done := d.challenger_finished_at IS NOT NULL;
  v_o_done := d.opponent_finished_at IS NOT NULL;

  IF v_expired THEN
    -- Défi jamais accepté / personne n'a rejoint, ou personne n'a joué :
    -- le duel expire sans effet sur l'ELO.
    IF d.status = 'pending' OR (d.challenger_started_at IS NULL AND d.opponent_started_at IS NULL) THEN
      UPDATE duels
      SET status = 'expired',
          challenger_finished_at = d.challenger_finished_at,
          opponent_finished_at = d.opponent_finished_at,
          finished_at = v_now
      WHERE id = d.id;
      RETURN 'expired';
    END IF;
    -- Un joueur en pleine partie garde son chrono jusqu'au bout.
    IF (d.challenger_started_at IS NOT NULL AND NOT v_c_done)
       OR (d.opponent_started_at IS NOT NULL AND NOT v_o_done) THEN
      UPDATE duels
      SET challenger_finished_at = d.challenger_finished_at,
          opponent_finished_at = d.opponent_finished_at
      WHERE id = d.id;
      RETURN d.status;
    END IF;
    -- Sinon : celui qui n'a jamais commencé perd par forfait.
  ELSE
    IF d.status <> 'active' OR NOT v_c_done OR NOT v_o_done THEN
      UPDATE duels
      SET challenger_finished_at = d.challenger_finished_at,
          opponent_finished_at = d.opponent_finished_at
      WHERE id = d.id;
      RETURN d.status;
    END IF;
  END IF;

  -- Règlement ------------------------------------------------------------
  SELECT
    coalesce(sum(CASE WHEN user_id = d.challenger_id AND is_correct THEN 1 ELSE 0 END), 0),
    coalesce(sum(CASE WHEN user_id = d.opponent_id AND is_correct THEN 1 ELSE 0 END), 0)
  INTO v_c_score, v_o_score
  FROM duel_answers
  WHERE duel_id = d.id;

  v_c_sec := CASE WHEN d.challenger_started_at IS NULL THEN NULL ELSE
    least(d.time_limit_seconds, greatest(0, floor(extract(epoch FROM (d.challenger_finished_at - d.challenger_started_at)))::int)) END;
  v_o_sec := CASE WHEN d.opponent_started_at IS NULL THEN NULL ELSE
    least(d.time_limit_seconds, greatest(0, floor(extract(epoch FROM (d.opponent_finished_at - d.opponent_started_at)))::int)) END;

  -- Meilleur score gagne ; égalité → le plus rapide ; même seconde → nul.
  -- Un joueur qui n'a jamais commencé (forfait) n'a pas de temps.
  IF v_c_score > v_o_score THEN
    v_s := 1;
  ELSIF v_c_score < v_o_score THEN
    v_s := 0;
  ELSIF v_c_sec IS NULL AND v_o_sec IS NULL THEN
    v_s := 0.5;
  ELSIF v_o_sec IS NULL THEN
    v_s := 1;
  ELSIF v_c_sec IS NULL THEN
    v_s := 0;
  ELSIF v_c_sec < v_o_sec THEN
    v_s := 1;
  ELSIF v_c_sec > v_o_sec THEN
    v_s := 0;
  ELSE
    v_s := 0.5;
  END IF;

  INSERT INTO ratings (user_id) VALUES (d.challenger_id), (d.opponent_id)
  ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM ratings WHERE user_id IN (d.challenger_id, d.opponent_id) ORDER BY user_id FOR UPDATE;

  SELECT elo, games_played INTO v_c_elo, v_c_games FROM ratings WHERE user_id = d.challenger_id;
  SELECT elo, games_played INTO v_o_elo, v_o_games FROM ratings WHERE user_id = d.opponent_id;

  v_c_delta := _round_half_up(_rating_k(v_c_games) * (v_s - _elo_expected(v_c_elo, v_o_elo)));
  v_o_delta := _round_half_up(_rating_k(v_o_games) * ((1 - v_s) - _elo_expected(v_o_elo, v_c_elo)));

  UPDATE ratings SET elo = elo + v_c_delta, games_played = games_played + 1, updated_at = v_now
  WHERE user_id = d.challenger_id;
  UPDATE ratings SET elo = elo + v_o_delta, games_played = games_played + 1, updated_at = v_now
  WHERE user_id = d.opponent_id;

  INSERT INTO rating_events (user_id, domain, source, ref_id, elo_before, elo_after, delta)
  VALUES
    (d.challenger_id, d.domain, 'duel', d.id, v_c_elo, v_c_elo + v_c_delta, v_c_delta),
    (d.opponent_id,   d.domain, 'duel', d.id, v_o_elo, v_o_elo + v_o_delta, v_o_delta)
  ON CONFLICT DO NOTHING;

  UPDATE duels
  SET status = 'finished',
      challenger_finished_at = d.challenger_finished_at,
      opponent_finished_at = d.opponent_finished_at,
      challenger_score = v_c_score,
      opponent_score = v_o_score,
      challenger_seconds = v_c_sec,
      opponent_seconds = v_o_sec,
      challenger_elo_before = v_c_elo,
      opponent_elo_before = v_o_elo,
      challenger_delta = v_c_delta,
      opponent_delta = v_o_delta,
      winner_id = CASE WHEN v_s = 1 THEN d.challenger_id WHEN v_s = 0 THEN d.opponent_id END,
      finished_at = v_now
  WHERE id = d.id;

  RETURN 'finished';
END;
$$;

-- Fiche d'un joueur dans un duel (pour duel_state). Le score, le temps et
-- l'ELO gagné ou perdu ne sont donnés qu'une fois le duel terminé ; avant,
-- seulement l'avancement (nombre de questions répondues).
CREATE OR REPLACE FUNCTION _duel_player_json(d duels, p_user uuid, p_is_challenger boolean)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'elo', coalesce(r.elo, 1200),
    'games_played', coalesce(r.games_played, 0),
    'started_at', CASE WHEN p_is_challenger THEN d.challenger_started_at ELSE d.opponent_started_at END,
    'finished_at', CASE WHEN p_is_challenger THEN d.challenger_finished_at ELSE d.opponent_finished_at END,
    'answered', (SELECT count(*) FROM duel_answers a WHERE a.duel_id = d.id AND a.user_id = p_user),
    'score', CASE WHEN d.status = 'finished' THEN (CASE WHEN p_is_challenger THEN d.challenger_score ELSE d.opponent_score END) END,
    'seconds', CASE WHEN d.status = 'finished' THEN (CASE WHEN p_is_challenger THEN d.challenger_seconds ELSE d.opponent_seconds END) END,
    'delta', CASE WHEN d.status = 'finished' THEN (CASE WHEN p_is_challenger THEN d.challenger_delta ELSE d.opponent_delta END) END,
    'elo_before', CASE WHEN d.status = 'finished' THEN (CASE WHEN p_is_challenger THEN d.challenger_elo_before ELSE d.opponent_elo_before END) END
  )
  FROM profiles p
  LEFT JOIN ratings r ON r.user_id = p.id
  WHERE p.id = p_user;
$$;

-- Applique l'ELO d'un examen blanc clos (voir l'en-tête). Interne : la
-- version publique apply_mock_exam_elo vérifie la connexion.
CREATE OR REPLACE FUNCTION _apply_mock_exam_elo(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  e     mock_exams%ROWTYPE;
  v_now timestamptz := now();
  v_n   int;
BEGIN
  SELECT * INTO e FROM mock_exams WHERE id = p_exam_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('applied', false, 'reason', 'not_found');
  END IF;
  IF e.elo_applied_at IS NOT NULL THEN
    RETURN json_build_object('applied', false, 'reason', 'already', 'applied_at', e.elo_applied_at);
  END IF;
  IF NOT (e.status = 'closed' OR v_now > e.scheduled_at + make_interval(days => coalesce(e.window_days, 3))) THEN
    RETURN json_build_object('applied', false, 'reason', 'not_closed');
  END IF;

  SELECT count(*) INTO v_n FROM mock_exam_results WHERE exam_id = p_exam_id AND total > 0;

  IF v_n >= 2 THEN
    INSERT INTO ratings (user_id)
    SELECT user_id FROM mock_exam_results WHERE exam_id = p_exam_id AND total > 0
    ON CONFLICT (user_id) DO NOTHING;
    PERFORM 1 FROM ratings
    WHERE user_id IN (SELECT user_id FROM mock_exam_results WHERE exam_id = p_exam_id AND total > 0)
    ORDER BY user_id FOR UPDATE;

    WITH players AS (
      SELECT mer.user_id, mer.score::numeric / mer.total AS pct, r.elo, r.games_played
      FROM mock_exam_results mer
      JOIN ratings r ON r.user_id = mer.user_id
      WHERE mer.exam_id = p_exam_id AND mer.total > 0
    ),
    pairs AS (
      SELECT a.user_id,
             sum((CASE WHEN a.pct > b.pct THEN 1.0 WHEN a.pct < b.pct THEN 0.0 ELSE 0.5 END)
                 - _elo_expected(a.elo, b.elo)) AS surplus
      FROM players a
      JOIN players b ON b.user_id <> a.user_id
      GROUP BY a.user_id
    ),
    deltas AS (
      SELECT p.user_id, p.elo,
             _round_half_up(_rating_k(p.games_played)::numeric / (v_n - 1) * pr.surplus) AS delta
      FROM players p
      JOIN pairs pr ON pr.user_id = p.user_id
    ),
    ev AS (
      INSERT INTO rating_events (user_id, domain, source, ref_id, elo_before, elo_after, delta)
      SELECT user_id, 'finance', 'mock_exam', p_exam_id, elo, elo + delta, delta
      FROM deltas
      ON CONFLICT DO NOTHING
      RETURNING user_id, delta
    )
    UPDATE ratings r
    SET elo = r.elo + ev.delta, games_played = r.games_played + 1, updated_at = v_now
    FROM ev
    WHERE r.user_id = ev.user_id;
  END IF;

  UPDATE mock_exams SET elo_applied_at = v_now WHERE id = p_exam_id;

  RETURN json_build_object(
    'applied', v_n >= 2,
    'participants', v_n,
    'reason', CASE WHEN v_n < 2 THEN 'too_few' END
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- 4. RPC DUELS (joueurs connectés)
-- ----------------------------------------------------------------------------

-- Règle les duels du joueur qui sont arrivés à échéance (chrono, 48 h).
-- Renvoie le nombre de duels examinés.
CREATE OR REPLACE FUNCTION duel_refresh_mine()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_n   int := 0;
  r     record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  FOR r IN
    SELECT id FROM duels
    WHERE (challenger_id = v_uid OR opponent_id = v_uid)
      AND status IN ('pending', 'active')
      AND (
        expires_at < now()
        OR (challenger_started_at IS NOT NULL AND challenger_finished_at IS NULL
            AND challenger_started_at + make_interval(secs => time_limit_seconds) < now())
        OR (opponent_started_at IS NOT NULL AND opponent_finished_at IS NULL
            AND opponent_started_at + make_interval(secs => time_limit_seconds) < now())
        OR (status = 'active' AND challenger_finished_at IS NOT NULL AND opponent_finished_at IS NOT NULL)
      )
  LOOP
    PERFORM _duel_settle(r.id);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;

-- Crée un duel.
--   p_opponent_id renseigné → défi à ce joueur (ou le duel déjà ouvert entre
--   vous deux, s'il y en a un) ;
--   p_opponent_id NULL → « au hasard » : rejoint le duel ouvert d'un joueur
--   à l'ELO le plus proche, sinon ouvre un duel dans la file.
-- Renvoie {id, existing, joined}.
CREATE OR REPLACE FUNCTION duel_create(p_opponent_id uuid DEFAULT NULL, p_rematch_of uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_id     uuid;
  v_ids    uuid[];
  v_my_elo int;
  v_open   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND username IS NOT NULL) THEN
    RAISE EXCEPTION 'Complète ton profil avant de lancer un duel.';
  END IF;

  PERFORM duel_refresh_mine();

  IF p_opponent_id IS NOT NULL THEN
    IF p_opponent_id = v_uid THEN
      RAISE EXCEPTION 'Tu ne peux pas te défier toi-même.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_opponent_id AND username IS NOT NULL) THEN
      RAISE EXCEPTION 'Joueur introuvable.';
    END IF;
    SELECT id INTO v_id FROM duels
    WHERE status IN ('pending', 'active')
      AND ((challenger_id = v_uid AND opponent_id = p_opponent_id)
        OR (challenger_id = p_opponent_id AND opponent_id = v_uid))
    ORDER BY created_at DESC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN json_build_object('id', v_id, 'existing', true, 'joined', false);
    END IF;
  ELSE
    -- Déjà un duel au hasard qui attend un adversaire : on le reprend.
    SELECT id INTO v_id FROM duels
    WHERE challenger_id = v_uid AND mode = 'random' AND status = 'pending'
      AND opponent_id IS NULL AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN json_build_object('id', v_id, 'existing', true, 'joined', false);
    END IF;

    -- Un autre joueur attend : on le rejoint, ELO le plus proche d'abord.
    SELECT coalesce((SELECT elo FROM ratings WHERE user_id = v_uid), 1200) INTO v_my_elo;
    SELECT d.id INTO v_id
    FROM duels d
    LEFT JOIN ratings r ON r.user_id = d.challenger_id
    WHERE d.mode = 'random' AND d.status = 'pending' AND d.opponent_id IS NULL
      AND d.challenger_id <> v_uid AND d.expires_at > now()
      AND NOT EXISTS (
        SELECT 1 FROM duels x
        WHERE x.status IN ('pending', 'active')
          AND ((x.challenger_id = v_uid AND x.opponent_id = d.challenger_id)
            OR (x.challenger_id = d.challenger_id AND x.opponent_id = v_uid))
      )
    ORDER BY abs(coalesce(r.elo, 1200) - v_my_elo), d.created_at
    LIMIT 1
    FOR UPDATE OF d SKIP LOCKED;
    IF v_id IS NOT NULL THEN
      UPDATE duels
      SET opponent_id = v_uid, status = 'active', accepted_at = now(), expires_at = now() + interval '48 hours'
      WHERE id = v_id;
      RETURN json_build_object('id', v_id, 'existing', false, 'joined', true);
    END IF;
  END IF;

  SELECT count(*) INTO v_open FROM duels
  WHERE (challenger_id = v_uid OR opponent_id = v_uid) AND status IN ('pending', 'active');
  IF v_open >= 20 THEN
    RAISE EXCEPTION 'Tu as déjà 20 duels en cours : termine-en quelques-uns d''abord.';
  END IF;

  v_ids := _duel_pick_questions(30);
  IF coalesce(array_length(v_ids, 1), 0) < 10 THEN
    RAISE EXCEPTION 'La banque de questions n''est pas disponible pour le moment.';
  END IF;

  INSERT INTO duels (mode, status, challenger_id, opponent_id, question_ids, rematch_of)
  VALUES (
    CASE WHEN p_opponent_id IS NULL THEN 'random' ELSE 'challenge' END,
    'pending',
    v_uid,
    p_opponent_id,
    v_ids,
    (SELECT id FROM duels WHERE id = p_rematch_of AND (challenger_id = v_uid OR opponent_id = v_uid))
  )
  RETURNING id INTO v_id;

  RETURN json_build_object('id', v_id, 'existing', false, 'joined', false);
END;
$$;

-- Accepter (p_accept = true, adversaire seulement) ou refuser / annuler
-- (p_accept = false, l'un ou l'autre) un duel encore en attente.
CREATE OR REPLACE FUNCTION duel_respond(p_duel_id uuid, p_accept boolean)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  d     duels%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _duel_is_player(p_duel_id, v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  PERFORM _duel_settle(p_duel_id);
  SELECT * INTO d FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND OR (d.challenger_id <> v_uid AND d.opponent_id IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  IF d.status <> 'pending' THEN
    RAISE EXCEPTION 'Ce défi n''est plus en attente.';
  END IF;

  IF p_accept THEN
    IF d.opponent_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Seul le joueur défié peut accepter.';
    END IF;
    UPDATE duels
    SET status = 'active', accepted_at = now(), expires_at = now() + interval '48 hours'
    WHERE id = d.id;
    RETURN json_build_object('id', d.id, 'status', 'active');
  END IF;

  UPDATE duels SET status = 'declined', finished_at = now() WHERE id = d.id;
  RETURN json_build_object('id', d.id, 'status', 'declined');
END;
$$;

-- État d'un duel pour l'un de ses deux joueurs (règle d'abord le duel s'il
-- est mûr). Ne contient jamais de bonne réponse ; les scores n'y figurent
-- qu'une fois le duel terminé.
CREATE OR REPLACE FUNCTION duel_state(p_duel_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  d       duels%ROWTYPE;
  v_is_c  boolean;
  v_other uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _duel_is_player(p_duel_id, v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  PERFORM _duel_settle(p_duel_id);
  SELECT * INTO d FROM duels WHERE id = p_duel_id;
  IF NOT FOUND OR (d.challenger_id <> v_uid AND d.opponent_id IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  v_is_c := d.challenger_id = v_uid;
  v_other := CASE WHEN v_is_c THEN d.opponent_id ELSE d.challenger_id END;

  RETURN json_build_object(
    'id', d.id,
    'status', d.status,
    'mode', d.mode,
    'domain', d.domain,
    'program', d.program,
    'question_count', coalesce(array_length(d.question_ids, 1), 0),
    'time_limit_seconds', d.time_limit_seconds,
    'created_at', d.created_at,
    'accepted_at', d.accepted_at,
    'expires_at', d.expires_at,
    'finished_at', d.finished_at,
    'server_now', now(),
    'winner_id', d.winner_id,
    'rematch_of', d.rematch_of,
    'i_am_challenger', v_is_c,
    'me', _duel_player_json(d, v_uid, v_is_c),
    'them', CASE WHEN v_other IS NULL THEN NULL ELSE _duel_player_json(d, v_other, NOT v_is_c) END
  );
END;
$$;

-- Lance (ou reprend) la partie du joueur : démarre son chrono s'il ne
-- tournait pas encore et renvoie les questions SANS la bonne réponse, avec
-- les réponses déjà données (pour reprendre après un rechargement).
CREATE OR REPLACE FUNCTION duel_start(p_duel_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  d           duels%ROWTYPE;
  v_is_c      boolean;
  v_started   timestamptz;
  v_finished  timestamptz;
  v_questions json;
  v_answers   json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _duel_is_player(p_duel_id, v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  PERFORM _duel_settle(p_duel_id);
  SELECT * INTO d FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND OR (d.challenger_id <> v_uid AND d.opponent_id IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  v_is_c := d.challenger_id = v_uid;

  IF d.status NOT IN ('pending', 'active') THEN
    RETURN json_build_object('finished', true, 'status', d.status);
  END IF;
  IF d.status = 'pending' AND NOT v_is_c THEN
    RAISE EXCEPTION 'Accepte le défi avant de jouer.';
  END IF;

  v_started := CASE WHEN v_is_c THEN d.challenger_started_at ELSE d.opponent_started_at END;
  v_finished := CASE WHEN v_is_c THEN d.challenger_finished_at ELSE d.opponent_finished_at END;
  IF v_finished IS NOT NULL THEN
    RETURN json_build_object('finished', true, 'status', d.status);
  END IF;

  IF v_started IS NULL THEN
    v_started := now();
    IF v_is_c THEN
      UPDATE duels SET challenger_started_at = v_started WHERE id = d.id;
    ELSE
      UPDATE duels SET opponent_started_at = v_started WHERE id = d.id;
    END IF;
  END IF;

  SELECT json_agg(json_build_object(
    'position', t.pos - 1,
    'id', qq.id,
    'prompt', qq.prompt,
    'choices', qq.choices,
    'topic', _rl_topic_key(lf.name)
  ) ORDER BY t.pos)
  INTO v_questions
  FROM unnest(d.question_ids) WITH ORDINALITY AS t(qid, pos)
  JOIN quiz_questions qq ON qq.id = t.qid
  JOIN quiz_sets qs ON qs.id = qq.set_id
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id;

  SELECT coalesce(json_agg(json_build_object('position', a.position, 'selected_index', a.selected_index) ORDER BY a.position), '[]'::json)
  INTO v_answers
  FROM duel_answers a
  WHERE a.duel_id = d.id AND a.user_id = v_uid;

  RETURN json_build_object(
    'finished', false,
    'status', d.status,
    'started_at', v_started,
    'server_now', now(),
    'time_limit_seconds', d.time_limit_seconds,
    'questions', coalesce(v_questions, '[]'::json),
    'answers', v_answers
  );
END;
$$;

-- Enregistre une réponse (définitive) et la corrige côté serveur, sans
-- renvoyer la correction. Rend la copie automatiquement à la dernière
-- question. Renvoie l'avancement des deux joueurs.
CREATE OR REPLACE FUNCTION duel_answer(p_duel_id uuid, p_position int, p_selected int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  d           duels%ROWTYPE;
  v_is_c      boolean;
  v_other     uuid;
  v_started   timestamptz;
  v_finished  timestamptz;
  v_n         int;
  v_qid       uuid;
  v_correct   int;
  v_nchoices  int;
  v_answered  int;
  v_other_ans int := 0;
  v_done      boolean := false;
  v_status    text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO d FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND OR (d.challenger_id <> v_uid AND d.opponent_id IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  v_is_c := d.challenger_id = v_uid;
  v_other := CASE WHEN v_is_c THEN d.opponent_id ELSE d.challenger_id END;

  IF d.status NOT IN ('pending', 'active') THEN
    RETURN json_build_object('ok', false, 'finished', true, 'status', d.status);
  END IF;

  v_started := CASE WHEN v_is_c THEN d.challenger_started_at ELSE d.opponent_started_at END;
  v_finished := CASE WHEN v_is_c THEN d.challenger_finished_at ELSE d.opponent_finished_at END;
  IF v_started IS NULL THEN
    RAISE EXCEPTION 'Lance la partie avant de répondre.';
  END IF;
  IF v_finished IS NOT NULL THEN
    RETURN json_build_object('ok', false, 'finished', true, 'status', d.status);
  END IF;

  -- 20 s de marge pour la latence réseau, au-delà la copie est rendue d'office
  IF now() > v_started + make_interval(secs => d.time_limit_seconds + 20) THEN
    v_status := _duel_settle(d.id);
    RETURN json_build_object('ok', false, 'finished', true, 'status', v_status);
  END IF;

  v_n := coalesce(array_length(d.question_ids, 1), 0);
  IF p_position IS NULL OR p_position < 0 OR p_position >= v_n THEN
    RAISE EXCEPTION 'Question invalide.';
  END IF;
  v_qid := d.question_ids[p_position + 1];

  SELECT correct_index, coalesce(array_length(choices, 1), 0)
  INTO v_correct, v_nchoices
  FROM quiz_questions WHERE id = v_qid;
  IF p_selected IS NULL OR p_selected < 0 OR p_selected >= coalesce(v_nchoices, 0) THEN
    RAISE EXCEPTION 'Réponse invalide.';
  END IF;

  INSERT INTO duel_answers (duel_id, user_id, position, question_id, selected_index, is_correct)
  VALUES (d.id, v_uid, p_position, v_qid, p_selected, coalesce(p_selected = v_correct, false))
  ON CONFLICT (duel_id, user_id, position) DO NOTHING;

  SELECT count(*) INTO v_answered FROM duel_answers WHERE duel_id = d.id AND user_id = v_uid;
  IF v_other IS NOT NULL THEN
    SELECT count(*) INTO v_other_ans FROM duel_answers WHERE duel_id = d.id AND user_id = v_other;
  END IF;

  v_status := d.status;
  IF v_answered >= v_n THEN
    IF v_is_c THEN
      UPDATE duels SET challenger_finished_at = now() WHERE id = d.id;
    ELSE
      UPDATE duels SET opponent_finished_at = now() WHERE id = d.id;
    END IF;
    v_status := _duel_settle(d.id);
    v_done := true;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'answered', v_answered,
    'opponent_answered', v_other_ans,
    'finished', v_done,
    'status', v_status
  );
END;
$$;

-- Rendre sa copie (les questions sans réponse comptent faux). Un joueur
-- qui abandonne sans avoir commencé rend une copie vide.
CREATE OR REPLACE FUNCTION duel_finish(p_duel_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  d        duels%ROWTYPE;
  v_is_c   boolean;
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO d FROM duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND OR (d.challenger_id <> v_uid AND d.opponent_id IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  v_is_c := d.challenger_id = v_uid;

  IF d.status IN ('pending', 'active') AND NOT (d.status = 'pending' AND NOT v_is_c) THEN
    IF v_is_c THEN
      UPDATE duels
      SET challenger_started_at = coalesce(challenger_started_at, now()),
          challenger_finished_at = coalesce(challenger_finished_at,
            least(now(), coalesce(challenger_started_at, now()) + make_interval(secs => time_limit_seconds)))
      WHERE id = d.id;
    ELSE
      UPDATE duels
      SET opponent_started_at = coalesce(opponent_started_at, now()),
          opponent_finished_at = coalesce(opponent_finished_at,
            least(now(), coalesce(opponent_started_at, now()) + make_interval(secs => time_limit_seconds)))
      WHERE id = d.id;
    END IF;
  END IF;

  v_status := _duel_settle(d.id);
  RETURN json_build_object('id', d.id, 'status', v_status);
END;
$$;

-- Correction du joueur, seulement une fois le duel terminé.
CREATE OR REPLACE FUNCTION duel_review(p_duel_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  d        duels%ROWTYPE;
  v_review json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO d FROM duels WHERE id = p_duel_id;
  IF NOT FOUND OR (d.challenger_id <> v_uid AND d.opponent_id IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  IF d.status <> 'finished' THEN
    RAISE EXCEPTION 'La correction s''ouvre à la fin du duel.';
  END IF;

  SELECT json_agg(json_build_object(
    'position', t.pos - 1,
    'question_id', qq.id,
    'prompt', qq.prompt,
    'choices', qq.choices,
    'correct_index', qq.correct_index,
    'explanation', qq.explanation,
    'topic', _rl_topic_key(lf.name),
    'selected_index', a.selected_index,
    'is_correct', coalesce(a.is_correct, false)
  ) ORDER BY t.pos)
  INTO v_review
  FROM unnest(d.question_ids) WITH ORDINALITY AS t(qid, pos)
  JOIN quiz_questions qq ON qq.id = t.qid
  JOIN quiz_sets qs ON qs.id = qq.set_id
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  LEFT JOIN duel_answers a ON a.duel_id = d.id AND a.user_id = v_uid AND a.position = t.pos - 1;

  RETURN coalesce(v_review, '[]'::json);
END;
$$;

-- Adversaires suggérés : joueurs actifs ces 30 derniers jours d'abord, puis
-- par ELO le plus proche du tien.
CREATE OR REPLACE FUNCTION duel_suggestions(p_limit int DEFAULT 6)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT coalesce((SELECT elo FROM ratings WHERE user_id = auth.uid()), 1200) AS elo
  ),
  players AS (
    SELECT p.id, p.username, p.avatar_url,
           coalesce(r.elo, 1200) AS elo,
           coalesce(r.games_played, 0) AS games_played,
           _player_last_active(p.id) AS last_active_at
    FROM profiles p
    LEFT JOIN ratings r ON r.user_id = p.id
    WHERE p.id <> auth.uid() AND p.username IS NOT NULL
  )
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT pl.id AS user_id, pl.username, pl.avatar_url, pl.elo, pl.games_played, pl.last_active_at
    FROM players pl, me
    ORDER BY (pl.last_active_at > now() - interval '30 days') DESC NULLS LAST,
             abs(pl.elo - me.elo),
             pl.last_active_at DESC NULLS LAST
    LIMIT greatest(1, least(coalesce(p_limit, 6), 20))
  ) t;
$$;

-- Recherche d'un joueur par pseudo (contient) ou par e-mail (égalité
-- exacte seulement ; l'e-mail n'est jamais renvoyé).
CREATE OR REPLACE FUNCTION duel_search_players(p_query text)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH q AS (
    SELECT trim(coalesce(p_query, '')) AS raw,
           replace(replace(trim(coalesce(p_query, '')), '%', ''), '_', '') AS clean
  )
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT p.id AS user_id, p.username, p.avatar_url,
           coalesce(r.elo, 1200) AS elo,
           coalesce(r.games_played, 0) AS games_played,
           _player_last_active(p.id) AS last_active_at
    FROM profiles p
    LEFT JOIN ratings r ON r.user_id = p.id, q
    WHERE p.id <> auth.uid()
      AND p.username IS NOT NULL
      AND length(q.raw) >= 2
      AND (
        p.username ILIKE '%' || q.clean || '%'
        OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id AND lower(u.email) = lower(q.raw))
      )
    ORDER BY (lower(p.username) = lower(q.raw)) DESC, length(p.username), p.username
    LIMIT 8
  ) t;
$$;


-- ----------------------------------------------------------------------------
-- 5. RPC EXAMENS BLANCS CLASSÉS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_mock_exam_elo(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN _apply_mock_exam_elo(p_exam_id);
END;
$$;


-- ----------------------------------------------------------------------------
-- 6. DROITS D'EXÉCUTION
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION _rl_topic_key(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _round_half_up(numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _elo_expected(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rating_k(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _player_last_active(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _duel_is_player(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _duel_pick_questions(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _duel_settle(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _duel_player_json(duels, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _apply_mock_exam_elo(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION duel_refresh_mine() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_create(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_respond(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_state(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_start(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_answer(uuid, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_finish(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_suggestions(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION duel_search_players(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION apply_mock_exam_elo(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION duel_refresh_mine() TO authenticated;
GRANT EXECUTE ON FUNCTION duel_create(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_respond(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_start(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_answer(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_finish(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_suggestions(int) TO authenticated;
GRANT EXECUTE ON FUNCTION duel_search_players(text) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_mock_exam_elo(uuid) TO authenticated;


-- ----------------------------------------------------------------------------
-- 7. RATTRAPAGE — examens blancs déjà clos
-- ----------------------------------------------------------------------------
-- Applique l'ELO des examens déjà terminés, dans l'ordre chronologique
-- (sinon la page de résultats l'appliquerait au fil des visites, dans le
-- désordre). Sans effet sur un examen déjà traité. Supprimer ce bloc pour
-- que seuls les examens à venir comptent.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM mock_exams
    WHERE elo_applied_at IS NULL
      AND (status = 'closed' OR now() > scheduled_at + make_interval(days => coalesce(window_days, 3)))
    ORDER BY scheduled_at
  LOOP
    PERFORM _apply_mock_exam_elo(r.id);
  END LOOP;
END;
$$;
