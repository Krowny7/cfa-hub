-- Bannières composées : le joueur règle lui-même son fond, son personnage et
-- ses deux pièces (haut et bas), leur ordre, et le panneau de gauche.
-- À coller dans le SQL Editor de Supabase, après migration_profil.sql,
-- migration_profil_medias.sql et migration_v3_profil.sql. Idempotente
-- (rejouable). AUTONOME : elle reprend tout ce que fait
-- migration_bannieres_perso.sql (le personnage et l'ornement), qu'il est
-- inutile de coller avant ; ne rejouez pas migration_bannieres_perso.sql
-- après celle-ci (elle ramènerait le quota de fichiers à 14).
-- Le site marche sans ce fichier : tant qu'il n'est pas collé, Personnaliser
-- dit que la bannière composée « arrive bientôt » et chaque lecture du style
-- se replie en silence (les bannières gardent leur rendu actuel : le fond du
-- profil, l'ancien personnage s'il y en a un, le filet d'encre).
--
-- 1. profile_style.banniere : la composition, un objet jsonb (écrit par le
--    serveur seulement, après validation, comme le reste de profile_style) :
--      { "v": 1,
--        "fond":  { "image": <adresse>, "px": 0-100, "py": 0-100 },
--        "perso" | "haut" | "bas": { "image": <adresse ou « piece:<id> »>,
--                 "x", "y": position du coin haut gauche, "l": largeur,
--                 "h": hauteur (absente : proportionnelle), "r": largeur / hauteur
--                 de l'image — x, y, l, h en % de la bannière },
--        "ordre": ["cadre", "perso", "bas", "haut"],   -- du fond vers l'avant
--        "panneau": { "badges": ["sceau:assiduite", …] (3 au plus),
--                     "stats": ["elo", "duels", "sceaux"] (3 au plus) } }
--    Chaque image est un fichier du dossier du joueur dans le bucket public
--    « profil-medias » (le même que les images de sa page :
--    migration_profil_medias.sql), sous le nom exact <élément>-<instant>.<ext>
--    (fond-, perso-, haut-, bas-), ou le préréglage d'une pièce du site
--    (« piece:meca »). La base borne la forme et la taille de l'objet ; le
--    serveur vérifie en plus que chaque image est dans le dossier du joueur,
--    que les badges sont gagnés et que tout tient dans la zone de débordement
--    (lib/profil/banniere.ts). Le serveur supprime les fichiers que la
--    composition n'utilise plus à l'enregistrement.
-- 2. Reprise de migration_bannieres_perso.sql, pour qui ne l'a pas collée :
--    profile_style.perso_url / perso_taille / perso_pos (l'ancien personnage,
--    que la composition remplace) et profile_style.ornement (le cadre
--    ornemental de la bannière : filet, cartouche, laurier, fronton).
-- 3. Le quota de fichiers du dossier d'un joueur dans profil-medias passe de
--    12 (14 avec migration_bannieres_perso.sql) à 20 : les quatre images de
--    la bannière (fond, personnage, haut, bas) plus une remplaçante en
--    attente de chacune quand on les change. Sautée avec un avertissement si
--    migration_profil_medias.sql n'est pas encore collée.

-- ── 1. la composition ─────────────────────────────────────────────────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS banniere jsonb;
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_banniere_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_banniere_check CHECK (
  banniere IS NULL OR (
    jsonb_typeof(banniere) = 'object'
    AND length(banniere::text) <= 4000
    AND CASE WHEN jsonb_typeof(banniere -> 'ordre') = 'array' THEN jsonb_array_length(banniere -> 'ordre') = 4 ELSE (banniere -> 'ordre') IS NULL END
    AND ((banniere -> 'panneau') IS NULL OR jsonb_typeof(banniere -> 'panneau') = 'object')
  )
);

-- ── 2. l'ancien personnage et l'ornement (reprise de migration_bannieres_perso.sql) ──
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
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS ornement text;
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_ornement_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_ornement_check CHECK (ornement IS NULL OR ornement ~ '^[a-z0-9_-]{2,60}$');

-- ── 3. le quota de fichiers : 20 par joueur ───────────────────────────
DO $$
BEGIN
  IF to_regprocedure('rl_profil_medias_count(uuid)') IS NOT NULL THEN
    DROP POLICY IF EXISTS "profil_medias_insert" ON storage.objects;
    CREATE POLICY "profil_medias_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'profil-medias'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND rl_profil_medias_count(auth.uid()) < 20
      );
  ELSE
    RAISE WARNING 'migration_profil_medias.sql n''est pas collée : le quota de fichiers (12) n''a pas été relevé à 20. Collez-la, puis rejouez ce fichier.';
  END IF;
END $$;
