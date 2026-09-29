-- Airtable -> CRM, di continuo, finche' lo staff lavora anche su Airtable
--
-- Il 28/09/2026 il CRM e' andato dal vivo, ma lo staff lavora ancora su
-- Airtable (task, stati delle opportunita', assegnazioni, controlli dei nuovi
-- contratti) e Tour e Meta scrivono i lead solo li'. Qui il CRM li segue:
--
--   trasporto  il workflow n8n «PASSION: Airtable -> Supabase (import CRM)»
--              ogni 5 minuti porta in `airtable.record` i record modificati
--              nell'ultima ora (filterByFormula su LAST_MODIFIED_TIME()), e
--              ogni notte li riporta tutti. `airtable.salva()` scrive solo i
--              record cambiati e li segna da applicare (`applicato_il` vuoto);
--   applicare  `airtable.allinea()`, dentro `crm.alimenta()` ogni 5 minuti,
--              prende i record da applicare e li porta nel CRM con le regole
--              della ricostruzione (20260928g): lead nuovi (come prima),
--              stato e assegnazione delle opportunita', esito delle prove,
--              disdette, rinnovi, task, commenti, controlli dei nuovi
--              contratti.
--
-- Una modifica di Airtable si applica solo se su Airtable quel campo e'
-- cambiato davvero: accanto a ogni riga del CRM resta l'ultimo valore di
-- Airtable applicato (lo stato con la sua data, l'assegnazione, un'impronta
-- di task, commenti e controlli). Cosi' un record che torna perche' e'
-- cambiato un campo calcolato (i lookup dei task) non tocca niente, e quello
-- che si fa nel CRM resta finche' su Airtable non si cambia la stessa cosa.
-- Due eccezioni: un lead vinto dal mirror (un contratto vero su PerfectGym)
-- non si riapre, e un task chiuso nel CRM non si riapre.
--
-- Disdette: quelle che nascono su Airtable (Notifica Disdetta) si agganciano
-- alla disdetta del CRM dello stesso contratto, se c'e' gia' dal mirror;
-- altrimenti nascono. Rinnovi: un contenitore nuovo, `public.rinnovi`, con la
-- sua pagina; Customer Care resta fuori.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- Il trasporto: solo i record cambiati, segnati da applicare
-- ---------------------------------------------------------------------------

alter table airtable.record add column if not exists applicato_il timestamptz;
alter table airtable.record add column if not exists errore text;
-- Quello che c'e' ora e' gia' nel CRM (la ricostruzione del 28/09).
update airtable.record set applicato_il = importato_il where applicato_il is null;
create index if not exists record_da_applicare_idx on airtable.record (tabella) where applicato_il is null;

create or replace function airtable.salva(p_tabella text, p_righe jsonb)
returns int
language plpgsql
as $$
declare
  n int;
begin
  insert into airtable.record as t (tabella, id, creato_il, dati, importato_il)
  select p_tabella,
         r ->> 'id',
         (r ->> 'createdTime')::timestamptz,
         coalesce(r -> 'fields', r - 'id' - 'createdTime'),
         now()
    from (select distinct on (r ->> 'id') r
            from jsonb_array_elements(p_righe) r
           where r ->> 'id' like 'rec%') u
  on conflict (tabella, id) do update
    set creato_il = excluded.creato_il, dati = excluded.dati, importato_il = excluded.importato_il,
        applicato_il = null, errore = null
    where t.dati is distinct from excluded.dati;
  get diagnostics n = row_count;
  if n > 0 or jsonb_array_length(p_righe) > 0 then
    insert into airtable.import_log (tabella, righe) values (p_tabella, n);
  end if;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- L'ultimo valore di Airtable applicato, accanto alle righe del CRM
-- ---------------------------------------------------------------------------

alter table public.lead add column if not exists airtable_stato_il timestamptz;
alter table public.lead add column if not exists airtable_assegnato text;
alter table public.lead add column if not exists airtable_note text;
alter table public.prove add column if not exists airtable_stato_il timestamptz;
alter table public.prove add column if not exists airtable_assegnato text;
alter table public.disdette add column if not exists airtable_stato_il timestamptz;
alter table public.disdette add column if not exists airtable_assegnato text;
alter table public.disdette add column if not exists airtable_note text;
alter table public.nuovi_contratti add column if not exists airtable_impronta text;
alter table public.task add column if not exists airtable_impronta text;
alter table public.commenti add column if not exists airtable_impronta text;

