-- L'Atelier (points faibles, étape 3) : une séance d'environ 30 minutes sur
-- ses 1 à 3 notions les plus faibles (poids 60/25/15, 70/30 ou 100), en cinq
-- blocs : rappel, ratures, questions neuves, calcul, re-test. L'ordre des
-- questions se décide dans le navigateur (lib/atelier.ts) ; ici, la sécurité
-- et la correction, comme les séries éclair :
-- - atelier_lancer(p_notions) prépare un pool d'environ deux fois les
--   questions nécessaires (ses ratures en cours, vives et anciennes d'abord ;
--   des questions de la notion jamais vues, sinon les moins récentes, avec
--   leur niveau : officielle, angle différent, plus dure) et photographie
--   chaque notion (réussite récente, ratures en cours). Sont écartées les
--   questions des défis du jour (les 30 et les 5), les mocks officiels et les
--   réserves. La bonne réponse ne part jamais avant la réponse.
-- - atelier_repondre : réponse définitive, corrigée ici. Une rature suit la
--   règle de « Mettre au propre » (rature_repondre : juste, rayée) ; une
--   question neuve manquée entre au carnet (source « atelier »), juste elle
--   rapporte l'XP des séries éclair si c'est sa première bonne réponse ; le
--   re-test (une question manquée pendant l'Atelier, reposée) compte une
--   reprise ou une erreur au carnet, sans XP.
-- - Les calculs vivent dans le code (lib/calc) : le site les ajoute au pool
--   et les corrige côté serveur, puis les note ici avec la clé service
--   (atelier_ajouter_calc, atelier_noter_calc : fermées aux joueurs). XP des
--   séries éclair à la première bonne réponse d'un calcul en Atelier.
-- - atelier_clore : bilan (score, XP, ratures en cours après) ; une seconde
--   clôture rend le même bilan. Un Atelier se reprend dans les 24 heures qui
--   suivent la dernière réponse, sinon il se clôt tout seul.
-- - atelier_courant : l'Atelier en cours (reprise), sinon rien.
-- - _reponses_joueur (migration_notions.sql) compte désormais les réponses
--   de l'Atelier (premier passage seulement) : « Tes points faibles » bouge
--   dès la sortie. Recoller migration_notions.sql après celle-ci retire
--   l'Atelier de ce compte : recoller alors celle-ci.
-- Pas d'ELO, pas de classement.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_notions.sql. Idempotent.

DO $$
BEGIN
  IF to_regprocedure('public.rature_suivante_notion(text, uuid[])') IS NULL THEN
    RAISE EXCEPTION 'Colle d''abord migration_notions.sql';
  END IF;
END $$;

-- 1. Les Ateliers. pool : [{i, k: rature|neuve|calc, q, n (notion), v (niveau
--    1 officielle, 2 angle, 3 plus dure), t et m pour un calcul (type, matière)}] ;
--    reponses : [{i, k, q, ok, c (choix) ou x (valeur), at, r (re-test)}] ;
--    avant / apres : par notion.
CREATE TABLE IF NOT EXISTS ateliers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notions     text[]      NOT NULL,
  poids       int[]       NOT NULL,
  pool        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  reponses    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  avant       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  apres       jsonb,
  started_at  timestamptz NOT NULL DEFAULT now(),
  -- dernière réponse : la reprise reste possible 24 heures après
  vu_at       timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  -- temps passé (chrono de la séance, arrêts déduits), en secondes
  secondes    int         NOT NULL DEFAULT 0,
  score       int,
  total       int,
  xp          int
);
CREATE INDEX IF NOT EXISTS ateliers_user_started ON ateliers (user_id, started_at DESC);
-- un seul Atelier en cours par joueur
CREATE UNIQUE INDEX IF NOT EXISTS ateliers_un_en_cours ON ateliers (user_id) WHERE finished_at IS NULL;

ALTER TABLE ateliers ENABLE ROW LEVEL SECURITY;
-- chacun relit les siens (anneau du jour, stats) ; aucune écriture directe :
-- les fonctions écrivent. Le pool ne contient aucune bonne réponse.
DROP POLICY IF EXISTS ateliers_lecture_siens ON ateliers;
CREATE POLICY ateliers_lecture_siens ON ateliers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON ateliers FROM anon, authenticated;

