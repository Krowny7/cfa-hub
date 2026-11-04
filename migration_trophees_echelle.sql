-- L'échelle commune des trophées au pourcentage : 60 % bronze, 70 % argent, 80 % or,
-- 90 % diamant, pour les examens blancs (et les mocks en Salle), les 30 du jour, l'Atelier
-- et l'entraînement ciblé. À coller APRÈS migration_salles_trophees.sql. Idempotent, sans
-- toucher aux données : seules des fonctions de calcul sont remplacées, et les trophées se
-- calculent à la lecture. Les seuils affichés sont dans lib/trophees.ts (SOURCES_TROPHEE).
--
-- Rien de gagné n'est repris : l'échelle ne fait que baisser les seuils, sauf pour
-- l'entraînement ciblé, dont le palier dépendait des matières. Une séance ciblée rendue
-- avant la mise en ligne garde donc son ancien palier s'il est plus haut. Elle reste
-- plafonnée par sa taille (l'argent sous 30 questions, l'or sous 60).
-- Les règles qui ne sont pas une échelle de pourcentage ne bougent pas : Les 5 du jour,
-- les pages de drill, les fiches entières, Duel sans faute, À revoir.

CREATE OR REPLACE FUNCTION _trophee_pct(p_score int, p_total int)
RETURNS smallint LANGUAGE sql IMMUTABLE
AS $$
  SELECT (CASE WHEN p_score * 10 >= 9 * p_total THEN 4
               WHEN p_score * 10 >= 8 * p_total THEN 3
               WHEN p_score * 10 >= 7 * p_total THEN 2
               ELSE 1 END)::smallint;
$$;

CREATE OR REPLACE FUNCTION _trophee_blanc(p_score int, p_total int)
RETURNS smallint LANGUAGE sql IMMUTABLE
AS $$
  SELECT _trophee_pct(p_score, p_total);
$$;

CREATE OR REPLACE FUNCTION _trophee_ciblee_pct(p_score int, p_total int, p_matieres int, p_quand timestamptz)
RETURNS smallint LANGUAGE sql IMMUTABLE
AS $$
  SELECT greatest(
    least(_trophee_pct(p_score, p_total)::int, CASE WHEN p_total < 30 THEN 2 WHEN p_total < 60 THEN 3 ELSE 4 END),
    CASE WHEN p_quand < timestamptz '2026-11-05 00:00:00+01' AND p_score * 10 >= 7 * p_total
         THEN _trophee_ciblee(p_matieres, p_total, p_quand)::int ELSE 0 END
  )::smallint;
$$;

