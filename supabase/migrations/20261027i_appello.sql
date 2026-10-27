-- L'appello: dell'istruttore e complessivo
--
-- Due sezioni, sul modello dell'appello del CRM Athlon:
--
--   Appello istruttore («appello»): l'istruttore vede solo i prenotati alle sue
--       lezioni, di oggi e dei prossimi giorni, e segna le presenze. Si puo'
--       segnare solo da 59 minuti prima dell'inizio fino a 59 minuti dopo la
--       fine della lezione: prima e dopo si legge e basta.
--   Appello complessivo («appello_tutte»): tutte le lezioni di un giorno, di
--       tutti, con i filtri (istruttore, lezione, categoria, sala). Solo da
--       leggere. Lo vedono gli admin e i consulenti (chi riceve le
--       opportunita', `staff.assegnabile`); a un altro si puo' dare dalle sezioni di Utenti.
--
-- Chi e' l'istruttore: l'utente del CRM e l'istruttore di PerfectGym con la
-- STESSA EMAIL (`crm.miei_istruttori`); se l'istruttore su PerfectGym non ha
-- l'email, con lo stesso nome e cognome. Non c'e' niente da collegare a mano:
-- basta creare l'utente in Utenti con l'email giusta e la sezione «Appello
-- istruttore».
--
-- Dove sta la presenza: i prenotati e le lezioni sono quelli del mirror di
-- PerfectGym; la presenza segnata nel CRM sta in `public.appello_presenze` e vale
-- piu' di quella del mirror. `inviato_pg_il` dice se e' stata mandata a
-- PerfectGym: lo fa la funzione `perfectgym-presenze`, che e' scritta ma NON
-- accesa finche' `crm.impostazioni.presenze_su_perfectgym` non diventa «si».
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- Le due sezioni nuove.
alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note check (sezioni <@ array[
  'lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori', 'abbonamenti',
  'ticket', 'curriculum', 'marketing', 'appello', 'appello_tutte']::text[]);

-- Chi sono: anche se riceve le opportunita' (serve per l'Appello complessivo).
create or replace function public.crm_io()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.id is null then null
         else jsonb_build_object('id', s.id, 'email', s.email, 'nome', s.nome, 'cognome', s.cognome, 'ruolo', s.ruolo,
                                 'sezioni', to_jsonb(s.sezioni), 'autorizzazioni', to_jsonb(s.autorizzazioni),
                                 'assegnabile', s.assegnabile) end
    from (select (crm.io()).*) s
$$;

create or replace function crm.puo_vedere(p_sezione text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select (crm.ruolo_admin(s.ruolo) and p_sezione <> all (array['marketing']))
           or p_sezione = any (s.sezioni)
           or (p_sezione = 'appello_tutte' and s.assegnabile)
      from crm.io() s
     where s.id is not null
  ), false)
$$;

-- Gli istruttori di PerfectGym che sono io: stessa email, o stesso nome se manca l'email.
create or replace function crm.miei_istruttori()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
    from perfectgym.employees e, crm.io() s
   where s.id is not null and not e.is_deleted
     and (
       (nullif(lower(trim(coalesce(e.dati ->> 'email', ''))), '') is not null and lower(trim(e.dati ->> 'email')) = s.email)
       or (nullif(trim(coalesce(e.dati ->> 'email', '')), '') is null
           and lower(trim(coalesce(e.nome, '') || ' ' || coalesce(e.cognome, ''))) = lower(trim(coalesce(s.nome, '') || ' ' || coalesce(s.cognome, ''))))
     )
$$;

-- Le presenze segnate nel CRM.
create table if not exists public.appello_presenze (
  booking_id bigint primary key,
  class_id bigint not null,
  member_id bigint,
  presente boolean not null,
  segnato_da uuid references public.staff (id),
  segnato_il timestamptz not null default now(),
  inviato_pg_il timestamptz,
  errore_pg text,
  tentativi integer not null default 0
);
alter table public.appello_presenze enable row level security;
revoke all on public.appello_presenze from public, anon, authenticated;
create index if not exists appello_presenze_da_inviare on public.appello_presenze (segnato_il) where inviato_pg_il is null;

-- Finche' non e' «si», le presenze restano nel CRM e non vanno a PerfectGym.
insert into crm.impostazioni (chiave, valore)
select 'presenze_su_perfectgym', 'no'
 where not exists (select 1 from crm.impostazioni where chiave = 'presenze_su_perfectgym');

