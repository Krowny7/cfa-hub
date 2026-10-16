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
-- 3a. Les ratures qui sèchent : une rature n'est rayée que si elle est
--    réussie au moins 24 h après l'erreur ; réussie plus tôt, elle reste en
--    cours, à l'encre fraîche (seche_le), et sèche le lendemain. Une rature
--    rayée puis réussie de nouveau au moins 7 jours plus tard est scellée
--    (scellee_le). Une nouvelle erreur efface les deux. Le déclencheur
--    ratures_a_seche décide au moment du rayage : Mise au propre, Atelier et
--    « À revoir » sont couverts sans réécrire leur geste. Rien n'est
--    rétroactif : aucune ligne n'est réécrite, et seule une réussite
--    postérieure à la migration (ratures_v3_depart) scelle. Mise au propre
--    (par tri, par thème, par notion) et le tirage de l'Atelier ne proposent
--    plus que des ratures sèches, la plus ancienne erreur d'abord ;
--    rature_repondre dit ce qui est arrivé (rayée, fraîche, scellée…), et
--    le carnet (get_ratures, ratures_par_notion) lit seche_le et
--    scellee_le. Sans cette section, le site garde le rayage immédiat et
--    propose toutes les ratures.
-- Les sections suivantes (« À revoir », maîtrise, débrief des blancs)
-- s'ajoutent à la suite, lot après lot.

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
-- 14 oct. », « Fiche FSA »). Les seuils sont ceux que lib/trophees.ts
-- (SOURCES_TROPHEE) affiche ; chaque source ne vit que si ses tables
-- existent.
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

-- ── 3a. les ratures qui sèchent ───────────────────────────────────────
-- seche_le : réussie trop tôt, la rature reste en cours jusque-là (l'erreur
-- + 24 h) ; scellee_le : la réussite qui l'a scellée.
ALTER TABLE ratures ADD COLUMN IF NOT EXISTS seche_le timestamptz;
ALTER TABLE ratures ADD COLUMN IF NOT EXISTS scellee_le timestamptz;