CREATE OR REPLACE FUNCTION _trophees_liste(p_user uuid)
RETURNS TABLE (source text, palier smallint, quand timestamptz, ref text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF p_user IS NULL THEN
    RETURN;
  END IF;

  -- ciblee : une séance d'entraînement ciblé réussie à 60 % ou plus, palier selon le
  -- pourcentage et la taille (_trophee_ciblee_pct) ;
  -- libellé : trois matières au plus, sinon « FSA, Quant +5 » (topicsShort)
  IF to_regclass('public.practice_session_results') IS NOT NULL THEN
    RETURN QUERY
      SELECT 'ciblee'::text, _trophee_ciblee_pct(r.score, r.total, x.nb, r.completed_at), r.completed_at,
             coalesce(nullif(CASE WHEN x.nb <= 3 THEN array_to_string(x.noms, ', ')
                                  ELSE array_to_string(x.noms[1:2], ', ') || ' +' || (x.nb - 2) END, ''),
                      'Entraînement ciblé')
      FROM practice_session_results r
      CROSS JOIN LATERAL (
        SELECT greatest(coalesce(cardinality(r.topics), 0), 1) AS nb,
               ARRAY(SELECT _trophee_matiere(t.cle) FROM unnest(r.topics) WITH ORDINALITY AS t(cle, o) ORDER BY t.o) AS noms
      ) x
      WHERE r.user_id = p_user AND r.total > 0 AND r.score * 10 >= 6 * r.total;
  END IF;

  -- blanc : un examen blanc d'au moins 30 questions, première copie seulement
  -- (mock_exam_results n'en garde qu'une par examen ; les reprises de
  -- mock_exam_attempts ne comptent pas), et la première copie de chaque
  -- examen officiel (quiz_attempts du dossier « Mocks Officiels (Système) »)
  IF to_regclass('public.mock_exam_results') IS NOT NULL THEN
    RETURN QUERY
      SELECT 'blanc'::text, _trophee_blanc(r.score, r.total), r.completed_at, coalesce(e.title, 'Examen blanc')
      FROM mock_exam_results r
      LEFT JOIN mock_exams e ON e.id = r.exam_id
      WHERE r.user_id = p_user AND r.total >= 30 AND r.score * 10 >= 6 * r.total;
  END IF;
  IF to_regclass('public.quiz_attempts') IS NOT NULL AND to_regclass('public.library_folders') IS NOT NULL THEN
    RETURN QUERY
      SELECT 'blanc'::text, _trophee_blanc(a.score, a.total), a.created_at, a.title
      FROM (
        SELECT DISTINCT ON (qa.set_id) qa.score, qa.total, qa.created_at, qs.title
        FROM quiz_attempts qa
        JOIN quiz_sets qs ON qs.id = qa.set_id
        JOIN library_folders lf ON lf.id = qs.folder_id AND lf.name = 'Mocks Officiels (Système)'
        WHERE qa.user_id = p_user AND qa.total > 0 AND qa.score IS NOT NULL
        ORDER BY qa.set_id, qa.created_at, qa.id
      ) a
      WHERE a.total >= 30 AND a.score * 10 >= 6 * a.total;
  END IF;

  -- trente : les 30 du jour rendus, 21/30 bronze … 30/30 diamant (une copie
  -- par jour, déjà) ; cinq : les 5 du jour sans faute
  IF to_regclass('public.daily_attempts') IS NOT NULL AND to_regclass('public.daily_challenges') IS NOT NULL THEN
    RETURN QUERY
      SELECT 'trente'::text,
             _trophee_pct(t.score, t.total),
             t.finished_at, 'Les 30 du jour du ' || _trophee_jour(t.day)
      FROM daily_attempts t
      JOIN daily_challenges c ON c.id = t.challenge_id
      WHERE t.user_id = p_user AND t.finished_at IS NOT NULL AND t.total > 0 AND t.score IS NOT NULL
        AND right(c.program, 5) <> '-cinq' AND t.score * 10 >= 6 * t.total;
    RETURN QUERY
      SELECT 'cinq'::text, 1::smallint, t.finished_at, 'Les 5 du jour du ' || _trophee_jour(t.day)
      FROM daily_attempts t
      JOIN daily_challenges c ON c.id = t.challenge_id
      WHERE t.user_id = p_user AND t.finished_at IS NOT NULL AND t.score IS NOT NULL
        AND right(c.program, 5) = '-cinq' AND t.score >= 5 AND t.score >= coalesce(t.total, 5);
  END IF;

  -- drill : le premier passage complet d'une page de drill de fiche
  -- (« <fiche> — Drill Fiche Page N … » ; les pages en réserve, « Réserve —
  -- … », n'en sont pas), 90 % bronze, 100 % argent ;
  -- fiche : toutes les pages publiées de la fiche passées en entier, le
  -- meilleur passage de chacune à 80 % (or) ou à 100 % (diamant). Un seul
  -- trophée par fiche, au plus haut palier atteint, daté du passage qui l'a
  -- rempli.
  IF to_regclass('public.quiz_answer_log') IS NOT NULL THEN
    RETURN QUERY
      WITH passages AS (
        SELECT l.run_id, l.set_id, min(l.answered_at) AS debut, max(l.answered_at) AS fin, count(*)::int AS n,
               (count(*) FILTER (WHERE l.is_correct))::int AS justes, count(DISTINCT l.question_id)::int AS distincts
        FROM quiz_answer_log l
        WHERE l.user_id = p_user AND l.mode = 'page'
        GROUP BY l.run_id, l.set_id
      ), complets AS (
        SELECT p.*, split_part(qs.title, ' — ', 1) AS fiche, substring(qs.title FROM 'Page ([0-9]+)')::int AS page
        FROM passages p
        JOIN quiz_sets qs ON qs.id = p.set_id
        WHERE qs.title ~ '^[^—]+ — Drill Fiche Page [0-9]+'
          AND p.distincts >= greatest(1, (SELECT count(*) FROM quiz_questions qq WHERE qq.set_id = p.set_id))
      ), premiers AS (
        SELECT DISTINCT ON (c.fiche, c.page) c.* FROM complets c ORDER BY c.fiche, c.page, c.debut, c.run_id
      ), pages AS (
        -- les pages de la fiche comme le Codex les compte (drill_totaux) : par
        -- numéro, publiées, et non vides
        SELECT DISTINCT split_part(qs.title, ' — ', 1) AS fiche, substring(qs.title FROM 'Page ([0-9]+)')::int AS page
        FROM quiz_sets qs
        WHERE qs.title ~ '^[^—]+ — Drill Fiche Page [0-9]+' AND qs.official_published
          AND split_part(qs.title, ' — ', 1) IN (SELECT c.fiche FROM complets c)
          AND EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.set_id = qs.id)
      ), par_page AS (
        SELECT pg.fiche, pg.page,
               min(c.fin) FILTER (WHERE c.justes * 5 >= 4 * c.n) AS t_or,
               min(c.fin) FILTER (WHERE c.justes >= c.n) AS t_diamant
        FROM pages pg
        LEFT JOIN complets c ON c.fiche = pg.fiche AND c.page = pg.page
        GROUP BY pg.fiche, pg.page
      )
      SELECT 'drill'::text, (CASE WHEN p.justes >= p.n THEN 2 ELSE 1 END)::smallint, p.fin,
             'Drill ' || _trophee_matiere(p.fiche) || ', page ' || p.page
      FROM premiers p
      WHERE p.justes * 10 >= 9 * p.n
      UNION ALL
      SELECT 'fiche'::text, (CASE WHEN bool_and(pp.t_diamant IS NOT NULL) THEN 4 ELSE 3 END)::smallint,
             CASE WHEN bool_and(pp.t_diamant IS NOT NULL) THEN max(pp.t_diamant) ELSE max(pp.t_or) END,
             'Fiche ' || _trophee_matiere(pp.fiche)
      FROM par_page pp
      GROUP BY pp.fiche
      HAVING bool_and(pp.t_or IS NOT NULL);
  END IF;

  -- atelier : une séance d'Atelier close, 70 % et 3 ratures rayées (bronze),
  -- 80 % et 5 rayées (argent) ; rayée comme dans codex_journal : une rature
  -- juste, hors re-test
  IF to_regclass('public.ateliers') IS NOT NULL THEN
    RETURN QUERY
      SELECT 'atelier'::text, _trophee_pct(a.score, a.total),
             a.finished_at, 'L''Atelier du ' || _trophee_jour((a.finished_at AT TIME ZONE 'Europe/Paris')::date)
      FROM (
        SELECT w.score, w.total, w.finished_at,
               (SELECT count(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(w.reponses) = 'array' THEN w.reponses ELSE '[]'::jsonb END) x
                WHERE x->>'k' = 'rature' AND coalesce((x->>'ok')::boolean, false) AND NOT coalesce((x->>'r')::boolean, false)) AS rayees
        FROM ateliers w
        WHERE w.user_id = p_user AND w.finished_at IS NOT NULL AND w.total > 0 AND w.score IS NOT NULL
      ) a
      WHERE a.score * 10 >= 6 * a.total AND a.rayees >= 3;
  END IF;

  -- duel : un duel gagné avec la mention « Sans-faute »
  IF to_regclass('public.duel_mentions') IS NOT NULL AND to_regclass('public.duels') IS NOT NULL THEN
    RETURN QUERY
      SELECT 'duel'::text, 1::smallint,
             coalesce(d.finished_at, CASE WHEN d.challenger_id = p_user THEN d.challenger_finished_at ELSE d.opponent_finished_at END),
             coalesce('Duel contre ' || pr.username, 'Duel sans faute')
      FROM duel_mentions m
      JOIN duels d ON d.id = m.duel_id AND d.winner_id = p_user
      LEFT JOIN profiles pr ON pr.id = CASE WHEN d.challenger_id = p_user THEN d.opponent_id ELSE d.challenger_id END
      WHERE m.user_id = p_user AND m.mention = 'sansFaute';
  END IF;

  -- revoir : une séance « À revoir » rendue en entier (eclair_series.genre,
  -- posée par la section 3b) d'au moins 15 questions, 90 % bronze, 100 % sur
  -- 25 argent. Rendue en entier, comme l'événement revoir_rendue du Codex : une
  -- séance laissée en route (close d'office par _revoir_clore, ou arrêtée par
  -- « Arrêter ») ne compte que les réponses données, elle ne vaut rien ici
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'eclair_series' AND column_name = 'genre') THEN
    RETURN QUERY
      SELECT 'revoir'::text, (CASE WHEN e.score >= e.total AND e.total >= 25 THEN 2 ELSE 1 END)::smallint,
             e.finished_at, 'À revoir du ' || _trophee_jour((e.finished_at AT TIME ZONE 'Europe/Paris')::date)
      FROM eclair_series e
      WHERE e.user_id = p_user AND e.genre = 'revoir' AND e.finished_at IS NOT NULL
        AND e.total = coalesce(array_length(e.question_ids, 1), 0)
        AND e.total >= 15 AND e.score * 10 >= 9 * e.total;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION _trophee_pct(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _trophee_ciblee_pct(int, int, int, timestamptz) FROM PUBLIC, anon, authenticated;
