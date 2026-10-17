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
-- 3b. « À revoir » et la file des révisions : une file par joueur, sans
--    stockage, recalculée à chaque lecture (revisions_dues, service role ;
--    mes_revisions_dues, le joueur connecté) : d'abord les ratures en cours
--    et sèches, puis les rappels (questions dont la dernière réponse est
--    juste, à revoir après 1, 3, 7 puis 21 jours selon le nombre de bonnes
--    réponses d'affilée espacées d'au moins 20 h ; tenues à la cinquième).
--    Jamais plus de 25 par jour, le reste attend sans reproche. La séance
--    « À revoir » (/revoir) réutilise les séries éclair (eclair_series.genre
--    = 'revoir') : ses réponses comptent d'office dans l'anneau du jour, la
--    série d'encre, les réponses du joueur et le carnet. revoir_lancer la
--    crée (ou reprend celle du jour), revoir_repondre raye une rature sèche
--    réussie (le déclencheur ratures_a_seche de la section 3a décide : rayée
--    ou encre fraîche). eclair_start et eclair_finish ne voient plus que les
--    séries éclair. _reponses_cache : les réponses du joueur lues une fois
--    par appel (corps identique à celui de migration_codex_v3.sql).
--    Sans cette section, /revoir dit « bientôt » et renvoie à « Mettre au
--    propre », et les compteurs comptent les ratures ouvertes (25 au plus).
-- 4. La maîtrise unique : une seule définition de la maîtrise d'une
--    matière, partout (Codex, profil, sceaux de matière). maitrise_joueur
--    (service role) lit toutes les réponses du joueur (_reponses_cache) :
--    les 60 plus récentes de chaque matière, la première réponse à une
--    question pesant 2, une réponse donnée moins de 24 h après la
--    précédente à la même question 0,5, les autres 1. Sous 10 réponses la
--    matière n'est pas mesurée, de 10 à 39 elle est provisoire, mesurée à
--    40. Elle rend aussi le début (les 40 premières réponses) et
--    l'ancienne mesure (séances ciblées d'une seule matière, 5 questions au
--    moins), qui garde seule le verrou des rangs : aucun rang ne bouge.
--    Sans cette section, le site garde l'ancienne mesure partout.
-- 5. Le débrief des examens blancs : sous chaque question ratée d'une copie
--    (examen blanc, ou examen officiel du dossier « Mocks Officiels
--    (Système) »), le joueur dit d'où vient l'erreur : savoir, lecture de
--    l'énoncé, calcul, temps ou chance. Un toucher, modifiable, toujours
--    permis (aucun délai). La table blanc_debrief ne s'écrit que par
--    blanc_debrief_noter, qui refuse une question que le joueur n'a pas
--    ratée dans cette copie ; chacun ne lit que ses lignes.
--    blanc_debrief_lire rend l'état d'une copie (erreurs, classées,
--    répartition, temps moyen par question) et mes_causes la répartition de
--    tous les débriefs récents. Le Codex lit la table (quête « Le débrief »).
--    Sans cette section, les boutons de cause restent masqués ; le temps par
--    question s'affiche quand même.

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
-- scellées, celles en cours qui sèchent encore (manquées il y a moins de
-- 24 h, réussies trop tôt ou non : Mise au propre ne les propose pas), et,
-- par rature, seche_le et scellee_le.
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
    'sechent', (SELECT count(*) FROM mes WHERE removed_at IS NULL AND now() < coalesce(seche_le, last_missed_at + interval '24 hours')),
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
    'sechent', (SELECT count(*) FROM mes WHERE removed_at IS NULL AND now() < coalesce(seche_le, last_missed_at + interval '24 hours')),
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

-- ── 3b. « À revoir » et la file des révisions ─────────────────────────
-- Le genre d'une série : 'eclair' (/eclair, toutes les séries d'avant) ou
-- 'revoir' (/revoir). Même table, mêmes réponses, même clôture.
ALTER TABLE eclair_series ADD COLUMN IF NOT EXISTS genre text NOT NULL DEFAULT 'eclair';
ALTER TABLE eclair_series DROP CONSTRAINT IF EXISTS eclair_series_genre_check;
ALTER TABLE eclair_series ADD CONSTRAINT eclair_series_genre_check CHECK (genre IN ('eclair', 'revoir'));
CREATE INDEX IF NOT EXISTS eclair_series_user_genre_ouverte ON eclair_series (user_id, genre, started_at DESC) WHERE finished_at IS NULL;

-- Commencer (ou reprendre) une série éclair (migration_series_eclair.sql) :
-- à l'identique, plus « genre = 'eclair' » dans les lectures de série
-- ouverte (sinon /eclair reprendrait, ou clorait avec XP, une « À revoir »).
CREATE OR REPLACE FUNCTION eclair_start()
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_s       eclair_series;
  v_old     uuid;
  v_today   date := _daily_today();
  v_exclude uuid[];
  v_ids     uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- une seule série à la fois par joueur (deux onglets : la même série)
  PERFORM pg_advisory_xact_lock(hashtext('eclair:' || v_uid::text));

  FOR v_old IN
    SELECT id FROM eclair_series
    WHERE user_id = v_uid AND genre = 'eclair' AND finished_at IS NULL AND started_at < now() - interval '6 hours'
  LOOP
    PERFORM _eclair_close(v_old);
  END LOOP;

  SELECT * INTO v_s FROM eclair_series
  WHERE user_id = v_uid AND genre = 'eclair' AND finished_at IS NULL
  ORDER BY started_at DESC LIMIT 1;
  IF v_s.id IS NOT NULL THEN
    RETURN _eclair_json(v_s);
  END IF;

  -- les défis du jour existent dès qu'on tire une série : leurs questions sont écartées
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true);
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', '', true);
  SELECT coalesce(array_agg(DISTINCT q), '{}'::uuid[]) INTO v_exclude
  FROM daily_challenges dc, unnest(dc.question_ids) AS q
  WHERE dc.day = v_today;

  v_ids := _eclair_pick(v_uid, v_exclude);
  IF coalesce(array_length(v_ids, 1), 0) < 5 THEN
    RETURN json_build_object('id', NULL, 'reason', 'no_bank');
  END IF;

  INSERT INTO eclair_series (user_id, question_ids, answers)
  VALUES (v_uid, v_ids, array_fill(NULL::int, ARRAY[array_length(v_ids, 1)]))
  RETURNING * INTO v_s;
  RETURN _eclair_json(v_s);
