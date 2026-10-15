-- Le Codex : le moteur de quêtes (journal d'événements, progression,
-- contrats du jour, récompenses). La bible : docs/codex/CONCEPTION.md ; le
-- contenu (231 quêtes, 15 modèles de contrats) vit dans le site
-- (lib/codex/catalogue.ts), PAS ici : la base ne connaît ni les quêtes ni
-- leurs seuils, elle sait seulement
--   - dire ce qui s'est passé (le journal normalisé),
--   - compter et mesurer sur demande (le site lui envoie des objectifs),
--   - garder la progression, les contrats du jour et les récompenses, une
--     seule fois.
--
-- À coller une fois dans le SQL Editor de Supabase. Idempotent (rejouable,
-- y compris après d'autres migrations : le journal se complète des tables
-- qui existent). Aucune donnée existante n'est modifiée ni supprimée.
-- Rien n'est obligatoire avant : les tables absentes sont ignorées ; pour un
-- journal complet, avoir collé migration_notions.sql + migration_atelier.sql
-- (fonction _reponses_joueur : toutes les réponses, toutes sources),
-- migration_profil_sceaux.sql (rayee_le, duel_mentions, sceaux) et
-- migration_serie_encre.sql (jours d'encre). Sans _reponses_joueur, seules
-- les réponses de fiche (quiz_answer_log) comptent comme « réponses ».
--
-- 1. codex_matieres : la table des dossiers / préfixes de drill de chaque
--    matière (miroir de SUBJECTS, components/reviser/catalog.ts) ; sert à
--    ranger une question dans sa matière. Le serveur seulement.
-- 2. codex_joueur : une ligne par joueur (premier calcul, dernier calcul, la
--    cérémonie rétroactive « Léonard a feuilleté ton carnet »).
-- 3. codex_progression : (joueur, quête, période) -> état verrouillée /
--    disponible / active / terminée / récompensée, progression, dates, XP
--    réellement versée, cosmétique ou titre donné. période = '' (quêtes
--    uniques), le jour AAAA-MM-JJ (contrats du jour), le lundi de la semaine
--    (contrats de la semaine). Lecture : chacun la sienne. Écriture : le
--    serveur seulement (codex_ecrire).
-- 4. codex_evenements + codex_noter : les trois événements suivis nulle part
--    ailleurs (cours_ecoute, flashcards_revues, fiche_ouverte), écrits par le
--    joueur lui-même via codex_noter (plafonds par appel et par jour).
-- 5. codex_contrats : le tirage des 3 contrats du jour, stable par joueur et
--    par jour (codex_contrats_poser), un seul changement par jour
--    (codex_contrat_changer).
-- 6. codex_journal(uuid) : le JOURNAL D'ÉVÉNEMENTS normalisé d'un joueur
--    (evenement, quand, champs jsonb), assemblé depuis les tables existantes.
--    C'est une fonction plutôt qu'une vue : elle prend le joueur en
--    paramètre (une seule lecture indexée par table) et ignore les tables
--    pas encore collées. Une nouvelle fonctionnalité = une nouvelle ligne
--    dans cette fonction (+ son type dans lib/codex/types.ts).
-- 7. codex_lire(uuid, jsonb, date) : compte les événements demandés (filtre,
--    fenêtre, distinct, somme ; date à laquelle le seuil est atteint) et
--    rend les mesures et prédicats spéciaux que la base sait calculer.
-- 8. codex_ecrire(uuid, jsonb, int) : écrit la progression et verse les
--    récompenses EN UNE FOIS : l'XP passe par xp_events avec la source
--    'codex' (que le déclencheur de la série d'encre NE multiplie PAS : il
--    ne touche que ses 5 sources de questions) et profiles.xp_total, dans la
--    même transaction que la ligne de progression, uniquement si la ligne
--    passe à « récompensée ». XP rétroactive plafonnée (budget fourni par le
--    site). Un index unique sur xp_events double la sécurité.

DO $$
BEGIN
  IF to_regclass('public.xp_events') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'xp_events et profiles doivent exister (supabase/leveling.sql, supabase_schema.sql)';
  END IF;
  IF to_regclass('public.quiz_questions') IS NULL OR to_regclass('public.quiz_sets') IS NULL THEN
    RAISE EXCEPTION 'quiz_questions et quiz_sets doivent exister (supabase_schema.sql)';
  END IF;
END $$;

-- ── 1. codex_matieres ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codex_matieres (
  cle           text PRIMARY KEY,
  nom           text NOT NULL,
  -- dossiers de la banque (français et anglais) : lib/answer-stats.ts FOLDER_SUBJECT
  dossiers      text[] NOT NULL DEFAULT '{}',
  -- « <préfixe> — Drill Fiche Page N (thème) » ; NULL : pas de drill
  prefixe_drill text,
  -- slug de la fiche (/fiches/<slug>) ; NULL : pas de fiche
  fiche         text
);
ALTER TABLE codex_matieres ENABLE ROW LEVEL SECURITY;
-- aucune politique : le serveur seulement

INSERT INTO codex_matieres (cle, nom, dossiers, prefixe_drill, fiche) VALUES
  ('ethics',       'Ethics',                        ARRAY['Éthique et Standards Professionnels (Système)', 'Ethics (Système)'], NULL, NULL),
  ('quant',        'Quantitative Methods',          ARRAY['Méthodes Quantitatives (Système)', 'Quantitative Methods (Système)'], NULL, NULL),
  ('economics',    'Economics',                     ARRAY['Économie (Système)', 'Economics (Système)'], 'Economics', 'economics'),
  ('corporate',    'Corporate Issuers',             ARRAY['Finance d''Entreprise (Système)', 'Corporate Issuers (Système)'], NULL, NULL),
  ('fsa',          'Financial Statement Analysis',  ARRAY['Financial Statement Analysis (Système)', 'Analyse des États Financiers (Système)'], 'Financial Statement Analysis', 'financial-statement-analysis'),
  ('equity',       'Equity Investments',            ARRAY['Equity (Système)', 'Investissements en Actions (Système)'], 'Equity', 'equity'),
  ('fixed_income', 'Fixed Income',                  ARRAY['Fixed Income (Système)'], 'Fixed Income', 'fixed-income'),
  ('derivatives',  'Derivatives',                   ARRAY['Instruments Dérivés (Système)', 'Derivatives (Système)'], NULL, 'derivatives'),
  ('alternatives', 'Alternative Investments',       ARRAY['Investissements Alternatifs (Système)', 'Alternative Investments (Système)'], NULL, NULL),
  ('portfolio',    'Portfolio Management',          ARRAY['Portfolio Management (Système)', 'Gestion de Portefeuille (Système)'], 'Portfolio Management', 'portfolio-management')
ON CONFLICT (cle) DO UPDATE
  SET nom = EXCLUDED.nom, dossiers = EXCLUDED.dossiers, prefixe_drill = EXCLUDED.prefixe_drill, fiche = EXCLUDED.fiche;

-- La matière d'un quiz : son dossier d'abord, sinon le début de son titre.
CREATE OR REPLACE FUNCTION _codex_matiere(p_dossier text, p_titre text)
RETURNS text LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT m.cle FROM codex_matieres m WHERE p_dossier IS NOT NULL AND p_dossier = ANY (m.dossiers) LIMIT 1),
    (SELECT m.cle FROM codex_matieres m
     WHERE p_titre IS NOT NULL AND (m.prefixe_drill = split_part(p_titre, ' — ', 1) OR lower(m.nom) = lower(split_part(p_titre, ' — ', 1))) LIMIT 1)
  );
$$;

-- Le palier de classement d'un ELO (miroir de TIERS.min, lib/ranks.ts, sans le Top 10 qui tient à la place).
CREATE OR REPLACE FUNCTION _codex_palier(p_elo int)
RETURNS int LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE WHEN p_elo >= 1850 THEN 6 WHEN p_elo >= 1700 THEN 5 WHEN p_elo >= 1550 THEN 4
              WHEN p_elo >= 1400 THEN 3 WHEN p_elo >= 1250 THEN 2 WHEN p_elo >= 1100 THEN 1 ELSE 0 END
$$;

