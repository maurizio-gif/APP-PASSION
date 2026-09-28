-- Utenti: chi vede quali sezioni e chi puo' fare cosa; e la dashboard
-- abbonamenti che misura la durata sulle catene e segue i Guest Pass
--
-- 1. Utenti. Ogni operatore dello staff ha le sue `sezioni` (le voci del menu
--    che vede) e le sue `autorizzazioni`. Un admin vede tutto e puo' tutto.
--    La home («Da gestire») e la scheda persona le vedono tutti.
--      sezioni:        lead, prove, contratti, disdette, task, cerca, abbonamenti
--      autorizzazioni: lead_altrui      riassegnare e chiudere i lead degli
--                                       altri (prima: solo gli admin)
--                      gestione_utenti  aprire la sezione Utenti e cambiare
--                                       sezioni e autorizzazioni
--    Chi c'era prende le sezioni operative; la dashboard abbonamenti, che ha
--    i numeri dell'azienda, la vedono gli admin e chi la riceve da Utenti.
--    Nessuno cambia il proprio ruolo, si disattiva o si toglie la gestione
--    utenti da solo; il ruolo admin lo da' e lo toglie solo un admin.
--
-- 2. La durata degli abbonamenti si misura sulla catena, non sul singolo
--    contratto: abbonamenti della stessa persona uno dopo l'altro, senza piu'
--    di 30 giorni di vuoto, sono una sola permanenza. Un mensile che diventa
--    quadrimestrale, un quadrimestrale che diventa annuale, un annuale che
--    passa a un altro piano da 12 mesi: la persona e' rimasta, e la durata
--    corre dal primo giorno del primo abbonamento all'ultimo giorno dell'ultimo. Il
--    tipo (mensile, quadrimestrale, annuale) e' quello con cui e' entrata, e
--    il vincolo da superare e' il suo.
--
-- 3. Guest Pass: i piani che si chiamano «Guest Pass» (7 e 10 giorni, Open,
--    Reformer, Crossfit, Personal Training). Per mese di fine: quanti ne sono
--    finiti e quanti sono diventati un abbonamento a pagamento, durante il
--    pass o entro 30 giorni dalla fine. Non contano i pass di chi era gia'
--    abbonato. I «Pass» giornalieri (Pass Reformer, Pass Sala Pesi...) sono
--    un'altra cosa e restano fuori.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- 1. Utenti
-- ---------------------------------------------------------------------------

alter table public.staff add column if not exists sezioni text[] not null
  default array['lead', 'prove', 'contratti', 'disdette', 'task', 'cerca'];
alter table public.staff add column if not exists autorizzazioni text[] not null default '{}';

alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note
  check (sezioni <@ array['lead', 'prove', 'contratti', 'disdette', 'task', 'cerca', 'abbonamenti']);
alter table public.staff drop constraint if exists staff_autorizzazioni_note;
alter table public.staff add constraint staff_autorizzazioni_note
  check (autorizzazioni <@ array['lead_altrui', 'gestione_utenti']);

create or replace function crm.puo_vedere(p_sezione text) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select s.ruolo = 'admin' or p_sezione = any (s.sezioni) from crm.io() s where s.id is not null), false) $$;

create or replace function crm.ha(p_autorizzazione text) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select s.ruolo = 'admin' or p_autorizzazione = any (s.autorizzazioni) from crm.io() s where s.id is not null), false) $$;

create or replace function crm.richiedi_sezione(p_sezione text) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_vedere(p_sezione) then
    raise exception 'Non autorizzato a vedere %', p_sezione using errcode = '42501';
  end if;
end;
$$;

create or replace function public.crm_io()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.id is null then null
         else jsonb_build_object('id', s.id, 'email', s.email, 'nome', s.nome, 'cognome', s.cognome, 'ruolo', s.ruolo,
                                 'sezioni', to_jsonb(s.sezioni), 'autorizzazioni', to_jsonb(s.autorizzazioni)) end
    from (select (crm.io()).*) s
$$;