END;
$$;

-- Rendre une série (migration_series_eclair.sql) : à l'identique, plus
-- « genre = 'eclair' » dans le compte du jour (une « À revoir » rendue ne
-- compte pas comme série éclair du jour). Elle rend aussi les « À revoir ».
CREATE OR REPLACE FUNCTION eclair_finish(p_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_s      eclair_series;
  v_xp     int;
  v_today  int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM eclair_series WHERE id = p_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Series not found';
  END IF;
  v_s := _eclair_close(p_id);
  IF v_s.id IS NULL THEN
    RETURN json_build_object('id', NULL, 'score', 0, 'total', 0, 'xp_awarded', 0, 'today', 0);
  END IF;

  SELECT coalesce(sum(xp), 0) INTO v_xp FROM xp_events
  WHERE user_id = v_uid AND source = 'eclair' AND meta->>'series_id' = v_s.id::text;
  SELECT count(*) INTO v_today FROM eclair_series
  WHERE user_id = v_uid AND genre = 'eclair' AND finished_at IS NOT NULL
    AND (finished_at AT TIME ZONE 'Europe/Paris')::date = _daily_today();

  RETURN json_build_object(
    'id', v_s.id,
    'score', v_s.score,
    'total', v_s.total,
    'seconds', least(extract(epoch FROM v_s.finished_at - v_s.started_at), 3600)::int,
    'xp_awarded', v_xp,
    'today', v_today
  );
END;
$$;

-- Les réponses du joueur lues une fois par appel (V3 §12.3bis) : une table
-- temporaire de la transaction, indexée, partagée par tous les lecteurs du
-- même appel (codex_journal, codex_mesures_v3, maitrise_joueur,
-- revisions_dues). Corps identique dans migration_codex_v3.sql : le premier
-- fichier collé la crée, le second la remplace par le même texte.
CREATE OR REPLACE FUNCTION _reponses_cache(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF to_regclass('pg_temp._rep_cache') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_temp._rep_cache_cle WHERE user_id = p_user) THEN RETURN; END IF;
    DROP TABLE pg_temp._rep_cache; DROP TABLE IF EXISTS pg_temp._rep_cache_cle;   -- table temporaire de la transaction, pas une donnée
  END IF;
  CREATE TEMP TABLE _rep_cache ON COMMIT DROP AS
    SELECT r.question_id, r.source, r.ok, r.at, m.matiere
    FROM _reponses_joueur(p_user) r LEFT JOIN LATERAL (
      SELECT _codex_matiere(lf.name, qs.title) AS matiere
      FROM quiz_questions qq
      LEFT JOIN quiz_sets qs ON qs.id = qq.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
      WHERE qq.id = r.question_id
      LIMIT 1
    ) m ON true;
  CREATE INDEX ON pg_temp._rep_cache (question_id, at);
  CREATE INDEX ON pg_temp._rep_cache (matiere, at);
  CREATE TEMP TABLE _rep_cache_cle ON COMMIT DROP AS SELECT p_user AS user_id;
END $$;

-- Le palier de rappel de chaque question dont la dernière réponse avant
-- p_avant est juste : k = les bonnes réponses de la série finale (depuis la
-- dernière erreur), espacées d'au moins 20 h (une rafale le même jour compte
-- pour une) ; derniere = la dernière bonne réponse. Seules comptent les
-- réponses des 180 jours avant p_avant (filtre posé avant le calcul).
CREATE OR REPLACE FUNCTION _revoir_paliers(p_user uuid, p_avant timestamptz)
RETURNS TABLE (q uuid, k int, derniere timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_q     uuid;
  v_k     int := 0;
  v_pose  timestamptz;   -- la dernière bonne réponse comptée dans k
  v_der   timestamptz;   -- la dernière bonne réponse tout court
  r       record;
BEGIN
  PERFORM _reponses_cache(p_user);
  FOR r IN
    WITH rep AS (
      SELECT c.question_id, c.ok, c.at FROM pg_temp._rep_cache c
      WHERE c.at < p_avant AND c.at >= p_avant - interval '180 days'
    ),
    faux AS (
      SELECT rep.question_id, max(rep.at) FILTER (WHERE NOT rep.ok) AS dernier_faux FROM rep GROUP BY rep.question_id
    )
    SELECT rep.question_id, rep.at
    FROM rep JOIN faux ON faux.question_id = rep.question_id
    WHERE rep.ok AND (faux.dernier_faux IS NULL OR rep.at > faux.dernier_faux)
    ORDER BY rep.question_id, rep.at
  LOOP
    IF v_q IS DISTINCT FROM r.question_id THEN
      IF v_q IS NOT NULL THEN
        q := v_q; k := v_k; derniere := v_der;
        RETURN NEXT;
      END IF;
      v_q := r.question_id; v_k := 1; v_pose := r.at;
    ELSIF r.at >= v_pose + interval '20 hours' THEN
      v_k := v_k + 1; v_pose := r.at;
    END IF;
    v_der := r.at;
  END LOOP;
  IF v_q IS NOT NULL THEN
    q := v_q; k := v_k; derniere := v_der;
    RETURN NEXT;
  END IF;
END;
$$;

-- La file des révisions d'un joueur pour le jour p_jour (Paris ; défaut :
-- aujourd'hui), p_n éléments au plus (25 au plus) :
-- { aujourdhui, demain, ratures, rappels, items: [{ q, genre, palier, due }] }.
-- 1. Les ratures en cours, visibles et sèches (l'erreur + 24 h, ou seche_le) :
--    la plus ancienne échéance d'abord, puis les plus manquées, puis la
--    première erreur la plus ancienne. palier 0.
-- 2. Les rappels : dernière réponse juste, palier k (1 → 1 jour, 2 → 3 jours,
--    3 → 7 jours, 4 → 21 jours, 5 et plus : tenue, hors de la file), dus
--    d'ici la fin du jour : le plus en retard d'abord, puis la notion la plus
--    fragile (taux d'erreur lissé des 30 derniers jours, comme le « manque »
--    des points faibles). Une rature en cours n'est jamais un rappel.
-- Écartées : questions des défis du jour, questions disparues de la banque,
-- dernière réponse de plus de 180 jours. aujourdhui : 25 au plus, le reste
-- attend ; demain : ce qui reste après aujourd'hui plus ce qui devient dû
-- demain, 25 au plus.
CREATE OR REPLACE FUNCTION revisions_dues(p_user uuid, p_jour date DEFAULT NULL, p_n int DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_jour  date := coalesce(p_jour, _daily_today());
  v_fin   timestamptz;
  v_fin2  timestamptz;
  v_n     int := least(greatest(coalesce(p_n, 25), 0), 25);
  v_defis uuid[];
  v_res   jsonb;
BEGIN
  IF p_user IS NULL THEN
    RETURN NULL;
  END IF;
  v_fin := (v_jour + 1)::timestamp AT TIME ZONE 'Europe/Paris';
  v_fin2 := (v_jour + 2)::timestamp AT TIME ZONE 'Europe/Paris';
  PERFORM _reponses_cache(p_user);
  SELECT coalesce(array_agg(DISTINCT x), '{}'::uuid[]) INTO v_defis
  FROM daily_challenges dc, unnest(dc.question_ids) AS x
  WHERE dc.day = v_jour;

  WITH rat AS (
    SELECT r.question_id, r.misses, r.first_missed_at, r.last_missed_at,
           coalesce(r.seche_le, r.last_missed_at + interval '24 hours') AS sec
    FROM ratures r
    JOIN quiz_questions qq ON qq.id = r.question_id
    WHERE r.user_id = p_user AND r.removed_at IS NULL AND r.visible_from <= now()
      AND greatest(r.last_missed_at, coalesce(r.last_correct_at, r.last_missed_at)) >= now() - interval '180 days'
      AND NOT (r.question_id = ANY (v_defis))
  ),
  rat_dues AS (
    SELECT question_id AS q, 'rature'::text AS genre, 0 AS palier, sec AS due,
           row_number() OVER (ORDER BY last_missed_at, misses DESC, first_missed_at, question_id) AS o
    FROM rat WHERE now() >= sec
  ),
  pal AS (
    SELECT p.q, p.k, qq.notion,
           p.derniere + CASE p.k WHEN 1 THEN interval '1 day' WHEN 2 THEN interval '3 days' WHEN 3 THEN interval '7 days' ELSE interval '21 days' END AS due
    FROM _revoir_paliers(p_user, now()) p
    JOIN quiz_questions qq ON qq.id = p.q
    WHERE p.k BETWEEN 1 AND 4
      AND NOT (p.q = ANY (v_defis))
      AND NOT EXISTS (SELECT 1 FROM ratures r WHERE r.user_id = p_user AND r.question_id = p.q AND r.removed_at IS NULL AND r.visible_from <= now())
  ),
  fragile AS (
    SELECT qq.notion, (count(*) FILTER (WHERE NOT c.ok) + 1.0) / (count(*) + 2.0) AS taux
    FROM pg_temp._rep_cache c
    JOIN quiz_questions qq ON qq.id = c.question_id
    WHERE c.at >= now() - interval '30 days' AND qq.notion IN (SELECT DISTINCT pal.notion FROM pal WHERE pal.due <= v_fin)
    GROUP BY qq.notion
  ),
  rap_dues AS (
    SELECT pal.q, 'rappel'::text AS genre, pal.k AS palier, pal.due,
           row_number() OVER (ORDER BY pal.due, f.taux DESC NULLS LAST, pal.q) AS o
    FROM pal LEFT JOIN fragile f ON f.notion = pal.notion
    WHERE pal.due <= v_fin
  ),
  comptes AS (
    SELECT (SELECT count(*) FROM rat_dues)::int AS nr,
           (SELECT count(*) FROM rap_dues)::int AS np,
           ((SELECT count(*) FROM rat WHERE now() < rat.sec AND rat.sec <= v_fin2)
            + (SELECT count(*) FROM pal WHERE pal.due > v_fin AND pal.due <= v_fin2))::int AS nd
  ),
  file AS (
    SELECT x.*, row_number() OVER (ORDER BY x.rang, x.o) AS i
    FROM (SELECT rat_dues.q, rat_dues.genre, rat_dues.palier, rat_dues.due, rat_dues.o, 0 AS rang FROM rat_dues
          UNION ALL
          SELECT rap_dues.q, rap_dues.genre, rap_dues.palier, rap_dues.due, rap_dues.o, 1 FROM rap_dues) x
  )
  SELECT jsonb_build_object(
    'aujourdhui', least(25, c.nr + c.np),
    'demain', least(25, greatest(c.nr + c.np - 25, 0) + c.nd),
    'ratures', c.nr,
    'rappels', c.np,
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object('q', f.q, 'genre', f.genre, 'palier', f.palier, 'due', f.due) ORDER BY f.i)
                       FROM file f WHERE f.i <= v_n), '[]'::jsonb)
  ) INTO v_res
  FROM comptes c;
  RETURN v_res;
