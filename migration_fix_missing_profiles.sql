-- Fix : des comptes auth.users existent sans ligne profiles/ratings
-- correspondante (le trigger on_auth_user_created ne s'est visiblement pas
-- déclenché pour tous les comptes existants — probablement des comptes créés
-- avant que ce trigger ne soit installé). Résultat : ces utilisateurs
-- n'apparaissent nulle part dans l'app (page /people, classement ELO, etc.)
-- car tout repose sur une ligne profiles existante.
--
-- 1. Ré-applique la fonction + le trigger (idempotent, sans danger si déjà
--    en place) pour garantir que tout NOUVEAU compte aura bien son profil.
-- 2. Backfill : crée les lignes profiles/ratings manquantes pour les comptes
--    auth.users déjà existants.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO ratings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill des comptes existants sans profil/rating
INSERT INTO profiles (id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO ratings (user_id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;
