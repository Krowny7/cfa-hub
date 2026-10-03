-- ============================================================================
-- Revue des duels (V4) — à appliquer APRÈS migration_duels_elo.sql.
--
-- Remplace duel_review(p_duel_id) (même signature, même type de retour json,
-- mêmes droits) pour la page de revue « /duel/<id>?revue=1 » :
--
--   • chaque question porte aussi la réponse de l'adversaire
--     (their_selected_index, their_is_correct, their_answered), mais
--     SEULEMENT une fois le duel terminé ('finished'), c'est-à-dire quand les
--     deux copies sont rendues ou que le délai est passé ;
--   • la correction s'ouvre aussi pour un duel clos sans résultat (refusé ou
--     expiré) au joueur qui l'a joué : plus personne ne peut y répondre, et
--     ses réponses ne sont plus perdues. Celui qui n'a pas joué ne voit rien ;
--   • le duel est d'abord réglé s'il est arrivé à échéance (comme duel_state).
--
-- Inchangé : un duel en attente ou en cours ne donne aucune correction, ni à
-- l'un ni à l'autre joueur ; duel_answers reste illisible côté client.
-- Les clés renvoyées avant cette migration restent identiques : le code qui
-- ne connaît pas les nouvelles les ignore, celui qui les connaît détecte leur
-- présence. Aucune table créée, modifiée ou vidée ; aucune donnée supprimée.
--
-- Idempotent : peut être rejoué sans risque.
-- ============================================================================

CREATE OR REPLACE FUNCTION duel_review(p_duel_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  d         duels%ROWTYPE;
  v_is_c    boolean;
  v_other   uuid;
  v_started timestamptz;
  v_review  json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _duel_is_player(p_duel_id, v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  -- Chrono écoulé ou délai passé : le duel est réglé avant tout.
  PERFORM _duel_settle(p_duel_id);

  SELECT * INTO d FROM duels WHERE id = p_duel_id;
  IF NOT FOUND OR (d.challenger_id <> v_uid AND d.opponent_id IS DISTINCT FROM v_uid) THEN
    RAISE EXCEPTION 'Duel introuvable.';
  END IF;
  v_is_c := d.challenger_id = v_uid;
  v_other := CASE WHEN v_is_c THEN d.opponent_id ELSE d.challenger_id END;
  v_started := CASE WHEN v_is_c THEN d.challenger_started_at ELSE d.opponent_started_at END;

  IF NOT (d.status = 'finished' OR (d.status IN ('declined', 'expired') AND v_started IS NOT NULL)) THEN
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
    'is_correct', coalesce(a.is_correct, false),
    'answered_at', a.answered_at,
    -- l'adversaire : seulement un duel terminé (jamais avant la fin)
    'their_selected_index', CASE WHEN d.status = 'finished' THEN o.selected_index END,
    'their_is_correct', CASE WHEN d.status = 'finished' THEN coalesce(o.is_correct, false) END,
    'their_answered', CASE WHEN d.status = 'finished' THEN o.position IS NOT NULL END
  ) ORDER BY t.pos)
  INTO v_review
  FROM unnest(d.question_ids) WITH ORDINALITY AS t(qid, pos)
  JOIN quiz_questions qq ON qq.id = t.qid
  JOIN quiz_sets qs ON qs.id = qq.set_id
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  LEFT JOIN duel_answers a ON a.duel_id = d.id AND a.user_id = v_uid AND a.position = t.pos - 1
  LEFT JOIN duel_answers o ON o.duel_id = d.id AND o.user_id = v_other AND o.position = t.pos - 1;

  RETURN coalesce(v_review, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION duel_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION duel_review(uuid) TO authenticated;