-- I lead degli altri: chi ce l'ha, un admin, o chi ne ha l'autorizzazione.
create or replace function crm.puo_gestire(p_lead uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select crm.ha('lead_altrui') or exists (select 1 from public.lead l where l.id = p_lead
                                          and (l.assegnato_a is null or l.assegnato_a = crm.chi()))
$$;

create or replace function public.crm_utenti()
returns table (id uuid, email text, nome text, cognome text, ruolo text, attivo boolean,
               sezioni text[], autorizzazioni text[], accesso boolean, ultimo_accesso timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
    select s.id, s.email, s.nome, s.cognome, s.ruolo, s.attivo, s.sezioni, s.autorizzazioni,
           u.id is not null, u.last_sign_in_at
      from public.staff s
      left join auth.users u on lower(u.email) = s.email
     order by s.attivo desc, s.ruolo, s.nome, s.cognome;
end;
$$;

create or replace function public.crm_utente_aggiorna(
  p_id uuid, p_ruolo text, p_attivo boolean, p_sezioni text[], p_autorizzazioni text[])
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  prima public.staff;
begin
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into prima from public.staff where id = p_id;
  if prima.id is null then
    raise exception 'Utente inesistente';
  end if;
  if (prima.ruolo = 'admin' or p_ruolo = 'admin') and prima.ruolo is distinct from p_ruolo and not crm.e_admin() then
    raise exception 'Solo un admin da'' o toglie il ruolo admin' using errcode = '42501';
  end if;
  if prima.ruolo = 'admin' and not crm.e_admin() then
    raise exception 'Un admin lo modifica solo un altro admin' using errcode = '42501';
  end if;
  if p_id = me and (p_ruolo is distinct from prima.ruolo or p_attivo is distinct from prima.attivo
                    or ('gestione_utenti' = any (prima.autorizzazioni) and not 'gestione_utenti' = any (coalesce(p_autorizzazioni, '{}')))) then
    raise exception 'Il proprio ruolo, l''accesso e la gestione utenti li cambia un altro' using errcode = '42501';
  end if;
  update public.staff
     set ruolo = p_ruolo,
         attivo = p_attivo,
         sezioni = (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_sezioni, '{}')) x),
         autorizzazioni = (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_autorizzazioni, '{}')) x)
   where id = p_id;
end;
$$;

create or replace function public.crm_utente_nuovo(p_email text, p_nome text, p_cognome text, p_ruolo text default 'consulente')
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare nuovo uuid;
begin
  perform crm.chi();
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if p_ruolo = 'admin' and not crm.e_admin() then
    raise exception 'Solo un admin crea un admin' using errcode = '42501';
  end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or coalesce(trim(p_nome), '') = '' then
    raise exception 'Servono un nome e un''email valida';
  end if;
  insert into public.staff (email, nome, cognome, ruolo)
  values (lower(trim(p_email)), trim(p_nome), nullif(trim(p_cognome), ''), coalesce(p_ruolo, 'consulente'))
  returning id into nuovo;
  return nuovo;
end;
$$;

revoke all on function crm.puo_vedere(text), crm.ha(text), crm.richiedi_sezione(text) from public, anon, authenticated;
revoke all on function public.crm_utenti(), public.crm_utente_aggiorna(uuid, text, boolean, text[], text[]),
                       public.crm_utente_nuovo(text, text, text, text) from public, anon;