create or replace function airtable.impronta_task(d jsonb) returns text
language sql immutable set search_path = '' as $$
  select md5(concat_ws('|', d ->> 'Tipologia di Task', d ->> 'Data del Task', d ->> 'Nota Task',
                       d ->> 'Completato', d ->> 'ESITO TASK', d -> 'Contatto' ->> 0, d -> 'Autore del Task' ->> 'email'))
$$;

create or replace function airtable.impronta_contratto(d jsonb) returns text
language sql immutable set search_path = '' as $$
  select md5(concat_ws('|', d ->> 'CONTROLLATO', d ->> 'Tesserato', d ->> 'Numero Tessera', d ->> 'ERRORE ASI',
                       d ->> 'Note', d ->> 'REFERRAL', d ->> 'ContractID'))
$$;

create or replace function airtable.impronta_commento(d jsonb) returns text
language sql immutable set search_path = '' as $$
  select md5(concat_ws('|', d ->> 'Testo del commento', d -> 'Link al contatto' ->> 0))
$$;

-- Lo staff di un record Commerciali (il campo «Assegnato a»).
create or replace function airtable.staff_commerciale(p_rec text) returns uuid
language sql stable set search_path = '' as $$
  select s.id from airtable.record c
    join public.staff s on s.airtable_nome = upper(trim(c.dati ->> 'Nome Commerciale'))
   where c.tabella = 'Commerciali' and c.id = p_rec
   limit 1
$$;

-- Le righe gia' nel CRM partono dal valore di Airtable da cui sono nate.
update public.lead l
   set airtable_stato_il = airtable.ts(r.dati ->> 'Last Modified Stato opportunità'),
       airtable_assegnato = r.dati -> 'Assegnato a' ->> 0,
       airtable_note = airtable.testo(r.dati ->> 'Note')
  from airtable.record r
 where r.tabella = 'Lista Opportunità' and r.id = l.airtable_id;

update public.prove p
   set airtable_stato_il = airtable.ts(r.dati ->> 'Last Modified Stato opportunità'),
       airtable_assegnato = r.dati -> 'Assegnato a' ->> 0
  from airtable.record r
 where r.tabella = 'Lista Opportunità' and r.id = p.airtable_id;

update public.disdette d
   set airtable_stato_il = airtable.ts(r.dati ->> 'Last Modified Stato opportunità'),
       airtable_assegnato = r.dati -> 'Assegnato a' ->> 0,
       airtable_note = airtable.testo(r.dati ->> 'Note')
  from airtable.record r
 where r.tabella = 'Lista Opportunità' and r.id = d.airtable_id;

update public.nuovi_contratti n set airtable_impronta = airtable.impronta_contratto(r.dati)
  from airtable.record r where r.tabella = 'NUOVI CONTRATTI' and r.id = n.airtable_id;
update public.task t set airtable_impronta = airtable.impronta_task(r.dati)
  from airtable.record r where r.tabella = 'Task' and r.id = t.airtable_id;
update public.commenti c set airtable_impronta = airtable.impronta_commento(r.dati)
  from airtable.record r where r.tabella = 'Commenti' and r.id = c.airtable_id;

-- ---------------------------------------------------------------------------
-- I rinnovi: il contenitore nuovo
-- ---------------------------------------------------------------------------

create table if not exists public.rinnovi (
  id                 uuid primary key default gen_random_uuid(),
  utente_id          uuid references public.utenti (id),
  member_id          bigint,
  contract_id        bigint,                 -- il contratto in scadenza
  piano              text,
  scadenza           date,
  valore             numeric,
  esito              text check (esito in ('rinnovato', 'non_rinnovato')),
  assegnato_a        uuid references public.staff (id),
  gestito_il         timestamptz,
  note               text,
  creato_il          timestamptz not null default now(),
  airtable_id        text unique,
  airtable_stato_il  timestamptz,
  airtable_assegnato text,
  airtable_note      text
);
create index if not exists rinnovi_utente_idx on public.rinnovi (utente_id);
create index if not exists rinnovi_scadenza_idx on public.rinnovi (scadenza);
alter table public.rinnovi enable row level security;
revoke all on public.rinnovi from anon, authenticated;

alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note
  check (sezioni <@ array['lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori', 'abbonamenti']);
alter table public.staff alter column sezioni
  set default array['lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori'];
