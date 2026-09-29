-- Migration : un makeup contient plusieurs publications (tuto / photo / vidéo).
-- À exécuter UNE fois dans Supabase > SQL Editor si tu as déjà lancé l'ancien schema.sql.
-- (Pour une installation neuve, schema.sql suffit.)

create table if not exists public.publications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  makeup_id   uuid not null references public.makeups on delete cascade,
  kind        text not null check (kind in ('tuto', 'photo', 'video')),
  date        date,
  status      text not null default 'realise'
              check (status in ('a_faire', 'realise', 'montage', 'pret', 'publie')),
  created_at  timestamptz not null default now()
);

create index if not exists publications_date_idx on public.publications (date);

alter table public.publications enable row level security;
drop policy if exists "own rows" on public.publications;
create policy "own rows" on public.publications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reprise des makeups existants : un tuto et/ou une photo à la date et l'étape du makeup
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'makeups' and column_name = 'formats') then
    insert into public.publications (user_id, makeup_id, kind, date, status)
    select user_id, id, 'tuto', date, status from public.makeups where is_tuto;
    insert into public.publications (user_id, makeup_id, kind, date, status)
    select user_id, id, 'photo', date, status from public.makeups where 'photo' = any(formats);
    insert into public.publications (user_id, makeup_id, kind, date, status)
    select user_id, id, 'video', date, status from public.makeups where 'video' = any(formats);

    alter table public.makeups drop column formats, drop column is_tuto, drop column status;
  end if;
end $$;
