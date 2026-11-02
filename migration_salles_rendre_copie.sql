-- migration_salles_rendre_copie.sql — « Rendre ma copie » en chrono global.
--
-- Un joueur peut rendre sa copie avant la fin du chrono : ses réponses sont
-- verrouillées (repondre_salle refuse la suite). La correction reste cachée
-- tant que d'autres jouent. Dès que TOUS les membres de la salle ont rendu leur
-- copie, la partie se termine sur-le-champ (comme arreter_session) et le
-- débrief s'ouvre pour tous. etat_salle dit qui a rendu (avancement[].rendu).
-- Table salle_rendus (nouvelle, lue seulement par les fonctions) ; fonctions
-- en CREATE OR REPLACE ; idempotent ; aucune donnée existante touchée.

CREATE TABLE IF NOT EXISTS salle_rendus (
  session_id uuid        NOT NULL REFERENCES salle_sessions(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rendu_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
ALTER TABLE salle_rendus ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE salle_rendus FROM anon, authenticated;

-- Rend ma copie (chrono global, partie en cours). Termine la partie si tous les
-- membres de la salle ont rendu la leur. Renvoie { ok, rendus, membres, terminee }.
CREATE OR REPLACE FUNCTION rendre_copie(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_now     timestamptz := clock_timestamp();
  v_ses     salle_sessions%ROWTYPE;
  v_rendus  int;
  v_membres int;
  v_fin     boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id;
  IF NOT FOUND OR v_ses.salle_id IS NULL OR NOT _salle_est_membre(v_ses.salle_id, v_uid) THEN
    RAISE EXCEPTION 'Partie introuvable.';
  END IF;
  IF v_ses.params ->> 'chrono' IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'On ne rend sa copie qu''en chrono global.';
  END IF;
  PERFORM _salle_maj(v_ses.salle_id);
  -- verrou sur la partie : deux copies rendues en même temps ne la terminent qu'une fois
  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_ses.statut = 'terminee' THEN
    RETURN json_build_object('ok', true, 'rendus', 0, 'membres', 0, 'terminee', true);
  END IF;
  IF v_now < v_ses.started_at THEN
    RAISE EXCEPTION 'La partie n''a pas encore commencé.';
  END IF;

  INSERT INTO salle_rendus (session_id, user_id, rendu_le) VALUES (p_session_id, v_uid, v_now)
  ON CONFLICT (session_id, user_id) DO NOTHING;

  SELECT count(*)::int INTO v_membres FROM salle_membres WHERE salle_id = v_ses.salle_id;
  SELECT count(*)::int INTO v_rendus
  FROM salle_rendus d JOIN salle_membres m ON m.salle_id = v_ses.salle_id AND m.user_id = d.user_id
  WHERE d.session_id = p_session_id;

  IF v_rendus >= v_membres THEN
    UPDATE salle_sessions
    SET statut = 'terminee', terminee_at = v_now, fin_at = least(fin_at, v_now)
    WHERE id = p_session_id AND statut <> 'terminee';
    UPDATE salles SET derniere_activite = v_now WHERE id = v_ses.salle_id;
    v_fin := true;
  END IF;

  RETURN json_build_object('ok', true, 'rendus', v_rendus, 'membres', v_membres, 'terminee', v_fin);
END;
$$;

REVOKE ALL ON FUNCTION rendre_copie(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rendre_copie(uuid) TO authenticated;

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
      -- combien de réponses chacun a données, et s'il a rendu sa copie (jamais lesquelles ni leur justesse)
      SELECT coalesce(json_agg(json_build_object('user_id', a.user_id, 'n', a.n, 'rendu', a.rendu) ORDER BY a.n DESC), '[]'::json)
      INTO v_avancement
      FROM (
        SELECT u.user_id,
               (SELECT count(*)::int FROM salle_reponses r WHERE r.session_id = v_ses.id AND r.user_id = u.user_id) AS n,
               EXISTS (SELECT 1 FROM salle_rendus d WHERE d.session_id = v_ses.id AND d.user_id = u.user_id) AS rendu
        FROM (
          SELECT r.user_id FROM salle_reponses r WHERE r.session_id = v_ses.id
          UNION
          SELECT d.user_id FROM salle_rendus d WHERE d.session_id = v_ses.id
        ) u
      ) a;
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
  IF v_global AND EXISTS (SELECT 1 FROM salle_rendus WHERE session_id = p_session_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Ta copie est rendue : tu ne peux plus répondre.';
  END IF;
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