-- 2. L'Atelier vu par le joueur : les questions du pool (sans la bonne
--    réponse tant qu'elles n'ont pas reçu de réponse), ses réponses, l'avant.
--    Les calculs ne portent que leur référence (le site y joint l'énoncé).
CREATE OR REPLACE FUNCTION _atelier_json(p_a ateliers)
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH items AS (
    SELECT p.e AS e, (p.e->>'i')::int AS i, p.e->>'k' AS k
    FROM jsonb_array_elements(p_a.pool) AS p(e)
  ),
  prem AS (
    SELECT (r->>'i')::int AS i, r FROM jsonb_array_elements(p_a.reponses) AS r
    WHERE NOT coalesce((r->>'r')::boolean, false)
  ),
  retest AS (
    SELECT (r->>'i')::int AS i, r FROM jsonb_array_elements(p_a.reponses) AS r
    WHERE coalesce((r->>'r')::boolean, false)
  )
  SELECT json_build_object(
    'id', p_a.id,
    'notions', p_a.notions,
    'poids', p_a.poids,
    'started_at', p_a.started_at,
    'vu_at', p_a.vu_at,
    'finished_at', p_a.finished_at,
    'secondes', p_a.secondes,
    'avant', p_a.avant,
    -- l'ordre des réponses (l'adaptation suit les séries de justes et de fautes)
    'ordre', coalesce((
      SELECT json_agg(json_build_object('i', (r->>'i')::int, 'ok', (r->>'ok')::boolean, 'r', coalesce((r->>'r')::boolean, false)) ORDER BY o)
      FROM jsonb_array_elements(p_a.reponses) WITH ORDINALITY AS t(r, o)
    ), '[]'::json),
    'items', coalesce((
      SELECT json_agg(json_build_object(
        'i', it.i,
        'k', it.k,
        'notion', it.e->>'n',
        'niveau', (it.e->>'v')::int,
        'ref', it.e->>'q',
        'type', it.e->>'t',
        'matiere', it.e->>'m',
        'prompt', CASE WHEN it.k = 'rature' AND rt.question_id IS NOT NULL AND (q.id IS NULL OR q.choices IS DISTINCT FROM rt.choices) THEN rt.prompt ELSE q.prompt END,
        'choices', CASE WHEN it.k = 'rature' AND rt.question_id IS NOT NULL THEN rt.choices ELSE q.choices END,
        'misses', rt.misses,
        'repondu', pr.r IS NOT NULL,
        'juste', (pr.r->>'ok')::boolean,
        'choix', (pr.r->>'c')::int,
        'valeur', (pr.r->>'x')::double precision,
        'retest_juste', (re.r->>'ok')::boolean,
        'retest_choix', (re.r->>'c')::int,
        'retest_valeur', (re.r->>'x')::double precision,
        -- la correction, seulement une fois répondu
        'correct_index', CASE WHEN pr.r IS NOT NULL AND it.k <> 'calc' THEN
          CASE WHEN it.k = 'rature' AND rt.question_id IS NOT NULL AND (q.id IS NULL OR q.choices IS DISTINCT FROM rt.choices) THEN rt.correct_index ELSE q.correct_index END END,
        'explanation', CASE WHEN pr.r IS NOT NULL AND it.k <> 'calc' THEN
          CASE WHEN it.k = 'rature' AND rt.question_id IS NOT NULL AND (q.id IS NULL OR q.choices IS DISTINCT FROM rt.choices) THEN rt.explanation ELSE q.explanation END END
      ) ORDER BY it.i)
      FROM items it
      LEFT JOIN quiz_questions q ON it.k <> 'calc' AND q.id = (CASE WHEN it.k <> 'calc' THEN (it.e->>'q')::uuid END)
      LEFT JOIN ratures rt ON it.k = 'rature' AND rt.user_id = p_a.user_id AND rt.question_id = (CASE WHEN it.k = 'rature' THEN (it.e->>'q')::uuid END)
      LEFT JOIN prem pr ON pr.i = it.i
      LEFT JOIN retest re ON re.i = it.i
    ), '[]'::json)
  );
$$;

-- 3. Clôture (interne) : score et total du premier passage, XP gagné, les
--    ratures en cours après, par notion. Sans aucune réponse, l'Atelier
--    s'efface. Déjà clos : rien ne bouge.
CREATE OR REPLACE FUNCTION _atelier_clore(p_id uuid, p_secondes int)
RETURNS ateliers
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_a     ateliers;
  v_score int;
  v_total int;
  v_xp    int;
  v_apres jsonb;
