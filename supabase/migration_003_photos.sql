-- Migration : photo d'un makeup.
-- À exécuter UNE fois dans Supabase > SQL Editor (après migration_002_publications.sql).
-- (Pour une installation neuve, schema.sql suffit.)

alter table public.makeups add column if not exists photo_path text;

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
