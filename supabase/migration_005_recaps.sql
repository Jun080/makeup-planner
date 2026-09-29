-- Migration : récaps (une publication qui regroupe plusieurs makeups).
-- À exécuter UNE fois dans Supabase > SQL Editor.

-- Un récap n'appartient pas à un seul makeup : makeup_id devient facultatif, et il a son propre titre
alter table public.publications alter column makeup_id drop not null;
alter table public.publications add column if not exists title text;

alter table public.publications drop constraint if exists publications_kind_check;
alter table public.publications add constraint publications_kind_check
  check (kind in ('tuto', 'photo', 'video', 'recap'));

-- Makeups présents dans un récap
create table if not exists public.publication_makeups (
  publication_id uuid not null references public.publications on delete cascade,
  makeup_id      uuid not null references public.makeups on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (publication_id, makeup_id)
);

alter table public.publication_makeups enable row level security;
drop policy if exists "own rows" on public.publication_makeups;
create policy "own rows" on public.publication_makeups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
