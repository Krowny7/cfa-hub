-- migration_dossiers_systeme.sql · les dossiers « (Système) » lisibles par tous les joueurs
-- À coller une fois dans Supabase › SQL Editor ; recollable sans risque (idempotent).
--
-- Pourquoi : la politique d'origine de library_folders (supabase_schema.sql,
-- « folders_select_own ») ne laisse lire un dossier qu'à son propriétaire. Les
-- dossiers du site (« Mocks Officiels (Système) », les flashcards et QCM « … (Système) »)
-- appartiennent au compte qui les a créés : les autres joueurs ne les trouvent pas
-- par leur nom. Exemple : la page Examens officiels lit le dossier « Mocks Officiels
-- (Système) » puis ses séries ; pour tout autre joueur le dossier est invisible, la page
-- reste vide (les séries, elles, sont déjà lisibles : is_official et official_published).
--
-- Ce qui change : en plus de ses propres dossiers, un joueur connecté LIT (seulement
-- lire : ni écrire, ni supprimer) les dossiers dont le nom finit par « (Système) ».
-- Un dossier ne contient que son nom, son type et son propriétaire : rien de privé.

DROP POLICY IF EXISTS "folders_select_systeme" ON library_folders;
CREATE POLICY "folders_select_systeme" ON library_folders FOR SELECT TO authenticated
  USING (name LIKE '% (Système)');

-- PostgREST relit les politiques tout de suite
NOTIFY pgrst, 'reload schema';
