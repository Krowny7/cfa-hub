-- La page blanche : ce que le joueur sait réciter, formule par formule.
-- Idempotent. Une ligne par joueur et par formule, écrite à la fin d'un tour.

create table if not exists public.formules_maitrise (
  user_id uuid not null references auth.users (id) on delete cascade,
  formule text not null,
  matiere text not null,
  maitrisee boolean not null,
  tours integer not null default 1,
  maj_le timestamptz not null default now(),
  primary key (user_id, formule)
);

create index if not exists formules_maitrise_matiere on public.formules_maitrise (user_id, matiere);

alter table public.formules_maitrise enable row level security;

drop policy if exists "formules_maitrise lecture" on public.formules_maitrise;
create policy "formules_maitrise lecture" on public.formules_maitrise
  for select using ((select auth.uid()) = user_id);

drop policy if exists "formules_maitrise ajout" on public.formules_maitrise;
create policy "formules_maitrise ajout" on public.formules_maitrise
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "formules_maitrise mise a jour" on public.formules_maitrise;
create policy "formules_maitrise mise a jour" on public.formules_maitrise
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.formules_maitrise to authenticated;
