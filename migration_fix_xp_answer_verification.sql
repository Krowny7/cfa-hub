-- ============================================================
-- FIX : award_quiz_question_xp attribuait l'XP sans jamais vérifier
-- la réponse donnée par l'utilisateur.
-- ============================================================
-- Bug 1 (exploitable) : components/SessionClient.tsx appelait cette RPC
-- pour CHAQUE réponse (correcte ou non) dès que le set est officiel. La
-- fonction elle-même ne recevait que (p_set_id, p_question_id) — aucune
-- information sur la réponse choisie — donc elle ne pouvait pas refuser
-- l'XP en cas d'erreur. N'importe quel utilisateur pouvait répondre au
-- hasard et récolter l'XP à chaque fois.
--
-- Bug 2 (cassé, pas exploitable) : components/QuizSetView.tsx appelait
-- la même RPC avec des paramètres (p_question_id, p_selected_index) qui
-- ne correspondaient à AUCUNE signature réellement déployée -> l'appel
-- échouait systématiquement (vérifié via l'OpenAPI spec PostgREST),
-- donc l'XP n'était en pratique jamais attribué depuis cet écran.
--
-- Fix : la fonction reçoit maintenant la réponse choisie et vérifie
-- elle-même la bonne réponse (comparaison à quiz_questions.correct_index)
-- côté serveur, avant tout calcul d'XP. On ne fait plus jamais confiance
-- à un booléen "isCorrect" calculé côté client.
-- ============================================================

-- Supprime l'ancienne signature (2 paramètres) pour ne pas laisser une
-- version non sécurisée accessible en parallèle de la nouvelle.
DROP FUNCTION IF EXISTS award_quiz_question_xp(uuid, uuid);

CREATE OR REPLACE FUNCTION award_quiz_question_xp(
  p_set_id uuid,
  p_question_id uuid,
  p_selected_index integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_official      boolean;
  v_published     boolean;
  v_difficulty    integer;
  v_correct_index integer;
  v_is_correct    boolean;
  v_already       boolean;
  v_xp            integer := 0;
  v_xp_total      integer;
BEGIN
  -- Vérifier que le set est officiel et publié
  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM quiz_sets WHERE id = p_set_id;

  -- Récupérer la vraie bonne réponse pour CETTE question, dans CE set
  -- (le AND set_id = p_set_id empêche de "payer" une question d'un
  -- autre set avec un p_set_id officiel usurpé).
  SELECT correct_index INTO v_correct_index
  FROM quiz_questions
  WHERE id = p_question_id AND set_id = p_set_id;

  v_is_correct := (v_correct_index IS NOT NULL AND p_selected_index = v_correct_index);

  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) OR NOT v_is_correct THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', COALESCE(v_is_correct, false)
    );
  END IF;

  -- Anti-farming : question déjà réussie par cet utilisateur
  SELECT EXISTS (
    SELECT 1 FROM quiz_question_progress
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) INTO v_already;

  IF v_already THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object('xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true);
  END IF;

  -- XP selon la difficulté (défaut : 10)
  v_xp := CASE COALESCE(v_difficulty, 1)
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    ELSE 10
  END;

  INSERT INTO quiz_question_progress (user_id, question_id)
  VALUES (auth.uid(), p_question_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO xp_events (user_id, xp, source, meta)
  VALUES (
    auth.uid(), v_xp, 'quiz_question',
    jsonb_build_object('set_id', p_set_id, 'question_id', p_question_id)
  );

  UPDATE profiles
  SET xp_total = xp_total + v_xp
  WHERE id = auth.uid()
  RETURNING xp_total INTO v_xp_total;

  RETURN json_build_object('xp_awarded', v_xp, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true);
END;
$$;
