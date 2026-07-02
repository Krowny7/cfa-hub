-- ================================================================
-- CFA HUB — Schéma Supabase complet
-- Exécuter dans l'ordre dans le SQL Editor (une seule passe)
-- ================================================================


-- ----------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ----------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------

-- Profils utilisateur (1-1 avec auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        text        UNIQUE,
  avatar_url      text,
  active_group_id uuid,                    -- FK ajoutée après study_groups
  xp_total        integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Groupes d'étude
CREATE TABLE IF NOT EXISTS study_groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  invite_code text        NOT NULL UNIQUE,
  owner_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- FK active_group_id → study_groups (ajoutée maintenant que la table existe)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_active_group_id_fkey
  FOREIGN KEY (active_group_id) REFERENCES study_groups(id) ON DELETE SET NULL
  NOT VALID;   -- NOT VALID évite le scan de la table si elle contient déjà des données

-- Membres des groupes
CREATE TABLE IF NOT EXISTS group_memberships (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id   uuid        NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

-- Classement ELO
CREATE TABLE IF NOT EXISTS ratings (
  user_id      uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  elo          integer NOT NULL DEFAULT 1200,
  games_played integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Dossiers partagés (bibliothèque, flashcards, QCM)
CREATE TABLE IF NOT EXISTS library_folders (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text        NOT NULL,
  kind      text        NOT NULL CHECK (kind IN ('documents', 'flashcards', 'quizzes')),
  owner_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid        REFERENCES library_folders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Documents (liens PDF)
CREATE TABLE IF NOT EXISTS documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  external_url text,
  preview_url  text,
  visibility   text        NOT NULL DEFAULT 'private'
                           CHECK (visibility IN ('private', 'groups', 'public')),
  owner_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id     uuid        REFERENCES study_groups(id) ON DELETE SET NULL,  -- legacy
  folder_id    uuid        REFERENCES library_folders(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Partage de documents vers des groupes
CREATE TABLE IF NOT EXISTS document_shares (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, group_id)
);

-- Sets de flashcards
CREATE TABLE IF NOT EXISTS flashcard_sets (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  visibility text        NOT NULL DEFAULT 'private'
                         CHECK (visibility IN ('private', 'groups', 'public')),
  subject    text        NOT NULL DEFAULT 'cfa'
                         CHECK (subject IN ('cfa', 'personal')),
  owner_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id   uuid        REFERENCES study_groups(id) ON DELETE SET NULL,  -- legacy
  folder_id  uuid        REFERENCES library_folders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partage de sets de flashcards vers des groupes
CREATE TABLE IF NOT EXISTS flashcard_set_shares (
  set_id   uuid NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, group_id)
);

-- Cartes individuelles
CREATE TABLE IF NOT EXISTS flashcards (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id     uuid        NOT NULL REFERENCES flashcard_sets(id) ON DELETE CASCADE,
  front      text        NOT NULL,
  back       text        NOT NULL,
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sets de QCM
CREATE TABLE IF NOT EXISTS quiz_sets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  visibility       text        NOT NULL DEFAULT 'private'
                               CHECK (visibility IN ('private', 'groups', 'public')),
  subject          text        NOT NULL DEFAULT 'cfa'
                               CHECK (subject IN ('cfa', 'personal')),
  owner_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id         uuid        REFERENCES study_groups(id) ON DELETE SET NULL,  -- legacy
  folder_id        uuid        REFERENCES library_folders(id) ON DELETE SET NULL,
  is_official      boolean     NOT NULL DEFAULT false,
  official_published boolean   NOT NULL DEFAULT false,
  difficulty       integer     CHECK (difficulty IN (1, 2, 3)),
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Partage de QCM vers des groupes
CREATE TABLE IF NOT EXISTS quiz_set_shares (
  set_id   uuid NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, group_id)
);

-- Questions de QCM
CREATE TABLE IF NOT EXISTS quiz_questions (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id        uuid    NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
  prompt        text    NOT NULL,
  choices       text[]  NOT NULL DEFAULT '{}',
  correct_index integer NOT NULL,
  explanation   text,
  position      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Événements XP (log immuable)
CREATE TABLE IF NOT EXISTS xp_events (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  xp          integer     NOT NULL,
  source      text        NOT NULL,   -- 'quiz_question' | 'session' | ...
  meta        jsonb
);

-- Progression par question (anti-farming XP)
CREATE TABLE IF NOT EXISTS quiz_question_progress (
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id      uuid        NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  first_correct_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

-- Admins de l'app (peuvent créer des QCM officiels)
CREATE TABLE IF NOT EXISTS app_admins (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------
-- 2. INDEX
-- ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS xp_events_user_time_idx ON xp_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS flashcards_set_id_idx    ON flashcards (set_id, position);
CREATE INDEX IF NOT EXISTS quiz_questions_set_id_idx ON quiz_questions (set_id, position);


-- ----------------------------------------------------------------
-- 3. TRIGGER — création auto du profil à l'inscription
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO ratings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ----------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------

-- Activer RLS sur toutes les tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_folders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares       ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_set_shares  ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_set_shares       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_admins            ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────────
CREATE POLICY "profiles_select_all"  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── study_groups ──────────────────────────────────────────────────
CREATE POLICY "groups_select_member" ON study_groups FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.group_id = study_groups.id AND gm.user_id = auth.uid())
  );
CREATE POLICY "groups_insert_auth"   ON study_groups FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "groups_update_owner"  ON study_groups FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "groups_delete_owner"  ON study_groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── group_memberships ─────────────────────────────────────────────
CREATE POLICY "memberships_select_own"   ON group_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "memberships_delete_own"   ON group_memberships FOR DELETE TO authenticated USING (user_id = auth.uid());
-- INSERT géré via RPC (SECURITY DEFINER), pas de policy INSERT ici.

-- ── ratings ───────────────────────────────────────────────────────
CREATE POLICY "ratings_select_all"  ON ratings FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE gérés via RPC (SECURITY DEFINER).

-- ── library_folders ───────────────────────────────────────────────
CREATE POLICY "folders_select_own"   ON library_folders FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "folders_insert_own"   ON library_folders FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "folders_update_own"   ON library_folders FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "folders_delete_own"   ON library_folders FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── documents ─────────────────────────────────────────────────────
CREATE POLICY "docs_select" ON documents FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'groups'
      AND EXISTS (
        SELECT 1 FROM document_shares ds
        JOIN group_memberships gm ON gm.group_id = ds.group_id
        WHERE ds.document_id = documents.id AND gm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "docs_insert_own"  ON documents FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "docs_update_own"  ON documents FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "docs_delete_own"  ON documents FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── document_shares ───────────────────────────────────────────────
CREATE POLICY "doc_shares_select" ON document_shares FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_shares.document_id AND d.owner_id = auth.uid()));
CREATE POLICY "doc_shares_insert" ON document_shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_shares.document_id AND d.owner_id = auth.uid()));
CREATE POLICY "doc_shares_delete" ON document_shares FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM documents d WHERE d.id = document_shares.document_id AND d.owner_id = auth.uid()));

