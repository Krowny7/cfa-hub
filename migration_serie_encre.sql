-- La série d'encre : un bonus d'XP pour les jours d'affilée.
--
-- RÈGLES
-- - Un JOUR compte dans la série quand le joueur a répondu à 10 questions au
--   moins ce jour-là (jour civil de Paris, Europe/Paris), toutes sources
--   confondues : on compte comme l'anneau de l'Accueil (loadActivity dans
--   components/accueil/queries.ts) : fiches, QCM, sessions, examens blancs,
--   duels réglés, défi du jour et 5 du jour (copies rendues), séries éclair,
--   Atelier. Les calculs purs (calc_attempts) n'y sont pas, comme dans l'anneau.
-- - Paliers (série à la veille du jour) : 0 à 2 jours -> x1 ; 3 à 6 jours ->
--   x1,5 ; 7 jours et plus -> x2 (plafond). Le multiplicateur du jour dépend de
--   la série jusqu'à HIER : il s'applique dès la première question du jour.
-- - Un JOKER par semaine (lundi-dimanche, heure de Paris) : un jour manqué ne
--   casse pas la série, il n'y compte pas non plus (le joker est consommé tout
--   seul). Deux jours manqués d'affilée, ou un second jour manqué dans la même
--   semaine, cassent la série. Un jour manqué sans série en cours ne consomme
--   rien.
-- - Le bonus ne touche QUE l'XP (jamais l'ELO), et seulement l'XP des bonnes
--   réponses : sources quiz_question, exercise_question, practice_session,
--   atelier, eclair (une source nouvelle n'a pas de bonus tant qu'on ne l'ajoute
--   pas à _xp_events_serie_bonus).
-- - Meilleure série : conservée dans serie_encre.meilleure.
--
-- COMMENT (côté base, rien à tricher côté navigateur)
-- - Un trigger AFTER INSERT (une fois par requête) sur xp_events multiplie
--   l'XP des lignes qui viennent d'être écrites. La somme de la requête est
--   arrondie une seule fois (0,5 vers le haut) puis répartie sur les lignes :
--   xp_events.xp devient l'XP réelle, xp_base garde l'XP d'origine et
--   multiplicateur le palier appliqué (NULL : pas de bonus, x1). Le complément
--   est ajouté à profiles.xp_total par le même trigger : les fonctions déjà
--   collées (award_quiz_question_xp, award_exercise_xp, submit_practice_session,
--   Atelier, séries éclair) n'ont pas à changer, elles ajoutent l'XP de base
--   et le trigger y ajoute le bonus. Elles renvoient donc encore l'XP de base
--   (sauf celles qui relisent xp_events : fin de série éclair, Atelier) ; le
--   site applique le palier à l'affichage.
-- - serie_encre garde, par joueur, l'état de la série à la fin du dernier jour
--   traité (un jour traité est définitif : supprimer ensuite des réponses, par
--   exemple « Réinitialiser » sur une fiche, ne défait pas la série). Il est
--   avancé jour par jour à la première occasion du jour (premier gain d'XP ou
--   lecture du statut) par _serie_avancer.
-- - serie_encre_statut() : l'état du joueur connecté (série, palier, joker,
--   meilleure série), pour l'Accueil. get_serie_meilleure(uuid[]) : la
--   meilleure série de joueurs (profil).
--
-- Limite connue : quiz_answer_log accepte les écritures du joueur lui-même
-- (migration_quiz_answer_log.sql), comme pour les ratures. Un joueur qui y
-- écrirait de fausses réponses gonflerait sa série, donc le palier appliqué
-- à l'XP de ses vraies premières bonnes réponses (jamais l'ELO, jamais d'XP
-- sur une question déjà réussie : le plafond reste x2 sur de l'XP honnête).
--
-- À coller une fois dans le SQL Editor de Supabase. Idempotent. Aucune
-- migration préalable obligatoire : les tables de réponses absentes sont
-- ignorées (le compte des jours se complète quand elles existent).

DO $$
BEGIN
  IF to_regclass('public.xp_events') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'xp_events et profiles doivent exister (supabase/leveling.sql, supabase_schema.sql)';
  END IF;
END $$;

-- 1. La trace du bonus sur chaque gain d'XP
ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS xp_base integer;
ALTER TABLE xp_events ADD COLUMN IF NOT EXISTS multiplicateur numeric(3,1);

