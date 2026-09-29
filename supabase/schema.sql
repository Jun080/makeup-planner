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
  created_at  timestamptz not null default now()
);

create index if not exists makeups_date_idx on public.makeups (date);

-- ---------- Publications (ce qui est posté à partir d'un makeup) ----------
create table if not exists public.publications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  makeup_id   uuid not null references public.makeups on delete cascade,
  kind        text not null check (kind in ('tuto', 'photo', 'video')),
  date        date,                       -- date de publication (vide = en réserve)
  status      text not null default 'realise'
              check (status in ('a_faire', 'realise', 'montage', 'pret', 'publie')),
  created_at  timestamptz not null default now()
);

create index if not exists publications_date_idx on public.publications (date);

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
alter table public.ideas           enable row level security;

drop policy if exists "own rows" on public.products;
drop policy if exists "own rows" on public.makeups;
drop policy if exists "own rows" on public.makeup_products;
drop policy if exists "own rows" on public.publications;
drop policy if exists "own rows" on public.ideas;

create policy "own rows" on public.products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.makeups
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.makeup_products
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.publications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.ideas
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
