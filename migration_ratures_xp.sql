-- L'XP d'une rature corrigée.
--
-- Corriger une rature (Moi › Erreurs › Mettre au propre, Atelier) ne rapportait
-- aucune XP : rature_repondre mettait seulement le carnet à jour. Désormais,
-- une BONNE réponse sur une rature rapporte l'XP d'une bonne réponse ordinaire
-- du site, au même barème que les séries éclair et l'Atelier (supabase_schema.sql
-- award_quiz_question_xp, migration_series_eclair.sql, migration_atelier.sql) :
--   difficulté du set 1 -> 10 XP ; 2 -> 15 XP ; 3 -> 20 XP
-- (10 XP si la question n'existe plus : la copie du carnet n'a pas de niveau).
-- Une mauvaise réponse ne rapporte rien.
--
-- RÈGLES
-- - Source « rature » dans xp_events, meta { question_id, topic, statut }.
-- - Seule une rature EN COURS rapporte de l'XP, au moment où on la corrige ;
--   une rature déjà corrigée (removed_at posé) n'en rapporte plus.
-- - Anti-abus : une rature qui a déjà rapporté de l'XP AUJOURD'HUI (jour de
--   Paris, Europe/Paris) n'en rapporte plus avant demain (xp_events, source
--   « rature » et meta.question_id). Le verrou posé sur la ligne de la rature
--   (FOR UPDATE) empêche un double envoi simultané de passer deux fois.
-- - La série d'encre (migration_serie_encre.sql) : le bonus (x1,5 dès 3 jours,
--   x2 dès 7 jours) est appliqué PAR LE DÉCLENCHEUR xp_events_serie_bonus, qui
--   ne multiplie que les sources qu'il connaît. Ce fichier ajoute « rature » à
--   sa liste (le corps de la fonction est relu en base et ne change que de ce
--   mot : rien n'est recopié). profiles.xp_total est tenu comme partout
--   ailleurs : l'XP de base ici, le complément du bonus par le déclencheur.
-- - rature_repondre garde sa signature, son retour et son comportement
--   (migration_v3_profil.sql). Le retour gagne :
--     xp              l'XP réellement gagnée, bonus compris (0 si rien)
--     xp_base         l'XP avant bonus (0 si rien)
--     multiplicateur  le palier appliqué (1,5 ou 2), null sans bonus
--
-- Ne compte PAS comme une des 10 questions du jour de la série d'encre : ces
-- jours se comptent dans les tables de réponses (quiz_answer_log, etc.), pas
-- dans xp_events ; Mettre au propre n'y écrit pas, comme avant. Le Codex ne
-- lit pas xp_events pour ses quêtes (il y écrit seulement, source « codex »).
--
-- À coller une fois dans le SQL Editor de Supabase, APRÈS migration_v3_profil.sql
-- (et migration_serie_encre.sql pour le bonus). Idempotent. Recoller
-- migration_v3_profil.sql ou migration_serie_encre.sql plus tard remet l'ancienne
-- version : recollez alors ce fichier.

DO $$
BEGIN
  IF to_regprocedure('public.rature_repondre(uuid, integer)') IS NULL THEN
    RAISE EXCEPTION 'rature_repondre est absente : collez d''abord migration_v3_profil.sql';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ratures' AND column_name = 'seche_le'
  ) THEN
    RAISE EXCEPTION 'ratures.seche_le est absente : collez d''abord migration_v3_profil.sql';
  END IF;
  IF to_regclass('public.xp_events') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'xp_events et profiles doivent exister (supabase/leveling.sql, supabase_schema.sql)';
  END IF;
END $$;

-- 1. Le bonus de la série d'encre s'applique aussi à la source « rature ».
--    Seulement si la série d'encre est posée ; la fonction est relue en base
--    et ne reçoit que ce mot de plus dans sa liste de sources.
DO $do$
DECLARE
  v_def  text;
  v_neuf text;
BEGIN
  IF to_regprocedure('public._xp_events_serie_bonus()') IS NULL THEN
    RAISE WARNING '%', 'série d''encre (migration_serie_encre.sql) absente : l''XP des ratures se verse sans bonus ; collez-la, puis recollez ce fichier';
    RETURN;
  END IF;
  v_def := pg_get_functiondef('public._xp_events_serie_bonus()'::regprocedure);
  IF position('''rature''' IN v_def) > 0 THEN
    RETURN;
  END IF;
  v_neuf := regexp_replace(v_def, '(source +IN +\()', '\1''rature'', ', 'g');
  IF v_neuf = v_def THEN
    RAISE WARNING '%', '_xp_events_serie_bonus : liste des sources introuvable, bonus non étendu aux ratures';
    RETURN;
  END IF;
  EXECUTE v_neuf;
END $do$;

