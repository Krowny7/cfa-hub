-- migration_salles_changer_reponse.sql — chrono global : une réponse se change
-- jusqu'à la remise de la copie, comme une vraie copie d'examen.
--
-- repondre_salle : en chrono global, répondre à une question déjà répondue
-- remplace la réponse (choix, justesse, points, délai, heure) tant que la
-- copie n'est pas rendue et que le chrono court ; rien n'est révélé ('deja'
-- dit seulement qu'il y avait une réponse). Mode « question » inchangé.
-- Carnet de ratures : en chrono global, les réponses ne sont plus notées à
-- chaque clic (une réponse changée fausserait le carnet) mais une fois, à la
-- fin de la partie (déclencheur sur salle_sessions), visibles aussitôt.
-- Fonctions et déclencheurs seulement ; idempotent ; aucune donnée touchée.

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
  v_deja    boolean;
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
  v_deja := FOUND;
  -- chrono global : une réponse déjà donnée se remplace (jusqu'à la remise de la copie, vérifiée plus haut)
  IF v_deja AND NOT v_global THEN
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

  IF v_global THEN
    INSERT INTO salle_reponses (session_id, position, user_id, choix, valeur, juste, points, delai_ms)
    VALUES (p_session_id, p_position, v_uid, CASE WHEN v_it.origine = 'question' THEN p_choix END, v_retenue, v_juste, v_points, v_delai)
    ON CONFLICT (session_id, user_id, position) DO UPDATE
      SET choix = EXCLUDED.choix, valeur = EXCLUDED.valeur, juste = EXCLUDED.juste,
          points = EXCLUDED.points, delai_ms = EXCLUDED.delai_ms, repondu_le = v_now;
    RETURN json_build_object(
      'ok', true, 'deja', v_deja, 'masque', true, 'juste', false, 'points', 0, 'delai_ms', v_delai,
      'choix', CASE WHEN v_it.origine = 'question' THEN p_choix END, 'valeur', v_retenue,
      'bonne_index', NULL, 'bonne_valeur', NULL, 'explication', NULL, 'etapes', '[]'::jsonb
    );
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

-- Une réponse de chrono global n'est plus notée à l'insertion (voir la fin de partie).
CREATE OR REPLACE FUNCTION public._rature_salle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q      uuid;
  v_orig   text;
  v_vis    timestamptz;
  v_global boolean;
BEGIN
  IF NEW.choix IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT i.question_id, i.origine,
           s.started_at + make_interval(secs => NEW.position * (s.temps + s.pause_s) + s.temps + 2),
           s.params ->> 'chrono' = 'global'
    INTO v_q, v_orig, v_vis, v_global
    FROM salle_items i JOIN salle_sessions s ON s.id = i.session_id
    WHERE i.session_id = NEW.session_id AND i.position = NEW.position;
    IF NOT coalesce(v_global, false) AND v_orig = 'question' AND v_q IS NOT NULL THEN
      PERFORM _rature_note(NEW.user_id, v_q, 'salle', NEW.juste, NEW.choix, NEW.repondu_le, v_vis);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (salle) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._rature_salle() FROM PUBLIC, anon, authenticated;

-- Fin d'une partie en chrono global : chaque réponse définitive va au carnet de ratures.
CREATE OR REPLACE FUNCTION public._rature_salle_fin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.statut = 'terminee' AND OLD.statut IS DISTINCT FROM 'terminee' AND NEW.params ->> 'chrono' = 'global' THEN
    BEGIN
      PERFORM _rature_note(r.user_id, i.question_id, 'salle', r.juste, r.choix, r.repondu_le, NEW.fin_at)
      FROM salle_reponses r
      JOIN salle_items i ON i.session_id = r.session_id AND i.position = r.position
      WHERE r.session_id = NEW.id AND i.origine = 'question' AND i.question_id IS NOT NULL AND r.choix IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ratures (fin de salle) : %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._rature_salle_fin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS salle_sessions_rature_fin ON salle_sessions;
CREATE TRIGGER salle_sessions_rature_fin
  AFTER UPDATE OF statut ON salle_sessions
  FOR EACH ROW EXECUTE FUNCTION _rature_salle_fin();
