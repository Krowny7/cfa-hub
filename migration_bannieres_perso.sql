-- Bannières verticales : le personnage du joueur et l'ornement de sa bannière.
-- (Reprise et dépassée par migration_bannieres_composees.sql, autonome : collez plutôt celle-là, et ne rejouez pas ce fichier après elle.)
-- À coller dans le SQL Editor de Supabase, après migration_profil.sql,
-- migration_profil_medias.sql et migration_v3_profil.sql. Idempotente
-- (rejouable). Le site marche sans ce fichier : tant qu'il n'est pas collé,
-- Personnaliser dit que le personnage et l'ornement « arrivent bientôt » et
-- chaque lecture du style se replie en silence (pas de personnage, le filet
-- d'encre en ornement).
--
-- 1. profile_style.perso_url : le personnage de la bannière, une image
--    envoyée par le joueur (PNG détouré de préférence, WebP ou JPG, 4 Mo au
--    plus) dans SON dossier du bucket public « profil-medias » (le même que
--    les images de sa page : migration_profil_medias.sql), sous le nom exact
--    perso-<instant>.<ext>. Un seul personnage par joueur : le serveur supprime
--    l'ancien fichier à l'enregistrement. La base borne la forme de l'adresse ;
--    le serveur vérifie en plus qu'elle est dans le dossier du joueur.
--    profile_style.perso_taille : sa taille en % de la taille de base (50 à
--    160, 100 par défaut). profile_style.perso_pos : sa position verticale
--    (0 remonté, 50 posé à sa place, 100 descendu).
-- 2. profile_style.ornement : l'ornement porté, le cadre ornemental de la
--    bannière (clé nue d'une pièce « ornement » de lib/profil/pieces.ts :
--    filet, cartouche, laurier, fronton). null : le filet d'encre, libre pour
--    tous. Écrit par le serveur seulement, après validation (un ornement
--    non gagné est refusé), comme le reste de profile_style.
-- 3. Le quota de fichiers du dossier d'un joueur dans profil-medias passe de
--    12 à 14 (le personnage prend une place, plus une en attente quand on en
--    change). Sautée avec un avertissement si migration_profil_medias.sql
--    n'est pas encore collée.

-- ── 1. le personnage ──────────────────────────────────────────────────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS perso_url text;
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS perso_taille smallint NOT NULL DEFAULT 100 CHECK (perso_taille BETWEEN 50 AND 160);
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS perso_pos smallint NOT NULL DEFAULT 50 CHECK (perso_pos BETWEEN 0 AND 100);
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_perso_url_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_perso_url_check CHECK (
  perso_url IS NULL OR (
    length(perso_url) <= 500
    AND perso_url ~* '^https?://[A-Za-z0-9.:-]+/storage/v1/object/public/profil-medias/[0-9a-f-]{36}/perso-[0-9]{9,16}\.(png|webp|jpe?g)$'
  )
);

-- ── 2. l'ornement ─────────────────────────────────────────────────────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS ornement text;
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_ornement_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_ornement_check CHECK (ornement IS NULL OR ornement ~ '^[a-z0-9_-]{2,60}$');

-- ── 3. le quota de fichiers : 14 par joueur ───────────────────────────
DO $$
BEGIN
  IF to_regprocedure('rl_profil_medias_count(uuid)') IS NOT NULL THEN
    DROP POLICY IF EXISTS "profil_medias_insert" ON storage.objects;
    CREATE POLICY "profil_medias_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'profil-medias'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND rl_profil_medias_count(auth.uid()) < 14
      );
  ELSE
    RAISE WARNING 'migration_profil_medias.sql n''est pas collée : le quota de fichiers (12) n''a pas été relevé à 14. Collez-la, puis rejouez ce fichier.';
  END IF;
END $$;
