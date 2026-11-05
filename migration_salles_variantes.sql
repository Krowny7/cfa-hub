-- Les Salles proposent aussi les séries « Variantes 1 — Session 1 » : des questions écrites pour le
-- site, rangées avec les mocks. Les trois fonctions gardent leur code, seul le motif du nom change.
-- Idempotent : une fois le motif remplacé, l'ancien n'est plus trouvé.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('_salle_params', '_salle_pool_mock', 'salle_mocks_disponibles')
  LOOP
    EXECUTE replace(pg_get_functiondef(f.oid), '^Mock [A-Z] — Session [0-9]', '^(Mock [A-Z]|Variantes [0-9]) — Session [0-9]');
  END LOOP;
END $$;
