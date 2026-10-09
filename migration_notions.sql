-- Les notions des questions (points faibles, étape 2) : chaque question de
-- QCM porte la notion qu'elle travaille (un Learning Module du programme,
-- « fixed_income:11 », voir lib/notions.ts) et, quand on le connaît, son
-- concept (le libellé d'un des 5 concepts d'une page de fiche, ou le
-- standard d'Ethics : « Duration gap = Macaulay duration − horizon »,
-- « Standards III(A) et III(B) »). Une question sans notion reste comptée
-- dans sa matière (examens blancs, séries des joueurs).
-- Les deux colonnes se lisent comme le reste de la question (mêmes règles
-- RLS) ; un joueur ne peut pas les écrire, même sur ses propres séries :
-- seuls la clé service (scripts/notions/synchroniser.mjs, les seeds) et le
-- SQL Editor les posent.
-- L'éditeur de séries écrit avec le rôle authenticated : un import JSON dans
-- une série officielle (effacer puis réinsérer) laisse notion et concept
-- vides, un énoncé modifié garde l'ancienne notion. Après une telle retouche,
-- relancer « node scripts/notions/synchroniser.mjs --ecrire » (CONTEXT.md).
-- Le remplissage vient ensuite : le fichier généré par
-- « node scripts/notions/synchroniser.mjs --sql <fichier> » (à coller après
-- celle-ci) ou « node scripts/notions/synchroniser.mjs --ecrire ».
-- À coller une fois dans le SQL Editor de Supabase, APRÈS
-- migration_ratures_reprise.sql et migration_points_faibles.sql. Idempotent.

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS notion text;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS concept text;

-- notion : « <clé de matière>:<n° du LM> » ; concept : un libellé court
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_notion_forme') THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_notion_forme
      CHECK (notion IS NULL OR notion ~ '^(ethics|quant|economics|corporate|fsa|equity|fixed_income|derivatives|alternatives|portfolio):[1-9][0-9]?$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_concept_forme') THEN
    ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_concept_forme
      CHECK (concept IS NULL OR char_length(concept) BETWEEN 1 AND 200);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS quiz_questions_notion_idx ON quiz_questions (notion) WHERE notion IS NOT NULL;

-- Un joueur (rôles authenticated et anon) n'écrit ni la notion ni le concept :
-- à l'insertion elles restent vides, à la mise à jour elles gardent leur valeur.
CREATE OR REPLACE FUNCTION _quiz_questions_notion_gardee()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.notion := NULL;
      NEW.concept := NULL;
    ELSE
      NEW.notion := OLD.notion;
      NEW.concept := OLD.concept;
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION _quiz_questions_notion_gardee() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS quiz_questions_notion_gardee ON quiz_questions;
CREATE TRIGGER quiz_questions_notion_gardee
  BEFORE INSERT OR UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION _quiz_questions_notion_gardee();
