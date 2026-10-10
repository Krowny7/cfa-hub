-- Les Sceaux du profil gardés en base (étape 3 du profil).
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_profil_medias.sql (et migration_duels_elo.sql, déjà en place).
-- Indépendante des points faibles. Idempotente (rejouable).
--
-- 1. sceaux : les paliers gagnés de chaque joueur (encre, vermillon, dorure),
--    avec la date de chaque palier. Un palier ne se perd jamais, même si la
--    maîtrise d'une matière baisse. Les seuils restent dans le site
--    (lib/profil/sceaux.ts) : le serveur recalcule et appelle
--    rl_sceaux_attribuer à la lecture d'un profil (au plus toutes les
--    10 min) et en fin de session. Le premier calcul d'un joueur est
--    rétroactif (retro : « obtenu avant le … ») et ne déclenche pas de
--    cérémonie (vu) ; les suivants, si. Lecture : tous les connectés.
--    Écriture : le serveur seulement (client service role).
-- 2. sceaux_calculs : la date du dernier calcul de chaque joueur (le cache
--    de 10 min, et le repère du premier calcul). Le serveur seulement.
-- 3. duel_mentions : les mentions du verdict de duel (Remontada, Sans faute,
--    Éclair, Sang-froid ; deux au plus par joueur et par duel, dans l'ordre
--    du verdict, components/adn/Verdict.tsx), calculées au règlement par un
--    déclencheur sur le passage du duel à « finished » : aucune fonction de
--    migration_duels_elo.sql n'est redéfinie. Remontada suit la copie
--    question par question (ordre du duel), comme le verdict. Les duels
--    déjà joués sont repris à la première application. Chacun lit les
--    siennes.
-- 4. profile_style.pins (les 3 sceaux posés dans l'en-tête, choisis par le
--    joueur ; vide : les plus rares) et profile_style.journal_visibility
--    (qui voit le Journal : public, amis, moi seul). Écrits par le serveur.
-- 5. rl_sceaux_rarete() : pour chaque palier, combien de joueurs actifs sur
--    90 jours l'ont, et combien de joueurs actifs. rl_place_au() : la place
--    au classement qu'aurait eue un ELO à une date (le sceau Coup d'éclat,
--    « battre un Top 10 »). Le serveur seulement.
-- Aucune donnée existante n'est modifiée ni supprimée. N'utilise pas
-- _player_last_active (redéfinie par migration_presence.sql).

DO $$
BEGIN
  IF to_regclass('public.profile_style') IS NULL THEN
    RAISE EXCEPTION 'Colle d''abord migration_profil.sql et migration_profil_medias.sql';
  END IF;
  IF to_regclass('public.duel_answers') IS NULL THEN
    RAISE EXCEPTION 'Colle d''abord migration_duels_elo.sql';
  END IF;
END $$;

-- ── 1. sceaux ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sceaux (
  user_id uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 'assiduite', 'matiere:fsa', 'remontada'…
  cle     text          NOT NULL CHECK (char_length(cle) BETWEEN 1 AND 64),
  -- 1 encre, 2 vermillon, 3 dorure
  palier  smallint      NOT NULL CHECK (palier BETWEEN 1 AND 3),
  -- la date d'obtention de chaque palier (autant de dates que de paliers)
  dates   timestamptz[] NOT NULL CHECK (cardinality(dates) = palier),
  -- attribué au premier calcul : les dates égales à dates[1] sont des « avant le »
  retro   boolean       NOT NULL DEFAULT false,
  -- la cérémonie d'obtention a été jouée (ou n'a pas lieu d'être)
  vu      boolean       NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, cle)
);
CREATE INDEX IF NOT EXISTS sceaux_cle_palier ON sceaux (cle, palier);
CREATE INDEX IF NOT EXISTS sceaux_a_feter ON sceaux (user_id) WHERE NOT vu;
ALTER TABLE sceaux ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sceaux_select" ON sceaux;
CREATE POLICY "sceaux_select" ON sceaux FOR SELECT TO authenticated USING (true);
-- aucune politique d'écriture : le serveur seulement

