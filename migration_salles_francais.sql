-- Salles en français (2026-11-11) : le réglage « Questions en français » tire seulement des
-- questions traduites (quiz_questions.prompt_fr, migration_questions_fr.sql) et copie leur
-- version française dans la partie : les mêmes questions, en français, pour tous les joueurs.
-- Les choix gardent leur ordre : la bonne réponse ne bouge pas.
-- Le site appelle lancer_session_fr, qui pose le réglage pour la transaction (salle.francais)
-- puis appelle lancer_session sans la changer ; le tirage et la copie le lisent. Idempotente.

-- 1. le tirage : en français, seulement les questions traduites
CREATE OR REPLACE FUNCTION public._salle_tirer_questions(p_source text, p_topics text[], p_diff text, p_n integer, p_notions text[] DEFAULT NULL::text[], p_concepts text[] DEFAULT NULL::text[])
 RETURNS TABLE(question_id uuid, topic text, diff text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.question_id, r.topic, r.diff
  FROM (
    SELECT pl.question_id,
           pl.topic,
           pl.diff,
           CASE WHEN p_diff = 'melange' OR pl.diff = p_diff THEN 0 ELSE 1 END AS ecart,
           row_number() OVER (
             PARTITION BY (CASE
                             WHEN cardinality(coalesce(p_notions, '{}')) + cardinality(coalesce(p_concepts, '{}')) = 0 THEN pl.topic
                             WHEN qq.notion = ANY (coalesce(p_notions, '{}')) THEN qq.notion
                             ELSE 'c:' || qq.concept
                           END),
                          (CASE WHEN p_diff = 'melange' OR pl.diff = p_diff THEN 0 ELSE 1 END)
             ORDER BY random()
           ) AS rn
    FROM _salle_pool(p_source) pl
    JOIN quiz_questions qq ON qq.id = pl.question_id
    WHERE pl.topic = ANY (p_topics)
      AND (
        cardinality(coalesce(p_notions, '{}')) + cardinality(coalesce(p_concepts, '{}')) = 0
        OR qq.notion = ANY (coalesce(p_notions, '{}'))
        OR qq.concept = ANY (coalesce(p_concepts, '{}'))
      )
      AND (coalesce(current_setting('salle.francais', true), '') <> '1' OR coalesce(qq.prompt_fr, '') <> '')
  ) r
  ORDER BY r.ecart, r.rn, random()
  LIMIT greatest(p_n, 0);
$function$;

-- 2. la copie : en français, l'énoncé et les choix traduits remplacent l'anglais dans la partie
CREATE OR REPLACE FUNCTION public._salle_items_francais() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE v_p text; v_c text[];
BEGIN
  IF coalesce(current_setting('salle.francais', true), '') = '1' AND NEW.origine = 'question' AND NEW.question_id IS NOT NULL THEN
    SELECT prompt_fr, choices_fr INTO v_p, v_c FROM quiz_questions WHERE id = NEW.question_id;
    IF coalesce(v_p, '') <> '' AND cardinality(v_c) = jsonb_array_length(NEW.choix) THEN
      NEW.enonce := v_p;
      NEW.choix := to_jsonb(v_c);
    END IF;
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS salle_items_francais ON public.salle_items;
CREATE TRIGGER salle_items_francais BEFORE INSERT ON public.salle_items
  FOR EACH ROW EXECUTE FUNCTION public._salle_items_francais();

-- 3. l'entrée du site : pose le réglage, lance (lancer_session vérifie les droits avec auth.uid(),
--    inchangé ici), puis le garde dans les réglages de la partie (pour Rejouer)
CREATE OR REPLACE FUNCTION public.lancer_session_fr(p_salle_id uuid, p_params jsonb, p_calculs jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE r json;
BEGIN
  PERFORM set_config('salle.francais', '1', true);
  r := lancer_session(p_salle_id, p_params, p_calculs);
  PERFORM set_config('salle.francais', '', true);
  UPDATE salle_sessions SET params = coalesce(params, '{}'::jsonb) || '{"francais": true}'::jsonb WHERE id = (r ->> 'session_id')::uuid;
  RETURN r;
END $f$;

REVOKE ALL ON FUNCTION public._salle_items_francais() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lancer_session_fr(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lancer_session_fr(uuid, jsonb, jsonb) TO authenticated;