-- ── 2. codex_joueur ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codex_joueur (
  user_id        uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  programme      text        NOT NULL DEFAULT 'finance/cfa-l1',
  -- le premier calcul : tout ce qui est validé à cet instant est rétroactif
  premier_calcul timestamptz NOT NULL DEFAULT now(),
  dernier_calcul timestamptz NOT NULL DEFAULT now(),
  -- ce que la rétroactivité a donné ({xp, quetes, actes, cosmetiques, titres}), jusqu'à la cérémonie
  retro          jsonb,
  retro_vue      boolean     NOT NULL DEFAULT false
);
ALTER TABLE codex_joueur ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_joueur_select_own ON codex_joueur;
CREATE POLICY codex_joueur_select_own ON codex_joueur FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── 3. codex_progression ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codex_progression (
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- stable, jamais réutilisé : « trame:prologue:dix », « branche:fsa:drill », « contrat:ratures:2026-10-15 »
  quete_id       text        NOT NULL CHECK (char_length(quete_id) BETWEEN 1 AND 120),
  -- '' (unique) | jour AAAA-MM-JJ (contrat du jour) | lundi AAAA-MM-JJ (contrat de la semaine)
  periode        text        NOT NULL DEFAULT '' CHECK (periode = '' OR periode ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  programme      text        NOT NULL DEFAULT 'finance/cfa-l1',
  famille        text        NOT NULL CHECK (famille IN ('trame', 'branche', 'longcours', 'contrat', 'exploit', 'acte')),
  etat           text        NOT NULL DEFAULT 'disponible'
                             CHECK (etat IN ('verrouillee', 'disponible', 'active', 'terminee', 'recompensee')),
  -- l'avancée vers la cible (compteur ou mesure), pour la barre ; cible : le seuil
  progression    numeric     NOT NULL DEFAULT 0,
  cible          numeric,
  -- ouverte : les prérequis sont remplis (c'est le départ de la fenêtre « depuisOuverture »)
  ouverte_le     timestamptz NOT NULL DEFAULT now(),
  terminee_le    timestamptz,
  recompensee_le timestamptz,
  -- validée par la rétroactivité : « avant le … »
  retro          boolean     NOT NULL DEFAULT false,
  -- l'XP réellement versée (plafonnée), le cosmétique et le titre donnés
  xp             integer     NOT NULL DEFAULT 0 CHECK (xp >= 0),
  cosmetique     text,
  titre          text,
  -- la fanfare a été montrée (ou n'a pas lieu d'être : rétroactif)
  vu             boolean     NOT NULL DEFAULT false,
  maj            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quete_id, periode)
);
CREATE INDEX IF NOT EXISTS codex_progression_etat ON codex_progression (user_id, etat);
CREATE INDEX IF NOT EXISTS codex_progression_a_feter ON codex_progression (user_id) WHERE etat = 'recompensee' AND NOT vu;
ALTER TABLE codex_progression ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_progression_select_own ON codex_progression;
CREATE POLICY codex_progression_select_own ON codex_progression FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : codex_ecrire seulement

-- l'XP d'une quête ne se verse qu'une fois, même si la progression est effacée à la main
CREATE UNIQUE INDEX IF NOT EXISTS xp_events_codex_une_fois ON xp_events (user_id, (meta->>'quete'), (meta->>'periode')) WHERE source = 'codex';

-- ── 4. codex_evenements + codex_noter ─────────────────────────────────
CREATE TABLE IF NOT EXISTS codex_evenements (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type    text        NOT NULL CHECK (type IN ('cours_ecoute', 'flashcards_revues', 'fiche_ouverte')),
  quand   timestamptz NOT NULL DEFAULT now(),
  champs  jsonb       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS codex_evenements_user ON codex_evenements (user_id, type, quand);
ALTER TABLE codex_evenements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_evenements_select_own ON codex_evenements;
CREATE POLICY codex_evenements_select_own ON codex_evenements FOR SELECT TO authenticated USING (user_id = auth.uid());
-- aucune politique d'écriture : codex_noter seulement

-- Le joueur note ce que le site ne suit pas ailleurs. Bornes : un appel dit
-- au plus 15 minutes de cours ou 100 cartes ; au plus 240 minutes, 400 cartes
-- et 40 fiches par jour (jour de Paris) : un client qui boucle ne farme rien.
--   cours_ecoute      {matiere, minutes}
--   flashcards_revues {matiere?, cartes}
--   fiche_ouverte     {matiere, fiche}   (une fois par fiche et par jour)
CREATE OR REPLACE FUNCTION codex_noter(p_type text, p_champs jsonb)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_mat    text;
  v_fiche  text;
  v_n      numeric;
  v_jour   date := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_deja   numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('cours_ecoute', 'flashcards_revues', 'fiche_ouverte') OR p_champs IS NULL OR jsonb_typeof(p_champs) <> 'object' THEN
    RAISE EXCEPTION 'Événement inconnu';
  END IF;
  v_mat := p_champs->>'matiere';
  IF v_mat IS NOT NULL AND v_mat !~ '^[a-z_]{2,40}$' THEN
    RAISE EXCEPTION 'Matière invalide';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('codex_noter:' || v_uid::text));

  IF p_type = 'cours_ecoute' THEN
    IF v_mat IS NULL OR jsonb_typeof(p_champs->'minutes') <> 'number' THEN RAISE EXCEPTION 'Champs invalides'; END IF;
    v_n := round(least(15, greatest(0, (p_champs->>'minutes')::numeric)), 2);
    IF v_n <= 0 THEN RETURN; END IF;
    SELECT coalesce(sum((champs->>'minutes')::numeric), 0) INTO v_deja FROM codex_evenements
      WHERE user_id = v_uid AND type = 'cours_ecoute' AND (quand AT TIME ZONE 'Europe/Paris')::date = v_jour;
    v_n := least(v_n, greatest(0, 240 - v_deja));
    IF v_n <= 0 THEN RETURN; END IF;
    INSERT INTO codex_evenements (user_id, type, champs) VALUES (v_uid, 'cours_ecoute', jsonb_build_object('matiere', v_mat, 'minutes', v_n));
  ELSIF p_type = 'flashcards_revues' THEN
    IF jsonb_typeof(p_champs->'cartes') <> 'number' THEN RAISE EXCEPTION 'Champs invalides'; END IF;
    v_n := least(100, greatest(0, floor((p_champs->>'cartes')::numeric)));
    IF v_n <= 0 THEN RETURN; END IF;
    SELECT coalesce(sum((champs->>'cartes')::numeric), 0) INTO v_deja FROM codex_evenements
      WHERE user_id = v_uid AND type = 'flashcards_revues' AND (quand AT TIME ZONE 'Europe/Paris')::date = v_jour;
    v_n := least(v_n, greatest(0, 400 - v_deja));
    IF v_n <= 0 THEN RETURN; END IF;
    INSERT INTO codex_evenements (user_id, type, champs) VALUES (v_uid, 'flashcards_revues', jsonb_build_object('matiere', v_mat, 'cartes', v_n));
  ELSE
    v_fiche := p_champs->>'fiche';
    IF v_mat IS NULL OR v_fiche IS NULL OR v_fiche !~ '^[a-z0-9-]{2,60}$' THEN RAISE EXCEPTION 'Champs invalides'; END IF;
    IF EXISTS (SELECT 1 FROM codex_evenements WHERE user_id = v_uid AND type = 'fiche_ouverte' AND champs->>'fiche' = v_fiche
                 AND (quand AT TIME ZONE 'Europe/Paris')::date = v_jour) THEN
      RETURN;
    END IF;
    IF (SELECT count(*) FROM codex_evenements WHERE user_id = v_uid AND type = 'fiche_ouverte' AND (quand AT TIME ZONE 'Europe/Paris')::date = v_jour) >= 40 THEN
      RETURN;
    END IF;
    INSERT INTO codex_evenements (user_id, type, champs) VALUES (v_uid, 'fiche_ouverte', jsonb_build_object('matiere', v_mat, 'fiche', v_fiche));
  END IF;
END;
$$;

-- ── 5. codex_contrats ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS codex_contrats (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jour        date        NOT NULL,
  -- faiblesse | entretien | variete
  emplacement text        NOT NULL CHECK (emplacement IN ('faiblesse', 'entretien', 'variete')),
  -- l'id du modèle (lib/codex/catalogue.ts, MODELES_CONTRATS) ; l'instance est « contrat:<modele>:<jour> »
  modele      text        NOT NULL CHECK (char_length(modele) BETWEEN 1 AND 60),
  -- les paramètres tirés ({matiere, notion, fiche})
  params      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  tire_le     timestamptz NOT NULL DEFAULT now(),
  -- ce contrat est le remplaçant choisi (un seul changement par jour)
  change      boolean     NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, jour, emplacement)
);
ALTER TABLE codex_contrats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS codex_contrats_select_own ON codex_contrats;
CREATE POLICY codex_contrats_select_own ON codex_contrats FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Le tirage du jour : le site tire (graine = joueur + jour), la base GARDE.
-- Les emplacements déjà tirés ne bougent pas : le premier appel de la journée
-- gagne, tous les suivants relisent. Rend les contrats du jour.
--   p_tirage : [{emplacement, modele, params}]
CREATE OR REPLACE FUNCTION codex_contrats_poser(p_user uuid, p_jour date, p_tirage jsonb)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t record;
BEGIN
  IF p_user IS NULL OR p_jour IS NULL OR p_tirage IS NULL OR jsonb_typeof(p_tirage) <> 'array' THEN
    RAISE EXCEPTION 'Tirage invalide';
  END IF;
  IF p_jour > (now() AT TIME ZONE 'Europe/Paris')::date + 1 THEN
    RAISE EXCEPTION 'Jour invalide';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('codex_contrats:' || p_user::text));
  FOR t IN SELECT value AS v FROM jsonb_array_elements(p_tirage) LOOP
    CONTINUE WHEN t.v->>'emplacement' NOT IN ('faiblesse', 'entretien', 'variete') OR coalesce(t.v->>'modele', '') = '';
    INSERT INTO codex_contrats (user_id, jour, emplacement, modele, params)
    VALUES (p_user, p_jour, t.v->>'emplacement', left(t.v->>'modele', 60),
            CASE WHEN jsonb_typeof(t.v->'params') = 'object' THEN t.v->'params' ELSE '{}'::jsonb END)
    ON CONFLICT (user_id, jour, emplacement) DO NOTHING;
  END LOOP;
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('emplacement', c.emplacement, 'modele', c.modele, 'params', c.params, 'change', c.change)
                                     ORDER BY CASE c.emplacement WHEN 'faiblesse' THEN 1 WHEN 'entretien' THEN 2 ELSE 3 END), '[]'::jsonb)
          FROM codex_contrats c WHERE c.user_id = p_user AND c.jour = p_jour);
