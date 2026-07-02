-- ============================================================
-- MIGRATION : Features A + B + E + F
-- À exécuter dans Supabase SQL Editor (une seule fois)
-- ============================================================

-- ── A : Sessions de pratique persistées en base ──────────────

create table if not exists practice_sessions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references profiles(id) on delete cascade not null,
  set_id        uuid        not null,
  set_title     text        not null,
  mode          text        check (mode in ('qcm','flashcards')) not null,
  correct       int         not null default 0,
  total         int         not null default 0,
  duration_seconds int,
  occurred_at   timestamptz default now() not null
);

alter table practice_sessions enable row level security;

create policy "practice_sessions_own" on practice_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists practice_sessions_user_occurred
  on practice_sessions(user_id, occurred_at desc);

-- ── B : Topics CFA ───────────────────────────────────────────

create table if not exists cfa_topics (
  id       smallint  primary key generated always as identity,
  code     text      unique not null,
  name_fr  text      not null,
  name_en  text      not null
);

insert into cfa_topics (code, name_fr, name_en) values
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
on conflict (code) do nothing;

alter table quiz_questions   add column if not exists topic_id smallint references cfa_topics(id);
alter table flashcards       add column if not exists topic_id smallint references cfa_topics(id);

-- ── E : Partage public par lien (share_token) ────────────────

alter table flashcard_sets add column if not exists share_token uuid default gen_random_uuid() unique;
alter table quiz_sets      add column if not exists share_token uuid default gen_random_uuid() unique;

-- Remplir les lignes existantes qui n'ont pas encore de token
update flashcard_sets set share_token = gen_random_uuid() where share_token is null;
update quiz_sets      set share_token = gen_random_uuid() where share_token is null;

-- Fonctions SECURITY DEFINER pour les routes /share/* (bypasse le RLS)
create or replace function get_flashcard_set_by_token(p_token uuid)
returns setof flashcard_sets
language sql security definer stable set search_path = public
as $$
  select * from flashcard_sets where share_token = p_token;
$$;

create or replace function get_flashcards_by_share_token(p_token uuid)
returns setof flashcards
language sql security definer stable set search_path = public
as $$
  select f.* from flashcards f
  join flashcard_sets fs on fs.id = f.set_id
  where fs.share_token = p_token
  order by f.position;
$$;

create or replace function get_quiz_set_by_token(p_token uuid)
returns setof quiz_sets
language sql security definer stable set search_path = public
as $$
  select * from quiz_sets where share_token = p_token;
$$;

create or replace function get_quiz_questions_by_share_token(p_token uuid)
returns setof quiz_questions
language sql security definer stable set search_path = public
as $$
  select q.* from quiz_questions q
  join quiz_sets qs on qs.id = q.set_id
  where qs.share_token = p_token
  order by q.position;
$$;

-- ── F : Date d'examen dans le profil ─────────────────────────

alter table profiles add column if not exists exam_date date;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
