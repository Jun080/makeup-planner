-- Makeup Planner — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query, puis "Run".

-- ---------- Produits ----------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  brand       text not null,              -- marque
  product     text not null,              -- produit (palette, rouge à lèvres, ...)
  color       text,                       -- couleur
  name        text,                       -- nom
  is_pr       boolean not null default false, -- PR / offert
  created_at  timestamptz not null default now()
);

-- ---------- Makeups (le look, réalisé une fois) ----------
create table if not exists public.makeups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  category    text not null default 'makeup'
              check (category in ('makeup', 'unboxing', 'swatch', 'autre')),
  date        date not null default current_date, -- date de réalisation
  is_collab   boolean not null default false,
  collab_with text,
  notes       text,
  photo_path  text,                       -- chemin de la photo dans Storage
  abandoned_at timestamptz,               -- rempli = contenu abandonné (masqué du planning)
  dream_no    integer,                    -- Rêve n°X (voir la table dreams)
  dream_slot  smallint check (dream_slot between 1 and 4), -- makeup 1 à 4 de la semaine du rêve
  hook        text,                       -- accroche écrite à l'écran (1re seconde)
  question    text,                       -- question en tête de description
  deadline    date,                       -- à poster avant cette date (sinon ça n'a plus de sens)
  created_at  timestamptz not null default now()
);

create index if not exists makeups_date_idx on public.makeups (date);

-- ---------- Publications (ce qui est posté à partir d'un makeup, ou un récap de plusieurs makeups) ----------
create table if not exists public.publications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  makeup_id   uuid references public.makeups on delete cascade, -- vide pour un récap
  kind        text not null
              constraint publications_kind_check check (kind in ('tuto', 'photo', 'video', 'recap')),
  title       text,                       -- titre d'un récap
  abandoned_at timestamptz,               -- récap abandonné
  date        date,                       -- date de publication (vide = en réserve)
  status      text not null default 'realise'
              check (status in ('a_faire', 'realise', 'montage', 'pret', 'publie')),
  on_insta    boolean not null default false, -- en ligne sur Instagram
  on_tiktok   boolean not null default false, -- en ligne sur TikTok
  ig_views    integer,                    -- stats Instagram notées ~48 h après
  ig_saves    integer,
  ig_shares   integer,
  ig_follows  integer,                    -- nouveaux abonnés
  tt_views    integer,                    -- stats TikTok
  tt_saves    integer,
  tt_shares   integer,
  tt_follows  integer,
  stats_at    date,                       -- rempli = stats notées (ou passées)
  created_at  timestamptz not null default now()
);

create index if not exists publications_date_idx on public.publications (date);

-- ---------- Rêves : 1 rêve = 1 thème = 1 semaine (tournage semaine N, posts semaine N+1) ----------
create table if not exists public.dreams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  no          integer not null,          -- Rêve n°X
  theme       text,                      -- vide = thème pas encore voté
  shoot_week  date not null,             -- lundi de la semaine de tournage
  created_at  timestamptz not null default now(),
  unique (user_id, no)
);

-- ---------- Banque de thèmes de rêves (pour les sondages du vendredi) ----------
create table if not exists public.theme_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  used_at     date,                       -- rempli = déjà devenu un rêve
  created_at  timestamptz not null default now()
);

-- ---------- Makeups présents dans un récap ----------
create table if not exists public.publication_makeups (
  publication_id uuid not null references public.publications on delete cascade,
  makeup_id      uuid not null references public.makeups on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (publication_id, makeup_id)
);

-- ---------- Produits utilisés dans un makeup ----------
create table if not exists public.makeup_products (
  makeup_id   uuid not null references public.makeups on delete cascade,
  product_id  uuid not null references public.products on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (makeup_id, product_id)
);

-- ---------- Idées de looks ----------
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ---------- Sécurité : chaque compte ne voit que ses données ----------
alter table public.products        enable row level security;
alter table public.makeups         enable row level security;
alter table public.makeup_products enable row level security;
alter table public.publications    enable row level security;
alter table public.dreams          enable row level security;
alter table public.theme_ideas     enable row level security;
alter table public.publication_makeups enable row level security;
alter table public.ideas           enable row level security;

drop policy if exists "own rows" on public.products;
drop policy if exists "own rows" on public.makeups;
drop policy if exists "own rows" on public.makeup_products;
drop policy if exists "own rows" on public.publications;
drop policy if exists "own rows" on public.publication_makeups;
drop policy if exists "own rows" on public.ideas;
drop policy if exists "own rows" on public.dreams;
drop policy if exists "own rows" on public.theme_ideas;

create policy "own rows" on public.products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.makeups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.makeup_products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.publications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.publication_makeups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.dreams
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.theme_ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Photos des makeups (Supabase Storage, privé) ----------
insert into storage.buckets (id, name, public)
values ('makeup-photos', 'makeup-photos', false)
on conflict (id) do nothing;

-- Chaque photo est rangée dans un dossier au nom du compte : <user_id>/<fichier>.jpg
drop policy if exists "own makeup photos" on storage.objects;
create policy "own makeup photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'makeup-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'makeup-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Téléphones abonnés aux notifications ----------
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
