-- La mise en scène des parties : la bannière de VS et la vidéo de victoire.
-- À appliquer après migration_profil.sql. Idempotente (rejouable).
--
-- 1. profile_style.arene : le fond, l'image et le trait de la bannière de VS, la
--    vidéo de victoire (adresse, proportion, durée). Écrite par le serveur
--    seulement, après validation (lib/arene/actions.ts) ; lisible par tous les
--    joueurs connectés, comme le reste de profile_style.
-- 2. Le bucket public « arene-medias » : un dossier par joueur, 50 Mo par
--    fichier, vidéos MP4, MOV ou WebM et images JPEG, PNG ou WebP, 4 fichiers par
--    joueur (la vidéo et l'image, et leurs remplaçantes le temps d'enregistrer).
--    À part de « profil-videos » : le ménage d'« Enregistrer » y supprime ce que
--    la page du profil n'utilise pas, et il n'y garde que 2 vidéos par joueur.
--    Le serveur supprime à chaque enregistrement les fichiers remplacés.

-- ── 1. les réglages ───────────────────────────────────────────────────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS arene jsonb;
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_arene_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_arene_check CHECK (
  arene IS NULL OR (jsonb_typeof(arene) = 'object' AND pg_column_size(arene) <= 4000)
);

-- ── 2. les fichiers ───────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arene-medias', 'arene-medias', true, 52428800,
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- combien de fichiers un joueur a déjà dans son dossier
CREATE OR REPLACE FUNCTION rl_arene_medias_count(p_user uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
  SELECT count(*)::int FROM storage.objects
   WHERE bucket_id = 'arene-medias' AND (storage.foldername(name))[1] = p_user::text;
$$;
REVOKE ALL ON FUNCTION rl_arene_medias_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rl_arene_medias_count(uuid) TO authenticated;

-- envoyer : dans son dossier, 4 fichiers au plus
DROP POLICY IF EXISTS "arene_medias_insert" ON storage.objects;
CREATE POLICY "arene_medias_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'arene-medias'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND rl_arene_medias_count(auth.uid()) < 4
  );
-- supprimer : dans son dossier
DROP POLICY IF EXISTS "arene_medias_delete" ON storage.objects;
CREATE POLICY "arene_medias_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'arene-medias' AND (storage.foldername(name))[1] = auth.uid()::text);

-- que l'API connaisse tout de suite la nouvelle colonne
NOTIFY pgrst, 'reload schema';
