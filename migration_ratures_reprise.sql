-- « Mettre au propre » (Moi › Erreurs) : repasser ses ratures une à une, au
-- hasard. Une bonne réponse raye la rature du carnet (elle rejoint les
-- retirées, d'où on peut la remettre) ; une erreur la garde et compte une
-- fois de plus. La bonne réponse ne part qu'après la réponse.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_ratures.sql. Idempotent.

-- La prochaine rature à repasser : au hasard parmi celles du carnet (filtre
-- de source facultatif), hors celles déjà vues pendant cette mise au propre.
CREATE OR REPLACE FUNCTION rature_suivante(p_source text DEFAULT NULL, p_exclure uuid[] DEFAULT '{}')
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH carnet AS (
    SELECT * FROM ratures
    WHERE user_id = v_uid AND visible_from <= now() AND removed_at IS NULL
      AND (p_source IS NULL OR p_source = ANY (sources))
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY random() LIMIT 1
  )
  SELECT json_build_object(
    -- ratures du filtre encore au carnet, et celles pas encore vues
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

-- Répondre à une rature repassée : juste, elle est rayée du carnet ; fausse,
-- elle reste (une erreur de plus). Rend la correction.
CREATE OR REPLACE FUNCTION rature_repondre(p_question_id uuid, p_choice int)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_r    ratures;
  v_q    quiz_questions;
  v_bon  int;
  v_expl text;
  v_ok   boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_r FROM ratures
  WHERE user_id = v_uid AND question_id = p_question_id AND visible_from <= now() AND removed_at IS NULL
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
    UPDATE ratures SET removed_at = now(), correct_since = correct_since + 1, last_correct_at = now()
    WHERE user_id = v_uid AND question_id = p_question_id;
  ELSE
    UPDATE ratures SET misses = misses + 1, last_missed_at = now(), last_selected = p_choice, correct_since = 0
    WHERE user_id = v_uid AND question_id = p_question_id;
  END IF;

  RETURN json_build_object('is_correct', v_ok, 'correct_index', v_bon, 'explanation', v_expl, 'selected_index', p_choice);
END;
$$;

REVOKE ALL ON FUNCTION rature_suivante(text, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rature_repondre(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rature_suivante(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION rature_repondre(uuid, int) TO authenticated;