END;
$$;

-- La file du joueur connecté (compteurs « 15 à revoir · demain 22 »).
CREATE OR REPLACE FUNCTION mes_revisions_dues(p_n int DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN revisions_dues(auth.uid(), NULL, p_n);
END;
$$;

-- Une « À revoir » laissée en route : close avec les réponses déjà données,
-- sans XP (celle de la série se gagne en la rendant) ; sans aucune réponse,
-- elle s'efface, comme une série éclair.
CREATE OR REPLACE FUNCTION _revoir_clore(p_id uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_s     eclair_series;
  v_score int;
  v_total int;
BEGIN
  SELECT * INTO v_s FROM eclair_series WHERE id = p_id FOR UPDATE;
  IF v_s.id IS NULL OR v_s.finished_at IS NOT NULL THEN
    RETURN;
  END IF;
  SELECT count(*) FILTER (WHERE v_s.answers[t.pos] = qq.correct_index), count(*)
  INTO v_score, v_total
  FROM unnest(v_s.question_ids) WITH ORDINALITY AS t(qid, pos)
  JOIN quiz_questions qq ON qq.id = t.qid
  WHERE v_s.answers[t.pos] IS NOT NULL;
  IF v_total = 0 THEN
    DELETE FROM eclair_series WHERE id = p_id;
    RETURN;
  END IF;
  UPDATE eclair_series SET finished_at = now(), score = v_score, total = v_total WHERE id = p_id;
END;
$$;

-- Une « À revoir » pour le joueur : la série (comme _eclair_json), plus,
-- par question, son étiquette { q, genre, palier } : celles de la file à la
-- création, recalculées à la reprise (rature en cours au départ de la
-- série, sinon rappel et son palier d'alors).
CREATE OR REPLACE FUNCTION _revoir_json(p_s eclair_series, p_items jsonb)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_etiq jsonb;
BEGIN
  IF p_items IS NULL THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'q', t.qid,
             'genre', CASE WHEN r.question_id IS NOT NULL THEN 'rature' ELSE 'rappel' END,
             'palier', CASE WHEN r.question_id IS NOT NULL THEN 0 ELSE coalesce(p.k, 0) END
           ) ORDER BY t.pos), '[]'::jsonb)
    INTO v_etiq
    FROM unnest(p_s.question_ids) WITH ORDINALITY AS t(qid, pos)
    LEFT JOIN ratures r ON r.user_id = p_s.user_id AND r.question_id = t.qid
      AND r.first_missed_at < p_s.started_at AND r.visible_from <= p_s.started_at
      AND (r.removed_at IS NULL OR r.removed_at >= p_s.started_at)
    LEFT JOIN _revoir_paliers(p_s.user_id, p_s.started_at) p ON p.q = t.qid;
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object('q', e.x -> 'q', 'genre', e.x -> 'genre', 'palier', e.x -> 'palier') ORDER BY e.o), '[]'::jsonb)
    INTO v_etiq
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(x, o);
  END IF;
  RETURN (_eclair_json(p_s)::jsonb || jsonb_build_object('genre', 'revoir', 'etiquettes', v_etiq))::json;
