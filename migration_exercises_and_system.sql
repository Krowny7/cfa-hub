-- Migration : renommage "Officiel" -> "Système" (dossiers), colonnes système sur
-- flashcard_sets, cfa_level (préparation CFA II/III), et nouvelle feature "Exercices"
-- (calculs/formules, réponse numérique auto-corrigée avec tolérance).
--
-- À exécuter dans Supabase SQL Editor. Idempotent (IF NOT EXISTS / CREATE OR REPLACE).

-- ----------------------------------------------------------------
-- 1. Renommage des dossiers "(Officiel)" -> "(Système)"
-- ----------------------------------------------------------------
UPDATE library_folders
SET name = replace(name, '(Officiel)', '(Système)')
WHERE kind IN ('flashcards', 'quizzes') AND name LIKE '%(Officiel)%';

-- ----------------------------------------------------------------
-- 2. flashcard_sets : colonnes système (n'existaient que sur quiz_sets)
-- ----------------------------------------------------------------
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS official_published boolean NOT NULL DEFAULT false;

-- ----------------------------------------------------------------
-- 3. cfa_level : préparation invisible pour CFA Level II/III
--    (tout le contenu existant devient explicitement niveau 1 ; aucune UI de
--    sélection de niveau n'est ajoutée tant qu'il n'y a pas de contenu niveau 2)
-- ----------------------------------------------------------------
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS cfa_level integer NOT NULL DEFAULT 1 CHECK (cfa_level IN (1, 2, 3));
ALTER TABLE quiz_sets      ADD COLUMN IF NOT EXISTS cfa_level integer NOT NULL DEFAULT 1 CHECK (cfa_level IN (1, 2, 3));

-- ----------------------------------------------------------------
-- 4. library_folders.kind : autoriser 'exercises'
-- ----------------------------------------------------------------
ALTER TABLE library_folders DROP CONSTRAINT IF EXISTS library_folders_kind_check;
ALTER TABLE library_folders ADD CONSTRAINT library_folders_kind_check
  CHECK (kind IN ('documents', 'flashcards', 'quizzes', 'exercises'));

-- ----------------------------------------------------------------
-- 5. Nouvelles tables "Exercices" — miroir exact de quiz_sets/quiz_questions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercise_sets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  visibility       text        NOT NULL DEFAULT 'private'
                               CHECK (visibility IN ('private', 'groups', 'public')),
  subject          text        NOT NULL DEFAULT 'cfa'
                               CHECK (subject IN ('cfa', 'personal')),
  cfa_level        integer     NOT NULL DEFAULT 1 CHECK (cfa_level IN (1, 2, 3)),
  owner_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id         uuid        REFERENCES study_groups(id) ON DELETE SET NULL,  -- legacy
  folder_id        uuid        REFERENCES library_folders(id) ON DELETE SET NULL,
  is_official      boolean     NOT NULL DEFAULT false,
  official_published boolean   NOT NULL DEFAULT false,
  difficulty       integer     CHECK (difficulty IN (1, 2, 3)),
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_set_shares (
  set_id   uuid NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, group_id)
);

CREATE TABLE IF NOT EXISTS exercise_questions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id         uuid        NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  prompt         text        NOT NULL,
  correct_answer numeric     NOT NULL,
  tolerance      numeric     NOT NULL DEFAULT 0.01,
  unit           text,
  explanation    text,
  position       integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Progression par question (anti-farming XP), miroir quiz_question_progress
CREATE TABLE IF NOT EXISTS exercise_question_progress (
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id      uuid        NOT NULL REFERENCES exercise_questions(id) ON DELETE CASCADE,
  first_correct_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS exercise_questions_set_id_idx ON exercise_questions (set_id, position);

ALTER TABLE exercise_sets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_set_shares        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_question_progress ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 6. Helper SECURITY DEFINER (évite la récursion RLS, même pattern que
--    user_owns_quiz_set / user_owns_flashcard_set)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_owns_exercise_set(p_set_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM exercise_sets WHERE id = p_set_id AND owner_id = auth.uid());
$$;

-- ── exercise_sets ─────────────────────────────────────────────────
CREATE POLICY "exsets_select" ON exercise_sets FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR (is_official AND official_published)
    OR (
      visibility = 'groups'
      AND EXISTS (
        SELECT 1 FROM exercise_set_shares ess
        JOIN group_memberships gm ON gm.group_id = ess.group_id
        WHERE ess.set_id = exercise_sets.id AND gm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "exsets_insert_own" ON exercise_sets FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "exsets_update_own" ON exercise_sets FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "exsets_delete_own" ON exercise_sets FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── exercise_set_shares ───────────────────────────────────────────
CREATE POLICY "exset_shares_select" ON exercise_set_shares FOR SELECT TO authenticated
  USING (user_owns_exercise_set(set_id));
CREATE POLICY "exset_shares_insert" ON exercise_set_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_exercise_set(set_id));
CREATE POLICY "exset_shares_delete" ON exercise_set_shares FOR DELETE TO authenticated
  USING (user_owns_exercise_set(set_id));

-- ── exercise_questions ────────────────────────────────────────────
CREATE POLICY "exquestions_select" ON exercise_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exercise_sets es
      WHERE es.id = exercise_questions.set_id
        AND (
          es.owner_id = auth.uid()
          OR es.visibility = 'public'
          OR (es.is_official AND es.official_published)
          OR (es.visibility = 'groups' AND EXISTS (
            SELECT 1 FROM exercise_set_shares ess
            JOIN group_memberships gm ON gm.group_id = ess.group_id
            WHERE ess.set_id = es.id AND gm.user_id = auth.uid()
          ))
        )
    )
  );
CREATE POLICY "exquestions_insert_own" ON exercise_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM exercise_sets es WHERE es.id = exercise_questions.set_id AND es.owner_id = auth.uid()));
CREATE POLICY "exquestions_update_own" ON exercise_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM exercise_sets es WHERE es.id = exercise_questions.set_id AND es.owner_id = auth.uid()));
CREATE POLICY "exquestions_delete_own" ON exercise_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM exercise_sets es WHERE es.id = exercise_questions.set_id AND es.owner_id = auth.uid()));

