-- Les Salles, les défis et les duels donnent de l'XP, les calculs font avancer
-- la série d'encre, et un examen rendu en Salle compte comme examen blanc au Codex.
--
-- XP : même règle que partout ailleurs. La première bonne réponse à une question
-- officielle rapporte 10, 15 ou 20 XP selon la difficulté de la série, une seule fois
-- par joueur (quiz_question_progress). Rien n'est versé pour le passé.
-- Le versement se fait à la fin de la partie : en chrono global, une réponse peut
-- encore changer jusqu'au bout. Une erreur ici ne casse jamais une partie.
-- Idempotent : se recolle sans effet.

-- 1. Le versement, partagé par les trois modes
CREATE OR REPLACE FUNCTION public._xp_justes(p_uid uuid, p_questions uuid[], p_source text, p_meta jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer := 0;
BEGIN
  IF p_uid IS NULL OR coalesce(cardinality(p_questions), 0) = 0 THEN
    RETURN 0;
  END IF;
  WITH justes AS (
    SELECT qq.id AS question_id, lf.name AS topic, qs.difficulty
    FROM quiz_questions qq
    JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official AND qs.official_published
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE qq.id = ANY (p_questions)
  ),
  credited AS (
    INSERT INTO quiz_question_progress (user_id, question_id)
    SELECT p_uid, j.question_id
    FROM justes j
    WHERE NOT EXISTS (SELECT 1 FROM quiz_question_progress qp WHERE qp.user_id = p_uid AND qp.question_id = j.question_id)
    ON CONFLICT DO NOTHING
    RETURNING question_id
  ),
  ins_events AS (
    INSERT INTO xp_events (user_id, xp, source, meta)
    SELECT p_uid,
           CASE coalesce(j.difficulty, 1) WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END,
           p_source,
           coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('question_id', c.question_id, 'topic', j.topic)
    FROM credited c
    JOIN justes j ON j.question_id = c.question_id
    RETURNING xp
  )
  SELECT coalesce(sum(xp), 0)::int INTO v_xp FROM ins_events;

  IF v_xp > 0 THEN
    UPDATE profiles SET xp_total = xp_total + v_xp WHERE id = p_uid;
  END IF;
  RETURN v_xp;
END;
$$;

-- Le navigateur ne doit jamais pouvoir l'appeler : elle verse de l'XP sans contrôle.
REVOKE ALL ON FUNCTION public._xp_justes(uuid, uuid[], text, jsonb) FROM PUBLIC, anon, authenticated;

-- 2. Fin de Salle : tous les joueurs de la session, tous les chronos
CREATE OR REPLACE FUNCTION public._xp_salle_fin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.statut = 'terminee' AND OLD.statut IS DISTINCT FROM 'terminee' THEN
    BEGIN
      FOR r IN
        SELECT x.user_id, array_agg(DISTINCT i.question_id) AS questions
        FROM salle_reponses x
        JOIN salle_items i ON i.session_id = x.session_id AND i.position = x.position
        WHERE x.session_id = NEW.id AND i.origine = 'question' AND i.question_id IS NOT NULL AND x.juste IS TRUE
        GROUP BY x.user_id
      LOOP
        PERFORM _xp_justes(r.user_id, r.questions, 'salle', jsonb_build_object('session_id', NEW.id));
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'xp (fin de salle) : %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER xp_salle_fin
  AFTER UPDATE OF statut ON public.salle_sessions
  FOR EACH ROW EXECUTE FUNCTION public._xp_salle_fin();

-- 3. Défi rendu (les 30 du jour et les 5 du jour)
CREATE OR REPLACE FUNCTION public._xp_defi_rendu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_questions uuid[];
BEGIN
  IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
    BEGIN
      SELECT array_agg(DISTINCT a.question_id) INTO v_questions
      FROM daily_answers a
      WHERE a.challenge_id = NEW.challenge_id AND a.user_id = NEW.user_id AND a.is_correct;
      PERFORM _xp_justes(NEW.user_id, v_questions, 'defi', jsonb_build_object('challenge_id', NEW.challenge_id));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'xp (défi rendu) : %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER xp_defi_rendu
  AFTER UPDATE OF finished_at ON public.daily_attempts
  FOR EACH ROW EXECUTE FUNCTION public._xp_defi_rendu();

-- 4. Duel clos : chacun touche ses bonnes réponses, même si l'autre n'a pas joué
CREATE OR REPLACE FUNCTION public._xp_duel_clos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.status IN ('finished', 'declined', 'expired') AND OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      FOR r IN
        SELECT a.user_id, array_agg(DISTINCT a.question_id) AS questions
        FROM duel_answers a
        WHERE a.duel_id = NEW.id AND a.is_correct
        GROUP BY a.user_id
      LOOP
        PERFORM _xp_justes(r.user_id, r.questions, 'duel', jsonb_build_object('duel_id', NEW.id));
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'xp (duel clos) : %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER xp_duel_clos
  AFTER UPDATE OF status ON public.duels
  FOR EACH ROW EXECUTE FUNCTION public._xp_duel_clos();

REVOKE ALL ON FUNCTION public._xp_salle_fin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._xp_defi_rendu() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._xp_duel_clos() FROM PUBLIC, anon, authenticated;

-- 5. Ces trois sources profitent du bonus de série, comme les autres
DO $m$
DECLARE
  d text := pg_get_functiondef('public._xp_events_serie_bonus()'::regprocedure);
  n text;
BEGIN
  IF position($a$'salle', 'defi', 'duel'$a$ IN d) = 0 THEN
    n := replace(d, $a$'atelier', 'eclair')$a$, $a$'atelier', 'eclair', 'salle', 'defi', 'duel')$a$);
    IF n = d THEN RAISE EXCEPTION 'bonus de série : liste des sources introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- 6. Les calculs font avancer la série d'encre, comme ils comptent déjà dans
