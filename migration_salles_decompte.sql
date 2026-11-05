-- Le décompte avant la première question d'une partie de Salle passe de 8 à 30 secondes.
-- Seule la constante de lancer_session change ; une partie déjà lancée garde son heure de départ.
-- Idempotent : une fois remplacée, l'ancienne valeur n'est plus trouvée.
DO $$
DECLARE
  f oid;
BEGIN
  SELECT p.oid INTO f
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'lancer_session';
  EXECUTE replace(pg_get_functiondef(f), 'c_decompte CONSTANT int := 8;', 'c_decompte CONSTANT int := 30;');
END $$;