-- ── exercise_question_progress ────────────────────────────────────
CREATE POLICY "exercise_progress_select_own" ON exercise_question_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
-- INSERT uniquement via RPC SECURITY DEFINER.

-- ----------------------------------------------------------------
-- 7. RPC award_exercise_xp — miroir exact de award_quiz_question_xp,
--    mais compare une réponse numérique (avec tolérance) au lieu d'un
--    index de choix. Le calcul de correction se fait ENTIÈREMENT côté
--    serveur (jamais via un booléen "isCorrect" calculé côté client).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_exercise_xp(
  p_set_id uuid,
  p_question_id uuid,
  p_answer numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_official      boolean;
  v_published     boolean;
  v_difficulty    integer;
  v_correct       numeric;
  v_tolerance     numeric;
  v_is_correct    boolean;
  v_already       boolean;
  v_xp            integer := 0;
  v_xp_total      integer;
BEGIN
  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM exercise_sets WHERE id = p_set_id;

  SELECT correct_answer, tolerance INTO v_correct, v_tolerance
  FROM exercise_questions
  WHERE id = p_question_id AND set_id = p_set_id;

  v_is_correct := (v_correct IS NOT NULL AND abs(p_answer - v_correct) <= COALESCE(v_tolerance, 0.01));

  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) OR NOT v_is_correct THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', COALESCE(v_is_correct, false)
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM exercise_question_progress
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) INTO v_already;

  IF v_already THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object('xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true);
  END IF;

  v_xp := CASE COALESCE(v_difficulty, 1)
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    ELSE 10
  END;

  INSERT INTO exercise_question_progress (user_id, question_id)
  VALUES (auth.uid(), p_question_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO xp_events (user_id, xp, source, meta)
  VALUES (
    auth.uid(), v_xp, 'exercise_question',
    jsonb_build_object('set_id', p_set_id, 'question_id', p_question_id)
  );

  UPDATE profiles
  SET xp_total = xp_total + v_xp
  WHERE id = auth.uid()
  RETURNING xp_total INTO v_xp_total;

  RETURN json_build_object('xp_awarded', v_xp, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true);
END;
$$;