-- ── flashcard_sets ────────────────────────────────────────────────
CREATE POLICY "fsets_select" ON flashcard_sets FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'groups'
      AND EXISTS (
        SELECT 1 FROM flashcard_set_shares fss
        JOIN group_memberships gm ON gm.group_id = fss.group_id
        WHERE fss.set_id = flashcard_sets.id AND gm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "fsets_insert_own"  ON flashcard_sets FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "fsets_update_own"  ON flashcard_sets FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "fsets_delete_own"  ON flashcard_sets FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── flashcard_set_shares ──────────────────────────────────────────
CREATE POLICY "fset_shares_select" ON flashcard_set_shares FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM flashcard_sets fs WHERE fs.id = flashcard_set_shares.set_id AND fs.owner_id = auth.uid()));
CREATE POLICY "fset_shares_insert" ON flashcard_set_shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM flashcard_sets fs WHERE fs.id = flashcard_set_shares.set_id AND fs.owner_id = auth.uid()));
CREATE POLICY "fset_shares_delete" ON flashcard_set_shares FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM flashcard_sets fs WHERE fs.id = flashcard_set_shares.set_id AND fs.owner_id = auth.uid()));

-- ── flashcards ────────────────────────────────────────────────────
-- Une carte est lisible si son set est lisible (délégué à la policy du set via EXISTS)
CREATE POLICY "cards_select" ON flashcards FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets fs
      WHERE fs.id = flashcards.set_id
        AND (
          fs.owner_id = auth.uid()
          OR fs.visibility = 'public'
          OR (fs.visibility = 'groups' AND EXISTS (
            SELECT 1 FROM flashcard_set_shares fss
            JOIN group_memberships gm ON gm.group_id = fss.group_id
            WHERE fss.set_id = fs.id AND gm.user_id = auth.uid()
          ))
        )
    )
  );
