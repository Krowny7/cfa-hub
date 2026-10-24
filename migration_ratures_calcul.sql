-- Le carnet « sans calcul » (Moi › Erreurs) : au téléphone, dans le bus, les
-- ratures qui demandent un calcul sont pénibles à reprendre. Chaque question
-- de QCM dit si elle en demande un (quiz_questions.calcul : true, false, ou
-- NULL tant qu'on ne sait pas) ; le carnet, « Mettre au propre » et
-- « Rejouer les anciennes » peuvent écarter celles à calcul. Une question au
-- statut inconnu (NULL, ou retirée de la banque) reste proposée.
-- - quiz_questions.calcul : posée par la clé service (scripts/calculs/
--   appliquer.mjs pour toute la banque, qui range aussi le classement par
--   énoncé dans scripts/calculs/classement.json ; scripts/lib/seed-core.mjs
--   pour les questions qu'un seed insère : ce classement, sinon une
--   estimation) ou le SQL Editor. Un joueur ne l'écrit pas, même sur ses
--   propres séries (comme notion et concept).
-- - get_ratures, rature_suivante, ratures_par_notion, rature_suivante_notion :
--   un paramètre de plus, p_sans_calcul boolean DEFAULT false. Faux (ou
--   absent, comme dans tous les appels d'aujourd'hui) : mêmes réponses
--   qu'avant. Vrai : les ratures à calcul sortent de la liste, du tirage ET
--   des comptes (en cours, anciennes, cette semaine, par source, par notion,
--   qui sèchent, scellées). Trois champs en plus dans chaque réponse :
--   sans_calcul (le filtre appliqué), calcul_masquees (ratures à calcul
--   écartées de la vue demandée : son temps, sa source ou sa notion ; 0 sans
--   le filtre), et, pour get_ratures et ratures_par_notion, calcul_connu (au
--   moins une question classée : le site ne montre le bouton qu'alors).
-- - Une fonction Postgres à un paramètre de plus est une AUTRE fonction : les
--   anciennes signatures sont supprimées, pour que PostgREST n'ait jamais
--   deux candidates (erreur PGRST203). Les appels sans p_sans_calcul tombent
--   sur les nouvelles grâce à la valeur par défaut.
-- - Les corps sont ceux de migration_v3_profil.sql (§3a, les ratures qui
--   sèchent), le filtre en plus ; rien d'autre ne change.
-- ATTENTION : recoller APRÈS ce fichier migration_ratures.sql,
-- migration_ratures_reprise.sql, migration_v3_profil.sql,
-- migration_notions.sql ou migration_carnet_notions.sql remet leur version
-- des fonctions qu'ils définissent, sans le filtre (proprement : ils retirent
-- d'abord celle-ci, aucune fonction en double ; migration_v3_profil.sql les
-- quatre). Le site se replie alors en silence : le bouton « Sans calcul »
-- disparaît des vues dont la fonction a perdu le filtre (de toutes après
-- migration_v3_profil.sql). Recollez ce fichier ensuite.
-- Le site marche sans ce fichier : sans lui, pas de bouton « Sans calcul ».
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_v3_profil.sql (et donc migration_notions.sql et
-- migration_carnet_notions.sql). Idempotent.

DO $$
BEGIN
  IF to_regclass('public.ratures') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ratures' AND column_name = 'seche_le')
     OR (to_regprocedure('public.rature_suivante_notion(text, uuid[])') IS NULL AND to_regprocedure('public.rature_suivante_notion(text, uuid[], boolean)') IS NULL)
     OR (to_regprocedure('public.ratures_par_notion(text, boolean, integer, integer)') IS NULL AND to_regprocedure('public.ratures_par_notion(text, boolean, integer, integer, boolean)') IS NULL) THEN
    RAISE EXCEPTION 'Colle d''abord migration_v3_profil.sql (après migration_notions.sql et migration_carnet_notions.sql)';
  END IF;
END $$;

-- 1. La question demande-t-elle un calcul ? NULL : on ne sait pas (gardée).
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS calcul boolean;

-- Un joueur (rôles authenticated et anon) n'écrit pas calcul : à
-- l'insertion elle reste vide, à la mise à jour elle garde sa valeur.
CREATE OR REPLACE FUNCTION _quiz_questions_calcul_garde()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.calcul := NULL;
    ELSE
      NEW.calcul := OLD.calcul;
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION _quiz_questions_calcul_garde() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_questions_calcul_garde ON quiz_questions;
CREATE TRIGGER quiz_questions_calcul_garde
  BEFORE INSERT OR UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION _quiz_questions_calcul_garde();

-- 2. La prochaine rature à repasser (migration_v3_profil.sql §3a), sans
-- celles à calcul si p_sans_calcul.
DROP FUNCTION IF EXISTS rature_suivante(text, uuid[], boolean);
CREATE OR REPLACE FUNCTION rature_suivante(p_source text DEFAULT NULL, p_exclure uuid[] DEFAULT '{}', p_anciennes boolean DEFAULT false, p_sans_calcul boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_anc boolean := coalesce(p_anciennes, false);
  v_sc  boolean := coalesce(p_sans_calcul, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH base AS (
    SELECT r.*, coalesce(qc.calcul, false) AS a_calcul
    FROM ratures r LEFT JOIN quiz_questions qc ON qc.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND (r.removed_at IS NOT NULL) = v_anc
      AND (p_source IS NULL OR p_source = ANY (r.sources))
  ),
  tri AS (
    SELECT * FROM base WHERE NOT (v_sc AND a_calcul)
  ),
  carnet AS (
    SELECT * FROM tri WHERE v_anc OR now() >= coalesce(seche_le, last_missed_at + interval '24 hours')
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY last_missed_at, misses DESC, first_missed_at, question_id LIMIT 1
  )
  SELECT json_build_object(
    -- ratures du tri à repasser (en cours et sèches, ou anciennes), celles
    -- pas encore vues, et celles qui sèchent encore
    'carnet', (SELECT count(*) FROM carnet),
    'reste', (SELECT count(*) FROM candidates),
    'sechent', (SELECT count(*) FROM tri) - (SELECT count(*) FROM carnet),
    'vide', NOT EXISTS (SELECT 1 FROM carnet) AND EXISTS (SELECT 1 FROM tri),
    -- le filtre, et les ratures du tri qu'il écarte
    'sans_calcul', v_sc,
    'calcul_masquees', CASE WHEN v_sc THEN (SELECT count(*) FROM base WHERE a_calcul) ELSE 0 END,
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

-- 3. La lecture du carnet (migration_v3_profil.sql §3a) : avec le filtre,
-- les ratures à calcul sortent de la page ET de tous les comptes.
DROP FUNCTION IF EXISTS get_ratures(text, boolean, int, int);
CREATE OR REPLACE FUNCTION get_ratures(p_source text DEFAULT NULL, p_retirees boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0, p_sans_calcul boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ret boolean := coalesce(p_retirees, false);
  v_sc  boolean := coalesce(p_sans_calcul, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH tout AS (
    SELECT r.*, coalesce(qc.calcul, false) AS a_calcul
    FROM ratures r LEFT JOIN quiz_questions qc ON qc.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now()
  ),
  mes AS (
    SELECT * FROM tout WHERE NOT (v_sc AND a_calcul)
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
    'scellees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL AND scellee_le IS NOT NULL),
    'sechent', (SELECT count(*) FROM mes WHERE removed_at IS NULL AND now() < coalesce(seche_le, last_missed_at + interval '24 hours')),
    'filtre', (SELECT count(*) FROM mes WHERE (removed_at IS NOT NULL) = v_ret AND (p_source IS NULL OR p_source = ANY (sources))),
    'sources', coalesce((SELECT json_object_agg(s, n) FROM (SELECT s, count(*) AS n FROM mes, unnest(sources) AS s WHERE (removed_at IS NOT NULL) = v_ret GROUP BY s) x), '{}'::json),
    -- le filtre ; les ratures à calcul qu'il écarte de la vue (temps et source) ; au moins une question classée
    'sans_calcul', v_sc,
    'calcul_masquees', CASE WHEN v_sc THEN (SELECT count(*) FROM tout WHERE a_calcul AND (removed_at IS NOT NULL) = v_ret AND (p_source IS NULL OR p_source = ANY (sources))) ELSE 0 END,
    'calcul_connu', EXISTS (SELECT 1 FROM quiz_questions WHERE calcul IS NOT NULL),
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
      'seche_le', l.seche_le,
      'scellee_le', l.scellee_le,
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

-- 4. Mise au propre d'une notion (migration_v3_profil.sql §3a), sans celles
-- à calcul si p_sans_calcul.
DROP FUNCTION IF EXISTS rature_suivante_notion(text, uuid[]);
CREATE OR REPLACE FUNCTION rature_suivante_notion(p_notion text, p_exclure uuid[] DEFAULT '{}', p_sans_calcul boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sc  boolean := coalesce(p_sans_calcul, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH base AS (
    SELECT r.*, coalesce(q.calcul, false) AS a_calcul FROM ratures r
    JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL
      AND q.notion = p_notion
  ),
  tri AS (
    SELECT * FROM base WHERE NOT (v_sc AND a_calcul)
  ),
  carnet AS (
    SELECT * FROM tri WHERE now() >= coalesce(seche_le, last_missed_at + interval '24 hours')
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY last_missed_at, misses DESC, first_missed_at, question_id LIMIT 1
  )
  SELECT json_build_object(
    -- ratures en cours et sèches de la notion, celles pas encore vues, celles qui sèchent
    'carnet', (SELECT count(*) FROM carnet),
    'reste', (SELECT count(*) FROM candidates),
    'sechent', (SELECT count(*) FROM tri) - (SELECT count(*) FROM carnet),
    'vide', NOT EXISTS (SELECT 1 FROM carnet) AND EXISTS (SELECT 1 FROM tri),
    'sans_calcul', v_sc,
    'calcul_masquees', CASE WHEN v_sc THEN (SELECT count(*) FROM base WHERE a_calcul) ELSE 0 END,
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

-- 5. Le carnet par notion (migration_v3_profil.sql §3a) : avec le filtre,
-- les ratures à calcul sortent de la page, des notions et des comptes.
DROP FUNCTION IF EXISTS ratures_par_notion(text, boolean, int, int);
CREATE OR REPLACE FUNCTION ratures_par_notion(p_notion text DEFAULT NULL, p_retirees boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0, p_sans_calcul boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ret boolean := coalesce(p_retirees, false);
  v_sc  boolean := coalesce(p_sans_calcul, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  -- les réponses en attente (défi rendu, duel clos…) entrent au carnet, comme dans get_ratures
  PERFORM _ratures_rejouer(v_uid);

  WITH tout AS (
    SELECT r.*, coalesce(q.notion, '') AS notion_q, coalesce(q.calcul, false) AS a_calcul
    FROM ratures r LEFT JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now()
  ),
  mes AS (
    SELECT * FROM tout WHERE NOT (v_sc AND a_calcul)
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
    'scellees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL AND scellee_le IS NOT NULL),
    'sechent', (SELECT count(*) FROM mes WHERE removed_at IS NULL AND now() < coalesce(seche_le, last_missed_at + interval '24 hours')),
    'filtre', (SELECT count(*) FROM vue),
    'sources', coalesce((SELECT json_object_agg(s, n) FROM (SELECT s, count(*) AS n FROM mes, unnest(sources) AS s WHERE (removed_at IS NOT NULL) = v_ret GROUP BY s) x), '{}'::json),
    -- le filtre ; les ratures à calcul qu'il écarte de la vue (temps, et notion si elle est ouverte) ; au moins une question classée
    'sans_calcul', v_sc,
    'calcul_masquees', CASE WHEN v_sc THEN (SELECT count(*) FROM tout WHERE a_calcul AND (removed_at IS NOT NULL) = v_ret AND (p_notion IS NULL OR notion_q = p_notion)) ELSE 0 END,
    'calcul_connu', EXISTS (SELECT 1 FROM quiz_questions WHERE calcul IS NOT NULL),
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
      'seche_le', l.seche_le,
      'scellee_le', l.scellee_le,
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

REVOKE ALL ON FUNCTION rature_suivante(text, uuid[], boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_ratures(text, boolean, int, int, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rature_suivante_notion(text, uuid[], boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ratures_par_notion(text, boolean, int, int, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rature_suivante(text, uuid[], boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ratures(text, boolean, int, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION rature_suivante_notion(text, uuid[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION ratures_par_notion(text, boolean, int, int, boolean) TO authenticated;