END;
$$;

-- Changer UN contrat du jour, une fois par jour : seulement aujourd'hui (Paris),
-- seulement un contrat pas encore fait, et pas deux changements le même jour.
-- Rend les contrats du jour.
CREATE OR REPLACE FUNCTION codex_contrat_changer(p_user uuid, p_jour date, p_emplacement text, p_modele text, p_params jsonb)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ancien codex_contrats;
BEGIN
  IF p_user IS NULL OR p_jour IS NULL OR coalesce(p_modele, '') = '' THEN
    RAISE EXCEPTION 'Contrat invalide';
  END IF;
  IF p_jour <> (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RAISE EXCEPTION 'Seuls les contrats d''aujourd''hui se changent';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('codex_contrats:' || p_user::text));
  SELECT * INTO v_ancien FROM codex_contrats WHERE user_id = p_user AND jour = p_jour AND emplacement = p_emplacement;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pas de contrat à cet emplacement';
  END IF;
  IF EXISTS (SELECT 1 FROM codex_contrats WHERE user_id = p_user AND jour = p_jour AND change) THEN
    RAISE EXCEPTION 'Un seul changement par jour';
  END IF;
  IF EXISTS (SELECT 1 FROM codex_progression
             WHERE user_id = p_user AND periode = p_jour::text AND quete_id = 'contrat:' || v_ancien.modele || ':' || p_jour::text
               AND etat IN ('terminee', 'recompensee')) THEN
    RAISE EXCEPTION 'Ce contrat est déjà rempli';
  END IF;
  UPDATE codex_contrats
  SET modele = left(p_modele, 60), params = CASE WHEN jsonb_typeof(p_params) = 'object' THEN p_params ELSE '{}'::jsonb END,
      change = true, tire_le = now()
  WHERE user_id = p_user AND jour = p_jour AND emplacement = p_emplacement;
  RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('emplacement', c.emplacement, 'modele', c.modele, 'params', c.params, 'change', c.change)
                                     ORDER BY CASE c.emplacement WHEN 'faiblesse' THEN 1 WHEN 'entretien' THEN 2 ELSE 3 END), '[]'::jsonb)
          FROM codex_contrats c WHERE c.user_id = p_user AND c.jour = p_jour);
END;
$$;

