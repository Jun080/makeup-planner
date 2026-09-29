-- Migration : notifications push (résumé du matin + rappel du soir).
-- À exécuter UNE fois dans Supabase > SQL Editor.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
drop policy if exists "own rows" on public.push_subscriptions;
create policy "own rows" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
