-- Migration : stats des posts, publication Insta / TikTok séparée, banque de thèmes de rêves.
-- À exécuter dans Supabase > SQL Editor, après migration_009_dreams.sql (on peut la relancer sans risque),
-- puis redéployer la fonction daily-push.

-- Sur quel réseau le post est en ligne (les anciens posts restent à « false / false » = inconnu)
alter table public.publications add column if not exists on_insta  boolean not null default false;
alter table public.publications add column if not exists on_tiktok boolean not null default false;

-- Stats notées ~48 h après le post, séparées par réseau (ig_ = Instagram, tt_ = TikTok)
alter table public.publications add column if not exists ig_views   integer;
alter table public.publications add column if not exists ig_saves   integer;
alter table public.publications add column if not exists ig_shares  integer;
alter table public.publications add column if not exists ig_follows integer;  -- nouveaux abonnés
alter table public.publications add column if not exists tt_views   integer;
alter table public.publications add column if not exists tt_saves   integer;
alter table public.publications add column if not exists tt_shares  integer;
alter table public.publications add column if not exists tt_follows integer;
alter table public.publications add column if not exists stats_at   date;     -- rempli = stats notées (ou passées)
-- Première version (Insta + TikTok additionnés) : remplacée par les colonnes ci-dessus
alter table public.publications drop column if exists views;
alter table public.publications drop column if exists saves;
alter table public.publications drop column if exists shares;
alter table public.publications drop column if exists follows;

-- Banque de thèmes pour les sondages du vendredi
create table if not exists public.theme_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  used_at     date,                      -- rempli = déjà devenu un rêve
  created_at  timestamptz not null default now()
);

alter table public.theme_ideas enable row level security;
drop policy if exists "own rows" on public.theme_ideas;
create policy "own rows" on public.theme_ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
