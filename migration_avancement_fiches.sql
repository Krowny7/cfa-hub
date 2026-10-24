-- L'avancement des fiches (page Réviser, carte « Fiches de révision ») : pour
-- le joueur connecté, le nombre de questions distinctes répondues dans chaque
-- set, d'après le journal des fiches (quiz_answer_log). Une ligne par set au
-- lieu de toutes ses réponses (une par réponse, doublons compris).
-- À coller une fois dans le SQL Editor de Supabase. Idempotent. Sans elle, la
-- page relit le journal (components/reviser/parcours-data.ts, vuesParSet).
-- SECURITY INVOKER : la RLS du journal (user_id = auth.uid()) s'applique.

CREATE OR REPLACE FUNCTION avancement_fiches()
RETURNS TABLE (set_id uuid, vues integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT l.set_id, count(DISTINCT l.question_id)::integer
  FROM quiz_answer_log l
  WHERE l.user_id = auth.uid()
  GROUP BY l.set_id;
$$;

REVOKE ALL ON FUNCTION avancement_fiches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION avancement_fiches() TO authenticated;
