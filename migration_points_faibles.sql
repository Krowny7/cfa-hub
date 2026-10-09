-- « Tes points faibles » (Moi › Stats, S'entraîner), étape 1 : le thème.
-- - ratures_par_theme() : pour le joueur connecté, ses ratures comptées par
--   thème (set de questions) : en cours, vives (jamais reprises juste depuis
--   la dernière erreur), anciennes (rayées), rayées ces 7 derniers jours, et
--   la dernière activité. Le set courant de la question, sinon le titre
--   gardé dans la rature (question retirée de la banque). Lecture seule.
-- - rature_suivante_theme(p_sets, p_exclure) : « Mettre au propre » limité
--   aux ratures en cours d'un thème (ses sets). Fonction à part :
--   rature_suivante (le carnet, migration_ratures_reprise.sql) ne change
--   pas, et recoller la reprise ne crée aucune ambiguïté.
-- - _ratures_rejouer : une réponse en attente n'est notée qu'une fois, même
--   quand deux lectures du carnet la rejouent en même temps (Moi lit le
--   carnet et les ratures par thème en parallèle). migration_ratures.sql
--   porte la même version : la recoller ne défait rien.
-- Aucune table, aucune colonne.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_ratures_reprise.sql. Idempotent.

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

-- 2. La prochaine rature en cours d'un thème, au hasard, hors celles déjà
--    vues pendant ce tour (même réponse que rature_suivante)
CREATE OR REPLACE FUNCTION rature_suivante_theme(p_sets uuid[], p_exclure uuid[] DEFAULT '{}')
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
    SELECT r.* FROM ratures r
    JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL
      AND q.set_id = ANY (coalesce(p_sets, '{}'::uuid[]))
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY random() LIMIT 1
  )
  SELECT json_build_object(
    -- ratures en cours du thème, et celles pas encore vues
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

-- 3. Rejouer les réponses en attente (migration_ratures.sql) : la ligne n'est
--    notée que si cette transaction l'a bien retirée. Deux lectures en
--    parallèle lisent la même ligne ; la seconde attend le verrou, ne
--    supprime plus rien et passe, au lieu de la noter une deuxième fois.
CREATE OR REPLACE FUNCTION _ratures_rejouer(p_user uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  e ratures_attente;
BEGIN
  FOR e IN SELECT * FROM ratures_attente WHERE user_id = p_user AND visible_from <= now() ORDER BY at, id LOOP
    DELETE FROM ratures_attente WHERE id = e.id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    PERFORM _rature_note(e.user_id, e.question_id, e.source, e.correct, e.selected, e.at, e.visible_from);
  END LOOP;
END;
$$;

-- 4. Droits
REVOKE ALL ON FUNCTION ratures_par_theme() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rature_suivante_theme(uuid[], uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION _ratures_rejouer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ratures_par_theme() TO authenticated;
GRANT EXECUTE ON FUNCTION rature_suivante_theme(uuid[], uuid[]) TO authenticated;
