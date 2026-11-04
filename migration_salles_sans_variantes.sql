-- migration_salles_sans_variantes.sql — les variantes ne se jouent que depuis un mock officiel.
--
-- _salle_pool('banque') prenait toute la banque officielle, donc aussi les sets
-- « … — Variantes » du dossier « Mocks Officiels (Système) » : dans une partie sur
-- la banque, elles se mêlaient aux autres questions. Elles sortent de la banque,
-- comme elles étaient déjà sorties de la source « mocks ». Elles restent jouables
-- par la source « examen » (_salle_pool_mock, version variantes ou tout), qui ne
-- change pas.
-- Ne touche à aucune donnée : une fonction seulement (CREATE OR REPLACE),
-- idempotent. Une partie en cours garde ses questions (salle_items) ; seuls les
-- prochains tirages et les effectifs des réglages (salle_questions_disponibles)
-- changent. _salle_pool reprend migration_salles.sql à l'identique en dehors de
-- la condition sur les variantes.

CREATE OR REPLACE FUNCTION _salle_pool(p_source text)
RETURNS TABLE (question_id uuid, topic text, diff text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT ON (c.prompt) c.question_id, c.topic, c.diff
  FROM (
    SELECT qq.id AS question_id,
           qq.prompt,
           _salle_topic(lf.name, qs.title) AS topic,
           CASE coalesce(qs.difficulty, 1) WHEN 3 THEN 'difficile' WHEN 2 THEN 'moyen' ELSE 'facile' END AS diff,
           lf.name AS dossier,
           qs.title AS titre
    FROM quiz_questions qq
    JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official = true AND qs.official_published = true
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    WHERE coalesce(qs.cfa_level, 1) = 1
      AND coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
  ) c
  WHERE c.topic IS NOT NULL
    -- jamais de variante ici, quelle que soit la source
    AND (coalesce(c.dossier, '') <> 'Mocks Officiels (Système)' OR split_part(c.titre, ' — ', 4) <> 'Variantes')
    AND (
      p_source = 'banque'
      OR (
        p_source = 'mocks'
        AND c.dossier IN (
          'Mocks Officiels (Système)',
          'Éthique et Standards Professionnels (Système)',
          'Méthodes Quantitatives (Système)',
          'Économie (Système)',
          'Analyse des États Financiers (Système)',
          'Finance d''Entreprise (Système)',
          'Investissements en Actions (Système)',
          'Fixed Income (Système)',
          'Instruments Dérivés (Système)',
          'Investissements Alternatifs (Système)',
          'Gestion de Portefeuille (Système)'
        )
      )
    )
  ORDER BY c.prompt, c.question_id;
$$;

REVOKE ALL ON FUNCTION _salle_pool(text) FROM PUBLIC, anon, authenticated;

-- Vérification, après coup (lecture seule) : 0 pour les deux sources.
--   SELECT p.source, count(*) FILTER (WHERE split_part(qs.title, ' — ', 4) = 'Variantes') AS variantes
--   FROM (VALUES ('banque'), ('mocks')) AS p(source)
--   CROSS JOIN LATERAL _salle_pool(p.source) x
--   JOIN quiz_questions qq ON qq.id = x.question_id
--   JOIN quiz_sets qs ON qs.id = qq.set_id
--   GROUP BY p.source;
