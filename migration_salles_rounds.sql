-- Les rounds des Salles : une partie découpée en rounds, que l'admin lance un par un.
-- Chaque round est une partie ordinaire (salle_sessions) : même chrono, mêmes réponses, même XP.
-- Les questions sont toutes tirées au lancement : celles des rounds suivants attendent dans
-- salle_serie_items, à l'abri des joueurs. Idempotent : se recolle sans effet.

-- 1. Les tables
CREATE TABLE IF NOT EXISTS public.salle_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id uuid NOT NULL REFERENCES public.salles(id) ON DELETE CASCADE,
  rounds int NOT NULL CHECK (rounds BETWEEN 2 AND 10),
  round_courant int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  terminee_at timestamptz
);
CREATE INDEX IF NOT EXISTS salle_series_salle_idx ON public.salle_series (salle_id);

CREATE TABLE IF NOT EXISTS public.salle_serie_items (
  serie_id uuid NOT NULL REFERENCES public.salle_series(id) ON DELETE CASCADE,
  round int NOT NULL,
  position int NOT NULL,
  origine text NOT NULL,
  topic text,
  difficulte text,
  question_id uuid,
  libelle text,
  enonce text NOT NULL,
  choix jsonb,
  donnees jsonb,
  unite text,
  decimales int,
  bonne_index int,
  bonne_valeur numeric,
  tolerance numeric,
  stricte boolean,
  explication text,
  etapes jsonb,
  PRIMARY KEY (serie_id, round, position)
);

ALTER TABLE public.salle_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salle_serie_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.salle_series FROM anon, authenticated;
REVOKE ALL ON public.salle_serie_items FROM anon, authenticated;

ALTER TABLE public.salle_sessions ADD COLUMN IF NOT EXISTS serie_id uuid REFERENCES public.salle_series(id) ON DELETE SET NULL;
ALTER TABLE public.salle_sessions ADD COLUMN IF NOT EXISTS round int;
CREATE INDEX IF NOT EXISTS salle_sessions_serie_idx ON public.salle_sessions (serie_id) WHERE serie_id IS NOT NULL;

-- 2. Les réglages acceptent un nombre de rounds
DO $m$
DECLARE
  d text := pg_get_functiondef('public._salle_params(jsonb)'::regprocedure);
  n text;