END;
$$;

-- Lancer « À revoir » (p_n questions, de 5 à 25 ; 15 par défaut) : clôt
-- d'abord les « À revoir » laissées en route (plus de 6 h, ou d'un autre
-- jour), reprend celle du jour, sinon en crée une avec la file du jour.
-- Moins de 5 questions dues : { vide: true, aujourdhui, demain }.
CREATE OR REPLACE FUNCTION revoir_lancer(p_n int DEFAULT 15)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_s     eclair_series;
  v_old   uuid;
  v_today date := _daily_today();
  v_rev   jsonb;
  v_ids   uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- même verrou que eclair_start : une série à la fois, deux onglets compris
  PERFORM pg_advisory_xact_lock(hashtext('eclair:' || v_uid::text));

  FOR v_old IN
    SELECT id FROM eclair_series
    WHERE user_id = v_uid AND genre = 'revoir' AND finished_at IS NULL
      AND (started_at < now() - interval '6 hours' OR (started_at AT TIME ZONE 'Europe/Paris')::date <> v_today)
  LOOP
    PERFORM _revoir_clore(v_old);
  END LOOP;

  SELECT * INTO v_s FROM eclair_series
  WHERE user_id = v_uid AND genre = 'revoir' AND finished_at IS NULL
  ORDER BY started_at DESC LIMIT 1;
  IF v_s.id IS NOT NULL THEN
    RETURN _revoir_json(v_s, NULL);
  END IF;

  -- les défis du jour existent avant le tirage : leurs questions sont écartées
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', 'cfa-l1-cinq', true);
  PERFORM _daily_ensure(v_today);
  PERFORM set_config('rl.daily_program', '', true);

  v_rev := revisions_dues(v_uid, v_today, least(greatest(coalesce(p_n, 15), 5), 25));
  IF jsonb_array_length(v_rev -> 'items') < 5 THEN
    RETURN json_build_object('vide', true, 'aujourdhui', (v_rev ->> 'aujourdhui')::int, 'demain', (v_rev ->> 'demain')::int);
  END IF;

  SELECT array_agg((e.x ->> 'q')::uuid ORDER BY e.o) INTO v_ids
  FROM jsonb_array_elements(v_rev -> 'items') WITH ORDINALITY AS e(x, o);
  INSERT INTO eclair_series (user_id, question_ids, answers, genre)
  VALUES (v_uid, v_ids, array_fill(NULL::int, ARRAY[array_length(v_ids, 1)]), 'revoir')
  RETURNING * INTO v_s;
  RETURN _revoir_json(v_s, v_rev -> 'items');