-- La finestra in cui si segna: da 59 minuti prima dell'inizio a 59 minuti dopo la fine.
create or replace function crm.appello_finestra(p_inizio timestamptz, p_fine timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case when now() < p_inizio - interval '59 minutes' then 'presto'
              when now() > coalesce(p_fine, p_inizio + interval '1 hour') + interval '59 minutes' then 'chiuso'
              else 'aperto' end
$$;

-- Le lezioni di un periodo, ognuna coi suoi prenotati (non annullati, non in lista d'attesa).
create or replace function crm.appello_lezioni(
  p_da timestamptz, p_a timestamptz,
  p_istruttori bigint[] default null, p_istruttore bigint default null, p_lezione bigint default null,
  p_categoria bigint default null, p_sala bigint default null, p_utente boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'class_id', c.id, 'inizio', c.inizio, 'fine', c.fine,
      'lezione', t.nome, 'lezione_id', c.class_type_id,
      'categoria', k.nome, 'categoria_id', t.category_id,
      'sala', z.nome, 'sala_id', c.club_zone_id,
      'istruttore', nullif(trim(coalesce(e.nome, '') || ' ' || coalesce(e.cognome, '')), ''), 'istruttore_id', c.instructor_id,
      'posti', c.posti,
      'finestra', crm.appello_finestra(c.inizio, c.fine),
      'apre_il', c.inizio - interval '59 minutes',
      'chiude_il', coalesce(c.fine, c.inizio + interval '1 hour') + interval '59 minutes',
      'prenotati', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'booking_id', b.id, 'member_id', b.member_id, 'nome', m.nome, 'cognome', m.cognome,
                 'presente', coalesce(o.presente, b.presente, false),
                 'segnato_da', crm.nome_staff(o.segnato_da),
                 'da_inviare', o.booking_id is not null and o.inviato_pg_il is null,
                 'utente_id', case when p_utente then (select x.id from public.utenti x where x.member_id = b.member_id
                                                        order by exists (select 1 from public.lead l where l.utente_id = x.id) desc limit 1) end)
               order by m.cognome, m.nome)
          from perfectgym.class_bookings b
          left join perfectgym.members m on m.id = b.member_id
          left join public.appello_presenze o on o.booking_id = b.id
         where b.class_id = c.id and not b.is_deleted and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
      ), '[]'::jsonb)
    ) order by c.inizio, t.nome), '[]'::jsonb)
    from perfectgym.classes c
    left join perfectgym.class_types t on t.id = c.class_type_id
    left join perfectgym.class_categories k on k.id = t.category_id
    left join perfectgym.club_zones z on z.id = c.club_zone_id
    left join perfectgym.employees e on e.id = c.instructor_id
   where not c.is_deleted
     and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and c.inizio >= p_da and c.inizio < p_a
     and (p_istruttori is null or c.instructor_id = any (p_istruttori))
     and (p_istruttore is null or c.instructor_id = p_istruttore)
     and (p_lezione is null or c.class_type_id = p_lezione)
     and (p_categoria is null or t.category_id = p_categoria)
     and (p_sala is null or c.club_zone_id = p_sala)
$$;

-- L'Appello istruttore: le mie lezioni da `p_giorno` per `p_giorni` giorni (oggi e i prossimi 6, di partenza).
create or replace function public.crm_appello(p_giorno date default null, p_giorni integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  giorno date := coalesce(p_giorno, (now() at time zone 'Europe/Rome')::date);
  giorni integer := least(greatest(coalesce(p_giorni, 7), 1), 14);
  miei bigint[];
begin
  perform crm.richiedi_sezione('appello');
  miei := array(select crm.miei_istruttori());
  return jsonb_build_object(
    'giorno', giorno, 'oggi', oggi, 'giorni', giorni,
    'collegato', cardinality(miei) > 0,
    'istruttori', (select coalesce(jsonb_agg(trim(coalesce(e.nome, '') || ' ' || coalesce(e.cognome, ''))), '[]'::jsonb)
                     from perfectgym.employees e where e.id = any (miei)),
    'lezioni', case when cardinality(miei) = 0 then '[]'::jsonb
                    else crm.appello_lezioni((giorno::timestamp at time zone 'Europe/Rome'),
                                             ((giorno + giorni)::timestamp at time zone 'Europe/Rome'), miei) end);
end;
$$;

-- L'Appello complessivo: tutte le lezioni di un giorno, con i filtri.
create or replace function public.crm_appello_tutte(
  p_giorno date default null, p_istruttore bigint default null, p_lezione bigint default null,
  p_categoria bigint default null, p_sala bigint default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  giorno date := coalesce(p_giorno, (now() at time zone 'Europe/Rome')::date);
  da timestamptz;
  a timestamptz;
begin
  perform crm.richiedi_sezione('appello_tutte');
  da := (giorno::timestamp at time zone 'Europe/Rome');
  a := ((giorno + 1)::timestamp at time zone 'Europe/Rome');
  return jsonb_build_object(
    'giorno', giorno, 'oggi', oggi,
    -- Le scelte dei filtri sono quelle che ci sono nel giorno, non filtrate.
    'filtri', jsonb_build_object(
      'istruttori', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome) order by x.nome), '[]'::jsonb)
                       from (select distinct e.id, trim(coalesce(e.nome, '') || ' ' || coalesce(e.cognome, '')) as nome
                               from perfectgym.classes c join perfectgym.employees e on e.id = c.instructor_id
                              where not c.is_deleted and c.inizio >= da and c.inizio < a) x),
      'lezioni', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome) order by x.nome), '[]'::jsonb)
                    from (select distinct t.id, t.nome from perfectgym.classes c join perfectgym.class_types t on t.id = c.class_type_id
                           where not c.is_deleted and c.inizio >= da and c.inizio < a) x),
      'categorie', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome) order by x.nome), '[]'::jsonb)
                      from (select distinct k.id, k.nome from perfectgym.classes c
                              join perfectgym.class_types t on t.id = c.class_type_id
                              join perfectgym.class_categories k on k.id = t.category_id
                             where not c.is_deleted and c.inizio >= da and c.inizio < a) x),
      'sale', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome) order by x.nome), '[]'::jsonb)
                 from (select distinct z.id, z.nome from perfectgym.classes c join perfectgym.club_zones z on z.id = c.club_zone_id
                        where not c.is_deleted and c.inizio >= da and c.inizio < a) x)),
    'lezioni', crm.appello_lezioni(da, a, null, p_istruttore, p_lezione, p_categoria, p_sala, true));
