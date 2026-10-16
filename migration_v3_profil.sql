-- Codex v3, côté profil : les pièces portées, les trophées, la mémoire, la
-- maîtrise et le débrief des examens blancs.
-- À coller dans le SQL Editor de Supabase, après toutes les migrations déjà
-- en place. Ordre de collage des deux fichiers du Codex v3 :
-- migration_v3_profil.sql, puis migration_codex_v3.sql. Chacun marche aussi
-- seul. Idempotente (rejouable).
-- Le site marche sans ce fichier : chaque lecture se replie en silence sur
-- l'ancien comportement tant qu'il n'est pas collé.
--
-- 1. profile_style.titre et profile_style.folio : le titre porté sous le
--    pseudo et le folio posé sur la page (clés nues des pièces de
--    collection, lib/profil/pieces.ts). Écrits par le serveur seulement,
--    après validation (comme le reste de profile_style) ; la base n'en borne
--    que la forme. Le trait bas est permis dans un titre :
--    « maitre:fixed_income ».
-- 2. La Salle des trophées : un trophée récompense une performance de
--    qualité, jamais un volume, en quatre paliers (1 bronze, 2 argent, 3 or,
--    4 diamant), sur neuf sources (entraînement ciblé, examens blancs, les 30
--    et les 5 du jour, pages de drill, fiches entières, Atelier, duels sans
--    faute, « À revoir »). Rien n'est stocké : tout se recalcule depuis les
--    tables de jeu, chaque source seulement si ses tables existent.
--    _trophees_liste (interne) rend un trophée par ligne ; _trophees_joueur
--    (interne) et trophees_joueur (service role, lue par le Codex) les
--    comptent par source et par palier ; get_user_trophees (joueurs
--    connectés) n'en donne que les comptes, pour le profil public ;
--    mes_trophees_depuis rend les siens gagnés depuis un instant, pour
--    l'annonce de fin de séance. get_user_practice_trophies n'est pas
--    touchée : le site s'y replie tant que cette section n'est pas collée.
-- Les sections suivantes (ratures qui sèchent, « À revoir », maîtrise,
-- débrief des blancs) s'ajoutent à la suite, lot après lot.

-- ── 1. le titre porté et le folio ─────────────────────────────────────
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS titre text;
ALTER TABLE profile_style ADD COLUMN IF NOT EXISTS folio text;
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_titre_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_titre_check CHECK (titre IS NULL OR titre ~ '^[a-z0-9:_-]{2,80}$');
ALTER TABLE profile_style DROP CONSTRAINT IF EXISTS profile_style_folio_check;
ALTER TABLE profile_style ADD CONSTRAINT profile_style_folio_check CHECK (folio IS NULL OR folio ~ '^[a-z0-9_-]{2,60}$');

