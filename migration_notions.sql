-- Les notions des questions (points faibles, étape 2) : chaque question de
-- QCM porte la notion qu'elle travaille (un Learning Module du programme,
-- « fixed_income:11 », voir lib/notions.ts) et, quand on le connaît, son
-- concept (le libellé d'un des 5 concepts d'une page de fiche, ou le
-- standard d'Ethics : « Duration gap = Macaulay duration − horizon »,
-- « Standards III(A) et III(B) »). Une question sans notion reste comptée
-- dans sa matière (examens blancs, séries des joueurs).
-- Les deux colonnes se lisent comme le reste de la question (mêmes règles
-- RLS) ; un joueur ne peut pas les écrire, même sur ses propres séries :
-- seuls la clé service (scripts/notions/synchroniser.mjs, les seeds) et le
-- SQL Editor les posent.
-- L'éditeur de séries écrit avec le rôle authenticated : un import JSON dans
-- une série officielle (effacer puis réinsérer) laisse notion et concept
-- vides, un énoncé modifié garde l'ancienne notion. Après une telle retouche,
-- relancer « node scripts/notions/synchroniser.mjs --ecrire » (CONTEXT.md).
-- Le remplissage vient ensuite : le fichier généré par
-- « node scripts/notions/synchroniser.mjs --sql <fichier> » (à coller après
-- celle-ci) ou « node scripts/notions/synchroniser.mjs --ecrire ».
-- « Tes points faibles » par notion (étape 2), en lecture seule :
-- - points_faibles(p_jours) : pour le joueur connecté, par notion, ses
--   dernières réponses (20 au plus, sur p_jours jours), ses réponses par
--   source, ses ratures (en cours, vives, anciennes, rayées cette semaine),
--   la dernière activité et les concepts qui coincent ; plus « remplie »
--   (au moins une question porte une notion : sinon le site garde les
--   thèmes de l'étape 1) et les ratures rayées cette semaine dans tout le
--   carnet. Une question sans notion reste comptée dans sa matière.
-- - rature_suivante_notion(p_notion, p_exclure) : « Mettre au propre »
--   limité aux ratures en cours d'une notion. Fonction à part, comme
--   rature_suivante_theme : rien de ce qui est déjà collé ne change.
-- - _reponses_joueur(p_uid) : les réponses d'un joueur, toutes sources, dont
--   la justesse est déjà visible (la même union que migration_ratures.sql §6),
--   plus celles de l'Atelier (_reponses_atelier, vide ici, remplie par
--   migration_atelier.sql). Internes.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_ratures_reprise.sql et migration_points_faibles.sql. Idempotent.

DO $$
BEGIN
  IF to_regprocedure('public.rature_suivante_theme(uuid[], uuid[])') IS NULL THEN
    RAISE EXCEPTION 'Colle d''abord migration_points_faibles.sql';
  END IF;
END $$;

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS notion text;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS concept text;

-- notion : « <clé de matière>:<n° du LM> » ; concept : un libellé court
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_notion_forme') THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_notion_forme
      CHECK (notion IS NULL OR notion ~ '^(ethics|quant|economics|corporate|fsa|equity|fixed_income|derivatives|alternatives|portfolio):[1-9][0-9]?$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_concept_forme') THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_concept_forme
      CHECK (concept IS NULL OR char_length(concept) BETWEEN 1 AND 200);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS quiz_questions_notion_idx ON quiz_questions (notion) WHERE notion IS NOT NULL;

-- Un joueur (rôles authenticated et anon) n'écrit ni la notion ni le concept :
-- à l'insertion elles restent vides, à la mise à jour elles gardent leur valeur.
CREATE OR REPLACE FUNCTION _quiz_questions_notion_gardee()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.notion := NULL;
      NEW.concept := NULL;
    ELSE
      NEW.notion := OLD.notion;
      NEW.concept := OLD.concept;
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION _quiz_questions_notion_gardee() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_questions_notion_gardee ON quiz_questions;
CREATE TRIGGER quiz_questions_notion_gardee
  BEFORE INSERT OR UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION _quiz_questions_notion_gardee();

-- Les réponses de l'Atelier : rien ici. migration_atelier.sql la remplace
-- (premier passage de ses questions) ; recoller celle-ci ensuite ne la
-- touche pas : elle n'est créée que si elle manque.
DO $do$
BEGIN
  IF to_regprocedure('public._reponses_atelier(uuid)') IS NULL THEN
    CREATE FUNCTION _reponses_atelier(p_uid uuid)
    RETURNS TABLE (question_id uuid, source text, ok boolean, at timestamptz)
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
    AS $f$ SELECT NULL::uuid, NULL::text, NULL::boolean, NULL::timestamptz WHERE false $f$;
  END IF;
END $do$;

