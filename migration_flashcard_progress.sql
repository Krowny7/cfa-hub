-- Progression des flashcards sur le compte (téléphone ET ordinateur) : la
-- boucle « À revoir » de chaque paquet (« set:<id du paquet> ») et de chaque
-- matière (« matiere:<clé> », /flashcards/matiere/<clé>), telle que
-- lib/flashcards/boucle.ts la décrit (tour, file, marques, fin…).
-- Écrite par le site (action serveur et balise de fermeture, avec la session
-- du joueur : RLS), lue par les pages /flashcards (« Tour 2 · 4 à revoir »,
-- « Tour 1 · 8 restantes », « Maîtrisé · 12 oct. »). Une boucle finie reste
-- en base ; « Recommencer » la remplace par une boucle neuve.
-- Chaque état porte sa version (state.maj) et celle du compte sur laquelle il
-- s'appuie (state.base) : un état bâti sur une version dépassée (onglet resté
-- ouvert pendant qu'on avançait sur l'autre appareil, ou envoi arrivé après
-- un plus récent) est ignoré, la ligne ne bouge pas (voir le déclencheur).
-- Tant que ce fichier n'est pas collé, le site garde la progression sur
-- l'appareil seulement (localStorage), comme avant.
-- À coller une fois dans le SQL Editor de Supabase. Idempotent.

CREATE TABLE IF NOT EXISTS flashcard_progress (
  user_id    uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_key   text        NOT NULL,
  state      jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, deck_key),
  -- « set:<uuid> » ou « matiere:<clé du programme> », rien d'autre
  CONSTRAINT flashcard_progress_deck_key CHECK (deck_key ~ '^(set:[0-9a-f-]{36}|matiere:[a-z0-9_]{1,40})$'),
  -- un objet, borné (une boucle de 60 cartes pèse quelques Ko)
  CONSTRAINT flashcard_progress_state CHECK (jsonb_typeof(state) = 'object' AND octet_length(state::text) <= 65536)
);

-- Avant chaque écriture :
-- 1. Une mise à jour qui ne s'appuie pas sur la version en base est ignorée
--    (RETURN NULL : la ligne ne bouge pas, l'upsert passe sans erreur et ne
--    rend aucune ligne ; le site relit alors le compte et le propose au
--    lieu de l'écraser) :
--    - avec state.base : la version en base (state.maj) est plus récente que
--      celle sur laquelle l'état s'appuie — écrite ailleurs depuis, ou envoi
--      arrivé après un plus récent du même onglet ;
--    - sans state.base (boucle gardée avant la synchronisation) : l'état est
--      plus ancien que celui en base.
--    « Recommencer » s'appuie sur la version connue : il passe.
-- 2. updated_at posé par la base (jamais celui du navigateur).
CREATE OR REPLACE FUNCTION flashcard_progress_horodater()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  en_base numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND jsonb_typeof(OLD.state->'maj') = 'number' THEN
    en_base := (OLD.state->>'maj')::numeric;
    IF jsonb_typeof(NEW.state->'base') = 'number' THEN
      IF en_base > (NEW.state->>'base')::numeric THEN
        RETURN NULL;
      END IF;
    ELSIF jsonb_typeof(NEW.state->'maj') = 'number' AND (NEW.state->>'maj')::numeric < en_base THEN
      RETURN NULL;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS flashcard_progress_horodater ON flashcard_progress;
CREATE TRIGGER flashcard_progress_horodater
  BEFORE INSERT OR UPDATE ON flashcard_progress
  FOR EACH ROW EXECUTE FUNCTION flashcard_progress_horodater();

ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;

-- chacun ne lit et n'écrit que ses lignes ; anon rien
REVOKE ALL ON TABLE flashcard_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE flashcard_progress TO authenticated;

DROP POLICY IF EXISTS flashcard_progress_select_own ON flashcard_progress;
CREATE POLICY flashcard_progress_select_own ON flashcard_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS flashcard_progress_insert_own ON flashcard_progress;
CREATE POLICY flashcard_progress_insert_own ON flashcard_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS flashcard_progress_update_own ON flashcard_progress;
CREATE POLICY flashcard_progress_update_own ON flashcard_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS flashcard_progress_delete_own ON flashcard_progress;
CREATE POLICY flashcard_progress_delete_own ON flashcard_progress FOR DELETE TO authenticated USING (user_id = auth.uid());
