-- Le carnet de ratures en deux temps (Moi › Erreurs) : les ratures EN COURS,
-- et les ANCIENNES (rayées : réussies en les repassant, ou rayées à la main),
-- toujours consultables et rejouables.
-- - « Mettre au propre » : les ratures en cours repassées une à une, au
--   hasard. Juste : rayée, elle rejoint les anciennes. Faux : elle reste (une
--   erreur de plus).
-- - « Rejouer les anciennes » : une révision. Juste : elle reste ancienne
--   (une réussite de plus). Faux : elle revient en cours.
-- La bonne réponse ne part qu'après la réponse.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_ratures.sql. Idempotent.

-- La prochaine rature à repasser : au hasard parmi les ratures en cours (ou
-- les anciennes), filtre de source facultatif, hors celles déjà vues pendant
-- ce tour.
DROP FUNCTION IF EXISTS rature_suivante(text, uuid[]);
CREATE OR REPLACE FUNCTION rature_suivante(p_source text DEFAULT NULL, p_exclure uuid[] DEFAULT '{}', p_anciennes boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_anc boolean := coalesce(p_anciennes, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH carnet AS (
    SELECT * FROM ratures
    WHERE user_id = v_uid AND visible_from <= now() AND (removed_at IS NOT NULL) = v_anc
      AND (p_source IS NULL OR p_source = ANY (sources))
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY random() LIMIT 1
  )
  SELECT json_build_object(
    -- ratures du tri (en cours ou anciennes), et celles pas encore vues
    'carnet', (SELECT count(*) FROM carnet),
    'reste', (SELECT count(*) FROM candidates),
    'question', (
      SELECT json_build_object(
        'question_id', t.question_id,
        'prompt', CASE WHEN q.choices = t.choices THEN q.prompt ELSE t.prompt END,
        'choices', t.choices,
        'misses', t.misses,
        'sources', t.sources,
        'last_source', t.last_source,
        'last_missed_at', t.last_missed_at,
        'set_title', coalesce(qs.title, t.set_title),
        'folder_name', coalesce(lf.name, t.folder_name)
      )
      FROM tiree t
      LEFT JOIN quiz_questions q ON q.id = t.question_id
      LEFT JOIN quiz_sets qs ON qs.id = q.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    )
  ) INTO v_res;
  RETURN v_res;
END;
$$;

-- Répondre à une rature repassée. En cours : juste, rayée (→ anciennes) ;
-- fausse, elle reste. Ancienne : juste, elle reste ancienne ; fausse, elle
-- revient en cours. Rend la correction et ce qui est arrivé (statut).
CREATE OR REPLACE FUNCTION rature_repondre(p_question_id uuid, p_choice int)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_r      ratures;
  v_q      quiz_questions;
  v_bon    int;
  v_expl   text;
  v_ok     boolean;
  v_statut text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_r FROM ratures
  WHERE user_id = v_uid AND question_id = p_question_id AND visible_from <= now()
  FOR UPDATE;
  IF v_r.question_id IS NULL THEN
    RAISE EXCEPTION 'Rature not found';
  END IF;
  IF p_choice IS NULL OR p_choice < 0 OR p_choice >= coalesce(array_length(v_r.choices, 1), 0) THEN
    RAISE EXCEPTION 'Invalid choice';
  END IF;
  -- la question à jour si ses choix n'ont pas bougé, sinon la copie gardée
  SELECT * INTO v_q FROM quiz_questions WHERE id = p_question_id;
  IF v_q.id IS NOT NULL AND v_q.choices = v_r.choices THEN
    v_bon := v_q.correct_index;
    v_expl := v_q.explanation;
  ELSE
    v_bon := v_r.correct_index;
    v_expl := v_r.explanation;
  END IF;
  v_ok := p_choice = v_bon;

  IF v_ok THEN
    UPDATE ratures
    SET removed_at = coalesce(removed_at, now()), correct_since = correct_since + 1, last_correct_at = now()
    WHERE user_id = v_uid AND question_id = p_question_id;
    v_statut := CASE WHEN v_r.removed_at IS NULL THEN 'rayee' ELSE 'ancienne' END;
  ELSE
    UPDATE ratures
    SET removed_at = NULL, misses = misses + 1, last_missed_at = now(), last_selected = p_choice, correct_since = 0
    WHERE user_id = v_uid AND question_id = p_question_id;
    v_statut := CASE WHEN v_r.removed_at IS NULL THEN 'reste' ELSE 'revenue' END;
  END IF;

  RETURN json_build_object('is_correct', v_ok, 'correct_index', v_bon, 'explanation', v_expl, 'selected_index', p_choice, 'statut', v_statut);
END;
$$;

-- La lecture du carnet (migration_ratures.sql) : les comptes par source
-- suivent désormais le temps affiché (en cours, ou anciennes).
DROP FUNCTION IF EXISTS get_ratures(text, boolean, int, int);
CREATE FUNCTION get_ratures(p_source text DEFAULT NULL, p_retirees boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ret boolean := coalesce(p_retirees, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH mes AS (
    SELECT * FROM ratures WHERE user_id = v_uid AND visible_from <= now()
  ),
  liste AS (
    SELECT * FROM mes
    WHERE (removed_at IS NOT NULL) = v_ret
      AND (p_source IS NULL OR p_source = ANY (sources))
    ORDER BY CASE WHEN v_ret THEN removed_at ELSE last_missed_at END DESC, question_id
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100) OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT json_build_object(
    'total', (SELECT count(*) FROM mes WHERE removed_at IS NULL),
    'retirees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL),
    'retirees_semaine', (SELECT count(*) FROM mes WHERE removed_at > now() - interval '7 days'),
    'filtre', (SELECT count(*) FROM mes WHERE (removed_at IS NOT NULL) = v_ret AND (p_source IS NULL OR p_source = ANY (sources))),
    'sources', coalesce((SELECT json_object_agg(s, n) FROM (SELECT s, count(*) AS n FROM mes, unnest(sources) AS s WHERE (removed_at IS NOT NULL) = v_ret GROUP BY s) x), '{}'::json),
    'items', coalesce((SELECT json_agg(json_build_object(
      'question_id', l.question_id,
      'misses', l.misses,
      'first_missed_at', l.first_missed_at,
      'last_missed_at', l.last_missed_at,
      'last_selected', l.last_selected,
      'last_source', l.last_source,
      'sources', l.sources,
      'correct_since', l.correct_since,
      'removed_at', l.removed_at,
      'prompt', CASE WHEN q.choices = l.choices THEN q.prompt ELSE l.prompt END,
      'choices', l.choices,
      'correct_index', CASE WHEN q.choices = l.choices THEN q.correct_index ELSE l.correct_index END,
      'explanation', CASE WHEN q.choices = l.choices THEN q.explanation ELSE l.explanation END,
      'set_title', coalesce(qs.title, l.set_title),
      'folder_name', coalesce(lf.name, l.folder_name)
    ) ORDER BY CASE WHEN v_ret THEN l.removed_at ELSE l.last_missed_at END DESC, l.question_id)
    FROM liste l
    LEFT JOIN quiz_questions q ON q.id = l.question_id
    LEFT JOIN quiz_sets qs ON qs.id = q.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id), '[]'::json)
  ) INTO v_res;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION rature_suivante(text, uuid[], boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rature_repondre(uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_ratures(text, boolean, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rature_suivante(text, uuid[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION rature_repondre(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ratures(text, boolean, int, int) TO authenticated;
