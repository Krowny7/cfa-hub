-- revisions_dues (2026-11-08) : le CTE « fragile », lu une seule fois, était recopié dans la requête
-- et recalculé pour chaque rappel. Avec 943 rappels dus, le calcul prenait 8,7 s, au-delà du délai
-- de 8 s : accueil, Codex et défis en panne. MATERIALIZED le calcule une fois (36 ms, même résultat).
-- Idempotent : ne touche la fonction en place que si le mot manque ; droits et reste du corps inchangés.
DO $m$
DECLARE d text := pg_get_functiondef('public.revisions_dues(uuid,date,integer)'::regprocedure);
BEGIN
  IF d !~ 'fragile AS MATERIALIZED' THEN
    EXECUTE replace(d, 'fragile AS (', 'fragile AS MATERIALIZED (');
  END IF;
END $m$;