-- 2. L'état de la série, par joueur
CREATE TABLE IF NOT EXISTS serie_encre (
  user_id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- dernier jour (Paris) traité : tous les jours jusqu'à celui-ci sont définitifs
  jusqu_au        date        NOT NULL,
  -- jours d'affilée à la fin de jusqu_au
  serie           integer     NOT NULL DEFAULT 0 CHECK (serie >= 0),
  -- premier jour de la série en cours (NULL : pas de série)
  debut           date,
  -- lundi de la semaine où le joker a servi (NULL : jamais)
  joker_semaine   date,
  -- jusqu_au est un jour manqué sauvé par le joker (un second manqué d'affilée casse)
  veille_sauvee   boolean     NOT NULL DEFAULT false,
  meilleure       integer     NOT NULL DEFAULT 0 CHECK (meilleure >= 0),
  meilleure_le    date,
  mis_a_jour      timestamptz NOT NULL DEFAULT now()
);

-- lecture de sa propre ligne ; aucune écriture directe (tout passe par les fonctions)
ALTER TABLE serie_encre ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'serie_encre' AND policyname = 'serie_encre_select_own') THEN
    CREATE POLICY serie_encre_select_own ON serie_encre FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. Les règles, en deux petites fonctions
CREATE OR REPLACE FUNCTION _serie_seuil()
RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 10 $$;

-- palier de la série (à la veille du jour)
CREATE OR REPLACE FUNCTION _serie_palier(p_serie int)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN coalesce(p_serie, 0) >= 7 THEN 2.0 WHEN coalesce(p_serie, 0) >= 3 THEN 1.5 ELSE 1.0 END::numeric
$$;

-- 4. Questions répondues par jour de Paris, toutes sources (comme l'anneau de
--    l'Accueil). Les tables absentes sont ignorées.
CREATE OR REPLACE FUNCTION _serie_reponses_jour(p_uid uuid, p_de date, p_a date)
RETURNS TABLE (jour date, n int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_t0    timestamptz := p_de::timestamp AT TIME ZONE 'Europe/Paris';
  v_t1    timestamptz := (p_a + 1)::timestamp AT TIME ZONE 'Europe/Paris';
  v_parts text[] := '{}';
BEGIN
  IF p_uid IS NULL OR p_de IS NULL OR p_a IS NULL OR p_a < p_de THEN
    RETURN;
  END IF;
  IF to_regclass('public.quiz_answer_log') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT answered_at AS ts, 1 AS n FROM quiz_answer_log WHERE user_id = $1$q$::text);
  END IF;
  IF to_regclass('public.practice_sessions') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT occurred_at, coalesce(total, 0) FROM practice_sessions WHERE user_id = $1 AND mode = 'qcm'$q$::text);
  END IF;
  IF to_regclass('public.practice_session_results') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT completed_at, coalesce(total, 0) FROM practice_session_results WHERE user_id = $1$q$::text);
  END IF;
  IF to_regclass('public.mock_exam_results') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT completed_at, coalesce(total, 0) FROM mock_exam_results WHERE user_id = $1$q$::text);
  END IF;
  IF to_regclass('public.mock_exam_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT completed_at, coalesce(total, 0) FROM mock_exam_attempts WHERE user_id = $1$q$::text);
  END IF;
  IF to_regclass('public.duels') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT coalesce(CASE WHEN challenger_id = $1 THEN challenger_finished_at ELSE opponent_finished_at END, finished_at),
                                    coalesce(array_length(question_ids, 1), 0)
                             FROM duels WHERE (challenger_id = $1 OR opponent_id = $1) AND status = 'finished'$q$::text);
  END IF;
  IF to_regclass('public.daily_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT finished_at, coalesce(total, 0) FROM daily_attempts WHERE user_id = $1 AND finished_at IS NOT NULL$q$::text);
  END IF;
  IF to_regclass('public.quiz_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT created_at, coalesce(total, 0) FROM quiz_attempts WHERE user_id = $1$q$::text);
  END IF;
  IF to_regclass('public.eclair_series') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT finished_at, coalesce(total, 0) FROM eclair_series WHERE user_id = $1 AND finished_at IS NOT NULL$q$::text);
  END IF;
  IF to_regclass('public.ateliers') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT (r->>'at')::timestamptz, 1
                             FROM ateliers a
                             CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.reponses) = 'array' THEN a.reponses ELSE '[]'::jsonb END) AS r
                             WHERE a.user_id = $1 AND coalesce(r->>'k', '') <> 'calc' AND r->>'at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'$q$::text);
  END IF;
  IF cardinality(v_parts) = 0 THEN
    RETURN;
  END IF;
  RETURN QUERY EXECUTE
    'SELECT (u.ts AT TIME ZONE ''Europe/Paris'')::date, sum(u.n)::int FROM (' || array_to_string(v_parts, ' UNION ALL ') || ') u(ts, n)'
    || ' WHERE u.ts >= $2 AND u.ts < $3 AND u.n > 0 GROUP BY 1'
    USING p_uid, v_t0, v_t1;
