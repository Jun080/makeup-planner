-- Migration : date limite de publication d'un contenu (look de Noël, calendrier de l'avent…).
-- À exécuter UNE fois dans Supabase > SQL Editor, AVANT de redéployer la fonction daily-push.

alter table public.makeups add column if not exists deadline date; -- après cette date, le contenu n'a plus de sens
