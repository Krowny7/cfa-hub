-- Profil de joueur, le social (étape 5) : les tampons, les visites et
-- « Depuis ta dernière visite ».
-- À coller dans le SQL Editor de Supabase, APRÈS migration_profil_medias.sql
-- (elle-même après migration_profil.sql et migration_duels_elo.sql).
-- Idempotente (rejouable). Ne redéfinit aucune fonction existante.
--
-- 1. profil_tampons : un petit tampon posé sur le profil d'un autre joueur
--    ou sur une entrée de son Journal. Trois tampons seulement (bravo,
--    respect, revanche), pas de texte libre ; un seul par personne et par
--    cible (on peut le changer ou le retirer). Cibles : 'profil',
--    'duel:<uuid>' (une victoire de ce joueur), 'rang:<uuid>' (une montée
--    d'ELO de ce joueur, rating_events), 'sceau:<clé>'. Écriture par
--    rl_tamponner seulement, avec un plafond de 30 tampons posés par jour
--    (jour de Paris). Lecture : les comptes par cible pour tous les joueurs
--    connectés (rl_tampons), jamais qui a tamponné ; chacun sait seulement
--    lequel il a posé lui-même.
-- 2. profil_visites : qui a vu quel profil, quel jour (un jour, jamais une
--    heure ; 90 jours gardés). Écriture par rl_visiter (jamais son propre
--    profil ; l'aperçu « voir comme les autres » ne l'appelle pas). Lecture :
--    le propriétaire seulement, et seulement un NOMBRE de joueurs
--    (rl_mes_visites), jamais leurs noms.
-- 3. profil_retours : quand le joueur a regardé son propre profil, pour
--    « Depuis ta dernière visite » (rl_mon_retour). Une visite dure tant
--    qu'on revient dans les 30 minutes : recharger la page ne remet pas le
--    résumé à zéro.
-- Aucune lecture ni écriture directe des trois tables (RLS sans politique).

-- ── 1. les tampons ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profil_tampons (
  de       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pour     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cible    text        NOT NULL CHECK (cible ~ '^(profil|sceau:[a-z0-9:_-]{1,40}|duel:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|rang:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'),
  tampon   text        NOT NULL CHECK (tampon IN ('bravo', 'respect', 'revanche')),
  cree_le  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (de, pour, cible),
  CHECK (de <> pour)
);
CREATE INDEX IF NOT EXISTS profil_tampons_pour ON profil_tampons (pour, cible);
CREATE INDEX IF NOT EXISTS profil_tampons_de_jour ON profil_tampons (de, cree_le);
ALTER TABLE profil_tampons ENABLE ROW LEVEL SECURITY;

-- Poser, changer ou retirer (p_tampon NULL) son tampon sur une cible d'un
-- autre joueur. Renvoie le tampon posé (NULL : retiré). Le plafond ne
-- compte que les nouveaux tampons du jour : changer ou retirer reste permis.
CREATE OR REPLACE FUNCTION rl_tamponner(p_pour uuid, p_cible text, p_tampon text)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_moi   uuid := auth.uid();
  -- minuit, heure de Paris
  v_jour  timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris';
  v_ref   uuid;
  v_n     int;
BEGIN
  IF v_moi IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_pour IS NULL OR p_pour = v_moi THEN RAISE EXCEPTION 'invalid player'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_pour) OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_moi) THEN
    RAISE EXCEPTION 'unknown player';
  END IF;
  IF p_cible IS NULL OR p_cible !~ '^(profil|sceau:[a-z0-9:_-]{1,40}|duel:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|rang:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$' THEN
    RAISE EXCEPTION 'invalid target';
  END IF;
  IF p_tampon IS NOT NULL AND p_tampon NOT IN ('bravo', 'respect', 'revanche') THEN RAISE EXCEPTION 'invalid stamp'; END IF;

  IF p_tampon IS NULL THEN
    DELETE FROM profil_tampons WHERE de = v_moi AND pour = p_pour AND cible = p_cible;
    RETURN NULL;
  END IF;

  -- l'entrée tamponnée appartient bien à ce joueur
  IF p_cible LIKE 'duel:%' THEN
    v_ref := substr(p_cible, 6)::uuid;
    IF NOT EXISTS (SELECT 1 FROM duels WHERE id = v_ref AND status = 'finished' AND winner_id = p_pour) THEN
      RAISE EXCEPTION 'unknown target';
    END IF;
  ELSIF p_cible LIKE 'rang:%' THEN
    v_ref := substr(p_cible, 6)::uuid;
    IF NOT EXISTS (SELECT 1 FROM rating_events WHERE id = v_ref AND user_id = p_pour AND elo_after > elo_before) THEN
      RAISE EXCEPTION 'unknown target';
    END IF;
  END IF;

  -- déjà posé : on change de tampon, qui compte comme posé maintenant
  -- (« Depuis ta dernière visite » le voit) ; le même : rien ne bouge
  UPDATE profil_tampons SET tampon = p_tampon, cree_le = now()
   WHERE de = v_moi AND pour = p_pour AND cible = p_cible AND tampon <> p_tampon;
  IF FOUND OR EXISTS (SELECT 1 FROM profil_tampons WHERE de = v_moi AND pour = p_pour AND cible = p_cible) THEN RETURN p_tampon; END IF;
  IF FOUND THEN RETURN p_tampon; END IF;

  SELECT count(*) INTO v_n FROM profil_tampons WHERE de = v_moi AND cree_le >= v_jour;
  IF v_n >= 30 THEN RAISE EXCEPTION 'daily stamp limit'; END IF;

  INSERT INTO profil_tampons (de, pour, cible, tampon) VALUES (v_moi, p_pour, p_cible, p_tampon)
  ON CONFLICT (de, pour, cible) DO UPDATE SET tampon = excluded.tampon;
  RETURN p_tampon;