BEGIN
  IF position('v_rounds' IN d) = 0 THEN
    n := replace(d, $a$  v_concepts jsonb := '[]'::jsonb;
BEGIN$a$, $a$  v_concepts jsonb := '[]'::jsonb;
  v_rounds int := 1;
BEGIN$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_params : déclarations introuvables'; END IF;
    d := n;
    n := replace(d, $a$  v_source := coalesce(nullif(p ->> 'source', ''), 'banque');
$a$, $a$  IF coalesce(p ->> 'rounds', '1') !~ '^[0-9]{1,2}$' THEN
    RAISE EXCEPTION 'Le nombre de rounds va de 1 à 10.';
  END IF;
  v_rounds := coalesce((p ->> 'rounds')::int, 1);
  IF v_rounds < 1 OR v_rounds > 10 THEN
    RAISE EXCEPTION 'Le nombre de rounds va de 1 à 10.';
  END IF;

  v_source := coalesce(nullif(p ->> 'source', ''), 'banque');
$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_params : source introuvable'; END IF;
    d := n;
    n := replace(d, $a$THEN jsonb_build_object('notions', v_notions, 'concepts', v_concepts) ELSE '{}'::jsonb END;$a$,
                    $a$THEN jsonb_build_object('notions', v_notions, 'concepts', v_concepts) ELSE '{}'::jsonb END
              || CASE WHEN v_rounds > 1 THEN jsonb_build_object('rounds', v_rounds) ELSE '{}'::jsonb END;$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_params : retours introuvables'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- 3. Le lancement : tout est tiré, le premier round part, les autres attendent
DO $m$
DECLARE
  d text := pg_get_functiondef('public.lancer_session(uuid,jsonb,jsonb)'::regprocedure);
  n text;
BEGIN
  IF position('v_rounds' IN d) = 0 THEN
    n := replace(d, $a$  v_topic    text;
BEGIN$a$, $a$  v_topic    text;
  v_rounds   int := 1;
  v_taille   int;
  v_debut    int;
  v_t        int;
  v_serie    uuid;
BEGIN$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : déclarations introuvables'; END IF;
    d := n;

    n := replace(d, $a$  v_p := _salle_params(p_params);
  v_type := v_p ->> 'type';
$a$, $a$  -- une nouvelle partie ferme la série laissée en plan
  UPDATE salle_series SET terminee_at = v_now WHERE salle_id = p_salle_id AND terminee_at IS NULL;
  DELETE FROM salle_serie_items WHERE serie_id IN (SELECT id FROM salle_series WHERE salle_id = p_salle_id);

  v_p := _salle_params(p_params);
  v_type := v_p ->> 'type';
$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : réglages introuvables'; END IF;
    d := n;

    n := replace(d, $a$    RAISE EXCEPTION 'Pas assez de contenu pour ces réglages (% disponible(s)) : élargis les matières, les sessions ou la source.', v_total;
  END IF;
$a$, $a$    RAISE EXCEPTION 'Pas assez de contenu pour ces réglages (% disponible(s)) : élargis les matières, les sessions ou la source.', v_total;
  END IF;

  -- chaque round garde au moins 3 questions ; à moins de 2 rounds, c'est une partie simple
  v_rounds := least(coalesce((v_p ->> 'rounds')::int, 1), v_total / 3);
  IF v_rounds < 2 THEN
    v_rounds := 1;
    v_p := v_p - 'rounds';
  ELSE
    v_p := jsonb_set(v_p, '{rounds}', to_jsonb(v_rounds)) || jsonb_build_object('round', 1);
  END IF;
  v_taille := v_total / v_rounds + CASE WHEN v_total % v_rounds > 0 THEN 1 ELSE 0 END;
$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : contrôle du contenu introuvable'; END IF;
    d := n;

    n := replace(d, $a$  INSERT INTO salle_sessions (salle_id, numero, statut, params, nb, temps, pause_s, lancee_par, started_at, fin_at)
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
    v_started + make_interval(secs => CASE WHEN v_p ->> 'chrono' = 'global' THEN v_total * v_temps ELSE v_total * (v_temps + c_pause) END)
  )
  RETURNING id INTO v_sid;
$a$, $a$  IF v_rounds > 1 THEN
    INSERT INTO salle_series (salle_id, rounds) VALUES (p_salle_id, v_rounds) RETURNING id INTO v_serie;
  END IF;

  INSERT INTO salle_sessions (salle_id, numero, statut, params, nb, temps, pause_s, lancee_par, started_at, fin_at, serie_id, round)
  VALUES (
    p_salle_id,
    v_numero,
    'attente',
    v_p || jsonb_build_object('nb_questions', v_nq, 'nb_calculs', v_nc),
    v_taille,
    v_temps,
    c_pause,
    v_uid,
    v_started,
    v_started + make_interval(secs => CASE WHEN v_p ->> 'chrono' = 'global' THEN v_taille * v_temps ELSE v_taille * (v_temps + c_pause) END),
    v_serie,
    CASE WHEN v_rounds > 1 THEN 1 END
  )
  RETURNING id INTO v_sid;
$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : création de la partie introuvable'; END IF;
    d := n;

    n := replace(d, $a$  END LOOP;

  UPDATE salles SET derniere_activite = v_now WHERE id = p_salle_id;

  RETURN json_build_object(
    'session_id', v_sid,
$a$, $a$  END LOOP;

  -- les questions des rounds suivants quittent la partie et attendent leur tour
  IF v_rounds > 1 THEN
    v_debut := v_taille;
    FOR v_r IN 2..v_rounds LOOP
      v_t := v_total / v_rounds + CASE WHEN v_r <= v_total % v_rounds THEN 1 ELSE 0 END;
      WITH parties AS (
        DELETE FROM salle_items
        WHERE session_id = v_sid AND position >= v_debut AND position < v_debut + v_t
        RETURNING *
      )
      INSERT INTO salle_serie_items (serie_id, round, position, origine, topic, difficulte, question_id, libelle, enonce, choix, donnees, unite, decimales, bonne_index, bonne_valeur, tolerance, stricte, explication, etapes)
      SELECT v_serie, v_r, x.position - v_debut, x.origine, x.topic, x.difficulte, x.question_id, x.libelle, x.enonce, x.choix, x.donnees, x.unite, x.decimales, x.bonne_index, x.bonne_valeur, x.tolerance, x.stricte, x.explication, x.etapes
      FROM parties x;
      v_debut := v_debut + v_t;
    END LOOP;
    UPDATE salle_sessions
    SET params = params || jsonb_build_object(
      'nb_questions', (SELECT count(*) FROM salle_items i WHERE i.session_id = v_sid AND i.origine = 'question'),
      'nb_calculs', (SELECT count(*) FROM salle_items i WHERE i.session_id = v_sid AND i.origine = 'calcul')
    )
    WHERE id = v_sid;
  END IF;

  UPDATE salles SET derniere_activite = v_now WHERE id = p_salle_id;

  RETURN json_build_object(
    'session_id', v_sid,
$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : fin du tirage introuvable'; END IF;
    d := n;

    n := replace(d, $a$    'manque', v_total < v_nombre,
$a$, $a$    'manque', v_total < v_nombre,
    'rounds', v_rounds,
$a$);
    IF n = d THEN RAISE EXCEPTION 'lancer_session : retour introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- 4. L'admin lance le round suivant
CREATE OR REPLACE FUNCTION public.lancer_round(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c_decompte CONSTANT int := 12;
  v_uid     uuid := auth.uid();
  v_now     timestamptz := clock_timestamp();
  v_s       salles%ROWTYPE;
  v_ses     salle_sessions%ROWTYPE;
  v_serie   salle_series%ROWTYPE;
  v_round   int;
  v_nb      int;
  v_nq      int;
  v_nc      int;
  v_numero  int;
  v_sid     uuid;
  v_started timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND OR NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  IF v_s.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Seul l''admin de la salle peut lancer un round.';
  END IF;

  PERFORM _salle_maj(p_salle_id);
  IF EXISTS (SELECT 1 FROM salle_sessions WHERE salle_id = p_salle_id AND statut <> 'terminee') THEN
    RAISE EXCEPTION 'Une partie est déjà en cours dans cette salle.';
  END IF;

  SELECT * INTO v_ses FROM salle_sessions WHERE salle_id = p_salle_id ORDER BY numero DESC LIMIT 1;
  IF NOT FOUND OR v_ses.serie_id IS NULL THEN
    RAISE EXCEPTION 'Aucun round à lancer.';
  END IF;
  SELECT * INTO v_serie FROM salle_series WHERE id = v_ses.serie_id FOR UPDATE;
  IF NOT FOUND OR v_serie.terminee_at IS NOT NULL OR v_serie.round_courant >= v_serie.rounds THEN
    RAISE EXCEPTION 'Aucun round à lancer.';
  END IF;

  v_round := v_serie.round_courant + 1;
  SELECT count(*)::int, (count(*) FILTER (WHERE origine = 'question'))::int, (count(*) FILTER (WHERE origine = 'calcul'))::int
  INTO v_nb, v_nq, v_nc
  FROM salle_serie_items WHERE serie_id = v_serie.id AND round = v_round;
  IF v_nb = 0 THEN
    RAISE EXCEPTION 'Aucun round à lancer.';
  END IF;

  SELECT coalesce(max(numero), 0) + 1 INTO v_numero FROM salle_sessions WHERE salle_id = p_salle_id;
  v_started := v_now + make_interval(secs => c_decompte);

  INSERT INTO salle_sessions (salle_id, numero, statut, params, nb, temps, pause_s, lancee_par, started_at, fin_at, serie_id, round)
  VALUES (
    p_salle_id,
    v_numero,
    'attente',
    v_ses.params || jsonb_build_object('round', v_round, 'nb_questions', v_nq, 'nb_calculs', v_nc),
    v_nb,
    v_ses.temps,
    v_ses.pause_s,
    v_uid,
    v_started,
    v_started + make_interval(secs => CASE WHEN v_ses.params ->> 'chrono' = 'global' THEN v_nb * v_ses.temps ELSE v_nb * (v_ses.temps + v_ses.pause_s) END),
    v_serie.id,
    v_round
  )
  RETURNING id INTO v_sid;

  INSERT INTO salle_items (session_id, position, origine, topic, difficulte, question_id, libelle, enonce, choix, donnees, unite, decimales, bonne_index, bonne_valeur, tolerance, stricte, explication, etapes)
  SELECT v_sid, i.position, i.origine, i.topic, i.difficulte, i.question_id, i.libelle, i.enonce, i.choix, i.donnees, i.unite, i.decimales, i.bonne_index, i.bonne_valeur, i.tolerance, i.stricte, i.explication, i.etapes
  FROM salle_serie_items i
  WHERE i.serie_id = v_serie.id AND i.round = v_round;

  DELETE FROM salle_serie_items WHERE serie_id = v_serie.id AND round = v_round;
  UPDATE salle_series SET round_courant = v_round WHERE id = v_serie.id;
  UPDATE salles SET derniere_activite = v_now WHERE id = p_salle_id;

  RETURN json_build_object('session_id', v_sid, 'numero', v_numero, 'round', v_round, 'nb', v_nb, 'started_at', v_started, 'server_now', v_now);
END;
$$;

-- 5. L'admin s'arrête là : le classement du moment devient le classement final
CREATE OR REPLACE FUNCTION public.terminer_serie(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_now   timestamptz := clock_timestamp();
  v_s     salles%ROWTYPE;
  v_ses   salle_sessions%ROWTYPE;
  v_serie salle_series%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND OR NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  IF v_s.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Seul l''admin de la salle peut terminer la partie.';
  END IF;

  PERFORM _salle_maj(p_salle_id);
  IF EXISTS (SELECT 1 FROM salle_sessions WHERE salle_id = p_salle_id AND statut <> 'terminee') THEN
    RAISE EXCEPTION 'Une partie est déjà en cours dans cette salle.';
  END IF;

  SELECT * INTO v_ses FROM salle_sessions WHERE salle_id = p_salle_id ORDER BY numero DESC LIMIT 1;
  IF NOT FOUND OR v_ses.serie_id IS NULL THEN
    RAISE EXCEPTION 'Aucun round à terminer.';
  END IF;
  SELECT * INTO v_serie FROM salle_series WHERE id = v_ses.serie_id FOR UPDATE;
  IF NOT FOUND OR v_serie.terminee_at IS NOT NULL THEN
    RAISE EXCEPTION 'Aucun round à terminer.';
  END IF;

  UPDATE salle_series SET terminee_at = v_now WHERE id = v_serie.id;
  DELETE FROM salle_serie_items WHERE serie_id = v_serie.id;
  UPDATE salles SET derniere_activite = v_now WHERE id = p_salle_id;
  RETURN json_build_object('ok', true);
END;
$$;

-- 6. Le classement général : les points de tous les rounds joués, et la place d'avant ce round
CREATE OR REPLACE FUNCTION public._salle_serie_classement(p_serie uuid, p_round int)
RETURNS json
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH joues AS (
    SELECT s.round, sc.user_id, sc.points, sc.bonnes, sc.repondues, sc.temps_ms
    FROM salle_sessions s
    CROSS JOIN LATERAL _salle_scores(s.id, s.nb) sc
    WHERE s.serie_id = p_serie AND s.round <= p_round
  ),
  totaux AS (
    SELECT j.user_id,
           sum(j.points)::int AS points,
           sum(j.bonnes)::int AS bonnes,
           sum(j.repondues)::int AS repondues,
           sum(j.temps_ms)::bigint AS temps_ms,
           coalesce(sum(j.points) FILTER (WHERE j.round = p_round), 0)::int AS points_round,
           coalesce(sum(j.points) FILTER (WHERE j.round < p_round), 0)::int AS points_avant,
           coalesce(sum(j.bonnes) FILTER (WHERE j.round < p_round), 0)::int AS bonnes_avant,
           coalesce(sum(j.temps_ms) FILTER (WHERE j.round < p_round), 0)::bigint AS temps_avant,
           json_object_agg(j.round, j.points) AS par_round
    FROM joues j
    GROUP BY j.user_id
  ),
  rangs AS (
    SELECT t.*,
           (rank() OVER (ORDER BY t.points DESC, t.bonnes DESC, t.temps_ms ASC))::int AS rang,
           (rank() OVER (ORDER BY t.points_avant DESC, t.bonnes_avant DESC, t.temps_avant ASC))::int AS rang_avant
    FROM totaux t
  )
  SELECT coalesce(json_agg(json_build_object(
           'rang', x.rang,
           'rang_avant', x.rang_avant,
           'user_id', x.user_id,
           'username', x.username,
           'avatar_url', x.avatar_url,
           'points', x.points,
           'points_round', x.points_round,
           'points_avant', x.points_avant,
           'bonnes', x.bonnes,
           'repondues', x.repondues,
           'temps_ms', x.temps_ms,
           'par_round', x.par_round
         ) ORDER BY x.rang, x.username), '[]'::json)
  FROM (
    SELECT r.*, p.username, p.avatar_url
    FROM rangs r
    JOIN profiles p ON p.id = r.user_id
    ORDER BY r.rang, p.username
    LIMIT 50
  ) x;
$$;

-- 7. L'état de la salle dit où en est la série
DO $m$
DECLARE
  d text := pg_get_functiondef('public.etat_salle(uuid,integer)'::regprocedure);
  n text;
BEGIN
  IF position('v_serie_json' IN d) = 0 THEN
    n := replace(d, $a$  v_avancement json := NULL;
BEGIN$a$, $a$  v_avancement json := NULL;
  v_serie      salle_series%ROWTYPE;
  v_serie_json json := NULL;
BEGIN$a$);
    IF n = d THEN RAISE EXCEPTION 'etat_salle : déclarations introuvables'; END IF;
    d := n;

    n := replace(d, $a$    FROM _salle_classement(p_salle_id, v_ses.id, v_h.nb_fermees) c
    WHERE c.user_id = v_uid;
  END IF;
$a$, $a$    FROM _salle_classement(p_salle_id, v_ses.id, v_h.nb_fermees) c
    WHERE c.user_id = v_uid;

    IF v_ses.serie_id IS NOT NULL THEN
      SELECT * INTO v_serie FROM salle_series WHERE id = v_ses.serie_id;
      IF FOUND THEN
        v_serie_json := json_build_object(
          'id', v_serie.id,
          'round', v_ses.round,
          'rounds', v_serie.rounds,
          'finie', v_serie.terminee_at IS NOT NULL OR v_serie.round_courant >= v_serie.rounds,
          'prochain', (SELECT count(*)::int FROM salle_serie_items i WHERE i.serie_id = v_serie.id AND i.round = v_ses.round + 1),
          'total', (SELECT coalesce(sum(s3.nb), 0)::int FROM salle_sessions s3 WHERE s3.serie_id = v_serie.id),
          'classement', CASE WHEN v_statut = 'terminee' THEN _salle_serie_classement(v_serie.id, v_ses.round) ELSE '[]'::json END
        );
      END IF;
    END IF;
  END IF;
$a$);
    IF n = d THEN RAISE EXCEPTION 'etat_salle : classement introuvable'; END IF;
    d := n;

    n := replace(d, $a$    'mon_classement', v_moi_rang,
$a$, $a$    'mon_classement', v_moi_rang,
    'serie', v_serie_json,
$a$);
    IF n = d THEN RAISE EXCEPTION 'etat_salle : retour introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- 8. Un round d'un mock n'est pas un examen entier : ni trophée, ni examen au Codex
DO $m$
DECLARE
  d text := pg_get_functiondef('public._trophees_salles(uuid)'::regprocedure);
  n text;
BEGIN
  IF position('s.serie_id IS NULL' IN d) = 0 THEN
    n := replace(d, $a$WHERE s.params ->> 'source' = 'examen'$a$, $a$WHERE s.serie_id IS NULL AND s.params ->> 'source' = 'examen'$a$);
    IF n = d THEN RAISE EXCEPTION '_trophees_salles : condition introuvable'; END IF;
    EXECUTE n;
  END IF;

  d := pg_get_functiondef('public.codex_journal(uuid)'::regprocedure);
  IF position('s.serie_id IS NULL' IN d) = 0 THEN
    n := replace(d, $a$WHERE s.statut = 'terminee' AND s.params ->> 'source' = 'examen' AND c.total >= 30$a$, $a$WHERE s.statut = 'terminee' AND s.serie_id IS NULL AND s.params ->> 'source' = 'examen' AND c.total >= 30$a$);
    IF n = d THEN RAISE EXCEPTION 'codex_journal : condition introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- 9. Les droits
REVOKE ALL ON FUNCTION public.lancer_round(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.terminer_serie(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._salle_serie_classement(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lancer_round(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminer_serie(uuid) TO authenticated;

-- 10. Retouches après relecture
-- a. La colonne round survit à la suppression d'une salle, pas serie_id : c'est elle qui reconnaît un round
DO $m$
DECLARE
  d text;
  n text;
BEGIN
  d := pg_get_functiondef('public._trophees_salles(uuid)'::regprocedure);
  IF position('s.round IS NULL' IN d) = 0 THEN
    n := replace(d, 's.serie_id IS NULL', 's.round IS NULL');
    IF n = d THEN RAISE EXCEPTION '_trophees_salles : condition introuvable'; END IF;
    EXECUTE n;
  END IF;
  d := pg_get_functiondef('public.codex_journal(uuid)'::regprocedure);
  IF position('s.round IS NULL' IN d) = 0 THEN
    n := replace(d, 's.serie_id IS NULL', 's.round IS NULL');
    IF n = d THEN RAISE EXCEPTION 'codex_journal : condition introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- b. Les points d'une partie entière : une partie simple, ou tous les rounds de sa série
CREATE OR REPLACE FUNCTION public._salle_scores_partie(p_session uuid, p_nb int)
RETURNS TABLE(user_id uuid, points int, bonnes int, repondues int, temps_ms bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT sc.user_id, sum(sc.points)::int, sum(sc.bonnes)::int, sum(sc.repondues)::int, sum(sc.temps_ms)::bigint
  FROM salle_sessions x
  CROSS JOIN LATERAL _salle_scores(x.id, x.nb) sc
  WHERE x.id = p_session
     OR x.serie_id = (SELECT s.serie_id FROM salle_sessions s WHERE s.id = p_session)
  GROUP BY sc.user_id;
$$;
REVOKE ALL ON FUNCTION public._salle_scores_partie(uuid, int) FROM PUBLIC, anon, authenticated;

-- c. L'état de la salle : la date de fin de série, le classement d'avant pendant le décompte d'un round,
--    et une seule ligne d'historique par partie en rounds
DO $m$
DECLARE
  d text := pg_get_functiondef('public.etat_salle(uuid,integer)'::regprocedure);
  n text;
BEGIN
  IF position('_salle_scores_partie' IN d) = 0 THEN
    n := replace(d, $a$          'finie', v_serie.terminee_at IS NOT NULL OR v_serie.round_courant >= v_serie.rounds,
$a$, $a$          'finie', v_serie.terminee_at IS NOT NULL OR v_serie.round_courant >= v_serie.rounds,
          'terminee_at', v_serie.terminee_at,
$a$);
    IF n = d THEN RAISE EXCEPTION 'etat_salle : série introuvable'; END IF;
    d := n;

    n := replace(d, $a$          'classement', CASE WHEN v_statut = 'terminee' THEN _salle_serie_classement(v_serie.id, v_ses.round) ELSE '[]'::json END
$a$, $a$          'classement', CASE
            WHEN v_statut = 'terminee' THEN _salle_serie_classement(v_serie.id, v_ses.round)
            WHEN v_statut = 'attente' AND v_ses.round > 1 THEN _salle_serie_classement(v_serie.id, v_ses.round - 1)
            ELSE '[]'::json
          END
$a$);
    IF n = d THEN RAISE EXCEPTION 'etat_salle : classement de série introuvable'; END IF;
    d := n;

    n := replace(d, '_salle_scores(s2.id, s2.nb)', '_salle_scores_partie(s2.id, s2.nb)');
    IF n = d THEN RAISE EXCEPTION 'etat_salle : scores de l''historique introuvables'; END IF;
    d := n;

    n := replace(d, $a$      AND s2.id IS DISTINCT FROM v_ses.id
$a$, $a$      AND s2.id IS DISTINCT FROM v_ses.id
      AND (s2.round IS NULL OR s2.round = (SELECT max(s4.round) FROM salle_sessions s4 WHERE s4.serie_id = s2.serie_id))
$a$);
    IF n = d THEN RAISE EXCEPTION 'etat_salle : filtre de l''historique introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- d. Une partie en rounds qui attend le round suivant garde sa salle dans les listes, 12 heures au plus
DO $m$
DECLARE
  d text := pg_get_functiondef('public._salle_derniere_vie(uuid)'::regprocedure);
  n text;
BEGIN
  IF position('salle_series' IN d) = 0 THEN
    n := replace(d, $a$    (SELECT max(ss.started_at) FROM salle_sessions ss WHERE ss.salle_id = s.id)
$a$, $a$    (SELECT max(ss.started_at) FROM salle_sessions ss WHERE ss.salle_id = s.id),
    (SELECT CASE WHEN count(*) > 0 THEN now() END
       FROM salle_series se
      WHERE se.salle_id = s.id AND se.terminee_at IS NULL AND se.round_courant < se.rounds
        AND se.created_at > now() - interval '12 hours')
$a$);
    IF n = d THEN RAISE EXCEPTION '_salle_derniere_vie : dernière activité introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;
