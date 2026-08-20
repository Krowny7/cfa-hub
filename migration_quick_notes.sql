-- Presse-papier perso ultra simple pour se passer du code entre deux
-- ordinateurs connectés au même compte : un message texte, gardé 5 minutes,
-- puis supprimé. Rien à voir avec le reste du site — page volontairement
-- non listée dans la nav (accessible seulement via /scratch).

CREATE TABLE IF NOT EXISTS quick_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

ALTER TABLE quick_notes ENABLE ROW LEVEL SECURITY;

-- Un seul propriétaire, tout droit (lecture/écriture/suppression) — pas
-- besoin de fonctions dédiées, la suppression après 5 min se fait côté
-- client (lazy delete des lignes expirées à chaque chargement de page).
CREATE POLICY "quick_notes_own" ON quick_notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS quick_notes_user_expires ON quick_notes(user_id, expires_at);