END;
$$;

-- Les comptes de tampons d'un joueur, pour une liste de cibles (100 au
-- plus) : une ligne par cible tamponnée, et le tampon que j'y ai posé.
CREATE OR REPLACE FUNCTION rl_tampons(p_pour uuid, p_cibles text[])
RETURNS TABLE (cible text, bravo int, respect int, revanche int, mien text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.cible,
    (count(*) FILTER (WHERE t.tampon = 'bravo'))::int,
    (count(*) FILTER (WHERE t.tampon = 'respect'))::int,
    (count(*) FILTER (WHERE t.tampon = 'revanche'))::int,
    max(t.tampon) FILTER (WHERE t.de = auth.uid())
  FROM profil_tampons t
  WHERE auth.uid() IS NOT NULL
    AND t.pour = p_pour
    AND t.cible IN (SELECT x FROM unnest(coalesce(p_cibles, '{}'::text[])) AS x LIMIT 100)
  GROUP BY t.cible;
$$;

-- ── 2. les visites ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profil_visites (
  pour  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  de    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  jour  date NOT NULL,
  PRIMARY KEY (pour, de, jour),
  CHECK (de <> pour)
);
CREATE INDEX IF NOT EXISTS profil_visites_jour ON profil_visites (pour, jour);
ALTER TABLE profil_visites ENABLE ROW LEVEL SECURITY;

-- J'ai vu le profil de p_pour aujourd'hui (une ligne par jour au plus).
-- Son propre profil, ou un joueur inconnu : rien. Les visites de plus de
-- 90 jours partent au passage.
CREATE OR REPLACE FUNCTION rl_visiter(p_pour uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_moi  uuid := auth.uid();
  v_jour date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF v_moi IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_pour IS NULL OR p_pour = v_moi THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_pour) OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_moi) THEN RETURN; END IF;
  INSERT INTO profil_visites (pour, de, jour) VALUES (p_pour, v_moi, v_jour) ON CONFLICT DO NOTHING;
  DELETE FROM profil_visites WHERE pour = p_pour AND jour < v_jour - 90;
END;
$$;