update public.staff set sezioni = sezioni || array['rinnovi'] where not ('rinnovi' = any (sezioni));

-- ---------------------------------------------------------------------------
-- Applicare un record di Airtable
-- ---------------------------------------------------------------------------

-- La persona di un'opportunita': quella gia' agganciata nel CRM, o trovata
-- (o creata) da socio, email, telefono.
create or replace function airtable.persona_opportunita(p_rec text, d jsonb, p_member bigint default null)
returns uuid
language sql
set search_path = ''
as $$
  select coalesce(
    (select utente_id from public.lead where airtable_id = p_rec),
    (select utente_id from public.prove where airtable_id = p_rec),
    (select utente_id from public.disdette where airtable_id = p_rec),
    (select utente_id from public.rinnovi where airtable_id = p_rec),
    case when coalesce(airtable.testo(d ->> 'Email'), airtable.testo(d ->> 'Cellulare'),
                       airtable.testo(d ->> 'Nome'), airtable.testo(d ->> 'Cognome')) is not null or p_member is not null
         then crm.persona(d ->> 'Nome', d ->> 'Cognome', d ->> 'Email', d ->> 'Cellulare', p_member) end)
$$;

create or replace function airtable.allinea_opportunita(p_rec text, d jsonb, p_creato timestamptz)
returns text
language plpgsql
set search_path = ''
as $$
declare
  tipo text := d ->> 'Tipologia Opportunità';
  stato text := d ->> 'Stato opportunità';
  stato_il timestamptz := airtable.ts(d ->> 'Last Modified Stato opportunità');
  ass_rec text := d -> 'Assegnato a' ->> 0;
  ass uuid := airtable.staff_commerciale(d -> 'Assegnato a' ->> 0);
  nota text := airtable.testo(d ->> 'Note');
  cid bigint := (d ->> 'Contract ID')::numeric::bigint;
  mid bigint;
  l public.lead;
  x uuid;
