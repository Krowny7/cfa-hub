-- « Tes points faibles » (Moi › Stats, S'entraîner), étape 1 : le thème.
-- - ratures_par_theme() : pour le joueur connecté, ses ratures comptées par
--   thème (set de questions) : en cours, vives (jamais reprises juste depuis
--   la dernière erreur), anciennes (rayées), rayées ces 7 derniers jours, et
--   la dernière activité. Le set courant de la question, sinon le titre
--   gardé dans la rature (question retirée de la banque). Lecture seule.
-- - rature_suivante : un filtre facultatif de plus, p_sets (les sets d'un
--   thème), pour « Mettre au propre ce thème ». Les appels sans p_sets
--   restent valides.
-- Aucune table, aucune colonne.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_ratures_reprise.sql. Idempotent. Si migration_ratures_reprise.sql
-- est recollée plus tard, recolle celle-ci ensuite (elle retire l'ancienne
-- version à 3 arguments de rature_suivante).

DO $$
BEGIN
  IF to_regprocedure('public.rature_repondre(uuid, integer)') IS NULL THEN
    RAISE EXCEPTION 'Colle d''abord migration_ratures_reprise.sql';
  END IF;
END $$;

-- 1. Les ratures du joueur, par thème
CREATE OR REPLACE FUNCTION ratures_par_theme()
RETURNS TABLE (set_id uuid, set_title text, folder_name text, en_cours int, vives int, anciennes int, rayees_7j int, derniere timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;
  -- les réponses en attente dont l'embargo est levé, comme get_ratures
  PERFORM _ratures_rejouer(v_uid);

  RETURN QUERY
  WITH mes AS (
    SELECT r.removed_at, r.correct_since,
           greatest(r.last_missed_at, r.last_correct_at, r.removed_at) AS vu,
           q.set_id AS sid,
           CASE WHEN q.set_id IS NULL THEN r.set_title ELSE qs.title END AS titre,
           CASE WHEN q.set_id IS NULL THEN r.folder_name ELSE lf.name END AS dossier
    FROM ratures r
    LEFT JOIN quiz_questions q ON q.id = r.question_id
    LEFT JOIN quiz_sets qs ON qs.id = q.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE r.user_id = v_uid AND r.visible_from <= now()
  )
  SELECT m.sid,
         m.titre,
         m.dossier,
         (count(*) FILTER (WHERE m.removed_at IS NULL))::int,
         (count(*) FILTER (WHERE m.removed_at IS NULL AND m.correct_since = 0))::int,
         (count(*) FILTER (WHERE m.removed_at IS NOT NULL))::int,
         (count(*) FILTER (WHERE m.removed_at > now() - interval '7 days'))::int,
         max(m.vu)
  FROM mes m
  GROUP BY m.sid, m.titre, m.dossier
  ORDER BY count(*) FILTER (WHERE m.removed_at IS NULL) DESC, m.titre;
END;
$$;

-- 2. La prochaine rature à repasser, avec le filtre de thème en plus
--    (signature remplacée : l'ancienne, à 3 arguments, est retirée pour qu'un
--    appel sans p_sets ne soit jamais ambigu)
DROP FUNCTION IF EXISTS rature_suivante(text, uuid[]);
DROP FUNCTION IF EXISTS rature_suivante(text, uuid[], boolean);
CREATE OR REPLACE FUNCTION rature_suivante(p_source text DEFAULT NULL, p_exclure uuid[] DEFAULT '{}', p_anciennes boolean DEFAULT false, p_sets uuid[] DEFAULT NULL)
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
    SELECT r.* FROM ratures r
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND (r.removed_at IS NOT NULL) = v_anc
      AND (p_source IS NULL OR p_source = ANY (r.sources))
      AND (p_sets IS NULL OR EXISTS (SELECT 1 FROM quiz_questions q WHERE q.id = r.question_id AND q.set_id = ANY (p_sets)))
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY random() LIMIT 1
  )
  SELECT json_build_object(
    -- ratures du tri (en cours ou anciennes, source, thème), et celles pas encore vues
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

-- 3. Droits
REVOKE ALL ON FUNCTION ratures_par_theme() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rature_suivante(text, uuid[], boolean, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ratures_par_theme() TO authenticated;
GRANT EXECUTE ON FUNCTION rature_suivante(text, uuid[], boolean, uuid[]) TO authenticated;
