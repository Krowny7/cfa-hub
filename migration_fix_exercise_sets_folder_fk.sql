-- Correctif : exercise_sets.folder_id existe comme colonne mais SANS la
-- contrainte de clé étrangère vers library_folders — même cause que
-- migration_fix_exercise_sets_columns.sql (table créée lors d'une exécution
-- partielle de migration_exercises_and_system.sql, avant que la contrainte
-- ne soit dans le script). Résultat concret : PostgREST ne peut pas résoudre
-- le join `library_folders(name)` utilisé par app/exercises/page.tsx, la
-- requête échoue silencieusement (systemRes.data = null) et la page affiche
-- "0" partout même quand du contenu Système existe (ex. Fixed Income).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercise_sets_folder_id_fkey'
  ) THEN
    ALTER TABLE exercise_sets
      ADD CONSTRAINT exercise_sets_folder_id_fkey
      FOREIGN KEY (folder_id) REFERENCES library_folders(id) ON DELETE SET NULL;
  END IF;
END $$;