begin
  if coalesce(d ->> 'Fonte', '') ~* 'test' or coalesce(d ->> 'Nome', '') ~* '^\s*test\s*$' then
    return 'test';
  end if;
  select c.member_id into mid from perfectgym.contracts c where c.id = cid and not c.is_deleted;

  -- Lead, Referral, Tour e Pass: il lead (e per il Pass la prova).
  if tipo in ('Lead', 'Referral', 'Tour', 'Pass') then
    select * into l from public.lead where airtable_id = p_rec;
    if l.id is null then
      return 'lead_mancante';
    end if;

    if tipo <> 'Pass' and stato is not null and stato_il is distinct from l.airtable_stato_il then
      update public.lead set
        fase = case
          when stato = 'Vinta' then 'vinta'
          when stato in ('Persa', 'Doppione') then 'persa'
          when l.vinta_contract_id is not null then l.fase     -- vinto dal mirror: resta
          when coalesce(ass, l.assegnato_a) is not null then 'in_gestione'
          else 'da_gestire' end,
        esito = case
          when stato = 'Vinta' then coalesce(
            case when d ->> 'Prova attivata' = 'SI' then 'prova'
                 when cid is not null or airtable.testo(d ->> 'Nome dell''abbonamento') is not null then 'contratto' end, l.esito)
          when stato in ('Persa', 'Doppione') then null
          when l.vinta_contract_id is not null then l.esito
          else null end,
        chiuso_il = case
          when stato in ('Vinta', 'Persa', 'Doppione') then coalesce(stato_il, now())
          when l.vinta_contract_id is not null then l.chiuso_il
          else null end,
        contract_id = coalesce(cid, contract_id),
        airtable_stato_il = stato_il,
        aggiornato_il = now()
      where id = l.id;
    end if;

    if ass_rec is distinct from l.airtable_assegnato then
      update public.lead set
        assegnato_a = coalesce(ass, assegnato_a),
        fase = case when fase = 'da_gestire' and ass is not null then 'in_gestione' else fase end,
        preso_in_carico_il = case when ass is not null then coalesce(preso_in_carico_il, now()) else preso_in_carico_il end,
        airtable_assegnato = ass_rec,
        aggiornato_il = now()
      where id = l.id;
    end if;

    if nota is distinct from l.airtable_note then
      update public.lead set
        note = case when nullif(note, '') is not distinct from l.airtable_note then nota
                    when nota is null then note
                    else concat_ws(E'\n', nullif(note, ''), nota) end,
        airtable_note = nota
      where id = l.id;
    end if;

    if tipo = 'Pass' then
      select id into x from public.prove
       where airtable_id = p_rec or lead_id = l.id
       order by (airtable_id = p_rec) desc nulls last limit 1;
      if x is not null then
        update public.prove p set
          esito = case when stato_il is distinct from p.airtable_stato_il and stato is not null
                       then case stato when 'Vinta' then 'iscritto' when 'Persa' then 'non_iscritto' else p.esito end
                       else p.esito end,
          airtable_stato_il = case when stato is not null then stato_il else p.airtable_stato_il end,
          gestito_da = case when ass_rec is distinct from p.airtable_assegnato then coalesce(ass, p.gestito_da) else p.gestito_da end,
          airtable_assegnato = ass_rec,
          airtable_id = coalesce(p.airtable_id, p_rec)
        where p.id = x;
      end if;
    end if;
    return 'opportunita';
  end if;

  -- Disdette: si aggancia quella del CRM dello stesso contratto, o nasce.
  if tipo = 'Disdetta' then
    select id into x from public.disdette where airtable_id = p_rec;
    if x is null then
      if stato = 'Doppione' then return 'doppione'; end if;
      if cid is not null then
        select id into x from public.disdette where contract_id = cid and airtable_id is null;
      end if;
      if x is not null then
        update public.disdette set airtable_id = p_rec where id = x;
      else
        insert into public.disdette (contract_id, utente_id, member_id, data_disdetta, creato_il, airtable_id, origine)
        values (case when mid is not null and not exists (select 1 from public.disdette where contract_id = cid) then cid end,
                airtable.persona_opportunita(p_rec, d, mid), mid,
                coalesce((select c.data_disdetta from perfectgym.contracts c where c.id = cid), (p_creato at time zone 'Europe/Rome')::date),
                coalesce(airtable.ts(d ->> 'Data di creazione'), p_creato), p_rec, 'airtable')
        returning id into x;
      end if;
    end if;
    update public.disdette t set
      esito = case when stato_il is distinct from t.airtable_stato_il and stato in ('Vinta', 'Persa')
                   then case stato when 'Vinta' then 'vinto' else 'perso' end else t.esito end,
      gestito_il = case when stato_il is distinct from t.airtable_stato_il and stato in ('Vinta', 'Persa')
                        then coalesce(stato_il, now()) else t.gestito_il end,
      airtable_stato_il = coalesce(stato_il, t.airtable_stato_il),
      gestito_da = case when ass_rec is distinct from t.airtable_assegnato then coalesce(ass, t.gestito_da) else t.gestito_da end,
      airtable_assegnato = ass_rec,
      note = case when nota is distinct from t.airtable_note
                  then case when nullif(t.note, '') is not distinct from t.airtable_note then nota
                            when nota is null then t.note else concat_ws(E'\n', nullif(t.note, ''), nota) end
                  else t.note end,
      airtable_note = nota
    where t.id = x;
    return 'disdetta';
  end if;

  -- Rinnovi.
  if tipo = 'Rinnovi' then
    select id into x from public.rinnovi where airtable_id = p_rec;
    if x is null then
      if stato = 'Doppione' then return 'doppione'; end if;
      insert into public.rinnovi (utente_id, member_id, contract_id, piano, scadenza, valore, creato_il, airtable_id)
      values (airtable.persona_opportunita(p_rec, d, mid), mid, cid,
              ltrim(airtable.testo(d ->> 'Nome dell''abbonamento'), '#^ '),
              coalesce(airtable.giorno(d ->> 'Data Scadenza Abbonamento'), airtable.giorno(d ->> 'Data di creazione')),
              (d ->> 'Valore del Contratto')::numeric,
              p_creato, p_rec)
      returning id into x;
    end if;
    update public.rinnovi t set
      esito = case when stato_il is distinct from t.airtable_stato_il and stato is not null
                   then case stato when 'Vinta' then 'rinnovato' when 'Persa' then 'non_rinnovato' else t.esito end
                   else t.esito end,
      gestito_il = case when stato_il is distinct from t.airtable_stato_il and stato in ('Vinta', 'Persa')
                        then coalesce(stato_il, now()) else t.gestito_il end,
      airtable_stato_il = coalesce(stato_il, t.airtable_stato_il),
      assegnato_a = case when ass_rec is distinct from t.airtable_assegnato then coalesce(ass, t.assegnato_a) else t.assegnato_a end,
      airtable_assegnato = ass_rec,
      note = case when nota is distinct from t.airtable_note
                  then case when nullif(t.note, '') is not distinct from t.airtable_note then nota
                            when nota is null then t.note else concat_ws(E'\n', nullif(t.note, ''), nota) end
                  else t.note end,
      airtable_note = nota
    where t.id = x;
    return 'rinnovo';
  end if;

  return 'altro_tipo';