BEGIN
  SELECT * INTO v_a FROM ateliers WHERE id = p_id FOR UPDATE;
  IF v_a.id IS NULL OR v_a.finished_at IS NOT NULL THEN
    RETURN v_a;
  END IF;

  SELECT count(*) FILTER (WHERE (r->>'ok')::boolean), count(*)
  INTO v_score, v_total
  FROM jsonb_array_elements(v_a.reponses) AS r
  WHERE NOT coalesce((r->>'r')::boolean, false);

  IF v_total = 0 THEN
    DELETE FROM ateliers WHERE id = p_id;
    RETURN NULL;
  END IF;

  SELECT coalesce(sum(xp), 0) INTO v_xp FROM xp_events
  WHERE user_id = v_a.user_id AND source = 'atelier' AND meta->>'atelier_id' = v_a.id::text;

  SELECT coalesce(jsonb_object_agg(n.notion, jsonb_build_object(
           'en_cours', coalesce(c.en_cours, 0),
           'vives', coalesce(c.vives, 0))), '{}'::jsonb)
  INTO v_apres
  FROM unnest(v_a.notions) AS n(notion)
  LEFT JOIN (
    SELECT q.notion,
           count(*) FILTER (WHERE r.removed_at IS NULL)::int AS en_cours,
           count(*) FILTER (WHERE r.removed_at IS NULL AND r.correct_since = 0)::int AS vives
    FROM ratures r JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_a.user_id AND r.visible_from <= now() AND q.notion = ANY (v_a.notions)
    GROUP BY q.notion
  ) c ON c.notion = n.notion;

  UPDATE ateliers
  SET finished_at = now(),
      secondes = greatest(secondes, least(coalesce(p_secondes, secondes), extract(epoch FROM now() - started_at)::int)),
      score = v_score, total = v_total, xp = v_xp, apres = v_apres
  WHERE id = p_id
  RETURNING * INTO v_a;
  RETURN v_a;
END;
$$;

