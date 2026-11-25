-- Décembre 2026 : calendrier de l'avent wet liner Glisten, 1 case par jour.
-- À coller dans Supabase > SQL Editor > Run, UNE seule fois,
-- APRÈS migration_007_da.sql et migration_008_deadline.sql.
-- Si l'ancienne version (2 cases tous les 2 jours) est déjà dans le planning et que rien n'a commencé,
-- elle est remplacée.
--
-- Tous les matins : ouvrir la case du jour, makeup avec ce liner, photo + clip 3-5 s du résultat, story.
-- Une case n'est jamais postée avant son jour.
--   · Mardi (télétravail), samedi, dimanche : look travaillé, filmé en tuto
--   · Lundi, mercredi, vendredi (sport le soir) : look rapide, et le post du jour est programmé à l'avance
--   · Jeudi soir : montage des looks express du vendredi
--
-- Posts :
--   · 26, 28, 30 nov.  : les tutos des makeups du 23, 24 et 25 nov.
--   · mar. 1 déc.      : vidéo « Jour 1 » (ouverture de la case 1 + résultat)
--   · tutos            : case 1 le 2, 5 le 5, 6 le 7, 8 le 9, 12 le 12, 13 le 14, 15 le 16, 19 le 19, 20 le 21, 22 le 23
--   · carrousels       : cases 1-6 le dim. 6, 7-13 le dim. 13, 14-20 le dim. 20
--   · looks express    : cases 7, 9, 10 le ven. 11 ; 14, 16, 17 le ven. 18
--   · dim. 27 déc.     : le final « 24 cases, 24 looks », assemblage des clips du matin

do $$
declare
  uid       uuid := (select id from auth.users order by created_at limit 1);
  serie     text := 'Calendrier wet liner Glisten';
  tutos     int[] := array[1, 5, 6, 8, 12, 13, 15, 19, 20, 22];
  post_days int[] := array[2, 5, 7, 9, 12, 14, 16, 19, 21, 23];
  questions text[] := array[
    'Tu aurais fait quoi avec cette couleur ?',
    'Tu le porterais, toi ?',
    'Tu la gardes ou tu la donnes ?',
    'Note ce look sur 10'];
  ids       uuid[] := '{}';
  m_id      uuid;
  r_id      uuid;
  n         int;
  k         int;
  day       date;
  wd        int;
  note      text;
  recap     record;
  n_found   int;
  started   int;
