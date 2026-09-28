-- La dashboard abbonamenti: i numeri letti dal mirror di PerfectGym
--
-- Cosa conta, una volta per tutte (qui, non nell'app):
--
--   abbonamento  un contratto di Passion (club 1), non cancellato, di un piano
--                non aggiuntivo con canone (`membershipFee`) sopra lo zero.
--                Restano fuori pass, certificati, Wellhub/Fitprime, contratti
--                dello staff, i piani OLD a zero e gli add-on (armadietto,
--                Prenotazione No Stress...);
--   pass         un contratto di un piano che si chiama pass, prova o guest
--                (`crm.e_pass`, la stessa regola delle prove del CRM);
--   attivo il    iniziato quel giorno o prima, e senza data di fine o con la
--                fine da quel giorno in poi. I congelati (Freezed) contano:
--                sono soci che tornano;
--   rinnovo      un abbonamento che parte mentre la stessa persona ne ha un
--                altro, o entro 30 giorni dalla fine dell'altro. Conta come
--                «altro» anche un contratto dei piani OLD: sono i soci passati
--                dal vecchio gestionale, a canone zero su PerfectGym, e chi da
--                li' e' passato a un piano a pagamento non e' un socio nuovo.
--                Nuovo e' tutto il resto (anche chi torna dopo piu' di 30
--                giorni);
--   non rinnovato un abbonamento finito dopo il quale, entro 30 giorni, non ne
--                parte un altro (e non ce n'e' un altro gia' in corso). Per
--                chi e' finito da meno di 30 giorni il conto e' provvisorio.
--
-- La durata: sugli abbonamenti senza scadenza (i «Mensile», Flex, Open,
-- Formula 8) con vincolo minimo di 1, 4 o 12 mesi, finiti e non rinnovati:
-- quanti mesi sono durati e quanti mesi oltre il vincolo. I piani a durata
-- fissa (Reformer 5/12 mesi, Percorsi I Love My Trainer, PT Elite) finiscono
-- da soli e non dicono niente su quando si disdice.
--
-- Il mirror ha gli abbonamenti a pagamento dal luglio 2024: prima c'erano i
-- piani OLD, a canone zero, che qui non contano (il 28/09/2024 erano 994
-- contro 515 a pagamento). Per questo il confronto con due anni fa si legge
-- insieme al numero dei contratti OLD di quel giorno (`old`, nei kpi), e le
-- durate piu' lunghe di ~26 mesi non si possono ancora vedere.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.abbonamenti(p_oggi date)
returns table (
  id bigint,
  member_id bigint,
  data_inizio date,
  data_fine date,
  vincolo int,
  indeterminato boolean,
  rinnovo boolean,
  rinnovato boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with tutti as (
    select c.id, c.member_id, c.data_inizio, c.data_fine,
           (p.dati -> 'commitmentPeriod' ->> 'months')::int as vincolo,
           p.nome !~* '\d+\s*mesi\s*\(|percorso|pt elite' as indeterminato,
           p.canone > 0 as a_pagamento
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id
     where c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
       and not c.is_deleted
       and c.data_inizio is not null
       and not coalesce(p.aggiuntivo, false)
       and (p.canone > 0 or p.nome ~* '^OLD')
  ),
  ab as (select * from tutti where a_pagamento)
  select a.id, a.member_id, a.data_inizio, a.data_fine, a.vincolo, a.indeterminato,
         exists (select 1 from tutti b
                  where b.member_id = a.member_id and b.id <> a.id
                    and (b.data_inizio < a.data_inizio or (b.data_inizio = a.data_inizio and b.id < a.id))
                    and coalesce(b.data_fine, 'infinity'::date) >= a.data_inizio - 30),
         a.data_fine is not null and exists (
                 select 1 from ab b
                  where b.member_id = a.member_id and b.id <> a.id
                    and b.data_inizio <= a.data_fine + 30
                    and b.data_inizio <= p_oggi
                    and coalesce(b.data_fine, 'infinity'::date) > a.data_fine)
    from ab a
$$;

revoke all on function crm.abbonamenti(date) from public, anon, authenticated;

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
  perform crm.chi();

  with
  ab as materialized (select * from crm.abbonamenti(oggi)),
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
                            and a.data_fine >= oggi - 30)
           ) order by m.mese) as j
      from mesi m
  ),
  -- La durata di chi ha disdetto, per tipo di vincolo.
  disdetti as (
    select a.vincolo, a.data_fine,
           (a.data_fine - a.data_inizio + 1) / 30.4375 as durata
      from ab a
     where a.indeterminato and a.vincolo in (1, 4, 12)
       and a.data_fine < oggi and not a.rinnovato
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
           count(d.*) filter (where d.durata < w.vincolo - 0.5) as anticipati
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
           count(d.*) filter (where d.durata < w.vincolo - 0.5) as anticipati
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
      left join ab a on a.indeterminato and a.vincolo = w.vincolo
                    and a.data_inizio <= oggi and coalesce(a.data_fine, 'infinity'::date) >= oggi
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
