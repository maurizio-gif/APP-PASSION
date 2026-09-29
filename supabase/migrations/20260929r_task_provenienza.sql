-- I task sanno da dove vengono; disdette e rinnovi fanno nascere i loro task
--
-- Il lavoro si fa dai task: ogni task dice da dove viene (lead, scadenza del
-- pass, rinnovo, disdetta, debito), e le disdette e i rinnovi nuovi ne fanno
-- nascere uno da soli, come la prova che finisce (crm.task_fine_prova()).
--
--   - `task.disdetta_id`, `task.rinnovo_id`: accanto a lead_id, prova_id e
--     debito_id. I task di Airtable delle opportunita' «Disdetta» e «Rinnovi»
--     (646 e 318 il 29/09/2026) si agganciano alla disdetta e al rinnovo del
--     CRM con lo stesso airtable_id, subito e poi a ogni sync
--     (`airtable.allinea_task()`).
--   - `crm.task_disdette()`: una disdetta nuova, da gestire, con la data da
--     30 giorni fa in poi, fa nascere subito una telefonata per chi la segue
--     (nessuno: resta senza assegnatario).
--   - `crm.task_rinnovi()`: un rinnovo nuovo, senza esito, fa nascere una
--     telefonata 15 giorni prima della scadenza, per chi lo segue; non se su
--     PerfectGym c'e' gia' l'abbonamento nuovo.
--     Tutti e due solo per disdette e rinnovi nati da adesso
--     (`crm.impostazioni.task_automatici_dal`), e solo se non hanno gia' un
--     task (da Airtable o dal CRM). Li lancia `crm.alimenta()`, ogni 5 minuti.
--   - `crm_task()` e `crm_persona()` dicono la provenienza di ogni task
--     (`origine`); `crm_persona()` restituisce anche i rinnovi della persona
--     e il piano delle disdette, per gestirli dalla scheda.
--   - `crm_task_nuovo()` e `crm_task_registra()` agganciano il task anche a
--     una prova, un rinnovo o una disdetta della stessa persona.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.task
  add column if not exists disdetta_id uuid references public.disdette(id),
  add column if not exists rinnovo_id uuid references public.rinnovi(id);
create index if not exists task_disdetta_id_idx on public.task (disdetta_id) where disdetta_id is not null;
create index if not exists task_rinnovo_id_idx on public.task (rinnovo_id) where rinnovo_id is not null;

insert into crm.impostazioni (chiave, valore)
values ('task_automatici_dal', now()::text)
on conflict (chiave) do nothing;

-- ---------------------------------------------------------------------------
-- I task di Airtable di disdette e rinnovi, agganciati
-- ---------------------------------------------------------------------------

update public.task t set disdetta_id = d.id
  from airtable.record r
  join public.disdette d on d.airtable_id = r.dati -> 'Contatto' ->> 0
 where r.tabella = 'Task' and r.id = t.airtable_id and t.disdetta_id is null;

update public.task t set rinnovo_id = x.id
  from airtable.record r
  join public.rinnovi x on x.airtable_id = r.dati -> 'Contatto' ->> 0
 where r.tabella = 'Task' and r.id = t.airtable_id and t.rinnovo_id is null;

do $$
declare
  def text := pg_get_functiondef('airtable.allinea_task(text,jsonb,timestamp with time zone)'::regprocedure);
  nuova text := def;
  prima text;
