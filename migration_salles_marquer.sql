-- Salles : la correction donne l'identifiant de la question, pour pouvoir la marquer.
-- Ajoute un seul champ à etat_salle, à la correction, qui n'est lue qu'une fois la question
-- close. Le reste de la fonction ne change pas. Rejouable : ne fait rien si le champ est déjà là.

DO $migration$
DECLARE
  d text := pg_get_functiondef('public.etat_salle(uuid,integer)'::regprocedure);
BEGIN
  IF position('''question_id''' IN d) = 0 THEN
    d := replace(d, '''bonne_index'', i.bonne_index,', '''question_id'', i.question_id, ''bonne_index'', i.bonne_index,');
    EXECUTE d;
  END IF;
END
$migration$;
