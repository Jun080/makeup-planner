-- Décembre 2026 : calendrier de l'avent wet liner Glisten (24 cases, 2 cases par look, un tuto tous les 2 jours).
-- À coller dans Supabase > SQL Editor > Run, UNE seule fois,
-- APRÈS migration_007_da.sql et migration_008_deadline.sql.
--
-- Crée (sans spoiler : la case N n'est jamais postée avant le N décembre) :
--   · mar. 1 déc.   : teaser du contenu du mois (calendrier encore fermé), vidéo
--   · 2 → 24 déc.   : 12 tutos « cases 1 & 2 » le 2, « cases 3 & 4 » le 4 … « cases 23 & 24 » le 24, tournés la veille
--   · dim. 27 déc.  : carrousel « tu préfères lequel ? » avec les 12 looks (sert aussi de récap du mois)
-- Tout est « À faire », à poster avant le 24 déc. Les contenus sont rattachés au premier (et seul) compte.

do $$
declare
  uid       uuid := (select id from auth.users order by created_at limit 1);
  serie     text := 'Calendrier wet liner Glisten';
  first_day date := '2026-12-02'; -- 1er tuto (cases 1 & 2)
  m_id      uuid;
  recap_id  uuid;
  ids       uuid[] := '{}';
  post_day  date;
  cases     text;
  i         int;
begin
  if uid is null then
    raise exception 'Aucun utilisateur trouvé';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'makeups' and column_name = 'deadline') then
    raise exception 'Lance d''abord migration_007_da.sql et migration_008_deadline.sql';
  end if;
  if exists (select 1 from public.makeups where user_id = uid and title like serie || ' ·%') then
    raise exception 'Le calendrier Glisten est déjà dans le planning : rien n''a été ajouté';
  end if;

  -- Teaser : la veille du premier tuto
  insert into public.makeups (user_id, title, category, date, hook, question, notes, deadline)
  values (uid, serie || ' · teaser', 'unboxing', first_day - 2,
          'Je l’ouvre avec vous à partir de demain 🎁',
          'Vous pensez qu’il y a quelles couleurs dedans ?',
          'Calendrier encore fermé. Annoncer le rythme : 2 cases tous les 2 jours, sans spoiler (la case N jamais avant le N).',
          first_day - 1)
  returning id into m_id;
  insert into public.publications (user_id, makeup_id, kind, date, status)
  values (uid, m_id, 'video', first_day - 1, 'a_faire');

  -- 12 tutos : cases 1 & 2 le 2 déc., cases 3 & 4 le 4 déc., … cases 23 & 24 le 24 déc.
  for i in 0..11 loop
    post_day := first_day + i * 2;
    cases := 'cases ' || (i * 2 + 1) || ' & ' || (i * 2 + 2);
    insert into public.makeups (user_id, title, category, date, hook, question, notes, deadline)
    values (uid, serie || ' · ' || cases, 'makeup', post_day - 1,
            'Calendrier de l’avent · ' || cases || ' 🎁',
            'Tu aurais fait quoi avec ces couleurs ?',
            'Story le jour du tournage : « Demain : ' || cases || ', vous pariez sur quelles couleurs ? »',
            '2026-12-24')
    returning id into m_id;
    insert into public.publications (user_id, makeup_id, kind, date, status)
    values (uid, m_id, 'tuto', post_day, 'a_faire');
    ids := ids || m_id;
  end loop;

  -- Carrousel final avec les 12 looks
  insert into public.publications (user_id, makeup_id, kind, title, date, status)
  values (uid, null, 'recap', serie || ' · tu préfères lequel ?', '2026-12-27', 'a_faire')
  returning id into recap_id;
  insert into public.publication_makeups (publication_id, makeup_id, user_id)
  select recap_id, unnest(ids), uid;

  raise notice 'Décembre ajouté : 1 teaser, 12 tutos, 1 carrousel';
end $$;
