-- ============================================================================
-- Fix: seuls les admins peuvent créer/faire passer du contenu en "Système"
--
-- Constat (revue de code) : les policies UPDATE/INSERT sur flashcard_sets,
-- quiz_sets et exercise_sets n'avaient aucun WITH CHECK. Un utilisateur pouvait
-- donc INSERT/UPDATE son propre set avec is_official=true,
-- official_published=true et un difficulty élevé, ce qui :
--   1. le fait apparaître dans le bloc "Système" vu par tout le monde,
--   2. lui permet de farmer plus d'XP via award_quiz_question_xp/award_exercise_xp
--      (le barème dépend de difficulty pour le contenu officiel).
--
-- Fix : WITH CHECK sur INSERT/UPDATE des 3 tables — un propriétaire non-admin
-- ne peut créer/laisser que des lignes is_official=false ET
-- official_published=false. Les admins (is_app_admin()) ne sont pas contraints,
-- même pattern que mock_exams_admin_write. Aucun changement pour les colonnes
-- title/visibility/subject/difficulty/folder_id sur du contenu personnel — un
-- owner reste libre de les éditer, seule l'escalade vers "Système" est bloquée.
-- ============================================================================

-- ── flashcard_sets ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "fsets_insert_own" ON flashcard_sets;
DROP POLICY IF EXISTS "fsets_update_own" ON flashcard_sets;

CREATE POLICY "fsets_insert_own" ON flashcard_sets FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE))
  );

CREATE POLICY "fsets_update_own" ON flashcard_sets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE))
  );

-- ── quiz_sets ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "qsets_insert_own" ON quiz_sets;
DROP POLICY IF EXISTS "qsets_update_own" ON quiz_sets;

CREATE POLICY "qsets_insert_own" ON quiz_sets FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE))
  );

CREATE POLICY "qsets_update_own" ON quiz_sets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE))
  );

-- ── exercise_sets ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "exsets_insert_own" ON exercise_sets;
DROP POLICY IF EXISTS "exsets_update_own" ON exercise_sets;

CREATE POLICY "exsets_insert_own" ON exercise_sets FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE))
  );

CREATE POLICY "exsets_update_own" ON exercise_sets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE))
  );
