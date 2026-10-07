-- Présence des joueurs : « En ligne », sinon « vu il y a 3 h ». Chaque onglet
-- ouvert sur le site (et visible) signale sa présence toutes les minutes
-- (touch_presence) ; on est « en ligne » tant que le dernier signal date de
-- moins de 2 min 30. Chacun peut masquer sa présence (Moi › Réglages) : les
-- autres ne voient alors plus rien. La présence vit dans sa propre table,
-- lisible seulement par get_presence (profiles est lisible par tous).
-- À coller une fois dans le SQL Editor de Supabase. Idempotent.

CREATE TABLE IF NOT EXISTS user_presence (
  user_id      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  -- montrer sa présence aux autres joueurs
  visible      boolean     NOT NULL DEFAULT true
);

-- aucune lecture ni écriture directe : tout passe par les fonctions
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Signal de présence : au plus une écriture toutes les 30 secondes par joueur
CREATE OR REPLACE FUNCTION touch_presence()
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO user_presence (user_id, last_seen_at)
  VALUES (v_uid, now())
  ON CONFLICT (user_id) DO UPDATE
    SET last_seen_at = now()
    WHERE user_presence.last_seen_at < now() - interval '30 seconds';
END;
$$;

-- La présence d'une liste de joueurs (300 au plus). L'âge du dernier signal
-- est calculé ici, à l'heure du serveur : l'horloge du navigateur n'entre
-- pas en jeu. Un joueur qui se masque rend visible = false, sans date (sauf
-- pour lui-même). Un joueur sans signal n'apparaît pas.
CREATE OR REPLACE FUNCTION get_presence(p_ids uuid[])
RETURNS TABLE (user_id uuid, visible boolean, last_seen_at timestamptz, seconds_ago int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.visible,
    CASE WHEN p.visible OR p.user_id = auth.uid() THEN p.last_seen_at END,
    CASE WHEN p.visible OR p.user_id = auth.uid() THEN greatest(0, floor(extract(epoch FROM now() - p.last_seen_at)))::int END
  FROM user_presence p
  WHERE auth.uid() IS NOT NULL
    -- 300 identifiants au plus (unnest aplatit aussi un tableau à 2 dimensions)
    AND p.user_id IN (SELECT x FROM unnest(coalesce(p_ids, '{}'::uuid[])) AS x LIMIT 300);
$$;

-- Montrer ou masquer sa présence
CREATE OR REPLACE FUNCTION set_presence_visible(p_visible boolean)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO user_presence (user_id, visible)
  VALUES (v_uid, coalesce(p_visible, true))
  ON CONFLICT (user_id) DO UPDATE SET visible = coalesce(p_visible, true);
  RETURN coalesce(p_visible, true);
END;
$$;

-- Dernière activité d'un joueur (lobby des duels : les joueurs actifs d'abord,
-- et « il y a 3 h » sous leur nom ; duel_suggestions et duel_search_players
-- de migration_duels_elo.sql la renvoient telle quelle). La présence sur le
-- site compte aussi. Un joueur masqué n'a plus d'activité visible du tout :
-- NULL (il passe en fin de liste, rien ne s'affiche).
-- Remplace la version de migration_duels_elo.sql : recoller CE fichier après
-- tout nouveau collage de celle-ci.
CREATE OR REPLACE FUNCTION _player_last_active(p_user uuid)
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM user_presence WHERE user_id = p_user AND NOT visible) THEN NULL ELSE greatest(
    (SELECT max(occurred_at)  FROM xp_events                WHERE user_id = p_user),
    (SELECT max(completed_at) FROM practice_session_results WHERE user_id = p_user),
    (SELECT max(completed_at) FROM mock_exam_results        WHERE user_id = p_user),
    (SELECT max(answered_at)  FROM duel_answers             WHERE user_id = p_user),
    (SELECT last_seen_at      FROM user_presence            WHERE user_id = p_user)
  ) END;
$$;
REVOKE ALL ON FUNCTION _player_last_active(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION touch_presence() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_presence(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION set_presence_visible(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION touch_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION get_presence(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION set_presence_visible(boolean) TO authenticated;
