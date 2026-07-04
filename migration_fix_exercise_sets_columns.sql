-- Correctif : exercise_sets a été créé lors d'une exécution partielle de
-- migration_exercises_and_system.sql, avant que les colonnes subject/
-- cfa_level/group_id ne soient dans le script (CREATE TABLE IF NOT EXISTS
-- n'a alors pas pu les ajouter aux runs suivants). Table vide, aucune perte
-- de données possible.

ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'cfa' CHECK (subject IN ('cfa', 'personal'));
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS cfa_level integer NOT NULL DEFAULT 1 CHECK (cfa_level IN (1, 2, 3));
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES study_groups(id) ON DELETE SET NULL;