CREATE POLICY "cards_insert_own" ON flashcards FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM flashcard_sets fs WHERE fs.id = flashcards.set_id AND fs.owner_id = auth.uid()));
CREATE POLICY "cards_update_own" ON flashcards FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM flashcard_sets fs WHERE fs.id = flashcards.set_id AND fs.owner_id = auth.uid()));
CREATE POLICY "cards_delete_own" ON flashcards FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM flashcard_sets fs WHERE fs.id = flashcards.set_id AND fs.owner_id = auth.uid()));

-- ── quiz_sets ─────────────────────────────────────────────────────
CREATE POLICY "qsets_select" ON quiz_sets FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR (is_official AND official_published)
    OR (
      visibility = 'groups'
      AND EXISTS (
        SELECT 1 FROM quiz_set_shares qss
        JOIN group_memberships gm ON gm.group_id = qss.group_id
        WHERE qss.set_id = quiz_sets.id AND gm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "qsets_insert_own"  ON quiz_sets FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "qsets_update_own"  ON quiz_sets FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "qsets_delete_own"  ON quiz_sets FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── quiz_set_shares ───────────────────────────────────────────────
CREATE POLICY "qset_shares_select" ON quiz_set_shares FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quiz_sets qs WHERE qs.id = quiz_set_shares.set_id AND qs.owner_id = auth.uid()));
CREATE POLICY "qset_shares_insert" ON quiz_set_shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM quiz_sets qs WHERE qs.id = quiz_set_shares.set_id AND qs.owner_id = auth.uid()));
CREATE POLICY "qset_shares_delete" ON quiz_set_shares FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM quiz_sets qs WHERE qs.id = quiz_set_shares.set_id AND qs.owner_id = auth.uid()));

-- ── quiz_questions ────────────────────────────────────────────────
CREATE POLICY "questions_select" ON quiz_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_sets qs
      WHERE qs.id = quiz_questions.set_id
        AND (
          qs.owner_id = auth.uid()
          OR qs.visibility = 'public'
          OR (qs.is_official AND qs.official_published)
          OR (qs.visibility = 'groups' AND EXISTS (
            SELECT 1 FROM quiz_set_shares qss
            JOIN group_memberships gm ON gm.group_id = qss.group_id
            WHERE qss.set_id = qs.id AND gm.user_id = auth.uid()
          ))
        )
    )
  );
CREATE POLICY "questions_insert_own" ON quiz_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM quiz_sets qs WHERE qs.id = quiz_questions.set_id AND qs.owner_id = auth.uid()));
CREATE POLICY "questions_update_own" ON quiz_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM quiz_sets qs WHERE qs.id = quiz_questions.set_id AND qs.owner_id = auth.uid()));
CREATE POLICY "questions_delete_own" ON quiz_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM quiz_sets qs WHERE qs.id = quiz_questions.set_id AND qs.owner_id = auth.uid()));

-- ── xp_events ─────────────────────────────────────────────────────
CREATE POLICY "xp_events_select_own" ON xp_events FOR SELECT TO authenticated USING (user_id = auth.uid());
-- INSERT uniquement via RPC SECURITY DEFINER.

-- ── quiz_question_progress ────────────────────────────────────────
CREATE POLICY "progress_select_own" ON quiz_question_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
-- INSERT uniquement via RPC SECURITY DEFINER.

-- ── app_admins ────────────────────────────────────────────────────
CREATE POLICY "admins_select_all" ON app_admins FOR SELECT TO authenticated USING (true);
-- INSERT/DELETE : à faire manuellement depuis le dashboard Supabase.


-- ----------------------------------------------------------------
-- 5. FONCTIONS RPC
-- ----------------------------------------------------------------

-- Vérifie si l'utilisateur courant est admin
CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid());
$$;

