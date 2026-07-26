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

-- Dossiers partagés (bibliothèque, flashcards, QCM, exercices)
CREATE TABLE IF NOT EXISTS library_folders (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text        NOT NULL,
  kind      text        NOT NULL CHECK (kind IN ('documents', 'flashcards', 'quizzes', 'exercises')),
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
  cfa_level  integer     NOT NULL DEFAULT 1 CHECK (cfa_level IN (1, 2, 3)),
  owner_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id   uuid        REFERENCES study_groups(id) ON DELETE SET NULL,  -- legacy
  folder_id  uuid        REFERENCES library_folders(id) ON DELETE SET NULL,
  is_official      boolean     NOT NULL DEFAULT false,
  official_published boolean   NOT NULL DEFAULT false,
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
  cfa_level        integer     NOT NULL DEFAULT 1 CHECK (cfa_level IN (1, 2, 3)),
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

-- Sets d'exercices (calculs/formules, réponse numérique auto-corrigée)
CREATE TABLE IF NOT EXISTS exercise_sets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  visibility       text        NOT NULL DEFAULT 'private'
                               CHECK (visibility IN ('private', 'groups', 'public')),
  subject          text        NOT NULL DEFAULT 'cfa'
                               CHECK (subject IN ('cfa', 'personal')),
  cfa_level        integer     NOT NULL DEFAULT 1 CHECK (cfa_level IN (1, 2, 3)),
  owner_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id         uuid        REFERENCES study_groups(id) ON DELETE SET NULL,  -- legacy
  folder_id        uuid        REFERENCES library_folders(id) ON DELETE SET NULL,
  is_official      boolean     NOT NULL DEFAULT false,
  official_published boolean   NOT NULL DEFAULT false,
  difficulty       integer     CHECK (difficulty IN (1, 2, 3)),
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Partage d'exercices vers des groupes
CREATE TABLE IF NOT EXISTS exercise_set_shares (
  set_id   uuid NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, group_id)
);

-- Questions d'exercices — format QCM à 3 options (A/B/C), fidèle au format
-- CFA réel ("... is closest to:"), corrigé toujours révélé après réponse.
CREATE TABLE IF NOT EXISTS exercise_questions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id         uuid        NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  prompt         text        NOT NULL,
  choices        jsonb       NOT NULL,
  correct_index  integer     NOT NULL,
  explanation    text,
  position       integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Progression par question d'exercice (anti-farming XP)
CREATE TABLE IF NOT EXISTS exercise_question_progress (
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id      uuid        NOT NULL REFERENCES exercise_questions(id) ON DELETE CASCADE,
  first_correct_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

-- Admins de l'app (peuvent créer du contenu Système)
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
CREATE INDEX IF NOT EXISTS exercise_questions_set_id_idx ON exercise_questions (set_id, position);


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
ALTER TABLE exercise_sets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_set_shares        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_question_progress ENABLE ROW LEVEL SECURITY;
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

-- ── Helpers SECURITY DEFINER pour éviter les récursions RLS ────────
-- Utilisés par les policies des tables *_shares (voir chaque section
-- ci-dessous). Sans ça, une policy sur ex. flashcard_set_shares qui
-- interroge flashcard_sets redéclenche la policy RLS de flashcard_sets,
-- qui elle-même interroge flashcard_set_shares -> cycle infini.
CREATE OR REPLACE FUNCTION public.user_owns_document(p_document_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM documents WHERE id = p_document_id AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.user_owns_flashcard_set(p_set_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM flashcard_sets WHERE id = p_set_id AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.user_owns_quiz_set(p_set_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM quiz_sets WHERE id = p_set_id AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.user_owns_exercise_set(p_set_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM exercise_sets WHERE id = p_set_id AND owner_id = auth.uid());
$$;

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
-- NB: passe par une fonction SECURITY DEFINER (user_owns_document) plutôt
-- qu'une sous-requête directe sur documents, pour éviter une récursion
-- infinie RLS (documents.docs_select référence document_shares, qui
-- référençait documents en retour -> cycle détecté par Postgres).
-- Voir migration_fix_rls_recursion.sql.
CREATE POLICY "doc_shares_select" ON document_shares FOR SELECT TO authenticated
  USING (user_owns_document(document_id));
CREATE POLICY "doc_shares_insert" ON document_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_document(document_id));
CREATE POLICY "doc_shares_delete" ON document_shares FOR DELETE TO authenticated
  USING (user_owns_document(document_id));

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
-- WITH CHECK empêche un non-admin de créer/laisser un set en is_official/
-- official_published=true (voir migration_fix_content_admin_only.sql).
CREATE POLICY "fsets_insert_own"  ON flashcard_sets FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE)));
CREATE POLICY "fsets_update_own"  ON flashcard_sets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE)));
CREATE POLICY "fsets_delete_own"  ON flashcard_sets FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── flashcard_set_shares ──────────────────────────────────────────
-- NB: passe par user_owns_flashcard_set (SECURITY DEFINER) pour éviter
-- la récursion RLS avec flashcard_sets.fsets_select. Voir
-- migration_fix_rls_recursion.sql.
CREATE POLICY "fset_shares_select" ON flashcard_set_shares FOR SELECT TO authenticated
  USING (user_owns_flashcard_set(set_id));
