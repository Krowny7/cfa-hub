-- ============================================================
-- FIX : Récursion infinie RLS sur documents/flashcard_sets/quiz_sets
-- ============================================================
-- Symptôme : "infinite recursion detected in policy for relation X"
-- Cause : la policy SELECT de X (ex: flashcard_sets) référence sa table
-- de partage (ex: flashcard_set_shares), dont la policy SELECT référence
-- X à nouveau -> cycle détecté par Postgres au moment de planifier la
-- requête, quelles que soient les données réellement demandées.
--
-- Fix : fonctions SECURITY DEFINER qui vérifient la propriété sans
-- redéclencher la policy RLS de la table parente (pattern standard
-- Supabase pour casser ce type de récursion).
-- Exécuter dans Supabase > SQL Editor, ou via un script avec la
-- service role key.
-- ============================================================

-- ── documents / document_shares ──────────────────────────────
CREATE OR REPLACE FUNCTION public.user_owns_document(p_document_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM documents WHERE id = p_document_id AND owner_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "doc_shares_select" ON document_shares;
CREATE POLICY "doc_shares_select" ON document_shares FOR SELECT TO authenticated
  USING (user_owns_document(document_id));

DROP POLICY IF EXISTS "doc_shares_insert" ON document_shares;
CREATE POLICY "doc_shares_insert" ON document_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_document(document_id));

DROP POLICY IF EXISTS "doc_shares_delete" ON document_shares;
CREATE POLICY "doc_shares_delete" ON document_shares FOR DELETE TO authenticated
  USING (user_owns_document(document_id));

-- ── flashcard_sets / flashcard_set_shares ────────────────────
CREATE OR REPLACE FUNCTION public.user_owns_flashcard_set(p_set_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM flashcard_sets WHERE id = p_set_id AND owner_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "fset_shares_select" ON flashcard_set_shares;
CREATE POLICY "fset_shares_select" ON flashcard_set_shares FOR SELECT TO authenticated
  USING (user_owns_flashcard_set(set_id));

DROP POLICY IF EXISTS "fset_shares_insert" ON flashcard_set_shares;
CREATE POLICY "fset_shares_insert" ON flashcard_set_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_flashcard_set(set_id));

DROP POLICY IF EXISTS "fset_shares_delete" ON flashcard_set_shares;
CREATE POLICY "fset_shares_delete" ON flashcard_set_shares FOR DELETE TO authenticated
  USING (user_owns_flashcard_set(set_id));

-- ── quiz_sets / quiz_set_shares ───────────────────────────────
CREATE OR REPLACE FUNCTION public.user_owns_quiz_set(p_set_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM quiz_sets WHERE id = p_set_id AND owner_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "qset_shares_select" ON quiz_set_shares;
CREATE POLICY "qset_shares_select" ON quiz_set_shares FOR SELECT TO authenticated
  USING (user_owns_quiz_set(set_id));

DROP POLICY IF EXISTS "qset_shares_insert" ON quiz_set_shares;
CREATE POLICY "qset_shares_insert" ON quiz_set_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_quiz_set(set_id));

DROP POLICY IF EXISTS "qset_shares_delete" ON quiz_set_shares;
CREATE POLICY "qset_shares_delete" ON quiz_set_shares FOR DELETE TO authenticated
  USING (user_owns_quiz_set(set_id));
