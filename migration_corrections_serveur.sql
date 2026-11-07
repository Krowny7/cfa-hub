-- Les corrections passent par le serveur. Préparation de la fermeture de
-- quiz_questions.correct_index (migration_cle_des_questions.sql, appliquée
-- APRÈS le déploiement du code qui utilise ces fonctions).
--
-- Jusqu'ici, tout compte connecté lisait correct_index et explanation dans la
-- table (7 231 questions sur 7 231), y compris celles d'un examen blanc en
-- cours. Deux clients en dépendaient : le mode examen (ExamClient) et
-- l'éditeur de ses QCM (QuizSetManage). La session du jour (SessionClient)
-- passe par award_quiz_question_xp, qui corrige déjà côté serveur.
--
-- Rejouable : CREATE OR REPLACE, aucune donnée touchée.

-- ---------------------------------------------------------------------------
-- 1. Corriger une copie : seulement les questions que le joueur peut voir
--    (même règle que la policy questions_select), jamais une question gardée
--    par un examen blanc en cours (_questions_gardees).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.corriger_questions(p_answers jsonb)
RETURNS TABLE(question_id uuid, correct_index integer, explanation text, is_correct boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH given AS (
    SELECT (a.elem->>'question_id')::uuid AS qid,
           NULLIF(a.elem->>'selected_index', '')::int AS sel
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_answers) = 'array' THEN p_answers ELSE '[]'::jsonb END) AS a(elem)
    LIMIT 300
  )
  SELECT q.id, q.correct_index, q.explanation, (g.sel IS NOT NULL AND g.sel = q.correct_index)
  FROM given g
  JOIN quiz_questions q ON q.id = g.qid
  JOIN quiz_sets qs ON qs.id = q.set_id
  WHERE auth.uid() IS NOT NULL
    AND q.id NOT IN (SELECT _questions_gardees(auth.uid()))
    AND (
      qs.owner_id = auth.uid()
      OR qs.visibility = 'public'
      OR (qs.is_official AND qs.official_published)
      OR (qs.visibility = 'groups' AND EXISTS (
        SELECT 1 FROM quiz_set_shares qss
        JOIN group_memberships gm ON gm.group_id = qss.group_id
        WHERE qss.set_id = qs.id AND gm.user_id = auth.uid()
      ))
    );
$$;

REVOKE ALL ON FUNCTION public.corriger_questions(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.corriger_questions(jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Les questions d'un QCM à éditer, avec leur réponse et leur thème
--    (topic_id : sans lui, modifier une question effaçait son thème) : à ceux
--    qui peuvent l'éditer (même règle que canEditQuestions de
--    app/qcm/[id]/page.tsx : propriétaire, membre du groupe du QCM), plus
--    l'admin. DROP puis CREATE : les colonnes rendues ont changé depuis la
--    première version (aucune donnée touchée).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.questions_a_editer(uuid);

CREATE FUNCTION public.questions_a_editer(p_set_id uuid)
RETURNS TABLE(id uuid, prompt text, choices text[], correct_index integer, explanation text, "position" integer, topic_id smallint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.prompt, q.choices, q.correct_index, q.explanation, q.position, q.topic_id
  FROM quiz_questions q
  JOIN quiz_sets qs ON qs.id = q.set_id
  WHERE q.set_id = p_set_id
    AND auth.uid() IS NOT NULL
    AND (
      qs.owner_id = auth.uid()
      OR is_app_admin()
      OR (qs.visibility IN ('group', 'groups') AND qs.group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM group_memberships gm
        WHERE gm.group_id = qs.group_id AND gm.user_id = auth.uid()
      ))
      OR (qs.visibility = 'groups' AND EXISTS (
        SELECT 1 FROM quiz_set_shares qss
        JOIN group_memberships gm ON gm.group_id = qss.group_id
        WHERE qss.set_id = qs.id AND gm.user_id = auth.uid()
      ))
    )
  ORDER BY q.position;
$$;

REVOKE ALL ON FUNCTION public.questions_a_editer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.questions_a_editer(uuid) TO authenticated;