-- Les réponses données par un joueur (les blancs ne comptent pas), avec leur
-- source au sens de lib/answer-stats.ts : fiches, défis du jour et 5 du
-- jour (copie rendue ou chrono écoulé), duels clos, séries éclair (corrigées
-- question par question), sessions ciblées, examens blancs, QCM en entier,
-- et l'Atelier (_reponses_atelier). Une réponse dont la justesse est encore
-- cachée (défi en cours, duel ouvert) n'en fait pas partie.
CREATE OR REPLACE FUNCTION _reponses_joueur(p_uid uuid)
RETURNS TABLE (question_id uuid, source text, ok boolean, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH copies AS (
    SELECT x AS e, 'practice'::text AS src, r.completed_at AS at
    FROM practice_session_results r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.answers) = 'array' THEN r.answers ELSE '[]'::jsonb END) AS x
    WHERE r.user_id = p_uid
    UNION ALL
    SELECT x, 'mock', r.completed_at
    FROM mock_exam_results r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.answers) = 'array' THEN r.answers ELSE '[]'::jsonb END) AS x
    WHERE r.user_id = p_uid
    UNION ALL
    SELECT x, 'qcm', r.created_at
    FROM quiz_attempts r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.answers) = 'array' THEN r.answers ELSE '[]'::jsonb END) AS x
    WHERE r.user_id = p_uid
  ),
  copies_lues AS (
    SELECT src, at,
           CASE WHEN jsonb_typeof(e) = 'object' AND e->>'question_id' ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' THEN (e->>'question_id')::uuid END AS qid,
           CASE WHEN jsonb_typeof(e) = 'object' AND e->>'selected_index' ~ '^[0-9]{1,3}$' THEN (e->>'selected_index')::int END AS sel
    FROM copies
  ),
  defis AS (
    SELECT t.challenge_id,
           coalesce(t.finished_at, t.started_at + make_interval(secs => coalesce(c.time_limit_seconds, 2700) + 20)) AS cloture
    FROM daily_attempts t JOIN daily_challenges c ON c.id = t.challenge_id
    WHERE t.user_id = p_uid
  ),
  duels_joues AS (
    SELECT d.id,
           CASE WHEN d.status IN ('finished', 'declined', 'expired') THEN coalesce(d.finished_at, now())
                ELSE greatest(d.expires_at, coalesce(j.started_at, now()) + make_interval(secs => coalesce(d.time_limit_seconds, 2700) + 20)) END AS cloture
    FROM duels d
    CROSS JOIN LATERAL (VALUES (d.challenger_id, d.challenger_started_at), (d.opponent_id, d.opponent_started_at)) AS j(user_id, started_at)
    WHERE j.user_id = p_uid
  )
  SELECT l.question_id, 'fiche'::text, l.is_correct, least(l.answered_at, now())
  FROM quiz_answer_log l
  WHERE l.user_id = p_uid
  UNION ALL
  SELECT a.question_id, 'daily', a.is_correct, a.answered_at
  FROM daily_answers a JOIN defis d ON d.challenge_id = a.challenge_id
  WHERE a.user_id = p_uid AND a.selected_index IS NOT NULL AND a.question_id IS NOT NULL AND a.is_correct IS NOT NULL AND d.cloture <= now()
  UNION ALL
  SELECT a.question_id, 'duel', a.is_correct, a.answered_at
  FROM duel_answers a JOIN duels_joues j ON j.id = a.duel_id
  WHERE a.user_id = p_uid AND a.selected_index IS NOT NULL AND a.is_correct IS NOT NULL AND j.cloture <= now()
  UNION ALL
  SELECT t.qid, 'eclair', e.answers[t.pos] = qq.correct_index, coalesce(e.finished_at, e.started_at)
  FROM eclair_series e
  CROSS JOIN LATERAL unnest(e.question_ids) WITH ORDINALITY AS t(qid, pos)
  JOIN quiz_questions qq ON qq.id = t.qid
  WHERE e.user_id = p_uid AND e.answers[t.pos] IS NOT NULL
  UNION ALL
  SELECT c.qid, c.src, c.sel = qq.correct_index, c.at
  FROM copies_lues c JOIN quiz_questions qq ON qq.id = c.qid
  WHERE c.qid IS NOT NULL AND c.sel IS NOT NULL AND c.at IS NOT NULL AND c.sel < coalesce(array_length(qq.choices, 1), 0)
  UNION ALL
  SELECT * FROM _reponses_atelier(p_uid);
$$;