-- ── 6. Le journal d'événements ────────────────────────────────────────
-- Toutes les réponses d'un joueur, toutes sources (ou, à défaut de
-- _reponses_joueur, celles des fiches).
CREATE OR REPLACE FUNCTION _codex_reponses(p_uid uuid)
RETURNS TABLE (question_id uuid, source text, ok boolean, at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF to_regprocedure('public._reponses_joueur(uuid)') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT r.question_id, r.source, r.ok, r.at FROM _reponses_joueur($1) r WHERE r.ok IS NOT NULL AND r.at IS NOT NULL' USING p_uid;
  ELSIF to_regclass('public.quiz_answer_log') IS NOT NULL THEN
    RETURN QUERY SELECT l.question_id, 'fiche'::text, l.is_correct, least(l.answered_at, now()) FROM quiz_answer_log l WHERE l.user_id = p_uid;
  END IF;
END;
$$;

-- Les pages de quiz de fiche passées par le joueur : un passage (run_id), s'il
-- a répondu à toutes les questions de la page (complet), son titre, ses comptes.
CREATE OR REPLACE FUNCTION _codex_pages(p_uid uuid)
RETURNS TABLE (run_id uuid, set_id uuid, titre text, dossier text, fin timestamptz, n int, justes int, complet boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.run_id, r.set_id, qs.title, lf.name, r.fin, r.n, r.justes,
         r.distincts >= greatest(1, (SELECT count(*) FROM quiz_questions qq WHERE qq.set_id = r.set_id))
  FROM (
    SELECT l.run_id, l.set_id, max(l.answered_at) AS fin, count(*)::int AS n,
           (count(*) FILTER (WHERE l.is_correct))::int AS justes, count(DISTINCT l.question_id) AS distincts
    FROM quiz_answer_log l
    WHERE l.user_id = p_uid AND l.mode = 'page'
    GROUP BY l.run_id, l.set_id
  ) r
  JOIN quiz_sets qs ON qs.id = r.set_id
  LEFT JOIN library_folders lf ON lf.id = qs.folder_id;
$$;

-- Les jours d'encre : questions répondues par jour de Paris (comme l'anneau de
-- l'Accueil, via _serie_reponses_jour quand la série d'encre est collée).
CREATE OR REPLACE FUNCTION _codex_jours(p_uid uuid)
RETURNS TABLE (jour date, n int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF to_regprocedure('public._serie_reponses_jour(uuid,date,date)') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT c.jour, c.n FROM _serie_reponses_jour($1, DATE ''2000-01-01'', $2) c WHERE c.n > 0' USING p_uid, (now() AT TIME ZONE 'Europe/Paris')::date;
  ELSE
    RETURN QUERY SELECT (r.at AT TIME ZONE 'Europe/Paris')::date, count(*)::int FROM _codex_reponses(p_uid) r GROUP BY 1;
  END IF;
END;
$$;

-- Le journal : (evenement, quand, champs). Les noms et les champs suivent
-- lib/codex/types.ts (ChampsEvenement). Chaque bloc ne vit que si ses tables
-- existent.
CREATE OR REPLACE FUNCTION codex_journal(p_user uuid)
RETURNS TABLE (evenement text, quand timestamptz, champs jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_parts text[] := '{}';
  v_ami   text := 'false';
  v_ment  text := 'NULL::text';
  v_rayee boolean;
BEGIN
  IF p_user IS NULL THEN
    RETURN;
  END IF;

  -- question_repondue : une réponse, toutes sources. matiere / notion via la question ;
  -- premiere et ecartJours via la réponse précédente du joueur à la même question.
  v_parts := array_append(v_parts, $q$
    SELECT 'question_repondue'::text, x.at,
           jsonb_build_object('source', x.src, 'matiere', x.matiere, 'notion', x.notion, 'juste', x.ok, 'question', x.qid::text,
                              'premiere', x.prev IS NULL,
                              'ecartJours', CASE WHEN x.prev IS NULL THEN NULL ELSE floor(extract(epoch FROM (x.at - x.prev)) / 86400)::int END)
    FROM (
      SELECT r.question_id AS qid,
             CASE r.source WHEN 'daily' THEN 'defi' WHEN 'practice' THEN 'ciblee' WHEN 'mock' THEN 'blanc' ELSE r.source END AS src,
             r.ok, r.at, lag(r.at) OVER (PARTITION BY r.question_id ORDER BY r.at) AS prev,
             q.matiere, q.notion
      FROM _codex_reponses($1) r
      LEFT JOIN LATERAL (
        SELECT _codex_matiere(lf.name, qs.title) AS matiere, to_jsonb(qq) ->> 'notion' AS notion
        FROM quiz_questions qq
        LEFT JOIN quiz_sets qs ON qs.id = qq.set_id
        LEFT JOIN library_folders lf ON lf.id = qs.folder_id
        WHERE qq.id = r.question_id
        LIMIT 1
      ) q ON true
    ) x
  $q$);

  -- session_terminee + drill_page_terminee : les pages de fiche passées en entier
  IF to_regclass('public.quiz_answer_log') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'session_terminee'::text, p.fin,
             jsonb_build_object('source', 'fiche', 'matiere', _codex_matiere(p.dossier, p.titre), 'questions', p.n, 'justes', p.justes,
                                'pct', round(100.0 * p.justes / greatest(p.n, 1))::int)
      FROM _codex_pages($1) p WHERE p.complet
    $q$);
    v_parts := array_append(v_parts, $q$
      SELECT 'drill_page_terminee'::text, p.fin,
             jsonb_build_object('matiere', _codex_matiere(p.dossier, p.titre),
                                'fiche', (SELECT m.fiche FROM codex_matieres m WHERE m.prefixe_drill = split_part(p.titre, ' — ', 1) LIMIT 1),
                                'page', (substring(p.titre FROM 'Page ([0-9]+)'))::int, 'questions', p.n, 'justes', p.justes,
                                'pct', round(100.0 * p.justes / greatest(p.n, 1))::int)
      FROM _codex_pages($1) p WHERE p.complet AND p.titre ~ ' — Drill Fiche Page [0-9]+'
    $q$);
  END IF;

  -- session_terminee : sessions ciblées, QCM chronométrés, QCM entiers et examens officiels
  IF to_regclass('public.practice_session_results') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'session_terminee'::text, r.completed_at,
             jsonb_build_object('source', 'ciblee', 'matiere', CASE WHEN cardinality(r.topics) = 1 THEN r.topics[1] END,
                                'questions', r.total, 'justes', r.score, 'pct', round(100.0 * r.score / r.total)::int)
      FROM practice_session_results r WHERE r.user_id = $1 AND r.total > 0 AND r.completed_at IS NOT NULL
    $q$);
  END IF;
  IF to_regclass('public.practice_sessions') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'session_terminee'::text, s.occurred_at,
             jsonb_build_object('source', 'qcm', 'matiere', NULL, 'questions', s.total, 'justes', s.correct, 'pct', round(100.0 * s.correct / s.total)::int)
      FROM practice_sessions s WHERE s.user_id = $1 AND s.mode = 'qcm' AND s.total > 0
    $q$);
    -- flashcards_revues : les séances de cartes de /session (practice_sessions, mode flashcards)
    v_parts := array_append(v_parts, $q$
      SELECT 'flashcards_revues'::text, s.occurred_at,
             jsonb_build_object('matiere', (SELECT _codex_matiere(lf.name, s.set_title) FROM quiz_sets qs LEFT JOIN library_folders lf ON lf.id = qs.folder_id WHERE qs.id = s.set_id),
                                'cartes', s.total)
      FROM practice_sessions s WHERE s.user_id = $1 AND s.mode = 'flashcards' AND s.total > 0
    $q$);
  END IF;
  IF to_regclass('public.quiz_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'session_terminee'::text, a.created_at,
             jsonb_build_object('source', CASE WHEN lf.name = 'Mocks Officiels (Système)' THEN 'examen' ELSE 'qcm' END, 'matiere', NULL,
                                'questions', a.total, 'justes', a.score, 'pct', round(100.0 * a.score / a.total)::int)
      FROM quiz_attempts a
      LEFT JOIN quiz_sets qs ON qs.id = a.set_id
      LEFT JOIN library_folders lf ON lf.id = qs.folder_id
      WHERE a.user_id = $1 AND a.total > 0 AND a.score IS NOT NULL
    $q$);
    -- examens officiels joués en entier (/qcm)
    v_parts := array_append(v_parts, $q$
      SELECT 'examen_blanc_rendu'::text, a.created_at,
             jsonb_build_object('questions', a.total, 'justes', a.score, 'pct', round(100.0 * a.score / a.total)::int, 'officiel', true, 'reprise', false)
      FROM quiz_attempts a
      JOIN quiz_sets qs ON qs.id = a.set_id
      JOIN library_folders lf ON lf.id = qs.folder_id AND lf.name = 'Mocks Officiels (Système)'
      WHERE a.user_id = $1 AND a.total > 0 AND a.score IS NOT NULL
    $q$);
  END IF;

  -- les 30 du jour / les 5 du jour rendus
  IF to_regclass('public.daily_attempts') IS NOT NULL AND to_regclass('public.daily_challenges') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'defi_rendu'::text, t.finished_at,
             jsonb_build_object('questions', t.total, 'justes', t.score, 'pct', round(100.0 * t.score / t.total)::int)
      FROM daily_attempts t JOIN daily_challenges c ON c.id = t.challenge_id
      WHERE t.user_id = $1 AND t.finished_at IS NOT NULL AND t.total > 0 AND c.program <> 'cfa-l1-cinq'
    $q$);
    v_parts := array_append(v_parts, $q$
      SELECT 'cinq_rendu'::text, t.finished_at,
             jsonb_build_object('justes', t.score, 'secondes', t.seconds,
                                'rang', 1 + (SELECT count(*) FROM daily_attempts o
                                             WHERE o.challenge_id = t.challenge_id AND o.finished_at IS NOT NULL AND o.user_id <> t.user_id
                                               AND (o.score > t.score OR (o.score = t.score AND coalesce(o.seconds, 1000000) < coalesce(t.seconds, 1000000)))))
      FROM daily_attempts t JOIN daily_challenges c ON c.id = t.challenge_id
      WHERE t.user_id = $1 AND t.finished_at IS NOT NULL AND t.score IS NOT NULL AND c.program = 'cfa-l1-cinq'
    $q$);
  END IF;

  -- série éclair
  IF to_regclass('public.eclair_series') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'eclair_rendue'::text, e.finished_at, jsonb_build_object('questions', coalesce(e.total, 0), 'justes', coalesce(e.score, 0))
      FROM eclair_series e WHERE e.user_id = $1 AND e.finished_at IS NOT NULL
    $q$);
  END IF;

  -- duels terminés (réglés, deux joueurs)
  IF to_regclass('public.duels') IS NOT NULL THEN
    IF to_regclass('public.friendships') IS NOT NULL THEN
      v_ami := $q$EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'accepted'
                           AND ((f.requester = $1 AND f.addressee = d.autre) OR (f.requester = d.autre AND f.addressee = $1)))$q$;
    END IF;
    IF to_regclass('public.duel_mentions') IS NOT NULL THEN
      v_ment := $q$(SELECT m.mention FROM duel_mentions m WHERE m.duel_id = d.id AND m.user_id = $1 ORDER BY m.mention LIMIT 1)$q$;
    END IF;
    v_parts := array_append(v_parts, format($q$
      SELECT 'duel_termine'::text, d.fin,
             jsonb_build_object('resultat', CASE WHEN d.winner_id = $1 THEN 'victoire' WHEN d.winner_id IS NULL THEN 'nul' ELSE 'defaite' END,
                                'ecartPaliers', coalesce(_codex_palier(d.elo_autre) - _codex_palier(d.elo_moi), 0),
                                'ami', %s, 'mention', %s)
      FROM (
        SELECT du.id, du.winner_id,
               coalesce(du.finished_at, CASE WHEN du.challenger_id = $1 THEN du.challenger_finished_at ELSE du.opponent_finished_at END) AS fin,
               CASE WHEN du.challenger_id = $1 THEN du.opponent_id ELSE du.challenger_id END AS autre,
               CASE WHEN du.challenger_id = $1 THEN du.challenger_elo_before ELSE du.opponent_elo_before END AS elo_moi,
               CASE WHEN du.challenger_id = $1 THEN du.opponent_elo_before ELSE du.challenger_elo_before END AS elo_autre
        FROM duels du
        WHERE du.status = 'finished' AND du.opponent_id IS NOT NULL AND $1 IN (du.challenger_id, du.opponent_id)
      ) d
      WHERE d.fin IS NOT NULL
    $q$, v_ami, v_ment));
  END IF;

  -- examens blancs classés (première copie) et reprises
  IF to_regclass('public.mock_exam_results') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'examen_blanc_rendu'::text, r.completed_at,
             jsonb_build_object('questions', r.total, 'justes', r.score, 'pct', round(100.0 * r.score / r.total)::int, 'officiel', false, 'reprise', false)
      FROM mock_exam_results r WHERE r.user_id = $1 AND r.total > 0 AND r.completed_at IS NOT NULL
    $q$);
  END IF;
  IF to_regclass('public.mock_exam_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'examen_blanc_rendu'::text, r.completed_at,
             jsonb_build_object('questions', r.total, 'justes', r.score, 'pct', round(100.0 * r.score / r.total)::int, 'officiel', false, 'reprise', true)
      FROM mock_exam_attempts r WHERE r.user_id = $1 AND r.total > 0 AND r.completed_at IS NOT NULL
    $q$);
  END IF;

  -- séances d'Atelier terminées
  IF to_regclass('public.ateliers') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'seance_atelier'::text, a.finished_at,
             jsonb_build_object('questions', coalesce(a.total, 0), 'justes', coalesce(a.score, 0), 'notions', cardinality(a.notions),
                                'rayees', (SELECT count(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(a.reponses) = 'array' THEN a.reponses ELSE '[]'::jsonb END) x
                                           WHERE x->>'k' = 'rature' AND coalesce((x->>'ok')::boolean, false) AND NOT coalesce((x->>'r')::boolean, false)))
      FROM ateliers a WHERE a.user_id = $1 AND a.finished_at IS NOT NULL
    $q$);
  END IF;

  -- ratures rayées par une bonne réponse en reprise (ratures.rayee_le, migration_profil_sceaux.sql)
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ratures' AND column_name = 'rayee_le') INTO v_rayee;
  IF v_rayee THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'rature_rayee'::text, r.rayee_le,
             jsonb_build_object('matiere', _codex_matiere(r.folder_name, r.set_title),
                                'notion', (SELECT to_jsonb(qq) ->> 'notion' FROM quiz_questions qq WHERE qq.id = r.question_id),
                                'ageJours', greatest(0, floor(extract(epoch FROM (r.rayee_le - r.first_missed_at)) / 86400))::int,
                                'erreurs', r.misses)
      FROM ratures r WHERE r.user_id = $1 AND r.rayee_le IS NOT NULL
    $q$);
  END IF;

  -- calculs purs
  IF to_regclass('public.calc_attempts') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'calcul_repondu'::text, c.answered_at,
             jsonb_build_object('matiere', (SELECT m.cle FROM codex_matieres m WHERE m.cle = c.topic), 'type', c.type_key, 'juste', c.correct)
      FROM calc_attempts c WHERE c.user_id = $1
    $q$);
  END IF;

  -- cours écoutés, cartes révisées, fiches ouvertes (codex_noter)
  v_parts := array_append(v_parts, $q$
    SELECT e.type, e.quand, e.champs FROM codex_evenements e WHERE e.user_id = $1
  $q$);

  -- passages de palier (première fois qu'un ELO atteint chaque palier)
  IF to_regclass('public.rating_events') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'palier_atteint'::text, min(r.created_at), jsonb_build_object('palier', t.p)
      FROM generate_series(1, 6) AS t(p)
      JOIN rating_events r ON r.user_id = $1 AND _codex_palier(r.elo_after) >= t.p
      GROUP BY t.p
    $q$);
  END IF;

  -- jours d'encre : un jour à 10 questions ou plus ; serie = jours d'affilée jusqu'à celui-là
  v_parts := array_append(v_parts, $q$
    SELECT 'jour_encre'::text, ((s.jour + time '12:00') AT TIME ZONE 'Europe/Paris'),
           jsonb_build_object('serie', row_number() OVER (PARTITION BY s.groupe ORDER BY s.jour)::int, 'joker', false)
    FROM (SELECT j.jour, j.jour - (row_number() OVER (ORDER BY j.jour))::int AS groupe FROM _codex_jours($1) j WHERE j.n >= 10) s
  $q$);

  -- questions marquées
  IF to_regclass('public.question_flags') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'question_marquee'::text, f.created_at,
             jsonb_build_object('matiere', (SELECT _codex_matiere(lf.name, qs.title) FROM quiz_questions qq
                                            JOIN quiz_sets qs ON qs.id = qq.set_id LEFT JOIN library_folders lf ON lf.id = qs.folder_id WHERE qq.id = f.question_id))
      FROM question_flags f WHERE f.user_id = $1
    $q$);
  END IF;

  -- amis
  IF to_regclass('public.friendships') IS NOT NULL THEN
    v_parts := array_append(v_parts, $q$
      SELECT 'ami_ajoute'::text, coalesce(f.responded_at, f.created_at), '{}'::jsonb
      FROM friendships f WHERE f.status = 'accepted' AND $1 IN (f.requester, f.addressee)
    $q$);
  END IF;

  RETURN QUERY EXECUTE array_to_string(v_parts, E'\nUNION ALL\n') USING p_user;