-- Combien de joueurs ont vu MON profil sur les p_jours derniers jours
-- (aujourd'hui compris ; 1 à 90). Un nombre, jamais des noms.
CREATE OR REPLACE FUNCTION rl_mes_visites(p_jours int DEFAULT 7)
RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_moi  uuid := auth.uid();
  v_jour date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF v_moi IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN (
    SELECT count(DISTINCT de)::int FROM profil_visites
    WHERE pour = v_moi AND jour > v_jour - least(90, greatest(1, coalesce(p_jours, 7)))
  );
END;
$$;

-- ── 3. « Depuis ta dernière visite » ──────────────────────────────────
CREATE TABLE IF NOT EXISTS profil_retours (
  user_id     uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- le début de la visite d'avant (NULL : première visite)
  precedente  timestamptz,
  -- le dernier passage sur son profil
  derniere    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profil_retours ENABLE ROW LEVEL SECURITY;

-- Je regarde mon profil : ce qui s'est passé depuis ma visite précédente.
-- Note le passage. Rend un objet : depuis (NULL à la première visite),
-- visiteurs (joueurs distincts depuis le jour de la visite précédente : un
-- nombre, jamais des noms), tampons {bravo, respect, revanche} reçus
-- depuis, elo (somme des variations depuis) et elo_avant (l'ELO au début,
-- NULL sans match), victoires (duels gagnés depuis). Le compte de la
-- semaine vient de rl_mes_visites(7).
CREATE OR REPLACE FUNCTION rl_mon_retour()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_moi    uuid := auth.uid();
  v_ligne  profil_retours%ROWTYPE;
  v_depuis timestamptz;
BEGIN
  IF v_moi IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_moi) THEN RETURN NULL; END IF;

  SELECT * INTO v_ligne FROM profil_retours WHERE user_id = v_moi FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO profil_retours (user_id, precedente, derniere) VALUES (v_moi, NULL, now()) ON CONFLICT (user_id) DO NOTHING;
    v_depuis := NULL;
  ELSIF v_ligne.derniere < now() - interval '30 minutes' THEN
    -- une nouvelle visite : celle d'avant commençait à son dernier passage
    UPDATE profil_retours SET precedente = derniere, derniere = now() WHERE user_id = v_moi;
    v_depuis := v_ligne.derniere;
  ELSE
    UPDATE profil_retours SET derniere = now() WHERE user_id = v_moi;
    v_depuis := v_ligne.precedente;
  END IF;

  RETURN jsonb_build_object(
    'depuis', v_depuis,
    'visiteurs', CASE WHEN v_depuis IS NULL THEN 0 ELSE (
      SELECT count(DISTINCT de) FROM profil_visites WHERE pour = v_moi AND jour >= (v_depuis AT TIME ZONE 'Europe/Paris')::date
    ) END,
    'tampons', (
      SELECT jsonb_build_object(
        'bravo', count(*) FILTER (WHERE tampon = 'bravo'),
        'respect', count(*) FILTER (WHERE tampon = 'respect'),
        'revanche', count(*) FILTER (WHERE tampon = 'revanche'))
      FROM profil_tampons WHERE pour = v_moi AND v_depuis IS NOT NULL AND cree_le > v_depuis
    ),
    'elo', (SELECT coalesce(sum(delta), 0) FROM rating_events WHERE user_id = v_moi AND v_depuis IS NOT NULL AND created_at > v_depuis),
    'elo_avant', (
      SELECT elo_before FROM rating_events WHERE user_id = v_moi AND v_depuis IS NOT NULL AND created_at > v_depuis
      ORDER BY created_at, elo_before LIMIT 1
    ),
    'victoires', (
      SELECT count(*) FROM duels WHERE winner_id = v_moi AND status = 'finished' AND v_depuis IS NOT NULL AND finished_at > v_depuis
    )
  );
END;
$$;

-- ── droits ────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION rl_tamponner(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rl_tampons(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rl_visiter(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rl_mes_visites(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rl_mon_retour() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rl_tamponner(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rl_tampons(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION rl_visiter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rl_mes_visites(int) TO authenticated;
GRANT EXECUTE ON FUNCTION rl_mon_retour() TO authenticated;