-- l'objectif et dans le compteur du jour de l'accueil. Le re-test d'un calcul en
-- Atelier compte s'il est juste, même règle que lib/objectif.ts. Seuls les jours
-- pas encore clos changent : une série déjà cassée ne se répare pas.
DO $m$
DECLARE
  d text := pg_get_functiondef('public._serie_reponses_jour(uuid,date,date)'::regprocedure);
  n text;
BEGIN
  IF position('calc_attempts' IN d) = 0 THEN
    n := replace(d, $a$  IF to_regclass('public.salle_reponses') IS NOT NULL THEN$a$,
$a$  IF to_regclass('public.calc_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$SELECT answered_at, 1 FROM calc_attempts WHERE user_id = $1$q$::text);
  END IF;
  IF to_regclass('public.salle_reponses') IS NOT NULL THEN$a$);
    IF n = d THEN RAISE EXCEPTION 'série : point d''insertion introuvable'; END IF;
    d := n;
    n := replace(d, $a$coalesce(r->>'k', '') <> 'calc' AND$a$, $a$(coalesce(r->>'k', '') <> 'calc' OR r->>'r' = 'true') AND$a$);
    IF n = d THEN RAISE EXCEPTION 'série : filtre des ateliers introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;

-- 7. Codex : un examen officiel joué en Salle est un examen blanc rendu. Les questions
-- sans réponse comptent fausses, comme à l'examen ; le joueur doit avoir répondu à
-- au moins la moitié, sinon il n'a pas vraiment rendu de copie. Il faut 30 questions
-- au moins, le même seuil que le trophée « Mock en Salle ».
DO $m$
DECLARE
  d text := pg_get_functiondef('public.codex_journal(uuid)'::regprocedure);
  n text;
BEGIN
  IF position('examens rendus en Salle' IN d) = 0 THEN
    n := replace(d, $a$  -- les 30 du jour / les 5 du jour rendus$a$,
$a$  -- examens rendus en Salle
  IF to_regclass('public.salle_sessions') IS NOT NULL AND to_regclass('public.salle_rendus') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'examen_blanc_rendu'::text, coalesce(s.terminee_at, s.fin_at, s.created_at),
             jsonb_build_object('questions', c.total, 'justes', c.justes, 'pct', round(100.0 * c.justes / c.total)::int, 'officiel', true, 'reprise', false,
                                'secondesParQuestion', CASE WHEN s.started_at IS NOT NULL
                                  THEN round(extract(epoch FROM coalesce(d.rendu_le, s.terminee_at, s.fin_at) - s.started_at)::numeric / c.total)::int END)
      FROM salle_sessions s
      CROSS JOIN LATERAL (
        SELECT count(*)::int AS total, count(r.position)::int AS repondues, (count(*) FILTER (WHERE r.juste))::int AS justes
        FROM salle_items i
        LEFT JOIN salle_reponses r ON r.session_id = i.session_id AND r.position = i.position AND r.user_id = $1 AND r.choix IS NOT NULL
        WHERE i.session_id = s.id AND i.origine = 'question'
      ) c
      LEFT JOIN salle_rendus d ON d.session_id = s.id AND d.user_id = $1
      WHERE s.statut = 'terminee' AND s.params ->> 'source' = 'examen' AND c.total >= 30 AND c.repondues * 2 >= c.total
    $q$);
  END IF;

  -- les 30 du jour / les 5 du jour rendus$a$);
    IF n = d THEN RAISE EXCEPTION 'journal du Codex : point d''insertion introuvable'; END IF;
    EXECUTE n;
  END IF;
END;
$m$;
