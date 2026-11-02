-- migration_moi_activite.sql · page Moi « La synthèse », carte « Tes matières »
-- À coller une fois dans Supabase › SQL Editor ; recollable sans risque (idempotent).
-- Prérequis : migration_v3_profil.sql §4 (_reponses_cache). Sans lui, la fonction rend
-- NULL et la carte garde son affichage d'avant (aucun nombre de réponses, aucun chiffre inventé).
-- Ne modifie aucune fonction existante. Minimum : 1 fonction, appelée par le client de
-- service seulement (comme maitrise_synthese) ; aucune table, aucune donnée écrite.

-- ── activite_depuis : ce que le joueur a fait depuis chaque date de comparaison ──
-- Le sélecteur « Se comparer à toi il y a 3 j · 30 j · 60 j · 90 j » : pour chaque date,
-- le nombre de réponses données depuis (c.at > date), matière par matière, et combien
-- étaient justes. Une matière sans réponse sur la période n'a pas de ligne : la page
-- n'affiche pas son écart (son ±0 ne voudrait rien dire) et la range à part.
-- p_dates : 8 dates au plus ; 'depuis' est rendu dans le même ordre (clé i = rang dans
-- p_dates, à partir de 1). Rend { v, depuis } :
--   depuis : [{ i, matieres: { <clé>: { n, justes } } }] ; une date sans aucune réponse
--            depuis n'a pas de ligne ; '[]' quand rien du tout.
-- Les clés de matière qui contiennent « : » (sources sans matière précise) sont écartées,
-- comme dans maitrise_synthese. Les réponses comptent toutes (sans la pondération
-- 2 / 0,5 / 1 de la maîtrise) : c'est un compte de ce qui a été fait.
CREATE OR REPLACE FUNCTION activite_depuis(p_user uuid, p_dates timestamptz[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_dep jsonb;
BEGIN
  IF p_user IS NULL OR to_regprocedure('public._reponses_cache(uuid)') IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM _reponses_cache(p_user);   -- remplit pg_temp._rep_cache (table temporaire de la transaction)

  WITH jours AS (
    SELECT d.jour, d.i FROM unnest(p_dates[1:8]) WITH ORDINALITY AS d(jour, i) WHERE d.jour IS NOT NULL
  ), par AS (
    SELECT j.i, c.matiere, count(*)::int AS n, count(*) FILTER (WHERE c.ok)::int AS justes
    FROM jours j
    JOIN pg_temp._rep_cache c ON c.at > j.jour
    WHERE c.matiere IS NOT NULL AND strpos(c.matiere, ':') = 0
    GROUP BY j.i, c.matiere)
  SELECT jsonb_agg(jsonb_build_object('i', z.i, 'matieres', z.m) ORDER BY z.i) INTO v_dep
  FROM (SELECT i, jsonb_object_agg(matiere, jsonb_build_object('n', n, 'justes', justes)) AS m
        FROM par GROUP BY i) z;

  RETURN jsonb_build_object('v', 1, 'depuis', coalesce(v_dep, '[]'::jsonb));
EXCEPTION WHEN undefined_table OR undefined_column OR undefined_function THEN
  RETURN NULL;   -- une source manque : la carte garde son affichage d'avant
END;
$$;
REVOKE ALL ON FUNCTION activite_depuis(uuid, timestamptz[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION activite_depuis(uuid, timestamptz[]) TO service_role;

-- Contrôle (remplacer l'uuid par le tien) : les réponses des 3, 30, 60 et 90 derniers jours.
-- select activite_depuis('00000000-0000-0000-0000-000000000000',
--   array[now() - interval '3 days', now() - interval '30 days', now() - interval '60 days', now() - interval '90 days']);
-- Les droits : seul service_role doit pouvoir l'exécuter.
-- select grantee, privilege_type from information_schema.routine_privileges where routine_name = 'activite_depuis';
