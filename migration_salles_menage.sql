-- Salles vides supprimées (2026-11-10, demandé par Théo) : une salle où personne n'est passé depuis
-- 5 minutes, sans partie en cours ni série ouverte (règle de _salle_derniere_vie), est supprimée.
-- Masquée des listes au bout de 2 minutes comme avant, effacée à 5. Les parties jouées restent
-- (salle_sessions.salle_id passe à vide, migration_salles_garder_parties.sql) ; membres et séries
-- de la salle partent avec elle. Le ménage passe à chaque signal de présence d'une salle.
-- Idempotente ; la première exécution efface les salles déjà vides.

CREATE OR REPLACE FUNCTION public._salles_menage() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE n integer;
BEGIN
  DELETE FROM salles s
  WHERE _salle_derniere_vie(s.id) < now() - interval '5 minutes'
    AND NOT EXISTS (SELECT 1 FROM salle_sessions ss WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > now());
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $f$;
REVOKE ALL ON FUNCTION public._salles_menage() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.salle_presence(p_salle_id uuid, p_parti boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE salle_membres
  SET vu_le = CASE WHEN p_parti THEN v_now - interval '90 seconds' ELSE v_now END
  WHERE salle_id = p_salle_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RETURN '[]'::json;
  END IF;

  IF NOT p_parti THEN
    BEGIN
      PERFORM _salle_passer_admin(p_salle_id);
      UPDATE salle_sessions
      SET statut = 'terminee', terminee_at = coalesce(terminee_at, fin_at)
      WHERE statut <> 'terminee' AND fin_at <= v_now;
      PERFORM _salles_menage();
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'présence en salle : %', SQLERRM;
    END;
  END IF;

  SELECT coalesce(json_agg(m.user_id), '[]'::json)
  INTO v_res
  FROM salle_membres m
  WHERE m.salle_id = p_salle_id AND m.vu_le > v_now - interval '90 seconds';
  RETURN v_res;
END;
$function$;

SELECT public._salles_menage();
