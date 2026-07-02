-- ============================================================
-- MIGRATION : Examens blancs
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

create table if not exists mock_exams (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  description      text,
  scheduled_at     timestamptz not null,
  duration_minutes int         not null default 180,
  question_count   int         not null default 60,
  -- draft = pas encore publié, open = inscriptions ouvertes, closed = terminé
  status           text        check (status in ('draft','open','closed')) not null default 'draft',
  created_by       uuid        references profiles(id) not null,
  created_at       timestamptz default now()
);

-- Questions sélectionnées aléatoirement à la publication
create table if not exists mock_exam_questions (
  id          uuid    primary key default gen_random_uuid(),
  exam_id     uuid    references mock_exams(id) on delete cascade not null,
  question_id uuid    references quiz_questions(id) on delete cascade not null,
  position    int     not null,
  unique(exam_id, question_id)
);

create table if not exists mock_exam_registrations (
  id            uuid        primary key default gen_random_uuid(),
  exam_id       uuid        references mock_exams(id) on delete cascade not null,
  user_id       uuid        references profiles(id) on delete cascade not null,
  registered_at timestamptz default now(),
  unique(exam_id, user_id)
);

create table if not exists mock_exam_results (
  id               uuid        primary key default gen_random_uuid(),
  exam_id          uuid        references mock_exams(id) on delete cascade not null,
  user_id          uuid        references profiles(id) on delete cascade not null,
  score            int         not null,
  total            int         not null,
  duration_seconds int,
  completed_at     timestamptz default now(),
  unique(exam_id, user_id)
);

-- ── RLS ──────────────────────────────────────────────────────

alter table mock_exams              enable row level security;
alter table mock_exam_questions     enable row level security;
alter table mock_exam_registrations enable row level security;
alter table mock_exam_results       enable row level security;

-- mock_exams : lecture pour tous les authentifiés, écriture pour les admins
create policy "mock_exams_read" on mock_exams
  for select to authenticated using (true);

create policy "mock_exams_admin_write" on mock_exams
  for all to authenticated
  using (is_app_admin())
  with check (is_app_admin());

-- mock_exam_questions : lisibles par les inscrits (et admins)
create policy "mock_exam_questions_read" on mock_exam_questions
  for select to authenticated
  using (
    is_app_admin()
    or exists (
      select 1 from mock_exam_registrations r
      where r.exam_id = mock_exam_questions.exam_id
        and r.user_id = auth.uid()
    )
  );

create policy "mock_exam_questions_admin_write" on mock_exam_questions
  for all to authenticated
  using (is_app_admin())
  with check (is_app_admin());

-- mock_exam_registrations : chacun gère les siennes, lecture pour les inscrits
create policy "mock_exam_registrations_own" on mock_exam_registrations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "mock_exam_registrations_read_inscrit" on mock_exam_registrations
  for select to authenticated
  using (
    exists (
      select 1 from mock_exam_registrations r2
      where r2.exam_id = mock_exam_registrations.exam_id
        and r2.user_id = auth.uid()
    )
  );

-- mock_exam_results : écriture par soi-même, lecture par les inscrits du même examen
create policy "mock_exam_results_own_write" on mock_exam_results
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "mock_exam_results_read_inscrit" on mock_exam_results
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from mock_exam_registrations r
      where r.exam_id = mock_exam_results.exam_id
        and r.user_id = auth.uid()
    )
  );

-- ── RPC : publier un examen (tire les questions aléatoirement) ──

create or replace function publish_mock_exam(p_exam_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_count int;
begin
  -- Vérification admin
  if not is_app_admin() then
    raise exception 'Not authorized';
  end if;

  -- Récupère le nb de questions souhaité
  select question_count into v_count from mock_exams where id = p_exam_id;

  -- Supprime les questions existantes (re-publication)
  delete from mock_exam_questions where exam_id = p_exam_id;

  -- Tire aléatoirement depuis les QCMs officiels publiés
  insert into mock_exam_questions (exam_id, question_id, position)
  select
    p_exam_id,
    qq.id,
    row_number() over (order by random()) - 1
  from quiz_questions qq
  join quiz_sets qs on qs.id = qq.set_id
  where qs.is_official = true
    and qs.official_published = true
  order by random()
  limit v_count;

  -- Passe le statut à "open"
  update mock_exams set status = 'open' where id = p_exam_id;
end;
$$;

create or replace function close_mock_exam(p_exam_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_app_admin() then
    raise exception 'Not authorized';
  end if;
  update mock_exams set status = 'closed' where id = p_exam_id;
end;
$$;

-- ── Index ─────────────────────────────────────────────────────

create index if not exists mock_exams_scheduled_at on mock_exams(scheduled_at desc);
create index if not exists mock_exam_registrations_exam on mock_exam_registrations(exam_id);
create index if not exists mock_exam_results_exam on mock_exam_results(exam_id, score desc);

-- ============================================================
-- FIN
-- ============================================================
