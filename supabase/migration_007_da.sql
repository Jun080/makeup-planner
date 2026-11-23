-- Migration : nouvelle DA « Dream journal » (numéro de rêve, accroche, question).
-- À exécuter UNE fois dans Supabase > SQL Editor.

alter table public.makeups add column if not exists dream_no   integer;                    -- « Rêve n°XX » sur la couverture
alter table public.makeups add column if not exists hook       text;                       -- accroche écrite à l'écran (1re seconde)
alter table public.makeups add column if not exists question   text;                       -- question en tête de description
