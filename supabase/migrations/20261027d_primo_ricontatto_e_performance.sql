-- Il primo ricontatto di un'opportunita' e la performance settimanale del consulente
--
-- 1) crm.minuti_lavoro(da, a): i minuti di ORARIO DI LAVORO fra due momenti.
--    L'orario e' dalle 8 alle 22 dal lunedi al venerdi, dalle 8 alle 20 il sabato
--    e la domenica (ora di Roma): dal 27/10/2026 e' cambiato in 9-21 e 10-19:30,
--    vedi 20261027f. Fuori orario il tempo non scorre: un'opportunita' arrivata
--    a mezzanotte comincia a contare alle prime ore del mattino. Le feste non
--    sono considerate (contano come giorni normali).
--
-- 2) public.crm_lead_velocita(lead[]): per ogni opportunita' il primo
--    ricontatto, cioe' il primo task chiuso dopo l'arrivo, anche un tentativo
--    («Non risponde»: esito negativo). I minuti sono di orario di lavoro, dall'arrivo
--    al ricontatto; se nessuno ha ancora ricontattato, fino ad adesso.
--
-- 3) public.crm_performance(consulente, settimane): i numeri di un consulente
--    per settimana (da lunedi a domenica, ora di Roma), per le ultime N, in
--    corso compresa. Il consulente vede se stesso; un admin puo' chiedere un
--    altro. Cosa conta:
--
--      prese            opportunita' assegnate al consulente e prese in carico
--                       nella settimana: da qui partono le percentuali sotto;
--      chiuse, vinte    di quelle, quante sono oggi chiuse (vinte o perse) e quante
--                       vinte; sono numeri che crescono man mano che si lavora;
--      con_pass         di quelle, quante hanno un Guest Pass o un pass giornaliero
--                       firmato dopo l'arrivo dell'opportunita' (stessa regola
--                       dei pass di prova di Abbonamenti);
--      con_abbonamento  di quelle, quante hanno un abbonamento a pagamento
--                       firmato dopo l'arrivo;
--      ricontattate, ricontatto_mediano_min, ricontatto_30
--                       di quelle, quante hanno avuto un primo ricontatto, il
--                       tempo mediano dall'arrivo e quante entro 30 minuti di lavoro;
--      dopo_presa_mediano_min, dopo_presa_30
--                       lo stesso, ma contando dalla presa in carico: e' il tempo
--                       del consulente, senza l'attesa prima che qualcuno la prenda;
--      prove_finite, prove_iscritte
--                       le prove del consulente finite nella settimana e quelle
--                       finite con un abbonamento (esito «iscritto»);
--      abbonamenti, abbonamenti_nuovi
--                       abbonamenti a pagamento firmati nella settimana e
--                       attribuiti al consulente (come nel Report giornaliero) e,
--                       di questi, i nuovi (non rinnovi o cambi);
--      importo_mensile, importo_vincolo
--                       di quegli abbonamenti, la somma dei canoni mensili e la
--                       somma del valore del vincolo minimo (canone per i mesi
--                       minimi del piano: 1, 4 o 12). Sono i prezzi di listino
--                       del piano, senza la quota amministrativa;
--      disdette_gestite, disdette_recuperate    gestite nella settimana, e con esito «vinto»;
--      rinnovi_gestiti, rinnovi_rinnovati       chiusi nella settimana, e con esito «rinnovato»;
--      task_fatti, task_positivi                chiusi dal personale nella settimana.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.minuti_lavoro(p_da timestamptz, p_a timestamptz)
returns numeric
language sql
stable
set search_path = ''
as $$
  select case
    when p_da is null or p_a is null or p_a <= p_da then 0
    else coalesce((
      select sum(greatest(0, extract(epoch from least(p_a, x.fine) - greatest(p_da, x.inizio)) / 60))
        from (select ((g::date + time '08:00') at time zone 'Europe/Rome') as inizio,
                     ((g::date + case when extract(isodow from g) >= 6 then time '20:00' else time '22:00' end) at time zone 'Europe/Rome') as fine
                from generate_series((p_da at time zone 'Europe/Rome')::date::timestamp,
                                     (p_a at time zone 'Europe/Rome')::date::timestamp, interval '1 day') g) x), 0)
  end