-- La première application de cette section (même motif que sceaux_depart) :
-- seule une réussite postérieure scelle. Aucune politique : lue par les
-- fonctions seulement, jamais écrite après la migration.
CREATE TABLE IF NOT EXISTS ratures_v3_depart (
  une         boolean     PRIMARY KEY DEFAULT true CHECK (une),
  applique_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ratures_v3_depart ENABLE ROW LEVEL SECURITY;
INSERT INTO ratures_v3_depart (une) VALUES (true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION _ratures_v3_depuis()
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce((SELECT applique_le FROM ratures_v3_depart), now());
$$;

-- Le rayage « à sec ». Rayée par une réussite : rature_repondre (Mise au
-- propre, Atelier) pose removed_at et last_correct_at au même instant et
-- compte une reprise ; le retrait à la main (retirer_rature) ne touche que
-- removed_at et n'est pas concerné. Moins de 24 h après l'erreur, la rature
-- reste en cours, à l'encre fraîche. Une ancienne (rayée, rayee_le de
-- migration_profil_sceaux.sql, lue sans dépendre de la colonne) réussie de
-- nouveau, de n'importe où, 7 jours au moins après son rayage : scellée.
-- Une nouvelle erreur efface les deux. Le nom passe avant ratures_rayee_le
-- (ordre alphabétique des déclencheurs) : rayee_le suit la décision.
CREATE OR REPLACE FUNCTION _rature_a_seche()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_rayee timestamptz := (to_jsonb(OLD) ->> 'rayee_le')::timestamptz;
BEGIN
  IF OLD.removed_at IS NULL AND NEW.removed_at IS NOT NULL
     AND (NEW.correct_since > OLD.correct_since OR NEW.last_correct_at = NEW.removed_at)
     AND now() >= _ratures_v3_depuis()
     AND NEW.removed_at < OLD.last_missed_at + interval '24 hours' THEN
    NEW.removed_at := NULL;
    NEW.seche_le := OLD.last_missed_at + interval '24 hours';
  END IF;
  IF OLD.removed_at IS NOT NULL AND NEW.removed_at IS NOT NULL AND NEW.correct_since > OLD.correct_since
     AND v_rayee IS NOT NULL AND NEW.last_correct_at >= v_rayee + interval '7 days'
     AND NEW.last_correct_at >= _ratures_v3_depuis() AND OLD.scellee_le IS NULL THEN
    NEW.scellee_le := NEW.last_correct_at;
  END IF;
  IF NEW.misses > OLD.misses THEN
    NEW.seche_le := NULL;
    NEW.scellee_le := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS ratures_a_seche ON ratures;
CREATE TRIGGER ratures_a_seche BEFORE UPDATE ON ratures FOR EACH ROW EXECUTE FUNCTION _rature_a_seche();

-- La prochaine rature à repasser (migration_ratures_reprise.sql) : en cours,
-- les sèches seulement (réussies maintenant, elles seront rayées), la plus
-- ancienne erreur d'abord, puis les plus manquées, au lieu du hasard. Il ne
-- reste que des ratures fraîches : « vide », et combien sèchent.
CREATE OR REPLACE FUNCTION rature_suivante(p_source text DEFAULT NULL, p_exclure uuid[] DEFAULT '{}', p_anciennes boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_anc boolean := coalesce(p_anciennes, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH tri AS (
    SELECT * FROM ratures
    WHERE user_id = v_uid AND visible_from <= now() AND (removed_at IS NOT NULL) = v_anc
      AND (p_source IS NULL OR p_source = ANY (sources))
  ),
  carnet AS (
    SELECT * FROM tri WHERE v_anc OR now() >= coalesce(seche_le, last_missed_at + interval '24 hours')
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY last_missed_at, misses DESC, first_missed_at, question_id LIMIT 1
  )
  SELECT json_build_object(
    -- ratures du tri à repasser (en cours et sèches, ou anciennes), celles
    -- pas encore vues, et celles qui sèchent encore
    'carnet', (SELECT count(*) FROM carnet),
    'reste', (SELECT count(*) FROM candidates),
    'sechent', (SELECT count(*) FROM tri) - (SELECT count(*) FROM carnet),
    'vide', NOT EXISTS (SELECT 1 FROM carnet) AND EXISTS (SELECT 1 FROM tri),
    'question', (
      SELECT json_build_object(
        'question_id', t.question_id,
        'prompt', CASE WHEN q.choices = t.choices THEN q.prompt ELSE t.prompt END,
        'choices', t.choices,
        'misses', t.misses,
        'sources', t.sources,
        'last_source', t.last_source,
        'last_missed_at', t.last_missed_at,
        'set_title', coalesce(qs.title, t.set_title),
        'folder_name', coalesce(lf.name, t.folder_name)
      )
      FROM tiree t
      LEFT JOIN quiz_questions q ON q.id = t.question_id
      LEFT JOIN quiz_sets qs ON qs.id = q.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    )
  ) INTO v_res;
  RETURN v_res;
END;
$$;

-- Répondre à une rature repassée (migration_ratures_reprise.sql). Le geste
-- ne change pas ; la ligne est relue après l'UPDATE, et le statut dit ce
-- qu'a décidé le déclencheur : en cours, juste « rayee » ou « fraiche »
-- (encore humide : elle sèche à seche_le), faux « reste » ; ancienne, juste
-- « ancienne » ou « scellee », faux « revenue ».
CREATE OR REPLACE FUNCTION rature_repondre(p_question_id uuid, p_choice int)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_r      ratures;
  v_apres  ratures;
  v_q      quiz_questions;
  v_bon    int;
  v_expl   text;
  v_ok     boolean;
  v_statut text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_r FROM ratures
  WHERE user_id = v_uid AND question_id = p_question_id AND visible_from <= now()
  FOR UPDATE;
  IF v_r.question_id IS NULL THEN
    RAISE EXCEPTION 'Rature not found';
  END IF;
  IF p_choice IS NULL OR p_choice < 0 OR p_choice >= coalesce(array_length(v_r.choices, 1), 0) THEN
    RAISE EXCEPTION 'Invalid choice';
  END IF;
  -- la question à jour si ses choix n'ont pas bougé, sinon la copie gardée
  SELECT * INTO v_q FROM quiz_questions WHERE id = p_question_id;
  IF v_q.id IS NOT NULL AND v_q.choices = v_r.choices THEN
    v_bon := v_q.correct_index;
    v_expl := v_q.explanation;
  ELSE
    v_bon := v_r.correct_index;
    v_expl := v_r.explanation;
  END IF;
  v_ok := p_choice = v_bon;

  IF v_ok THEN
    UPDATE ratures
    SET removed_at = coalesce(removed_at, now()), correct_since = correct_since + 1, last_correct_at = now()
    WHERE user_id = v_uid AND question_id = p_question_id;
  ELSE
    UPDATE ratures
    SET removed_at = NULL, misses = misses + 1, last_missed_at = now(), last_selected = p_choice, correct_since = 0
    WHERE user_id = v_uid AND question_id = p_question_id;
  END IF;
  SELECT * INTO v_apres FROM ratures WHERE user_id = v_uid AND question_id = p_question_id;
  v_statut := CASE
    WHEN v_ok AND v_r.removed_at IS NULL THEN CASE WHEN v_apres.removed_at IS NULL THEN 'fraiche' ELSE 'rayee' END
    WHEN v_ok THEN CASE WHEN v_r.scellee_le IS NULL AND v_apres.scellee_le IS NOT NULL THEN 'scellee' ELSE 'ancienne' END
    WHEN v_r.removed_at IS NULL THEN 'reste'
    ELSE 'revenue'
  END;

  RETURN json_build_object('is_correct', v_ok, 'correct_index', v_bon, 'explanation', v_expl, 'selected_index', p_choice,
                           'statut', v_statut, 'seche_le', v_apres.seche_le);
END;
$$;

-- La lecture du carnet (migration_ratures_reprise.sql), plus : les ratures
-- scellées, celles en cours qui sèchent encore (réussies trop tôt), et, par
-- rature, seche_le et scellee_le.
CREATE OR REPLACE FUNCTION get_ratures(p_source text DEFAULT NULL, p_retirees boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ret boolean := coalesce(p_retirees, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH mes AS (
    SELECT * FROM ratures WHERE user_id = v_uid AND visible_from <= now()
  ),
  liste AS (
    SELECT * FROM mes
    WHERE (removed_at IS NOT NULL) = v_ret
      AND (p_source IS NULL OR p_source = ANY (sources))
    ORDER BY CASE WHEN v_ret THEN removed_at ELSE last_missed_at END DESC, question_id
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100) OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT json_build_object(
    'total', (SELECT count(*) FROM mes WHERE removed_at IS NULL),
    'retirees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL),
    'retirees_semaine', (SELECT count(*) FROM mes WHERE removed_at > now() - interval '7 days'),
    'scellees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL AND scellee_le IS NOT NULL),
    'fraiches', (SELECT count(*) FROM mes WHERE removed_at IS NULL AND seche_le > now()),
    'filtre', (SELECT count(*) FROM mes WHERE (removed_at IS NOT NULL) = v_ret AND (p_source IS NULL OR p_source = ANY (sources))),
    'sources', coalesce((SELECT json_object_agg(s, n) FROM (SELECT s, count(*) AS n FROM mes, unnest(sources) AS s WHERE (removed_at IS NOT NULL) = v_ret GROUP BY s) x), '{}'::json),
    'items', coalesce((SELECT json_agg(json_build_object(
      'question_id', l.question_id,
      'misses', l.misses,
      'first_missed_at', l.first_missed_at,
      'last_missed_at', l.last_missed_at,
      'last_selected', l.last_selected,
      'last_source', l.last_source,
      'sources', l.sources,
      'correct_since', l.correct_since,
      'removed_at', l.removed_at,
      'seche_le', l.seche_le,
      'scellee_le', l.scellee_le,
      'prompt', CASE WHEN q.choices = l.choices THEN q.prompt ELSE l.prompt END,
      'choices', l.choices,
      'correct_index', CASE WHEN q.choices = l.choices THEN q.correct_index ELSE l.correct_index END,
      'explanation', CASE WHEN q.choices = l.choices THEN q.explanation ELSE l.explanation END,
      'set_title', coalesce(qs.title, l.set_title),
      'folder_name', coalesce(lf.name, l.folder_name)
    ) ORDER BY CASE WHEN v_ret THEN l.removed_at ELSE l.last_missed_at END DESC, l.question_id)
    FROM liste l
    LEFT JOIN quiz_questions q ON q.id = l.question_id
    LEFT JOIN quiz_sets qs ON qs.id = q.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id), '[]'::json)
  ) INTO v_res;
  RETURN v_res;
END;
$$;

-- Mise au propre d'un thème (migration_points_faibles.sql) ou d'une notion
-- (migration_notions.sql), et le carnet par notion
-- (migration_carnet_notions.sql) : redéfinis à l'identique, plus le même
-- filtre « sèche », le même ordre et les mêmes champs, seulement s'ils sont
-- déjà en place.
DO $do$
BEGIN
  IF to_regprocedure('public.rature_suivante_theme(uuid[], uuid[])') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION rature_suivante_theme(p_sets uuid[], p_exclure uuid[] DEFAULT '{}')
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH tri AS (
    SELECT r.* FROM ratures r
    JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL
      AND q.set_id = ANY (coalesce(p_sets, '{}'::uuid[]))
  ),
  carnet AS (
    SELECT * FROM tri WHERE now() >= coalesce(seche_le, last_missed_at + interval '24 hours')
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY last_missed_at, misses DESC, first_missed_at, question_id LIMIT 1
  )
  SELECT json_build_object(
    -- ratures en cours et sèches du thème, celles pas encore vues, celles qui sèchent
    'carnet', (SELECT count(*) FROM carnet),
    'reste', (SELECT count(*) FROM candidates),
    'sechent', (SELECT count(*) FROM tri) - (SELECT count(*) FROM carnet),
    'vide', NOT EXISTS (SELECT 1 FROM carnet) AND EXISTS (SELECT 1 FROM tri),
    'question', (
      SELECT json_build_object(
        'question_id', t.question_id,
        'prompt', CASE WHEN q.choices = t.choices THEN q.prompt ELSE t.prompt END,
        'choices', t.choices,
        'misses', t.misses,
        'sources', t.sources,
        'last_source', t.last_source,
        'last_missed_at', t.last_missed_at,
        'set_title', coalesce(qs.title, t.set_title),
        'folder_name', coalesce(lf.name, t.folder_name)
      )
      FROM tiree t
      LEFT JOIN quiz_questions q ON q.id = t.question_id
      LEFT JOIN quiz_sets qs ON qs.id = q.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    )
  ) INTO v_res;
  RETURN v_res;
END;
$$
$fn$;
  END IF;

  IF to_regprocedure('public.rature_suivante_notion(text, uuid[])') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION rature_suivante_notion(p_notion text, p_exclure uuid[] DEFAULT '{}')
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM _ratures_rejouer(v_uid);

  WITH tri AS (
    SELECT r.* FROM ratures r
    JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL
      AND q.notion = p_notion
  ),
  carnet AS (
    SELECT * FROM tri WHERE now() >= coalesce(seche_le, last_missed_at + interval '24 hours')
  ),
  candidates AS (
    SELECT * FROM carnet WHERE NOT (question_id = ANY (coalesce(p_exclure, '{}'::uuid[])))
  ),
  tiree AS (
    SELECT * FROM candidates ORDER BY last_missed_at, misses DESC, first_missed_at, question_id LIMIT 1
  )
  SELECT json_build_object(
    -- ratures en cours et sèches de la notion, celles pas encore vues, celles qui sèchent
    'carnet', (SELECT count(*) FROM carnet),
    'reste', (SELECT count(*) FROM candidates),
    'sechent', (SELECT count(*) FROM tri) - (SELECT count(*) FROM carnet),
    'vide', NOT EXISTS (SELECT 1 FROM carnet) AND EXISTS (SELECT 1 FROM tri),
    'question', (
      SELECT json_build_object(
        'question_id', t.question_id,
        'prompt', CASE WHEN q.choices = t.choices THEN q.prompt ELSE t.prompt END,
        'choices', t.choices,
        'misses', t.misses,
        'sources', t.sources,
        'last_source', t.last_source,
        'last_missed_at', t.last_missed_at,
        'set_title', coalesce(qs.title, t.set_title),
        'folder_name', coalesce(lf.name, t.folder_name)
      )
      FROM tiree t
      LEFT JOIN quiz_questions q ON q.id = t.question_id
      LEFT JOIN quiz_sets qs ON qs.id = q.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    )
  ) INTO v_res;
  RETURN v_res;
END;
$$
$fn$;
  END IF;

  IF to_regprocedure('public.ratures_par_notion(text, boolean, integer, integer)') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION ratures_par_notion(p_notion text DEFAULT NULL, p_retirees boolean DEFAULT false, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ret boolean := coalesce(p_retirees, false);
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  -- les réponses en attente (défi rendu, duel clos…) entrent au carnet, comme dans get_ratures
  PERFORM _ratures_rejouer(v_uid);

  WITH mes AS (
    SELECT r.*, coalesce(q.notion, '') AS notion_q
    FROM ratures r LEFT JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now()
  ),
  vue AS (
    SELECT * FROM mes WHERE p_notion IS NOT NULL AND notion_q = p_notion AND (removed_at IS NOT NULL) = v_ret
  ),
  liste AS (
    SELECT * FROM vue
    ORDER BY CASE WHEN v_ret THEN removed_at ELSE last_missed_at END DESC, question_id
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100) OFFSET greatest(coalesce(p_offset, 0), 0)
  )
  SELECT json_build_object(
    'remplie', EXISTS (SELECT 1 FROM quiz_questions WHERE notion IS NOT NULL),
    'total', (SELECT count(*) FROM mes WHERE removed_at IS NULL),
    'retirees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL),
    'retirees_semaine', (SELECT count(*) FROM mes WHERE removed_at > now() - interval '7 days'),
    'scellees', (SELECT count(*) FROM mes WHERE removed_at IS NOT NULL AND scellee_le IS NOT NULL),
    'fraiches', (SELECT count(*) FROM mes WHERE removed_at IS NULL AND seche_le > now()),
    'filtre', (SELECT count(*) FROM vue),
    'sources', coalesce((SELECT json_object_agg(s, n) FROM (SELECT s, count(*) AS n FROM mes, unnest(sources) AS s WHERE (removed_at IS NOT NULL) = v_ret GROUP BY s) x), '{}'::json),
    -- les notions du carnet, les plus chargées d'abord (en cours, puis anciennes)
    'notions', coalesce((
      SELECT json_agg(json_build_object('notion', x.notion_q, 'en_cours', x.en_cours, 'anciennes', x.anciennes) ORDER BY x.en_cours DESC, x.anciennes DESC, x.notion_q)
      FROM (
        SELECT notion_q, count(*) FILTER (WHERE removed_at IS NULL) AS en_cours, count(*) FILTER (WHERE removed_at IS NOT NULL) AS anciennes
        FROM mes GROUP BY notion_q
      ) x
    ), '[]'::json),
    'items', coalesce((SELECT json_agg(json_build_object(
      'question_id', l.question_id,
      'misses', l.misses,
      'first_missed_at', l.first_missed_at,
      'last_missed_at', l.last_missed_at,
      'last_selected', l.last_selected,
      'last_source', l.last_source,
      'sources', l.sources,
      'correct_since', l.correct_since,
      'removed_at', l.removed_at,
      'seche_le', l.seche_le,
      'scellee_le', l.scellee_le,
      'prompt', CASE WHEN q.choices = l.choices THEN q.prompt ELSE l.prompt END,
      'choices', l.choices,
      'correct_index', CASE WHEN q.choices = l.choices THEN q.correct_index ELSE l.correct_index END,
      'explanation', CASE WHEN q.choices = l.choices THEN q.explanation ELSE l.explanation END,
      'set_title', coalesce(qs.title, l.set_title),
      'folder_name', coalesce(lf.name, l.folder_name)
    ) ORDER BY CASE WHEN v_ret THEN l.removed_at ELSE l.last_missed_at END DESC, l.question_id)
    FROM liste l
    LEFT JOIN quiz_questions q ON q.id = l.question_id
    LEFT JOIN quiz_sets qs ON qs.id = q.set_id
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id), '[]'::json)
  ) INTO v_res;
  RETURN v_res;
END;
$$
$fn$;
  END IF;
END $do$;

-- Le tirage de l'Atelier (migration_atelier.sql) lit ratures : redéfini à
-- l'identique, plus le filtre « sèche » sur les ratures du pool (une rature
-- fraîche n'y entre pas avant de sécher ; l'avant compte toujours toutes
-- les ratures en cours). Seulement si l'Atelier est déjà en place.
DO $do$
BEGIN
  IF to_regclass('public.ateliers') IS NOT NULL AND to_regprocedure('public.atelier_lancer(text[])') IS NOT NULL THEN
    EXECUTE $fn$
CREATE OR REPLACE FUNCTION atelier_lancer(p_notions text[])
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_a       ateliers;
  v_notions text[];
  v_poids   int[];
  v_today   date := _daily_today();
  v_exclude uuid[];
  v_avant   jsonb;
  v_pool    jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('atelier:' || v_uid::text));
  PERFORM _ratures_rejouer(v_uid);
  PERFORM _atelier_clore_anciens(v_uid);

  SELECT * INTO v_a FROM ateliers WHERE user_id = v_uid AND finished_at IS NULL;
  IF v_a.id IS NOT NULL THEN
    RETURN _atelier_json(v_a);
  END IF;

  -- les notions, sans doublon, dans l'ordre donné
  SELECT array_agg(x ORDER BY o) INTO v_notions
  FROM (
    SELECT x, min(o) AS o FROM unnest(p_notions) WITH ORDINALITY AS u(x, o)
    WHERE x ~ '^(ethics|quant|economics|corporate|fsa|equity|fixed_income|derivatives|alternatives|portfolio):[1-9][0-9]?$'
    GROUP BY x
  ) s;
  IF coalesce(array_length(v_notions, 1), 0) NOT BETWEEN 1 AND 3 OR array_length(v_notions, 1) <> coalesce(array_length(p_notions, 1), 0) THEN
    RAISE EXCEPTION 'Invalid notions';
  END IF;
  v_poids := CASE array_length(v_notions, 1) WHEN 1 THEN ARRAY[100] WHEN 2 THEN ARRAY[70, 30] ELSE ARRAY[60, 25, 15] END;

  -- les questions des défis du jour (les 30 et les 5) restent hors de l'Atelier
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true);
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', '', true);
  SELECT coalesce(array_agg(DISTINCT q), '{}'::uuid[]) INTO v_exclude
  FROM daily_challenges dc, unnest(dc.question_ids) AS q
  WHERE dc.day = v_today;

  -- l'avant : par notion, les 20 dernières réponses (90 jours) et les ratures en cours
  WITH rep AS (
    SELECT q.notion, r.ok, row_number() OVER (PARTITION BY q.notion ORDER BY r.at DESC) AS rn
    FROM _reponses_joueur(v_uid) r JOIN quiz_questions q ON q.id = r.question_id
    WHERE q.notion = ANY (v_notions) AND r.at > now() - interval '90 days'
  ),
  rec AS (
    SELECT notion, count(*)::int AS n, (count(*) FILTER (WHERE ok))::int AS ok FROM rep WHERE rn <= 20 GROUP BY notion
  ),
  rat AS (
    SELECT q.notion, (count(*))::int AS en_cours, (count(*) FILTER (WHERE r.correct_since = 0))::int AS vives
    FROM ratures r JOIN quiz_questions q ON q.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL AND q.notion = ANY (v_notions)
    GROUP BY q.notion
  )
  SELECT jsonb_object_agg(n.notion, jsonb_build_object(
           'n', coalesce(rec.n, 0), 'ok', coalesce(rec.ok, 0),
           'en_cours', coalesce(rat.en_cours, 0), 'vives', coalesce(rat.vives, 0)))
  INTO v_avant
  FROM unnest(v_notions) AS n(notion)
  LEFT JOIN rec ON rec.notion = n.notion
  LEFT JOIN rat ON rat.notion = n.notion;

  -- le pool. Chaque candidat a son rang dans sa notion ; on prend les rangs
  -- les plus petits rapportés au poids : la part de chaque notion suit son
  -- poids, et une notion à court laisse sa place aux autres.
  WITH w AS (
    SELECT n.notion, v_poids[n.o]::numeric AS poids
    FROM unnest(v_notions) WITH ORDINALITY AS n(notion, o)
  ),
  -- ratures en cours et sèches (v3) : les vives d'abord, les plus anciennes d'abord
  rat AS (
    SELECT r.question_id AS q, qq.notion,
           row_number() OVER (PARTITION BY qq.notion ORDER BY (r.correct_since = 0) DESC, r.last_missed_at, r.question_id) AS rn
    FROM ratures r JOIN quiz_questions qq ON qq.id = r.question_id
    WHERE r.user_id = v_uid AND r.visible_from <= now() AND r.removed_at IS NULL
      AND qq.notion = ANY (v_notions)
      AND coalesce(array_length(r.choices, 1), 0) BETWEEN 2 AND 5
      AND NOT (r.question_id = ANY (v_exclude))
      AND now() >= coalesce(r.seche_le, r.last_missed_at + interval '24 hours')
  ),
  rat_pris AS (
    SELECT rat.q, rat.notion, 1 AS v, row_number() OVER (ORDER BY (rat.rn - 0.5) / w.poids, rat.notion, rat.rn) AS ord
    FROM rat JOIN w ON w.notion = rat.notion
    ORDER BY (rat.rn - 0.5) / w.poids, rat.notion, rat.rn
    LIMIT 16
  ),
  -- tout se compte par énoncé : la copie d'un drill (l'« officielle »)
  -- reprend une question de la banque, sous un autre id
  vues AS (
    SELECT md5(qq.prompt) AS h, max(r.at) AS vue_le
    FROM _reponses_joueur(v_uid) r JOIN quiz_questions qq ON qq.id = r.question_id
    GROUP BY 1
  ),
  carnet AS (
    SELECT md5(r.prompt) AS h FROM ratures r WHERE r.user_id = v_uid
    UNION
    SELECT md5(qq.prompt) FROM ratures r JOIN quiz_questions qq ON qq.id = r.question_id WHERE r.user_id = v_uid
  ),
  -- questions neuves : de la banque officielle, une seule par énoncé (la
  -- copie d'un drill porte son niveau), jamais vues d'abord, sinon les moins
  -- récentes ; aucun énoncé du carnet, ni défis du jour, ni mock officiel,
  -- ni réserve
  neuves AS (
    SELECT DISTINCT ON (qq.notion, md5(qq.prompt))
           qq.id AS q, qq.notion, v.vue_le,
           CASE WHEN qs.title LIKE '% — Drill Fiche Page %' AND qq.position >= 1 THEN ((qq.position - 1) % 3) + 1 ELSE 1 END AS v
    FROM quiz_questions qq
    JOIN quiz_sets qs ON qs.id = qq.set_id AND qs.is_official = true AND qs.official_published = true
    LEFT JOIN library_folders lf ON lf.id = qs.folder_id
    LEFT JOIN vues v ON v.h = md5(qq.prompt)
    WHERE qq.notion = ANY (v_notions)
      AND coalesce(array_length(qq.choices, 1), 0) BETWEEN 2 AND 5
      AND qq.correct_index >= 0 AND qq.correct_index < coalesce(array_length(qq.choices, 1), 0)
      AND NOT (qq.id = ANY (v_exclude))
      AND lf.name IS DISTINCT FROM 'Mocks Officiels (Système)'
      AND qs.title NOT LIKE 'Réserve — %'
      AND NOT EXISTS (SELECT 1 FROM carnet c WHERE c.h = md5(qq.prompt))
    ORDER BY qq.notion, md5(qq.prompt), (v.vue_le IS NOT NULL), v.vue_le, (qs.title LIKE '% — Drill Fiche Page %') DESC, qq.id
  ),
  neuves_rang AS (
    SELECT neuves.*, row_number() OVER (PARTITION BY neuves.notion ORDER BY (neuves.vue_le IS NOT NULL), neuves.vue_le, random()) AS rn
    FROM neuves
  ),
  neuves_pris AS (
    SELECT nr.q, nr.notion, nr.v, row_number() OVER (ORDER BY (nr.rn - 0.5) / w.poids, nr.notion, nr.rn) AS ord
    FROM neuves_rang nr JOIN w ON w.notion = nr.notion
    ORDER BY (nr.rn - 0.5) / w.poids, nr.notion, nr.rn
    LIMIT 24
  ),
  tout AS (
    SELECT 'rature' AS k, q, notion, v, ord AS o FROM rat_pris
    UNION ALL
    SELECT 'neuve', q, notion, v, 1000 + ord FROM neuves_pris
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('i', x.i, 'k', x.k, 'q', x.q, 'n', x.notion, 'v', x.v) ORDER BY x.i), '[]'::jsonb)
  INTO v_pool
  FROM (SELECT tout.*, (row_number() OVER (ORDER BY tout.o) - 1)::int AS i FROM tout) x;

  IF jsonb_array_length(v_pool) = 0 THEN
    RETURN json_build_object('id', NULL, 'reason', 'vide');
  END IF;

  INSERT INTO ateliers (user_id, notions, poids, pool, avant)
  VALUES (v_uid, v_notions, v_poids, v_pool, coalesce(v_avant, '{}'::jsonb))
  RETURNING * INTO v_a;
  RETURN _atelier_json(v_a);
END;
$$
$fn$;
  END IF;
END $do$;

REVOKE ALL ON TABLE ratures_v3_depart FROM anon, authenticated;
REVOKE ALL ON FUNCTION _ratures_v3_depuis() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _rature_a_seche() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rature_suivante(text, uuid[], boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rature_repondre(uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_ratures(text, boolean, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rature_suivante(text, uuid[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION rature_repondre(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ratures(text, boolean, int, int) TO authenticated;
