-- Policies RLS pour le bucket privé "courses" (cours complets : PDF +
-- audio par matière) — même pattern que migration_fiches_storage.sql.
-- Le bucket lui-même a déjà été créé (via script service-role), il ne
-- manque que les policies : sans elles, createSignedUrl() échoue pour
-- tout utilisateur authentifié normal (seule la service-role key bypass
-- RLS, d'où le "Impossible de charger le cours" en prod alors que ça
-- marchait depuis un script).

CREATE POLICY "courses_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'courses');

CREATE POLICY "courses_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'courses' AND is_app_admin())
  WITH CHECK (bucket_id = 'courses' AND is_app_admin());