END;
$$;

-- Répondre dans une « À revoir » : le geste d'eclair_answer (réponse
-- définitive, correction immédiate ; le déclencheur ratures_eclair compte
-- déjà la reprise), puis, pour une rature en cours réussie, le rayage :
-- removed_at = last_correct_at, que ratures_a_seche accepte (rayée) ou
-- refuse (encre fraîche). Rien n'est compté deux fois. rature : « rayee »,
-- « fraiche » (avec seche_le), « scellee » (une ancienne réussie 7 jours
-- après son rayage), sinon null.
CREATE OR REPLACE FUNCTION revoir_repondre(p_id uuid, p_position int, p_choix int)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_s      eclair_series;
  v_q      uuid;
  v_neuve  boolean;
  v_avant  ratures;
  v_apres  ratures;
  v_res    jsonb;
  v_rature text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM eclair_series WHERE id = p_id AND user_id = v_uid AND genre = 'revoir';
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'Series not found';
  END IF;
  IF p_position IS NULL OR p_position < 0 OR p_position >= array_length(v_s.question_ids, 1) THEN
    RAISE EXCEPTION 'Invalid position';
  END IF;
  v_q := v_s.question_ids[p_position + 1];
  v_neuve := v_s.finished_at IS NULL AND v_s.answers[p_position + 1] IS NULL;
  SELECT * INTO v_avant FROM ratures WHERE user_id = v_uid AND question_id = v_q;

  v_res := eclair_answer(p_id, p_position, p_choix)::jsonb;

  IF v_neuve AND (v_res ->> 'is_correct')::boolean AND v_avant.question_id IS NOT NULL THEN
    IF v_avant.removed_at IS NULL AND v_avant.visible_from <= now() THEN
      UPDATE ratures SET removed_at = last_correct_at
      WHERE user_id = v_uid AND question_id = v_q AND removed_at IS NULL
        AND last_correct_at IS NOT NULL AND correct_since > v_avant.correct_since;
    END IF;
    SELECT * INTO v_apres FROM ratures WHERE user_id = v_uid AND question_id = v_q;
    v_rature := CASE
      WHEN v_avant.removed_at IS NULL AND v_avant.visible_from <= now() THEN CASE WHEN v_apres.removed_at IS NOT NULL THEN 'rayee' ELSE 'fraiche' END
      WHEN v_avant.removed_at IS NOT NULL AND v_avant.scellee_le IS NULL AND v_apres.scellee_le IS NOT NULL THEN 'scellee'
    END;
  END IF;

  RETURN (v_res || jsonb_build_object('rature', v_rature, 'seche_le', CASE WHEN v_rature = 'fraiche' THEN v_apres.seche_le END))::json;
END;
$$;