CREATE POLICY "fset_shares_insert" ON flashcard_set_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_flashcard_set(set_id));
CREATE POLICY "fset_shares_delete" ON flashcard_set_shares FOR DELETE TO authenticated
  USING (user_owns_flashcard_set(set_id));

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
CREATE POLICY "qsets_insert_own"  ON quiz_sets FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE)));
CREATE POLICY "qsets_update_own"  ON quiz_sets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE)));
CREATE POLICY "qsets_delete_own"  ON quiz_sets FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── quiz_set_shares ───────────────────────────────────────────────
-- NB: passe par user_owns_quiz_set (SECURITY DEFINER) pour éviter la
-- récursion RLS avec quiz_sets.qsets_select. Voir
-- migration_fix_rls_recursion.sql.
CREATE POLICY "qset_shares_select" ON quiz_set_shares FOR SELECT TO authenticated
  USING (user_owns_quiz_set(set_id));
CREATE POLICY "qset_shares_insert" ON quiz_set_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_quiz_set(set_id));
CREATE POLICY "qset_shares_delete" ON quiz_set_shares FOR DELETE TO authenticated
  USING (user_owns_quiz_set(set_id));

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

-- ── exercise_sets ─────────────────────────────────────────────────
CREATE POLICY "exsets_select" ON exercise_sets FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR visibility = 'public'
    OR (is_official AND official_published)
    OR (
      visibility = 'groups'
      AND EXISTS (
        SELECT 1 FROM exercise_set_shares ess
        JOIN group_memberships gm ON gm.group_id = ess.group_id
        WHERE ess.set_id = exercise_sets.id AND gm.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "exsets_insert_own" ON exercise_sets FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE)));
CREATE POLICY "exsets_update_own" ON exercise_sets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND (is_app_admin() OR (is_official IS NOT TRUE AND official_published IS NOT TRUE)));
CREATE POLICY "exsets_delete_own" ON exercise_sets FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ── exercise_set_shares ───────────────────────────────────────────
-- NB: passe par user_owns_exercise_set (SECURITY DEFINER) pour éviter la
-- récursion RLS, même pattern que flashcard_set_shares/quiz_set_shares.
CREATE POLICY "exset_shares_select" ON exercise_set_shares FOR SELECT TO authenticated
  USING (user_owns_exercise_set(set_id));
CREATE POLICY "exset_shares_insert" ON exercise_set_shares FOR INSERT TO authenticated
  WITH CHECK (user_owns_exercise_set(set_id));
CREATE POLICY "exset_shares_delete" ON exercise_set_shares FOR DELETE TO authenticated
  USING (user_owns_exercise_set(set_id));