begin
  if uid is null then
    raise exception 'Aucun utilisateur trouvé';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'makeups' and column_name = 'deadline') then
    raise exception 'Lance d''abord migration_007_da.sql et migration_008_deadline.sql';
  end if;

  -- Ancienne version : remplacée seulement si rien n'a été commencé
  if exists (select 1 from public.makeups where user_id = uid and title like serie || ' ·%')
     or exists (select 1 from public.publications where user_id = uid and kind = 'recap' and title like serie || '%') then
    select count(*) into started
    from public.publications p
    left join public.makeups m on m.id = p.makeup_id
    where p.user_id = uid and p.status <> 'a_faire'
      and (m.title like serie || ' ·%' or (p.kind = 'recap' and p.title like serie || '%'));
    if started > 0 or exists (select 1 from public.makeups where user_id = uid and title like serie || ' ·%' and photo_path is not null) then
      raise exception 'Le calendrier Glisten a déjà commencé (une étape avancée ou une photo) : rien n''a été changé';
    end if;
    delete from public.publications where user_id = uid and kind = 'recap' and title like serie || '%';
    delete from public.makeups where user_id = uid and title like serie || ' ·%';
    raise notice 'Ancienne version du calendrier remplacée';
  end if;

  -- Fin novembre : les tutos des makeups du 23, 24 et 25 postés le 26, le 28 et le 30
  for k in 0..2 loop
    select count(*) into n_found
    from public.publications p join public.makeups m on m.id = p.makeup_id
    where m.user_id = uid and m.date = date '2026-11-23' + k and m.abandoned_at is null
      and p.kind = 'tuto' and p.status <> 'publie';
    if n_found = 1 then
      update public.publications set date = date '2026-11-26' + k * 2
      where id = (select p.id from public.publications p join public.makeups m on m.id = p.makeup_id
                  where m.user_id = uid and m.date = date '2026-11-23' + k and m.abandoned_at is null
                    and p.kind = 'tuto' and p.status <> 'publie');
    else
      raise notice 'Makeup du % : % tuto(s) non publié(s), date à changer à la main (→ %)',
        date '2026-11-23' + k, n_found, date '2026-11-26' + k * 2;
    end if;
  end loop;

  -- Les 24 cases
  for n in 1..24 loop
    day := date '2026-11-30' + n;
    wd := extract(isodow from day); -- 1 = lundi
    k := array_position(tutos, n);

    if k is not null then
      note := 'Look travaillé, filmé en tuto : ouvre la case face caméra. ';
      note := note || case
        when n = 1 then 'Filme aussi l’ouverture seule : la vidéo « Jour 1 » (ouverture + résultat, 15 s) se monte à midi et sort ce soir. Le tuto se monte ce soir, programmé pour demain. '
        when wd = 2 then 'Montage ce soir, post programmé pour demain. '
        when wd = 6 then 'Montage dans la journée, post ce soir. '
        else 'Montage l’après-midi, post programmé pour lundi. '
      end;
    else
      note := 'Look rapide : pas de tuto. ';
      if n in (7, 9, 10, 14, 16, 17) then
        note := note || 'Le clip sert aussi aux looks express du vendredi. ';
      end if;
      if n in (10, 17) then
        note := note || 'Ce soir : montage des looks express (cases ' || (n - 3) || ', ' || (n - 1) || ', ' || n || '), post programmé pour demain. ';
      end if;
      if n = 24 then
        note := note || 'Dernière case ! Story : « C’était la dernière case », le final sort le 27. ';
      end if;
    end if;
    note := note || 'Comme chaque matin : photo + clip 3-5 s du résultat, puis story.';

    insert into public.makeups (user_id, title, category, date, hook, question, notes, deadline)
    values (uid, serie || ' · case ' || n, 'makeup', day,
            case when k is not null then 'Calendrier de l’avent wet liner · case ' || n || ' 🎁' end,
            case when k is not null then questions[(k - 1) % 4 + 1] end,
            note,
            case when k is not null then date '2026-12-24' end)
    returning id into m_id;
    ids := ids || m_id;

    if n = 1 then
      insert into public.publications (user_id, makeup_id, kind, date, status)
      values (uid, m_id, 'video', date '2026-12-01', 'a_faire');
    end if;
    if k is not null then
      insert into public.publications (user_id, makeup_id, kind, date, status)
      values (uid, m_id, 'tuto', date '2026-11-30' + post_days[k], 'a_faire');
    end if;
  end loop;

  -- Carrousels du dimanche, looks express du vendredi et le final
  for recap in
    select * from (values
      ('carrousel cases 1 à 6 · tu préfères lequel ?',                     date '2026-12-06', array[1, 2, 3, 4, 5, 6]),
      ('looks express (assemblage) · cases 7, 9, 10',                       date '2026-12-11', array[7, 9, 10]),
      ('carrousel cases 7 à 13 · tu préfères lequel ?',                    date '2026-12-13', array[7, 8, 9, 10, 11, 12, 13]),
      ('looks express (assemblage) · cases 14, 16, 17',                     date '2026-12-18', array[14, 16, 17]),
      ('carrousel cases 14 à 20 · tu préfères lequel ?',                   date '2026-12-20', array[14, 15, 16, 17, 18, 19, 20]),
      ('le final : 24 cases, 24 looks (assemblage) · tu préfères lequel ?', date '2026-12-27', array(select generate_series(1, 24)))
    ) as t(title, day, cases)
  loop
    insert into public.publications (user_id, makeup_id, kind, title, date, status)
    values (uid, null, 'recap', serie || ' · ' || recap.title, recap.day, 'a_faire')
    returning id into r_id;
    insert into public.publication_makeups (publication_id, makeup_id, user_id)
    select r_id, ids[c], uid from unnest(recap.cases) as c;
  end loop;

  raise notice 'Décembre ajouté : 24 cases, 1 vidéo Jour 1, 10 tutos, 3 carrousels, 2 looks express, 1 final';
end $$;
