-- Airtable atterra in Supabase, cosi' com'e'
--
-- Il CRM di Passion lascia Airtable (base CRM PASSION FITNESS,
-- apprL0zqZBRXX8J9Z). La migrazione e' in due tempi, come il mirror di
-- PerfectGym:
--
--   1. ogni record di Airtable arriva qui intero, in `airtable.record`: una riga
--      per record, con la tabella di provenienza, l'id `recXXX`, la data di
--      creazione e i campi cosi' come li restituisce l'API (per nome);
--   2. il CRM si costruisce da qui in SQL (20260928f): normalizzare le fonti,
--      fondere i doppioni, ricondurre i telefoni, agganciare la persona al socio
--      di PerfectGym. Se una regola va corretta si corregge e si rilancia, senza
--      tornare su Airtable.
--
-- A portare i record e' il workflow n8n «PASSION: Airtable -> Supabase (import
-- CRM)», che legge con la credenziale Airtable PASSION e manda pagine da 200
-- record all'Edge Function `airtable-atterraggio`. Airtable non viene toccato:
-- solo letture.
--
-- Rilanciare l'import e' sicuro: `airtable.salva()` fa l'upsert sull'id, e un
-- record modificato su Airtable nel frattempo sovrascrive la sua versione.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create schema if not exists airtable;
revoke all on schema airtable from public, anon, authenticated;
comment on schema airtable is
  'Copia grezza della base Airtable CRM PASSION FITNESS, per la migrazione al CRM. Non e'' esposta.';

create table if not exists airtable.record (
  tabella      text not null,            -- nome della tabella su Airtable: 'Lista Opportunità'
  id           text not null,            -- recXXXXXXXXXXXXXX
  creato_il    timestamptz,              -- createdTime di Airtable
  dati         jsonb not null,           -- i campi, per nome
  importato_il timestamptz not null default now(),
  primary key (tabella, id)
);
create index if not exists record_id_idx on airtable.record (id);

comment on table airtable.record is
  'Un record di Airtable per riga, com''e'' arrivato dall''API. Il CRM si ricava da qui (vedi 20260928f).';

create table if not exists airtable.import_log (
  id          bigint generated always as identity primary key,
  arrivato_il timestamptz not null default now(),
  tabella     text,
  righe       int,
  errore      text
);

-- Una pagina di record: [{"id": "rec...", "createdTime": "...", <campi>...}].
-- Il nodo Airtable di n8n mette id e createdTime accanto ai campi: qui si
-- separano, e il resto e' `dati`.
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
    set creato_il = excluded.creato_il, dati = excluded.dati, importato_il = excluded.importato_il;
  get diagnostics n = row_count;
  insert into airtable.import_log (tabella, righe) values (p_tabella, n);
  return n;
end;
$$;

-- Il token che il workflow n8n manda nell'header `x-import-token`.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'airtable_import_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(24), 'hex'),
      'airtable_import_token',
      'Token con cui il workflow n8n di import da Airtable chiama airtable-atterraggio');
  end if;
end;
$$;