-- Crée un groupe et ajoute le créateur comme membre
CREATE OR REPLACE FUNCTION create_group(group_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id     uuid;
  v_invite text;
BEGIN
  v_invite := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO study_groups (name, invite_code, owner_id)
  VALUES (trim(group_name), v_invite, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO group_memberships (user_id, group_id)
  VALUES (auth.uid(), v_id);

  RETURN v_id;
END;
$$;

-- Rejoint un groupe via son code d'invitation
CREATE OR REPLACE FUNCTION join_group(invite text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id
  FROM study_groups
  WHERE invite_code = upper(trim(invite));

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Groupe introuvable (code : %)', invite;
  END IF;

  INSERT INTO group_memberships (user_id, group_id)
  VALUES (auth.uid(), v_group_id)
  ON CONFLICT DO NOTHING;

  RETURN v_group_id;
END;
$$;

-- XP journalier sur N jours (pour le heatmap)
CREATE OR REPLACE FUNCTION get_xp_daily(p_days integer DEFAULT 90)
RETURNS TABLE (day date, xp integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_days integer := GREATEST(1, LEAST(365, p_days));
BEGIN
  RETURN QUERY
    SELECT
      e.occurred_at::date           AS day,
      SUM(e.xp)::integer            AS xp
    FROM xp_events e
    WHERE e.user_id     = auth.uid()
      AND e.occurred_at >= now() - (v_days || ' days')::interval
    GROUP BY e.occurred_at::date
    ORDER BY day;
END;
$$;

-- Attribue de l'XP pour une bonne réponse à une question officielle
CREATE OR REPLACE FUNCTION award_quiz_question_xp(p_set_id uuid, p_question_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_official   boolean;
  v_published  boolean;
  v_difficulty integer;
  v_already    boolean;
  v_xp         integer := 0;
  v_xp_total   integer;
BEGIN
  -- Vérifier que le set est officiel et publié
  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM quiz_sets WHERE id = p_set_id;

  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object('xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0));
  END IF;

  -- Vérifier que la question n'a pas déjà été réussie (anti-farming)
  SELECT EXISTS (
    SELECT 1 FROM quiz_question_progress
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) INTO v_already;

  IF v_already THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object('xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0));
  END IF;

  -- XP selon la difficulté (défaut : 10)
  v_xp := CASE COALESCE(v_difficulty, 1)
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    ELSE 10
  END;

  -- Enregistrer la progression
  INSERT INTO quiz_question_progress (user_id, question_id)
  VALUES (auth.uid(), p_question_id)
  ON CONFLICT DO NOTHING;

  -- Log XP
  INSERT INTO xp_events (user_id, xp, source, meta)
  VALUES (
    auth.uid(), v_xp, 'quiz_question',
    jsonb_build_object('set_id', p_set_id, 'question_id', p_question_id)
  );

  -- Mettre à jour le total sur le profil
  UPDATE profiles
  SET xp_total = xp_total + v_xp
  WHERE id = auth.uid()
  RETURNING xp_total INTO v_xp_total;

  RETURN json_build_object('xp_awarded', v_xp, 'xp_total', COALESCE(v_xp_total, 0));
END;
$$;


-- ----------------------------------------------------------------
-- 6. STORAGE (à créer dans le dashboard Supabase → Storage)
-- ----------------------------------------------------------------

-- Bucket : avatars
-- Visibilité : public
-- Taille max suggérée : 2 MB
-- Types autorisés : image/png, image/jpeg, image/webp

-- Policy INSERT : utilisateur connecté peut uploader dans avatars/{uid}/
-- Policy SELECT : tout le monde (bucket public)


-- ----------------------------------------------------------------
-- 7. MIGRATION — si tu repars d'une base existante
-- ----------------------------------------------------------------

-- Ajouter la colonne subject si elle n'existe pas déjà
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'cfa'
  CHECK (subject IN ('cfa', 'personal'));

ALTER TABLE quiz_sets ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT 'cfa'
  CHECK (subject IN ('cfa', 'personal'));


-- ----------------------------------------------------------------
-- 8. NOTES
-- ----------------------------------------------------------------

-- group_id sur documents / flashcard_sets / quiz_sets :
--   Colonne legacy de l'ancien système de partage mono-groupe.
--   Le nouveau système utilise les tables *_shares (multi-groupes).
--   La colonne est conservée pour compatibilité mais toujours NULL
--   dans les nouveaux inserts.

-- Modèle de visibilité :
--   'private'  → owner uniquement
--   'groups'   → owner + membres des groupes listés dans *_shares
--   'public'   → tous les utilisateurs authentifiés
--   Les QCM officiels (is_official=true, official_published=true)
--   sont également visibles par tous, quelle que soit la visibility.
