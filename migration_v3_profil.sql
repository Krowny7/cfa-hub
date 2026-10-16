-- Codex v3, côté profil : les pièces portées, les trophées, la mémoire, la
-- maîtrise et le débrief des examens blancs.
-- À coller dans le SQL Editor de Supabase, après toutes les migrations déjà
-- en place. Ordre de collage des deux fichiers du Codex v3 :
-- migration_v3_profil.sql, puis migration_codex_v3.sql. Chacun marche aussi
-- seul. Idempotente (rejouable).
-- Le site marche sans ce fichier : chaque lecture se replie en silence sur
-- l'ancien comportement tant qu'il n'est pas collé.
--
-- 1. profile_style.titre et profile_style.folio : le titre porté sous le
--    pseudo et le folio posé sur la page (clés nues des pièces de
--    collection, lib/profil/pieces.ts). Écrits par le serveur seulement,
--    après validation (comme le reste de profile_style) ; la base n'en borne
--    que la forme. Le trait bas est permis dans un titre :
--    « maitre:fixed_income ».
-- Les sections suivantes (trophées, ratures qui sèchent, « À revoir »,
-- maîtrise, débrief des blancs) s'ajoutent à la suite, lot après lot.

-- ── 1. le titre porté et le folio ─────────────────────────────────────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS titre text;
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS folio text;
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_titre_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_titre_check CHECK (titre IS NULL OR titre ~ '^[a-z0-9:_-]{2,80}$');
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_folio_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_folio_check CHECK (folio IS NULL OR folio ~ '^[a-z0-9_-]{2,60}$');