-- ── exercise_questions ────────────────────────────────────────────
CREATE POLICY "exquestions_select" ON exercise_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exercise_sets es
      WHERE es.id = exercise_questions.set_id
        AND (
          es.owner_id = auth.uid()
          OR es.visibility = 'public'
          OR (es.is_official AND es.official_published)
          OR (es.visibility = 'groups' AND EXISTS (
            SELECT 1 FROM exercise_set_shares ess
            JOIN group_memberships gm ON gm.group_id = ess.group_id
            WHERE ess.set_id = es.id AND gm.user_id = auth.uid()
          ))
        )
    )
  );
CREATE POLICY "exquestions_insert_own" ON exercise_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM exercise_sets es WHERE es.id = exercise_questions.set_id AND es.owner_id = auth.uid()));
CREATE POLICY "exquestions_update_own" ON exercise_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM exercise_sets es WHERE es.id = exercise_questions.set_id AND es.owner_id = auth.uid()));
CREATE POLICY "exquestions_delete_own" ON exercise_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM exercise_sets es WHERE es.id = exercise_questions.set_id AND es.owner_id = auth.uid()));

-- ── exercise_question_progress ────────────────────────────────────
CREATE POLICY "exercise_progress_select_own" ON exercise_question_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
-- INSERT uniquement via RPC SECURITY DEFINER.

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

-- Attribue de l'XP pour une bonne réponse à une question officielle.
-- IMPORTANT: la fonction vérifie ELLE-MÊME la bonne réponse (p_selected_index
-- comparé à quiz_questions.correct_index) — ne jamais se fier à un booléen
-- "isCorrect" calculé côté client pour décider de l'attribution d'XP.
-- Voir migration_fix_xp_answer_verification.sql pour l'historique du bug corrigé.
CREATE OR REPLACE FUNCTION award_quiz_question_xp(
  p_set_id uuid,
  p_question_id uuid,
  p_selected_index integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_official      boolean;
  v_published     boolean;
  v_difficulty    integer;
  v_correct_index integer;
  v_explanation   text;
  v_is_correct    boolean;
  v_already       boolean;
  v_xp            integer := 0;
  v_xp_total      integer;
BEGIN
  -- Vérifier que le set est officiel et publié
  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM quiz_sets WHERE id = p_set_id;

  -- Récupérer la vraie bonne réponse pour CETTE question, dans CE set
  SELECT correct_index, explanation INTO v_correct_index, v_explanation
  FROM quiz_questions
  WHERE id = p_question_id AND set_id = p_set_id;

  v_is_correct := (v_correct_index IS NOT NULL AND p_selected_index = v_correct_index);

  -- correct_index/explanation ne sont renvoyés qu'ICI, après la tentative de
  -- réponse — jamais dans le SELECT initial de la page (voir
  -- migration_fix_answer_leak.sql).
  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) OR NOT v_is_correct THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', COALESCE(v_is_correct, false),
      'correct_index', v_correct_index,
      'explanation', v_explanation
    );
  END IF;

  -- Vérifier que la question n'a pas déjà été réussie (anti-farming)
  SELECT EXISTS (
    SELECT 1 FROM quiz_question_progress
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) INTO v_already;

  IF v_already THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
      'correct_index', v_correct_index, 'explanation', v_explanation
    );
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

  RETURN json_build_object(
    'xp_awarded', v_xp, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
    'correct_index', v_correct_index, 'explanation', v_explanation
  );
END;
$$;

