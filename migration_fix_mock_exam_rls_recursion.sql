-- Fix : "infinite recursion detected in policy for relation
-- mock_exam_registrations" — même classe de bug déjà rencontrée et
-- corrigée pour flashcard_sets/quiz_sets (voir migration_fix_rls_recursion.sql).
--
-- Cause : la policy SELECT "mock_exam_registrations_read_inscrit" fait une
-- sous-requête sur mock_exam_registrations ELLE-MÊME pour vérifier si
-- l'utilisateur est inscrit à l'examen — cette sous-requête redéclenche la
-- policy RLS de la même table, qui refait une sous-requête, etc. → cycle
-- détecté par Postgres au moment de planifier la requête, quelles que
-- soient les données réellement demandées. Ça cassait TOUT accès à
-- mock_exam_registrations (y compris juste vérifier sa propre inscription)
-- et, par ricochet, la policy de mock_exam_questions qui interroge
-- mock_exam_registrations dans son EXISTS.
--
-- Fix : fonction SECURITY DEFINER qui vérifie l'inscription sans
-- redéclencher la policy RLS de la table (pattern standard Supabase pour
-- casser ce type de récursion).

CREATE OR REPLACE FUNCTION public.user_registered_for_mock_exam(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "mock_exam_registrations_read_inscrit" ON mock_exam_registrations;
CREATE POLICY "mock_exam_registrations_read_inscrit" ON mock_exam_registrations
  FOR SELECT TO authenticated
  USING (user_registered_for_mock_exam(exam_id));

-- Même occasion : mock_exam_questions_read interrogeait directement
-- mock_exam_registrations dans un EXISTS (sujet aux mêmes policies RLS
-- récursives tant qu'elles n'étaient pas corrigées) — on le fait
-- maintenant passer par la même fonction SECURITY DEFINER, plus sûr et
-- plus rapide (évite une replanification RLS complète).
DROP POLICY IF EXISTS "mock_exam_questions_read" ON mock_exam_questions;
CREATE POLICY "mock_exam_questions_read" ON mock_exam_questions
  FOR SELECT TO authenticated
  USING (is_app_admin() OR user_registered_for_mock_exam(exam_id));

DROP POLICY IF EXISTS "mock_exam_results_read_inscrit" ON mock_exam_results;
CREATE POLICY "mock_exam_results_read_inscrit" ON mock_exam_results
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_registered_for_mock_exam(exam_id));
