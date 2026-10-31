-- migration_moi_synthese.sql · page Moi « La synthèse »
-- À coller une fois dans Supabase › SQL Editor ; recollable sans risque (idempotent).
-- Prérequis : migration_v3_profil.sql §4 (_reponses_cache), migration_notions.sql
-- (quiz_questions.notion), migration_ratures_calcul.sql (quiz_questions.calcul).
-- Sans eux, les fonctions rendent NULL et la page masque les modules concernés.
-- Ne modifie aucune fonction existante (maitrise_joueur garde sa signature : le Codex la teste).
-- Minimum : 1 table et 2 fonctions, appelées par le client de service seulement
-- (comme maitrise_joueur) ; sans clé de service, la page masque ces modules.

-- ── 1. La dernière maîtrise de chaque joueur (moyenne des joueurs, même règle) ──
CREATE TABLE IF NOT EXISTS maitrise_derniere (
  user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matiere text        NOT NULL,
  pct     smallint,
  n       smallint    NOT NULL DEFAULT 0,
  maj_le  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, matiere)
);
ALTER TABLE maitrise_derniere ENABLE ROW LEVEL SECURITY;   -- aucune policy : service role seulement
REVOKE ALL ON TABLE maitrise_derniere FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS maitrise_derniere_matiere_idx ON maitrise_derniere (matiere, maj_le);

