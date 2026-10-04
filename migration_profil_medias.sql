-- Profil de joueur, suite : la disposition de la page et les médias.
-- À coller dans le SQL Editor de Supabase, après migration_profil.sql.
-- Idempotente (rejouable).
--
-- 1. profile_style.layout : l'ordre des blocs sous l'en-tête du profil,
--    leur largeur (pleine ou demi), ceux qui sont masqués, et les médias
--    (images et GIF). Écrite par le serveur seulement, après
--    validation (comme le reste de profile_style).
-- 2. Le bucket public « profil-medias » : un dossier par joueur. La base
--    borne le poids de chaque fichier (8 Mo), les types permis (images
--    JPEG, PNG, WebP et GIF, pas de vidéo) et le nombre de fichiers
--    par joueur (12). Le serveur supprime à chaque enregistrement les
--    fichiers que la page n'utilise plus.

-- ── 1. la disposition ─────────────────────────────────────────────────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS layout jsonb;
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_layout_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_layout_check CHECK (
  layout IS NULL OR (jsonb_typeof(layout) = 'array' AND jsonb_array_length(layout) <= 20 AND pg_column_size(layout) <= 16000)
);

-- ── 2. les médias ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profil-medias', 'profil-medias', true, 8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- combien de fichiers un joueur a déjà dans son dossier
CREATE OR REPLACE FUNCTION rl_profil_medias_count(p_user uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
  SELECT count(*)::int FROM storage.objects
   WHERE bucket_id = 'profil-medias' AND (storage.foldername(name))[1] = p_user::text;
$$;
REVOKE ALL ON FUNCTION rl_profil_medias_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rl_profil_medias_count(uuid) TO authenticated;

-- envoyer : dans son dossier, 12 fichiers au plus
DROP POLICY IF EXISTS "profil_medias_insert" ON storage.objects;
CREATE POLICY "profil_medias_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profil-medias'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND rl_profil_medias_count(auth.uid()) < 12
  );
-- supprimer : dans son dossier
DROP POLICY IF EXISTS "profil_medias_delete" ON storage.objects;
CREATE POLICY "profil_medias_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profil-medias' AND (storage.foldername(name))[1] = auth.uid()::text);
