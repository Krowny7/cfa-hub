-- migration_salles_chrono_global.sql — un chrono global et la correction à la fin.
--
-- Réglage « chrono » d'une partie (params.chrono) :
--   question (défaut, comme avant) : une question à la fois, son temps, sa
--            correction tout de suite ;
--   global   : comme les 30 du jour. Toutes les questions s'ouvrent au départ,
--            dans l'ordre qu'on veut ; une réponse par question, définitive ;
--            un seul chrono (nombre de questions × temps par question, sans
--            pause) ; rien n'est révélé avant la fin (ni justesse, ni points,
--            ni classement : seulement combien de réponses chacun a données) ;
--            à la fin, toutes les corrections et le classement. Score :
--            1 000 points par bonne réponse, départage au temps cumulé.
-- Fonctions seulement (CREATE OR REPLACE), le mode « question » est inchangé.
-- Le déclencheur du carnet de ratures rend une rature de chrono global
-- visible à la fin de la partie.

-- L'horloge d'une partie selon son chrono (même colonnes que _salle_horloge).
-- En chrono global : décompte, puis toutes les questions visibles (index 0)
-- jusqu'à fin_at ; aucune close avant la fin, toutes closes à la fin.
CREATE OR REPLACE FUNCTION _salle_horloge_partie(p_started timestamptz, p_temps int, p_pause int, p_nb int, p_statut text, p_now timestamptz, p_global boolean, p_fin timestamptz)
RETURNS TABLE (idx int, phase text, nb_fermees int, nb_visibles int)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  c_apercu CONSTANT numeric := 2;
BEGIN
  IF NOT coalesce(p_global, false) THEN
    RETURN QUERY SELECT * FROM _salle_horloge(p_started, p_temps, p_pause, p_nb, p_statut, p_now);
    RETURN;
  END IF;
  IF p_statut = 'terminee' OR p_now >= p_fin THEN
    idx := p_nb; phase := 'fin'; nb_fermees := p_nb; nb_visibles := p_nb;
  ELSIF p_now < p_started THEN
    idx := -1; phase := 'decompte'; nb_fermees := 0;
    nb_visibles := CASE WHEN extract(epoch FROM (p_now - p_started)) + c_apercu >= 0 THEN p_nb ELSE 0 END;
  ELSE
    idx := 0; phase := 'question'; nb_fermees := 0; nb_visibles := p_nb;
  END IF;
  RETURN NEXT;
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
  v_chrono text;
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

  v_chrono := coalesce(nullif(p ->> 'chrono', ''), 'question');
  IF v_chrono NOT IN ('question', 'global') THEN
    RAISE EXCEPTION 'Le chrono est par question ou global.';
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
      'complet', v_complet,
      'chrono', v_chrono
    );
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
  );
END;
$$;

CREATE OR REPLACE FUNCTION lancer_session(p_salle_id uuid, p_params jsonb, p_calculs jsonb DEFAULT '[]'::jsonb)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c_decompte CONSTANT int := 30;
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
    v_started + make_interval(secs => CASE WHEN v_p ->> 'chrono' = 'global' THEN v_total * v_temps ELSE v_total * (v_temps + c_pause) END)
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