-- Les Ateliers laissés plus de 24 heures sans réponse se closent
CREATE OR REPLACE FUNCTION _atelier_clore_anciens(p_uid uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old uuid;
BEGIN
  FOR v_old IN
    SELECT id FROM ateliers WHERE user_id = p_uid AND finished_at IS NULL AND vu_at < now() - interval '24 hours'
  LOOP
    PERFORM _atelier_clore(v_old, NULL);
  END LOOP;
END;
$$;

-- 4. Lancer un Atelier sur 1 à 3 notions (dans l'ordre des poids). Un
--    Atelier déjà en cours est rendu tel quel (deux onglets : le même).
CREATE OR REPLACE FUNCTION atelier_lancer(p_notions text[])
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_a       ateliers;
  v_notions text[];
  v_poids   int[];
  v_today   date := _daily_today();
  v_exclude uuid[];
  v_avant   jsonb;
  v_pool    jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('atelier:' || v_uid::text));
  PERFORM _ratures_rejouer(v_uid);
  PERFORM _atelier_clore_anciens(v_uid);

  SELECT * INTO v_a FROM ateliers WHERE user_id = v_uid AND finished_at IS NULL;
  IF v_a.id IS NOT NULL THEN
    RETURN _atelier_json(v_a);
  END IF;

  -- les notions, sans doublon, dans l'ordre donné
  SELECT array_agg(x ORDER BY o) INTO v_notions
  FROM (
    SELECT x, min(o) AS o FROM unnest(p_notions) WITH ORDINALITY AS u(x, o)
    WHERE x ~ '^(ethics|quant|economics|corporate|fsa|equity|fixed_income|derivatives|alternatives|portfolio):[1-9][0-9]?$'
    GROUP BY x
  ) s;
  IF coalesce(array_length(v_notions, 1), 0) NOT BETWEEN 1 AND 3 OR array_length(v_notions, 1) <> coalesce(array_length(p_notions, 1), 0) THEN
    RAISE EXCEPTION 'Invalid notions';
  END IF;
  v_poids := CASE array_length(v_notions, 1) WHEN 1 THEN ARRAY[100] WHEN 2 THEN ARRAY[70, 30] ELSE ARRAY[60, 25, 15] END;

  -- les questions des défis du jour (les 30 et les 5) restent hors de l'Atelier
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true);
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', '', true);
  SELECT coalesce(array_agg(DISTINCT q), '{}'::uuid[]) INTO v_exclude
  FROM daily_challenges dc, unnest(dc.question_ids) AS q
  WHERE dc.day = v_today;

  -- l'avant : par notion, les 20 dernières réponses (90 jours) et les ratures en cours
  WITH rep AS (
    SELECT q.notion, r.ok, row_number() OVER (PARTITION BY q.notion ORDER BY r.at DESC) AS rn
    FROM _reponses_joueur(v_uid) r JOIN quiz_questions q ON q.id = r.question_id
    WHERE q.notion = ANY (v_notions) AND r.at > now() - interval '90 days'
  ),
  rec AS (
    SELECT notion, count(*)::int AS n, (count(*) FILTER (WHERE ok))::int AS ok FROM rep WHERE rn <= 20 GROUP BY notion
  ),
  rat AS (
    SELECT q.notion, (count(*))::int AS en_cours, (count(*) FILTER (WHERE r.correct_since = 0))::int AS vives
    FROM ratures r JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL AND q.notion = ANY (v_notions)
    GROUP BY q.notion
  )
  SELECT jsonb_object_agg(n.notion, jsonb_build_object(
           'n', coalesce(rec.n, 0), 'ok', coalesce(rec.ok, 0),
           'en_cours', coalesce(rat.en_cours, 0), 'vives', coalesce(rat.vives, 0)))
  INTO v_avant
  FROM unnest(v_notions) AS n(notion)
  LEFT JOIN rec ON rec.notion = n.notion
  LEFT JOIN rat ON rat.notion = n.notion;

  -- le pool. Chaque candidat a son rang dans sa notion ; on prend les rangs
  -- les plus petits rapportés au poids : la part de chaque notion suit son
  -- poids, et une notion à court laisse sa place aux autres.
  WITH w AS (
    SELECT n.notion, v_poids[n.o]::numeric AS poids
    FROM unnest(v_notions) WITH ORDINALITY AS n(notion, o)
  ),
  -- ratures en cours : les vives d'abord, les plus anciennes d'abord
  rat AS (
    SELECT r.question_id AS q, qq.notion,
           row_number() OVER (PARTITION BY qq.notion ORDER BY (r.correct_since = 0) DESC, r.last_missed_at, r.question_id) AS rn
    FROM ratures r JOIN quiz_questions qq ON qq.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL
      AND qq.notion = ANY (v_notions)
      AND coalesce(array_length(r.choices, 1), 0) BETWEEN 2 AND 5
      AND NOT (r.question_id = ANY (v_exclude))
  ),
  rat_pris AS (
    SELECT rat.q, rat.notion, 1 AS v, row_number() OVER (ORDER BY (rat.rn - 0.5) / w.poids, rat.notion, rat.rn) AS ord
    FROM rat JOIN w ON w.notion = rat.notion
    ORDER BY (rat.rn - 0.5) / w.poids, rat.notion, rat.rn
    LIMIT 16
  ),
  vues AS (
    SELECT question_id, max(at) AS vue_le FROM _reponses_joueur(v_uid) GROUP BY question_id
  ),
  -- questions neuves : de la banque officielle, une seule par énoncé (la
  -- copie d'un drill porte son niveau), jamais vues d'abord, sinon les moins
  -- récentes ; ni au carnet, ni aux défis du jour, ni mock officiel, ni réserve
  neuves AS (
    SELECT DISTINCT ON (qq.notion, md5(qq.prompt))
           qq.id AS q, qq.notion, v.vue_le,
           CASE WHEN qs.title LIKE '% — Drill Fiche Page %' AND qq.position >= 1 THEN ((qq.position - 1) % 3) + 1 ELSE 1 END AS v
    FROM quiz_questions qq
    JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official = true AND qs.official_published = true
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    LEFT JOIN vues v ON v.question_id = qq.id
    WHERE qq.notion = ANY (v_notions)
      AND coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
      AND qq.correct_index >= 0 AND qq.correct_index < coalesce(array_length(qq.choices, 1), 0)
      AND NOT (qq.id = ANY (v_exclude))
      AND lf.name IS DISTINCT FROM 'Mocks Officiels (Système)'
      AND qs.title NOT LIKE 'Réserve — %'
      AND NOT EXISTS (SELECT 1 FROM ratures r WHERE r.user_id = v_uid AND r.question_id = qq.id)
    ORDER BY qq.notion, md5(qq.prompt), (v.vue_le IS NOT NULL), v.vue_le, (qs.title LIKE '% — Drill Fiche Page %') DESC, qq.id
  ),
  neuves_rang AS (
    SELECT neuves.*, row_number() OVER (PARTITION BY neuves.notion ORDER BY (neuves.vue_le IS NOT NULL), neuves.vue_le, random()) AS rn
    FROM neuves
  ),
  neuves_pris AS (
    SELECT nr.q, nr.notion, nr.v, row_number() OVER (ORDER BY (nr.rn - 0.5) / w.poids, nr.notion, nr.rn) AS ord
    FROM neuves_rang nr JOIN w ON w.notion = nr.notion
    ORDER BY (nr.rn - 0.5) / w.poids, nr.notion, nr.rn
    LIMIT 24
  ),
  tout AS (
    SELECT 'rature' AS k, q, notion, v, ord AS o FROM rat_pris
    UNION ALL
    SELECT 'neuve', q, notion, v, 1000 + ord FROM neuves_pris
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('i', x.i, 'k', x.k, 'q', x.q, 'n', x.notion, 'v', x.v) ORDER BY x.i), '[]'::jsonb)
  INTO v_pool
  FROM (SELECT tout.*, (row_number() OVER (ORDER BY tout.o) - 1)::int AS i FROM tout) x;

  IF jsonb_array_length(v_pool) = 0 THEN
    RETURN json_build_object('id', NULL, 'reason', 'vide');
  END IF;

  INSERT INTO ateliers (user_id, notions, poids, pool, avant)
  VALUES (v_uid, v_notions, v_poids, v_pool, coalesce(v_avant, '{}'::jsonb))
  RETURNING * INTO v_a;
  RETURN _atelier_json(v_a);
