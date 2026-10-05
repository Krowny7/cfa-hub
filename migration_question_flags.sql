-- Questions marquées : chaque joueur marque une question qu'il a croisée
-- (juste ou fausse), dans une fiche, une session, le défi du jour, un duel,
-- un QCM ou un examen blanc, pour revoir la notion plus tard (Moi › Marquées).
-- À coller une fois dans le SQL Editor de Supabase. Idempotent.

CREATE TABLE IF NOT EXISTS question_flags (
  user_id     uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid        NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  -- où la question a été marquée : fiche, session, defi, duel, qcm, examen
  source      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS question_flags_user_created ON question_flags (user_id, created_at DESC);

ALTER TABLE question_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS question_flags_select_own ON question_flags;
CREATE POLICY question_flags_select_own ON question_flags FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS question_flags_insert_own ON question_flags;
CREATE POLICY question_flags_insert_own ON question_flags FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS question_flags_delete_own ON question_flags;
CREATE POLICY question_flags_delete_own ON question_flags FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Les questions marquées du joueur, avec leur origine. La bonne réponse et
-- l'explication ne sont rendues que pour une question à laquelle il a déjà
-- répondu quelque part (fiche, QCM et son mode examen, session, défi,
-- duel, examen blanc) :
-- marquer une question ne suffit pas à lire sa correction.
CREATE OR REPLACE FUNCTION get_flagged_questions()
RETURNS TABLE (
  question_id   uuid,
  flagged_at    timestamptz,
  source        text,
  prompt        text,
  choices       text[],
  set_title     text,
  folder_name   text,
  answered      boolean,
  correct_index integer,
  explanation   text
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT
    f.question_id,
    f.created_at,
    f.source,
    q.prompt,
    q.choices,
    s.title,
    lf.name,
    r.repondue,
    CASE WHEN r.repondue THEN q.correct_index END,
    CASE WHEN r.repondue THEN q.explanation END
  FROM question_flags f
  JOIN quiz_questions q ON q.id = f.question_id
  JOIN quiz_sets s ON s.id = q.set_id
  LEFT JOIN library_folders lf ON lf.id = s.folder_id
  CROSS JOIN LATERAL (
    SELECT (
         EXISTS (SELECT 1 FROM quiz_answer_log x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM daily_answers x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM duel_answers x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM quiz_question_progress x WHERE x.user_id = auth.uid() AND x.question_id = q.id)
      OR EXISTS (SELECT 1 FROM practice_session_results x WHERE x.user_id = auth.uid() AND x.answers @> jsonb_build_array(jsonb_build_object('question_id', q.id::text)))
      OR EXISTS (SELECT 1 FROM mock_exam_results x WHERE x.user_id = auth.uid() AND x.answers @> jsonb_build_array(jsonb_build_object('question_id', q.id::text)))
      OR EXISTS (SELECT 1 FROM quiz_attempts x WHERE x.user_id = auth.uid() AND x.answers @> jsonb_build_array(jsonb_build_object('question_id', q.id::text)))
    ) AS repondue
  ) r
  WHERE f.user_id = auth.uid()
  ORDER BY f.created_at DESC;
$$;

REVOKE ALL ON FUNCTION get_flagged_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_flagged_questions() TO authenticated;
