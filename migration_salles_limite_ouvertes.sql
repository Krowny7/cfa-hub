-- Créer une salle (2026-11-10) : la limite de 10 ne compte plus que les salles encore ouvertes,
-- avec la même règle que les listes (mes_salles, salles_publiques) : quelqu'un y est passé il y a
-- moins de 2 minutes, ou une partie y tourne. Une salle vide est masquée, pas effacée ; elle ne
-- bloque plus la création d'une nouvelle. Rien d'autre ne change. Idempotente.

CREATE OR REPLACE FUNCTION public.creer_salle(p_nom text, p_publique boolean DEFAULT false, p_description text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid  uuid := auth.uid();
  v_nom  text := btrim(coalesce(p_nom, ''));
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_id   uuid;
  v_code text;
  v_try  int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF char_length(v_nom) < 2 OR char_length(v_nom) > 40 THEN
    RAISE EXCEPTION 'Le nom de la salle compte de 2 à 40 caractères.';
  END IF;
  IF v_desc IS NOT NULL AND char_length(v_desc) > 120 THEN
    RAISE EXCEPTION 'La description fait 120 caractères au plus.';
  END IF;
  IF (
    SELECT count(*) FROM salles s
    WHERE s.admin_id = v_uid
      AND (
        _salle_derniere_vie(s.id) > now() - interval '2 minutes'
        OR EXISTS (SELECT 1 FROM salle_sessions ss WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > now())
      )
  ) >= 10 THEN
    RAISE EXCEPTION 'Tu as déjà 10 salles ouvertes : quitte-en une avant d''en créer une autre.';
  END IF;

  LOOP
    v_code := _salle_nouveau_code();
    BEGIN
      INSERT INTO salles (nom, description, code, publique, admin_id)
      VALUES (v_nom, v_desc, v_code, coalesce(p_publique, false), v_uid)
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_try := v_try + 1;
      IF v_try > 5 THEN
        RAISE EXCEPTION 'Impossible de créer la salle, réessaie.';
      END IF;
    END;
  END LOOP;

  INSERT INTO salle_membres (salle_id, user_id, role) VALUES (v_id, v_uid, 'admin');

  RETURN json_build_object('id', v_id, 'code', v_code, 'nom', v_nom, 'publique', coalesce(p_publique, false));
END;
$function$;