-- ── 2. maitrise_synthese : historique, notions, calcul, moyennes, en un passage ──
-- p_dates : 20 dates au plus ; 'historique' est rendu dans le même ordre (clé i = rang dans p_dates,
-- à partir de 1). Rend { v, historique, notions, calcul, moyennes } :
--   historique : [{ i, matieres: { <clé>: { pct, n } } }] ; pct = la maîtrise de la matière à la date
--                (60 dernières réponses avant la date, pondérées 2 / 0,5 / 1), null sous 10 réponses ;
--   notions    : { <id de notion>: { pct, n, total, derniere } } ; 20 dernières réponses, pct dès 8 ;
--   calcul     : { "<matière>:avec" | "<matière>:sans": { pct, n } } ; 60 dernières, pct dès 10 ;
--   moyennes   : { <matière>: { pct, joueurs } } ; joueurs mesurés (40 réponses), actifs depuis
--                30 jours, 5 au moins.
CREATE OR REPLACE FUNCTION maitrise_synthese(p_user uuid, p_dates timestamptz[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hist jsonb; v_not jsonb; v_calc jsonb; v_moy jsonb;
BEGIN
  IF p_user IS NULL
     OR to_regprocedure('public._reponses_cache(uuid)') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'quiz_questions' AND column_name = 'notion')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'quiz_questions' AND column_name = 'calcul') THEN
    RETURN NULL;
  END IF;
  PERFORM _reponses_cache(p_user);

  -- chaque réponse pesée une fois, mêmes règles que maitrise_joueur (2 / 0,5 / 1)
  DROP TABLE IF EXISTS pg_temp._syn;   -- table temporaire de la transaction, pas une donnée
  CREATE TEMP TABLE _syn ON COMMIT DROP AS
    SELECT c.matiere, c.question_id, c.ok, c.at, q.notion, q.calcul,
           CASE WHEN lag(c.at) OVER w IS NULL THEN 2.0
                WHEN c.at - lag(c.at) OVER w < interval '24 hours' THEN 0.5
                ELSE 1.0 END AS poids
    FROM pg_temp._rep_cache c
    LEFT JOIN quiz_questions q ON q.id = c.question_id
    WHERE c.matiere IS NOT NULL AND c.at IS NOT NULL AND strpos(c.matiere, ':') = 0
    WINDOW w AS (PARTITION BY c.question_id ORDER BY c.at, c.ok);
  CREATE INDEX ON pg_temp._syn (matiere, at DESC);

  -- 2a. la maîtrise par matière à chaque date : les 60 réponses les plus récentes avant la date
  WITH jours AS (
    SELECT d.jour, d.i FROM unnest(p_dates[1:20]) WITH ORDINALITY AS d(jour, i) WHERE d.jour IS NOT NULL
  ), mats AS (SELECT DISTINCT matiere FROM pg_temp._syn),
  fen AS (
    SELECT j.i, m.matiere, count(*)::int AS n,
           coalesce(sum(x.poids) FILTER (WHERE x.ok), 0) AS fj, sum(x.poids) AS f
    FROM jours j CROSS JOIN mats m
    CROSS JOIN LATERAL (
      SELECT s.ok, s.poids FROM pg_temp._syn s
      WHERE s.matiere = m.matiere AND s.at <= j.jour
      ORDER BY s.at DESC, s.question_id, s.ok
      LIMIT 60) x
    GROUP BY j.i, m.matiere)
  SELECT jsonb_agg(jsonb_build_object('i', z.i, 'matieres', z.m) ORDER BY z.i) INTO v_hist
  FROM (SELECT i, jsonb_object_agg(matiere, jsonb_build_object(
               'pct', CASE WHEN n >= 10 THEN round(100 * fj / f)::int END, 'n', n)) AS m
        FROM fen GROUP BY i) z;

  -- 2b. la maîtrise par notion, aujourd'hui : 20 réponses les plus récentes, mesurée dès 8
  SELECT jsonb_object_agg(t.notion, jsonb_build_object(
           'pct', CASE WHEN t.n >= 8 THEN round(100 * t.fj / t.f)::int END,
           'n', t.n, 'total', t.total, 'derniere', t.derniere))
  INTO v_not
  FROM (SELECT s.notion,
               count(*) FILTER (WHERE s.i <= 20)::int AS n, count(*)::int AS total, max(s.at) AS derniere,
               coalesce(sum(s.poids) FILTER (WHERE s.i <= 20 AND s.ok), 0) AS fj,
               sum(s.poids) FILTER (WHERE s.i <= 20) AS f
        FROM (SELECT x.notion, x.ok, x.poids, x.at,
                     row_number() OVER (PARTITION BY x.notion ORDER BY x.at DESC, x.question_id, x.ok) AS i
              FROM pg_temp._syn x WHERE x.notion IS NOT NULL) s
        GROUP BY s.notion) t;

  -- 2c. avec ou sans calcul, par matière, aujourd'hui : 60 plus récentes, mesurée dès 10 (calcul NULL : exclu)
  SELECT jsonb_object_agg(t.matiere || CASE WHEN t.calcul THEN ':avec' ELSE ':sans' END,
           jsonb_build_object('pct', CASE WHEN t.n >= 10 THEN round(100 * t.fj / t.f)::int END, 'n', t.n))
  INTO v_calc
  FROM (SELECT s.matiere, s.calcul, count(*)::int AS n,
               coalesce(sum(s.poids) FILTER (WHERE s.ok), 0) AS fj, sum(s.poids) AS f
        FROM (SELECT x.matiere, x.calcul, x.ok, x.poids,
                     row_number() OVER (PARTITION BY x.matiere, x.calcul ORDER BY x.at DESC, x.question_id, x.ok) AS i
              FROM pg_temp._syn x WHERE x.calcul IS NOT NULL) s
        WHERE s.i <= 60
        GROUP BY s.matiere, s.calcul) t;

  -- 2d. la ligne du joueur dans maitrise_derniere (une écriture par heure au plus)
  INSERT INTO maitrise_derniere AS d (user_id, matiere, pct, n, maj_le)
  SELECT p_user, m.matiere, CASE WHEN x.n >= 10 THEN round(100 * x.fj / x.f)::int END, x.n, now()
  FROM (SELECT DISTINCT matiere FROM pg_temp._syn) m
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS n, coalesce(sum(t.poids) FILTER (WHERE t.ok), 0) AS fj, sum(t.poids) AS f
    FROM (SELECT s.ok, s.poids FROM pg_temp._syn s WHERE s.matiere = m.matiere
          ORDER BY s.at DESC, s.question_id, s.ok LIMIT 60) t) x
  WHERE true   -- lève l'ambiguïté d'analyse entre la jointure et ON CONFLICT
  ON CONFLICT (user_id, matiere) DO UPDATE SET pct = EXCLUDED.pct, n = EXCLUDED.n, maj_le = EXCLUDED.maj_le
  WHERE d.maj_le < now() - interval '1 hour';

  -- 2e. la moyenne des joueurs mesurés (40 réponses), actifs depuis 30 jours, 5 joueurs au moins
  SELECT jsonb_object_agg(a.matiere, jsonb_build_object('pct', a.pct, 'joueurs', a.k)) INTO v_moy
  FROM (SELECT matiere, round(avg(pct))::int AS pct, count(*)::int AS k
        FROM maitrise_derniere
        WHERE pct IS NOT NULL AND n >= 40 AND maj_le > now() - interval '30 days'
        GROUP BY matiere HAVING count(*) >= 5) a;

  RETURN jsonb_build_object('v', 1,
    'historique', coalesce(v_hist, '[]'::jsonb), 'notions', coalesce(v_not, '{}'::jsonb),
    'calcul', coalesce(v_calc, '{}'::jsonb), 'moyennes', coalesce(v_moy, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION maitrise_synthese(uuid, timestamptz[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION maitrise_synthese(uuid, timestamptz[]) TO service_role;

-- ── 3. rythme_joueur : secondes par question (V1, sans nouvelle colonne) ──
-- Global : copies chronométrées. Par matière (approché) : écarts entre réponses horodatées
-- (duels, défi du jour), délai exact des Salles, séances ciblées d'une seule matière.
-- Rend { v, sec, n, matieres: { <clé>: { sec, n } } } ; la page ne montre une matière
-- qu'à partir de 20 questions. Une source absente : NULL (la page masque la carte).
-- Colonnes relues une à une contre migration_practice_sessions, migration_mock_exams,
-- migration_mock_exam_retakes, migration_daily_challenge, migration_duels_elo,
-- migration_series_eclair et migration_salles (quiz_attempts : duration_seconds, answers).
CREATE OR REPLACE FUNCTION rythme_joueur(p_user uuid, p_jours int DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_t timestamptz := now() - make_interval(days => least(greatest(coalesce(p_jours, 90), 7), 365));
  v_res jsonb;
BEGIN
  IF p_user IS NULL THEN RETURN NULL; END IF;
  WITH copies AS (
    SELECT r.duration_seconds AS s, r.total AS n, CASE WHEN cardinality(r.topics) = 1 THEN r.topics[1] END AS m
      FROM practice_session_results r WHERE r.user_id = p_user AND r.completed_at >= v_t
    UNION ALL SELECT duration_seconds, total, NULL FROM mock_exam_results  WHERE user_id = p_user AND completed_at >= v_t
    UNION ALL SELECT duration_seconds, total, NULL FROM mock_exam_attempts WHERE user_id = p_user AND completed_at >= v_t
    UNION ALL SELECT duration_seconds, total, NULL FROM quiz_attempts      WHERE user_id = p_user AND created_at >= v_t AND answers IS NOT NULL
    UNION ALL SELECT seconds, total, NULL FROM daily_attempts WHERE user_id = p_user AND finished_at >= v_t
    UNION ALL SELECT CASE WHEN d.challenger_id = p_user THEN d.challenger_seconds ELSE d.opponent_seconds END,
                     cardinality(d.question_ids), NULL
      FROM duels d WHERE d.status = 'finished' AND p_user IN (d.challenger_id, d.opponent_id) AND d.finished_at >= v_t
    UNION ALL SELECT least(extract(epoch FROM e.finished_at - e.started_at), 3600)::int, e.total, NULL
      FROM eclair_series e WHERE e.user_id = p_user AND e.finished_at >= v_t
  ),
  ok AS (SELECT * FROM copies WHERE n > 0 AND s > 0 AND s::numeric / n BETWEEN 5 AND 600),
  pas AS (
    SELECT a.question_id,
           extract(epoch FROM a.answered_at - coalesce(lag(a.answered_at) OVER (PARTITION BY a.duel_id ORDER BY a.answered_at),
             CASE WHEN d.challenger_id = p_user THEN d.challenger_started_at ELSE d.opponent_started_at END)) AS s
      FROM duel_answers a JOIN duels d ON d.id = a.duel_id
      WHERE a.user_id = p_user AND d.status = 'finished' AND a.answered_at >= v_t
    UNION ALL
    SELECT a.question_id,
           extract(epoch FROM a.answered_at - coalesce(lag(a.answered_at) OVER (PARTITION BY a.challenge_id ORDER BY a.answered_at), t.started_at))
      FROM daily_answers a JOIN daily_attempts t ON t.challenge_id = a.challenge_id AND t.user_id = a.user_id
      WHERE a.user_id = p_user AND t.finished_at >= v_t
    UNION ALL
    SELECT i.question_id, r.delai_ms / 1000.0
      FROM salle_reponses r JOIN salle_items i ON i.session_id = r.session_id AND i.position = r.position
      WHERE r.user_id = p_user AND i.origine = 'question' AND r.repondu_le >= v_t
  ),
  mat AS (
    SELECT _codex_matiere(lf.name, qs.title) AS m, count(*) AS n, sum(least(p.s, 300)) AS s
      FROM pas p JOIN quiz_questions q ON q.id = p.question_id JOIN quiz_sets qs ON qs.id = q.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
      WHERE p.s > 2 GROUP BY 1
    UNION ALL SELECT m, sum(n), sum(s) FROM ok WHERE m IS NOT NULL GROUP BY m
  )
  SELECT jsonb_build_object('v', 1,
    'sec', (SELECT round(sum(s)::numeric / nullif(sum(n), 0)) FROM ok),
    'n',   (SELECT coalesce(sum(n), 0) FROM ok),
    'matieres', (SELECT coalesce(jsonb_object_agg(m, jsonb_build_object('sec', round(s::numeric / n), 'n', n)), '{}'::jsonb)
                 FROM (SELECT m, sum(n) AS n, sum(s) AS s FROM mat WHERE m IS NOT NULL AND strpos(m, ':') = 0 GROUP BY m) z))
  INTO v_res;
  RETURN v_res;
EXCEPTION WHEN undefined_table OR undefined_column OR undefined_function THEN
  RETURN NULL;   -- une source manque : la page masque la carte
END;
$$;
REVOKE ALL ON FUNCTION rythme_joueur(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rythme_joueur(uuid, int) TO service_role;

-- Contrôle (remplacer l'uuid par le tien) :
-- select maitrise_synthese('00000000-0000-0000-0000-000000000000', array[now() - interval '30 days', now() - interval '60 days']);
-- select rythme_joueur('00000000-0000-0000-0000-000000000000', 90);