CREATE OR REPLACE FUNCTION etat_salle(p_salle_id uuid, p_depuis int DEFAULT 0)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_now        timestamptz := clock_timestamp();
  v_s          salles%ROWTYPE;
  v_ses        salle_sessions%ROWTYPE;
  v_h          record;
  v_depuis     int := greatest(coalesce(p_depuis, 0), 0);
  v_nb_membres int;
  v_membres    json;
  v_session    json := NULL;
  v_items      json := '[]'::json;
  v_corr       json := '[]'::json;
  v_mes        json := '[]'::json;
  v_classement json := '[]'::json;
  v_moi_rang   json := NULL;
  v_hist       json := '[]'::json;
  v_repondu    int := 0;
  v_statut     text;
  v_global     boolean := false;
  v_avancement json := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  PERFORM _salle_maj(p_salle_id);
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;

  SELECT count(*)::int INTO v_nb_membres FROM salle_membres WHERE salle_id = p_salle_id;

  SELECT coalesce(json_agg(t ORDER BY t.est_admin DESC, t.rejoint_le, t.username), '[]'::json)
  INTO v_membres
  FROM (
    SELECT m.user_id,
           p.username,
           p.avatar_url,
           m.role,
           (m.role = 'admin') AS est_admin,
           r.elo,
           m.rejoint_le
    FROM salle_membres m
    JOIN profiles p ON p.id = m.user_id
    LEFT JOIN ratings r ON r.user_id = m.user_id
    WHERE m.salle_id = p_salle_id
    ORDER BY (m.role = 'admin') DESC, m.rejoint_le, p.username
    LIMIT 200
  ) t;

  SELECT * INTO v_ses FROM salle_sessions WHERE salle_id = p_salle_id ORDER BY numero DESC LIMIT 1;
  IF FOUND THEN
    v_global := v_ses.params ->> 'chrono' = 'global';
    SELECT * INTO v_h FROM _salle_horloge_partie(v_ses.started_at, v_ses.temps, v_ses.pause_s, v_ses.nb, v_ses.statut, v_now, v_global, v_ses.fin_at);
    IF v_global THEN
      -- combien de réponses chaque joueur a données (jamais lesquelles ni leur justesse)
      SELECT coalesce(json_agg(json_build_object('user_id', a.user_id, 'n', a.n) ORDER BY a.n DESC), '[]'::json)
      INTO v_avancement
      FROM (SELECT r.user_id, count(*)::int AS n FROM salle_reponses r WHERE r.session_id = v_ses.id GROUP BY r.user_id) a;
    END IF;

    v_statut := CASE v_h.phase WHEN 'fin' THEN 'terminee' WHEN 'decompte' THEN 'attente' ELSE 'en_cours' END;

    IF v_h.idx >= 0 AND v_h.idx < v_ses.nb THEN
      SELECT count(*)::int INTO v_repondu FROM salle_reponses WHERE session_id = v_ses.id AND position = v_h.idx;
    END IF;

    v_session := json_build_object(
      'id', v_ses.id,
      'numero', v_ses.numero,
      'statut', v_statut,
      'params', v_ses.params,
      'nb', v_ses.nb,
      'temps', v_ses.temps,
      'pause', v_ses.pause_s,
      'started_at', v_ses.started_at,
      'fin_at', v_ses.fin_at,
      'index', v_h.idx,
      'phase', v_h.phase,
      'nb_visibles', v_h.nb_visibles,
      'nb_fermees', v_h.nb_fermees,
      'repondu_courante', v_repondu,
      'nb_joueurs', v_nb_membres,
      'chrono', CASE WHEN v_global THEN 'global' ELSE 'question' END,
      'avancement', v_avancement
    );

    -- énoncés révélés (jamais la bonne réponse)
    SELECT coalesce(json_agg(json_build_object(
             'position', i.position,
             'origine', i.origine,
             'topic', i.topic,
             'difficulte', i.difficulte,
             'libelle', i.libelle,
             'enonce', i.enonce,
             'choix', i.choix,
             'donnees', i.donnees,
             'unite', i.unite,
             'decimales', i.decimales
           ) ORDER BY i.position), '[]'::json)
    INTO v_items
    FROM salle_items i
    WHERE i.session_id = v_ses.id AND i.position >= v_depuis AND i.position < v_h.nb_visibles;

    -- corrections des seules questions closes
    SELECT coalesce(json_agg(json_build_object(
             'position', i.position,
             'bonne_index', i.bonne_index,
             'bonne_valeur', i.bonne_valeur,
             'explication', i.explication,
             'etapes', i.etapes
           ) ORDER BY i.position), '[]'::json)
    INTO v_corr
    FROM salle_items i
    WHERE i.session_id = v_ses.id AND i.position >= v_depuis AND i.position < v_h.nb_fermees;

    SELECT coalesce(json_agg(json_build_object(
             'position', r.position,
             'choix', r.choix,
             'valeur', r.valeur,
             -- chrono global : ni justesse ni points avant la fin de la partie
             'juste', CASE WHEN v_global AND v_h.phase <> 'fin' THEN NULL ELSE r.juste END,
             'points', CASE WHEN v_global AND v_h.phase <> 'fin' THEN NULL ELSE r.points END,
             'delai_ms', r.delai_ms
           ) ORDER BY r.position), '[]'::json)
    INTO v_mes
    FROM salle_reponses r
    WHERE r.session_id = v_ses.id AND r.user_id = v_uid;

    SELECT coalesce(json_agg(json_build_object(
             'rang', c.rang,
             'user_id', c.user_id,
             'username', c.username,
             'avatar_url', c.avatar_url,
             'points', c.points,
             'bonnes', c.bonnes,
             'repondues', c.repondues,
             'temps_ms', c.temps_ms
           ) ORDER BY c.rang, c.username), '[]'::json)
    INTO v_classement
    FROM (
      SELECT * FROM _salle_classement(p_salle_id, v_ses.id, v_h.nb_fermees) x
      ORDER BY x.rang, x.username
      LIMIT 50
    ) c;

    SELECT json_build_object(
             'rang', c.rang,
             'points', c.points,
             'bonnes', c.bonnes,
             'repondues', c.repondues,
             'temps_ms', c.temps_ms
           )
    INTO v_moi_rang
    FROM _salle_classement(p_salle_id, v_ses.id, v_h.nb_fermees) c
    WHERE c.user_id = v_uid;
  END IF;

  -- les 5 dernières parties terminées (hors la partie affichée)
  SELECT coalesce(json_agg(h ORDER BY h.numero DESC), '[]'::json)
  INTO v_hist
  FROM (
    SELECT s2.id AS session_id,
           s2.numero,
           s2.nb,
           s2.params,
           s2.started_at,
           s2.fin_at,
           (SELECT count(DISTINCT r.user_id) FROM salle_reponses r WHERE r.session_id = s2.id)::int AS nb_joueurs,
           (SELECT json_build_object('user_id', g.user_id, 'username', g.username, 'points', g.points)
              FROM (
                SELECT sc.user_id, p.username, sc.points
                FROM _salle_scores(s2.id, s2.nb) sc
                JOIN profiles p ON p.id = sc.user_id
                ORDER BY sc.points DESC, sc.bonnes DESC, sc.temps_ms ASC, p.username
                LIMIT 1
              ) g) AS gagnant,
           (SELECT json_build_object('rang', x.rang, 'points', x.points)
              FROM (
                SELECT sc.user_id,
                       sc.points,
                       (rank() OVER (ORDER BY sc.points DESC, sc.bonnes DESC, sc.temps_ms ASC))::int AS rang
                FROM _salle_scores(s2.id, s2.nb) sc
              ) x
              WHERE x.user_id = v_uid) AS moi
    FROM salle_sessions s2
    WHERE s2.salle_id = p_salle_id
      AND s2.statut = 'terminee'
      AND s2.id IS DISTINCT FROM v_ses.id
    ORDER BY s2.numero DESC
    LIMIT 5
  ) h;

  RETURN json_build_object(
    'server_now', v_now,
    'salle', json_build_object(
      'id', v_s.id,
      'nom', v_s.nom,
      'description', v_s.description,
      'code', v_s.code,
      'publique', v_s.publique,
      'admin_id', v_s.admin_id,
      'created_at', v_s.created_at
    ),
    'moi', json_build_object('user_id', v_uid, 'est_admin', v_s.admin_id = v_uid),
    'nb_membres', v_nb_membres,
    'membres', v_membres,
    'session', v_session,
    'items', v_items,
    'corrections', v_corr,
    'mes_reponses', v_mes,
    'classement', v_classement,
    'mon_classement', v_moi_rang,
    'historique', v_hist
  );