END;
$$;

-- ── 7. Lire : compter, mesurer ────────────────────────────────────────
-- Le filtre d'un champ (lib/codex/types.ts, Comparaison) en SQL : égalité,
-- liste, intervalle {min, max}, null. Les noms de champ sont contrôlés.
CREATE OR REPLACE FUNCTION _codex_filtre(p_filtre jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_w text[] := ARRAY['true'];
  k   text;
  v   jsonb;
  t   text;
BEGIN
  IF p_filtre IS NULL OR jsonb_typeof(p_filtre) <> 'object' THEN
    RETURN 'true';
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each(p_filtre) LOOP
    IF k !~ '^[A-Za-z_]{1,40}$' THEN
      RAISE EXCEPTION 'Champ invalide : %', k;
    END IF;
    t := jsonb_typeof(v);
    IF t = 'string' THEN
      v_w := array_append(v_w, format('(champs->>%L) = %L', k, v #>> '{}'));
    ELSIF t = 'number' THEN
      v_w := array_append(v_w, format('(jsonb_typeof(champs->%L) = ''number'' AND (champs->>%L)::numeric = %s)', k, k, (v #>> '{}')::numeric));
    ELSIF t = 'boolean' THEN
      v_w := array_append(v_w, format('(champs->%L) = %L::jsonb', k, v::text));
    ELSIF t = 'null' THEN
      v_w := array_append(v_w, format('((champs->%L) IS NULL OR jsonb_typeof(champs->%L) = ''null'')', k, k));
    ELSIF t = 'array' THEN
      v_w := array_append(v_w, format('(champs->>%L) = ANY (%L::text[])', k, (SELECT coalesce(array_agg(x), '{}') FROM jsonb_array_elements_text(v) x)));
    ELSIF t = 'object' THEN
      IF v ? 'min' THEN
        v_w := array_append(v_w, format('(jsonb_typeof(champs->%L) = ''number'' AND (champs->>%L)::numeric >= %s)', k, k, (v->>'min')::numeric));
      END IF;
      IF v ? 'max' THEN
        v_w := array_append(v_w, format('(jsonb_typeof(champs->%L) = ''number'' AND (champs->>%L)::numeric <= %s)', k, k, (v->>'max')::numeric));
      END IF;
    END IF;
  END LOOP;
  RETURN array_to_string(v_w, ' AND ');
END;
$$;

-- La fenêtre (Fenetre) en SQL, jours de Paris, semaine du lundi au dimanche.
-- p_fenetre : "toujours" | "jour" | "semaine" | {"jours": n} | {"depuis": "<iso>"}
CREATE OR REPLACE FUNCTION _codex_fenetre(p_fenetre jsonb, p_jour date)
RETURNS text LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_fenetre IS NULL OR jsonb_typeof(p_fenetre) = 'null' THEN
    RETURN 'true';
  ELSIF jsonb_typeof(p_fenetre) = 'string' THEN
    CASE p_fenetre #>> '{}'
      WHEN 'jour' THEN
        RETURN format('(quand AT TIME ZONE ''Europe/Paris'')::date = %L::date', p_jour);
      WHEN 'semaine' THEN
        RETURN format('date_trunc(''week'', quand AT TIME ZONE ''Europe/Paris'') = date_trunc(''week'', %L::timestamp)', p_jour);
      ELSE
        RETURN 'true';
    END CASE;
  ELSIF jsonb_typeof(p_fenetre) = 'object' THEN
    IF p_fenetre ? 'jours' THEN
      RETURN format('quand >= ((%L::date + 1)::timestamp AT TIME ZONE ''Europe/Paris'') - make_interval(days => %s)', p_jour, least(3650, greatest(1, (p_fenetre->>'jours')::int)));
    ELSIF p_fenetre ? 'depuis' THEN
      RETURN format('quand >= %L::timestamptz', p_fenetre->>'depuis');
    END IF;
  END IF;
  RETURN 'true';
END;
$$;

-- Compte les événements demandés, mesure ce que la base sait mesurer.
--   p_demandes : [{id, evenement, filtre?, fenetre?, jour?, distinct?, somme?, seuil}]
--     distinct : un champ (ou "jour") dont on compte les valeurs distinctes
--     somme    : un champ numérique à additionner (minutes, cartes)
--   p_jour     : le jour de Paris des fenêtres « jour » / « semaine » (défaut : aujourd'hui)
--   résultat   : { compteurs: { <id>: { n, atteint } },       atteint = quand le seuil a été franchi (ISO) ou null
--                  mesures:   { ratures_ouvertes, notions, jours, drill_pages, drill_totaux, maitrise, types_calcul_tenus,
--                               sceaux, elo, xp_total, inscrit_le, serie, meilleure_serie, pic_elo },
--                  speciaux:  { serie_bonnes, serie_calculs, phenix, retour, aube } }
CREATE OR REPLACE FUNCTION codex_lire(p_user uuid, p_demandes jsonb, p_jour date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_jour   date := coalesce(p_jour, (now() AT TIME ZONE 'Europe/Paris')::date);
  v_today  date := (now() AT TIME ZONE 'Europe/Paris')::date;
  d        record;
  v_ev     text;
  v_cond   text;
  v_seuil  numeric;
  v_dist   text;
  v_somme  text;
  v_val    text;
  v_n      numeric;
  v_at     timestamptz;
  v_comp   jsonb := '{}'::jsonb;
  v_mes    jsonb := '{}'::jsonb;
  v_spe    jsonb := '{}'::jsonb;
  v_tmp    jsonb;
  v_b      numeric;
  v_c      numeric;
  v_ph     boolean;
  v_re     boolean;
  v_au     boolean;
  v_fin    date;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'Joueur manquant';
  END IF;
  IF p_demandes IS NULL OR jsonb_typeof(p_demandes) <> 'array' THEN
    p_demandes := '[]'::jsonb;
  END IF;

  DROP TABLE IF EXISTS pg_temp._cj;
  DROP TABLE IF EXISTS pg_temp._cjours;
  CREATE TEMP TABLE _cj ON COMMIT DROP AS SELECT j.evenement, j.quand, j.champs FROM codex_journal(p_user) j;
  CREATE TEMP TABLE _cjours ON COMMIT DROP AS SELECT j.jour, j.n FROM _codex_jours(p_user) j;

  -- ── les compteurs ──
  FOR d IN SELECT value AS v FROM jsonb_array_elements(p_demandes) LOOP
    v_ev := d.v->>'evenement';
    CONTINUE WHEN v_ev IS NULL OR coalesce(d.v->>'id', '') = '';
    v_cond := format('evenement = %L AND %s AND %s', v_ev, _codex_filtre(d.v->'filtre'),
                     _codex_fenetre(d.v->'fenetre', coalesce((d.v->>'jour')::date, v_jour)));
    v_seuil := greatest(1, coalesce((d.v->>'seuil')::numeric, 1));
    v_dist := d.v->>'distinct';
    v_somme := d.v->>'somme';
    v_at := NULL;
    IF v_somme IS NOT NULL THEN
      IF v_somme !~ '^[A-Za-z_]{1,40}$' THEN RAISE EXCEPTION 'Champ invalide : %', v_somme; END IF;
      EXECUTE format($f$
        SELECT coalesce(sum(s.v), 0),
               (SELECT b.quand FROM (SELECT a.quand, sum(a.v) OVER (ORDER BY a.quand, a.ord) AS c
                                     FROM (SELECT quand, (champs->>%L)::numeric AS v, row_number() OVER (ORDER BY quand) AS ord
                                           FROM pg_temp._cj WHERE %s) a) b
                WHERE b.c >= %s ORDER BY b.quand LIMIT 1)
        FROM (SELECT (champs->>%L)::numeric AS v FROM pg_temp._cj WHERE %s) s
      $f$, v_somme, v_cond, v_seuil, v_somme, v_cond) INTO v_n, v_at;
    ELSIF v_dist IS NOT NULL THEN
      IF v_dist = 'jour' THEN
        v_val := $v$((quand AT TIME ZONE 'Europe/Paris')::date)::text$v$;
      ELSE
        IF v_dist !~ '^[A-Za-z_]{1,40}$' THEN RAISE EXCEPTION 'Champ invalide : %', v_dist; END IF;
        v_val := format('(champs->>%L)', v_dist);
      END IF;
      EXECUTE format($f$
        SELECT count(*)::numeric,
               (SELECT z.t FROM (SELECT min(quand) AS t FROM (SELECT quand, %s AS val FROM pg_temp._cj WHERE %s) y
                                 WHERE y.val IS NOT NULL GROUP BY y.val ORDER BY t OFFSET %s LIMIT 1) z)
        FROM (SELECT DISTINCT %s AS val FROM pg_temp._cj WHERE %s) x WHERE x.val IS NOT NULL
      $f$, v_val, v_cond, (v_seuil - 1)::bigint, v_val, v_cond) INTO v_n, v_at;
    ELSE
      EXECUTE format($f$
        SELECT count(*)::numeric,
               (SELECT quand FROM pg_temp._cj WHERE %s ORDER BY quand OFFSET %s LIMIT 1)
        FROM pg_temp._cj WHERE %s
      $f$, v_cond, (v_seuil - 1)::bigint, v_cond) INTO v_n, v_at;
    END IF;
    v_comp := v_comp || jsonb_build_object(d.v->>'id', jsonb_build_object('n', coalesce(v_n, 0), 'atteint', v_at));
  END LOOP;

  -- ── les mesures ──
  -- ratures en cours, au total et par matière
  IF to_regclass('public.ratures') IS NOT NULL THEN
    EXECUTE $q$
      SELECT jsonb_build_object('total', count(*),
               'matieres', coalesce((SELECT jsonb_object_agg(m, c) FROM (SELECT _codex_matiere(r2.folder_name, r2.set_title) AS m, count(*) AS c
                                       FROM ratures r2 WHERE r2.user_id = $1 AND r2.removed_at IS NULL AND r2.visible_from <= now()
                                       GROUP BY 1) g WHERE g.m IS NOT NULL), '{}'::jsonb))
      FROM ratures r WHERE r.user_id = $1 AND r.removed_at IS NULL AND r.visible_from <= now()
    $q$ INTO v_tmp USING p_user;
    v_mes := v_mes || jsonb_build_object('ratures_ouvertes', v_tmp);
  END IF;
  -- réponses par notion (pour « notions vues » : 5 réponses ou plus)
  SELECT coalesce(jsonb_object_agg(g.notion, g.n), '{}'::jsonb) INTO v_tmp
  FROM (SELECT champs->>'notion' AS notion, count(*) AS n FROM pg_temp._cj
        WHERE evenement = 'question_repondue' AND champs->>'notion' IS NOT NULL GROUP BY 1) g;
  v_mes := v_mes || jsonb_build_object('notions', v_tmp);
  -- questions par jour (jours d'encre, rythme de l'objectif)
  SELECT coalesce(jsonb_agg(jsonb_build_object('jour', j.jour, 'n', j.n) ORDER BY j.jour), '[]'::jsonb) INTO v_tmp FROM pg_temp._cjours j;
  v_mes := v_mes || jsonb_build_object('jours', v_tmp);
  -- pages de drill passées : meilleure note par (matière, page)
  SELECT coalesce(jsonb_agg(jsonb_build_object('matiere', g.matiere, 'page', g.page, 'meilleur', g.meilleur)), '[]'::jsonb) INTO v_tmp
  FROM (SELECT champs->>'matiere' AS matiere, (champs->>'page')::int AS page, max((champs->>'pct')::numeric) AS meilleur
        FROM pg_temp._cj WHERE evenement = 'drill_page_terminee' AND champs->>'matiere' IS NOT NULL GROUP BY 1, 2) g;
  v_mes := v_mes || jsonb_build_object('drill_pages', v_tmp);
  -- pages de drill qui existent, par matière
  SELECT coalesce(jsonb_object_agg(g.matiere, g.pages), '{}'::jsonb) INTO v_tmp
  FROM (SELECT m.cle AS matiere, count(DISTINCT substring(qs.title FROM 'Page ([0-9]+)'))::int AS pages
        FROM quiz_sets qs JOIN codex_matieres m ON m.prefixe_drill = split_part(qs.title, ' — ', 1)
        WHERE qs.title ~ ' — Drill Fiche Page [0-9]+' AND coalesce(to_jsonb(qs) ->> 'official_published', 'true') <> 'false'
        GROUP BY m.cle) g;
  v_mes := v_mes || jsonb_build_object('drill_totaux', v_tmp);
  -- maîtrise par matière : sessions ciblées d'une seule matière (comme lib/mastery.ts), et la maîtrise de ses premières questions
  IF to_regclass('public.practice_session_results') IS NOT NULL THEN
    EXECUTE $q$
      WITH s AS (
        SELECT r.topics[1] AS matiere, r.score, r.total,
               sum(r.total) OVER (PARTITION BY r.topics[1] ORDER BY r.completed_at, r.id) - r.total AS avant
        FROM practice_session_results r WHERE r.user_id = $1 AND cardinality(r.topics) = 1 AND r.total > 0
      ), actuel AS (
        SELECT matiere, sum(score) AS justes, sum(total) AS questions FROM s GROUP BY matiere
      ), debut AS (
        SELECT matiere, sum(score) AS justes, sum(total) AS questions FROM s WHERE avant < 40 GROUP BY matiere
      )
      SELECT coalesce(jsonb_object_agg(a.matiere, jsonb_build_object(
               'questions', a.questions,
               'pct', round(100.0 * a.justes / a.questions)::int,
               'debut', CASE WHEN d.questions >= 40 THEN round(100.0 * d.justes / d.questions)::int END)), '{}'::jsonb)
      FROM actuel a LEFT JOIN debut d ON d.matiere = a.matiere
    $q$ INTO v_tmp USING p_user;
    v_mes := v_mes || jsonb_build_object('maitrise', v_tmp);
  END IF;
  -- types de calcul tenus : au moins 5 essais, et 5 justes sur les 6 derniers
  IF to_regclass('public.calc_attempts') IS NOT NULL THEN
    EXECUTE $q$
      SELECT count(*) FROM (
        SELECT type_key FROM (
          SELECT c.type_key, c.correct, row_number() OVER (PARTITION BY c.topic, c.type_key ORDER BY c.answered_at DESC, c.id DESC) AS rang
          FROM calc_attempts c WHERE c.user_id = $1
        ) x WHERE x.rang <= 6 GROUP BY type_key HAVING count(*) >= 5 AND count(*) FILTER (WHERE correct) >= 5
      ) t
    $q$ INTO v_n USING p_user;
    v_mes := v_mes || jsonb_build_object('types_calcul_tenus', coalesce(v_n, 0));
  END IF;
  -- sceaux gagnés
  IF to_regclass('public.sceaux') IS NOT NULL THEN
    EXECUTE $q$SELECT coalesce(jsonb_object_agg(cle, palier), '{}'::jsonb) FROM sceaux WHERE user_id = $1$q$ INTO v_tmp USING p_user;
    v_mes := v_mes || jsonb_build_object('sceaux', v_tmp);
  END IF;
  -- ELO actuel et plus haut ELO connu
  IF to_regclass('public.ratings') IS NOT NULL THEN
    EXECUTE $q$SELECT max((to_jsonb(r) ->> 'elo')::int) FROM ratings r WHERE r.user_id = $1$q$ INTO v_n USING p_user;
    v_mes := v_mes || jsonb_build_object('elo', v_n);
  END IF;
  IF to_regclass('public.rating_events') IS NOT NULL THEN
    EXECUTE $q$SELECT max(elo_after) FROM rating_events WHERE user_id = $1$q$ INTO v_n USING p_user;
    v_mes := v_mes || jsonb_build_object('pic_elo', v_n);
  END IF;
  -- XP, ancienneté
  SELECT jsonb_build_object('xp_total', coalesce(p.xp_total, 0), 'inscrit_le', p.created_at) INTO v_tmp FROM profiles p WHERE p.id = p_user;
  v_mes := v_mes || coalesce(v_tmp, '{}'::jsonb);
  -- série d'encre : jours d'affilée à 10 questions (sans le joker), en cours et meilleure ;
  -- celles de serie_encre (avec joker) l'emportent quand la table existe
  SELECT coalesce(max(g.n), 0) INTO v_b
  FROM (SELECT count(*) AS n FROM (SELECT j.jour - (row_number() OVER (ORDER BY j.jour))::int AS grp FROM pg_temp._cjours j WHERE j.n >= 10) s GROUP BY grp) g;
  -- série en cours : on remonte jour par jour depuis aujourd'hui (ou hier)
  v_c := 0;
  v_fin := CASE WHEN EXISTS (SELECT 1 FROM pg_temp._cjours WHERE jour = v_today AND n >= 10) THEN v_today ELSE v_today - 1 END;
  WHILE EXISTS (SELECT 1 FROM pg_temp._cjours WHERE jour = v_fin AND n >= 10) LOOP
    v_c := v_c + 1;
    v_fin := v_fin - 1;
  END LOOP;
  IF to_regclass('public.serie_encre') IS NOT NULL THEN
    EXECUTE $q$SELECT greatest($2, coalesce(max(meilleure), 0)) FROM serie_encre WHERE user_id = $1$q$ INTO v_b USING p_user, v_b;
  END IF;
  v_mes := v_mes || jsonb_build_object('serie', v_c, 'meilleure_serie', greatest(v_b, v_c));

  -- ── les prédicats spéciaux ──
  -- serie_bonnes : plus longue suite de bonnes réponses d'affilée (rompue par une erreur ou 20 min de silence)
  SELECT coalesce(max(g.n), 0) INTO v_b FROM (
    SELECT count(*) AS n FROM (
      SELECT s.quand, s.juste, sum(CASE WHEN NOT s.juste OR s.silence THEN 1 ELSE 0 END) OVER (ORDER BY s.quand, s.ord) AS grp FROM (
        SELECT quand, coalesce((champs->>'juste')::boolean, false) AS juste,
               (quand - lag(quand) OVER (ORDER BY quand, ord)) > interval '20 minutes' AS silence, ord
        FROM (SELECT quand, champs, row_number() OVER (ORDER BY quand) AS ord FROM pg_temp._cj WHERE evenement = 'question_repondue') a
      ) s
    ) t WHERE t.juste GROUP BY t.grp
  ) g;
  v_spe := v_spe || jsonb_build_object('serie_bonnes', v_b);
  -- serie_calculs : plus longue suite de calculs justes
  SELECT coalesce(max(g.n), 0) INTO v_b FROM (
    SELECT count(*) AS n FROM (
      SELECT s.juste, sum(CASE WHEN NOT s.juste THEN 1 ELSE 0 END) OVER (ORDER BY s.quand, s.ord) AS grp FROM (
        SELECT quand, ord, coalesce((champs->>'juste')::boolean, false) AS juste
        FROM (SELECT quand, champs, row_number() OVER (ORDER BY quand) AS ord FROM pg_temp._cj WHERE evenement = 'calcul_repondu') a
      ) s
    ) t WHERE t.juste GROUP BY t.grp
  ) g;
  v_spe := v_spe || jsonb_build_object('serie_calculs', v_b);
  -- phénix : les 30 du jour sous 50 % un jour, puis à 80 % ou plus le lendemain
  SELECT EXISTS (
    SELECT 1 FROM (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j, max((champs->>'pct')::numeric) AS pct
                   FROM pg_temp._cj WHERE evenement = 'defi_rendu' GROUP BY 1) a
    JOIN (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j, max((champs->>'pct')::numeric) AS pct
          FROM pg_temp._cj WHERE evenement = 'defi_rendu' GROUP BY 1) b ON b.j = a.j + 1
    WHERE a.pct < 50 AND b.pct >= 80) INTO v_ph;
  -- retour : un jour à 20 questions ou plus après au moins 14 jours sans aucune réponse
  SELECT EXISTS (
    SELECT 1 FROM (SELECT j, n, lag(j) OVER (ORDER BY j) AS prev
                   FROM (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j, count(*) AS n FROM pg_temp._cj WHERE evenement = 'question_repondue' GROUP BY 1) q) z
    WHERE z.n >= 20 AND z.prev IS NOT NULL AND z.j - z.prev > 14) INTO v_re;
  -- aube : 10 questions avant 7 h (Paris) le même jour
  SELECT EXISTS (
    SELECT 1 FROM (SELECT (quand AT TIME ZONE 'Europe/Paris')::date AS j,
                          count(*) FILTER (WHERE extract(hour FROM quand AT TIME ZONE 'Europe/Paris') < 7) AS n
                   FROM pg_temp._cj WHERE evenement = 'question_repondue' GROUP BY 1) z
    WHERE z.n >= 10) INTO v_au;
  v_spe := v_spe || jsonb_build_object('phenix', CASE WHEN v_ph THEN 1 ELSE 0 END, 'retour', CASE WHEN v_re THEN 1 ELSE 0 END, 'aube', CASE WHEN v_au THEN 1 ELSE 0 END);

  RETURN jsonb_build_object('compteurs', v_comp, 'mesures', v_mes, 'speciaux', v_spe);
END;
$$;

-- ── 8. Écrire : la progression et les récompenses, une seule fois ─────
--   p_lot : [{ quete, periode?, famille, etat, progression?, cible?, atteint?, retro?,
--              xp?, plafond?, cosmetique?, titre? }]
--     etat disponible | active : la quête est ouverte (ouverte_le gardée) ou entamée ;
--     etat terminee : l'objectif est rempli -> la ligne passe à « récompensée » et la
--       récompense est versée, UNE FOIS (une ligne déjà récompensée est ignorée).
--     xp       : l'XP visée ; plafond : la moitié du niveau en cours (le site la calcule,
--                lib/codex/catalogue.ts plafondQuete) ; versée = min(xp, plafond, 5000) ;
--     retro    : validée d'après l'historique -> prise sur p_budget_retro (un niveau entier),
--                le reste est « pour l'honneur » (cosmétiques et titres tous donnés).
--     atteint  : la vraie date (ISO) quand un compteur la donne.
--   résultat : { recompenses: [{quete, periode, xp, nominal, retro, cosmetique, titre}], retro, premier }
--     retro : le résumé de la rétroactivité à fêter (une seule cérémonie), null sinon.
-- Une famille « exploit » hors sceaux (clé exploit:<id>) est aussi gardée dans la table
-- sceaux (palier 1) : une seule Collection, une seule cérémonie.
CREATE OR REPLACE FUNCTION codex_ecrire(p_user uuid, p_lot jsonb, p_budget_retro int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  it         record;
  v_now      timestamptz := now();
  v_premier  boolean;
  v_id       text;
  v_per      text;
  v_fam      text;
  v_etat     text;
  v_retro    boolean;
  v_nominal  int;
  v_xp       int;
  v_restant  int := greatest(0, coalesce(p_budget_retro, 0));
  v_atteint  timestamptz;
  v_cos      text;
  v_titre    text;
  v_ok       int;
  v_recs     jsonb := '[]'::jsonb;
  v_res      jsonb;
  v_actes    text[] := '{}';
  v_coss     text[] := '{}';
  v_titres   text[] := '{}';
  v_retro_xp int := 0;
  v_retro_n  int := 0;
BEGIN
  IF p_user IS NULL OR p_lot IS NULL OR jsonb_typeof(p_lot) <> 'array' THEN
    RAISE EXCEPTION 'Lot invalide';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'Joueur introuvable';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('codex:' || p_user::text));

  INSERT INTO codex_joueur (user_id, premier_calcul, dernier_calcul) VALUES (p_user, v_now, v_now) ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  v_premier := v_ok > 0;

  FOR it IN SELECT value AS v FROM jsonb_array_elements(p_lot) LOOP
    v_id := it.v->>'quete';
    v_per := coalesce(it.v->>'periode', '');
    v_fam := it.v->>'famille';
    v_etat := it.v->>'etat';
    CONTINUE WHEN v_id IS NULL OR char_length(v_id) NOT BETWEEN 1 AND 120 OR v_etat IS NULL
               OR v_fam NOT IN ('trame', 'branche', 'longcours', 'contrat', 'exploit', 'acte');

    IF v_etat IN ('disponible', 'active') THEN
      INSERT INTO codex_progression (user_id, quete_id, periode, famille, etat, progression, cible, ouverte_le, maj)
      VALUES (p_user, v_id, v_per, v_fam, v_etat, coalesce((it.v->>'progression')::numeric, 0), (it.v->>'cible')::numeric, v_now, v_now)
      ON CONFLICT (user_id, quete_id, periode) DO UPDATE
        SET etat = EXCLUDED.etat, progression = EXCLUDED.progression, cible = EXCLUDED.cible, maj = v_now
        WHERE codex_progression.etat IN ('verrouillee', 'disponible', 'active');

    ELSIF v_etat = 'terminee' THEN
      v_retro := coalesce((it.v->>'retro')::boolean, false);
      v_nominal := greatest(0, coalesce((it.v->>'xp')::int, 0));
      v_xp := least(v_nominal, greatest(0, coalesce((it.v->>'plafond')::int, v_nominal)), 5000);
      IF v_retro THEN
        v_xp := least(v_xp, v_restant);
      END IF;
      v_atteint := coalesce((it.v->>'atteint')::timestamptz, v_now);
      v_cos := nullif(it.v->>'cosmetique', '');
      v_titre := nullif(it.v->>'titre', '');

      INSERT INTO codex_progression (user_id, quete_id, periode, famille, etat, progression, cible, ouverte_le, terminee_le, recompensee_le, retro, xp, cosmetique, titre, vu, maj)
      VALUES (p_user, v_id, v_per, v_fam, 'recompensee', coalesce((it.v->>'cible')::numeric, 1), (it.v->>'cible')::numeric,
              least(v_atteint, v_now), least(v_atteint, v_now), v_now, v_retro, v_xp, v_cos, v_titre, v_retro, v_now)
      ON CONFLICT (user_id, quete_id, periode) DO UPDATE
        SET etat = 'recompensee', progression = coalesce(EXCLUDED.cible, EXCLUDED.progression), cible = EXCLUDED.cible,
            terminee_le = coalesce(codex_progression.terminee_le, EXCLUDED.terminee_le), recompensee_le = v_now,
            retro = EXCLUDED.retro, xp = EXCLUDED.xp, cosmetique = EXCLUDED.cosmetique, titre = EXCLUDED.titre, vu = EXCLUDED.vu, maj = v_now
        WHERE codex_progression.etat <> 'recompensee';
      GET DIAGNOSTICS v_ok = ROW_COUNT;
      CONTINUE WHEN v_ok = 0;   -- déjà récompensée : rien de plus

      IF v_xp > 0 THEN
        INSERT INTO xp_events (user_id, xp, source, meta)
        VALUES (p_user, v_xp, 'codex', jsonb_build_object('quete', v_id, 'periode', v_per, 'retro', v_retro, 'xp_vise', v_nominal));
        UPDATE profiles SET xp_total = xp_total + v_xp WHERE id = p_user;
      END IF;

      -- un exploit nouveau se garde aussi parmi les sceaux (palier 1)
      IF v_fam = 'exploit' AND v_id LIKE 'exploit:%' AND v_id NOT LIKE 'exploit:sceau:%' AND to_regclass('public.sceaux') IS NOT NULL THEN
        EXECUTE 'INSERT INTO sceaux (user_id, cle, palier, dates, retro, vu) VALUES ($1, $2, 1, ARRAY[$3::timestamptz], $4, $4) ON CONFLICT (user_id, cle) DO NOTHING'
          USING p_user, left(v_id, 64), least(v_atteint, v_now), v_retro;
      END IF;

      v_recs := v_recs || jsonb_build_object('quete', v_id, 'periode', v_per, 'xp', v_xp, 'nominal', v_nominal, 'retro', v_retro, 'cosmetique', v_cos, 'titre', v_titre);
      IF v_retro THEN
        v_restant := v_restant - v_xp;
        v_retro_xp := v_retro_xp + v_xp;
        v_retro_n := v_retro_n + 1;
        IF v_fam = 'acte' THEN v_actes := array_append(v_actes, v_id); END IF;
        IF v_cos IS NOT NULL AND v_cos NOT LIKE 'titre:%' THEN v_coss := array_append(v_coss, v_cos); END IF;
        IF v_cos LIKE 'titre:%' THEN v_titres := array_append(v_titres, v_cos); END IF;
        IF v_titre IS NOT NULL THEN v_titres := array_append(v_titres, v_titre); END IF;
      END IF;
    END IF;
  END LOOP;

  -- la rétroactivité s'ajoute au résumé de la cérémonie (jusqu'à ce qu'elle soit jouée)
  IF v_retro_n > 0 THEN
    UPDATE codex_joueur j
    SET retro = jsonb_build_object(
          'xp', coalesce((j.retro->>'xp')::int, 0) + v_retro_xp,
          'quetes', coalesce((j.retro->>'quetes')::int, 0) + v_retro_n,
          'actes', coalesce(j.retro->'actes', '[]'::jsonb) || to_jsonb(v_actes),
          'cosmetiques', coalesce(j.retro->'cosmetiques', '[]'::jsonb) || to_jsonb(v_coss),
          'titres', coalesce(j.retro->'titres', '[]'::jsonb) || to_jsonb(v_titres)),
        retro_vue = false
    WHERE j.user_id = p_user;
  END IF;
  UPDATE codex_joueur SET dernier_calcul = v_now WHERE user_id = p_user;
  SELECT CASE WHEN NOT retro_vue THEN retro END INTO v_res FROM codex_joueur WHERE user_id = p_user;

  RETURN jsonb_build_object('recompenses', v_recs, 'retro', v_res, 'premier', v_premier);
END;
$$;

-- La fanfare d'une quête a été jouée.
CREATE OR REPLACE FUNCTION codex_vus(p_user uuid, p_quetes text[])
RETURNS int
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  WITH m AS (
    UPDATE codex_progression SET vu = true
    WHERE user_id = p_user AND quete_id = ANY (coalesce(p_quetes, '{}')) AND NOT vu
    RETURNING 1
  )
  SELECT count(*)::int FROM m;
$$;

-- « Léonard a feuilleté ton carnet » a été joué.
CREATE OR REPLACE FUNCTION codex_retro_vue(p_user uuid)
RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  WITH m AS (UPDATE codex_joueur SET retro_vue = true WHERE user_id = p_user AND NOT retro_vue RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM m);
$$;

-- ── 9. Droits ─────────────────────────────────────────────────────────
-- Tout est réservé au serveur (service_role), sauf codex_noter (le joueur
-- note lui-même ce qu'il a écouté, révisé ou ouvert).
REVOKE ALL ON FUNCTION _codex_matiere(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_palier(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_reponses(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_pages(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_jours(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_filtre(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _codex_fenetre(jsonb, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_journal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_lire(uuid, jsonb, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_ecrire(uuid, jsonb, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_vus(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_retro_vue(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_contrats_poser(uuid, date, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_contrat_changer(uuid, date, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION codex_noter(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION codex_journal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION codex_lire(uuid, jsonb, date) TO service_role;
GRANT EXECUTE ON FUNCTION codex_ecrire(uuid, jsonb, int) TO service_role;
GRANT EXECUTE ON FUNCTION codex_vus(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION codex_retro_vue(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION codex_contrats_poser(uuid, date, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION codex_contrat_changer(uuid, date, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION codex_noter(text, jsonb) TO authenticated;