END;
$$;

-- 5. L'Atelier en cours (reprise), après avoir clos ceux de plus de 24 heures
CREATE OR REPLACE FUNCTION atelier_courant()
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_a   ateliers;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _atelier_clore_anciens(v_uid);
  SELECT * INTO v_a FROM ateliers WHERE user_id = v_uid AND finished_at IS NULL;
  IF v_a.id IS NULL THEN
    RETURN json_build_object('id', NULL);
  END IF;
  RETURN _atelier_json(v_a);
END;
$$;

-- Le chrono de la séance : jamais plus que le temps écoulé depuis le lancement
CREATE OR REPLACE FUNCTION _atelier_secondes(p_a ateliers, p_secondes int)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT greatest(p_a.secondes, least(coalesce(p_secondes, p_a.secondes), extract(epoch FROM now() - p_a.started_at)::int));
$$;

-- 6. Répondre à une question de l'Atelier (rature ou neuve), au premier
--    passage ou au re-test (seulement une question manquée au premier
--    passage). Réponse définitive : une seconde réponse rend la même
--    correction sans rien changer.
CREATE OR REPLACE FUNCTION atelier_repondre(p_id uuid, p_i int, p_choix int, p_retest boolean DEFAULT false, p_secondes int DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_ret    boolean := coalesce(p_retest, false);
  v_a      ateliers;
  v_item   jsonb;
  v_k      text;
  v_qid    uuid;
  v_q      quiz_questions;
  v_r      ratures;
  v_prem   jsonb;
  v_deja   jsonb;
  v_choix  text[];
  v_bon    int;
  v_expl   text;
  v_ok     boolean;
  v_statut text;
  v_xp     int := 0;
  v_diff   int;
  v_topic  text;
  v_rr     json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_a FROM ateliers WHERE id = p_id AND user_id = v_uid FOR UPDATE;
  IF v_a.id IS NULL THEN
    RAISE EXCEPTION 'Atelier not found';
  END IF;
  IF p_i IS NULL OR p_i < 0 OR p_i >= jsonb_array_length(v_a.pool) THEN
    RAISE EXCEPTION 'Invalid item';
  END IF;
  v_item := v_a.pool -> p_i;
  v_k := v_item->>'k';
  IF v_k NOT IN ('rature', 'neuve') THEN
    RAISE EXCEPTION 'Invalid item';
  END IF;
  v_qid := (v_item->>'q')::uuid;

  SELECT r INTO v_prem FROM jsonb_array_elements(v_a.reponses) AS r
  WHERE (r->>'i')::int = p_i AND NOT coalesce((r->>'r')::boolean, false) LIMIT 1;
  SELECT r INTO v_deja FROM jsonb_array_elements(v_a.reponses) AS r
  WHERE (r->>'i')::int = p_i AND coalesce((r->>'r')::boolean, false) = v_ret LIMIT 1;

  -- la question telle que le joueur l'a vue : pour une rature, la copie du
  -- carnet si les choix ont bougé depuis (comme rature_repondre)
  SELECT * INTO v_q FROM quiz_questions WHERE id = v_qid;
  IF v_k = 'rature' THEN
    SELECT * INTO v_r FROM ratures WHERE user_id = v_uid AND question_id = v_qid;
  END IF;
  IF v_r.question_id IS NOT NULL AND (v_q.id IS NULL OR v_q.choices IS DISTINCT FROM v_r.choices) THEN
    v_choix := v_r.choices;
    v_bon := v_r.correct_index;
    v_expl := v_r.explanation;
  ELSIF v_q.id IS NOT NULL THEN
    v_choix := v_q.choices;
    v_bon := v_q.correct_index;
    v_expl := v_q.explanation;
  ELSE
    RAISE EXCEPTION 'Question not found';
  END IF;

  -- déjà répondu : la même correction, rien ne bouge
  IF v_deja IS NOT NULL THEN
    RETURN json_build_object('i', p_i, 'retest', v_ret, 'is_correct', (v_deja->>'ok')::boolean, 'selected_index', (v_deja->>'c')::int,
                             'correct_index', v_bon, 'explanation', v_expl, 'statut', v_deja->>'s', 'xp', 0);
  END IF;
  -- clos, ou laissé plus de 24 heures : il se clôt, la réponse n'est pas prise
  IF v_a.finished_at IS NOT NULL OR v_a.vu_at < now() - interval '24 hours' THEN
    PERFORM _atelier_clore(v_a.id, NULL);
    RETURN json_build_object('i', p_i, 'ferme', true);
  END IF;
  IF v_ret AND (v_prem IS NULL OR (v_prem->>'ok')::boolean) THEN
    RAISE EXCEPTION 'Nothing to retest';
  END IF;
  IF NOT v_ret AND v_prem IS NOT NULL THEN
    RAISE EXCEPTION 'Already answered';
  END IF;
  IF p_choix IS NULL OR p_choix < 0 OR p_choix >= coalesce(array_length(v_choix, 1), 0) THEN
    RAISE EXCEPTION 'Invalid choice';
  END IF;
  v_ok := p_choix = v_bon;

  IF v_ret THEN
    -- re-test : une reprise de plus (juste) ou une erreur de plus (faux), sans XP
    PERFORM _rature_note(v_uid, v_qid, 'atelier', v_ok, p_choix, now(), now());
    v_statut := CASE WHEN v_ok THEN 'reprise' ELSE 'reste' END;
  ELSIF v_k = 'rature' AND v_r.question_id IS NOT NULL THEN
    -- la règle de « Mettre au propre » : juste, rayée ; faux, elle reste
    v_rr := rature_repondre(v_qid, p_choix);
    v_statut := v_rr->>'statut';
  ELSE
    -- question neuve : manquée, elle entre au carnet ; juste, XP de la
    -- première bonne réponse (comme les séries éclair)
    PERFORM _rature_note(v_uid, v_qid, 'atelier', v_ok, p_choix, now(), now());
    v_statut := CASE WHEN v_ok THEN 'juste' ELSE 'nouvelle' END;
    IF v_ok AND v_k = 'neuve' AND v_q.id IS NOT NULL THEN
      INSERT INTO quiz_question_progress (user_id, question_id) VALUES (v_uid, v_qid) ON CONFLICT DO NOTHING;
      IF FOUND THEN
        SELECT qs.difficulty, lf.name INTO v_diff, v_topic
        FROM quiz_sets qs LEFT JOIN library_folders lf ON lf.id = qs.folder_id WHERE qs.id = v_q.set_id;
        v_xp := CASE coalesce(v_diff, 1) WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END;
        INSERT INTO xp_events (user_id, xp, source, meta)
        VALUES (v_uid, v_xp, 'atelier', jsonb_build_object('question_id', v_qid, 'topic', v_topic, 'atelier_id', v_a.id));
        UPDATE profiles SET xp_total = xp_total + v_xp WHERE id = v_uid;
      END IF;
    END IF;
  END IF;

  UPDATE ateliers
  SET reponses = reponses || jsonb_build_array(jsonb_build_object(
        'i', p_i, 'k', v_k, 'q', v_qid, 'ok', v_ok, 'c', p_choix, 'at', now(), 'r', v_ret, 's', v_statut)),
      vu_at = now(),
      secondes = _atelier_secondes(v_a, p_secondes)
  WHERE id = v_a.id;

  RETURN json_build_object('i', p_i, 'retest', v_ret, 'is_correct', v_ok, 'selected_index', p_choix,
                           'correct_index', v_bon, 'explanation', v_expl, 'statut', v_statut, 'xp', v_xp);
END;
$$;

-- 7. Les calculs (clé service seulement : le site tire et corrige les
--    calculs de lib/calc côté serveur). Ajout au pool, une seule fois par
--    Atelier, et la réussite récente en calcul de chaque notion.
CREATE OR REPLACE FUNCTION atelier_ajouter_calc(p_uid uuid, p_id uuid, p_items jsonb, p_avant jsonb DEFAULT '{}'::jsonb)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_a     ateliers;
  v_n     int;
  v_add   jsonb;
  v_avant jsonb;
BEGIN
  SELECT * INTO v_a FROM ateliers WHERE id = p_id AND user_id = p_uid FOR UPDATE;
  IF v_a.id IS NULL THEN
    RAISE EXCEPTION 'Atelier not found';
  END IF;
  IF v_a.finished_at IS NOT NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_a.pool) e WHERE e->>'k' = 'calc') THEN
    RETURN _atelier_json(v_a);
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Invalid items';
  END IF;
  v_n := jsonb_array_length(v_a.pool);

  SELECT coalesce(jsonb_agg(jsonb_build_object('i', v_n + x.o - 1, 'k', 'calc', 'q', x.e->>'q', 'n', x.e->>'n', 'v', (x.e->>'v')::int, 't', x.e->>'t', 'm', x.e->>'m') ORDER BY x.o), '[]'::jsonb)
  INTO v_add
  FROM (SELECT e, o FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(e, o) LIMIT 18) x
  WHERE jsonb_typeof(x.e) = 'object'
    AND x.e->>'q' ~ '^[a-z0-9-]{1,60}$'
    AND x.e->>'t' ~ '^[a-z0-9-]{1,60}$'
    AND x.e->>'m' IN ('ethics', 'quant', 'economics', 'corporate', 'fsa', 'equity', 'fixed_income', 'derivatives', 'alternatives', 'portfolio')
    AND x.e->>'n' = ANY (v_a.notions)
    AND x.e->>'v' IN ('1', '2', '3');
  IF jsonb_array_length(v_add) <> least(jsonb_array_length(p_items), 18) THEN
    RAISE EXCEPTION 'Invalid items';
  END IF;
  -- les indices suivent ceux du pool, sans trou
  SELECT coalesce(jsonb_agg(jsonb_set(e, '{i}', to_jsonb(v_n + o - 1)) ORDER BY o), '[]'::jsonb) INTO v_add
  FROM jsonb_array_elements(v_add) WITH ORDINALITY AS t(e, o);

  -- la réussite récente en calcul, par notion (bornée)
  v_avant := v_a.avant;
  IF p_avant IS NOT NULL AND jsonb_typeof(p_avant) = 'object' THEN
    SELECT v_avant || coalesce(jsonb_object_agg(k, coalesce(v_avant->k, '{}'::jsonb) || jsonb_build_object('calc', jsonb_build_object(
             'n', least(greatest(coalesce((val->>'n')::int, 0), 0), 1000),
             'ok', least(greatest(coalesce((val->>'ok')::int, 0), 0), least(greatest(coalesce((val->>'n')::int, 0), 0), 1000))))), '{}'::jsonb)
    INTO v_avant
    FROM jsonb_each(p_avant) AS t(k, val)
    WHERE k = ANY (v_a.notions) AND jsonb_typeof(val) = 'object'
      AND coalesce(val->>'n', '0') ~ '^[0-9]{1,4}$' AND coalesce(val->>'ok', '0') ~ '^[0-9]{1,4}$';
  END IF;

  UPDATE ateliers SET pool = pool || v_add, avant = v_avant WHERE id = p_id RETURNING * INTO v_a;
  RETURN _atelier_json(v_a);
