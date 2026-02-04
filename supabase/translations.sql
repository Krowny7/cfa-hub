-- CFA Hub — Translations for official (referenced) content (EN/FR)
-- Goal: keep official QCM & exercises readable in both French and English.
--
-- Design:
-- - Base content stays in the main tables (quiz_sets, quiz_questions, exercise_sets, exercises).
-- - Optional translations are stored in a single table keyed by (content_type, content_id, lang).
-- - Read: authenticated users.
-- - Write: admins only.

create table if not exists public.content_translations (
  content_type text not null, -- 'quiz_set' | 'quiz_question' | 'exercise_set' | 'exercise'
  content_id uuid not null,
  lang text not null,         -- 'fr' | 'en'
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (content_type, content_id, lang)
);

create index if not exists content_translations_lookup_idx
  on public.content_translations (content_type, content_id, lang);

alter table public.content_translations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='content_translations' and policyname='content_translations_select'
  ) then
    create policy content_translations_select
      on public.content_translations
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='content_translations' and policyname='content_translations_admin_write'
  ) then
    create policy content_translations_admin_write
      on public.content_translations
      for all
      to authenticated
      using (public.is_app_admin())
      with check (public.is_app_admin());
  end if;
end $$;

-- Upsert helper (admin-only by policy)
create or replace function public.upsert_content_translation(
  p_content_type text,
  p_content_id uuid,
  p_lang text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_app_admin() then
    raise exception 'Admin only';
  end if;

  insert into public.content_translations (content_type, content_id, lang, payload, updated_at)
  values (p_content_type, p_content_id, p_lang, coalesce(p_payload, '{}'::jsonb), now())
  on conflict (content_type, content_id, lang)
  do update set payload = excluded.payload, updated_at = now();
end;
$$;
