-- migration_salles_garder_parties.sql — une salle supprimée garde ses parties.
--
-- Avant : supprimer une salle (son admin, ou le dernier membre qui la quitte)
-- effaçait en cascade ses parties, leurs questions et les réponses de TOUS les
-- joueurs ; leurs stats (notions, matières, série, rencontres…) reculaient à
-- cause d'un autre joueur. Désormais la partie survit avec salle_id NULL :
-- invisible dans les Salles (les policies et les RPC passent par la salle),
-- mais toujours lue par les stats (fonctions SECURITY DEFINER, client admin).
-- Une partie encore en cours au moment de la suppression est close à l'instant
-- de la suppression (statut 'terminee', fin_at ramenée à maintenant), comme
-- arreter_session.
-- Schéma seulement (contrainte, colonne, déclencheur) ; aucune donnée effacée ;
-- idempotent. Accord de Théo le 2026-11-02 (« bien sûr que si je veux que ça compte »).

-- 1. salle_id peut être vide, et la suppression de la salle le vide au lieu
--    d'effacer la partie.
ALTER TABLE salle_sessions ALTER COLUMN salle_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salle_sessions_salle_id_fkey' AND conrelid = 'public.salle_sessions'::regclass AND confdeltype <> 'n'
  ) THEN
    ALTER TABLE salle_sessions DROP CONSTRAINT salle_sessions_salle_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salle_sessions_salle_id_fkey' AND conrelid = 'public.salle_sessions'::regclass
  ) THEN
    ALTER TABLE salle_sessions
      ADD CONSTRAINT salle_sessions_salle_id_fkey FOREIGN KEY (salle_id) REFERENCES salles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Avant la suppression d'une salle : sa partie en cours est close
--    maintenant (sinon elle resterait « en cours » sans salle).
CREATE OR REPLACE FUNCTION public._salle_clore_avant_suppression()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE salle_sessions
  SET statut = 'terminee', fin_at = least(fin_at, now())
  WHERE salle_id = OLD.id AND statut <> 'terminee';
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public._salle_clore_avant_suppression() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS salles_clore_avant_suppression ON salles;
CREATE TRIGGER salles_clore_avant_suppression
  BEFORE DELETE ON salles
  FOR EACH ROW EXECUTE FUNCTION _salle_clore_avant_suppression();