-- Les points faibles du joueur connecté, par notion (lib/notions.ts fait le
-- reste : libellés, liens, calculs). Réponse :
-- { remplie, rayees_semaine, notions: [{ notion, recentes: [[date, juste]…]
--   (les plus récentes d'abord), sources: { fiche: 12, … }, en_cours, vives,
--   anciennes, rayees_7j, derniere, concepts: [{ concept, ratures, erreurs }…] }] }
-- Un concept coince par ses ratures en cours, puis par ses réponses fausses
-- des p_jours derniers jours (5 au plus par notion, les plus chargés d'abord).
CREATE OR REPLACE FUNCTION points_faibles(p_jours int DEFAULT 90)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_depuis timestamptz := now() - make_interval(days => least(greatest(coalesce(p_jours, 90), 1), 365));
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- les réponses en attente dont l'embargo est levé, comme get_ratures
  PERFORM _ratures_rejouer(v_uid);

  WITH rep AS (
    SELECT q.notion, q.concept, r.source, r.ok, r.at
    FROM _reponses_joueur(v_uid) r JOIN quiz_questions q ON q.id = r.question_id
    WHERE q.notion IS NOT NULL
  ),
  recentes AS (
    SELECT x.notion, json_agg(json_build_array(x.at, x.ok) ORDER BY x.at DESC) AS liste
    FROM (
      SELECT rep.notion, rep.at, rep.ok, row_number() OVER (PARTITION BY rep.notion ORDER BY rep.at DESC) AS i
      FROM rep WHERE rep.at > v_depuis
    ) x
    WHERE x.i <= 20
    GROUP BY x.notion
  ),
  par_source AS (
    SELECT s.notion, json_object_agg(s.source, s.n) AS sources, max(s.derniere) AS derniere
    FROM (SELECT rep.notion, rep.source, count(*) AS n, max(rep.at) AS derniere FROM rep GROUP BY rep.notion, rep.source) s
    GROUP BY s.notion
  ),
  rat AS (
    SELECT q.notion, q.concept, r.removed_at, r.correct_since,
           greatest(r.last_missed_at, r.last_correct_at, r.removed_at) AS vu
    FROM ratures r JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND q.notion IS NOT NULL
  ),
  rat_notion AS (
    SELECT rat.notion,
           count(*) FILTER (WHERE rat.removed_at IS NULL) AS en_cours,
           count(*) FILTER (WHERE rat.removed_at IS NULL AND rat.correct_since = 0) AS vives,
           count(*) FILTER (WHERE rat.removed_at IS NOT NULL) AS anciennes,
           count(*) FILTER (WHERE rat.removed_at > now() - interval '7 days') AS rayees_7j,
           max(rat.vu) AS derniere
    FROM rat GROUP BY rat.notion
  ),
  concepts AS (
    SELECT c.notion, c.concept, sum(c.ratures)::int AS ratures, sum(c.erreurs)::int AS erreurs,
           row_number() OVER (PARTITION BY c.notion ORDER BY sum(c.ratures) DESC, sum(c.erreurs) DESC, c.concept) AS i
    FROM (
      SELECT rat.notion, rat.concept, 1 AS ratures, 0 AS erreurs FROM rat WHERE rat.concept IS NOT NULL AND rat.removed_at IS NULL
      UNION ALL
      SELECT rep.notion, rep.concept, 0, 1 FROM rep WHERE rep.concept IS NOT NULL AND NOT rep.ok AND rep.at > v_depuis
    ) c
    GROUP BY c.notion, c.concept
  ),
  par_concept AS (
    SELECT concepts.notion, json_agg(json_build_object('concept', concepts.concept, 'ratures', concepts.ratures, 'erreurs', concepts.erreurs) ORDER BY concepts.i) AS liste
    FROM concepts WHERE concepts.i <= 5
    GROUP BY concepts.notion
  ),
  toutes AS (
    SELECT par_source.notion FROM par_source UNION SELECT rat_notion.notion FROM rat_notion
  )
  SELECT json_build_object(
    'remplie', EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_questions.notion IS NOT NULL),
    -- tout le carnet, questions sans notion comprises (le même compte que Moi › Erreurs)
    'rayees_semaine', (SELECT count(*) FROM ratures r WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at > now() - interval '7 days'),
    'notions', coalesce((
      SELECT json_agg(json_build_object(
        'notion', t.notion,
        'recentes', coalesce(rc.liste, '[]'::json),
        'sources', coalesce(ps.sources, '{}'::json),
        'en_cours', coalesce(rn.en_cours, 0),
        'vives', coalesce(rn.vives, 0),
        'anciennes', coalesce(rn.anciennes, 0),
        'rayees_7j', coalesce(rn.rayees_7j, 0),
        'derniere', greatest(ps.derniere, rn.derniere),
        'concepts', coalesce(pc.liste, '[]'::json)
      ) ORDER BY t.notion)
      FROM toutes t
      LEFT JOIN recentes rc ON rc.notion = t.notion
      LEFT JOIN par_source ps ON ps.notion = t.notion
      LEFT JOIN rat_notion rn ON rn.notion = t.notion
      LEFT JOIN par_concept pc ON pc.notion = t.notion
    ), '[]'::json)
  ) INTO v_res;
  RETURN v_res;
END;
$$;

-- La prochaine rature en cours d'une notion, au hasard, hors celles déjà vues
-- pendant ce tour (même réponse que rature_suivante_theme)
CREATE OR REPLACE FUNCTION rature_suivante_notion(p_notion text, p_exclure uuid[] DEFAULT '{}')
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
      AND q.notion = p_notion
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY random() LIMIT 1
  )
  SELECT json_build_object(
    -- ratures en cours de la notion, et celles pas encore vues
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

REVOKE ALL ON FUNCTION _reponses_atelier(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _reponses_joueur(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION points_faibles(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rature_suivante_notion(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION points_faibles(int) TO authenticated;
GRANT EXECUTE ON FUNCTION rature_suivante_notion(text, uuid[]) TO authenticated;
