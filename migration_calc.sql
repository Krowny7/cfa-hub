-- Exercices de calcul pur (/calculs) : le journal des réponses.
--
-- Une ligne par réponse donnée dans un round (5 questions d'un niveau d'un
-- type de calcul). Le contenu (énoncés, réponses, corrections) vit dans le
-- code (lib/calc/<matière>.ts) : question_id est l'identifiant texte stable
-- de la question, pas une clé étrangère. La correction est faite côté
-- serveur (action serveur), qui écrit ici avec la session du joueur.
--
-- Avant cette migration, le site garde les réponses dans le navigateur
-- (localStorage) ; après, il les importe ici à la première visite.
--
-- Idempotente : peut être rejouée sans effet.

create table if not exists public.calc_attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  topic       text        not null,
  type_key    text        not null,
  question_id text        not null,
  level       text        not null check (level in ('facile', 'moyen', 'difficile')),
  value       double precision,
  correct     boolean     not null,
  answered_at timestamptz not null default now()
);

create index if not exists calc_attempts_user_type_idx
  on public.calc_attempts (user_id, topic, type_key, level, answered_at desc);

alter table public.calc_attempts enable row level security;

-- Chacun ses lignes.
drop policy if exists calc_attempts_select_own on public.calc_attempts;
create policy calc_attempts_select_own on public.calc_attempts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists calc_attempts_insert_own on public.calc_attempts;
create policy calc_attempts_insert_own on public.calc_attempts
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists calc_attempts_delete_own on public.calc_attempts;
create policy calc_attempts_delete_own on public.calc_attempts
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.calc_attempts from anon;
grant select, insert, delete on public.calc_attempts to authenticated;

-- Résumé par matière, type et niveau, pour les listes : toutes les réponses,
-- les 10 dernières (précision récente) et les 5 dernières (niveau « tenu »
-- à partir de 4 justes sur 5). p_topic null : toutes les matières.
-- SECURITY INVOKER : la RLS ne laisse voir que ses propres lignes.
create or replace function public.calc_progress(p_topic text default null)
returns table (
  topic text,
  type_key text,
  level text,
  n integer,
  ok integer,
  n_recent integer,
  ok_recent integer,
  n_last5 integer,
  ok_last5 integer,
  last_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (
    select a.topic as t, a.type_key as k, a.level as l, a.correct as c, a.answered_at as at,
           row_number() over (partition by a.topic, a.type_key, a.level order by a.answered_at desc, a.id desc) as rn
    from public.calc_attempts a
    where a.user_id = auth.uid()
      and (p_topic is null or a.topic = p_topic)
  )
  select r.t, r.k, r.l,
         count(*)::integer,
         (count(*) filter (where r.c))::integer,
         (count(*) filter (where r.rn <= 10))::integer,
         (count(*) filter (where r.rn <= 10 and r.c))::integer,
         (count(*) filter (where r.rn <= 5))::integer,
         (count(*) filter (where r.rn <= 5 and r.c))::integer,
         max(r.at)
  from r
  group by r.t, r.k, r.l
$$;

-- Historique d'un niveau d'un type, question par question, pour le tirage
-- des rounds (jamais vues, puis ratées, puis les plus anciennes).
create or replace function public.calc_history(p_topic text, p_type text, p_level text)
returns table (question_id text, seen integer, last_correct boolean, last_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (a.question_id)
         a.question_id,
         (count(*) over (partition by a.question_id))::integer,
         a.correct,
         a.answered_at
  from public.calc_attempts a
  where a.user_id = auth.uid()
    and a.topic = p_topic
    and a.type_key = p_type
    and a.level = p_level
  order by a.question_id, a.answered_at desc, a.id desc
$$;

revoke all on function public.calc_progress(text) from public, anon;
revoke all on function public.calc_history(text, text, text) from public, anon;
grant execute on function public.calc_progress(text) to authenticated;
grant execute on function public.calc_history(text, text, text) to authenticated;
