-- Le temps passé sur le site : la tuile « Temps sur le site » de Moi et celle
-- du profil. Deux parts, gardées à part, jour par jour (jour de Paris) :
-- - secondes_mesurees : le compteur exact, depuis sa mise en ligne. L'onglet
--   où le joueur est actif (visible, avec une action dans les 2 dernières
--   minutes ou un cours qui joue ; un seul onglet compte à la fois) ajoute
--   son temps à peu près toutes les minutes (components/temps/CompteurTemps,
--   ajouter_temps) ;
-- - secondes_estimees : le passé, estimé d'après les traces horodatées
--   (réponses, séances, examens blancs, défis, séries éclair…) par
--   scripts/temps/estimer-historique.mjs (clé service). C'est un minimum.
-- Le joueur lit ses lignes ; personne n'écrit directement : ajouter_temps
-- pour le joueur, la clé service pour le script. Un autre joueur ne lit que
-- des totaux (temps_site_resume), jamais le détail par jour, et seulement si
-- la tuile « Temps sur le site » est posée sur le profil.
-- À coller une fois dans le SQL Editor de Supabase. Idempotent.

CREATE TABLE IF NOT EXISTS temps_site (
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- le jour de Paris
  jour              date        NOT NULL,
  secondes_mesurees int         NOT NULL DEFAULT 0 CHECK (secondes_mesurees BETWEEN 0 AND 86400),
  secondes_estimees int         NOT NULL DEFAULT 0 CHECK (secondes_estimees BETWEEN 0 AND 86400),
  -- jusqu'où le compteur a crédité du temps (le dernier ajout) ; NULL : rien de mesuré ce jour-là
  maj               timestamptz,
  PRIMARY KEY (user_id, jour)
);

-- chacun lit ses lignes ; aucune écriture directe (ajouter_temps, ou la clé service)
ALTER TABLE temps_site ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS temps_site_select_own ON temps_site;
CREATE POLICY temps_site_select_own ON temps_site FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON temps_site FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON temps_site FROM authenticated;

-- Le compteur : ajoute p_secondes de temps actif au jour de Paris en cours.
-- L'ajout est borné à min(p_secondes, le temps réellement écoulé depuis le
-- dernier ajout + 5 s, 120 s) : on ne gonfle pas le compteur en l'appelant
-- en boucle ni depuis deux onglets. `maj` avance d'autant (au moins jusqu'à
-- maintenant) : la marge de 5 s ne se cumule pas d'un appel à l'autre. La
-- journée plafonne à 86 400 s. Rend les secondes comptées.
CREATE OR REPLACE FUNCTION ajouter_temps(p_secondes int)
RETURNS int
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_jour    date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_dernier timestamptz;
  v_permis  int;
  v_ajout   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_secondes IS NULL OR p_secondes <= 0 THEN
    RETURN 0;
  END IF;
  -- un ajout à la fois par joueur : deux envois simultanés ne comptent pas deux fois le même temps
  PERFORM pg_advisory_xact_lock(hashtext('temps_site:' || v_uid::text));
  SELECT max(maj) INTO v_dernier FROM temps_site WHERE user_id = v_uid;
  -- le temps écoulé depuis le dernier ajout, plus 5 s de marge (le premier ajout : 2 min au plus)
  v_permis := CASE WHEN v_dernier IS NULL THEN 120 ELSE greatest(0, floor(extract(epoch FROM now() - v_dernier))::int + 5) END;
  v_ajout := least(p_secondes, v_permis, 120);
  IF v_ajout <= 0 THEN
    RETURN 0;
  END IF;
  -- le temps envoyé est déjà écoulé : il finit maintenant (greatest ignore le NULL du premier ajout)
  INSERT INTO temps_site AS t (user_id, jour, secondes_mesurees, maj)
  VALUES (v_uid, v_jour, v_ajout, greatest(now(), v_dernier + make_interval(secs => v_ajout)))
  ON CONFLICT (user_id, jour) DO UPDATE
    SET secondes_mesurees = least(86400, t.secondes_mesurees + v_ajout),
        maj = greatest(now(), v_dernier + make_interval(secs => v_ajout));
  RETURN v_ajout;
END;
$$;

-- Les totaux d'un joueur (la tuile du profil, et celle de Moi) : secondes
-- mesurées, estimées, le total, le premier jour compté, le premier jour
-- mesuré, les 7 derniers jours (Paris, aujourd'hui compris) et le jour de
-- l'inscription. Jamais le détail par jour. Lisible par un joueur connecté :
-- les siens toujours ; ceux d'un autre seulement si la tuile « Temps sur le
-- site » est sur sa page (sinon : aucune ligne).
CREATE OR REPLACE FUNCTION temps_site_resume(p_user uuid)
RETURNS TABLE (mesurees bigint, estimees bigint, total bigint, premier_jour date, premier_mesure date, semaine bigint, inscription date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL OR p_user IS NULL THEN
    RETURN;
  END IF;
  IF p_user <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profile_style s WHERE s.user_id = p_user AND s.layout @> '[{"k": "temps"}]'::jsonb
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    coalesce(sum(t.secondes_mesurees), 0)::bigint,
    coalesce(sum(t.secondes_estimees), 0)::bigint,
    coalesce(sum(t.secondes_mesurees + t.secondes_estimees), 0)::bigint,
    min(t.jour) FILTER (WHERE t.secondes_mesurees + t.secondes_estimees > 0),
    min(t.jour) FILTER (WHERE t.secondes_mesurees > 0),
    coalesce(sum(t.secondes_mesurees + t.secondes_estimees) FILTER (WHERE t.jour > (now() AT TIME ZONE 'Europe/Paris')::date - 7), 0)::bigint,
    (SELECT (p.created_at AT TIME ZONE 'Europe/Paris')::date FROM profiles p WHERE p.id = p_user)
  FROM temps_site t
  WHERE t.user_id = p_user;
END;
$$;

REVOKE ALL ON FUNCTION ajouter_temps(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION temps_site_resume(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ajouter_temps(int) TO authenticated;
GRANT EXECUTE ON FUNCTION temps_site_resume(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
