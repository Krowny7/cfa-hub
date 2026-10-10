-- Le carnet de ratures regroupé par notion (Moi › Erreurs, points faibles
-- étape 4) : en plus des filtres par source, les ratures rangées par notion
-- (un Learning Module, la colonne quiz_questions.notion de
-- migration_notions.sql), en lecture seule.
-- - ratures_par_notion(p_notion, p_retirees, p_limit, p_offset) : pour le
--   joueur connecté, ses notions (en cours et anciennes, par notion ; « » :
--   les questions sans notion), « remplie » (au moins une question porte une
--   notion : sinon le site garde le carnet par source), les comptes du
--   carnet comme get_ratures, et, si p_notion est donnée, une page des
--   ratures de cette notion (« » : celles sans notion) dans le temps choisi.
-- Fonction à part : get_ratures et les autres fonctions du carnet ne
-- changent pas. « Mettre au propre » une notion passe déjà par
-- rature_suivante_notion (migration_notions.sql).
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_notions.sql (et son remplissage). Idempotent.

DO $$
BEGIN
  IF to_regprocedure('public.rature_suivante_notion(text, uuid[])') IS NULL THEN
    RAISE EXCEPTION 'Colle d''abord migration_notions.sql';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION ratures_par_notion(p_notion text DEFAULT NULL, p_retirees boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
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
  -- les réponses en attente (défi rendu, duel clos…) entrent au carnet, comme dans get_ratures
  PERFORM _ratures_rejouer(v_uid);

  WITH mes AS (
    SELECT r.*, coalesce(q.notion, '') AS notion_q
    FROM ratures r LEFT JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now()
  ),
  vue AS (
    SELECT * FROM mes WHERE p_notion IS NOT NULL AND notion_q = p_notion AND (removed_at IS NOT NULL) = v_ret
  ),
  liste AS (
    SELECT * FROM vue
    ORDER BY CASE WHEN v_ret THEN removed_at ELSE last_missed_at END DESC, question_id
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100) OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT json_build_object(
    'remplie', EXISTS (SELECT 1 FROM quiz_questions WHERE notion IS NOT NULL),
    'total', (SELECT count(*) FROM mes WHERE removed_at IS NULL),
    'retirees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL),
    'retirees_semaine', (SELECT count(*) FROM mes WHERE removed_at > now() - interval '7 days'),
    'filtre', (SELECT count(*) FROM vue),
    'sources', coalesce((SELECT json_object_agg(s, n) FROM (SELECT s, count(*) AS n FROM mes, unnest(sources) AS s WHERE (removed_at IS NOT NULL) = v_ret GROUP BY s) x), '{}'::json),
    -- les notions du carnet, les plus chargées d'abord (en cours, puis anciennes)
    'notions', coalesce((
      SELECT json_agg(json_build_object('notion', x.notion_q, 'en_cours', x.en_cours, 'anciennes', x.anciennes) ORDER BY x.en_cours DESC, x.anciennes DESC, x.notion_q)
      FROM (
        SELECT notion_q, count(*) FILTER (WHERE removed_at IS NULL) AS en_cours, count(*) FILTER (WHERE removed_at IS NOT NULL) AS anciennes
        FROM mes GROUP BY notion_q
      ) x
    ), '[]'::json),
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

REVOKE ALL ON FUNCTION ratures_par_notion(text, boolean, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ratures_par_notion(text, boolean, int, int) TO authenticated;
