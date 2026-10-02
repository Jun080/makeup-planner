-- Migration : contenus abandonnés (makeup, swatch, unboxing ou récap).
-- À exécuter UNE fois dans Supabase > SQL Editor.
-- Un contenu abandonné n'est pas supprimé : il est masqué du planning et peut être repris.

alter table public.makeups add column if not exists abandoned_at timestamptz;
alter table public.publications add column if not exists abandoned_at timestamptz; -- utilisé pour les récaps
