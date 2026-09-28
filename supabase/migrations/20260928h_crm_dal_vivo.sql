-- Il CRM va dal vivo: chi lo alimenta
--
-- Da oggi (28/09/2026) si lavora nel CRM, non piu' su Airtable. I contenitori
-- si riempiono da soli:
--
--   nuovi_contratti  dal mirror: ogni contratto firmato da oggi in poi, pass
--                    esclusi;
--   disdette         dal mirror: un contratto in corso che prende una data di
--                    disdetta. Il criterio di Athlon (rinnovo automatico
--                    spento) qui non funziona: a Passion il rinnovo e' spento
--                    su tutti i 2.338 contratti in corso. Le 379 disdette gia'
--                    presenti al passaggio restano fuori (`crm.disdette_note`):
--                    entrano solo quelle nuove;
--   prove            dal mirror: ogni pass attivato da oggi. Se la prova c'e'
--                    gia' (arrivata dal sito via Airtable) le si aggancia il
--                    contratto, altrimenti nasce;
--   lead             quelli del sito, di Meta e dei referral li scrive ancora
--                    n8n su Airtable: da li' entrano qui con
--                    `airtable.importa_nuovi_lead()`, solo i record nati dopo
--                    la migrazione. Tour e telefonate si inseriscono dall'app.
--   task             due giorni prima della fine di una prova senza esito, la
--                    telefonata a chi la segue (deciso in riunione).
--
-- Tutto passa da `crm.alimenta()`, che pg_cron chiama ogni 5 minuti. Ogni
-- passo e' idempotente: si puo' rilanciare quanto si vuole.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create schema if not exists crm;
revoke all on schema crm from public, anon, authenticated;
comment on schema crm is 'Le funzioni interne del CRM: chi lo alimenta. Non esposto.';

-- Da quando si lavora nel CRM.
create table if not exists crm.impostazioni (
  chiave text primary key,
  valore text not null
);
insert into crm.impostazioni values
  ('dal_vivo_dal', '2026-09-28 16:44:00+00'),   -- inizio del secondo import da Airtable
  ('club_id', '1')                              -- Passion Fitness; gli altri club dell'istanza sono finti
on conflict do nothing;

create or replace function crm.dal_vivo_dal() returns timestamptz
language sql stable set search_path = '' as $$
  select valore::timestamptz from crm.impostazioni where chiave = 'dal_vivo_dal'
$$;

-- La task automatica sa di quale prova e'.
alter table public.task add column if not exists prova_id uuid references public.prove (id);
create index if not exists task_prova_idx on public.task (prova_id);

-- Il lead ricorda la fonte anche sulla prova, per chi arriva dal mirror senza lead.
alter table public.prove add column if not exists origine text not null default 'airtable'
  check (origine in ('airtable', 'mirror', 'sito', 'app'));
alter table public.nuovi_contratti add column if not exists origine text not null default 'airtable'
  check (origine in ('airtable', 'mirror'));
alter table public.disdette add column if not exists origine text not null default 'airtable'
  check (origine in ('airtable', 'mirror'));
alter table public.lead add column if not exists origine text not null default 'airtable'
  check (origine in ('airtable', 'app'));

-- ---------------------------------------------------------------------------
-- La persona: trovarla o crearla
-- ---------------------------------------------------------------------------