END;
$$;

-- 5. L'état de la série avancé jusqu'à la veille de p_jour (jour de Paris).
--    Ne recule jamais : un jour traité est définitif.
CREATE OR REPLACE FUNCTION _serie_avancer(p_uid uuid, p_jour date)
RETURNS serie_encre
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row    serie_encre;
  v_neuf   boolean := false;
  v_a      date := p_jour - 1;
  v_de     date;
  r        record;
  v_lundi  date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('serie_encre:' || p_uid::text));
  SELECT * INTO v_row FROM serie_encre WHERE user_id = p_uid;
  IF NOT FOUND THEN
    v_neuf := true;
    -- premier calcul : depuis le premier jour de réponse
    SELECT min(c.jour) INTO v_de FROM _serie_reponses_jour(p_uid, DATE '2000-01-01', v_a) c;
    v_row.user_id := p_uid;
    v_row.jusqu_au := coalesce(v_de, p_jour) - 1;
    v_row.serie := 0;
    v_row.debut := NULL;
    v_row.joker_semaine := NULL;
    v_row.veille_sauvee := false;
    v_row.meilleure := 0;
    v_row.meilleure_le := NULL;
  END IF;

  IF v_row.jusqu_au < v_a THEN
    FOR r IN
      SELECT g.d::date AS jour, coalesce(c.n, 0) AS n
      FROM generate_series((v_row.jusqu_au + 1)::timestamp, v_a::timestamp, interval '1 day') AS g(d)
      LEFT JOIN _serie_reponses_jour(p_uid, v_row.jusqu_au + 1, v_a) c ON c.jour = g.d::date
      ORDER BY 1
    LOOP
      IF r.n >= _serie_seuil() THEN
        v_row.serie := v_row.serie + 1;
        IF v_row.serie = 1 THEN v_row.debut := r.jour; END IF;
        v_row.veille_sauvee := false;
        IF v_row.serie > v_row.meilleure THEN
          v_row.meilleure := v_row.serie;
          v_row.meilleure_le := r.jour;
        END IF;
      ELSIF v_row.serie > 0 THEN
        v_lundi := date_trunc('week', r.jour::timestamp)::date;
        IF v_row.veille_sauvee OR v_row.joker_semaine = v_lundi THEN
          -- deux jours manqués d'affilée, ou un second dans la semaine : la série casse
          v_row.serie := 0;
          v_row.debut := NULL;
          v_row.veille_sauvee := false;
        ELSE
          -- le joker de la semaine : le jour manqué ne compte pas, mais ne casse rien
          v_row.joker_semaine := v_lundi;
          v_row.veille_sauvee := true;
        END IF;
      ELSE
        v_row.veille_sauvee := false;
      END IF;
      v_row.jusqu_au := r.jour;
    END LOOP;
  ELSIF NOT v_neuf THEN
    RETURN v_row;
  END IF;

  INSERT INTO serie_encre (user_id, jusqu_au, serie, debut, joker_semaine, veille_sauvee, meilleure, meilleure_le, mis_a_jour)
  VALUES (v_row.user_id, v_row.jusqu_au, v_row.serie, v_row.debut, v_row.joker_semaine, v_row.veille_sauvee, v_row.meilleure, v_row.meilleure_le, now())
  ON CONFLICT (user_id) DO UPDATE
    SET jusqu_au = EXCLUDED.jusqu_au, serie = EXCLUDED.serie, debut = EXCLUDED.debut,
        joker_semaine = EXCLUDED.joker_semaine, veille_sauvee = EXCLUDED.veille_sauvee,
        meilleure = greatest(serie_encre.meilleure, EXCLUDED.meilleure),
        meilleure_le = CASE WHEN EXCLUDED.meilleure > serie_encre.meilleure THEN EXCLUDED.meilleure_le ELSE serie_encre.meilleure_le END,
        mis_a_jour = now();
  SELECT * INTO v_row FROM serie_encre WHERE user_id = p_uid;
  RETURN v_row;
END;
$$;

-- 6. Le bonus, au moment où l'XP est écrite
CREATE OR REPLACE FUNCTION _xp_events_serie_bonus()
RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  g       record;
  v_row   serie_encre;
  v_mult  numeric;
  v_extra bigint;
