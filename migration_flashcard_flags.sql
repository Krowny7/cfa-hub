-- Flashcards marquées : chaque joueur marque une flashcard qu'il révise
-- (paquet, matière entière, liste « Le set »), pour la retrouver dans
-- Moi › Marquées et la réviser à part (/flashcards/marquees), comme les
-- questions marquées (migration_question_flags.sql).
-- Pas de fonction : le site lit ses marques avec la carte et son paquet par
-- jointure directe ; la RLS des flashcards (cards_select) ne rend que les
-- cartes des paquets lisibles (les paquets officiels sont publics).
-- Tant que ce fichier n'est pas collé, les marques sont gardées sur
-- l'appareil ; elles rejoignent le compte au premier passage après.
-- À coller une fois dans le SQL Editor de Supabase. Idempotent.

CREATE TABLE IF NOT EXISTS flashcard_flags (
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    uuid        NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  -- où la carte a été marquée : paquet, matiere, marquees, liste
  source     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, card_id)
);
CREATE INDEX IF NOT EXISTS flashcard_flags_user_created ON flashcard_flags (user_id, created_at DESC);

ALTER TABLE flashcard_flags ENABLE ROW LEVEL SECURITY;

-- chacun ne lit, n'ajoute et ne retire que ses marques ; anon rien
REVOKE ALL ON TABLE flashcard_flags FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE flashcard_flags TO authenticated;

DROP POLICY IF EXISTS flashcard_flags_select_own ON flashcard_flags;
CREATE POLICY flashcard_flags_select_own ON flashcard_flags FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS flashcard_flags_insert_own ON flashcard_flags;
CREATE POLICY flashcard_flags_insert_own ON flashcard_flags FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS flashcard_flags_delete_own ON flashcard_flags;
CREATE POLICY flashcard_flags_delete_own ON flashcard_flags FOR DELETE TO authenticated USING (user_id = auth.uid());

-- la jointure flashcard_flags → flashcards → flashcard_sets est connue de l'API tout de suite
NOTIFY pgrst, 'reload schema';