-- ── 2. sceaux_calculs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sceaux_calculs (
  user_id    uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  calcule_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sceaux_calculs ENABLE ROW LEVEL SECURITY;
-- aucune politique : le serveur seulement

-- ── 3. duel_mentions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duel_mentions (
  duel_id uuid NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mention text NOT NULL CHECK (mention IN ('eclair', 'sansFaute', 'remontada', 'sangFroid')),
  PRIMARY KEY (duel_id, user_id, mention)
);
CREATE INDEX IF NOT EXISTS duel_mentions_user ON duel_mentions (user_id, mention);
ALTER TABLE duel_mentions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "duel_mentions_select_own" ON duel_mentions;
CREATE POLICY "duel_mentions_select_own" ON duel_mentions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Les mentions d'un duel terminé, pour ses deux joueurs (comme mentionsDuel
-- dans components/adn/Verdict.tsx, sur la copie que montre duel_review) :
--   Remontada  gagné, après avoir été mené de 4 ou plus (adversaire pas forfait) ;
--   Sans faute une matière d'au moins 3 questions, toutes justes ;
--   Éclair     gagné, et plus rapide que l'adversaire ;
--   Sang-froid 10 questions ou plus, les 5 dernières justes.
-- Deux au plus, dans cet ordre. Rejouable : les mentions déjà notées restent.
CREATE OR REPLACE FUNCTION _duel_mentions_calculer(p_duel uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  d          duels%ROWTYPE;
  j          int;
  v_moi      uuid;
  v_eux      uuid;
  v_moi_sec  int;
  v_eux_sec  int;
  v_n        int;
  v_pire     int;
  v_sans     boolean;
  v_sang     boolean;
  v_mentions text[];
BEGIN
  SELECT * INTO d FROM duels WHERE id = p_duel;
  IF NOT FOUND OR d.status <> 'finished' OR d.opponent_id IS NULL THEN
    RETURN;
  END IF;
  FOR j IN 0..1 LOOP
    v_moi := CASE WHEN j = 0 THEN d.challenger_id ELSE d.opponent_id END;
    v_eux := CASE WHEN j = 0 THEN d.opponent_id ELSE d.challenger_id END;
    v_moi_sec := CASE WHEN j = 0 THEN d.challenger_seconds ELSE d.opponent_seconds END;
    v_eux_sec := CASE WHEN j = 0 THEN d.opponent_seconds ELSE d.challenger_seconds END;

    -- la copie, question par question, dans l'ordre du duel
    WITH copie AS (
      SELECT row_number() OVER (ORDER BY t.pos) AS i,
             coalesce(a.is_correct, false) AS moi_ok,
             coalesce(o.is_correct, false) AS eux_ok,
             coalesce(_rl_topic_key(lf.name), 'autre') AS matiere
      FROM unnest(d.question_ids) WITH ORDINALITY AS t(qid, pos)
      JOIN quiz_questions qq ON qq.id = t.qid
      JOIN quiz_sets qs ON qs.id = qq.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
      LEFT JOIN duel_answers a ON a.duel_id = d.id AND a.user_id = v_moi AND a.position = t.pos - 1
      LEFT JOIN duel_answers o ON o.duel_id = d.id AND o.user_id = v_eux AND o.position = t.pos - 1
    ), marche AS (
      SELECT sum(moi_ok::int - eux_ok::int) OVER (ORDER BY i) AS ecart FROM copie
    )
    SELECT (SELECT count(*) FROM copie),
           (SELECT min(ecart) FROM marche),
           EXISTS (SELECT 1 FROM copie GROUP BY matiere HAVING count(*) >= 3 AND bool_and(moi_ok)),
           coalesce((SELECT bool_and(moi_ok) FROM copie c WHERE c.i > (SELECT count(*) FROM copie) - 5), false)
    INTO v_n, v_pire, v_sans, v_sang;

    v_mentions := '{}';
    -- forfait adverse : sa copie est blanche, on ne la dépouille pas
    IF d.winner_id = v_moi AND NOT (v_eux_sec IS NULL AND v_moi_sec IS NOT NULL) AND coalesce(v_pire, 0) <= -4 THEN
      v_mentions := array_append(v_mentions, 'remontada');
    END IF;
    IF v_sans THEN
      v_mentions := array_append(v_mentions, 'sansFaute');
    END IF;
    IF d.winner_id = v_moi AND coalesce(v_moi_sec, 0) > 0 AND coalesce(v_eux_sec, 0) > 0 AND v_moi_sec < v_eux_sec THEN
      v_mentions := array_append(v_mentions, 'eclair');
    END IF;
    IF v_n >= 10 AND v_sang THEN
      v_mentions := array_append(v_mentions, 'sangFroid');
    END IF;

    INSERT INTO duel_mentions (duel_id, user_id, mention)
    SELECT d.id, v_moi, m FROM unnest(v_mentions[1:2]) AS m
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION _duel_mentions_calculer(uuid) FROM PUBLIC, anon, authenticated;

-- Au règlement : le duel passe à « finished » (_duel_settle). Une erreur ici
-- ne doit jamais empêcher le règlement : elle est avalée.
CREATE OR REPLACE FUNCTION _duel_mentions_au_reglement()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM _duel_mentions_calculer(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION _duel_mentions_au_reglement() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS duels_mentions_reglement ON duels;
CREATE TRIGGER duels_mentions_reglement
  AFTER UPDATE OF status ON duels
  FOR EACH ROW
  WHEN (NEW.status = 'finished' AND OLD.status IS DISTINCT FROM 'finished')
  EXECUTE FUNCTION _duel_mentions_au_reglement();

-- Les duels déjà joués (rejouable : rien n'est noté deux fois)
SELECT _duel_mentions_calculer(id) FROM duels WHERE status = 'finished' AND opponent_id IS NOT NULL;

-- ── 4. profile_style : les sceaux posés, la visibilité du Journal ─────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS pins text[] NOT NULL DEFAULT '{}' CHECK (cardinality(pins) <= 3);
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS journal_visibility text NOT NULL DEFAULT 'public'
  CHECK (journal_visibility IN ('public', 'friends', 'private'));

-- ── 5. attribution, rareté, place ─────────────────────────────────────
-- Attribuer les paliers calculés par le site ({ "duelliste": 2, … }) : un
-- palier ne fait que monter, chaque nouveau palier reçoit la date du jour.
-- Premier calcul du joueur : tout est rétroactif et déjà vu. Renvoie tous
-- ses sceaux.
CREATE OR REPLACE FUNCTION rl_sceaux_attribuer(p_user uuid, p_paliers jsonb)
RETURNS SETOF sceaux
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now     timestamptz := now();
  v_premier boolean;
  r         record;
  v_p       int;
  g         sceaux%ROWTYPE;
BEGIN
  IF p_user IS NULL OR p_paliers IS NULL OR jsonb_typeof(p_paliers) <> 'object' THEN
    RAISE EXCEPTION 'Paliers invalides';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;
  -- deux calculs simultanés du même joueur passent l'un après l'autre
  PERFORM pg_advisory_xact_lock(hashtext('rl_sceaux:' || p_user::text));
  v_premier := NOT EXISTS (SELECT 1 FROM sceaux_calculs WHERE user_id = p_user);
  INSERT INTO sceaux_calculs (user_id, calcule_le) VALUES (p_user, v_now)
  ON CONFLICT (user_id) DO UPDATE SET calcule_le = EXCLUDED.calcule_le;

  FOR r IN SELECT key AS cle, value AS v FROM jsonb_each(p_paliers) LOOP
    CONTINUE WHEN jsonb_typeof(r.v) <> 'number' OR char_length(r.cle) NOT BETWEEN 1 AND 64;
    v_p := least(3, greatest(0, floor((r.v)::text::numeric)::int));
    CONTINUE WHEN v_p < 1;
    SELECT * INTO g FROM sceaux WHERE user_id = p_user AND cle = r.cle;
    IF NOT FOUND THEN
      INSERT INTO sceaux (user_id, cle, palier, dates, retro, vu)
      VALUES (p_user, r.cle, v_p, array_fill(v_now, ARRAY[v_p]), v_premier, v_premier);
    ELSIF v_p > g.palier THEN
      UPDATE sceaux
      SET palier = v_p, dates = g.dates || array_fill(v_now, ARRAY[v_p - g.palier]), vu = false
      WHERE user_id = p_user AND cle = r.cle;
    END IF;
  END LOOP;

  RETURN QUERY SELECT * FROM sceaux WHERE user_id = p_user ORDER BY cle;
END;
$$;
REVOKE ALL ON FUNCTION rl_sceaux_attribuer(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rl_sceaux_attribuer(uuid, jsonb) TO service_role;

-- La cérémonie jouée : ces sceaux ne se fêtent plus.
CREATE OR REPLACE FUNCTION rl_sceaux_vus(p_user uuid, p_cles text[])
RETURNS int
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  WITH m AS (
    UPDATE sceaux SET vu = true
    WHERE user_id = p_user AND cle = ANY (coalesce(p_cles, '{}')) AND NOT vu
    RETURNING 1
  )
  SELECT count(*)::int FROM m;
$$;
REVOKE ALL ON FUNCTION rl_sceaux_vus(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rl_sceaux_vus(uuid, text[]) TO service_role;

-- La rareté : les joueurs actifs sur 90 jours (réponses, sessions, examens
-- blancs, duels), et pour chaque palier combien d'entre eux l'ont atteint.
CREATE OR REPLACE FUNCTION rl_sceaux_rarete()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH actifs AS (
    SELECT user_id FROM xp_events WHERE occurred_at > now() - interval '90 days'
    UNION SELECT user_id FROM practice_session_results WHERE completed_at > now() - interval '90 days'
    UNION SELECT user_id FROM mock_exam_results WHERE completed_at > now() - interval '90 days'
    UNION SELECT user_id FROM duel_answers WHERE answered_at > now() - interval '90 days'
  ), paliers AS (
    SELECT s.cle, p.palier, count(*)::int AS n
    FROM sceaux s
    JOIN actifs a ON a.user_id = s.user_id
    CROSS JOIN LATERAL generate_series(1, s.palier) AS p(palier)
    GROUP BY s.cle, p.palier
  )
  SELECT json_build_object(
    'actifs', (SELECT count(*)::int FROM actifs WHERE user_id IS NOT NULL),
    'paliers', coalesce((SELECT json_agg(json_build_object('cle', cle, 'palier', palier, 'n', n)) FROM paliers), '[]'::json)
  );
$$;
REVOKE ALL ON FUNCTION rl_sceaux_rarete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rl_sceaux_rarete() TO service_role;

-- La place au classement qu'aurait eue l'ELO p_elo au moment p_moment :
-- 1 + les joueurs (hors p_exclus) dont le dernier ELO connu à ce moment
-- (rating_events) était plus haut.
CREATE OR REPLACE FUNCTION rl_place_au(p_elo int, p_moment timestamptz, p_exclus uuid[] DEFAULT '{}')
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 1 + count(*)::int
  FROM (
    SELECT DISTINCT ON (user_id) user_id, elo_after
    FROM rating_events
    WHERE created_at <= p_moment AND NOT (user_id = ANY (coalesce(p_exclus, '{}')))
    ORDER BY user_id, created_at DESC
  ) dernier
  WHERE elo_after > p_elo;
$$;
REVOKE ALL ON FUNCTION rl_place_au(int, timestamptz, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rl_place_au(int, timestamptz, uuid[]) TO service_role;
