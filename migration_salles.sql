-- ============================================================================
-- Salles — des parties à plusieurs, en direct, avec ses propres réglages.
-- À coller une fois dans le SQL Editor de Supabase. Idempotent (rejouable).
-- À appliquer APRÈS supabase_schema.sql (profiles, quiz_sets, quiz_questions,
-- library_folders) et migration_duels_elo.sql (ratings). Rien d'autre requis.
--
-- Le principe
--   • Une SALLE : un nom, publique (tout le monde peut la rejoindre depuis la
--     liste) ou privée (on ne la rejoint que par son code), un code de
--     6 caractères sans ambiguïté (pas de 0/O, 1/I/L), un admin (celui qui
--     l'a créée) et des membres sans limite.
--   • Une PARTIE (« session ») y est lancée par l'admin avec ses RÉGLAGES :
--       type      questions | calculs | mixte (questions et calculs mêlés)
--       nombre    5 à 50 (au total)
--       source    banque (toutes les questions officielles du site)
--                 | mocks (questions d'examen : les 10 dossiers « (Système) »
--                   dont les examens blancs tirent leurs questions, plus les
--                   mocks officiels du dossier « Mocks Officiels (Système) »,
--                   hors variantes)
--       topics    une ou plusieurs des 10 matières (clés de lib/practiceTopics.ts)
--       difficulte facile | moyen | difficile | melange
--       temps     15 à 120 secondes par question
--       part_calculs  (mixte seulement) part des calculs, de 10 à 90 %
--   • La partie est SYNCHRONISÉE PAR L'HORLOGE DU SERVEUR : au lancement, le
--     serveur fixe started_at (= maintenant + 8 s de décompte) ; la question
--     i s'ouvre à started_at + i × (temps + pause de 5 s). Chaque navigateur
--     en déduit la question en cours à partir de l'heure du serveur (renvoyée
--     par etat_salle) : pas de temps réel, un retardataire arrive sur la
--     question en cours. Le navigateur interroge etat_salle toutes les 2 à 3 s.
--   • Le SCORE : bonne réponse = 1000 × (0,5 + 0,5 × temps restant / temps),
--     arrondi au demi supérieur ; mauvaise ou pas de réponse = 0. Une seule
--     réponse par question et par joueur, vérifiée et notée par le serveur.
--
-- Sécurité (comme les duels : migration_duels_elo.sql)
--   • la bonne réponse n'est JAMAIS envoyée avant que le joueur ait répondu :
--     etat_salle ne renvoie que les énoncés, et les corrections seulement des
--     questions CLOSES (le temps est écoulé, plus 2 s de marge réseau) ;
--     repondre_salle renvoie la correction à celui qui vient de répondre ;
--   • les questions ne sont révélées qu'à l'approche de leur ouverture
--     (2 s avant) : on ne peut pas lire la partie à l'avance ;
--   • le classement en direct ne compte que les questions closes (voir le
--     score d'un autre monter pendant qu'on réfléchit dévoilerait sa
--     réponse) ; le joueur voit son propre résultat dès qu'il a répondu ;
--   • les énoncés sont COPIÉS dans la partie (salle_items) au lancement : une
--     question de la banque retouchée ou supprimée ensuite ne casse rien ;
--   • aucune écriture directe : pas de policy INSERT/UPDATE/DELETE, tout
--     passe par les fonctions SECURITY DEFINER ci-dessous.
--
-- Les calculs (lib/calc) sont des catalogues côté serveur Next.js : c'est le
-- SERVEUR DU SITE (action serveur, lib/salles/serveur.ts) qui les tire au
-- lancement et les envoie à lancer_session avec leurs réponses. Le navigateur
-- de l'admin ne les voit jamais : l'admin ne connaît donc pas les réponses non
-- plus.
--
-- RLS
--   • salles, salle_membres, salle_sessions : lecture par les membres de la
--     salle seulement ;
--   • salle_items (réponses cachées) et salle_reponses : aucune lecture
--     client, tout passe par etat_salle / repondre_salle.
--
-- Pas de tâche planifiée : l'état d'une partie (attente → en cours →
-- terminée) est mis à jour paresseusement par les fonctions qui la touchent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS salles (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               text        NOT NULL CHECK (char_length(nom) BETWEEN 2 AND 40),
  description       text        CHECK (description IS NULL OR char_length(description) <= 120),
  -- 6 caractères sans ambiguïté : A-H J K M N P-Z et 2-9
  code              text        NOT NULL UNIQUE CHECK (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  publique          boolean     NOT NULL DEFAULT false,
  admin_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  derniere_activite timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS salle_membres (
  salle_id   uuid        NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'membre' CHECK (role IN ('admin', 'membre')),
  rejoint_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (salle_id, user_id)
);

-- Une partie. started_at : l'instant d'ouverture de la question 0 (il est dans
-- le futur pendant le décompte) ; fin_at : started_at + nb × (temps + pause),
-- c'est-à-dire la fin de la dernière pause.
CREATE TABLE IF NOT EXISTS salle_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  salle_id    uuid        NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
  numero      int         NOT NULL,
  statut      text        NOT NULL DEFAULT 'attente' CHECK (statut IN ('attente', 'en_cours', 'terminee')),
  -- les réglages normalisés (+ nb_questions et nb_calculs effectifs)
  params      jsonb       NOT NULL,
  nb          int         NOT NULL CHECK (nb BETWEEN 1 AND 50),
  temps       int         NOT NULL CHECK (temps BETWEEN 15 AND 120),
  pause_s     int         NOT NULL DEFAULT 5 CHECK (pause_s BETWEEN 3 AND 30),
  lancee_par  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  started_at  timestamptz NOT NULL,
  fin_at      timestamptz NOT NULL,
  terminee_at timestamptz
);

-- Les questions d'une partie (copiées au lancement). bonne_index, bonne_valeur,
-- tolerance, stricte, explication et etapes sont CACHÉS : jamais lus par un
-- client avant la clôture de la question.
CREATE TABLE IF NOT EXISTS salle_items (
  session_id   uuid        NOT NULL REFERENCES salle_sessions(id) ON DELETE CASCADE,
  position     int         NOT NULL CHECK (position >= 0),
  origine      text        NOT NULL CHECK (origine IN ('question', 'calcul')),
  topic        text,
  difficulte   text        CHECK (difficulte IN ('facile', 'moyen', 'difficile')),
  -- la question de la banque d'où vient la copie (sans clé étrangère : un
  -- re-seed de la banque efface et recrée les questions)
  question_id  uuid,
  -- calcul : « Quant · Time value of money »
  libelle      text,
  enonce       text        NOT NULL,
  -- QCM : la liste des choix
  choix        jsonb,
  -- calcul : [{ "label": "...", "value": "..." }] et l'unité à côté du champ
  donnees      jsonb,
  unite        text,
  decimales    int,
  bonne_index  int,
  bonne_valeur numeric,
  tolerance    numeric,
  stricte      boolean,
  explication  text,
  etapes       jsonb,
  PRIMARY KEY (session_id, position),
  CHECK (
    (origine = 'question' AND choix IS NOT NULL AND bonne_index IS NOT NULL)
    OR (origine = 'calcul' AND bonne_valeur IS NOT NULL)
  )
);

-- Une réponse : au plus une par joueur et par question (la première est
-- définitive). Pas de ligne = pas de réponse = 0 point.
CREATE TABLE IF NOT EXISTS salle_reponses (
  session_id uuid        NOT NULL,
  position   int         NOT NULL,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  choix      int,
  valeur     numeric,
  juste      boolean     NOT NULL,
  points     int         NOT NULL DEFAULT 0 CHECK (points >= 0),
  -- millisecondes écoulées depuis l'ouverture de la question
  delai_ms   int         NOT NULL,
  repondu_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id, position),
  FOREIGN KEY (session_id, position) REFERENCES salle_items(session_id, position) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS salles_publiques_idx ON salles (derniere_activite DESC) WHERE publique;
