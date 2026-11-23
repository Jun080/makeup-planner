-- Migration : les « Rêves » (1 rêve = 1 thème = 1 semaine).
-- On tourne les makeups d'un rêve la semaine N et on les poste la semaine N+1.
-- À exécuter UNE fois dans Supabase > SQL Editor (après migration_007_da.sql).

create table if not exists public.dreams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  no          integer not null,          -- Rêve n°X
  theme       text,                      -- vide = thème pas encore voté
  shoot_week  date not null,             -- lundi de la semaine de tournage (posts la semaine suivante)
  created_at  timestamptz not null default now(),
  unique (user_id, no)
);

alter table public.dreams enable row level security;
drop policy if exists "own rows" on public.dreams;
create policy "own rows" on public.dreams
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Place du makeup dans la semaine du rêve : 1 tuto principal, 2 version graphique, 3 version facile, 4 à partager
alter table public.makeups add column if not exists dream_slot smallint check (dream_slot between 1 and 4);