END;
$$;

-- Noter un calcul corrigé par le site. XP des séries éclair (10, 15, 20
-- selon le niveau) à la première bonne réponse de ce calcul en Atelier.
CREATE OR REPLACE FUNCTION atelier_noter_calc(p_uid uuid, p_id uuid, p_i int, p_ok boolean, p_valeur double precision, p_retest boolean DEFAULT false, p_secondes int DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ret  boolean := coalesce(p_retest, false);
  v_a    ateliers;
  v_item jsonb;
  v_prem jsonb;
  v_deja jsonb;
  v_xp   int := 0;
BEGIN
  SELECT * INTO v_a FROM ateliers WHERE id = p_id AND user_id = p_uid FOR UPDATE;
  IF v_a.id IS NULL THEN
    RAISE EXCEPTION 'Atelier not found';
  END IF;
  IF p_i IS NULL OR p_i < 0 OR p_i >= jsonb_array_length(v_a.pool) OR v_a.pool->p_i->>'k' <> 'calc' OR p_ok IS NULL THEN
    RAISE EXCEPTION 'Invalid item';
  END IF;
  v_item := v_a.pool -> p_i;
  SELECT r INTO v_prem FROM jsonb_array_elements(v_a.reponses) AS r
  WHERE (r->>'i')::int = p_i AND NOT coalesce((r->>'r')::boolean, false) LIMIT 1;
  SELECT r INTO v_deja FROM jsonb_array_elements(v_a.reponses) AS r
  WHERE (r->>'i')::int = p_i AND coalesce((r->>'r')::boolean, false) = v_ret LIMIT 1;
  IF v_deja IS NOT NULL THEN
    RETURN json_build_object('i', p_i, 'retest', v_ret, 'is_correct', (v_deja->>'ok')::boolean, 'xp', 0);
  END IF;
  IF v_a.finished_at IS NOT NULL OR v_a.vu_at < now() - interval '24 hours' THEN
    PERFORM _atelier_clore(v_a.id, NULL);
    RETURN json_build_object('i', p_i, 'ferme', true);
  END IF;
  IF v_ret AND (v_prem IS NULL OR (v_prem->>'ok')::boolean) THEN
    RAISE EXCEPTION 'Nothing to retest';
  END IF;

  IF p_ok AND NOT v_ret AND NOT EXISTS (
    SELECT 1 FROM xp_events WHERE user_id = p_uid AND source = 'atelier' AND meta->>'calc' = v_item->>'q'
  ) THEN
    v_xp := CASE (v_item->>'v')::int WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END;
    INSERT INTO xp_events (user_id, xp, source, meta)
    VALUES (p_uid, v_xp, 'atelier', jsonb_build_object('calc', v_item->>'q', 'type', v_item->>'t', 'topic', v_item->>'m', 'atelier_id', v_a.id));
    UPDATE profiles SET xp_total = xp_total + v_xp WHERE id = p_uid;
  END IF;

  UPDATE ateliers
  SET reponses = reponses || jsonb_build_array(jsonb_build_object(
        'i', p_i, 'k', 'calc', 'q', v_item->>'q', 'ok', p_ok, 'x', p_valeur, 'at', now(), 'r', v_ret)),
      vu_at = now(),
      secondes = _atelier_secondes(v_a, p_secondes)
  WHERE id = v_a.id;
  RETURN json_build_object('i', p_i, 'retest', v_ret, 'is_correct', p_ok, 'xp', v_xp);
END;
$$;

-- 8. Clore : le bilan (score et total du premier passage, XP, ratures en
--    cours après, par notion). Une seconde clôture rend le même bilan.
CREATE OR REPLACE FUNCTION atelier_clore(p_id uuid, p_secondes int DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_a   ateliers;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ateliers WHERE id = p_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Atelier not found';
  END IF;
  v_a := _atelier_clore(p_id, p_secondes);
  IF v_a.id IS NULL THEN
    RETURN json_build_object('id', NULL, 'score', 0, 'total', 0, 'xp', 0, 'secondes', 0);
  END IF;
  RETURN json_build_object('id', v_a.id, 'score', v_a.score, 'total', v_a.total, 'xp', v_a.xp, 'secondes', v_a.secondes,
                           'apres', v_a.apres, 'finished_at', v_a.finished_at);
END;
$$;

-- 9. Les réponses d'un joueur (migration_notions.sql), réponses de l'Atelier
--    comprises : premier passage des ratures et des questions neuves (le
--    re-test suit une correction toute fraîche ; les calculs sont déjà dans
--    calc_attempts). Le reste est inchangé.
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
  SELECT (x->>'q')::uuid, 'atelier', (x->>'ok')::boolean, (x->>'at')::timestamptz
  FROM ateliers a CROSS JOIN LATERAL jsonb_array_elements(a.reponses) AS x
  WHERE a.user_id = p_uid AND x->>'k' IN ('rature', 'neuve') AND NOT coalesce((x->>'r')::boolean, false);
$$;

-- 10. Droits
REVOKE ALL ON FUNCTION _atelier_json(ateliers) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _atelier_clore(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _atelier_clore_anciens(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _atelier_secondes(ateliers, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _reponses_joueur(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION atelier_lancer(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION atelier_courant() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION atelier_repondre(uuid, int, int, boolean, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION atelier_clore(uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION atelier_ajouter_calc(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION atelier_noter_calc(uuid, uuid, int, boolean, double precision, boolean, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION atelier_lancer(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION atelier_courant() TO authenticated;
GRANT EXECUTE ON FUNCTION atelier_repondre(uuid, int, int, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION atelier_clore(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION atelier_ajouter_calc(uuid, uuid, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION atelier_noter_calc(uuid, uuid, int, boolean, double precision, boolean, int) TO service_role;