end;
$$;

create or replace function airtable.allinea_task(p_rec text, d jsonb, p_creato timestamptz)
returns text
language plpgsql
set search_path = ''
as $$
declare
  impronta text := airtable.impronta_task(d);
  opp text := d -> 'Contatto' ->> 0;
  t public.task;
  u uuid;
  lid uuid;
  autore uuid := (select s.id from public.staff s where s.email = lower(d -> 'Autore del Task' ->> 'email'));
  v_tipo text := case d ->> 'Tipologia di Task'
    when 'TELEFONATA' then 'telefonata' when 'IN SEDE' then 'in_sede' when 'WHATSAPP' then 'whatsapp'
    when 'EMAIL' then 'email' when 'Appuntamento' then 'appuntamento' else 'richiamare' end;
  fatto timestamptz := case when d ->> 'Completato' = 'Si'
    then coalesce(airtable.ts(d ->> 'Quando un task viene completato'), airtable.ts(d ->> 'Data del Task'), p_creato) end;
  v_esito text := case when lower(d ->> 'ESITO TASK') in ('positivo', 'negativo') then lower(d ->> 'ESITO TASK') end;
begin
  select * into t from public.task where airtable_id = p_rec;
  if t.id is not null and t.airtable_impronta is not distinct from impronta then
    return 'uguale';
  end if;

  select l.id, l.utente_id into lid, u from public.lead l where l.airtable_id = opp;
  if u is null then
    select airtable.persona_opportunita(o.id, o.dati) into u
      from airtable.record o where o.tabella = 'Lista Opportunità' and o.id = opp;
  end if;
  if u is null then
    return 'task_senza_persona';
  end if;

  if t.id is null then
    insert into public.task (utente_id, lead_id, tipo, data, nota, assegnato_a, creato_da, autore_nome,
                             completato_il, esito, creato_il, airtable_id, airtable_impronta)
    values (u, lid, v_tipo, coalesce(airtable.ts(d ->> 'Data del Task'), p_creato), airtable.testo(d ->> 'Nota Task'),
            autore, autore, d -> 'Autore del Task' ->> 'name', fatto, v_esito,
            coalesce(airtable.ts(d ->> 'Created Task'), p_creato), p_rec, impronta);
    update public.utenti set aggiornato_il = now() where id = u;
    return 'task_nuovi';
  end if;

  update public.task set
    utente_id = u, lead_id = coalesce(lid, lead_id), tipo = v_tipo,
    data = coalesce(airtable.ts(d ->> 'Data del Task'), data),
    nota = airtable.testo(d ->> 'Nota Task'),
    -- Un task chiuso nel CRM non si riapre; uno archiviato che su Airtable
    -- e' stato fatto diventa fatto.
    completato_il = case when fatto is not null and (completato_il is null or archiviato) then fatto else completato_il end,
    esito = coalesce(v_esito, esito),
    archiviato = case when fatto is not null then false else archiviato end,
    airtable_impronta = impronta
  where id = t.id;
  return 'task_aggiornati';
end;
$$;

create or replace function airtable.allinea_commento(p_rec text, d jsonb, p_creato timestamptz)
returns text
language plpgsql
set search_path = ''
as $$
declare
  impronta text := airtable.impronta_commento(d);
  v_testo text := airtable.testo(d ->> 'Testo del commento');
  opp text := d -> 'Link al contatto' ->> 0;
  c public.commenti;
  u uuid;
  lid uuid;