REVOKE ALL ON FUNCTION _reponses_cache(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _revoir_paliers(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _revoir_clore(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _revoir_json(eclair_series, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION revisions_dues(uuid, date, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION mes_revisions_dues(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION revoir_lancer(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION revoir_repondre(uuid, int, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION eclair_start() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION eclair_finish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION revisions_dues(uuid, date, int) TO service_role;
GRANT EXECUTE ON FUNCTION mes_revisions_dues(int) TO authenticated;
GRANT EXECUTE ON FUNCTION revoir_lancer(int) TO authenticated;
GRANT EXECUTE ON FUNCTION revoir_repondre(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION eclair_start() TO authenticated;
GRANT EXECUTE ON FUNCTION eclair_finish(uuid) TO authenticated;

-- ── 4. la maîtrise unique ─────────────────────────────────────────────
-- La maîtrise d'un joueur, matière par matière, pour un programme (défaut :
-- le CFA Niveau I, clés nues ; un autre programme a des clés « slug:m »,
-- « finance/cfa-l2 » → « cfa-l2:fsa »). Mêmes constantes que lib/maitrise.ts
-- (MAITRISE) : fenêtre 60, provisoire dès 10, mesurée dès 40, poids 2 / 0,5
-- / 1, début sur 40.
-- { v: 1, matieres: { <clé>: { pct, n, total, statut, derniere, debut, ancienne } } }
--   pct      : 100 × Σ(poids × juste) / Σ poids sur les 60 réponses les plus
--              récentes, arrondi ; null sous 10 réponses ;
--   n        : réponses dans la fenêtre (60 au plus) ; total : toutes ;
--   statut   : non_mesuree (< 10), provisoire (10 à 39), mesuree (40 et plus) ;
--   derniere : la dernière réponse de la matière ;
--   debut    : le même calcul sur les 40 premières réponses (null sous 40) ;
--   ancienne : l'ancienne règle de lib/mastery.ts (séances ciblées d'une
--              seule matière, 5 questions au moins), arrondie comme
--              Math.round : le verrou des rangs la lit seule (CFA I).
-- Une matière sans réponse ni ancienne mesure est absente (le site la
-- complète en non_mesuree). Rend NULL sans _reponses_joueur ou
-- _codex_matiere (le site se replie sur l'ancienne mesure).
CREATE OR REPLACE FUNCTION maitrise_joueur(p_user uuid, p_programme text DEFAULT 'finance/cfa-l1')
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prog text := coalesce(p_programme, 'finance/cfa-l1');
  v_cfa1 boolean;
  v_pref text;
  v_res  jsonb;
BEGIN
  IF p_user IS NULL OR to_regprocedure('public._reponses_joueur(uuid)') IS NULL
     OR to_regprocedure('public._codex_matiere(text,text)') IS NULL THEN
    RETURN NULL;
  END IF;
  v_cfa1 := v_prog = 'finance/cfa-l1';
  -- le préfixe des clés d'un autre programme : son slug (sans le domaine)
  v_pref := CASE WHEN strpos(v_prog, '/') > 0 THEN split_part(v_prog, '/', 2) ELSE v_prog END || ':';
  PERFORM _reponses_cache(p_user);

  WITH rep AS (
    SELECT c.matiere, c.question_id, c.ok, c.at,
           lag(c.at) OVER (PARTITION BY c.question_id ORDER BY c.at, c.ok) AS avant
    FROM pg_temp._rep_cache c
    WHERE c.matiere IS NOT NULL AND c.at IS NOT NULL
      AND CASE WHEN v_cfa1 THEN strpos(c.matiere, ':') = 0 ELSE left(c.matiere, length(v_pref)) = v_pref END
  ),
  pesees AS (
    SELECT rep.matiere, rep.ok, rep.at,
           CASE WHEN rep.avant IS NULL THEN 2.0
                WHEN rep.at - rep.avant < interval '24 hours' THEN 0.5
                ELSE 1.0 END AS poids,
           row_number() OVER (PARTITION BY rep.matiere ORDER BY rep.at DESC, rep.question_id, rep.ok) AS recent,
           row_number() OVER (PARTITION BY rep.matiere ORDER BY rep.at, rep.question_id, rep.ok) AS ancien
    FROM rep
  ),
  agg AS (
    SELECT p.matiere,
           count(*) FILTER (WHERE p.recent <= 60)::int AS n,
           count(*)::int AS total,
           sum(p.poids) FILTER (WHERE p.recent <= 60 AND p.ok) AS fj,
           sum(p.poids) FILTER (WHERE p.recent <= 60) AS f,
           sum(p.poids) FILTER (WHERE p.ancien <= 40 AND p.ok) AS dj,
           sum(p.poids) FILTER (WHERE p.ancien <= 40) AS d,
           max(p.at) AS derniere
    FROM pesees p
    GROUP BY p.matiere
  ),
  anc AS (
    SELECT r.topics[1] AS matiere, sum(coalesce(r.score, 0)) AS justes, sum(coalesce(r.total, 0)) AS questions
    FROM practice_session_results r
    WHERE v_cfa1 AND r.user_id = p_user AND cardinality(r.topics) = 1 AND strpos(r.topics[1], ':') = 0
    GROUP BY r.topics[1]
  ),
  cles AS (
    SELECT agg.matiere FROM agg UNION SELECT anc.matiere FROM anc
  )
  SELECT jsonb_build_object('v', 1, 'matieres', coalesce(jsonb_object_agg(k.matiere, jsonb_build_object(
           'pct', CASE WHEN coalesce(a.n, 0) >= 10 THEN round(100 * coalesce(a.fj, 0) / a.f)::int END,
           'n', coalesce(a.n, 0),
           'total', coalesce(a.total, 0),
           'statut', CASE WHEN coalesce(a.n, 0) >= 40 THEN 'mesuree' WHEN coalesce(a.n, 0) >= 10 THEN 'provisoire' ELSE 'non_mesuree' END,
           'derniere', a.derniere,
           'debut', CASE WHEN coalesce(a.total, 0) >= 40 THEN round(100 * coalesce(a.dj, 0) / a.d)::int END,
           -- (justes / questions) × 100 en double précision, arrondi comme Math.round
           'ancienne', CASE WHEN x.questions >= 5 THEN floor(x.justes::float8 / x.questions::float8 * 100 + 0.5)::int END
         )), '{}'::jsonb))
  INTO v_res
  FROM cles k
  LEFT JOIN agg a ON a.matiere = k.matiere
  LEFT JOIN anc x ON x.matiere = k.matiere;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION maitrise_joueur(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION maitrise_joueur(uuid, text) TO service_role;

-- ── 5. le débrief des examens blancs ──────────────────────────────────
-- Une ligne par question ratée classée. La copie est désignée par sa source
-- et sa référence : « blanc » → mock_exams.id (une copie par joueur) ;
-- « officiel » → quiz_attempts.id d'un examen du dossier « Mocks Officiels
-- (Système) ».
CREATE TABLE IF NOT EXISTS blanc_debrief (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text        NOT NULL CHECK (source IN ('blanc', 'officiel')),
  ref         uuid        NOT NULL,
  question_id uuid        NOT NULL,
  cause       text        NOT NULL CHECK (cause IN ('savoir', 'lecture', 'calcul', 'temps', 'chance')),
  note_le     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, source, ref, question_id)
);
CREATE INDEX IF NOT EXISTS blanc_debrief_user_note ON blanc_debrief (user_id, note_le);

-- chacun lit les siennes ; aucune écriture directe (blanc_debrief_noter seule)
ALTER TABLE blanc_debrief ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blanc_debrief_select_own ON blanc_debrief;
CREATE POLICY blanc_debrief_select_own ON blanc_debrief FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE ALL ON TABLE blanc_debrief FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE blanc_debrief FROM authenticated;
GRANT SELECT ON TABLE blanc_debrief TO authenticated;

-- Les questions ratées d'une copie du joueur (laissées sans réponse
-- comprises, comme la correction du site) ; rien si la copie n'est pas la
-- sienne.
-- - Examen blanc : les questions de l'examen, d'après les réponses rendues
--   (comme get_mock_exam_review).
-- - Examen officiel joué en mode examen : les réponses gardées dans la copie.
-- - Examen officiel joué en entier dans /qcm : la copie ne garde pas ses
--   réponses, mais chaque erreur a été notée au carnet pendant le passage
--   (noter_reponse) : ce sont les ratures de ce QCM ravivées entre le début
--   et la fin du passage. Une erreur refaite plus tard sur la même question
--   la date d'après : seul le dernier passage se débriefe alors pour elle.
CREATE OR REPLACE FUNCTION _blanc_erreurs(p_user uuid, p_source text, p_ref uuid)
RETURNS TABLE (question_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_set     uuid;
  v_answers jsonb;
  v_at      timestamptz;
  v_duree   int;
BEGIN
  IF p_user IS NULL OR p_ref IS NULL THEN
    RETURN;
  END IF;

  IF p_source = 'blanc' THEN
    IF to_regclass('public.mock_exam_results') IS NULL OR to_regclass('public.mock_exam_questions') IS NULL THEN
      RETURN;
    END IF;
    SELECT r.answers INTO v_answers
    FROM mock_exam_results r
    WHERE r.exam_id = p_ref AND r.user_id = p_user AND jsonb_typeof(r.answers) = 'array';
    IF v_answers IS NULL THEN
      RETURN;
    END IF;
    RETURN QUERY
      WITH donnees AS (
        SELECT CASE WHEN e->>'question_id' ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' THEN (e->>'question_id')::uuid END AS qid,
               CASE WHEN e->>'selected_index' ~ '^[0-9]{1,3}$' THEN (e->>'selected_index')::int END AS sel
        FROM jsonb_array_elements(v_answers) AS e
      )
      SELECT meq.question_id
      FROM mock_exam_questions meq
      JOIN quiz_questions qq ON qq.id = meq.question_id
      WHERE meq.exam_id = p_ref
        AND NOT EXISTS (SELECT 1 FROM donnees d WHERE d.qid = qq.id AND d.sel = qq.correct_index);
    RETURN;
  END IF;

  IF p_source = 'officiel' THEN
    IF to_regclass('public.quiz_attempts') IS NULL OR to_regclass('public.library_folders') IS NULL THEN
      RETURN;
    END IF;
    SELECT qa.set_id, qa.answers, qa.created_at, qa.duration_seconds INTO v_set, v_answers, v_at, v_duree
    FROM quiz_attempts qa
    JOIN quiz_sets qs ON qs.id = qa.set_id
    JOIN library_folders lf ON lf.id = qs.folder_id AND lf.name = 'Mocks Officiels (Système)'
    WHERE qa.id = p_ref AND qa.user_id = p_user;
    IF v_set IS NULL THEN
      RETURN;
    END IF;
    IF jsonb_typeof(v_answers) = 'array' THEN
      RETURN QUERY
        SELECT DISTINCT qq.id
        FROM jsonb_array_elements(v_answers) AS e
        JOIN quiz_questions qq
          ON e->>'question_id' ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' AND qq.id = (e->>'question_id')::uuid
        WHERE qq.set_id = v_set
          AND (CASE WHEN e->>'selected_index' ~ '^[0-9]{1,3}$' THEN (e->>'selected_index')::int END) IS DISTINCT FROM qq.correct_index;
    ELSIF to_regclass('public.ratures') IS NOT NULL AND v_at IS NOT NULL THEN
      RETURN QUERY
        SELECT r.question_id
        FROM ratures r
        JOIN quiz_questions qq ON qq.id = r.question_id AND qq.set_id = v_set
        WHERE r.user_id = p_user
          AND r.last_missed_at <= v_at + interval '1 minute'
          AND r.last_missed_at >= v_at - make_interval(secs => coalesce(v_duree, 6 * 3600) + 300);
    END IF;
  END IF;
END;
$$;

-- Classer une erreur, ou changer sa cause ; rend l'avancement de la copie.
CREATE OR REPLACE FUNCTION blanc_debrief_noter(p_source text, p_ref uuid, p_question uuid, p_cause text)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_erreurs  uuid[];
  v_classees int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('blanc', 'officiel') THEN
    RAISE EXCEPTION 'Invalid source';
  END IF;
  IF p_cause IS NULL OR p_cause NOT IN ('savoir', 'lecture', 'calcul', 'temps', 'chance') THEN
    RAISE EXCEPTION 'Invalid cause';
  END IF;
  SELECT coalesce(array_agg(DISTINCT e.question_id), '{}') INTO v_erreurs FROM _blanc_erreurs(v_uid, p_source, p_ref) e;
  IF p_question IS NULL OR NOT (p_question = ANY (v_erreurs)) THEN
    RAISE EXCEPTION 'Not a missed question';
  END IF;

  INSERT INTO blanc_debrief (user_id, source, ref, question_id, cause, note_le)
  VALUES (v_uid, p_source, p_ref, p_question, p_cause, now())
  ON CONFLICT (user_id, source, ref, question_id) DO UPDATE SET cause = excluded.cause, note_le = excluded.note_le;

  SELECT count(*)::int INTO v_classees
  FROM blanc_debrief d
  WHERE d.user_id = v_uid AND d.source = p_source AND d.ref = p_ref AND d.question_id = ANY (v_erreurs);
  RETURN json_build_object('erreurs', cardinality(v_erreurs), 'classees', v_classees);
END;
$$;

-- L'état du débrief d'une copie : erreurs, classées, répartition par cause,
-- la cause de chaque question classée, et le temps moyen par question
-- (durée de la copie / questions ; null sans durée). NULL si la copie n'est
-- pas celle du joueur.
CREATE OR REPLACE FUNCTION blanc_debrief_lire(p_source text, p_ref uuid)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_total int;
  v_duree int;
  v_res   json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source = 'blanc' AND to_regclass('public.mock_exam_results') IS NOT NULL THEN
    SELECT r.total, r.duration_seconds INTO v_total, v_duree
    FROM mock_exam_results r WHERE r.exam_id = p_ref AND r.user_id = v_uid;
  ELSIF p_source = 'officiel' AND to_regclass('public.quiz_attempts') IS NOT NULL THEN
    SELECT qa.total, qa.duration_seconds INTO v_total, v_duree
    FROM quiz_attempts qa WHERE qa.id = p_ref AND qa.user_id = v_uid;
  END IF;
  IF v_total IS NULL THEN
    RETURN NULL;
  END IF;

  WITH erreurs AS (
    SELECT DISTINCT e.question_id FROM _blanc_erreurs(v_uid, p_source, p_ref) e
  ),
  notes AS (
    SELECT d.question_id, d.cause
    FROM blanc_debrief d JOIN erreurs e ON e.question_id = d.question_id
    WHERE d.user_id = v_uid AND d.source = p_source AND d.ref = p_ref
  )
  SELECT json_build_object(
           'erreurs', (SELECT count(*) FROM erreurs)::int,
           'classees', (SELECT count(*) FROM notes)::int,
           'causes', json_build_object(
             'savoir', (SELECT count(*) FROM notes WHERE cause = 'savoir')::int,
             'lecture', (SELECT count(*) FROM notes WHERE cause = 'lecture')::int,
             'calcul', (SELECT count(*) FROM notes WHERE cause = 'calcul')::int,
             'temps', (SELECT count(*) FROM notes WHERE cause = 'temps')::int,
             'chance', (SELECT count(*) FROM notes WHERE cause = 'chance')::int),
           'notes', coalesce((SELECT json_object_agg(question_id, cause) FROM notes), '{}'::json),
           'secondesParQuestion', CASE WHEN v_total > 0 AND v_duree > 0 THEN round(v_duree::numeric / v_total)::int END)
  INTO v_res;
  RETURN v_res;
END;
$$;

-- La répartition des causes de tous les débriefs des p_jours derniers jours
-- (en %, arrondis), et leur nombre.
CREATE OR REPLACE FUNCTION mes_causes(p_jours int DEFAULT 60)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_depuis timestamptz := now() - make_interval(days => least(greatest(coalesce(p_jours, 60), 1), 365));
  v_res    json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT json_build_object(
           'savoir', CASE WHEN x.n > 0 THEN round(100.0 * x.savoir / x.n)::int ELSE 0 END,
           'lecture', CASE WHEN x.n > 0 THEN round(100.0 * x.lecture / x.n)::int ELSE 0 END,
           'calcul', CASE WHEN x.n > 0 THEN round(100.0 * x.calcul / x.n)::int ELSE 0 END,
           'temps', CASE WHEN x.n > 0 THEN round(100.0 * x.temps / x.n)::int ELSE 0 END,
           'chance', CASE WHEN x.n > 0 THEN round(100.0 * x.chance / x.n)::int ELSE 0 END,
           'n', x.n)
  INTO v_res
  FROM (
    SELECT count(*)::int AS n,
           count(*) FILTER (WHERE d.cause = 'savoir') AS savoir,
           count(*) FILTER (WHERE d.cause = 'lecture') AS lecture,
           count(*) FILTER (WHERE d.cause = 'calcul') AS calcul,
           count(*) FILTER (WHERE d.cause = 'temps') AS temps,
           count(*) FILTER (WHERE d.cause = 'chance') AS chance
    FROM blanc_debrief d
    WHERE d.user_id = v_uid AND d.note_le >= v_depuis
  ) x;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION _blanc_erreurs(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION blanc_debrief_noter(text, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION blanc_debrief_lire(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION mes_causes(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION blanc_debrief_noter(text, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION blanc_debrief_lire(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mes_causes(int) TO authenticated;
