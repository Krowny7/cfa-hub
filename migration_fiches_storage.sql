-- Bucket privé pour les fiches PDF (contenu de référence partagé, pas
-- personnel comme "quick-files") : accessible en lecture à tout
-- utilisateur authentifié, jamais en accès public direct (le PDF contient
-- des QCM issus de notre banque officielle, pas question de le laisser
-- indexable/accessible sans compte). Chaque page /fiches/[topic] génère
-- une URL signée à la demande côté serveur.

INSERT INTO storage.buckets (id, name, public)
VALUES ('fiches', 'fiches', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "fiches_read_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fiches');

-- Écriture réservée aux admins (upload initial fait via script service-role,
-- mais on garde une policy explicite pour d'éventuelles mises à jour depuis
-- l'app plus tard).
CREATE POLICY "fiches_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'fiches' AND is_app_admin())
  WITH CHECK (bucket_id = 'fiches' AND is_app_admin());
