-- Salles : qui est vraiment sur la page d'une salle. Chaque page ouverte signale sa présence
-- toutes les 20 secondes (salle_presence). Sans signal depuis 90 secondes, on n'est plus là.
-- Une salle sans personne devient inactive, et au bout de 24 heures elle n'apparaît plus
-- dans les listes. Rien n'est supprimé : la salle, ses parties et ses statistiques restent.

ALTER TABLE public.salle_membres ADD COLUMN IF NOT EXISTS vu_le timestamptz;

-- La dernière fois qu'il s'est passé quelque chose dans une salle.
CREATE OR REPLACE FUNCTION public._salle_derniere_vie(p_salle uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT greatest(
    s.derniere_activite,
    s.created_at,
    (SELECT max(m.vu_le) FROM salle_membres m WHERE m.salle_id = s.id),
    (SELECT max(ss.started_at) FROM salle_sessions ss WHERE ss.salle_id = s.id)
  )
  FROM salles s
  WHERE s.id = p_salle;
$function$;

REVOKE ALL ON FUNCTION public._salle_derniere_vie(uuid) FROM PUBLIC, anon, authenticated;

-- Je suis sur la page (ou je viens de la quitter, avec p_parti). Renvoie qui est là.
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
  SET vu_le = CASE WHEN p_parti THEN v_now - interval '5 minutes' ELSE v_now END
  WHERE salle_id = p_salle_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RETURN '[]'::json;
  END IF;
  SELECT coalesce(json_agg(m.user_id), '[]'::json)
  INTO v_res
  FROM salle_membres m
  WHERE m.salle_id = p_salle_id AND m.vu_le > v_now - interval '90 seconds';
  RETURN v_res;
END;
$function$;

REVOKE ALL ON FUNCTION public.salle_presence(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salle_presence(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.salles_publiques()
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
  SELECT coalesce(json_agg(t ORDER BY t.en_cours DESC, t.nb_presents DESC, t.derniere_activite DESC), '[]'::json)
  INTO v_res
  FROM (
    SELECT s.id,
           s.nom,
           s.description,
           p.username AS admin_username,
           (SELECT count(*) FROM salle_membres m WHERE m.salle_id = s.id)::int AS nb_membres,
           (SELECT count(*) FROM salle_membres m WHERE m.salle_id = s.id AND m.vu_le > v_now - interval '90 seconds')::int AS nb_presents,
           EXISTS (
             SELECT 1 FROM salle_sessions ss
             WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > v_now
           ) AS en_cours,
           s.derniere_activite,
           _salle_est_membre(s.id, v_uid) AS deja_membre
    FROM salles s
    JOIN profiles p ON p.id = s.admin_id
    WHERE s.publique
      AND (
        _salle_derniere_vie(s.id) > v_now - interval '24 hours'
        OR EXISTS (
          SELECT 1 FROM salle_sessions ss
          WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > v_now
        )
      )
    ORDER BY s.derniere_activite DESC
    LIMIT 60
  ) t;
  RETURN v_res;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mes_salles()
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
  SELECT coalesce(json_agg(t ORDER BY t.en_cours DESC, t.nb_presents DESC, t.derniere_activite DESC), '[]'::json)
  INTO v_res
  FROM (
    SELECT s.id,
           s.nom,
           s.description,
           s.code,
           s.publique,
           (m.role = 'admin') AS est_admin,
           (SELECT count(*) FROM salle_membres x WHERE x.salle_id = s.id)::int AS nb_membres,
           (SELECT count(*) FROM salle_membres x WHERE x.salle_id = s.id AND x.vu_le > v_now - interval '90 seconds')::int AS nb_presents,
           EXISTS (
             SELECT 1 FROM salle_sessions ss
             WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > v_now
           ) AS en_cours,
           s.derniere_activite
    FROM salle_membres m
    JOIN salles s ON s.id = m.salle_id
    WHERE m.user_id = v_uid
      AND (
        _salle_derniere_vie(s.id) > v_now - interval '24 hours'
        OR EXISTS (
          SELECT 1 FROM salle_sessions ss
          WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > v_now
        )
      )
    LIMIT 100
  ) t;
  RETURN v_res;
END;
$function$;