BEGIN
  FOR g IN
    SELECT n.user_id, (n.occurred_at AT TIME ZONE 'Europe/Paris')::date AS jour, array_agg(n.id ORDER BY n.id) AS ids
    FROM nouvelles n
    WHERE n.xp > 0 AND n.user_id IS NOT NULL
      AND n.source IN ('quiz_question', 'exercise_question', 'practice_session', 'atelier', 'eclair')
    GROUP BY 1, 2
  LOOP
    v_row := _serie_avancer(g.user_id, g.jour);
    v_mult := _serie_palier(v_row.serie);
    IF v_mult > 1 THEN
      WITH c AS (
        SELECT t.id, t.xp AS base,
               (round(t.cum * v_mult) - round((t.cum - t.xp) * v_mult))::int AS fin
        FROM (
          SELECT x.id, x.xp, sum(x.xp) OVER (ORDER BY x.id) AS cum
          FROM xp_events x WHERE x.id = ANY (g.ids)
        ) t
      ),
      maj AS (
        UPDATE xp_events e
        SET xp_base = c.base, multiplicateur = v_mult, xp = c.fin
        FROM c WHERE e.id = c.id
        RETURNING c.fin - c.base AS extra
      )
      SELECT coalesce(sum(extra), 0) INTO v_extra FROM maj;
      IF v_extra <> 0 THEN
        UPDATE profiles SET xp_total = xp_total + v_extra WHERE id = g.user_id;
      END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION _xp_events_serie_bonus() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS xp_events_serie_bonus ON xp_events;
CREATE TRIGGER xp_events_serie_bonus
  AFTER INSERT ON xp_events
  REFERENCING NEW TABLE AS nouvelles
  FOR EACH STATEMENT EXECUTE FUNCTION _xp_events_serie_bonus();

-- 7. L'état du joueur connecté, pour l'Accueil
--    { jour, serie (à la veille), aujourdhui (questions), fait, serie_affichee
--      (aujourd'hui compris s'il est fait), mult (palier du jour), joker
--      (disponible cette semaine), veille_sauvee, debut, meilleure, seuil }
CREATE OR REPLACE FUNCTION serie_encre_statut()
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_jour   date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_row    serie_encre;
  v_n      int;
  v_fait   boolean;
  v_aff    int;
  v_lundi  date := date_trunc('week', ((now() AT TIME ZONE 'Europe/Paris')::date)::timestamp)::date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_row := _serie_avancer(v_uid, v_jour);
  SELECT coalesce(sum(c.n), 0)::int INTO v_n FROM _serie_reponses_jour(v_uid, v_jour, v_jour) c;
  v_fait := v_n >= _serie_seuil();
  v_aff := v_row.serie + CASE WHEN v_fait THEN 1 ELSE 0 END;
  IF v_aff > v_row.meilleure THEN
    UPDATE serie_encre SET meilleure = v_aff, meilleure_le = v_jour, mis_a_jour = now() WHERE user_id = v_uid
    RETURNING * INTO v_row;
  END IF;
  RETURN json_build_object(
    'jour', v_jour,
    'serie', v_row.serie,
    'aujourdhui', v_n,
    'fait', v_fait,
    'serie_affichee', v_aff,
    'mult', _serie_palier(v_row.serie),
    'joker', v_row.joker_semaine IS DISTINCT FROM v_lundi,
    'veille_sauvee', v_row.veille_sauvee,
    'debut', CASE WHEN v_fait AND v_row.serie = 0 THEN v_jour ELSE v_row.debut END,
    'meilleure', v_row.meilleure,
    'seuil', _serie_seuil()
  );
END;
$$;

-- 8. La meilleure série de joueurs (profil), 300 au plus
CREATE OR REPLACE FUNCTION get_serie_meilleure(p_ids uuid[])
RETURNS TABLE (user_id uuid, meilleure int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.user_id, s.meilleure
  FROM serie_encre s
  WHERE auth.uid() IS NOT NULL
    AND s.user_id IN (SELECT x FROM unnest(coalesce(p_ids, '{}'::uuid[])) AS x LIMIT 300);
$$;

REVOKE ALL ON FUNCTION _serie_seuil() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _serie_palier(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _serie_reponses_jour(uuid, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _serie_avancer(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION serie_encre_statut() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_serie_meilleure(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION serie_encre_statut() TO authenticated;
GRANT EXECUTE ON FUNCTION get_serie_meilleure(uuid[]) TO authenticated;