-- Per socio, poi email, poi telefono; altrimenti la si crea. Ritorna l'id.
create or replace function crm.persona(p_nome text, p_cognome text, p_email text, p_telefono text, p_member_id bigint default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  u uuid;
  e text := public.normalizza_email(p_email);
  t text := public.normalizza_telefono(p_telefono);
begin
  if p_member_id is not null then
    select id into u from public.utenti where member_id = p_member_id order by creato_il limit 1;
  end if;
  if u is null and e is not null then
    select id into u from public.utenti where email_norm = e order by (member_id is not null) desc, creato_il limit 1;
  end if;
  if u is null and t is not null then
    select id into u from public.utenti where telefono_norm = t order by (member_id is not null) desc, creato_il limit 1;
  end if;

  if u is null then
    insert into public.utenti (nome, cognome, email, telefono, member_id)
    values (nullif(trim(p_nome), ''), nullif(trim(p_cognome), ''), nullif(trim(p_email), ''), nullif(trim(p_telefono), ''), p_member_id)
    returning id into u;
  else
    update public.utenti
       set member_id = coalesce(member_id, p_member_id),
           email = coalesce(email, nullif(trim(p_email), '')),
           telefono = coalesce(telefono, nullif(trim(p_telefono), '')),
           nome = coalesce(nome, nullif(trim(p_nome), '')),
           cognome = coalesce(cognome, nullif(trim(p_cognome), '')),
           aggiornato_il = now()
     where id = u;
  end if;
  return u;
end;
$$;

create or replace function crm.persona_del_socio(p_member_id bigint)
returns uuid
language sql
set search_path = ''
as $$
  select crm.persona(m.nome, m.cognome, m.email, m.telefono, m.id)
    from perfectgym.members m where m.id = p_member_id
$$;

-- ---------------------------------------------------------------------------
-- Dal mirror
-- ---------------------------------------------------------------------------

create or replace function crm.e_pass(p_piano text) returns boolean
language sql immutable set search_path = '' as $$ select coalesce(p_piano, '') ~* 'pass|prova|guest' $$;

create or replace function crm.nuovi_contratti_dal_mirror()
returns int
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  insert into public.nuovi_contratti (contract_id, utente_id, member_id, creato_il, origine)
  select c.id, crm.persona_del_socio(c.member_id), c.member_id,
         coalesce((c.dati ->> 'signUpDate')::timestamptz, now()), 'mirror'
    from perfectgym.contracts c
    join perfectgym.payment_plans p on p.id = c.payment_plan_id
   where not c.is_deleted
     and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and c.data_firma >= (crm.dal_vivo_dal() at time zone 'Europe/Rome')::date
     and not coalesce(c.aggiuntivo, false)
     and not crm.e_pass(p.nome)
     and not exists (select 1 from public.nuovi_contratti n where n.contract_id = c.id)
  on conflict (contract_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Le disdette che c'erano gia' al passaggio (contratti in corso con una data
-- di disdetta): sono state lavorate su Airtable, anche quando li' il
-- contratto non era segnato. Entrano solo quelle che compaiono dopo.
create table if not exists crm.disdette_note (
  contract_id bigint primary key,
  notata_il   timestamptz not null default now()
);
insert into crm.disdette_note (contract_id)
select c.id from perfectgym.contracts c
 where not c.is_deleted and c.data_disdetta is not null
on conflict do nothing;

create or replace function crm.disdette_dal_mirror()
returns int
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  insert into public.disdette (contract_id, utente_id, member_id, data_disdetta, creato_il, origine)
  select c.id, crm.persona_del_socio(c.member_id), c.member_id, c.data_disdetta, now(), 'mirror'
    from perfectgym.contracts c
    join perfectgym.payment_plans p on p.id = c.payment_plan_id
   where not c.is_deleted
     and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and c.data_disdetta is not null
     and coalesce(p.canone, 0) <> 0
     and not crm.e_pass(p.nome)
     and not exists (select 1 from crm.disdette_note k where k.contract_id = c.id)
     and not exists (select 1 from public.disdette d where d.contract_id = c.id)
  on conflict (contract_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function crm.prove_dal_mirror()
returns int
language plpgsql
set search_path = ''
as $$
declare n int := 0; k int;
begin
  -- 1. Le prove che ci sono gia' senza contratto: il pass della stessa persona
  --    iniziato entro tre giorni.
  update public.prove pr set contract_id = x.contract_id
    from (select distinct on (c.id) pr2.id as prova_id, c.id as contract_id
            from public.prove pr2
            join public.utenti u on u.id = pr2.utente_id and u.member_id is not null
            join perfectgym.contracts c on c.member_id = u.member_id and not c.is_deleted
            join perfectgym.payment_plans pp on pp.id = c.payment_plan_id and crm.e_pass(pp.nome)
           where pr2.contract_id is null
             and pr2.data_inizio >= crm.dal_vivo_dal() - interval '7 days'
             and c.data_inizio between (pr2.data_inizio at time zone 'Europe/Rome')::date - 3
                                   and (pr2.data_inizio at time zone 'Europe/Rome')::date + 3
           order by c.id, pr2.creato_il desc) x
   where x.prova_id = pr.id
     and not exists (select 1 from public.prove o where o.contract_id = x.contract_id);
  get diagnostics k = row_count; n := n + k;

  -- 2. I pass nuovi senza prova: la prova nasce qui.
  insert into public.prove (utente_id, contract_id, tipo_pass, data_inizio, data_fine, creato_il, origine)
  select crm.persona_del_socio(c.member_id), c.id, p.nome,
         (c.data_inizio::timestamp at time zone 'Europe/Rome'),
         ((c.data_fine + 1)::timestamp at time zone 'Europe/Rome') - interval '1 second',
         now(), 'mirror'
    from perfectgym.contracts c
    join perfectgym.payment_plans p on p.id = c.payment_plan_id
   where not c.is_deleted
     and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and crm.e_pass(p.nome)
     and c.data_inizio >= (crm.dal_vivo_dal() at time zone 'Europe/Rome')::date
     and not exists (select 1 from public.prove o where o.contract_id = c.id)
  on conflict (contract_id) do nothing;
  get diagnostics k = row_count; n := n + k;

  -- 3. La prova nasce da un lead: il piu' recente della persona.
  update public.prove pr set lead_id = x.lead_id
    from (select pr2.id, (select l.id from public.lead l
                           where l.utente_id = pr2.utente_id and l.creato_il <= pr2.creato_il + interval '1 day'
                           order by l.creato_il desc limit 1) as lead_id
            from public.prove pr2 where pr2.lead_id is null and pr2.origine = 'mirror') x
   where x.id = pr.id and x.lead_id is not null;

  -- 4. Chi segue la prova, se non e' detto: chi ha il lead.
  update public.prove pr set gestito_da = l.assegnato_a
    from public.lead l
   where l.id = pr.lead_id and pr.gestito_da is null and l.assegnato_a is not null and pr.esito is null;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Da Airtable, finche' n8n ci scrive i lead
-- ---------------------------------------------------------------------------

create or replace function airtable.importa_nuovi_lead()
returns int
language plpgsql
set search_path = ''
as $$
declare
  r record;
  u uuid;
  l uuid;
  pr uuid;
  f text;
  n int := 0;
begin
  for r in
    select a.id, a.creato_il, a.dati,
           a.dati ->> 'Tipologia Opportunità' as tipo,
           airtable.testo(a.dati ->> 'Fonte') as fonte_airtable
      from airtable.record a
     where a.tabella = 'Lista Opportunità'
       and a.creato_il >= crm.dal_vivo_dal()
       and a.dati ->> 'Tipologia Opportunità' in ('Lead', 'Referral', 'Tour', 'Pass')
       and coalesce(a.dati ->> 'Fonte', '') !~* 'test'
       and not exists (select 1 from public.lead x where x.airtable_id = a.id)
     order by a.creato_il
  loop
    u := crm.persona(r.dati ->> 'Nome', r.dati ->> 'Cognome', r.dati ->> 'Email', r.dati ->> 'Cellulare');
    f := case
      when r.tipo = 'Tour' then 'tour'
      when r.tipo = 'Referral' then 'referral'
      when r.fonte_airtable ~* 'meta ads|fb \| paid' then 'meta'
      when r.fonte_airtable ~* 'sitoweb|btn_|floating|ply \||chatgpt|acquedotti' then 'sito'
      when r.fonte_airtable ~* '^tour$' then 'tour'
      else 'altro' end;

    insert into public.lead (utente_id, fonte, fonte_dettaglio, attivita_interesse, orario_ricontatto, presentato_da,
                             telefono_presentatore, meta_campagna, meta_adset, meta_form, fase, esito, chiuso_il,
                             creato_il, aggiornato_il, airtable_id)
    values (u, f,
            case f when 'sito' then coalesce(lower(substring(r.fonte_airtable from '(?i)(btn_[a-z_]+|floating[-_]btn)')), r.fonte_airtable)
                   when 'meta' then coalesce(airtable.testo(r.dati ->> 'META: Campaign Name'), r.fonte_airtable)
                   else nullif(r.fonte_airtable, 'TOUR') end,
            airtable.testo(r.dati ->> 'Attività di interesse'),
            airtable.testo(r.dati ->> 'Orario di Ricontatto Desiderato'),
            airtable.testo(r.dati ->> 'Presentato da'),
            airtable.testo(r.dati ->> 'Telefono Referrer'),
            airtable.testo(r.dati ->> 'META: Campaign Name'),
            airtable.testo(r.dati ->> 'META: Ad Set'),
            airtable.testo(r.dati ->> 'META: Nome Form'),
            case when r.tipo = 'Pass' then 'vinta' else 'da_gestire' end,
            case when r.tipo = 'Pass' then 'prova' end,
            case when r.tipo = 'Pass' then r.creato_il end,
            coalesce(airtable.ts(r.dati ->> 'Data di creazione'), r.creato_il), now(), r.id)
    returning id into l;

    if r.tipo = 'Pass' then
      -- La prova puo' essere gia' arrivata dal mirror: si aggancia a quella.
      select id into pr from public.prove
       where utente_id = u and lead_id is null
         and data_inizio between coalesce(airtable.ts(r.dati ->> 'Data di inizio Prova'), r.creato_il) - interval '3 days'
                             and coalesce(airtable.ts(r.dati ->> 'Data di inizio Prova'), r.creato_il) + interval '3 days'
       order by creato_il desc limit 1;
      if pr is not null then
        update public.prove set lead_id = l where id = pr;
      else
        insert into public.prove (utente_id, lead_id, tipo_pass, data_inizio, data_fine, creato_il, airtable_id, origine)
        values (u, l, coalesce(airtable.testo(r.dati ->> 'Tipo di Prova Attivata'), airtable.testo(r.dati ->> 'Attività di interesse')),
                coalesce(airtable.ts(r.dati ->> 'Data di inizio Prova'), r.creato_il),
                airtable.ts(r.dati ->> 'Data di fine Prova'), r.creato_il, r.id, 'sito')
        on conflict (airtable_id) do nothing;
      end if;
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- La telefonata di fine prova
-- ---------------------------------------------------------------------------

create or replace function crm.task_fine_prova()
returns int
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  insert into public.task (utente_id, lead_id, prova_id, tipo, data, nota, assegnato_a, autore_nome)
  select pr.utente_id, pr.lead_id, pr.id, 'telefonata',
         greatest(pr.data_fine - interval '2 days', now()),
         'La prova finisce il ' || to_char(pr.data_fine at time zone 'Europe/Rome', 'DD/MM') ||
         ': chiamare per l''iscrizione.',
         coalesce(pr.gestito_da, l.assegnato_a), 'CRM (automatico)'
    from public.prove pr
    left join public.lead l on l.id = pr.lead_id
   where pr.esito is null
     and pr.data_fine between now() and now() + interval '2 days'
     and not exists (select 1 from public.task t where t.prova_id = pr.id);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tutto insieme
-- ---------------------------------------------------------------------------

create table if not exists crm.alimenta_log (
  id bigint generated always as identity primary key,
  il timestamptz not null default now(),
  esito jsonb,
  errore text
);

create or replace function crm.alimenta()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare out jsonb;
begin
  out := jsonb_build_object(
    'lead_da_airtable', airtable.importa_nuovi_lead(),
    'nuovi_contratti', crm.nuovi_contratti_dal_mirror(),
    'disdette', crm.disdette_dal_mirror(),
    'prove', crm.prove_dal_mirror(),
    'task_fine_prova', crm.task_fine_prova());
  insert into crm.alimenta_log (esito) values (out);
  delete from crm.alimenta_log where il < now() - interval '14 days';
  return out;
exception when others then
  insert into crm.alimenta_log (errore) values (sqlerrm);
  return jsonb_build_object('errore', sqlerrm);
end;
$$;

-- La ricostruzione da Airtable adesso non si puo' piu' fare: nel CRM ci sono
-- righe nate dal mirror. E' voluto.

select cron.unschedule(jobid) from cron.job where jobname = 'crm-alimenta';
select cron.schedule('crm-alimenta', '*/5 * * * *', $cron$ select crm.alimenta() $cron$);