begin
  select * into c from public.commenti where airtable_id = p_rec;
  if c.id is not null and c.airtable_impronta is not distinct from impronta then return 'uguale'; end if;
  if v_testo is null then return 'commento_vuoto'; end if;
  if c.id is not null then
    update public.commenti set testo = v_testo, airtable_impronta = impronta where id = c.id;
    return 'commenti_aggiornati';
  end if;
  select l.id, l.utente_id into lid, u from public.lead l where l.airtable_id = opp;
  if u is null then
    select airtable.persona_opportunita(o.id, o.dati) into u
      from airtable.record o where o.tabella = 'Lista Opportunità' and o.id = opp;
  end if;
  if u is null then return 'commento_senza_persona'; end if;
  insert into public.commenti (utente_id, lead_id, testo, autore_id, autore_nome, creato_il, airtable_id, airtable_impronta)
  values (u, lid, v_testo, (select s.id from public.staff s where s.email = lower(d -> 'Autore del commento' ->> 'email')),
          d -> 'Autore del commento' ->> 'name', coalesce(airtable.ts(d ->> 'Created Comment'), p_creato), p_rec, impronta);
  return 'commenti_nuovi';
end;
$$;

-- I controlli dei nuovi contratti. Il contratto si trova dal ContractID, o
-- dal numero socio e dal giorno d'acquisto (come nella ricostruzione).
create or replace function airtable.allinea_contratto(p_rec text, d jsonb, p_creato timestamptz)
returns text
language plpgsql
set search_path = ''
as $$
declare
  impronta text := airtable.impronta_contratto(d);
  n public.nuovi_contratti;
  cid bigint;
  v_controllo text := case d ->> 'CONTROLLATO' when 'SI' then 'controllato' when 'ERRORE' then 'errore'
                                              when 'IN CORSO' then 'in_corso' end;
  tess text := case d ->> 'Tesserato' when 'SI' then 'si' when 'GIA PRESENTE' then 'gia_presente' when 'no' then 'no' end;
begin
  select * into n from public.nuovi_contratti where airtable_id = p_rec;
  if n.contract_id is not null and n.airtable_impronta is not distinct from impronta then return 'uguale'; end if;

  if n.contract_id is null then
    cid := coalesce(
      (select c.id from perfectgym.contracts c where c.id = (d ->> 'ContractID')::numeric::bigint),
      (select c.id
         from perfectgym.members m
         join perfectgym.contracts c on c.member_id = m.id and not c.is_deleted
         left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
        where not m.is_deleted and ltrim(m.numero, '0') = ltrim(d ->> 'User Number', '0')
          and c.data_firma between airtable.giorno(d ->> 'Data Acquisto') - 1 and airtable.giorno(d ->> 'Data Acquisto') + 1
        order by (pp.nome = ltrim(d ->> 'Abbonamento', '^ ')) desc nulls last,
                 coalesce(c.aggiuntivo, false), abs(c.data_firma - airtable.giorno(d ->> 'Data Acquisto')), c.id desc
        limit 1));
    if cid is null then return 'contratto_non_trovato'; end if;
    select * into n from public.nuovi_contratti where contract_id = cid;
    if n.contract_id is not null and n.airtable_id is not null then return 'contratto_doppione'; end if;
    if n.contract_id is not null then
      update public.nuovi_contratti set airtable_id = p_rec where contract_id = cid;
    else
      insert into public.nuovi_contratti (contract_id, utente_id, member_id, creato_il, airtable_id, origine)
      select c.id, crm.persona_del_socio(c.member_id), c.member_id,
             coalesce(airtable.ts(d ->> 'Data Acquisto'), p_creato), p_rec, 'airtable'
        from perfectgym.contracts c where c.id = cid;
    end if;
    select * into n from public.nuovi_contratti where contract_id = cid;
  end if;

  -- Un campo vuoto su Airtable non cancella quello che e' scritto nel CRM;
  -- tesserato vuol dire controllato (20260928j).
  update public.nuovi_contratti t set
    controllo = case
      when v_controllo is not null then v_controllo
      when coalesce(tess, t.tesseramento) in ('si', 'gia_presente') and t.controllo = 'da_controllare' then 'controllato'
      else t.controllo end,
    tesseramento = coalesce(tess, t.tesseramento),
    numero_tessera = coalesce(airtable.testo(d ->> 'Numero Tessera'), t.numero_tessera),
    errore_asi = coalesce(airtable.testo(d ->> 'ERRORE ASI'), t.errore_asi),
    referral = coalesce(airtable.testo(d ->> 'REFERRAL'), t.referral),
    note = coalesce(airtable.testo(d ->> 'Note'), t.note),
    airtable_impronta = impronta
  where t.contract_id = n.contract_id;
  return 'contratti';