-- Attribue de l'XP pour une réponse correcte à un exercice (calcul/formule).
-- Miroir exact de award_quiz_question_xp (choix à 3 options, comme le format
-- CFA réel) — la correction se fait ENTIÈREMENT côté serveur.
CREATE OR REPLACE FUNCTION award_exercise_xp(
  p_set_id uuid,
  p_question_id uuid,
  p_selected_index integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_official      boolean;
  v_published     boolean;
  v_difficulty    integer;
  v_correct_index integer;
  v_explanation   text;
  v_is_correct    boolean;
  v_already       boolean;
  v_xp            integer := 0;
  v_xp_total      integer;
BEGIN
  SELECT is_official, official_published, difficulty
  INTO v_official, v_published, v_difficulty
  FROM exercise_sets WHERE id = p_set_id;

  SELECT correct_index, explanation INTO v_correct_index, v_explanation
  FROM exercise_questions
  WHERE id = p_question_id AND set_id = p_set_id;

  v_is_correct := (v_correct_index IS NOT NULL AND p_selected_index = v_correct_index);

  IF NOT (COALESCE(v_official, false) AND COALESCE(v_published, false)) OR NOT v_is_correct THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0,
      'xp_total', COALESCE(v_xp_total, 0),
      'is_correct', COALESCE(v_is_correct, false),
      'correct_index', v_correct_index,
      'explanation', v_explanation
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM exercise_question_progress
    WHERE user_id = auth.uid() AND question_id = p_question_id
  ) INTO v_already;

  IF v_already THEN
    SELECT xp_total INTO v_xp_total FROM profiles WHERE id = auth.uid();
    RETURN json_build_object(
      'xp_awarded', 0, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
      'correct_index', v_correct_index, 'explanation', v_explanation
    );
  END IF;

  v_xp := CASE COALESCE(v_difficulty, 1)
    WHEN 2 THEN 15
    WHEN 3 THEN 20
    ELSE 10
  END;

  INSERT INTO exercise_question_progress (user_id, question_id)
  VALUES (auth.uid(), p_question_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO xp_events (user_id, xp, source, meta)
  VALUES (
    auth.uid(), v_xp, 'exercise_question',
    jsonb_build_object('set_id', p_set_id, 'question_id', p_question_id)
  );

  UPDATE profiles
  SET xp_total = xp_total + v_xp
  WHERE id = auth.uid()
  RETURNING xp_total INTO v_xp_total;

  RETURN json_build_object(
    'xp_awarded', v_xp, 'xp_total', COALESCE(v_xp_total, 0), 'is_correct', true,
    'correct_index', v_correct_index, 'explanation', v_explanation
  );
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

-- Le bloc ci-dessous (practice_sessions, cfa_topics, share_token,
-- profiles.exam_date) vient de migration_features.sql, déjà appliqué en
-- prod — copié ici tel quel pour que ce fichier de référence reflète
-- fidèlement la base réelle (il en manquait avant ce commit).

CREATE TABLE IF NOT EXISTS practice_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  set_id        uuid        NOT NULL,
  set_title     text        NOT NULL,
  mode          text        CHECK (mode IN ('qcm','flashcards')) NOT NULL,
  correct       int         NOT NULL DEFAULT 0,
  total         int         NOT NULL DEFAULT 0,
  duration_seconds int,
  occurred_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_sessions_own" ON practice_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS practice_sessions_user_occurred
  ON practice_sessions(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS cfa_topics (
  id       smallint  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code     text      UNIQUE NOT NULL,
  name_fr  text      NOT NULL,
  name_en  text      NOT NULL
);

INSERT INTO cfa_topics (code, name_fr, name_en) VALUES
  ('ethics',      'Éthique et standards professionnels',  'Ethics & Professional Standards'),
  ('quant',       'Méthodes quantitatives',               'Quantitative Methods'),
  ('economics',   'Économie',                             'Economics'),
  ('fra',         'Analyse des états financiers',         'Financial Reporting & Analysis'),
  ('corporate',   'Finance d''entreprise',                'Corporate Finance'),
  ('equity',      'Actions',                              'Equity Investments'),
  ('derivatives', 'Produits dérivés',                     'Derivatives'),
  ('fixed',       'Titres à revenu fixe',                 'Fixed Income'),
  ('alts',        'Investissements alternatifs',          'Alternative Investments'),
  ('portfolio',   'Gestion de portefeuille',              'Portfolio Management')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS topic_id smallint REFERENCES cfa_topics(id);
ALTER TABLE flashcards     ADD COLUMN IF NOT EXISTS topic_id smallint REFERENCES cfa_topics(id);

ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE quiz_sets      ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid() UNIQUE;
UPDATE flashcard_sets SET share_token = gen_random_uuid() WHERE share_token IS NULL;
UPDATE quiz_sets      SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Fonctions SECURITY DEFINER pour les routes /share/* (bypasse le RLS)
CREATE OR REPLACE FUNCTION get_flashcard_set_by_token(p_token uuid)
RETURNS SETOF flashcard_sets
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT * FROM flashcard_sets WHERE share_token = p_token;
$$;

CREATE OR REPLACE FUNCTION get_flashcards_by_share_token(p_token uuid)
RETURNS SETOF flashcards
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT f.* FROM flashcards f
  JOIN flashcard_sets fs ON fs.id = f.set_id
  WHERE fs.share_token = p_token
  ORDER BY f.position;
$$;

CREATE OR REPLACE FUNCTION get_quiz_set_by_token(p_token uuid)
RETURNS SETOF quiz_sets
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT * FROM quiz_sets WHERE share_token = p_token;
$$;

CREATE OR REPLACE FUNCTION get_quiz_questions_by_share_token(p_token uuid)
RETURNS SETOF quiz_questions
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT q.* FROM quiz_questions q
  JOIN quiz_sets qs ON qs.id = q.set_id
  WHERE qs.share_token = p_token
  ORDER BY q.position;
$$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exam_date date;

-- Le bloc ci-dessous (mock_exams et tables associées) vient de
-- migration_mock_exams.sql, déjà appliqué en prod — copié ici tel quel,
-- même raison que le bloc practice_sessions/cfa_topics ci-dessus.

CREATE TABLE IF NOT EXISTS mock_exams (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  description      text,
  scheduled_at     timestamptz NOT NULL,
  duration_minutes int         NOT NULL DEFAULT 180,
  question_count   int         NOT NULL DEFAULT 60,
  -- Fenêtre de passage = ±window_days autour de scheduled_at (configurable
  -- par examen, voir migration_mock_exam_window_days.sql).
  window_days      int         NOT NULL DEFAULT 3,
  -- draft = pas encore publié, open = inscriptions ouvertes, closed = terminé
  status           text        CHECK (status IN ('draft','open','closed')) NOT NULL DEFAULT 'draft',
  created_by       uuid        REFERENCES profiles(id) NOT NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mock_exam_questions (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     uuid    REFERENCES mock_exams(id) ON DELETE CASCADE NOT NULL,
  question_id uuid    REFERENCES quiz_questions(id) ON DELETE CASCADE NOT NULL,
  position    int     NOT NULL,
  UNIQUE(exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS mock_exam_registrations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       uuid        REFERENCES mock_exams(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  registered_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, user_id)
);

CREATE TABLE IF NOT EXISTS mock_exam_results (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          uuid        REFERENCES mock_exams(id) ON DELETE CASCADE NOT NULL,
  user_id          uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score            int         NOT NULL,
  total            int         NOT NULL,
  duration_seconds int,
  -- Réponses données par l'utilisateur ([{"question_id","selected_index"}, ...])
  -- pour reconstruire la correction à la demande, pas seulement juste après
  -- la soumission. Voir submit_mock_exam / get_mock_exam_review.
  answers          jsonb,
  completed_at     timestamptz DEFAULT now(),
  UNIQUE(exam_id, user_id)
);

ALTER TABLE mock_exams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mock_exams_read" ON mock_exams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mock_exams_admin_write" ON mock_exams
  FOR ALL TO authenticated
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

-- SECURITY DEFINER pour casser la récursion RLS : une policy SELECT sur
-- mock_exam_registrations qui se référence elle-même dans une sous-requête
-- déclenche un cycle ("infinite recursion detected in policy for relation
-- mock_exam_registrations") — même classe de bug déjà rencontrée pour
-- flashcard_sets/quiz_sets. Cette fonction bypass la RLS en interne, donc
-- plus de cycle, et sert aussi aux policies d'autres tables qui ont besoin
-- de vérifier une inscription (mock_exam_questions, mock_exam_results).
CREATE OR REPLACE FUNCTION public.user_registered_for_mock_exam(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "mock_exam_questions_read" ON mock_exam_questions
  FOR SELECT TO authenticated
  USING (is_app_admin() OR user_registered_for_mock_exam(exam_id));

CREATE POLICY "mock_exam_questions_admin_write" ON mock_exam_questions
  FOR ALL TO authenticated
  USING (is_app_admin())
  WITH CHECK (is_app_admin());

CREATE POLICY "mock_exam_registrations_own" ON mock_exam_registrations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mock_exam_registrations_read_inscrit" ON mock_exam_registrations
  FOR SELECT TO authenticated
  USING (user_registered_for_mock_exam(exam_id));

CREATE POLICY "mock_exam_results_own_write" ON mock_exam_results
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mock_exam_results_read_inscrit" ON mock_exam_results
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_registered_for_mock_exam(exam_id));

-- Tirage pondéré par topic (poids officiels du curriculum CFA Level I,
-- milieu de chaque fourchette) au lieu d'un tirage uniforme — sinon les
-- gros topics (FSA, Equity, Fixed Income) seraient sur-représentés par
-- rapport aux petits (Alt Investments, Corporate). Voir
-- migration_mock_exam_weighted_selection.sql pour le détail.
CREATE OR REPLACE FUNCTION publish_mock_exam(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT question_count INTO v_count FROM mock_exams WHERE id = p_exam_id;

  DELETE FROM mock_exam_questions WHERE exam_id = p_exam_id;

  INSERT INTO mock_exam_questions (exam_id, question_id, position)
  WITH weights(folder_name, weight) AS (
    VALUES
      ('Éthique et Standards Professionnels (Système)', 17.5),
      ('Méthodes Quantitatives (Système)', 7.5),
      ('Économie (Système)', 7.5),
      ('Analyse des États Financiers (Système)', 12.5),
      ('Finance d''Entreprise (Système)', 7.5),
      ('Investissements en Actions (Système)', 12.5),
      ('Fixed Income (Système)', 12.5),
      ('Instruments Dérivés (Système)', 6.5),
      ('Investissements Alternatifs (Système)', 8.5),
      ('Gestion de Portefeuille (Système)', 10.0)
  ),
  total_weight AS (
    SELECT sum(weight) AS tw FROM weights
  ),
  raw_alloc AS (
    SELECT
      w.folder_name,
      floor(w.weight / tw.tw * v_count)::int AS base_count,
      (w.weight / tw.tw * v_count) - floor(w.weight / tw.tw * v_count) AS remainder
    FROM weights w, total_weight tw
  ),
  leftover AS (
    SELECT greatest(v_count - (SELECT coalesce(sum(base_count), 0) FROM raw_alloc), 0) AS n
  ),
  ranked AS (
    SELECT folder_name, base_count, row_number() OVER (ORDER BY remainder DESC) AS rn
    FROM raw_alloc
  ),
  final_alloc AS (
    SELECT
      folder_name,
      base_count + CASE WHEN rn <= (SELECT n FROM leftover) THEN 1 ELSE 0 END AS alloc
    FROM ranked
  ),
  picked AS (
    SELECT
      qq.id AS question_id,
      fa.folder_name,
      row_number() OVER (PARTITION BY fa.folder_name ORDER BY random()) AS rn
    FROM final_alloc fa
    JOIN library_folders lf ON lf.name = fa.folder_name AND lf.kind = 'quizzes'
    JOIN quiz_sets qs ON qs.folder_id = lf.id AND qs.is_official = true AND qs.official_published = true
    JOIN quiz_questions qq ON qq.set_id = qs.id
  ),
  selected AS (
    SELECT p.question_id
    FROM picked p
    JOIN final_alloc fa ON fa.folder_name = p.folder_name
    WHERE p.rn <= fa.alloc
  )
  SELECT p_exam_id, question_id, row_number() OVER (ORDER BY random()) - 1
  FROM selected;

  UPDATE mock_exams SET status = 'open' WHERE id = p_exam_id;
END;
$$;

CREATE OR REPLACE FUNCTION close_mock_exam(p_exam_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE mock_exams SET status = 'closed' WHERE id = p_exam_id;
END;
$$;

-- Correction ENTIÈREMENT côté serveur (mêmes principes que
-- award_quiz_question_xp) : le client n'a jamais accès à correct_index avant
-- d'avoir soumis ses réponses.
CREATE OR REPLACE FUNCTION submit_mock_exam(p_exam_id uuid, p_answers jsonb, p_duration_seconds int)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_registered  boolean;
  v_status      text;
  v_score       int := 0;
  v_total       int := 0;
  v_review      json;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = auth.uid()
  ) INTO v_registered;

  IF NOT v_registered THEN
    RAISE EXCEPTION 'Not registered for this exam';
  END IF;

  SELECT status INTO v_status FROM mock_exams WHERE id = p_exam_id;
  IF v_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Exam is not open';
  END IF;

  IF EXISTS(SELECT 1 FROM mock_exam_results WHERE exam_id = p_exam_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Already submitted';
  END IF;

  WITH given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(p_answers) AS elem
  ),
  scored AS (
    SELECT
      meq.position,
      qq.id AS question_id,
      qq.prompt,
      qq.choices,
      qq.correct_index,
      qq.explanation,
      g.selected_index,
      (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index) AS is_correct
    FROM mock_exam_questions meq
    JOIN quiz_questions qq ON qq.id = meq.question_id
    LEFT JOIN given g ON g.question_id = qq.id
    WHERE meq.exam_id = p_exam_id
    ORDER BY meq.position
  )
  SELECT
    count(*) FILTER (WHERE is_correct),
    count(*),
    json_agg(json_build_object(
      'question_id', question_id,
      'prompt', prompt,
      'choices', choices,
      'correct_index', correct_index,
      'explanation', explanation,
      'selected_index', selected_index,
      'is_correct', is_correct
    ) ORDER BY position)
  INTO v_score, v_total, v_review
  FROM scored;

  INSERT INTO mock_exam_results (exam_id, user_id, score, total, duration_seconds, answers)
  VALUES (p_exam_id, auth.uid(), v_score, v_total, p_duration_seconds, p_answers);

  RETURN json_build_object('score', v_score, 'total', v_total, 'review', v_review);
END;
$$;

-- Reconstruit la correction pour un utilisateur ayant déjà rendu sa copie
-- (revisite la page plus tard) — même forme que submit_mock_exam, mais ne
-- fait rien tant qu'aucun résultat n'existe déjà pour cet utilisateur.
CREATE OR REPLACE FUNCTION get_mock_exam_review(p_exam_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_answers jsonb;
  v_review  json;
BEGIN
  SELECT answers INTO v_answers
  FROM mock_exam_results
  WHERE exam_id = p_exam_id AND user_id = auth.uid();

  IF v_answers IS NULL THEN
    RAISE EXCEPTION 'No submitted result for this exam';
  END IF;

  WITH given AS (
    SELECT
      (elem->>'question_id')::uuid AS question_id,
      NULLIF(elem->>'selected_index', '')::int AS selected_index
    FROM jsonb_array_elements(v_answers) AS elem
  )
  SELECT json_agg(json_build_object(
    'question_id', qq.id,
    'prompt', qq.prompt,
    'choices', qq.choices,
    'correct_index', qq.correct_index,
    'explanation', qq.explanation,
    'selected_index', g.selected_index,
    'is_correct', (g.selected_index IS NOT NULL AND g.selected_index = qq.correct_index)
  ) ORDER BY meq.position)
  INTO v_review
  FROM mock_exam_questions meq
  JOIN quiz_questions qq ON qq.id = meq.question_id
  LEFT JOIN given g ON g.question_id = qq.id
  WHERE meq.exam_id = p_exam_id;

  RETURN v_review;
END;
$$;

CREATE INDEX IF NOT EXISTS mock_exams_scheduled_at ON mock_exams(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS mock_exam_registrations_exam ON mock_exam_registrations(exam_id);
CREATE INDEX IF NOT EXISTS mock_exam_results_exam ON mock_exam_results(exam_id, score DESC);


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