grant execute on function public.crm_utenti(), public.crm_utente_aggiorna(uuid, text, boolean, text[], text[]),
                          public.crm_utente_nuovo(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Le catene di abbonamenti
-- ---------------------------------------------------------------------------

-- Una riga per permanenza: abbonamenti a pagamento della stessa persona
-- senza piu' di 30 giorni di vuoto fra la fine di uno e l'inizio dell'altro.
-- `fine` e' vuota finche' la catena e' aperta; `vincolo` e `indeterminato`
-- sono quelli del primo abbonamento; `cambi` quanti abbonamenti sono venuti
-- dopo il primo.
create or replace function crm.catene(p_oggi date)
returns table (member_id bigint, inizio date, fine date, vincolo int, indeterminato boolean, cambi int)
language sql
stable
security definer
set search_path = ''
as $$
  with ab as (
    select a.*,
           max(coalesce(a.data_fine, 'infinity'::date))
             over (partition by a.member_id order by a.data_inizio, a.id
                   rows between unbounded preceding and 1 preceding) as fine_prima
      from crm.abbonamenti(p_oggi) a
     where a.data_inizio <= p_oggi
  ),
  gruppi as (
    select ab.*,
           sum(case when ab.fine_prima is null or ab.data_inizio > ab.fine_prima + 30 then 1 else 0 end)
             over (partition by ab.member_id order by ab.data_inizio, ab.id) as catena
      from ab
  )
  select g.member_id,
         min(g.data_inizio),
         case when bool_or(g.data_fine is null) then null else max(g.data_fine) end,
         (array_agg(g.vincolo order by g.data_inizio, g.id))[1],
         (array_agg(g.indeterminato order by g.data_inizio, g.id))[1],
         (count(*) - 1)::int
    from gruppi g
   group by g.member_id, g.catena
$$;

revoke all on function crm.catene(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. La dashboard
-- ---------------------------------------------------------------------------

create or replace function public.crm_abbonamenti()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  primo date := (date_trunc('month', (now() at time zone 'Europe/Rome')) - interval '23 months')::date;
  risultato jsonb;
begin
  perform crm.richiedi_sezione('abbonamenti');

  with
  ab as materialized (select * from crm.abbonamenti(oggi)),
  catene as materialized (select * from crm.catene(oggi)),
  giorni (quale, giorno) as (
    values ('oggi', oggi), ('anno_fa', (oggi - interval '1 year')::date), ('due_anni_fa', (oggi - interval '2 years')::date)
  ),
  pass as (
    select c.data_inizio,
           coalesce(c.data_fine, c.data_inizio + coalesce((p.dati -> 'commitmentPeriod' ->> 'days')::int, 7)) as data_fine
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id
     where c.club_id = club and not c.is_deleted and c.data_inizio is not null and crm.e_pass(p.nome)
  ),
  kpi as (
    select jsonb_object_agg(g.quale, jsonb_build_object(
             'giorno', g.giorno,
             'abbonamenti', (select count(*) from ab a
                              where a.data_inizio <= g.giorno and coalesce(a.data_fine, 'infinity'::date) >= g.giorno),
             'pass', (select count(*) from pass s where s.data_inizio <= g.giorno and s.data_fine >= g.giorno),
             'old', (select count(*) from perfectgym.contracts c
                       join perfectgym.payment_plans p on p.id = c.payment_plan_id
                      where c.club_id = club and not c.is_deleted and not coalesce(p.aggiuntivo, false)
                        and p.canone = 0 and p.nome ~* '^OLD'
                        and c.data_inizio <= g.giorno and coalesce(c.data_fine, 'infinity'::date) >= g.giorno))) as j
      from giorni g
  ),
  -- I Guest Pass di chi non era gia' socio, e se entro 30 giorni dalla fine
  -- (o gia' durante) e' partito un abbonamento.
  guest as materialized (
    select g.inizio, g.fine,
           (select min(a.data_inizio) from ab a
             where a.member_id = g.member_id and a.data_inizio >= g.inizio
               and a.data_inizio <= g.fine + 30 and a.data_inizio <= oggi) as abbonato_il
      from (select c.member_id, c.data_inizio as inizio,
                   coalesce(c.data_fine, c.data_inizio + coalesce((p.dati -> 'commitmentPeriod' ->> 'days')::int, 7)) as fine
              from perfectgym.contracts c
              join perfectgym.payment_plans p on p.id = c.payment_plan_id
             where c.club_id = club and not c.is_deleted and c.data_inizio is not null
               and p.nome ~* 'guest') g
     where not exists (select 1 from ab a
                        where a.member_id = g.member_id and a.data_inizio < g.inizio
                          and coalesce(a.data_fine, 'infinity'::date) >= g.inizio)
  ),
  mesi as (
    select m::date as mese, least((m + interval '1 month - 1 day')::date, oggi) as fine
      from generate_series(primo, date_trunc('month', oggi::timestamp), interval '1 month') m
  ),
  per_mese as (
    select jsonb_agg(jsonb_build_object(
             'mese', m.mese,
             'in_corso', m.fine = oggi,
             'attivi', (select count(*) from ab a
                         where a.data_inizio <= m.fine and coalesce(a.data_fine, 'infinity'::date) >= m.fine),
             'nuovi', (select count(*) from ab a
                        where a.data_inizio between m.mese and m.fine and not a.rinnovo),
             'rinnovi', (select count(*) from ab a
                          where a.data_inizio between m.mese and m.fine and a.rinnovo),
             'scaduti', (select count(*) from ab a
                          where a.data_fine between m.mese and m.fine and a.data_fine < oggi and not a.rinnovato),
             'scaduti_provvisori', (select count(*) from ab a
                          where a.data_fine between m.mese and m.fine and a.data_fine < oggi and not a.rinnovato
                            and a.data_fine >= oggi - 30),
             'guest_scaduti', (select count(*) from guest g where g.fine between m.mese and m.fine and g.fine < oggi),
             'guest_convertiti', (select count(*) from guest g where g.fine between m.mese and m.fine and g.fine < oggi
                                     and g.abbonato_il is not null),
             'guest_durante', (select count(*) from guest g where g.fine between m.mese and m.fine and g.fine < oggi
                                  and g.abbonato_il <= g.fine),
             'guest_provvisori', (select count(*) from guest g where g.fine between m.mese and m.fine and g.fine < oggi
                                     and g.abbonato_il is null and g.fine >= oggi - 30),
             'guest_giorni', (select round(avg(g.abbonato_il - g.inizio), 1) from guest g
                                where g.fine between m.mese and m.fine and g.fine < oggi and g.abbonato_il is not null)
           ) order by m.mese) as j
      from mesi m
  ),
  -- La durata si misura sulla catena: dal primo abbonamento all'ultimo, con
  -- i cambi di piano dentro. Il tipo e' quello con cui la persona e' entrata.
  disdetti as (
    select k.vincolo, k.fine as data_fine, k.cambi > 0 as cambio,
           (k.fine - k.inizio + 1) / 30.4375 as durata
      from catene k
     where k.indeterminato and k.vincolo in (1, 4, 12)
       and k.fine < oggi
  ),
  trimestri as (
    select q::date as trimestre
      from generate_series(date_trunc('quarter', oggi::timestamp) - interval '21 months', date_trunc('quarter', oggi::timestamp), interval '3 months') q
  ),
  per_trimestre as (
    select t.trimestre, w.vincolo,
           count(d.*) as disdetti,
           round(avg(d.durata), 1) as durata_media,
           count(d.*) filter (where d.durata >= w.vincolo - 0.5) as arrivati,
           round(avg(d.durata - w.vincolo) filter (where d.durata >= w.vincolo - 0.5), 1) as oltre_medio,
           count(d.*) filter (where d.durata < w.vincolo - 0.5) as anticipati,
           count(d.*) filter (where d.cambio) as con_cambio
      from trimestri t
      cross join (values (1), (4), (12)) w (vincolo)
      left join disdetti d on d.vincolo = w.vincolo
                           and d.data_fine >= t.trimestre and d.data_fine < t.trimestre + interval '3 months'
     group by t.trimestre, w.vincolo
  ),
  periodi (periodo, dal, al) as (
    values ('ultimi_12', (oggi - interval '12 months')::date, oggi),
           ('precedenti_12', (oggi - interval '24 months')::date, (oggi - interval '12 months')::date)
  ),
  per_periodo as (
    select pe.periodo, w.vincolo,
           count(d.*) as disdetti,
           round(avg(d.durata), 1) as durata_media,
           count(d.*) filter (where d.durata >= w.vincolo - 0.5) as arrivati,
           round(avg(d.durata - w.vincolo) filter (where d.durata >= w.vincolo - 0.5), 1) as oltre_medio,
           count(d.*) filter (where d.durata < w.vincolo - 0.5) as anticipati,
           count(d.*) filter (where d.cambio) as con_cambio
      from periodi pe
      cross join (values (1), (4), (12)) w (vincolo)
      left join disdetti d on d.vincolo = w.vincolo and d.data_fine >= pe.dal and d.data_fine < pe.al
     group by pe.periodo, w.vincolo
  ),
  -- Chi e' ancora dentro, per tipo: quanti hanno gia' passato il vincolo.
  in_corso as (
    select w.vincolo,
           count(a.*) as attivi,
           count(a.*) filter (where (oggi - a.data_inizio + 1) / 30.4375 >= w.vincolo) as attivi_oltre,
           round(avg((oggi - a.data_inizio + 1) / 30.4375 - w.vincolo)
                   filter (where (oggi - a.data_inizio + 1) / 30.4375 >= w.vincolo), 1) as attivi_oltre_mesi
      from (values (1), (4), (12)) w (vincolo)
      left join (select k.inizio as data_inizio, k.vincolo from catene k
                  where k.indeterminato and k.inizio <= oggi and coalesce(k.fine, 'infinity'::date) >= oggi) a
             on a.vincolo = w.vincolo
     group by w.vincolo
  ),
  riepilogo as (
    select jsonb_agg(jsonb_build_object(
             'vincolo', i.vincolo,
             'attivi', i.attivi,
             'attivi_oltre', i.attivi_oltre,
             'attivi_oltre_mesi', i.attivi_oltre_mesi,
             'periodi', (select jsonb_object_agg(pp.periodo, to_jsonb(pp) - 'periodo' - 'vincolo')
                           from per_periodo pp where pp.vincolo = i.vincolo)
           ) order by i.vincolo) as j
      from in_corso i
  )
  select jsonb_build_object(
           'oggi', oggi,
           'kpi', (select j from kpi),
           'mesi', (select j from per_mese),
           'durata', jsonb_build_object(
             'trimestri', (select jsonb_agg(to_jsonb(t) || jsonb_build_object('in_corso', t.trimestre = date_trunc('quarter', oggi::timestamp)::date)
                                            order by t.vincolo, t.trimestre) from per_trimestre t),
             'riepilogo', (select j from riepilogo)),
           'aggiornato_il', (select max(sincronizzato_il) from perfectgym.contracts))
    into risultato;

  return risultato;
end;
$$;

revoke all on function public.crm_abbonamenti() from public, anon;
grant execute on function public.crm_abbonamenti() to authenticated;
