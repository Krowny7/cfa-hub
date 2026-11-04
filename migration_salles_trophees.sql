-- Les mocks joués en Salle comptent pour les trophées d'examen blanc.
-- Idempotent, sans toucher aux données : une fonction de plus, et les deux lectures
-- de la liste des trophées (migration_v3_profil.sql) qui l'ajoutent. Les parties déjà
-- jouées comptent tout de suite : les trophées se calculent à la lecture.
--
-- Mêmes règles que les examens blancs (_trophee_blanc) : la première copie de chaque
-- mock (rejouer la même session ne redonne rien), 30 questions au moins, 60 % ou plus.
-- Une question sans réponse compte comme fausse : le score se lit sur `nb`. Une copie
-- abandonnée (moins de 80 % de questions répondues) ne compte pas comme première copie.

CREATE OR REPLACE FUNCTION _trophees_salles(p_user uuid)
RETURNS TABLE (source text, palier smallint, quand timestamptz, ref text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF p_user IS NULL OR to_regclass('public.salle_reponses') IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    WITH copies AS (
      SELECT s.params -> 'examens' AS cle,
             s.nb AS total,
             coalesce(s.terminee_at, s.fin_at) AS fini,
             (count(*) FILTER (WHERE r.juste))::int AS score
      FROM salle_sessions s
      JOIN salle_reponses r ON r.session_id = s.id AND r.user_id = p_user
      WHERE s.params ->> 'source' = 'examen'
        AND (s.statut = 'terminee' OR s.fin_at <= now())
      GROUP BY s.id
      HAVING count(*) * 10 >= 8 * s.nb
    ),
    premieres AS (
      SELECT DISTINCT ON (c.cle) c.cle, c.total, c.fini, c.score
      FROM copies c
      ORDER BY c.cle, c.fini
    )
    SELECT 'blanc'::text,
           _trophee_blanc(p.score, p.total),
           p.fini,
           coalesce(nullif(array_to_string(ARRAY(SELECT jsonb_array_elements_text(p.cle)), ' + '), ''), 'Mock en Salle')
    FROM premieres p
    WHERE p.total >= 30 AND p.score * 10 >= 6 * p.total;
END;
$$;

CREATE OR REPLACE FUNCTION _trophees_joueur(p_user uuid)
RETURNS TABLE (source text, palier smallint, n bigint, dernier timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.source, t.palier, count(*), max(t.quand)
  FROM (
    SELECT * FROM _trophees_liste(p_user)
    UNION ALL
    SELECT * FROM _trophees_salles(p_user)
  ) t
  GROUP BY t.source, t.palier
  ORDER BY t.source, t.palier;
$$;

CREATE OR REPLACE FUNCTION mes_trophees_depuis(p_depuis timestamptz)
RETURNS TABLE (source text, palier smallint, quand timestamptz, ref text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.source, t.palier, t.quand, t.ref
  FROM (
    SELECT * FROM _trophees_liste(auth.uid())
    UNION ALL
    SELECT * FROM _trophees_salles(auth.uid())
  ) t
  WHERE p_depuis IS NOT NULL AND t.quand >= p_depuis
  ORDER BY t.quand, t.palier DESC, t.source;
$$;

REVOKE ALL ON FUNCTION _trophees_salles(uuid) FROM PUBLIC, anon, authenticated;

-- Contrôle (remplacer l'uuid par le tien) : les lignes « blanc » de tes mocks en Salle
-- select * from _trophees_salles('00000000-0000-0000-0000-000000000000');