end;
$$;

-- Segnare (o togliere) la presenza di alcuni prenotati: solo le proprie lezioni, solo dentro la finestra.
create or replace function public.crm_appello_segna(p_prenotazioni bigint[], p_presente boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  miei bigint[];
  ids bigint[];
  trovate integer;
  cambiate integer := 0;
  r record;
  ora_apre text;
begin
  perform crm.richiedi_sezione('appello');
  ids := array(select distinct x from unnest(coalesce(p_prenotazioni, '{}'::bigint[])) x where x is not null);
  if cardinality(ids) = 0 then raise exception 'Nessuna prenotazione selezionata'; end if;
  if cardinality(ids) > 200 then raise exception 'Al massimo 200 prenotazioni alla volta'; end if;
  miei := array(select crm.miei_istruttori());
  if cardinality(miei) = 0 then
    raise exception 'Il tuo account non è collegato a un istruttore di PerfectGym (serve la stessa email)' using errcode = '42501';
  end if;

  select count(*) into trovate from perfectgym.class_bookings b where b.id = any (ids);
  if trovate <> cardinality(ids) then raise exception 'Una prenotazione non esiste più: ricarica la pagina'; end if;

  -- Tutto o niente: se una sola non va, non se ne segna nessuna.
  for r in
    select b.id, b.class_id, b.member_id, b.is_deleted, b.annullata, b.in_attesa,
           coalesce(o.presente, b.presente, false) as attuale,
           c.inizio, c.fine, c.instructor_id, t.nome as lezione
      from perfectgym.class_bookings b
      join perfectgym.classes c on c.id = b.class_id
      left join perfectgym.class_types t on t.id = c.class_type_id
      left join public.appello_presenze o on o.booking_id = b.id
     where b.id = any (ids)
  loop
    if r.is_deleted or coalesce(r.annullata, false) or coalesce(r.in_attesa, false) then
      raise exception 'Una prenotazione non è più valida (annullata o in lista d''attesa): ricarica la pagina';
    end if;
    if r.instructor_id is null or r.instructor_id <> all (miei) then
      raise exception 'Puoi segnare solo le presenze delle tue lezioni' using errcode = '42501';
    end if;
    case crm.appello_finestra(r.inizio, r.fine)
      when 'presto' then
        raise exception 'L''appello di «%» si apre alle % (59 minuti prima dell''inizio)', r.lezione,
          to_char((r.inizio - interval '59 minutes') at time zone 'Europe/Rome', 'HH24:MI');
      when 'chiuso' then
        raise exception 'L''appello di «%» si è chiuso alle % (59 minuti dopo la fine)', r.lezione,
          to_char((coalesce(r.fine, r.inizio + interval '1 hour') + interval '59 minutes') at time zone 'Europe/Rome', 'HH24:MI');
      else null;
    end case;
  end loop;

  for r in
    select b.id, b.class_id, b.member_id, coalesce(o.presente, b.presente, false) as attuale
      from perfectgym.class_bookings b
      left join public.appello_presenze o on o.booking_id = b.id
     where b.id = any (ids)
  loop
    if r.attuale is distinct from p_presente then
      insert into public.appello_presenze (booking_id, class_id, member_id, presente, segnato_da, segnato_il)
      values (r.id, r.class_id, r.member_id, p_presente, me, now())
      on conflict (booking_id) do update
        set presente = excluded.presente, segnato_da = excluded.segnato_da, segnato_il = excluded.segnato_il,
            inviato_pg_il = null, errore_pg = null, tentativi = 0;
      cambiate := cambiate + 1;
    end if;
  end loop;
  return cambiate;
end;
$$;

revoke all on function public.crm_appello(date, integer) from public, anon;
revoke all on function public.crm_appello_tutte(date, bigint, bigint, bigint, bigint) from public, anon;
revoke all on function public.crm_appello_segna(bigint[], boolean) from public, anon;
grant execute on function public.crm_appello(date, integer) to authenticated;
grant execute on function public.crm_appello_tutte(date, bigint, bigint, bigint, bigint) to authenticated;
grant execute on function public.crm_appello_segna(bigint[], boolean) to authenticated;