end;
$$;

-- Tutti i record da applicare, uno per volta: un record che non va non ferma
-- gli altri (l'errore resta sul record, e si riprova quando cambia).
create or replace function airtable.allinea()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r record;
  esito text;
  conti jsonb := jsonb_build_object('lead_nuovi', airtable.importa_nuovi_lead());
begin
  for r in
    select tabella, id, dati, creato_il from airtable.record
     where applicato_il is null
     order by case tabella when 'Lista Opportunità' then 1 when 'NUOVI CONTRATTI' then 2
                           when 'Commenti' then 3 when 'Task' then 4 else 5 end, creato_il
     limit 3000
  loop
    begin
      esito := case r.tabella
        when 'Lista Opportunità' then airtable.allinea_opportunita(r.id, r.dati, r.creato_il)
        when 'Task' then airtable.allinea_task(r.id, r.dati, r.creato_il)
        when 'Commenti' then airtable.allinea_commento(r.id, r.dati, r.creato_il)
        when 'NUOVI CONTRATTI' then airtable.allinea_contratto(r.id, r.dati, r.creato_il)
        else 'ignorato' end;
      update airtable.record set applicato_il = now(), errore = null where tabella = r.tabella and id = r.id;
    exception when others then
      esito := 'errori';
      update airtable.record set applicato_il = now(), errore = sqlerrm where tabella = r.tabella and id = r.id;
    end;
    conti := jsonb_set(conti, array[esito], to_jsonb(coalesce((conti ->> esito)::int, 0) + 1));
  end loop;
  delete from airtable.import_log where arrivato_il < now() - interval '14 days';
  return conti;
end;
$$;

revoke all on function airtable.allinea(), airtable.allinea_opportunita(text, jsonb, timestamptz),
                       airtable.allinea_task(text, jsonb, timestamptz), airtable.allinea_commento(text, jsonb, timestamptz),
                       airtable.allinea_contratto(text, jsonb, timestamptz), airtable.persona_opportunita(text, jsonb, bigint),
                       airtable.staff_commerciale(text) from public, anon, authenticated;

-- I lead nuovi ora entrano da `airtable.allinea()` (che chiama
-- `airtable.importa_nuovi_lead()` per primo).
create or replace function crm.alimenta()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare out jsonb;
begin
  out := jsonb_build_object(
    'airtable', airtable.allinea(),
    'nuovi_contratti', crm.nuovi_contratti_dal_mirror(),
    'disdette', crm.disdette_dal_mirror(),
    'prove', crm.prove_dal_mirror(),
    'lead_vinti', crm.lead_vinti_dal_mirror(),
    'task_fine_prova', crm.task_fine_prova(),
    'debiti', crm.debiti_dal_mirror());
  insert into crm.alimenta_log (esito) values (out);
  delete from crm.alimenta_log where il < now() - interval '14 days';
  return out;
exception when others then
  insert into crm.alimenta_log (errore) values (sqlerrm);
  return jsonb_build_object('errore', sqlerrm);
end;
$$;

-- ---------------------------------------------------------------------------
-- I rinnovi nell'app
-- ---------------------------------------------------------------------------

-- Lo storico dei rinnovi di Airtable: tutti, senza i doppioni.
insert into public.rinnovi (utente_id, member_id, contract_id, piano, scadenza, valore, esito, assegnato_a, gestito_il,
                            note, creato_il, airtable_id, airtable_stato_il, airtable_assegnato, airtable_note)
select coalesce(
         (select u.id from public.utenti u where u.member_id = c.member_id order by u.creato_il limit 1),
         crm.persona(r.dati ->> 'Nome', r.dati ->> 'Cognome', r.dati ->> 'Email', r.dati ->> 'Cellulare', c.member_id)),
       c.member_id, (r.dati ->> 'Contract ID')::numeric::bigint,
       ltrim(airtable.testo(r.dati ->> 'Nome dell''abbonamento'), '#^ '),
       coalesce(airtable.giorno(r.dati ->> 'Data Scadenza Abbonamento'), airtable.giorno(r.dati ->> 'Data di creazione')),
       (r.dati ->> 'Valore del Contratto')::numeric,
       case r.dati ->> 'Stato opportunità' when 'Vinta' then 'rinnovato' when 'Persa' then 'non_rinnovato' end,
       airtable.staff_commerciale(r.dati -> 'Assegnato a' ->> 0),
       case when r.dati ->> 'Stato opportunità' in ('Vinta', 'Persa')
            then coalesce(airtable.ts(r.dati ->> 'Last Modified Stato opportunità'), r.creato_il) end,
       airtable.testo(r.dati ->> 'Note'), r.creato_il, r.id,
       airtable.ts(r.dati ->> 'Last Modified Stato opportunità'), r.dati -> 'Assegnato a' ->> 0, airtable.testo(r.dati ->> 'Note')
  from airtable.record r
  left join perfectgym.contracts c on c.id = (r.dati ->> 'Contract ID')::numeric::bigint and not c.is_deleted
 where r.tabella = 'Lista Opportunità'
   and r.dati ->> 'Tipologia Opportunità' = 'Rinnovi'
   and r.dati ->> 'Stato opportunità' is distinct from 'Doppione'
on conflict (airtable_id) do nothing;

-- p_vista: da_gestire | rinnovati | non_rinnovati | tutti
create or replace function public.crm_rinnovi(p_vista text default 'da_gestire', p_limite int default 500)
returns table (
  id uuid, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
  contract_id bigint, piano text, scadenza date, valore numeric, stato_contratto text,
  rinnovato_su_pgm boolean, esito text, assegnato_a uuid, assegnato_nome text, gestito_il timestamptz, note text,
  task_aperti int, creato_il timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.richiedi_sezione('rinnovi');
  return query
  select r.id, u.id, coalesce(m.nome, u.nome), coalesce(m.cognome, u.cognome), coalesce(m.telefono, u.telefono),
         coalesce(m.email, u.email), coalesce(r.member_id, u.member_id),
         r.contract_id, coalesce(pp.nome, r.piano), coalesce(c.data_fine, r.scadenza), coalesce(pp.canone, r.valore), c.stato,
         -- Un abbonamento della stessa persona che parte dopo quello in scadenza.
         exists (select 1 from perfectgym.contracts c2
                   join perfectgym.payment_plans p2 on p2.id = c2.payment_plan_id
                  where c2.member_id = coalesce(r.member_id, u.member_id) and not c2.is_deleted and c2.id <> coalesce(r.contract_id, 0)
                    and not coalesce(c2.aggiuntivo, false) and p2.canone > 0
                    and c2.data_inizio >= coalesce(c.data_fine, r.scadenza) - 30),
         r.esito, r.assegnato_a, crm.nome_staff(r.assegnato_a), r.gestito_il, r.note,
         (select count(*)::int from public.task t where t.utente_id = r.utente_id and t.completato_il is null),
         r.creato_il
    from public.rinnovi r
    left join public.utenti u on u.id = r.utente_id
    left join perfectgym.contracts c on c.id = r.contract_id
    left join perfectgym.members m on m.id = coalesce(r.member_id, c.member_id)
    left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
   where case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then r.esito is null
           when 'rinnovati' then r.esito = 'rinnovato'
           when 'non_rinnovati' then r.esito = 'non_rinnovato'
           else true end
   order by case when coalesce(p_vista, 'da_gestire') = 'da_gestire' then coalesce(c.data_fine, r.scadenza) end asc nulls last,
            coalesce(r.gestito_il, r.creato_il) desc
   limit least(greatest(coalesce(p_limite, 500), 1), 1000);
end;
$$;

create or replace function public.crm_rinnovo_aggiorna(p_id uuid, p_esito text, p_assegnato uuid, p_note text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid;
begin
  perform crm.richiedi_sezione('rinnovi');
  me := crm.chi();
  if coalesce(p_esito, '') not in ('', 'rinnovato', 'non_rinnovato') then raise exception 'Esito non valido'; end if;
  update public.rinnovi set
    esito = nullif(p_esito, ''),
    gestito_il = case when nullif(p_esito, '') is distinct from esito then case when nullif(p_esito, '') is null then null else now() end
                      else gestito_il end,
    assegnato_a = coalesce(p_assegnato, assegnato_a, me),
    note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_id;
  if not found then raise exception 'Rinnovo non trovato'; end if;
end;
$$;

revoke all on function public.crm_rinnovi(text, int), public.crm_rinnovo_aggiorna(uuid, text, uuid, text) from public, anon;
grant execute on function public.crm_rinnovi(text, int), public.crm_rinnovo_aggiorna(uuid, text, uuid, text) to authenticated;