-- ── 2. la Salle des trophées ──────────────────────────────────────────
-- Le nom court d'une matière (clé du site ou préfixe de drill), comme
-- SUBJECTS.short (components/reviser/catalog.ts) : « FSA », « Fixed Income ».
CREATE OR REPLACE FUNCTION _trophee_matiere(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE p
    WHEN 'ethics' THEN 'Ethics' WHEN 'quant' THEN 'Quant' WHEN 'economics' THEN 'Economics'
    WHEN 'corporate' THEN 'Corporate' WHEN 'fsa' THEN 'FSA' WHEN 'equity' THEN 'Equity'
    WHEN 'fixed_income' THEN 'Fixed Income' WHEN 'derivatives' THEN 'Derivatives'
    WHEN 'alternatives' THEN 'Alternatives' WHEN 'portfolio' THEN 'Portfolio'
    WHEN 'Financial Statement Analysis' THEN 'FSA' WHEN 'Portfolio Management' THEN 'Portfolio'
    ELSE p
  END;
$$;

-- Un jour, à la française : « 14 oct. », « 1er nov. ».
CREATE OR REPLACE FUNCTION _trophee_jour(p date)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE WHEN extract(day FROM p) = 1 THEN '1er' ELSE extract(day FROM p)::int::text END || ' ' ||
         (ARRAY['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'])[extract(month FROM p)::int];
$$;

-- Le palier d'une séance d'entraînement ciblé réussie (70 % ou plus) : celui
-- de trophyTier (lib/practiceTopics.ts) selon le nombre de matières, puis le
-- plafond par taille : moins de 30 questions, l'argent au plus ; de 30 à 59,
-- l'or au plus. Le diamant demande donc 7 matières et 60 questions.
CREATE OR REPLACE FUNCTION _trophee_ciblee(p_matieres int, p_total int)
RETURNS smallint LANGUAGE sql IMMUTABLE
AS $$
  SELECT least(CASE WHEN p_matieres >= 7 THEN 4 WHEN p_matieres >= 4 THEN 3 WHEN p_matieres >= 2 THEN 2 ELSE 1 END,
               CASE WHEN p_total < 30 THEN 2 WHEN p_total < 60 THEN 3 ELSE 4 END)::smallint;
$$;

-- Le palier d'un examen blanc d'au moins 30 questions réussi à 60 % ou plus :
-- 70 % l'argent, 80 % l'or, 90 % le diamant s'il compte 90 questions ou plus.
CREATE OR REPLACE FUNCTION _trophee_blanc(p_score int, p_total int)
RETURNS smallint LANGUAGE sql IMMUTABLE
AS $$
  SELECT (CASE WHEN p_score * 10 >= 9 * p_total AND p_total >= 90 THEN 4
               WHEN p_score * 10 >= 8 * p_total THEN 3
               WHEN p_score * 10 >= 7 * p_total THEN 2
               ELSE 1 END)::smallint;
$$;

-- Tous les trophées d'un joueur, un par ligne : (source, palier, quand, ref).
-- ref est un libellé court (« FSA, Equity, Ethics », « Les 30 du jour du
-- 14 oct. », « Fiche FSA »). Les seuils suivent la spécification V3 §2.2 et
-- lib/trophees.ts (SOURCES_TROPHEE) ; chaque source ne vit que si ses
-- tables existent.
CREATE OR REPLACE FUNCTION _trophees_liste(p_user uuid)
RETURNS TABLE (source text, palier smallint, quand timestamptz, ref text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF p_user IS NULL THEN
    RETURN;
  END IF;

  -- ciblee : une séance d'entraînement ciblé réussie à 70 % ou plus (comme
  -- get_user_practice_trophies), palier selon les matières et la taille ;
  -- libellé : trois matières au plus, sinon « FSA, Quant +5 » (topicsShort)
  IF to_regclass('public.practice_session_results') IS NOT NULL THEN
    RETURN QUERY
      SELECT 'ciblee'::text, _trophee_ciblee(x.nb, r.total), r.completed_at,
             coalesce(nullif(CASE WHEN x.nb <= 3 THEN array_to_string(x.noms, ', ')
                                  ELSE array_to_string(x.noms[1:2], ', ') || ' +' || (x.nb - 2) END, ''),
                      'Entraînement ciblé')
      FROM practice_session_results r
      CROSS JOIN LATERAL (
        SELECT greatest(coalesce(cardinality(r.topics), 0), 1) AS nb,
               ARRAY(SELECT _trophee_matiere(t.cle) FROM unnest(r.topics) WITH ORDINALITY AS t(cle, o) ORDER BY t.o) AS noms
      ) x
      WHERE r.user_id = p_user AND r.total > 0 AND r.score * 10 >= 7 * r.total;
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
             (CASE WHEN t.score >= t.total AND t.total >= 30 THEN 4
                   WHEN t.score * 10 >= 9 * t.total THEN 3
                   WHEN t.score * 10 >= 8 * t.total THEN 2
                   ELSE 1 END)::smallint,
             t.finished_at, 'Les 30 du jour du ' || _trophee_jour(t.day)
      FROM daily_attempts t
      JOIN daily_challenges c ON c.id = t.challenge_id
      WHERE t.user_id = p_user AND t.finished_at IS NOT NULL AND t.total > 0 AND t.score IS NOT NULL
        AND right(c.program, 5) <> '-cinq' AND t.score * 10 >= 7 * t.total;
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
        SELECT p.*, qs.title, split_part(qs.title, ' — ', 1) AS fiche
        FROM passages p
        JOIN quiz_sets qs ON qs.id = p.set_id
        WHERE qs.title ~ '^[^—]+ — Drill Fiche Page [0-9]+'
          AND p.distincts >= greatest(1, (SELECT count(*) FROM quiz_questions qq WHERE qq.set_id = p.set_id))
      ), premiers AS (
        SELECT DISTINCT ON (c.set_id) c.* FROM complets c ORDER BY c.set_id, c.debut, c.run_id
      ), pages AS (
        SELECT qs.id, split_part(qs.title, ' — ', 1) AS fiche
        FROM quiz_sets qs
        WHERE qs.title ~ '^[^—]+ — Drill Fiche Page [0-9]+' AND qs.is_official AND qs.official_published
          AND split_part(qs.title, ' — ', 1) IN (SELECT c.fiche FROM complets c)
          AND EXISTS (SELECT 1 FROM quiz_questions qq WHERE qq.set_id = qs.id)
      ), par_page AS (
        SELECT pg.fiche, pg.id,
               min(c.fin) FILTER (WHERE c.justes * 5 >= 4 * c.n) AS t_or,
               min(c.fin) FILTER (WHERE c.justes >= c.n) AS t_diamant
        FROM pages pg
        LEFT JOIN complets c ON c.set_id = pg.id
        GROUP BY pg.fiche, pg.id
      )
      SELECT 'drill'::text, (CASE WHEN p.justes >= p.n THEN 2 ELSE 1 END)::smallint, p.fin,
             'Drill ' || _trophee_matiere(p.fiche) || ', page ' || substring(p.title FROM 'Page ([0-9]+)')
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
      SELECT 'atelier'::text, (CASE WHEN a.score * 5 >= 4 * a.total AND a.rayees >= 5 THEN 2 ELSE 1 END)::smallint,
             a.finished_at, 'L''Atelier du ' || _trophee_jour((a.finished_at AT TIME ZONE 'Europe/Paris')::date)
      FROM (
        SELECT w.score, w.total, w.finished_at,
               (SELECT count(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(w.reponses) = 'array' THEN w.reponses ELSE '[]'::jsonb END) x
                WHERE x->>'k' = 'rature' AND coalesce((x->>'ok')::boolean, false) AND NOT coalesce((x->>'r')::boolean, false)) AS rayees
        FROM ateliers w
        WHERE w.user_id = p_user AND w.finished_at IS NOT NULL AND w.total > 0 AND w.score IS NOT NULL
      ) a
      WHERE a.score * 10 >= 7 * a.total AND a.rayees >= 3;
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

  -- revoir : une séance « À revoir » close (eclair_series.genre, posée par la
  -- section 3b) d'au moins 15 questions, 90 % bronze, 100 % sur 25 argent
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'eclair_series' AND column_name = 'genre') THEN
    RETURN QUERY
      SELECT 'revoir'::text, (CASE WHEN e.score >= e.total AND e.total >= 25 THEN 2 ELSE 1 END)::smallint,
             e.finished_at, 'À revoir du ' || _trophee_jour((e.finished_at AT TIME ZONE 'Europe/Paris')::date)
      FROM eclair_series e
      WHERE e.user_id = p_user AND e.genre = 'revoir' AND e.finished_at IS NOT NULL
        AND e.total >= 15 AND e.score * 10 >= 9 * e.total;
  END IF;