-- 2. rature_repondre : le corps de migration_v3_profil.sql, plus l'XP.
CREATE OR REPLACE FUNCTION rature_repondre(p_question_id uuid, p_choice int)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_r      ratures;
  v_apres  ratures;
  v_q      quiz_questions;
  v_bon    int;
  v_expl   text;
  v_ok     boolean;
  v_statut text;
  -- l'XP : de base, puis réelle une fois le bonus de la série posé par le déclencheur
  v_diff   int;
  v_topic  text;
  v_ev     bigint;
  v_xp     int := 0;
  v_xp_b   int := 0;
  v_mult   numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_r FROM ratures
  WHERE user_id = v_uid AND question_id = p_question_id AND visible_from <= now()
  FOR UPDATE;
  IF v_r.question_id IS NULL THEN
    RAISE EXCEPTION 'Rature not found';
  END IF;
  IF p_choice IS NULL OR p_choice < 0 OR p_choice >= coalesce(array_length(v_r.choices, 1), 0) THEN
    RAISE EXCEPTION 'Invalid choice';
  END IF;
  -- la question à jour si ses choix n'ont pas bougé, sinon la copie gardée
  SELECT * INTO v_q FROM quiz_questions WHERE id = p_question_id;
  IF v_q.id IS NOT NULL AND v_q.choices = v_r.choices THEN
    v_bon := v_q.correct_index;
    v_expl := v_q.explanation;
  ELSE
    v_bon := v_r.correct_index;
    v_expl := v_r.explanation;
  END IF;
  v_ok := p_choice = v_bon;

  IF v_ok THEN
    UPDATE ratures
    SET removed_at = coalesce(removed_at, now()), correct_since = correct_since + 1, last_correct_at = now()
    WHERE user_id = v_uid AND question_id = p_question_id;
  ELSE
    UPDATE ratures
    SET removed_at = NULL, misses = misses + 1, last_missed_at = now(), last_selected = p_choice, correct_since = 0
    WHERE user_id = v_uid AND question_id = p_question_id;
  END IF;
  SELECT * INTO v_apres FROM ratures WHERE user_id = v_uid AND question_id = p_question_id;
  v_statut := CASE
    WHEN v_ok AND v_r.removed_at IS NULL THEN CASE WHEN v_apres.removed_at IS NULL THEN 'fraiche' ELSE 'rayee' END
    WHEN v_ok THEN CASE WHEN v_r.scellee_le IS NULL AND v_apres.scellee_le IS NOT NULL THEN 'scellee' ELSE 'ancienne' END
    WHEN v_r.removed_at IS NULL THEN 'reste'
    ELSE 'revenue'
  END;

  -- L'XP d'une bonne réponse : seulement sur une rature EN COURS, qui se
  -- corrige ici (removed_at encore vide avant la réponse) ; une rature déjà
  -- corrigée ne rapporte plus rien (règle de l'utilisateur). Revenue après une
  -- erreur, elle redevient en cours ; une fois par rature et par jour de Paris
  -- au plus, pour qu'un aller-retour erreur / bonne réponse ne paie pas en boucle.
  IF v_ok AND v_r.removed_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM xp_events
    WHERE user_id = v_uid AND source = 'rature' AND meta->>'question_id' = p_question_id::text
      AND occurred_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'
  ) THEN
    SELECT qs.difficulty, lf.name INTO v_diff, v_topic
    FROM quiz_questions q
    JOIN quiz_sets qs ON qs.id = q.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE q.id = p_question_id;
    v_xp_b := CASE coalesce(v_diff, 1) WHEN 2 THEN 15 WHEN 3 THEN 20 ELSE 10 END;
    INSERT INTO xp_events (user_id, xp, source, meta)
    VALUES (v_uid, v_xp_b, 'rature',
            jsonb_build_object('question_id', p_question_id, 'topic', coalesce(v_topic, v_r.folder_name), 'statut', v_statut))
    RETURNING id INTO v_ev;
    UPDATE profiles SET xp_total = xp_total + v_xp_b WHERE id = v_uid;
    -- le déclencheur de la série d'encre a pu relever l'XP de la ligne (et ajouté le
    -- complément au total) : on relit la ligne, sans supposer ses colonnes de bonus
    SELECT e.xp, coalesce((to_jsonb(e) ->> 'xp_base')::int, e.xp), (to_jsonb(e) ->> 'multiplicateur')::numeric
    INTO v_xp, v_xp_b, v_mult
    FROM xp_events e WHERE e.id = v_ev;
  END IF;

  RETURN json_build_object('is_correct', v_ok, 'correct_index', v_bon, 'explanation', v_expl, 'selected_index', p_choice,
                           'statut', v_statut, 'seche_le', v_apres.seche_le,
                           'xp', v_xp, 'xp_base', v_xp_b, 'multiplicateur', v_mult);
END;
$$;

REVOKE ALL ON FUNCTION rature_repondre(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rature_repondre(uuid, int) TO authenticated;