$$;

create or replace function public.crm_lead_velocita(p_lead uuid[])
returns table (lead_id uuid, primo_contatto timestamptz, minuti numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  return query
  select l.id, c.primo, round(crm.minuti_lavoro(l.creato_il, coalesce(c.primo, now())))
    from public.lead l
    left join lateral (select min(t.completato_il) as primo
                         from public.task t
                        where t.lead_id = l.id and t.completato_il is not null and not t.archiviato
                          and t.completato_il >= l.creato_il) c on true
   where l.id = any (p_lead);
end;
$$;

revoke all on function public.crm_lead_velocita(uuid[]) from public, anon;
grant execute on function public.crm_lead_velocita(uuid[]) to authenticated;

create or replace function public.crm_performance(p_consulente uuid default null, p_settimane integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  chi uuid := coalesce(p_consulente, crm.chi());
  oggi date := (now() at time zone 'Europe/Rome')::date;
  lunedi date := date_trunc('week', (now() at time zone 'Europe/Rome'))::date;
  n integer := least(greatest(coalesce(p_settimane, 8), 2), 26);
  primo date;
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  risultato jsonb;
begin
  if chi <> me and not crm.e_admin() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  primo := lunedi - 7 * (n - 1);

  with
  settimane as (select (primo + 7 * g)::date as lun from generate_series(0, n - 1) g),
  mie as materialized (
    select l.id, l.creato_il, l.preso_in_carico_il, l.fase, u.member_id,
           date_trunc('week', (l.preso_in_carico_il at time zone 'Europe/Rome'))::date as sett
      from public.lead l
      left join public.utenti u on u.id = l.utente_id
     where l.assegnato_a = chi
       and (l.preso_in_carico_il at time zone 'Europe/Rome')::date >= primo
  ),
  lead_dati as materialized (
    select m.*, f.primo as primo_contatto,
           case when f.primo is not null then crm.minuti_lavoro(m.creato_il, f.primo) end as minuti,
           case when f.primo is not null then crm.minuti_lavoro(m.preso_in_carico_il, f.primo) end as minuti_presa,
           exists (select 1 from perfectgym.contracts c
                     join perfectgym.payment_plans p on p.id = c.payment_plan_id
                    where c.member_id = m.member_id and c.club_id = club and not c.is_deleted
                      and c.data_firma >= (m.creato_il at time zone 'Europe/Rome')::date
                      and crm.e_pass_prova(p.nome)) as con_pass,
           exists (select 1 from perfectgym.contracts c
                     join perfectgym.payment_plans p on p.id = c.payment_plan_id
                    where c.member_id = m.member_id and c.club_id = club and not c.is_deleted
                      and c.data_firma >= (m.creato_il at time zone 'Europe/Rome')::date
                      and not crm.e_pass(p.nome) and p.canone > 0 and not coalesce(p.aggiuntivo, false)) as con_abbonamento
      from mie m
      left join lateral (select min(t.completato_il) as primo
                           from public.task t
                          where t.lead_id = m.id and t.completato_il is not null and not t.archiviato
                            and t.completato_il >= m.creato_il) f on true
  ),
  rinnovo as materialized (select a.id, a.rinnovo from crm.abbonamenti(oggi) a),
  vendite as materialized (
    select date_trunc('week', coalesce(c.data_firma, c.data_inizio)::timestamp)::date as sett, coalesce(r.rinnovo, false) as rinnovo,
           p.canone as canone, greatest(coalesce((p.dati -> 'commitmentPeriod' ->> 'months')::int, 1), 1) as mesi
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id
      left join rinnovo r on r.id = c.id
     where c.club_id = club and not c.is_deleted and coalesce(c.data_firma, c.data_inizio) >= primo
       and not crm.e_pass(p.nome) and p.canone > 0 and not coalesce(p.aggiuntivo, false)
       and (select l.assegnato_a from public.lead l
             where l.utente_id in (select x.id from public.utenti x where x.member_id = c.member_id)
               and l.assegnato_a is not null
             order by (l.vinta_contract_id = c.id or l.contract_id = c.id) desc nulls last,
                      coalesce(l.preso_in_carico_il, l.creato_il) desc
             limit 1) = chi
  ),
  per_settimana as (
    select jsonb_agg(jsonb_build_object(
             'settimana', s.lun,
             'in_corso', s.lun = lunedi,
             'prese', (select count(*) from lead_dati d where d.sett = s.lun),
             'chiuse', (select count(*) from lead_dati d where d.sett = s.lun and d.fase in ('vinta', 'persa')),
             'vinte', (select count(*) from lead_dati d where d.sett = s.lun and d.fase = 'vinta'),
             'con_pass', (select count(*) from lead_dati d where d.sett = s.lun and d.con_pass),
             'con_abbonamento', (select count(*) from lead_dati d where d.sett = s.lun and d.con_abbonamento),
             'ricontattate', (select count(*) from lead_dati d where d.sett = s.lun and d.primo_contatto is not null),
             'ricontatto_mediano_min', (select round(percentile_cont(0.5) within group (order by d.minuti)::numeric)
                                          from lead_dati d where d.sett = s.lun and d.minuti is not null),
             'ricontatto_30', (select count(*) from lead_dati d where d.sett = s.lun and d.minuti <= 30),
             'dopo_presa_mediano_min', (select round(percentile_cont(0.5) within group (order by d.minuti_presa)::numeric)
                                          from lead_dati d where d.sett = s.lun and d.minuti_presa is not null),
             'dopo_presa_30', (select count(*) from lead_dati d where d.sett = s.lun and d.minuti_presa <= 30),
             'prove_finite', (select count(*) from public.prove p
                               where p.gestito_da = chi and p.data_fine < now()
                                 and date_trunc('week', (p.data_fine at time zone 'Europe/Rome'))::date = s.lun),
             'prove_iscritte', (select count(*) from public.prove p
                                 where p.gestito_da = chi and p.data_fine < now() and p.esito = 'iscritto'
                                   and date_trunc('week', (p.data_fine at time zone 'Europe/Rome'))::date = s.lun),
             'abbonamenti', (select count(*) from vendite v where v.sett = s.lun),
             'abbonamenti_nuovi', (select count(*) from vendite v where v.sett = s.lun and not v.rinnovo),
             'importo_mensile', (select coalesce(sum(v.canone), 0) from vendite v where v.sett = s.lun),
             'importo_vincolo', (select coalesce(sum(v.canone * v.mesi), 0) from vendite v where v.sett = s.lun),
             'disdette_gestite', (select count(*) from public.disdette d
                                   where d.gestito_da = chi and date_trunc('week', (d.gestito_il at time zone 'Europe/Rome'))::date = s.lun),
             'disdette_recuperate', (select count(*) from public.disdette d
                                      where d.gestito_da = chi and d.esito = 'vinto'
                                        and date_trunc('week', (d.gestito_il at time zone 'Europe/Rome'))::date = s.lun),
             'rinnovi_gestiti', (select count(*) from public.rinnovi r
                                  where r.assegnato_a = chi and date_trunc('week', (r.gestito_il at time zone 'Europe/Rome'))::date = s.lun),
             'rinnovi_rinnovati', (select count(*) from public.rinnovi r
                                    where r.assegnato_a = chi and r.esito = 'rinnovato'
                                      and date_trunc('week', (r.gestito_il at time zone 'Europe/Rome'))::date = s.lun),
             'task_fatti', (select count(*) from public.task t
                             where t.assegnato_a = chi and not t.archiviato
                               and date_trunc('week', (t.completato_il at time zone 'Europe/Rome'))::date = s.lun),
             'task_positivi', (select count(*) from public.task t
                                where t.assegnato_a = chi and not t.archiviato and t.esito = 'positivo'
                                  and date_trunc('week', (t.completato_il at time zone 'Europe/Rome'))::date = s.lun)
           ) order by s.lun) as j
      from settimane s
  )
  select jsonb_build_object(
           'consulente_id', chi,
           'consulente', crm.nome_staff(chi),
           'oggi', oggi,
           'settimane', (select j from per_settimana))
    into risultato;

  return risultato;
end;
$$;

revoke all on function public.crm_performance(uuid, integer) from public, anon;
grant execute on function public.crm_performance(uuid, integer) to authenticated;