END;
$$;

-- Les trophées d'un joueur comptés par source et par palier (dernier : le
-- plus récent). Interne.
CREATE OR REPLACE FUNCTION _trophees_joueur(p_user uuid)
RETURNS TABLE (source text, palier smallint, n bigint, dernier timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.source, t.palier, count(*), max(t.quand)
  FROM _trophees_liste(p_user) t
  GROUP BY t.source, t.palier
  ORDER BY t.source, t.palier;
$$;

-- La même chose sous un nom stable, pour le Codex (codex_mesures_v3, mesure
-- « trophees ») : service role seulement.
CREATE OR REPLACE FUNCTION trophees_joueur(p_user uuid)
RETURNS TABLE (source text, palier smallint, n bigint, dernier timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT j.source, j.palier, j.n, j.dernier FROM _trophees_joueur(p_user) j;
$$;

-- Les comptes d'un joueur, pour son profil public : des agrégats seulement
-- (ni date, ni libellé), comme get_user_practice_trophies.
CREATE OR REPLACE FUNCTION get_user_trophees(p_user_id uuid)
RETURNS TABLE (source text, palier smallint, n bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT j.source, j.palier, j.n FROM _trophees_joueur(p_user_id) j;
$$;

-- Les trophées du joueur connecté gagnés depuis un instant, du plus ancien
-- au plus récent : l'annonce de fin de séance (« Trophée d'or · Les 30 du
-- jour »).
CREATE OR REPLACE FUNCTION mes_trophees_depuis(p_depuis timestamptz)
RETURNS TABLE (source text, palier smallint, quand timestamptz, ref text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.source, t.palier, t.quand, t.ref
  FROM _trophees_liste(auth.uid()) t
  WHERE p_depuis IS NOT NULL AND t.quand >= p_depuis
  ORDER BY t.quand, t.palier DESC, t.source;
$$;

REVOKE ALL ON FUNCTION _trophee_matiere(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _trophee_jour(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _trophee_ciblee(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _trophee_blanc(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _trophees_liste(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _trophees_joueur(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION trophees_joueur(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_user_trophees(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION mes_trophees_depuis(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION trophees_joueur(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_trophees(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mes_trophees_depuis(timestamptz) TO authenticated;