END;
$$;

CREATE OR REPLACE FUNCTION repondre_salle(p_session_id uuid, p_position int, p_choix int DEFAULT NULL, p_valeurs numeric[] DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c_marge   CONSTANT numeric := 2;
  v_uid     uuid := auth.uid();
  v_now     timestamptz := clock_timestamp();
  v_ses     salle_sessions%ROWTYPE;
  v_it      salle_items%ROWTYPE;
  v_rep     salle_reponses%ROWTYPE;
  v_e       numeric;
  v_open    numeric;
  v_juste   boolean := false;
  v_format  boolean := false;
  v_val     numeric;
  v_retenue numeric := NULL;
  v_restant numeric;
  v_points  int := 0;
  v_delai   int;
  v_n       int;
  v_k       int;
  v_indice  text;
  v_global  boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id;
  IF NOT FOUND OR NOT _salle_est_membre(v_ses.salle_id, v_uid) THEN
    RAISE EXCEPTION 'Partie introuvable.';
  END IF;
  PERFORM _salle_maj(v_ses.salle_id);
  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id;
  IF v_ses.statut = 'terminee' THEN
    RAISE EXCEPTION 'La partie est terminée.';
  END IF;

  SELECT * INTO v_it FROM salle_items WHERE session_id = p_session_id AND position = p_position;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question invalide.';
  END IF;

  v_global := v_ses.params ->> 'chrono' = 'global';
  v_e := extract(epoch FROM (v_now - v_ses.started_at));
  IF v_global THEN
    -- chrono global : toutes les questions sont ouvertes du départ à la fin de la partie
    v_open := 0;
    IF v_e < 0 THEN
      RAISE EXCEPTION 'La partie n''a pas encore commencé.';
    END IF;
    IF v_now >= v_ses.fin_at + make_interval(secs => c_marge) THEN
      RAISE EXCEPTION 'Le temps est écoulé.';
    END IF;
  ELSE
    v_open := p_position * (v_ses.temps + v_ses.pause_s);
    IF v_e < v_open THEN
      RAISE EXCEPTION 'Cette question n''est pas encore ouverte.';
    END IF;
    IF v_e >= v_open + v_ses.temps + c_marge THEN
      RAISE EXCEPTION 'Le temps est écoulé pour cette question.';
    END IF;
  END IF;

  -- déjà répondu : on rend la même réponse, sans rien changer
  SELECT * INTO v_rep FROM salle_reponses WHERE session_id = p_session_id AND user_id = v_uid AND position = p_position;
  IF FOUND AND v_global THEN
    RETURN json_build_object(
      'ok', true, 'deja', true, 'masque', true, 'juste', false, 'points', 0, 'delai_ms', v_rep.delai_ms,
      'choix', v_rep.choix, 'valeur', v_rep.valeur,
      'bonne_index', NULL, 'bonne_valeur', NULL, 'explication', NULL, 'etapes', '[]'::jsonb
    );
  END IF;
  IF FOUND THEN
    RETURN json_build_object(
      'ok', true, 'deja', true, 'juste', v_rep.juste, 'points', v_rep.points, 'delai_ms', v_rep.delai_ms,
      'choix', v_rep.choix, 'valeur', v_rep.valeur,
      'bonne_index', v_it.bonne_index, 'bonne_valeur', v_it.bonne_valeur,
      'explication', v_it.explication, 'etapes', v_it.etapes
    );
  END IF;

  IF v_it.origine = 'question' THEN
    v_n := jsonb_array_length(v_it.choix);
    IF p_choix IS NULL OR p_choix < 0 OR p_choix >= v_n THEN
      RAISE EXCEPTION 'Réponse invalide.';
    END IF;
    v_juste := p_choix = v_it.bonne_index;
  ELSE
    IF p_valeurs IS NULL OR coalesce(array_length(p_valeurs, 1), 0) NOT BETWEEN 1 AND 2 THEN
      RAISE EXCEPTION 'Réponse invalide.';
    END IF;
    FOREACH v_val IN ARRAY p_valeurs LOOP
      IF v_val IS NULL THEN
        RAISE EXCEPTION 'Réponse invalide.';
      END IF;
      IF _salle_calcul_juste(v_val, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte) THEN
        v_juste := true;
        v_retenue := v_val;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_juste THEN
      v_retenue := p_valeurs[1];
      -- le calcul est bon mais l'échelle non : on le dit, sans compter la réponse
      FOREACH v_val IN ARRAY p_valeurs LOOP
        IF v_val <> 0 AND v_it.bonne_valeur <> 0 THEN
          IF v_it.unite = '%' AND _salle_calcul_juste(v_val * 100, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte) THEN
            v_format := true;
            v_indice := 'Réponds en pourcentage : 8.5 pour 8,5 %.';
          ELSIF v_it.unite = 'bp' AND (
                  _salle_calcul_juste(v_val * 100, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte)
               OR _salle_calcul_juste(v_val * 10000, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte)) THEN
            v_format := true;
            v_indice := 'Réponds en points de base : 0,25 % = 25 bp.';
          END IF;
        END IF;
      END LOOP;
      IF v_format AND NOT v_global THEN
        RETURN json_build_object('ok', false, 'raison', 'format', 'indice', v_indice);
      END IF;
    END IF;
  END IF;

  v_delai := greatest(0, round((v_e - v_open) * 1000))::int;
  IF v_juste AND v_global THEN
    -- chrono global : 1 000 points par bonne réponse, la vitesse départage (temps cumulé)
    v_points := 1000;
  ELSIF v_juste THEN
    v_restant := greatest(0, least(v_ses.temps, v_open + v_ses.temps - v_e));
    v_points := floor(1000 * (0.5 + 0.5 * v_restant / v_ses.temps) + 0.5)::int;
  END IF;

  INSERT INTO salle_reponses (session_id, position, user_id, choix, valeur, juste, points, delai_ms)
  VALUES (p_session_id, p_position, v_uid, CASE WHEN v_it.origine = 'question' THEN p_choix END, v_retenue, v_juste, v_points, v_delai)
  ON CONFLICT (session_id, user_id, position) DO NOTHING;
  GET DIAGNOSTICS v_k = ROW_COUNT;
  IF v_k = 0 THEN
    -- une autre requête a répondu entre-temps : la première reste définitive
    SELECT * INTO v_rep FROM salle_reponses WHERE session_id = p_session_id AND user_id = v_uid AND position = p_position;
    IF v_global THEN
      RETURN json_build_object(
        'ok', true, 'deja', true, 'masque', true, 'juste', false, 'points', 0, 'delai_ms', v_rep.delai_ms,
        'choix', v_rep.choix, 'valeur', v_rep.valeur,
        'bonne_index', NULL, 'bonne_valeur', NULL, 'explication', NULL, 'etapes', '[]'::jsonb
      );
    END IF;
    RETURN json_build_object(
      'ok', true, 'deja', true, 'juste', v_rep.juste, 'points', v_rep.points, 'delai_ms', v_rep.delai_ms,
      'choix', v_rep.choix, 'valeur', v_rep.valeur,
      'bonne_index', v_it.bonne_index, 'bonne_valeur', v_it.bonne_valeur,
      'explication', v_it.explication, 'etapes', v_it.etapes
    );
  END IF;

  IF v_global THEN
    RETURN json_build_object(
      'ok', true, 'deja', false, 'masque', true, 'juste', false, 'points', 0, 'delai_ms', v_delai,
      'choix', CASE WHEN v_it.origine = 'question' THEN p_choix END, 'valeur', v_retenue,
      'bonne_index', NULL, 'bonne_valeur', NULL, 'explication', NULL, 'etapes', '[]'::jsonb
    );
  END IF;
  RETURN json_build_object(
    'ok', true, 'deja', false, 'juste', v_juste, 'points', v_points, 'delai_ms', v_delai,
    'choix', CASE WHEN v_it.origine = 'question' THEN p_choix END, 'valeur', v_retenue,
    'bonne_index', v_it.bonne_index, 'bonne_valeur', v_it.bonne_valeur,
    'explication', v_it.explication, 'etapes', v_it.etapes
  );
END;
$$;

-- Carnet de ratures : en chrono global, la rature n'apparaît qu'à la fin de la partie.
CREATE OR REPLACE FUNCTION public._rature_salle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q    uuid;
  v_orig text;
  v_vis  timestamptz;
BEGIN
  IF NEW.choix IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT i.question_id, i.origine,
           CASE WHEN s.params ->> 'chrono' = 'global' THEN s.fin_at
                ELSE s.started_at + make_interval(secs => NEW.position * (s.temps + s.pause_s) + s.temps + 2) END
    INTO v_q, v_orig, v_vis
    FROM salle_items i JOIN salle_sessions s ON s.id = i.session_id
    WHERE i.session_id = NEW.session_id AND i.position = NEW.position;
    IF v_orig = 'question' AND v_q IS NOT NULL THEN
      PERFORM _rature_note(NEW.user_id, v_q, 'salle', NEW.juste, NEW.choix, NEW.repondu_le, v_vis);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (salle) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION _salle_horloge_partie(timestamptz, int, int, int, text, timestamptz, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._rature_salle() FROM PUBLIC, anon, authenticated;
