-- Le carnet de ratures (Moi › Erreurs) : TOUTES les questions manquées, d'où
-- qu'elles viennent (fiches, QCM, sessions chronométrées, les 30 et les 5 du
-- jour, séries éclair, duels, sessions ciblées, examens blancs et leurs
-- reprises, examens), gardées pour toujours. Une question laissée sans
-- réponse dans une copie qui la compte fausse est une rature aussi. Une
-- rature ne sort du carnet que si le joueur la retire ; une nouvelle erreur
-- sur la même question la ramène.
-- - Chaque source alimente le carnet au moment où la réponse est enregistrée
--   (déclencheurs ; QCM, sessions chronométrées et reprises d'examen blanc
--   passent par noter_reponse / noter_reponses, appelées par le site).
-- - Défi du jour et duels : rien ne bouge au carnet avant la copie rendue (ou
--   la fin du chrono) et le duel clos, comme leur correction. Une réponse sur
--   une question déjà au carnet attend dans ratures_attente, puis est rejouée.
-- - La question est recopiée dans la rature (énoncé, choix, bonne réponse,
--   explication) : elle reste consultable même si la banque change.
-- - L'historique est repris à la première application.
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_series_eclair.sql. Idempotent.

DO $$
BEGIN
  IF to_regclass('public.eclair_series') IS NULL THEN
    RAISE EXCEPTION 'Colle d''abord migration_series_eclair.sql';
  END IF;
END $$;

-- 1. Le carnet, et les réponses en attente (défi ou duel pas encore clos)
CREATE TABLE IF NOT EXISTS ratures (
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id     uuid        NOT NULL,
  misses          int         NOT NULL DEFAULT 1,
  first_missed_at timestamptz NOT NULL,
  last_missed_at  timestamptz NOT NULL,
  -- la dernière mauvaise réponse donnée (NULL : laissée sans réponse), et où
  last_selected   int,
  last_source     text        NOT NULL,
  sources         text[]      NOT NULL DEFAULT '{}',
  -- bonnes réponses depuis la dernière erreur (toutes sources), et la dernière
  correct_since   int         NOT NULL DEFAULT 0,
  last_correct_at timestamptz,
  -- la correction se montre à partir de là (copie du défi rendue, duel clos)
  visible_from    timestamptz NOT NULL,
  removed_at      timestamptz,
  -- la question telle qu'elle était à la dernière erreur
  prompt          text        NOT NULL,
  choices         text[]      NOT NULL,
  correct_index   int,
  explanation     text,
  set_title       text,
  folder_name     text,
  PRIMARY KEY (user_id, question_id)
);
ALTER TABLE ratures ADD COLUMN IF NOT EXISTS last_correct_at timestamptz;
CREATE INDEX IF NOT EXISTS ratures_user_recentes ON ratures (user_id, last_missed_at DESC);

