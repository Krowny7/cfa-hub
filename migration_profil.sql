-- Profil de joueur : personnalisation, LinkedIn, amis.
-- À coller dans le SQL Editor de Supabase. Idempotente (rejouable).
--
-- 1. profile_style : la personnalisation visible de tous (bannière : motif
--    ou image et son cadrage, couleur, cadre du sceau, vitrine, radar, bio). Lecture : tous les joueurs
--    connectés. Écriture : le serveur seulement (client service role), après
--    avoir vérifié que les pièces choisies sont bien débloquées.
-- 2. friendships : demandes d'ami et amitiés. Chacun voit les siennes.
--    Écritures par trois fonctions (rl_friend_request / accept / remove) :
--    on ne demande qu'en son nom, seul le destinataire accepte, chacun des
--    deux peut retirer (annuler, refuser, ne plus être amis).
-- 3. profile_links : le LinkedIn et sa visibilité (public, amis, moi seul),
--    filtrée par la base elle-même (RLS). Écriture : le serveur seulement.
-- 4. profile_names : prénom et nom sous le pseudo, pour tous ou les amis
--    (même filtrage par la base). Écriture : le serveur seulement.

-- ── 1. profile_style ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_style (
  user_id     uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  banner      text        NOT NULL DEFAULT 'papier',
  accent      text        NOT NULL DEFAULT 'encre',
  frame       text        NOT NULL DEFAULT 'aucun',
  showcase    text[]      NOT NULL DEFAULT '{}',
  bio         text        CHECK (bio IS NULL OR char_length(bio) <= 160),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
-- bannière : une image envoyée par le joueur (bucket avatars, dans son
-- dossier), cadrée verticalement (0 = haut, 100 = bas) ; radar affiché ou non
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS banner_pos smallint NOT NULL DEFAULT 50 CHECK (banner_pos BETWEEN 0 AND 100);
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS show_radar boolean NOT NULL DEFAULT true;
ALTER TABLE profile_style ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_style_select" ON profile_style;
CREATE POLICY "profile_style_select" ON profile_style FOR SELECT TO authenticated USING (true);

-- ── 2. friendships ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  requester     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  PRIMARY KEY (requester, addressee),
  CHECK (requester <> addressee)
);
-- une seule relation par paire, dans un sens ou dans l'autre
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair ON friendships (LEAST(requester, addressee), GREATEST(requester, addressee));
CREATE INDEX IF NOT EXISTS friendships_addressee ON friendships (addressee, status);
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friendships_select" ON friendships;
CREATE POLICY "friendships_select" ON friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester, addressee));
-- écritures : par les fonctions ci-dessous seulement (pas de politique
-- d'insertion ni de mise à jour : un destinataire ne peut pas réécrire
-- l'expéditeur d'une demande)
DROP POLICY IF EXISTS "friendships_insert" ON friendships;
DROP POLICY IF EXISTS "friendships_accept" ON friendships;
DROP POLICY IF EXISTS "friendships_delete" ON friendships;

-- Demander en ami. Si l'autre m'a déjà demandé, c'est accepté d'office.
-- Renvoie l'état de la relation : 'envoyee' ou 'amis'.
CREATE OR REPLACE FUNCTION rl_friend_request(p_other uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_row friendships%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_other IS NULL OR p_other = v_me THEN RAISE EXCEPTION 'invalid player'; END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_other) THEN RAISE EXCEPTION 'unknown player'; END IF;
  SELECT * INTO v_row FROM friendships
   WHERE (requester = v_me AND addressee = p_other) OR (requester = p_other AND addressee = v_me);
  IF FOUND THEN
    IF v_row.status = 'accepted' THEN RETURN 'amis'; END IF;
    IF v_row.requester = p_other THEN
      UPDATE friendships SET status = 'accepted', responded_at = now() WHERE requester = p_other AND addressee = v_me;
      RETURN 'amis';
    END IF;
    RETURN 'envoyee';
  END IF;
  INSERT INTO friendships (requester, addressee) VALUES (v_me, p_other);
  RETURN 'envoyee';
END;
$$;

-- Accepter la demande reçue de p_other.
CREATE OR REPLACE FUNCTION rl_friend_accept(p_other uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE friendships SET status = 'accepted', responded_at = now()
   WHERE requester = p_other AND addressee = auth.uid() AND status = 'pending';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n > 0;
END;
$$;

-- Annuler sa demande, refuser celle reçue, ou ne plus être amis.
CREATE OR REPLACE FUNCTION rl_friend_remove(p_other uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  DELETE FROM friendships
   WHERE (requester = auth.uid() AND addressee = p_other) OR (requester = p_other AND addressee = auth.uid());
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n > 0;
END;
$$;

REVOKE ALL ON FUNCTION rl_friend_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION rl_friend_accept(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION rl_friend_remove(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rl_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rl_friend_accept(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rl_friend_remove(uuid) TO authenticated;

-- deux joueurs sont-ils amis ? (sert à la visibilité du LinkedIn)
CREATE OR REPLACE FUNCTION rl_are_friends(a uuid, b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a IS NOT NULL AND b IS NOT NULL AND EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester = a AND f.addressee = b) OR (f.requester = b AND f.addressee = a))
  );
$$;
REVOKE ALL ON FUNCTION rl_are_friends(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rl_are_friends(uuid, uuid) TO authenticated;

-- ── 3. profile_links ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_links (
  user_id              uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  linkedin_url         text        CHECK (linkedin_url IS NULL OR linkedin_url ~ '^https://([a-z]{2,3}[.])?linkedin[.]com/in/[A-Za-z0-9_%-]{2,100}/?$'),
  linkedin_visibility  text        NOT NULL DEFAULT 'friends' CHECK (linkedin_visibility IN ('public', 'friends', 'private')),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_links_select" ON profile_links;
CREATE POLICY "profile_links_select" ON profile_links FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR linkedin_visibility = 'public'
  OR (linkedin_visibility = 'friends' AND rl_are_friends(auth.uid(), user_id))
);

-- ── 4. profile_names ───────────────────────────────────────────────────
-- Prénom et nom affichés sous le pseudo (en italique), pour tous ou pour
-- les amis seulement : filtré par la base elle-même. Écriture : le serveur.
CREATE TABLE IF NOT EXISTS profile_names (
  user_id     uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  full_name   text        NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 60),
  visibility  text        NOT NULL DEFAULT 'friends' CHECK (visibility IN ('public', 'friends')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profile_names ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_names_select" ON profile_names;
CREATE POLICY "profile_names_select" ON profile_names FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR visibility = 'public'
  OR (visibility = 'friends' AND rl_are_friends(auth.uid(), user_id))
);