CREATE INDEX IF NOT EXISTS salles_admin_idx ON salles (admin_id);
CREATE INDEX IF NOT EXISTS salle_membres_user_idx ON salle_membres (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS salle_sessions_numero_idx ON salle_sessions (salle_id, numero);
-- une seule partie à la fois par salle (attente ou en cours)
CREATE UNIQUE INDEX IF NOT EXISTS salle_sessions_une_active_idx ON salle_sessions (salle_id) WHERE statut <> 'terminee';
CREATE INDEX IF NOT EXISTS salle_reponses_question_idx ON salle_reponses (session_id, position);
CREATE INDEX IF NOT EXISTS salle_reponses_user_idx ON salle_reponses (user_id);


-- ----------------------------------------------------------------------------
-- 2. OUTILS INTERNES (non exposés aux clients)
-- ----------------------------------------------------------------------------

-- L'utilisateur est-il membre de la salle ? (sans récursion RLS)
CREATE OR REPLACE FUNCTION _salle_est_membre(p_salle uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM salle_membres WHERE salle_id = p_salle AND user_id = p_user);
$$;

-- Le joueur connecté est-il membre ? (utilisée par les policies de lecture :
-- elle ne laisse sonder que SA propre appartenance)
CREATE OR REPLACE FUNCTION _salle_moi_membre(p_salle uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM salle_membres WHERE salle_id = p_salle AND user_id = auth.uid());
$$;

-- Un nouveau code de salle : 6 caractères tirés d'un alphabet sans ambiguïté
-- (ni 0/O, ni 1/I/L), d'après des octets aléatoires non prévisibles.
CREATE OR REPLACE FUNCTION _salle_nouveau_code()
RETURNS text
LANGUAGE plpgsql VOLATILE SET search_path = public
AS $$
DECLARE
  c_alphabet CONSTANT text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_octets bytea;
  v_code   text;
  v_i      int;
  v_essai  int := 0;
BEGIN
  LOOP
    v_octets := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    FOR v_i IN 0..5 LOOP
      v_code := v_code || substr(c_alphabet, 1 + (get_byte(v_octets, v_i) % 31), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM salles WHERE code = v_code);
    v_essai := v_essai + 1;
    IF v_essai > 30 THEN
      RAISE EXCEPTION 'Impossible de générer un code de salle, réessaie.';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- Nom d'une matière (français ou anglais, dossier ou titre) → clé de matière
-- (mêmes clés que lib/practiceTopics.ts). NULL si inconnue.
CREATE OR REPLACE FUNCTION _salle_topic_nom(p_nom text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT v.cle
  FROM (VALUES
    ('Éthique et Standards Professionnels', 'ethics'),
    ('Ethics', 'ethics'),
    ('Ethical and Professional Standards', 'ethics'),
    ('Méthodes Quantitatives', 'quant'),
    ('Quantitative Methods', 'quant'),
    ('Économie', 'economics'),
    ('Economics', 'economics'),
    ('Analyse des États Financiers', 'fsa'),
    ('Financial Statement Analysis', 'fsa'),
    ('Finance d''Entreprise', 'corporate'),
    ('Corporate Issuers', 'corporate'),
    ('Investissements en Actions', 'equity'),
    ('Equity', 'equity'),
    ('Equity Investments', 'equity'),
    ('Fixed Income', 'fixed_income'),
    ('Instruments Dérivés', 'derivatives'),
    ('Derivatives', 'derivatives'),
    ('Investissements Alternatifs', 'alternatives'),
    ('Alternative Investments', 'alternatives'),
    ('Gestion de Portefeuille', 'portfolio'),
    ('Portfolio Management', 'portfolio')
  ) AS v(nom, cle)
  WHERE lower(v.nom) = lower(btrim(p_nom))
  LIMIT 1;
$$;

-- Matière d'un set de questions : son dossier « (Système) » d'abord ; pour un
-- mock officiel (« Mock A — Session 1 — Économie »), la matière du titre
-- (le set « Complet » n'en a pas : NULL) ; sinon le début du titre.
CREATE OR REPLACE FUNCTION _salle_topic(p_dossier text, p_titre text)
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN p_dossier = 'Mocks Officiels (Système)' THEN _salle_topic_nom(split_part(coalesce(p_titre, ''), ' — ', 3))
    ELSE coalesce(
      _salle_topic_nom(regexp_replace(coalesce(p_dossier, ''), '\s*\(Système\)\s*$', '')),
      _salle_topic_nom(split_part(coalesce(p_titre, ''), ' — ', 1))
    )
  END;
$$;

-- Les questions éligibles pour une source, avec leur matière et leur
-- difficulté (celle du set : 1 facile, 2 moyen, 3 difficile ; sans valeur =
-- facile, comme le barème d'XP). Seulement des QCM officiels publiés de
-- niveau 1, de 2 à 5 choix, une seule fois par énoncé.
--   'banque' : toute la banque officielle, sauf les sets « Complet » (doublons
--              des mocks par matière) ;
--   'mocks'  : les 10 dossiers dont les examens blancs tirent leurs questions
--              (publish_mock_exam), plus les mocks officiels (hors variantes).
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
    AND (
      p_source = 'banque'
      OR (
        p_source = 'mocks'
        AND (
          (c.dossier = 'Mocks Officiels (Système)' AND split_part(c.titre, ' — ', 4) <> 'Variantes')
          OR c.dossier IN (
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
    )
  ORDER BY c.prompt, c.question_id;
$$;

-- Tire p_n questions parmi les matières choisies, réparties à parts égales
-- entre les matières (une de chaque à tour de rôle). Avec une difficulté
-- précise, les questions de cette difficulté passent d'abord (équitablement
-- entre matières) ; on ne complète avec les autres que si elles manquent.
CREATE OR REPLACE FUNCTION _salle_tirer_questions(p_source text, p_topics text[], p_diff text, p_n int)
RETURNS TABLE (question_id uuid, topic text, diff text)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.question_id, r.topic, r.diff
  FROM (
    SELECT pl.question_id,
           pl.topic,
           pl.diff,
           CASE WHEN p_diff = 'melange' OR pl.diff = p_diff THEN 0 ELSE 1 END AS ecart,
           row_number() OVER (
             PARTITION BY pl.topic, (CASE WHEN p_diff = 'melange' OR pl.diff = p_diff THEN 0 ELSE 1 END)
             ORDER BY random()
           ) AS rn
    FROM _salle_pool(p_source) pl
    WHERE pl.topic = ANY (p_topics)
  ) r
  ORDER BY r.ecart, r.rn, random()
  LIMIT greatest(p_n, 0);
$$;

-- Valide et normalise les réglages d'une partie. Lève une erreur lisible sinon.
CREATE OR REPLACE FUNCTION _salle_params(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = public
AS $$
DECLARE
  v_type   text;
  v_nombre int;
  v_temps  int;
  v_part   int;
  v_source text;
  v_diff   text;
  v_topics text[];
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN
    RAISE EXCEPTION 'Réglages invalides.';
  END IF;

  v_type := p ->> 'type';
  IF v_type IS NULL OR v_type NOT IN ('questions', 'calculs', 'mixte') THEN
    RAISE EXCEPTION 'Choisis le type de partie : questions, calculs ou les deux mêlés.';
  END IF;

  IF coalesce(p ->> 'nombre', '') !~ '^[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'Indique le nombre de questions (de 5 à 50).';
  END IF;
  v_nombre := (p ->> 'nombre')::int;
  IF v_nombre < 5 OR v_nombre > 50 THEN
    RAISE EXCEPTION 'Le nombre de questions va de 5 à 50.';
  END IF;

  IF coalesce(p ->> 'temps', '45') !~ '^[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'Le temps par question va de 15 à 120 secondes.';
  END IF;
  v_temps := coalesce((p ->> 'temps')::int, 45);
  IF v_temps < 15 OR v_temps > 120 THEN
    RAISE EXCEPTION 'Le temps par question va de 15 à 120 secondes.';
  END IF;

  v_source := coalesce(nullif(p ->> 'source', ''), 'banque');
  IF v_source NOT IN ('banque', 'mocks') THEN
    RAISE EXCEPTION 'La source des questions est la banque complète ou les mocks.';
  END IF;
  IF v_type = 'calculs' THEN
    v_source := 'banque';
  END IF;

  v_diff := coalesce(nullif(p ->> 'difficulte', ''), 'melange');
  IF v_diff NOT IN ('facile', 'moyen', 'difficile', 'melange') THEN
    RAISE EXCEPTION 'La difficulté est facile, moyen, difficile ou mélangée.';
  END IF;

  IF v_type = 'mixte' THEN
    IF coalesce(p ->> 'part_calculs', '40') !~ '^[0-9]{1,3}$' THEN
      RAISE EXCEPTION 'La part de calculs va de 10 à 90 %%.';
    END IF;
    v_part := coalesce((p ->> 'part_calculs')::int, 40);
    IF v_part < 10 OR v_part > 90 THEN
      RAISE EXCEPTION 'La part de calculs va de 10 à 90 %%.';
    END IF;
  ELSIF v_type = 'calculs' THEN
    v_part := 100;
  ELSE
    v_part := 0;
  END IF;

  IF jsonb_typeof(p -> 'topics') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Choisis au moins une matière.';
  END IF;
  SELECT array_agg(c.k ORDER BY c.ord)
  INTO v_topics
  FROM unnest(ARRAY['ethics', 'quant', 'economics', 'fsa', 'corporate', 'equity', 'fixed_income', 'derivatives', 'alternatives', 'portfolio'])
       WITH ORDINALITY AS c(k, ord)
  WHERE c.k IN (SELECT jsonb_array_elements_text(p -> 'topics'));
  IF coalesce(array_length(v_topics, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Choisis au moins une matière.';
  END IF;

  RETURN jsonb_build_object(
    'type', v_type,
    'nombre', v_nombre,
    'source', v_source,
    'topics', to_jsonb(v_topics),
    'difficulte', v_diff,
    'temps', v_temps,
    'part_calculs', v_part
  );
END;
$$;

-- L'horloge d'une partie à l'instant p_now :
--   idx          -1 pendant le décompte, 0..nb-1 la question en cours (ou la
--                pause qui la suit), nb une fois la partie finie
--   phase        decompte | question | revelation | fin
--   nb_fermees   questions closes (temps écoulé + 2 s de marge) : leurs
--                corrections sont publiques et leurs points comptent
--   nb_visibles  questions dont l'énoncé est révélé (ouverture − 2 s)
-- Miroir de horlogeSession (lib/salles/logique.ts, testé par
-- scripts/salles/test-salles.ts) : garder les deux d'accord.
CREATE OR REPLACE FUNCTION _salle_horloge(p_started timestamptz, p_temps int, p_pause int, p_nb int, p_statut text, p_now timestamptz)
RETURNS TABLE (idx int, phase text, nb_fermees int, nb_visibles int)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  c_marge  CONSTANT numeric := 2;
  c_apercu CONSTANT numeric := 2;
  v_e      numeric;
  v_cycle  int := p_temps + p_pause;
BEGIN
  IF p_statut = 'terminee' THEN
    idx := p_nb; phase := 'fin'; nb_fermees := p_nb; nb_visibles := p_nb;
    RETURN NEXT;
    RETURN;
  END IF;

  v_e := extract(epoch FROM (p_now - p_started));
  IF v_e >= p_nb * v_cycle THEN
    idx := p_nb; phase := 'fin'; nb_fermees := p_nb; nb_visibles := p_nb;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_e < 0 THEN
    idx := -1;
    phase := 'decompte';
  ELSE
    idx := floor(v_e / v_cycle)::int;
    phase := CASE WHEN v_e - idx * v_cycle < p_temps THEN 'question' ELSE 'revelation' END;
  END IF;

  IF v_e >= p_temps + c_marge THEN
    nb_fermees := least(p_nb, floor((v_e - p_temps - c_marge) / v_cycle)::int + 1);
  ELSE
    nb_fermees := 0;
  END IF;

  IF v_e + c_apercu >= 0 THEN
    nb_visibles := least(p_nb, floor((v_e + c_apercu) / v_cycle)::int + 1);
  ELSE
    nb_visibles := 0;
  END IF;

  RETURN NEXT;
END;
$$;

-- Met à jour l'état des parties d'une salle (attente → en cours → terminée)
-- d'après l'horloge. Appelée par toutes les fonctions qui touchent une partie.
CREATE OR REPLACE FUNCTION _salle_maj(p_salle uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
BEGIN
  UPDATE salle_sessions
  SET statut = 'terminee', terminee_at = coalesce(terminee_at, fin_at)
  WHERE salle_id = p_salle AND statut <> 'terminee' AND v_now >= fin_at;

  UPDATE salle_sessions
  SET statut = 'en_cours'
  WHERE salle_id = p_salle AND statut = 'attente' AND v_now >= started_at;
END;
$$;

-- Les points d'un joueur sur les p_fermees premières questions d'une partie.
CREATE OR REPLACE FUNCTION _salle_scores(p_session uuid, p_fermees int)
RETURNS TABLE (user_id uuid, points int, bonnes int, repondues int, temps_ms bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.user_id,
         coalesce(sum(r.points), 0)::int,
         (count(*) FILTER (WHERE r.juste))::int,
         count(*)::int,
         coalesce(sum(r.delai_ms) FILTER (WHERE r.juste), 0)::bigint
  FROM salle_reponses r
  WHERE r.session_id = p_session AND r.position < p_fermees
  GROUP BY r.user_id;
$$;

-- Le classement d'une partie : tous les membres présents (0 point s'ils n'ont
-- rien marqué), du meilleur au moins bon. Départage : points, puis nombre de
-- bonnes réponses, puis temps cumulé sur les bonnes réponses (le plus court).
-- Égalité parfaite : même rang (1, 2, 2, 4…).
CREATE OR REPLACE FUNCTION _salle_classement(p_salle uuid, p_session uuid, p_fermees int)
RETURNS TABLE (rang int, user_id uuid, username text, avatar_url text, points int, bonnes int, repondues int, temps_ms bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (rank() OVER (ORDER BY b.points DESC, b.bonnes DESC, b.temps_ms ASC))::int,
         b.user_id, b.username, b.avatar_url, b.points, b.bonnes, b.repondues, b.temps_ms
  FROM (
    SELECT m.user_id,
           p.username,
           p.avatar_url,
           coalesce(sc.points, 0) AS points,
           coalesce(sc.bonnes, 0) AS bonnes,
           coalesce(sc.repondues, 0) AS repondues,
           coalesce(sc.temps_ms, 0)::bigint AS temps_ms
    FROM salle_membres m
    JOIN profiles p ON p.id = m.user_id
    LEFT JOIN _salle_scores(p_session, p_fermees) sc ON sc.user_id = m.user_id
    WHERE m.salle_id = p_salle
  ) b;
$$;

-- Un calcul est-il juste ? Même règle que isCorrectValue (lib/calc/engine.ts) :
-- l'écart tient dans la tolérance absolue, ou fait au plus 0,2 % de la réponse
-- (sauf question stricte), ou la saisie est la réponse à une décimale de moins
-- (arrondie ou tronquée) à moins de 1 % près.
CREATE OR REPLACE FUNCTION _salle_calcul_juste(p_val numeric, p_rep numeric, p_dec int, p_tol numeric, p_stricte boolean)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_diff numeric;
  v_eps  numeric;
  v_d    int;
  v_sur  boolean;
BEGIN
  IF p_val IS NULL OR p_rep IS NULL THEN
    RETURN false;
  END IF;
  v_diff := abs(p_val - p_rep);
  v_eps := 0.000000001 * greatest(1, abs(p_rep));
  IF coalesce(p_stricte, false) THEN
    RETURN v_diff <= coalesce(p_tol, 0) + v_eps;
  END IF;
  IF v_diff <= coalesce(p_tol, 0) + v_eps OR v_diff <= 0.002 * abs(p_rep) + v_eps THEN
    RETURN true;
  END IF;
  v_d := coalesce(p_dec, 0) - 1;
  IF v_d < 1 THEN
    RETURN false;
  END IF;
  v_sur := abs(p_val * power(10::numeric, v_d) - round(p_val * power(10::numeric, v_d))) <= 0.000001;
  RETURN v_sur
    AND v_diff < power(10::numeric, -v_d) - v_eps
    AND v_diff <= 0.01 * abs(p_rep) + v_eps;
END;
$$;


-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------

ALTER TABLE salles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE salle_membres   ENABLE ROW LEVEL SECURITY;
ALTER TABLE salle_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE salle_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE salle_reponses  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salles_lecture_membres" ON salles;
CREATE POLICY "salles_lecture_membres" ON salles
  FOR SELECT TO authenticated
  USING (_salle_moi_membre(id));

DROP POLICY IF EXISTS "salle_membres_lecture_membres" ON salle_membres;
CREATE POLICY "salle_membres_lecture_membres" ON salle_membres
  FOR SELECT TO authenticated
  USING (_salle_moi_membre(salle_id));

DROP POLICY IF EXISTS "salle_sessions_lecture_membres" ON salle_sessions;
CREATE POLICY "salle_sessions_lecture_membres" ON salle_sessions
  FOR SELECT TO authenticated
  USING (_salle_moi_membre(salle_id));

-- salle_items (réponses cachées) et salle_reponses : volontairement aucune
-- policy, ni lecture ni écriture client. Pas de policy INSERT/UPDATE/DELETE
-- non plus sur les autres tables : tout passe par les fonctions ci-dessous.
REVOKE ALL ON salle_items, salle_reponses FROM anon, authenticated;
REVOKE ALL ON salles, salle_membres, salle_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON salles, salle_membres, salle_sessions FROM authenticated;


-- ----------------------------------------------------------------------------
-- 4. SALLES : créer, rejoindre, quitter, modifier, supprimer, lister
-- ----------------------------------------------------------------------------

-- Crée une salle dont l'appelant est l'admin (et premier membre).
CREATE OR REPLACE FUNCTION creer_salle(p_nom text, p_publique boolean DEFAULT false, p_description text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_nom  text := btrim(coalesce(p_nom, ''));
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_id   uuid;
  v_code text;
  v_try  int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF char_length(v_nom) < 2 OR char_length(v_nom) > 40 THEN
    RAISE EXCEPTION 'Le nom de la salle compte de 2 à 40 caractères.';
  END IF;
  IF v_desc IS NOT NULL AND char_length(v_desc) > 120 THEN
    RAISE EXCEPTION 'La description fait 120 caractères au plus.';
  END IF;
  IF (SELECT count(*) FROM salles WHERE admin_id = v_uid) >= 10 THEN
    RAISE EXCEPTION 'Tu administres déjà 10 salles : supprime-en une avant d''en créer une autre.';
  END IF;

  LOOP
    v_code := _salle_nouveau_code();
    BEGIN
      INSERT INTO salles (nom, description, code, publique, admin_id)
      VALUES (v_nom, v_desc, v_code, coalesce(p_publique, false), v_uid)
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_try := v_try + 1;
      IF v_try > 5 THEN
        RAISE EXCEPTION 'Impossible de créer la salle, réessaie.';
      END IF;
    END;
  END LOOP;

  INSERT INTO salle_membres (salle_id, user_id, role) VALUES (v_id, v_uid, 'admin');

  RETURN json_build_object('id', v_id, 'code', v_code, 'nom', v_nom, 'publique', coalesce(p_publique, false));
END;
$$;

-- Rejoint une salle (publique ou privée) par son code.
CREATE OR REPLACE FUNCTION rejoindre_salle(p_code text)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_s    salles%ROWTYPE;
  v_deja boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF char_length(v_code) <> 6 THEN
    RAISE EXCEPTION 'Un code de salle compte 6 caractères.';
  END IF;
  SELECT * INTO v_s FROM salles WHERE code = v_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune salle ne porte ce code.';
  END IF;

  v_deja := _salle_est_membre(v_s.id, v_uid);
  IF NOT v_deja THEN
    INSERT INTO salle_membres (salle_id, user_id, role) VALUES (v_s.id, v_uid, 'membre') ON CONFLICT DO NOTHING;
  END IF;
  RETURN json_build_object('id', v_s.id, 'nom', v_s.nom, 'publique', v_s.publique, 'deja_membre', v_deja);
END;
$$;

-- Rejoint une salle publique depuis la liste.
CREATE OR REPLACE FUNCTION rejoindre_salle_publique(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_s    salles%ROWTYPE;
  v_deja boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  v_deja := _salle_est_membre(v_s.id, v_uid);
  IF NOT v_deja THEN
    IF NOT v_s.publique THEN
      RAISE EXCEPTION 'Cette salle est privée : il faut son code pour la rejoindre.';
    END IF;
    INSERT INTO salle_membres (salle_id, user_id, role) VALUES (v_s.id, v_uid, 'membre') ON CONFLICT DO NOTHING;
  END IF;
  RETURN json_build_object('id', v_s.id, 'nom', v_s.nom, 'publique', v_s.publique, 'deja_membre', v_deja);
END;
$$;

-- Quitte une salle. L'admin qui part passe la main au plus ancien membre ; la
-- dernière personne à partir ferme la salle.
CREATE OR REPLACE FUNCTION quitter_salle(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_s      salles%ROWTYPE;
  v_role   text;
  v_suivant uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'supprimee', false);
  END IF;

  DELETE FROM salle_membres WHERE salle_id = p_salle_id AND user_id = v_uid RETURNING role INTO v_role;
  IF v_role IS NULL THEN
    RETURN json_build_object('ok', true, 'supprimee', false);
  END IF;

  SELECT user_id INTO v_suivant
  FROM salle_membres
  WHERE salle_id = p_salle_id
  ORDER BY rejoint_le, user_id
  LIMIT 1;

  IF v_suivant IS NULL THEN
    DELETE FROM salles WHERE id = p_salle_id;
    RETURN json_build_object('ok', true, 'supprimee', true);
  END IF;

  IF v_role = 'admin' THEN
    UPDATE salle_membres SET role = 'admin' WHERE salle_id = p_salle_id AND user_id = v_suivant;
    UPDATE salles SET admin_id = v_suivant WHERE id = p_salle_id;
  END IF;
  RETURN json_build_object('ok', true, 'supprimee', false);
END;
$$;

-- Change le nom, la visibilité ou la description (admin seul). Un argument
-- laissé à NULL ne change rien ; une description vide l'efface.
CREATE OR REPLACE FUNCTION modifier_salle(p_salle_id uuid, p_nom text DEFAULT NULL, p_publique boolean DEFAULT NULL, p_description text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_s   salles%ROWTYPE;
  v_nom text;
  v_desc text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND OR NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  IF v_s.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Seul l''admin de la salle peut la modifier.';
  END IF;

  v_nom := CASE WHEN p_nom IS NULL THEN v_s.nom ELSE btrim(p_nom) END;
  IF char_length(v_nom) < 2 OR char_length(v_nom) > 40 THEN
    RAISE EXCEPTION 'Le nom de la salle compte de 2 à 40 caractères.';
  END IF;
  v_desc := CASE WHEN p_description IS NULL THEN v_s.description ELSE nullif(btrim(p_description), '') END;
  IF v_desc IS NOT NULL AND char_length(v_desc) > 120 THEN
    RAISE EXCEPTION 'La description fait 120 caractères au plus.';
  END IF;

  UPDATE salles
  SET nom = v_nom,
      description = v_desc,
      publique = coalesce(p_publique, publique)
  WHERE id = p_salle_id;
  RETURN json_build_object('ok', true);
END;
$$;

-- Supprime la salle, ses parties et leurs réponses (admin seul).
CREATE OR REPLACE FUNCTION supprimer_salle(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_s   salles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND OR NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  IF v_s.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Seul l''admin de la salle peut la supprimer.';
  END IF;
  DELETE FROM salles WHERE id = p_salle_id;
  RETURN json_build_object('ok', true);
END;
$$;

-- Les salles publiques ouvertes à tous : celles où une partie est en cours
-- d'abord, puis les plus peuplées.
CREATE OR REPLACE FUNCTION salles_publiques()
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT coalesce(json_agg(t ORDER BY t.en_cours DESC, t.nb_membres DESC, t.derniere_activite DESC), '[]'::json)
  INTO v_res
  FROM (
    SELECT s.id,
           s.nom,
           s.description,
           p.username AS admin_username,
           (SELECT count(*) FROM salle_membres m WHERE m.salle_id = s.id)::int AS nb_membres,
           EXISTS (
             SELECT 1 FROM salle_sessions ss
             WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > v_now
           ) AS en_cours,
           s.derniere_activite,
           _salle_est_membre(s.id, v_uid) AS deja_membre
    FROM salles s
    JOIN profiles p ON p.id = s.admin_id
    WHERE s.publique
    ORDER BY s.derniere_activite DESC
    LIMIT 60
  ) t;
  RETURN v_res;
END;
$$;

-- Mes salles (celles dont je suis membre), la plus récemment active d'abord.
CREATE OR REPLACE FUNCTION mes_salles()
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT coalesce(json_agg(t ORDER BY t.derniere_activite DESC), '[]'::json)
  INTO v_res
  FROM (
    SELECT s.id,
           s.nom,
           s.description,
           s.code,
           s.publique,
           (m.role = 'admin') AS est_admin,
           (SELECT count(*) FROM salle_membres x WHERE x.salle_id = s.id)::int AS nb_membres,
           EXISTS (
             SELECT 1 FROM salle_sessions ss
             WHERE ss.salle_id = s.id AND ss.statut <> 'terminee' AND ss.fin_at > v_now
           ) AS en_cours,
           s.derniere_activite
    FROM salle_membres m
    JOIN salles s ON s.id = m.salle_id
    WHERE m.user_id = v_uid
    LIMIT 100
  ) t;
  RETURN v_res;
END;
$$;

-- Combien de questions la banque offre-t-elle, par matière et par difficulté,
-- pour une source ? (pour l'écran de réglages)
CREATE OR REPLACE FUNCTION salle_questions_disponibles(p_source text DEFAULT 'banque')
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_res json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('banque', 'mocks') THEN
    RAISE EXCEPTION 'La source des questions est la banque complète ou les mocks.';
  END IF;
  SELECT coalesce(json_agg(t ORDER BY t.topic), '[]'::json)
  INTO v_res
  FROM (
    SELECT pl.topic,
           count(*)::int AS total,
           (count(*) FILTER (WHERE pl.diff = 'facile'))::int AS facile,
           (count(*) FILTER (WHERE pl.diff = 'moyen'))::int AS moyen,
           (count(*) FILTER (WHERE pl.diff = 'difficile'))::int AS difficile
    FROM _salle_pool(p_source) pl
    GROUP BY pl.topic
  ) t;
  RETURN v_res;
END;
$$;


-- ----------------------------------------------------------------------------
-- 5. LA PARTIE : lancer, suivre, répondre, arrêter
-- ----------------------------------------------------------------------------

-- Lance une partie (admin seul). Réglages : voir l'en-tête. p_calculs : les
-- calculs déjà tirés par le serveur du site, avec leurs réponses, sous la forme
--   [{ "topic": "quant", "niveau": "facile", "libelle": "Quant · Time value",
--      "enonce": "...", "donnees": [{"label": "...", "value": "..."}],
--      "unite": "%", "decimales": 2, "reponse": 8.53, "tolerance": 0.005,
--      "stricte": false, "etapes": ["...", "..."] }, ...]
-- Le serveur tire lui-même les questions (source, matières, difficulté) et
-- mêle questions et calculs. Si le vivier est trop court, la partie est plus
-- courte que demandée (le résultat le dit : manque = true).
CREATE OR REPLACE FUNCTION lancer_session(p_salle_id uuid, p_params jsonb, p_calculs jsonb DEFAULT '[]'::jsonb)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c_decompte CONSTANT int := 8;
  c_pause    CONSTANT int := 5;
  v_uid      uuid := auth.uid();
  v_now      timestamptz := clock_timestamp();
  v_s        salles%ROWTYPE;
  v_p        jsonb;
  v_type     text;
  v_nombre   int;
  v_temps    int;
  v_nc_voulu int;
  v_nc       int := 0;
  v_nq       int := 0;
  v_ncalculs int;
  v_qids     uuid[] := '{}';
  v_qtopics  text[] := '{}';
  v_qdiffs   text[] := '{}';
  v_kinds    text[];
  v_total    int;
  v_numero   int;
  v_sid      uuid;
  v_started  timestamptz;
  v_pos      int;
  v_qi       int := 0;
  v_ci       int := 0;
  v_el       jsonb;
  v_q        quiz_questions%ROWTYPE;
  v_niveau   text;
  v_topic    text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND OR NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  IF v_s.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Seul l''admin de la salle peut lancer une partie.';
  END IF;

  PERFORM _salle_maj(p_salle_id);
  IF EXISTS (SELECT 1 FROM salle_sessions WHERE salle_id = p_salle_id AND statut <> 'terminee') THEN
    RAISE EXCEPTION 'Une partie est déjà en cours dans cette salle.';
  END IF;

  v_p := _salle_params(p_params);
  v_type := v_p ->> 'type';
  v_nombre := (v_p ->> 'nombre')::int;
  v_temps := (v_p ->> 'temps')::int;

  -- les calculs fournis
  IF p_calculs IS NULL OR jsonb_typeof(p_calculs) <> 'array' THEN
    p_calculs := '[]'::jsonb;
  END IF;
  v_ncalculs := jsonb_array_length(p_calculs);
  IF v_ncalculs > 100 THEN
    RAISE EXCEPTION 'Trop de calculs envoyés.';
  END IF;

  -- combien de calculs et de questions
  IF v_type = 'questions' THEN
    v_nc := 0;
  ELSIF v_type = 'calculs' THEN
    v_nc := least(v_nombre, v_ncalculs);
  ELSE
    v_nc_voulu := least(v_nombre - 1, greatest(1, floor(v_nombre * (v_p ->> 'part_calculs')::int / 100.0 + 0.5)::int));
    v_nc := least(v_nc_voulu, v_ncalculs);
  END IF;
  IF v_type <> 'calculs' THEN
    v_nq := v_nombre - v_nc;
  END IF;

  -- valider les calculs retenus
  FOR v_ci IN 0..(v_nc - 1) LOOP
    v_el := p_calculs -> v_ci;
    IF jsonb_typeof(v_el) <> 'object'
       OR coalesce(v_el ->> 'enonce', '') = ''
       OR char_length(v_el ->> 'enonce') > 2000
       OR coalesce(v_el ->> 'reponse', '') !~ '^-?[0-9]+([.][0-9]+)?([eE][-+]?[0-9]+)?$' THEN
      RAISE EXCEPTION 'Un des calculs envoyés est invalide.';
    END IF;
    IF coalesce(v_el ->> 'tolerance', '0') !~ '^[0-9]+([.][0-9]+)?([eE][-+]?[0-9]+)?$' THEN
      RAISE EXCEPTION 'Un des calculs envoyés est invalide.';
    END IF;
  END LOOP;

  -- tirer les questions, dans un ordre aléatoire
  IF v_nq > 0 THEN
    SELECT coalesce(array_agg(t.question_id), '{}'), coalesce(array_agg(t.topic), '{}'), coalesce(array_agg(t.diff), '{}')
    INTO v_qids, v_qtopics, v_qdiffs
    FROM (
      SELECT x.question_id, x.topic, x.diff
      FROM _salle_tirer_questions(
        v_p ->> 'source',
        ARRAY(SELECT jsonb_array_elements_text(v_p -> 'topics')),
        v_p ->> 'difficulte',
        v_nq
      ) x
      ORDER BY random()
    ) t;
    v_nq := coalesce(array_length(v_qids, 1), 0);
  END IF;

  v_total := v_nq + v_nc;
  IF v_total < 3 THEN
    RAISE EXCEPTION 'Pas assez de contenu pour ces réglages (% disponible(s)) : élargis les matières ou la source.', v_total;
  END IF;

  -- l'ordre des positions : questions et calculs mêlés
  SELECT array_agg(k.genre ORDER BY random())
  INTO v_kinds
  FROM (
    SELECT 'question'::text AS genre FROM generate_series(1, v_nq)
    UNION ALL
    SELECT 'calcul'::text FROM generate_series(1, v_nc)
  ) k;

  SELECT coalesce(max(numero), 0) + 1 INTO v_numero FROM salle_sessions WHERE salle_id = p_salle_id;
  v_started := v_now + make_interval(secs => c_decompte);

  INSERT INTO salle_sessions (salle_id, numero, statut, params, nb, temps, pause_s, lancee_par, started_at, fin_at)
  VALUES (
    p_salle_id,
    v_numero,
    'attente',
    v_p || jsonb_build_object('nb_questions', v_nq, 'nb_calculs', v_nc),
    v_total,
    v_temps,
    c_pause,
    v_uid,
    v_started,
    v_started + make_interval(secs => v_total * (v_temps + c_pause))
  )
  RETURNING id INTO v_sid;

  v_qi := 0;
  v_ci := 0;
  FOR v_pos IN 0..(v_total - 1) LOOP
    IF v_kinds[v_pos + 1] = 'question' THEN
      v_qi := v_qi + 1;
      SELECT * INTO v_q FROM quiz_questions WHERE id = v_qids[v_qi];
      INSERT INTO salle_items (session_id, position, origine, topic, difficulte, question_id, enonce, choix, bonne_index, explication)
      VALUES (
        v_sid, v_pos, 'question', v_qtopics[v_qi], v_qdiffs[v_qi], v_q.id,
        v_q.prompt, to_jsonb(v_q.choices), v_q.correct_index, v_q.explanation
      );
    ELSE
      v_el := p_calculs -> v_ci;
      v_ci := v_ci + 1;
      v_niveau := CASE WHEN v_el ->> 'niveau' IN ('facile', 'moyen', 'difficile') THEN v_el ->> 'niveau' ELSE 'moyen' END;
      v_topic := CASE
        WHEN v_el ->> 'topic' IN ('ethics', 'quant', 'economics', 'fsa', 'corporate', 'equity', 'fixed_income', 'derivatives', 'alternatives', 'portfolio')
        THEN v_el ->> 'topic'
        ELSE NULL
      END;
      INSERT INTO salle_items (session_id, position, origine, topic, difficulte, libelle, enonce, donnees, unite, decimales, bonne_valeur, tolerance, stricte, etapes)
      VALUES (
        v_sid, v_pos, 'calcul', v_topic, v_niveau,
        left(coalesce(v_el ->> 'libelle', ''), 120),
        v_el ->> 'enonce',
        CASE WHEN jsonb_typeof(v_el -> 'donnees') = 'array' THEN v_el -> 'donnees' ELSE '[]'::jsonb END,
        left(coalesce(v_el ->> 'unite', ''), 8),
        least(8, greatest(0, coalesce(nullif(v_el ->> 'decimales', '')::int, 2))),
        (v_el ->> 'reponse')::numeric,
        coalesce(nullif(v_el ->> 'tolerance', '')::numeric, 0.005),
        coalesce((v_el ->> 'stricte')::boolean, false),
        CASE WHEN jsonb_typeof(v_el -> 'etapes') = 'array' THEN v_el -> 'etapes' ELSE '[]'::jsonb END
      );
    END IF;
  END LOOP;

  UPDATE salles SET derniere_activite = v_now WHERE id = p_salle_id;

  RETURN json_build_object(
    'session_id', v_sid,
    'numero', v_numero,
    'nb', v_total,
    'nb_questions', v_nq,
    'nb_calculs', v_nc,
    'manque', v_total < v_nombre,
    'started_at', v_started,
    'server_now', v_now
  );
END;
$$;

-- L'état d'une salle, pour tous ses membres (le navigateur l'appelle toutes
-- les 2 à 3 s pendant une partie). Renvoie :
--   server_now      l'heure du serveur (pour caler l'horloge du navigateur)
--   salle           id, nom, description, code, publique, admin_id, created_at
--   moi             user_id, est_admin
--   nb_membres, membres  jusqu'à 200 membres (admin d'abord, puis par ancienneté)
--   session         la dernière partie de la salle (en cours, ou terminée), ou
--                   null : id, numero, statut, params, nb, temps, pause,
--                   started_at, fin_at, index, phase, nb_visibles, nb_fermees,
--                   repondu_courante (combien ont répondu à la question en
--                   cours), nb_joueurs
--   items           les énoncés SANS réponses des questions révélées, de la
--                   position p_depuis à nb_visibles - 1 (passer le nombre déjà
--                   reçu pour ne recevoir que les nouvelles)
--   corrections     la bonne réponse et l'explication des questions CLOSES,
--                   de la position p_depuis à nb_fermees - 1
--   mes_reponses    mes réponses (choix ou valeur, juste, points, délai)
--   classement      les 50 premiers (rang, joueur, points, bonnes, répondues),
--                   sur les questions closes seulement
--   mon_classement  ma ligne du classement (même hors des 50 premiers)
--   historique      les 5 dernières parties terminées (gagnant, mon rang)
CREATE OR REPLACE FUNCTION etat_salle(p_salle_id uuid, p_depuis int DEFAULT 0)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_now        timestamptz := clock_timestamp();
  v_s          salles%ROWTYPE;
  v_ses        salle_sessions%ROWTYPE;
  v_h          record;
  v_depuis     int := greatest(coalesce(p_depuis, 0), 0);
  v_nb_membres int;
  v_membres    json;
  v_session    json := NULL;
  v_items      json := '[]'::json;
  v_corr       json := '[]'::json;
  v_mes        json := '[]'::json;
  v_classement json := '[]'::json;
  v_moi_rang   json := NULL;
  v_hist       json := '[]'::json;
  v_repondu    int := 0;
  v_statut     text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  PERFORM _salle_maj(p_salle_id);
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;

  SELECT count(*)::int INTO v_nb_membres FROM salle_membres WHERE salle_id = p_salle_id;

  SELECT coalesce(json_agg(t ORDER BY t.est_admin DESC, t.rejoint_le, t.username), '[]'::json)
  INTO v_membres
  FROM (
    SELECT m.user_id,
           p.username,
           p.avatar_url,
           m.role,
           (m.role = 'admin') AS est_admin,
           r.elo,
           m.rejoint_le
    FROM salle_membres m
    JOIN profiles p ON p.id = m.user_id
    LEFT JOIN ratings r ON r.user_id = m.user_id
    WHERE m.salle_id = p_salle_id
    ORDER BY (m.role = 'admin') DESC, m.rejoint_le, p.username
    LIMIT 200
  ) t;

  SELECT * INTO v_ses FROM salle_sessions WHERE salle_id = p_salle_id ORDER BY numero DESC LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_h FROM _salle_horloge(v_ses.started_at, v_ses.temps, v_ses.pause_s, v_ses.nb, v_ses.statut, v_now);

    v_statut := CASE v_h.phase WHEN 'fin' THEN 'terminee' WHEN 'decompte' THEN 'attente' ELSE 'en_cours' END;

    IF v_h.idx >= 0 AND v_h.idx < v_ses.nb THEN
      SELECT count(*)::int INTO v_repondu FROM salle_reponses WHERE session_id = v_ses.id AND position = v_h.idx;
    END IF;

    v_session := json_build_object(
      'id', v_ses.id,
      'numero', v_ses.numero,
      'statut', v_statut,
      'params', v_ses.params,
      'nb', v_ses.nb,
      'temps', v_ses.temps,
      'pause', v_ses.pause_s,
      'started_at', v_ses.started_at,
      'fin_at', v_ses.fin_at,
      'index', v_h.idx,
      'phase', v_h.phase,
      'nb_visibles', v_h.nb_visibles,
      'nb_fermees', v_h.nb_fermees,
      'repondu_courante', v_repondu,
      'nb_joueurs', v_nb_membres
    );

    -- énoncés révélés (jamais la bonne réponse)
    SELECT coalesce(json_agg(json_build_object(
             'position', i.position,
             'origine', i.origine,
             'topic', i.topic,
             'difficulte', i.difficulte,
             'libelle', i.libelle,
             'enonce', i.enonce,
             'choix', i.choix,
             'donnees', i.donnees,
             'unite', i.unite,
             'decimales', i.decimales
           ) ORDER BY i.position), '[]'::json)
    INTO v_items
    FROM salle_items i
    WHERE i.session_id = v_ses.id AND i.position >= v_depuis AND i.position < v_h.nb_visibles;

    -- corrections des seules questions closes
    SELECT coalesce(json_agg(json_build_object(
             'position', i.position,
             'bonne_index', i.bonne_index,
             'bonne_valeur', i.bonne_valeur,
             'explication', i.explication,
             'etapes', i.etapes
           ) ORDER BY i.position), '[]'::json)
    INTO v_corr
    FROM salle_items i
    WHERE i.session_id = v_ses.id AND i.position >= v_depuis AND i.position < v_h.nb_fermees;

    SELECT coalesce(json_agg(json_build_object(
             'position', r.position,
             'choix', r.choix,
             'valeur', r.valeur,
             'juste', r.juste,
             'points', r.points,
             'delai_ms', r.delai_ms
           ) ORDER BY r.position), '[]'::json)
    INTO v_mes
    FROM salle_reponses r
    WHERE r.session_id = v_ses.id AND r.user_id = v_uid;

    SELECT coalesce(json_agg(json_build_object(
             'rang', c.rang,
             'user_id', c.user_id,
             'username', c.username,
             'avatar_url', c.avatar_url,
             'points', c.points,
             'bonnes', c.bonnes,
             'repondues', c.repondues,
             'temps_ms', c.temps_ms
           ) ORDER BY c.rang, c.username), '[]'::json)
    INTO v_classement
    FROM (
      SELECT * FROM _salle_classement(p_salle_id, v_ses.id, v_h.nb_fermees) x
      ORDER BY x.rang, x.username
      LIMIT 50
    ) c;

    SELECT json_build_object(
             'rang', c.rang,
             'points', c.points,
             'bonnes', c.bonnes,
             'repondues', c.repondues,
             'temps_ms', c.temps_ms
           )
    INTO v_moi_rang
    FROM _salle_classement(p_salle_id, v_ses.id, v_h.nb_fermees) c
    WHERE c.user_id = v_uid;
  END IF;

  -- les 5 dernières parties terminées (hors la partie affichée)
  SELECT coalesce(json_agg(h ORDER BY h.numero DESC), '[]'::json)
  INTO v_hist
  FROM (
    SELECT s2.id AS session_id,
           s2.numero,
           s2.nb,
           s2.params,
           s2.started_at,
           s2.fin_at,
           (SELECT count(DISTINCT r.user_id) FROM salle_reponses r WHERE r.session_id = s2.id)::int AS nb_joueurs,
           (SELECT json_build_object('user_id', g.user_id, 'username', g.username, 'points', g.points)
              FROM (
                SELECT sc.user_id, p.username, sc.points
                FROM _salle_scores(s2.id, s2.nb) sc
                JOIN profiles p ON p.id = sc.user_id
                ORDER BY sc.points DESC, sc.bonnes DESC, sc.temps_ms ASC, p.username
                LIMIT 1
              ) g) AS gagnant,
           (SELECT json_build_object('rang', x.rang, 'points', x.points)
              FROM (
                SELECT sc.user_id,
                       sc.points,
                       (rank() OVER (ORDER BY sc.points DESC, sc.bonnes DESC, sc.temps_ms ASC))::int AS rang
                FROM _salle_scores(s2.id, s2.nb) sc
              ) x
              WHERE x.user_id = v_uid) AS moi
    FROM salle_sessions s2
    WHERE s2.salle_id = p_salle_id
      AND s2.statut = 'terminee'
      AND s2.id IS DISTINCT FROM v_ses.id
    ORDER BY s2.numero DESC
    LIMIT 5
  ) h;

  RETURN json_build_object(
    'server_now', v_now,
    'salle', json_build_object(
      'id', v_s.id,
      'nom', v_s.nom,
      'description', v_s.description,
      'code', v_s.code,
      'publique', v_s.publique,
      'admin_id', v_s.admin_id,
      'created_at', v_s.created_at
    ),
    'moi', json_build_object('user_id', v_uid, 'est_admin', v_s.admin_id = v_uid),
    'nb_membres', v_nb_membres,
    'membres', v_membres,
    'session', v_session,
    'items', v_items,
    'corrections', v_corr,
    'mes_reponses', v_mes,
    'classement', v_classement,
    'mon_classement', v_moi_rang,
    'historique', v_hist
  );
END;
$$;

-- Répond à une question (réponse définitive), la corrige côté serveur et
-- renvoie la correction à celui qui vient de répondre. p_choix : l'indice du
-- choix (QCM, à partir de 0). p_valeurs : le nombre saisi (calcul) ; une ou
-- deux lectures possibles de la saisie (« 16,500 » = 16,5 ou 16 500) : juste
-- si l'une d'elles l'est. Contrôle la fenêtre de temps avec l'heure du
-- serveur : la question doit être ouverte, et le temps écoulé depuis son
-- ouverture inférieur à temps + 2 s de marge réseau.
-- Renvoie { ok: true, deja, juste, points, delai_ms, choix, valeur,
--           bonne_index | bonne_valeur, explication, etapes }
--   ou   { ok: false, raison: 'format', indice } pour un calcul bon mais à la
--        mauvaise échelle (0,085 au lieu de 8,5 %) : rien n'est enregistré,
--        le joueur peut ressaisir.
CREATE OR REPLACE FUNCTION repondre_salle(p_session_id uuid, p_position int, p_choix int DEFAULT NULL, p_valeurs numeric[] DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c_marge   CONSTANT numeric := 2;
  v_uid     uuid := auth.uid();
  v_now     timestamptz := clock_timestamp();
  v_ses     salle_sessions%ROWTYPE;
  v_it      salle_items%ROWTYPE;
  v_rep     salle_reponses%ROWTYPE;
  v_e       numeric;
  v_open    numeric;
  v_juste   boolean := false;
  v_format  boolean := false;
  v_val     numeric;
  v_retenue numeric := NULL;
  v_restant numeric;
  v_points  int := 0;
  v_delai   int;
  v_n       int;
  v_k       int;
  v_indice  text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id;
  IF NOT FOUND OR NOT _salle_est_membre(v_ses.salle_id, v_uid) THEN
    RAISE EXCEPTION 'Partie introuvable.';
  END IF;
  PERFORM _salle_maj(v_ses.salle_id);
  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id;
  IF v_ses.statut = 'terminee' THEN
    RAISE EXCEPTION 'La partie est terminée.';
  END IF;

  SELECT * INTO v_it FROM salle_items WHERE session_id = p_session_id AND position = p_position;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question invalide.';
  END IF;

  v_e := extract(epoch FROM (v_now - v_ses.started_at));
  v_open := p_position * (v_ses.temps + v_ses.pause_s);
  IF v_e < v_open THEN
    RAISE EXCEPTION 'Cette question n''est pas encore ouverte.';
  END IF;
  IF v_e >= v_open + v_ses.temps + c_marge THEN
    RAISE EXCEPTION 'Le temps est écoulé pour cette question.';
  END IF;

  -- déjà répondu : on rend la même réponse, sans rien changer
  SELECT * INTO v_rep FROM salle_reponses WHERE session_id = p_session_id AND user_id = v_uid AND position = p_position;
  IF FOUND THEN
    RETURN json_build_object(
      'ok', true, 'deja', true, 'juste', v_rep.juste, 'points', v_rep.points, 'delai_ms', v_rep.delai_ms,
      'choix', v_rep.choix, 'valeur', v_rep.valeur,
      'bonne_index', v_it.bonne_index, 'bonne_valeur', v_it.bonne_valeur,
      'explication', v_it.explication, 'etapes', v_it.etapes
    );
  END IF;

  IF v_it.origine = 'question' THEN
    v_n := jsonb_array_length(v_it.choix);
    IF p_choix IS NULL OR p_choix < 0 OR p_choix >= v_n THEN
      RAISE EXCEPTION 'Réponse invalide.';
    END IF;
    v_juste := p_choix = v_it.bonne_index;
  ELSE
    IF p_valeurs IS NULL OR coalesce(array_length(p_valeurs, 1), 0) NOT BETWEEN 1 AND 2 THEN
      RAISE EXCEPTION 'Réponse invalide.';
    END IF;
    FOREACH v_val IN ARRAY p_valeurs LOOP
      IF v_val IS NULL THEN
        RAISE EXCEPTION 'Réponse invalide.';
      END IF;
      IF _salle_calcul_juste(v_val, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte) THEN
        v_juste := true;
        v_retenue := v_val;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_juste THEN
      v_retenue := p_valeurs[1];
      -- le calcul est bon mais l'échelle non : on le dit, sans compter la réponse
      FOREACH v_val IN ARRAY p_valeurs LOOP
        IF v_val <> 0 AND v_it.bonne_valeur <> 0 THEN
          IF v_it.unite = '%' AND _salle_calcul_juste(v_val * 100, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte) THEN
            v_format := true;
            v_indice := 'Réponds en pourcentage : 8.5 pour 8,5 %.';
          ELSIF v_it.unite = 'bp' AND (
                  _salle_calcul_juste(v_val * 100, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte)
               OR _salle_calcul_juste(v_val * 10000, v_it.bonne_valeur, v_it.decimales, v_it.tolerance, v_it.stricte)) THEN
            v_format := true;
            v_indice := 'Réponds en points de base : 0,25 % = 25 bp.';
          END IF;
        END IF;
      END LOOP;
      IF v_format THEN
        RETURN json_build_object('ok', false, 'raison', 'format', 'indice', v_indice);
      END IF;
    END IF;
  END IF;

  v_delai := greatest(0, round((v_e - v_open) * 1000))::int;
  IF v_juste THEN
    v_restant := greatest(0, least(v_ses.temps, v_open + v_ses.temps - v_e));
    v_points := floor(1000 * (0.5 + 0.5 * v_restant / v_ses.temps) + 0.5)::int;
  END IF;

  INSERT INTO salle_reponses (session_id, position, user_id, choix, valeur, juste, points, delai_ms)
  VALUES (p_session_id, p_position, v_uid, CASE WHEN v_it.origine = 'question' THEN p_choix END, v_retenue, v_juste, v_points, v_delai)
  ON CONFLICT (session_id, user_id, position) DO NOTHING;
  GET DIAGNOSTICS v_k = ROW_COUNT;
  IF v_k = 0 THEN
    -- une autre requête a répondu entre-temps : la première reste définitive
    SELECT * INTO v_rep FROM salle_reponses WHERE session_id = p_session_id AND user_id = v_uid AND position = p_position;
    RETURN json_build_object(
      'ok', true, 'deja', true, 'juste', v_rep.juste, 'points', v_rep.points, 'delai_ms', v_rep.delai_ms,
      'choix', v_rep.choix, 'valeur', v_rep.valeur,
      'bonne_index', v_it.bonne_index, 'bonne_valeur', v_it.bonne_valeur,
      'explication', v_it.explication, 'etapes', v_it.etapes
    );
  END IF;

  RETURN json_build_object(
    'ok', true, 'deja', false, 'juste', v_juste, 'points', v_points, 'delai_ms', v_delai,
    'choix', CASE WHEN v_it.origine = 'question' THEN p_choix END, 'valeur', v_retenue,
    'bonne_index', v_it.bonne_index, 'bonne_valeur', v_it.bonne_valeur,
    'explication', v_it.explication, 'etapes', v_it.etapes
  );
END;
$$;

-- Arrête la partie en cours (admin seul) : elle est terminée sur-le-champ, les
-- points déjà marqués restent, les corrections s'ouvrent pour tous.
CREATE OR REPLACE FUNCTION arreter_session(p_salle_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_s   salles%ROWTYPE;
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_s FROM salles WHERE id = p_salle_id FOR UPDATE;
  IF NOT FOUND OR NOT _salle_est_membre(p_salle_id, v_uid) THEN
    RAISE EXCEPTION 'Salle introuvable.';
  END IF;
  IF v_s.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Seul l''admin de la salle peut arrêter la partie.';
  END IF;
  PERFORM _salle_maj(p_salle_id);
  UPDATE salle_sessions
  SET statut = 'terminee', terminee_at = v_now, fin_at = least(fin_at, v_now)
  WHERE salle_id = p_salle_id AND statut <> 'terminee'
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Aucune partie en cours dans cette salle.';
  END IF;
  UPDATE salles SET derniere_activite = v_now WHERE id = p_salle_id;
  RETURN json_build_object('ok', true, 'session_id', v_id);
END;
$$;

-- Le classement complet d'une partie terminée de la salle (jusqu'à 200 lignes).
CREATE OR REPLACE FUNCTION classement_session(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ses salle_sessions%ROWTYPE;
  v_res json;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id;
  IF NOT FOUND OR NOT _salle_est_membre(v_ses.salle_id, v_uid) THEN
    RAISE EXCEPTION 'Partie introuvable.';
  END IF;
  PERFORM _salle_maj(v_ses.salle_id);
  SELECT * INTO v_ses FROM salle_sessions WHERE id = p_session_id;
  IF v_ses.statut <> 'terminee' THEN
    RAISE EXCEPTION 'Le classement complet s''ouvre à la fin de la partie.';
  END IF;
  SELECT coalesce(json_agg(json_build_object(
           'rang', c.rang,
           'user_id', c.user_id,
           'username', c.username,
           'avatar_url', c.avatar_url,
           'points', c.points,
           'bonnes', c.bonnes,
           'repondues', c.repondues,
           'temps_ms', c.temps_ms
         ) ORDER BY c.rang, c.username), '[]'::json)
  INTO v_res
  FROM (
    SELECT * FROM _salle_classement(v_ses.salle_id, v_ses.id, v_ses.nb) x
    ORDER BY x.rang, x.username
    LIMIT 200
  ) c;
  RETURN v_res;
END;
$$;


-- ----------------------------------------------------------------------------
-- 6. DROITS D'EXÉCUTION
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION _salle_est_membre(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_nouveau_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_topic_nom(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_topic(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_pool(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_tirer_questions(text, text[], text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_params(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_horloge(timestamptz, int, int, int, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_maj(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_scores(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_classement(uuid, uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _salle_calcul_juste(numeric, numeric, int, numeric, boolean) FROM PUBLIC, anon, authenticated;

-- _salle_moi_membre sert aux policies de lecture : le joueur connecté doit
-- pouvoir l'exécuter (elle ne dit que SA propre appartenance).
REVOKE ALL ON FUNCTION _salle_moi_membre(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION _salle_moi_membre(uuid) TO authenticated;

REVOKE ALL ON FUNCTION creer_salle(text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rejoindre_salle(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rejoindre_salle_publique(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION quitter_salle(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION modifier_salle(uuid, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION supprimer_salle(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION salles_publiques() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION mes_salles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION salle_questions_disponibles(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION lancer_session(uuid, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION etat_salle(uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION repondre_salle(uuid, int, int, numeric[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION arreter_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION classement_session(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION creer_salle(text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rejoindre_salle(text) TO authenticated;
GRANT EXECUTE ON FUNCTION rejoindre_salle_publique(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION quitter_salle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION modifier_salle(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION supprimer_salle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION salles_publiques() TO authenticated;
GRANT EXECUTE ON FUNCTION mes_salles() TO authenticated;
GRANT EXECUTE ON FUNCTION salle_questions_disponibles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION lancer_session(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION etat_salle(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION repondre_salle(uuid, int, int, numeric[]) TO authenticated;
GRANT EXECUTE ON FUNCTION arreter_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION classement_session(uuid) TO authenticated;