begin
  prima := nuova;
  nuova := replace(nuova, E'  lid uuid;\n', E'  lid uuid;\n  did uuid;\n  rid uuid;\n');
  if nuova = prima then raise exception 'allinea_task: variabili non trovate'; end if;

  -- La disdetta o il rinnovo dell'opportunita'; la persona, se non c'e' il lead.
  prima := nuova;
  nuova := replace(nuova,
    E'  select l.id, l.utente_id into lid, u from public.lead l where l.airtable_id = opp;\n',
    E'  select l.id, l.utente_id into lid, u from public.lead l where l.airtable_id = opp;\n'
    || E'  select x.id into did from public.disdette x where x.airtable_id = opp;\n'
    || E'  select x.id into rid from public.rinnovi x where x.airtable_id = opp;\n'
    || E'  u := coalesce(u, (select x.utente_id from public.disdette x where x.id = did),\n'
    || E'                   (select x.utente_id from public.rinnovi x where x.id = rid));\n');
  if nuova = prima then raise exception 'allinea_task: ricerca del lead non trovata'; end if;

  prima := nuova;
  nuova := replace(nuova, 'creato_il, airtable_id, airtable_impronta)', 'creato_il, airtable_id, airtable_impronta, disdetta_id, rinnovo_id)');
  if nuova = prima then raise exception 'allinea_task: colonne non trovate'; end if;
  prima := nuova;
  nuova := replace(nuova, 'p_rec, impronta);', 'p_rec, impronta, did, rid);');
  if nuova = prima then raise exception 'allinea_task: valori non trovati'; end if;

  prima := nuova;
  nuova := replace(nuova, 'utente_id = u, lead_id = coalesce(lid, lead_id),',
    'utente_id = u, lead_id = coalesce(lid, lead_id), disdetta_id = coalesce(did, disdetta_id), rinnovo_id = coalesce(rid, rinnovo_id),');
  if nuova = prima then raise exception 'allinea_task: aggiornamento non trovato'; end if;

  execute nuova;
end;
$$;

-- ---------------------------------------------------------------------------
-- I task che nascono da soli
-- ---------------------------------------------------------------------------

create or replace function crm.task_disdette()
returns int
language plpgsql
set search_path = ''
as $$
declare
  dal timestamptz := (select valore::timestamptz from crm.impostazioni where chiave = 'task_automatici_dal');
  n int;
begin
  insert into public.task (utente_id, disdetta_id, tipo, data, nota, assegnato_a, autore_nome)
  select d.utente_id, d.id, 'telefonata', now(),
         'Disdetta del ' || to_char(d.data_disdetta, 'DD/MM/YYYY') || coalesce(' (' || ltrim(pp.nome, '#^ ') || ')', '') ||
         ': chiamare per capire il motivo e provare a recuperarlo.',
         d.gestito_da, 'CRM (automatico)'
    from public.disdette d
    left join perfectgym.contracts c on c.id = d.contract_id
    left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
   where dal is not null and d.creato_il >= dal
     and d.utente_id is not null and d.esito is null
     and d.data_disdetta >= (now() at time zone 'Europe/Rome')::date - 30
     and not exists (select 1 from public.task t where t.disdetta_id = d.id);
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function crm.task_rinnovi()
returns int
language plpgsql
set search_path = ''
as $$
declare
  dal timestamptz := (select valore::timestamptz from crm.impostazioni where chiave = 'task_automatici_dal');
  oggi date := (now() at time zone 'Europe/Rome')::date;
  n int;
begin
  insert into public.task (utente_id, rinnovo_id, tipo, data, nota, assegnato_a, autore_nome)
  select x.utente_id, x.id, 'telefonata',
         greatest(((x.scadenza - 15)::timestamp + time '10:00') at time zone 'Europe/Rome', now()),
         'L''abbonamento' || coalesce(' ' || x.piano, '') || ' scade il ' || to_char(x.scadenza, 'DD/MM/YYYY') ||
         ': chiamare per il rinnovo.',
         x.assegnato_a, 'CRM (automatico)'
    from (select r.id, r.utente_id, r.assegnato_a, coalesce(c.member_id, r.member_id) member_id, r.contract_id,
                 ltrim(coalesce(pp.nome, r.piano), '#^ ') piano, coalesce(c.data_fine, r.scadenza) scadenza
            from public.rinnovi r
            left join perfectgym.contracts c on c.id = r.contract_id
            left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
           where dal is not null and r.creato_il >= dal
             and r.utente_id is not null and r.esito is null) x
   where x.scadenza is not null and x.scadenza <= oggi + 15
     and not exists (select 1 from public.task t where t.rinnovo_id = x.id)
     -- Rinnovato gia' su PerfectGym: un abbonamento nuovo che parte dopo (come crm_rinnovi()).
     and not exists (select 1 from perfectgym.contracts c2
                       join perfectgym.payment_plans p2 on p2.id = c2.payment_plan_id
                      where c2.member_id = x.member_id and not c2.is_deleted and c2.id <> coalesce(x.contract_id, 0)
                        and not coalesce(c2.aggiuntivo, false) and p2.canone > 0
                        and c2.data_inizio >= x.scadenza - 30);
  get diagnostics n = row_count;
  return n;
