-- migration_salles_stats.sql — les réponses données dans les Salles comptent
-- dans les stats, comme celles des 30 du jour.
--
-- 1. _reponses_joueur (notions, points faibles, maîtrise, Codex, page Moi) :
--    une source de plus, 'salle' : les QCM d'une partie de Salle, une fois la
--    partie finie (comme une copie des 30 du jour, comptée une fois rendue).
--    Les calculs d'une Salle n'ont pas de question de la banque : ils n'y
--    figurent pas (ils comptent dans l'activité du jour, ci-dessous).
-- 2. mes_reponses_salles(p_depuis, p_user) : les réponses de Salle d'un joueur
--    depuis une date (instant, justesse, calcul ou non), pour l'anneau du jour,
--    le carnet de l'accueil et le profil ; salle_reponses n'a pas de policy de
--    lecture. Un joueur connecté ne lit que les siennes ; le client admin
--    (auth.uid() nul) lit celles de p_user.
-- 3. _serie_reponses_jour (série d'encre, jours d'encre, bonus de série) : les
--    QCM des Salles comptent le jour où ils ont été répondus.
-- 4. Carnet de ratures : un déclencheur sur salle_reponses note chaque QCM de
--    Salle (erreur ou reprise), comme les 30 du jour ; la rature devient
--    visible à la correction de la question. À la première application, les
--    réponses de Salle déjà données sont notées une fois (aucune le 2026-11-02 :
--    la table était vide, aucune rature touchée).
-- Les jours de série d'encre déjà figés ne sont pas recalculés ; aucun ne
-- comptait de réponse de Salle au moment de la migration.
-- Fonctions et déclencheur ; seul le rattrapage du carnet (une fois) écrit des
-- données ; idempotent (CREATE OR REPLACE, rattrapage gardé par l'absence du déclencheur).
-- _reponses_joueur reprend la version en place (migration_atelier.sql) à
-- l'identique, plus la branche « salle » à la fin.

CREATE OR REPLACE FUNCTION public._reponses_joueur(p_uid uuid)
 RETURNS TABLE(question_id uuid, source text, ok boolean, at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT * FROM _reponses_atelier(p_uid)
  UNION ALL
  -- les QCM des Salles, une fois la partie finie (terminée, arrêtée ou échue)
  SELECT i.question_id, 'salle'::text, r.juste, r.repondu_le
  FROM salle_reponses r
  JOIN salle_items i ON i.session_id = r.session_id AND i.position = r.position
  JOIN salle_sessions s ON s.id = r.session_id
  WHERE r.user_id = p_uid AND i.origine = 'question' AND i.question_id IS NOT NULL AND r.choix IS NOT NULL
    AND (s.statut = 'terminee' OR s.fin_at <= now());
$function$;

-- Les réponses de Salle d'un joueur depuis p_depuis (au plus 5 000), pour
-- compter l'activité : l'instant, la justesse, et si c'était un calcul. Un
-- joueur connecté ne lit que les siennes (p_user nul ou lui-même) ; le client
-- admin, sans auth.uid(), lit celles de p_user.
DROP FUNCTION IF EXISTS mes_reponses_salles(timestamptz);
CREATE OR REPLACE FUNCTION mes_reponses_salles(p_depuis timestamptz, p_user uuid DEFAULT NULL)
RETURNS TABLE (repondu_le timestamptz, juste boolean, calcul boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.repondu_le, r.juste, i.origine = 'calcul'
  FROM salle_reponses r
  JOIN salle_items i ON i.session_id = r.session_id AND i.position = r.position
  WHERE r.user_id = coalesce(p_user, auth.uid())
    AND (auth.uid() IS NULL OR p_user IS NULL OR p_user = auth.uid())
    AND r.repondu_le >= p_depuis
  ORDER BY r.repondu_le
  LIMIT 5000;
$$;

REVOKE ALL ON FUNCTION mes_reponses_salles(timestamptz, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mes_reponses_salles(timestamptz, uuid) TO authenticated, service_role;

-- Questions répondues par jour de Paris (série d'encre). Reprend la version en
-- place (migration_v3_profil.sql) à l'identique, plus les QCM des Salles.
CREATE OR REPLACE FUNCTION public._serie_reponses_jour(p_uid uuid, p_de date, p_a date)
 RETURNS TABLE(jour date, n integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- close : son total, le jour de sa fin ; ouverte : ses réponses données, le jour de son début
    v_parts := array_append(v_parts, $q$SELECT coalesce(finished_at, started_at),
                                    CASE WHEN finished_at IS NOT NULL THEN coalesce(total, 0)
                                         ELSE (SELECT count(*)::int FROM unnest(answers) AS a(v) WHERE a.v IS NOT NULL) END
                             FROM eclair_series WHERE user_id = $1$q$::text);
  END IF;
  IF to_regclass('public.ateliers') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT (r->>'at')::timestamptz, 1
                             FROM ateliers a
                             CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.reponses) = 'array' THEN a.reponses ELSE '[]'::jsonb END) AS r
                             WHERE a.user_id = $1 AND coalesce(r->>'k', '') <> 'calc' AND r->>'at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'$q$::text);
  END IF;
  IF to_regclass('public.salle_reponses') IS NOT NULL THEN
    -- les QCM des Salles, le jour où ils ont été répondus (pas les calculs, comme ailleurs)
    v_parts := array_append(v_parts, $q$SELECT r.repondu_le, 1
                             FROM salle_reponses r JOIN salle_items i ON i.session_id = r.session_id AND i.position = r.position
                             WHERE r.user_id = $1 AND i.origine = 'question' AND r.choix IS NOT NULL$q$::text);
  END IF;
  IF cardinality(v_parts) = 0 THEN
    RETURN;
  END IF;
  RETURN QUERY EXECUTE
    'SELECT (u.ts AT TIME ZONE ''Europe/Paris'')::date, sum(u.n)::int FROM (' || array_to_string(v_parts, ' UNION ALL ') || ') u(ts, n)'
    || ' WHERE u.ts >= $2 AND u.ts < $3 AND u.n > 0 GROUP BY 1'
    USING p_uid, v_t0, v_t1;
END;
$function$;

-- Carnet de ratures : un QCM de Salle répondu y est noté (erreur, ou reprise
-- d'une erreur), visible à la correction de la question (fin de son temps + 2 s).
CREATE OR REPLACE FUNCTION public._rature_salle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q    uuid;
  v_orig text;
  v_vis  timestamptz;
BEGIN
  IF NEW.choix IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT i.question_id, i.origine,
           s.started_at + make_interval(secs => NEW.position * (s.temps + s.pause_s) + s.temps + 2)
    INTO v_q, v_orig, v_vis
    FROM salle_items i JOIN salle_sessions s ON s.id = i.session_id
    WHERE i.session_id = NEW.session_id AND i.position = NEW.position;
    IF v_orig = 'question' AND v_q IS NOT NULL THEN
      PERFORM _rature_note(NEW.user_id, v_q, 'salle', NEW.juste, NEW.choix, NEW.repondu_le, v_vis);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (salle) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public._rature_salle() FROM PUBLIC, anon, authenticated;

-- Rattrapage, à la première application seulement : les réponses de Salle
-- déjà données (dans l'ordre), puis le déclencheur pour les suivantes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'salle_reponses_rature' AND tgrelid = 'public.salle_reponses'::regclass) THEN
    PERFORM _rature_note(r.user_id, i.question_id, 'salle', r.juste, r.choix, r.repondu_le,
                         s.started_at + make_interval(secs => r.position * (s.temps + s.pause_s) + s.temps + 2))
    FROM salle_reponses r
    JOIN salle_items i ON i.session_id = r.session_id AND i.position = r.position
    JOIN salle_sessions s ON s.id = r.session_id
    WHERE i.origine = 'question' AND i.question_id IS NOT NULL AND r.choix IS NOT NULL
    ORDER BY r.repondu_le, r.session_id, r.position;
    CREATE TRIGGER salle_reponses_rature
      AFTER INSERT ON salle_reponses
      FOR EACH ROW EXECUTE FUNCTION _rature_salle();
  END IF;
END $$;

-- Droits (déjà en place depuis migration_notions.sql et migration_v3_profil.sql ;
-- rappelés pour une base neuve) : fonctions internes, jamais appelées par un joueur.
REVOKE ALL ON FUNCTION public._reponses_joueur(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._serie_reponses_jour(uuid, date, date) FROM PUBLIC, anon, authenticated;
