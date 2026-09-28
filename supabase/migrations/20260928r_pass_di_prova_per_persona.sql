-- La dashboard abbonamenti: i pass di prova contati per persona
--
-- Il report dei Guest Pass diventa il report dei pass di prova: i Guest Pass
-- e i Pass giornalieri (Pass Reformer, Sala Pesi, Corsi Fitness, Crossfit,
-- I Love My Trainer, Open, Personal Trainer). Si contano le persone, non i
-- pass: chi ne attiva piu' d'uno conta una volta. I pass della stessa persona
-- a meno di 30 giorni l'uno dall'altro sono una prova sola, che finisce con
-- l'ultimo pass; da li' ci sono 30 giorni per abbonarsi (o l'abbonamento
-- parte gia' durante la prova). Chi torna a provare dopo piu' di 30 giorni fa
-- una prova nuova. Non contano i pass di chi era gia' abbonato.
--
-- Pass di prova e' `crm.e_pass` (pass, prova, guest) senza i piani degli
-- aggregatori (Fitprime + Gympass, Wellhub, Fitprime), che hanno «pass» nel
-- nome ma sono accessi da un'altra piattaforma, non prove. La stessa regola
-- vale per i pass attivi in cima alla pagina, che ora sono persone.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.e_pass_prova(p_piano text) returns boolean
language sql immutable set search_path = ''
as $$ select crm.e_pass(p_piano) and coalesce(p_piano, '') !~* 'gympass|wellhub|fitprime' $$;

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
    select c.member_id, c.data_inizio,
           coalesce(c.data_fine, c.data_inizio + greatest(coalesce((p.dati -> 'commitmentPeriod' ->> 'days')::int, 1), 1)) as data_fine
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id
     where c.club_id = club and not c.is_deleted and c.data_inizio is not null and crm.e_pass_prova(p.nome)
  ),
  kpi as (
    select jsonb_object_agg(g.quale, jsonb_build_object(
             'giorno', g.giorno,
             'abbonamenti', (select count(*) from ab a
                              where a.data_inizio <= g.giorno and coalesce(a.data_fine, 'infinity'::date) >= g.giorno),
             'pass', (select count(distinct s.member_id) from pass s where s.data_inizio <= g.giorno and s.data_fine >= g.giorno),
             'old', (select count(*) from perfectgym.contracts c
                       join perfectgym.payment_plans p on p.id = c.payment_plan_id
                      where c.club_id = club and not c.is_deleted and not coalesce(p.aggiuntivo, false)
                        and p.canone = 0 and p.nome ~* '^OLD'
                        and c.data_inizio <= g.giorno and coalesce(c.data_fine, 'infinity'::date) >= g.giorno))) as j
      from giorni g
  ),
  -- I pass di prova (Guest Pass e Pass giornalieri) di chi non era gia'
  -- abbonato, raccolti per persona: i pass della stessa persona a meno di 30
  -- giorni l'uno dall'altro sono una prova sola, che finisce con l'ultimo.
  pass_prova as (
    select c.member_id, c.data_inizio as inizio,
           coalesce(c.data_fine, c.data_inizio + greatest(coalesce((p.dati -> 'commitmentPeriod' ->> 'days')::int, 1), 1)) as fine,
           p.nome ~* 'guest' as guest
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id
     where c.club_id = club and not c.is_deleted and c.data_inizio is not null
       and crm.e_pass_prova(p.nome)
       and not exists (select 1 from ab a
                        where a.member_id = c.member_id and a.data_inizio < c.data_inizio
                          and coalesce(a.data_fine, 'infinity'::date) >= c.data_inizio)
  ),
  pass_in_fila as (
    select s.*,
           max(s.fine) over (partition by s.member_id order by s.inizio, s.fine
                             rows between unbounded preceding and 1 preceding) as fine_prima
      from pass_prova s
  ),
  pass_gruppi as (
    select f.*,
           sum(case when f.fine_prima is null or f.inizio > f.fine_prima + 30 then 1 else 0 end)
             over (partition by f.member_id order by f.inizio, f.fine) as prova
      from pass_in_fila f
  ),
  prove as materialized (
    select q.*,
           (select min(a.data_inizio) from ab a
             where a.member_id = q.member_id and a.data_inizio >= q.inizio
               and a.data_inizio <= q.fine + 30 and a.data_inizio <= oggi) as abbonato_il
      from (select g.member_id, min(g.inizio) as inizio, max(g.fine) as fine, count(*)::int as pass,
                   bool_or(g.guest) as guest
              from pass_gruppi g
             group by g.member_id, g.prova) q
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
             'prove', (select count(*) from prove q where q.fine between m.mese and m.fine and q.fine < oggi),
             'prove_abbonati', (select count(*) from prove q where q.fine between m.mese and m.fine and q.fine < oggi
                                   and q.abbonato_il is not null),
             'prove_provvisori', (select count(*) from prove q where q.fine between m.mese and m.fine and q.fine < oggi
                                     and q.abbonato_il is null and q.fine >= oggi - 30),
             'prove_giorni', (select round(avg(q.abbonato_il - q.inizio), 1) from prove q
                                where q.fine between m.mese and m.fine and q.fine < oggi and q.abbonato_il is not null),
             'prove_guest', (select count(*) from prove q where q.fine between m.mese and m.fine and q.fine < oggi and q.guest),
             'prove_guest_abbonati', (select count(*) from prove q where q.fine between m.mese and m.fine and q.fine < oggi
                                         and q.guest and q.abbonato_il is not null),
             'prove_piu_pass', (select count(*) from prove q where q.fine between m.mese and m.fine and q.fine < oggi and q.pass > 1),
             'prove_pass', (select coalesce(sum(q.pass), 0) from prove q where q.fine between m.mese and m.fine and q.fine < oggi)
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