end;
$$;

do $$
declare
  def text := pg_get_functiondef('crm.alimenta()'::regprocedure);
  nuova text := replace(def, $a$'task_fine_prova', crm.task_fine_prova(),$a$,
    $b$'task_fine_prova', crm.task_fine_prova(),
    'task_disdette', crm.task_disdette(),
    'task_rinnovi', crm.task_rinnovi(),$b$);
begin
  if nuova = def then raise exception 'alimenta: task_fine_prova non trovato'; end if;
  execute nuova;
end;
$$;

-- ---------------------------------------------------------------------------
-- Da dove viene un task
-- ---------------------------------------------------------------------------

create or replace function crm.origine_task(t public.task)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when t.debito_id is not null then 'debito'
              when t.disdetta_id is not null then 'disdetta'
              when t.rinnovo_id is not null then 'rinnovo'
              when t.prova_id is not null then 'prova'
              when t.lead_id is not null then 'lead' end
$$;

drop function public.crm_task(text, text, integer, uuid);
create function public.crm_task(p_chi text default 'miei', p_quando text default 'oggi', p_limite integer default 300,
                                p_consulente uuid default null)
returns table (id uuid, utente_id uuid, nome text, cognome text, telefono text, lead_id uuid, prova_id uuid, tipo text,
               data timestamptz, nota text, assegnato_a uuid, assegnato_nome text, autore text,
               completato_il timestamptz, esito text, creato_il timestamptz, origine text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  oggi timestamptz := crm.inizio_oggi();
begin
  return query
  select t.id, u.id, u.nome, u.cognome, u.telefono, t.lead_id, t.prova_id,
         t.tipo, t.data, t.nota, t.assegnato_a, crm.nome_staff(t.assegnato_a),
         coalesce(crm.nome_staff(t.creato_da), t.autore_nome),
         t.completato_il, t.esito, t.creato_il, crm.origine_task(t)
    from public.task t
    join public.utenti u on u.id = t.utente_id
   where case coalesce(p_chi, 'miei')
           when 'miei' then t.assegnato_a = me
           when 'nessuno' then t.assegnato_a is null
           else true end
     and (p_consulente is null or t.assegnato_a = p_consulente)
     and case coalesce(p_quando, 'oggi')
           when 'arretrati' then t.completato_il is null and t.data < oggi
           when 'oggi' then t.completato_il is null and t.data >= oggi and t.data < oggi + interval '1 day'
           when 'prossimi' then t.completato_il is null and t.data >= oggi + interval '1 day'
           when 'fatti' then t.completato_il is not null and not t.archiviato
           else t.completato_il is null end
   order by case when p_quando = 'fatti' then t.completato_il end desc nulls last, t.data asc nulls last
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;
revoke all on function public.crm_task(text, text, integer, uuid) from public, anon;
grant execute on function public.crm_task(text, text, integer, uuid) to authenticated;

-- La scheda: la provenienza di ogni task, i rinnovi, il piano delle disdette.
do $$
declare
  def text := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  nuova text := def;
  prima text;
begin
  prima := nuova;
  nuova := replace(nuova, $a$'archiviato', t.archiviato, 'nota_esito', t.nota_esito,$a$,
                          $b$'archiviato', t.archiviato, 'nota_esito', t.nota_esito, 'origine', crm.origine_task(t),$b$);
  if nuova = prima then raise exception 'crm_persona: task della storia non trovati'; end if;

  prima := nuova;
  nuova := replace(nuova, $a$'gestito_nome', crm.nome_staff(d.gestito_da)) order by d.creato_il desc)$a$,
    $b$'gestito_nome', crm.nome_staff(d.gestito_da),
        'piano', (select pp.nome from perfectgym.contracts c join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
                   where c.id = d.contract_id)) order by d.creato_il desc)$b$);
  if nuova = prima then raise exception 'crm_persona: disdette non trovate'; end if;

  prima := nuova;
  nuova := replace(nuova, $a$'storia', coalesce((select jsonb_agg(x.j$a$,
    $b$'rinnovi', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'contract_id', r.contract_id, 'piano', coalesce(pp.nome, r.piano),
        'scadenza', coalesce(c.data_fine, r.scadenza), 'esito', r.esito, 'assegnato_a', r.assegnato_a,
        'assegnato_nome', crm.nome_staff(r.assegnato_a), 'note', r.note)
        order by coalesce(c.data_fine, r.scadenza) desc nulls last)
      from public.rinnovi r
      left join perfectgym.contracts c on c.id = r.contract_id
      left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
     where r.utente_id = u.id), '[]'::jsonb),
    'storia', coalesce((select jsonb_agg(x.j$b$);
  if nuova = prima then raise exception 'crm_persona: storia non trovata'; end if;

  execute nuova;
end;
$$;

-- ---------------------------------------------------------------------------
-- Il task nuovo, agganciato a quello per cui lo si fa
-- ---------------------------------------------------------------------------

drop function public.crm_task_nuovo(uuid, text, timestamptz, text, uuid, uuid);
create function public.crm_task_nuovo(p_utente uuid, p_tipo text, p_data timestamptz, p_nota text default null,
                                      p_assegnato uuid default null, p_lead uuid default null,
                                      p_prova uuid default null, p_rinnovo uuid default null, p_disdetta uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := crm.chi(); t uuid;
begin
  insert into public.task (utente_id, lead_id, prova_id, rinnovo_id, disdetta_id, tipo, data, nota, assegnato_a, creato_da)
  values (p_utente,
          (select x.id from public.lead x where x.id = p_lead and x.utente_id = p_utente),
          (select x.id from public.prove x where x.id = p_prova and x.utente_id = p_utente),
          (select x.id from public.rinnovi x where x.id = p_rinnovo and x.utente_id = p_utente),
          (select x.id from public.disdette x where x.id = p_disdetta and x.utente_id = p_utente),
          p_tipo, coalesce(p_data, now()), nullif(trim(coalesce(p_nota, '')), ''),
          coalesce(p_assegnato, me), me)
  returning id into t;
  update public.utenti set aggiornato_il = now() where id = p_utente;
  return t;
end;
$$;
revoke all on function public.crm_task_nuovo(uuid, text, timestamptz, text, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.crm_task_nuovo(uuid, text, timestamptz, text, uuid, uuid, uuid, uuid, uuid) to authenticated;

drop function public.crm_task_registra(uuid, text, text, text, uuid, uuid);
create function public.crm_task_registra(p_utente uuid, p_tipo text, p_esito text, p_nota_esito text default null,
                                         p_assegnato uuid default null, p_lead uuid default null,
                                         p_prova uuid default null, p_rinnovo uuid default null, p_disdetta uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := crm.chi(); t uuid;
begin
  if p_esito not in ('positivo', 'negativo') then
    raise exception 'Scegli l''esito: positivo o negativo';
  end if;
  insert into public.task (utente_id, lead_id, prova_id, rinnovo_id, disdetta_id, tipo, data, assegnato_a, creato_da,
                           completato_il, esito, nota_esito)
  values (p_utente,
          (select x.id from public.lead x where x.id = p_lead and x.utente_id = p_utente),
          (select x.id from public.prove x where x.id = p_prova and x.utente_id = p_utente),
          (select x.id from public.rinnovi x where x.id = p_rinnovo and x.utente_id = p_utente),
          (select x.id from public.disdette x where x.id = p_disdetta and x.utente_id = p_utente),
          p_tipo, now(), coalesce(p_assegnato, me), me, now(), p_esito,
          nullif(trim(coalesce(p_nota_esito, '')), ''))
  returning id into t;
  update public.utenti set aggiornato_il = now() where id = p_utente;
  return t;
end;
$$;
revoke all on function public.crm_task_registra(uuid, text, text, text, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.crm_task_registra(uuid, text, text, text, uuid, uuid, uuid, uuid, uuid) to authenticated;
