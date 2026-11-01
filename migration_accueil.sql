-- Accueil « Le lobby » : la relance du rival (un petit mot qui pousse l'autre à jouer).
-- Un clic sur « Relancer Marie » (carte « Ton rival ») écrit une ligne ici, par la
-- fonction relancer() : une relance par joueur relancé et par jour, trois par jour
-- au plus. La table se lit par l'expéditeur et par le destinataire (qui voit
-- « Relance de Theo ce matin » dans sa propre carte) ; personne n'y écrit
-- directement.
-- À coller une fois dans le SQL Editor de Supabase. Idempotent. Sans elle, le
-- bouton « Relancer » ne s'affiche pas et le reste de l'accueil marche.

CREATE TABLE IF NOT EXISTS relances (
  de      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  a       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  jour    date        NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Paris')::date,
  cree_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (de, a, jour),
  CHECK (de <> a)
);
CREATE INDEX IF NOT EXISTS relances_a_jour ON relances (a, jour DESC);

ALTER TABLE relances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS relances_lire ON relances;
CREATE POLICY relances_lire ON relances FOR SELECT TO authenticated USING (de = auth.uid() OR a = auth.uid());
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON relances FROM anon, authenticated;

-- Relance un joueur. Rend 'ok' (envoyée), 'deja' (déjà relancé aujourd'hui),
-- 'limite' (trois relances envoyées aujourd'hui) ou 'refus' (toi-même, ou un
-- joueur qui n'existe pas). Le jour est celui de Paris.
CREATE OR REPLACE FUNCTION relancer(p_a uuid) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_jour date := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_a IS NULL OR p_a = v_uid OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_a) THEN RETURN 'refus'; END IF;
  -- déjà relancé aujourd'hui : « deja », même quand les trois relances du jour sont parties
  IF EXISTS (SELECT 1 FROM relances WHERE de = v_uid AND a = p_a AND jour = v_jour) THEN RETURN 'deja'; END IF;
  IF (SELECT count(*) FROM relances WHERE de = v_uid AND jour = v_jour) >= 3 THEN RETURN 'limite'; END IF;
  INSERT INTO relances (de, a, jour) VALUES (v_uid, p_a, v_jour) ON CONFLICT DO NOTHING;
  RETURN CASE WHEN FOUND THEN 'ok' ELSE 'deja' END;
END $$;
REVOKE ALL ON FUNCTION relancer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION relancer(uuid) TO authenticated;