CREATE TABLE IF NOT EXISTS ratures_attente (
  id           bigserial   PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id  uuid        NOT NULL,
  source       text        NOT NULL,
  correct      boolean     NOT NULL,
  selected     int,
  at           timestamptz NOT NULL,
  visible_from timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ratures_attente_user ON ratures_attente (user_id, visible_from);

-- lecture et écriture par les fonctions seulement
ALTER TABLE ratures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratures_attente ENABLE ROW LEVEL SECURITY;

-- 2. Noter une réponse dans le carnet. Erreur (ou blanc : p_selected NULL) :
--    la rature s'ouvre ou se ravive ; bonne réponse : elle compte une reprise.
--    Réponse encore sous embargo (p_visible dans le futur) sur une question
--    déjà visible au carnet : elle attend la clôture.
CREATE OR REPLACE FUNCTION _rature_note(p_user uuid, p_question uuid, p_source text, p_correct boolean, p_selected int, p_at timestamptz, p_visible timestamptz)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_q      quiz_questions;
  v_title  text;
  v_folder text;
  v_at     timestamptz := least(coalesce(p_at, now()), now());
  v_vis    timestamptz := coalesce(p_visible, least(coalesce(p_at, now()), now()));
BEGIN
  IF p_user IS NULL OR p_question IS NULL OR p_correct IS NULL THEN
    RETURN;
  END IF;
  IF v_vis > now() AND EXISTS (SELECT 1 FROM ratures WHERE user_id = p_user AND question_id = p_question AND visible_from <= now()) THEN
    INSERT INTO ratures_attente (user_id, question_id, source, correct, selected, at, visible_from)
    VALUES (p_user, p_question, p_source, p_correct, p_selected, v_at, v_vis);
    RETURN;
  END IF;
  IF p_correct THEN
    UPDATE ratures
    SET correct_since = correct_since + 1,
        last_correct_at = greatest(coalesce(last_correct_at, v_at), v_at)
    WHERE user_id = p_user AND question_id = p_question AND v_at > last_missed_at;
    RETURN;
  END IF;
  SELECT * INTO v_q FROM quiz_questions WHERE id = p_question;
  IF v_q.id IS NULL THEN
    RETURN;
  END IF;
  SELECT qs.title, lf.name INTO v_title, v_folder
  FROM quiz_sets qs LEFT JOIN library_folders lf ON lf.id = qs.folder_id
  WHERE qs.id = v_q.set_id;

  INSERT INTO ratures AS r (user_id, question_id, misses, first_missed_at, last_missed_at, last_selected, last_source, sources,
                            correct_since, visible_from, prompt, choices, correct_index, explanation, set_title, folder_name)
  VALUES (p_user, p_question, 1, v_at, v_at, p_selected, p_source, ARRAY[p_source],
          0, v_vis, v_q.prompt, v_q.choices, v_q.correct_index, v_q.explanation, v_title, v_folder)
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    misses          = r.misses + 1,
    first_missed_at = least(r.first_missed_at, EXCLUDED.first_missed_at),
    last_missed_at  = greatest(r.last_missed_at, EXCLUDED.last_missed_at),
    last_selected   = CASE WHEN EXCLUDED.last_missed_at >= r.last_missed_at THEN EXCLUDED.last_selected ELSE r.last_selected END,
    last_source     = CASE WHEN EXCLUDED.last_missed_at >= r.last_missed_at THEN EXCLUDED.last_source ELSE r.last_source END,
    sources         = (SELECT array_agg(DISTINCT s ORDER BY s) FROM unnest(r.sources || EXCLUDED.sources) AS s),
    -- une erreur arrivée en retard (réponse hors ligne) n'efface pas les reprises qui l'ont suivie
    correct_since   = CASE WHEN EXCLUDED.last_missed_at < r.last_missed_at THEN r.correct_since
                           WHEN r.last_correct_at IS NOT NULL AND r.last_correct_at > EXCLUDED.last_missed_at THEN r.correct_since
                           ELSE 0 END,
    visible_from    = least(r.visible_from, EXCLUDED.visible_from),
    -- retirée puis manquée à nouveau : elle revient
    removed_at      = CASE WHEN r.removed_at IS NOT NULL AND EXCLUDED.last_missed_at > r.removed_at THEN NULL ELSE r.removed_at END,
    -- la copie de la question suit la dernière erreur (le choix donné y garde son sens)
    prompt          = CASE WHEN EXCLUDED.last_missed_at >= r.last_missed_at THEN EXCLUDED.prompt ELSE r.prompt END,
    choices         = CASE WHEN EXCLUDED.last_missed_at >= r.last_missed_at THEN EXCLUDED.choices ELSE r.choices END,
    correct_index   = CASE WHEN EXCLUDED.last_missed_at >= r.last_missed_at THEN EXCLUDED.correct_index ELSE r.correct_index END,
    explanation     = CASE WHEN EXCLUDED.last_missed_at >= r.last_missed_at THEN EXCLUDED.explanation ELSE r.explanation END,
    set_title       = EXCLUDED.set_title,
    folder_name     = EXCLUDED.folder_name;
END;
$$;

-- Rejouer les réponses en attente dont l'embargo est levé
CREATE OR REPLACE FUNCTION _ratures_rejouer(p_user uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  e ratures_attente;
BEGIN
  FOR e IN SELECT * FROM ratures_attente WHERE user_id = p_user AND visible_from <= now() ORDER BY at, id LOOP
    DELETE FROM ratures_attente WHERE id = e.id;
    PERFORM _rature_note(e.user_id, e.question_id, e.source, e.correct, e.selected, e.at, e.visible_from);
  END LOOP;
END;
$$;

-- 3. Les sources. Un déclencheur ne doit jamais empêcher d'enregistrer une
--    réponse : en cas de souci, un avertissement et on continue.

-- 3a. Fiches (journal des réponses)
CREATE OR REPLACE FUNCTION _rature_fiche()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM _rature_note(NEW.user_id, NEW.question_id, 'fiche', NEW.is_correct, NEW.selected_index, NEW.answered_at, least(NEW.answered_at, now()));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (fiche) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_fiche ON quiz_answer_log;
CREATE TRIGGER ratures_fiche AFTER INSERT ON quiz_answer_log FOR EACH ROW EXECUTE FUNCTION _rature_fiche();

-- 3b. Les 30 et les 5 du jour : visibles à la copie rendue, au plus tard à la fin du chrono
CREATE OR REPLACE FUNCTION _rature_defi()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prog  text;
  v_limit int;
  v_start timestamptz;
  v_fin   timestamptz;
BEGIN
  IF NEW.selected_index IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT c.program, c.time_limit_seconds, t.started_at, t.finished_at INTO v_prog, v_limit, v_start, v_fin
    FROM daily_challenges c JOIN daily_attempts t ON t.challenge_id = c.id AND t.user_id = NEW.user_id
    WHERE c.id = NEW.challenge_id;
    PERFORM _rature_note(NEW.user_id, NEW.question_id, CASE WHEN v_prog = 'cfa-l1-cinq' THEN 'cinq' ELSE 'defi' END,
                         NEW.is_correct, NEW.selected_index, NEW.answered_at,
                         coalesce(v_fin, coalesce(v_start, NEW.answered_at) + make_interval(secs => coalesce(v_limit, 2700) + 20)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (défi) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_defi ON daily_answers;
CREATE TRIGGER ratures_defi AFTER INSERT ON daily_answers FOR EACH ROW EXECUTE FUNCTION _rature_defi();

-- copie close (rendue, ou chrono écoulé) : la correction s'ouvre, les blancs
-- deviennent des ratures, les réponses en attente sont rejouées
CREATE OR REPLACE FUNCTION _rature_defi_rendu()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prog text;
  v_qids uuid[];
  v_src  text;
  t      record;
BEGIN
  IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
    BEGIN
      SELECT program, question_ids INTO v_prog, v_qids FROM daily_challenges WHERE id = NEW.challenge_id;
      v_src := CASE WHEN v_prog = 'cfa-l1-cinq' THEN 'cinq' ELSE 'defi' END;
      UPDATE ratures r SET visible_from = least(r.visible_from, NEW.finished_at)
      FROM daily_answers a
      WHERE a.challenge_id = NEW.challenge_id AND a.user_id = NEW.user_id AND NOT a.is_correct
        AND r.user_id = NEW.user_id AND r.question_id = a.question_id;
      UPDATE ratures_attente SET visible_from = least(visible_from, NEW.finished_at)
      WHERE user_id = NEW.user_id AND source = v_src AND question_id = ANY (coalesce(v_qids, '{}'::uuid[]));
      -- les questions laissées sans réponse comptent fausses : ratures aussi
      FOR t IN
        SELECT q.qid FROM unnest(coalesce(v_qids, '{}'::uuid[])) WITH ORDINALITY AS q(qid, pos)
        WHERE NOT EXISTS (SELECT 1 FROM daily_answers a WHERE a.challenge_id = NEW.challenge_id AND a.user_id = NEW.user_id
                            AND a.position = q.pos - 1 AND a.selected_index IS NOT NULL)
      LOOP
        PERFORM _rature_note(NEW.user_id, t.qid, v_src, false, NULL, NEW.finished_at, NEW.finished_at);
      END LOOP;
      PERFORM _ratures_rejouer(NEW.user_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ratures (copie rendue) : %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_defi_rendu ON daily_attempts;
CREATE TRIGGER ratures_defi_rendu AFTER UPDATE OF finished_at ON daily_attempts FOR EACH ROW EXECUTE FUNCTION _rature_defi_rendu();

-- 3c. Duels : visibles à la clôture du duel (au plus tôt à son échéance, et
--     jamais avant la fin du chrono du joueur)
CREATE OR REPLACE FUNCTION _rature_duel_echeance(p_duel duels, p_user uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN p_duel.status IN ('finished', 'declined', 'expired') THEN now()
    ELSE greatest(coalesce(p_duel.expires_at, 'infinity'::timestamptz),
                  coalesce(CASE WHEN p_duel.challenger_id = p_user THEN p_duel.challenger_started_at ELSE p_duel.opponent_started_at END, now())
                    + make_interval(secs => coalesce(p_duel.time_limit_seconds, 2700) + 20))
  END;
$$;

CREATE OR REPLACE FUNCTION _rature_duel()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_d duels;
BEGIN
  IF NEW.selected_index IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT * INTO v_d FROM duels WHERE id = NEW.duel_id;
    PERFORM _rature_note(NEW.user_id, NEW.question_id, 'duel', NEW.is_correct, NEW.selected_index, NEW.answered_at,
                         CASE WHEN v_d.id IS NULL THEN NEW.answered_at ELSE _rature_duel_echeance(v_d, NEW.user_id) END);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (duel) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_duel ON duel_answers;
CREATE TRIGGER ratures_duel AFTER INSERT ON duel_answers FOR EACH ROW EXECUTE FUNCTION _rature_duel();

-- duel clos : la correction s'ouvre, les blancs (de qui a joué) deviennent des
-- ratures, l'attente est rejouée ; échéance repoussée : l'embargo suit
CREATE OR REPLACE FUNCTION _rature_duel_clos()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_joueur uuid;
  v_start  timestamptz;
  t        record;
BEGIN
  BEGIN
    IF NEW.status IN ('finished', 'declined', 'expired') AND OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE ratures r SET visible_from = least(r.visible_from, now())
      FROM duel_answers a
      WHERE a.duel_id = NEW.id AND NOT a.is_correct AND r.user_id = a.user_id AND r.question_id = a.question_id;
      FOREACH v_joueur IN ARRAY ARRAY[NEW.challenger_id, NEW.opponent_id] LOOP
        CONTINUE WHEN v_joueur IS NULL;
        v_start := CASE WHEN v_joueur = NEW.challenger_id THEN NEW.challenger_started_at ELSE NEW.opponent_started_at END;
        UPDATE ratures_attente SET visible_from = least(visible_from, now())
        WHERE user_id = v_joueur AND source = 'duel' AND question_id = ANY (NEW.question_ids);
        -- blancs : seulement pour qui a commencé la partie (pas un forfait sans jouer)
        IF v_start IS NOT NULL THEN
          FOR t IN
            SELECT q.qid FROM unnest(NEW.question_ids) WITH ORDINALITY AS q(qid, pos)
            WHERE NOT EXISTS (SELECT 1 FROM duel_answers a WHERE a.duel_id = NEW.id AND a.user_id = v_joueur
                                AND a.position = q.pos - 1 AND a.selected_index IS NOT NULL)
          LOOP
            PERFORM _rature_note(v_joueur, t.qid, 'duel', false, NULL, now(), now());
          END LOOP;
        END IF;
        PERFORM _ratures_rejouer(v_joueur);
      END LOOP;
    ELSIF NEW.status NOT IN ('finished', 'declined', 'expired') AND NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      UPDATE ratures r SET visible_from = greatest(r.visible_from, _rature_duel_echeance(NEW, a.user_id))
      FROM duel_answers a
      WHERE a.duel_id = NEW.id AND NOT a.is_correct AND r.user_id = a.user_id AND r.question_id = a.question_id
        AND r.visible_from > now();
      UPDATE ratures_attente w SET visible_from = greatest(w.visible_from, _rature_duel_echeance(NEW, w.user_id))
      WHERE w.source = 'duel' AND w.user_id IN (NEW.challenger_id, NEW.opponent_id) AND w.question_id = ANY (NEW.question_ids)
        AND w.visible_from > now();
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (duel clos) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_duel_clos ON duels;
CREATE TRIGGER ratures_duel_clos AFTER UPDATE OF status, expires_at ON duels FOR EACH ROW EXECUTE FUNCTION _rature_duel_clos();

-- 3d. Séries éclair : corrigées à chaque question
CREATE OR REPLACE FUNCTION _rature_eclair()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  i     int;
  v_bon int;
BEGIN
  BEGIN
    FOR i IN 1 .. coalesce(array_length(NEW.question_ids, 1), 0) LOOP
      IF NEW.answers[i] IS NOT NULL AND (OLD.answers[i] IS NULL) THEN
        SELECT correct_index INTO v_bon FROM quiz_questions WHERE id = NEW.question_ids[i];
        PERFORM _rature_note(NEW.user_id, NEW.question_ids[i], 'eclair', NEW.answers[i] = v_bon, NEW.answers[i], now(), now());
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (série éclair) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_eclair ON eclair_series;
CREATE TRIGGER ratures_eclair AFTER UPDATE OF answers ON eclair_series FOR EACH ROW EXECUTE FUNCTION _rature_eclair();

-- 3e. Copies gardées avec leurs réponses ([{question_id, selected_index}]) :
--     sessions ciblées et examens blancs (un blanc y compte faux : rature),
--     examens en mode examen (un blanc n'y compte pas)
CREATE OR REPLACE FUNCTION _rature_copie(p_user uuid, p_answers jsonb, p_source text, p_at timestamptz, p_blancs boolean)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  x     jsonb;
  v_q   uuid;
  v_sel int;
  v_bon int;
  v_n   int;
BEGIN
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' THEN
    RETURN;
  END IF;
  FOR x IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    CONTINUE WHEN jsonb_typeof(x) <> 'object';
    v_q := CASE WHEN x->>'question_id' ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' THEN (x->>'question_id')::uuid END;
    v_sel := CASE WHEN x->>'selected_index' ~ '^[0-9]{1,3}$' THEN (x->>'selected_index')::int END;
    CONTINUE WHEN v_q IS NULL;
    CONTINUE WHEN v_sel IS NULL AND NOT p_blancs;
    SELECT correct_index, coalesce(array_length(choices, 1), 0) INTO v_bon, v_n FROM quiz_questions WHERE id = v_q;
    CONTINUE WHEN v_n = 0 OR (v_sel IS NOT NULL AND v_sel >= v_n);
    PERFORM _rature_note(p_user, v_q, p_source, v_sel IS NOT NULL AND v_sel = v_bon, v_sel, coalesce(p_at, now()), coalesce(p_at, now()));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION _rature_ciblee()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM _rature_copie(NEW.user_id, NEW.answers, 'ciblee', NEW.completed_at, true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (session ciblée) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_ciblee ON practice_session_results;
CREATE TRIGGER ratures_ciblee AFTER INSERT ON practice_session_results FOR EACH ROW EXECUTE FUNCTION _rature_ciblee();

CREATE OR REPLACE FUNCTION _rature_blanc()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM _rature_copie(NEW.user_id, NEW.answers, 'blanc', NEW.completed_at, true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (examen blanc) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_blanc ON mock_exam_results;
CREATE TRIGGER ratures_blanc AFTER INSERT ON mock_exam_results FOR EACH ROW EXECUTE FUNCTION _rature_blanc();

CREATE OR REPLACE FUNCTION _rature_examen()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM _rature_copie(NEW.user_id, NEW.answers, 'examen', NEW.created_at, false);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ratures (examen) : %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_examen ON quiz_attempts;
CREATE TRIGGER ratures_examen AFTER INSERT ON quiz_attempts FOR EACH ROW EXECUTE FUNCTION _rature_examen();

-- 3f. Ce que le site note lui-même (la correction est refaite ici, jamais sur
--     la foi du navigateur) : QCM par thème, sessions chronométrées, reprises
--     d'examen blanc (un blanc y compte faux)
CREATE OR REPLACE FUNCTION noter_reponses(p_items jsonb, p_source text)
RETURNS int
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_n   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source NOT IN ('qcm', 'session', 'blanc') THEN
    RAISE EXCEPTION 'Invalid source';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN 0;
  END IF;
  v_n := least(jsonb_array_length(p_items), 300);
  PERFORM _rature_copie(v_uid, (SELECT jsonb_agg(e) FROM (SELECT e FROM jsonb_array_elements(p_items) AS e LIMIT 300) x), p_source, now(), p_source = 'blanc');
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION noter_reponse(p_question_id uuid, p_selected_index int, p_source text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bon int;
  v_n   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source NOT IN ('qcm', 'session') THEN
    RAISE EXCEPTION 'Invalid source';
  END IF;
  SELECT correct_index, coalesce(array_length(choices, 1), 0) INTO v_bon, v_n FROM quiz_questions WHERE id = p_question_id;
  IF v_n = 0 OR p_selected_index IS NULL OR p_selected_index < 0 OR p_selected_index >= v_n THEN
    RETURN NULL;
  END IF;
  PERFORM _rature_note(v_uid, p_question_id, p_source, p_selected_index = v_bon, p_selected_index, now(), now());
  RETURN p_selected_index = v_bon;
END;
$$;

-- 4. Lire le carnet : les ratures visibles (retirées ou non), filtrées par
--    source, les plus récentes d'abord, par pages ; avec les comptes. Les
--    réponses dont l'embargo est levé sont rejouées d'abord.
DROP FUNCTION IF EXISTS get_ratures(text, boolean, int, int);
CREATE FUNCTION get_ratures(p_source text DEFAULT NULL, p_retirees boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
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
  PERFORM _ratures_rejouer(v_uid);

  WITH mes AS (
    SELECT * FROM ratures WHERE user_id = v_uid AND visible_from <= now()
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
    'filtre', (SELECT count(*) FROM mes WHERE (removed_at IS NOT NULL) = v_ret AND (p_source IS NULL OR p_source = ANY (sources))),
    'sources', coalesce((SELECT json_object_agg(s, n) FROM (SELECT s, count(*) AS n FROM mes, unnest(sources) AS s WHERE removed_at IS NULL GROUP BY s) x), '{}'::json),
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
      -- la question à jour si ses choix n'ont pas bougé (le choix donné garde
      -- alors son sens), sinon la copie gardée à la dernière erreur
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

-- 5. Retirer une rature du carnet (la notion est acquise), ou la remettre
CREATE OR REPLACE FUNCTION retirer_rature(p_question_id uuid, p_retirer boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE ratures SET removed_at = CASE WHEN coalesce(p_retirer, true) THEN now() END
  WHERE user_id = v_uid AND question_id = p_question_id AND visible_from <= now();
  RETURN FOUND;
END;
$$;

-- 6. L'historique : toutes les réponses déjà enregistrées, rejouées une fois
--    (les ratures existantes ne sont pas touchées). Les champs des copies
--    JSON sont lus prudemment : une copie mal formée est ignorée.
DROP TABLE IF EXISTS pg_temp._ratures_ev;
CREATE TEMP TABLE _ratures_ev AS
WITH copies AS (
  SELECT r.user_id, x AS e, 'ciblee'::text AS src, r.completed_at AS at, true AS blancs
  FROM practice_session_results r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.answers) = 'array' THEN r.answers ELSE '[]'::jsonb END) AS x
  UNION ALL
  SELECT r.user_id, x, 'blanc', r.completed_at, true
  FROM mock_exam_results r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.answers) = 'array' THEN r.answers ELSE '[]'::jsonb END) AS x
  UNION ALL
  SELECT r.user_id, x, 'examen', r.created_at, false
  FROM quiz_attempts r CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r.answers) = 'array' THEN r.answers ELSE '[]'::jsonb END) AS x
),
copies_lues AS (
  SELECT user_id, src, at, blancs,
         CASE WHEN jsonb_typeof(e) = 'object' AND e->>'question_id' ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' THEN (e->>'question_id')::uuid END AS qid,
         CASE WHEN jsonb_typeof(e) = 'object' AND e->>'selected_index' ~ '^[0-9]{1,3}$' THEN (e->>'selected_index')::int END AS sel
  FROM copies
),
defis AS (
  SELECT t.user_id, t.challenge_id, c.question_ids, c.time_limit_seconds,
         CASE WHEN c.program = 'cfa-l1-cinq' THEN 'cinq' ELSE 'defi' END AS src,
         coalesce(t.finished_at, t.started_at + make_interval(secs => coalesce(c.time_limit_seconds, 2700) + 20)) AS cloture
  FROM daily_attempts t JOIN daily_challenges c ON c.id = t.challenge_id
),
duels_joues AS (
  SELECT d.id, d.question_ids, j.user_id, j.started_at,
         CASE WHEN d.status IN ('finished', 'declined', 'expired') THEN coalesce(d.finished_at, now())
              ELSE greatest(d.expires_at, coalesce(j.started_at, now()) + make_interval(secs => coalesce(d.time_limit_seconds, 2700) + 20)) END AS cloture,
         d.status IN ('finished', 'declined', 'expired') AS clos
  FROM duels d
  CROSS JOIN LATERAL (VALUES (d.challenger_id, d.challenger_started_at), (d.opponent_id, d.opponent_started_at)) AS j(user_id, started_at)
  WHERE j.user_id IS NOT NULL
)
-- fiches
SELECT user_id, question_id, 'fiche'::text AS src, is_correct AS ok, selected_index AS sel, least(answered_at, now()) AS at, least(answered_at, now()) AS vis
FROM quiz_answer_log
UNION ALL
-- défis : les réponses…
SELECT a.user_id, a.question_id, d.src, a.is_correct, a.selected_index, a.answered_at, d.cloture
FROM daily_answers a JOIN defis d ON d.challenge_id = a.challenge_id AND d.user_id = a.user_id
WHERE a.selected_index IS NOT NULL
UNION ALL
-- … et les blancs des copies closes
SELECT d.user_id, q.qid, d.src, false, NULL::int, d.cloture, d.cloture
FROM defis d CROSS JOIN LATERAL unnest(d.question_ids) WITH ORDINALITY AS q(qid, pos)
WHERE d.cloture <= now()
  AND NOT EXISTS (SELECT 1 FROM daily_answers a WHERE a.challenge_id = d.challenge_id AND a.user_id = d.user_id AND a.position = q.pos - 1 AND a.selected_index IS NOT NULL)
UNION ALL
-- duels : les réponses…
SELECT a.user_id, a.question_id, 'duel', a.is_correct, a.selected_index, a.answered_at, j.cloture
FROM duel_answers a JOIN duels_joues j ON j.id = a.duel_id AND j.user_id = a.user_id
WHERE a.selected_index IS NOT NULL
UNION ALL
-- … et les blancs des duels clos, pour qui a joué
SELECT j.user_id, q.qid, 'duel', false, NULL::int, j.cloture, j.cloture
FROM duels_joues j CROSS JOIN LATERAL unnest(j.question_ids) WITH ORDINALITY AS q(qid, pos)
WHERE j.clos AND j.started_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM duel_answers a WHERE a.duel_id = j.id AND a.user_id = j.user_id AND a.position = q.pos - 1 AND a.selected_index IS NOT NULL)
UNION ALL
-- séries éclair
SELECT e.user_id, t.qid, 'eclair', e.answers[t.pos] = qq.correct_index, e.answers[t.pos], coalesce(e.finished_at, e.started_at), coalesce(e.finished_at, e.started_at)
FROM eclair_series e
CROSS JOIN LATERAL unnest(e.question_ids) WITH ORDINALITY AS t(qid, pos)
JOIN quiz_questions qq ON qq.id = t.qid
WHERE e.answers[t.pos] IS NOT NULL
UNION ALL
-- copies (sessions ciblées, examens blancs, examens)
SELECT c.user_id, c.qid, c.src, c.sel IS NOT NULL AND c.sel = qq.correct_index, c.sel, c.at, c.at
FROM copies_lues c JOIN quiz_questions qq ON qq.id = c.qid
WHERE c.qid IS NOT NULL AND (c.sel IS NOT NULL OR c.blancs) AND (c.sel IS NULL OR c.sel < coalesce(array_length(qq.choices, 1), 0));

-- une réponse encore sous embargo sur une question déjà visible au carnet attend
ALTER TABLE _ratures_ev ADD COLUMN a_visible boolean;
UPDATE _ratures_ev v SET a_visible = x.a_visible
FROM (SELECT user_id, question_id, bool_or(NOT ok AND vis <= now()) AS a_visible FROM _ratures_ev GROUP BY user_id, question_id) x
WHERE x.user_id = v.user_id AND x.question_id = v.question_id;

INSERT INTO ratures_attente (user_id, question_id, source, correct, selected, at, visible_from)
SELECT e.user_id, e.question_id, e.src, e.ok, e.sel, e.at, e.vis
FROM _ratures_ev e
JOIN auth.users u ON u.id = e.user_id
WHERE e.vis > now() AND e.a_visible AND e.ok IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ratures r WHERE r.user_id = e.user_id AND r.question_id = e.question_id);

WITH ev2 AS (
  SELECT e.*, max(at) FILTER (WHERE NOT ok) OVER (PARTITION BY user_id, question_id) AS derniere
  FROM _ratures_ev e
  WHERE user_id IS NOT NULL AND question_id IS NOT NULL AND at IS NOT NULL AND ok IS NOT NULL
    AND (vis <= now() OR NOT a_visible)
),
manques AS (
  SELECT user_id, question_id,
         count(*) FILTER (WHERE NOT ok)                                  AS misses,
         min(at) FILTER (WHERE NOT ok)                                   AS first_missed_at,
         max(at) FILTER (WHERE NOT ok)                                   AS last_missed_at,
         (array_agg(sel ORDER BY at DESC) FILTER (WHERE NOT ok))[1]      AS last_selected,
         (array_agg(src ORDER BY at DESC) FILTER (WHERE NOT ok))[1]      AS last_source,
         array_agg(DISTINCT src ORDER BY src) FILTER (WHERE NOT ok)      AS sources,
         min(vis) FILTER (WHERE NOT ok)                                  AS visible_from,
         count(*) FILTER (WHERE ok AND at > derniere)                    AS correct_since,
         max(at) FILTER (WHERE ok AND at > derniere)                     AS last_correct_at
  FROM ev2
  GROUP BY user_id, question_id
  HAVING count(*) FILTER (WHERE NOT ok) > 0
)
INSERT INTO ratures (user_id, question_id, misses, first_missed_at, last_missed_at, last_selected, last_source, sources,
                     correct_since, last_correct_at, visible_from, prompt, choices, correct_index, explanation, set_title, folder_name)
SELECT m.user_id, m.question_id, m.misses, m.first_missed_at, m.last_missed_at, m.last_selected, m.last_source, m.sources,
       m.correct_since, m.last_correct_at, m.visible_from, q.prompt, q.choices, q.correct_index, q.explanation, qs.title, lf.name
FROM manques m
JOIN auth.users u ON u.id = m.user_id
JOIN quiz_questions q ON q.id = m.question_id
LEFT JOIN quiz_sets qs ON qs.id = q.set_id
LEFT JOIN library_folders lf ON lf.id = qs.folder_id
ON CONFLICT (user_id, question_id) DO NOTHING;

DROP TABLE IF EXISTS pg_temp._ratures_ev;

-- 7. Droits
REVOKE ALL ON FUNCTION _rature_note(uuid, uuid, text, boolean, int, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _ratures_rejouer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_copie(uuid, jsonb, text, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_duel_echeance(duels, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_fiche() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_defi() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_defi_rendu() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_duel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_duel_clos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_eclair() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_ciblee() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_blanc() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_examen() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION noter_reponse(uuid, int, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION noter_reponses(jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_ratures(text, boolean, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION retirer_rature(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION noter_reponse(uuid, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION noter_reponses(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ratures(text, boolean, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION retirer_rature(uuid, boolean) TO authenticated;
