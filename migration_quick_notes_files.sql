-- Ajoute la possibilité de joindre un fichier (zip, code, etc.) aux notes
-- du presse-papier perso /scratch, en plus du texte. Stockage dans un
-- bucket Supabase Storage privé, un dossier par utilisateur
-- (${user_id}/...), même durée de vie de 5 minutes que les notes texte —
-- le fichier est supprimé du storage en même temps que la ligne
-- quick_notes correspondante (voir QuickClipboard.tsx, cleanup au poll).

ALTER TABLE quick_notes ALTER COLUMN content DROP NOT NULL;
ALTER TABLE quick_notes ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE quick_notes ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE quick_notes ADD COLUMN IF NOT EXISTS file_size bigint;

INSERT INTO storage.buckets (id, name, public)
VALUES ('quick-files', 'quick-files', false)
ON CONFLICT (id) DO NOTHING;

-- Chaque utilisateur ne voit/écrit/supprime que dans son propre dossier
-- (première partie du chemin = son user_id), comme pour les avatars.
CREATE POLICY "quick_files_own_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quick-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "quick_files_own_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'quick-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "quick_files_own_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quick-files' AND (storage.foldername(name))[1] = auth.uid()::text);
