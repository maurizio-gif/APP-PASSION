-- Il CRM di Passion: le fondamenta
--
-- Lo schema e' quello concordato nella riunione del 28/09/2026 («Update
-- Passion»): pochi contenitori, ognuno col suo lavoro.
--
--   lead             chi arriva: dal sito (richiesta di prova), dal tour
--                    (walk-in), dal referral, da Meta. Tre fasi:
--                      da_gestire   non assegnato: si mettono i commenti
--                                   finche' non c'e' un contatto qualificato;
--                      in_gestione  preso in carico da un operatore, che ne e'
--                                   il responsabile (riassegnabile da lui o da
--                                   un admin);
--                      vinta/persa  vinta = prova attivata o contratto.
--   prove            i pass attivati (7 o 10 giorni), ordinati per scadenza:
--                    li' si segue la settimana di prova.
--   nuovi_contratti  ogni contratto nuovo si controlla: metodo di pagamento,
--                    codice fiscale, tesseramento, fonte. Poi e' gestito.
--   disdette         chi disdice, e com'e' andata la chiamata.
--
-- Accanto: `utenti` (una persona sola, riconosciuta da telefono o email e
-- agganciata al socio di PerfectGym), `staff` (gli operatori), `commenti` e
-- `task` (le azioni, assegnabili anche a un altro operatore).
--
-- I dati di PerfectGym (contratti, piani, date, pagamenti, ingressi) non si
-- copiano qui: stanno nel mirror, schema `perfectgym`, e si leggono da li' per
-- `member_id` e `contract_id`. Qui sta solo il lavoro degli operatori.
--
-- Tutte le tabelle hanno la RLS accesa e nessuna policy: dal client non si
-- leggono. L'accesso lo dara' l'app, quando ci sara'.
--
-- Rinnovi e Customer Care (su Airtable 358 e 13 opportunita') per ora restano
-- fuori, per scelta: si decidono dopo.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- Il telefono, in una forma sola
-- ---------------------------------------------------------------------------

-- Su Airtable lo stesso numero compare come "+39 333 1234567", "(333)
-- 123-4567" (il formato americano del campo telefono), "3331234567". Qui
-- diventa +393331234567, e con quello si cercano e si riconoscono le persone.
create or replace function public.normalizza_telefono(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  with c as (
    select case when trim(coalesce(p, '')) like '+%' then '+' else '' end
           || regexp_replace(coalesce(p, ''), '\D', '', 'g') as t
  )
  select case
    when length(regexp_replace(t, '\D', '', 'g')) < 6 then null
    when t like '+%'                          then t
    when t like '00%'                         then '+' || substr(t, 3)
    when t ~ '^3\d{8,9}$'                     then '+39' || t          -- cellulare italiano
    when t ~ '^0\d{5,10}$'                    then '+39' || t          -- fisso italiano
    when t ~ '^39\d{9,10}$'                   then '+' || t
    else '+' || t
  end
  from c
$$;

create or replace function public.normalizza_email(p text)
returns text
language sql
immutable
set search_path = ''
as $$ select nullif(lower(trim(coalesce(p, ''))), '') $$;

-- ---------------------------------------------------------------------------
-- Chi lavora
-- ---------------------------------------------------------------------------

create table if not exists public.staff (
  id            uuid primary key default gen_random_uuid(),
  email         text unique check (email = lower(email)),  -- con questa si entrera' nell'app
  nome          text not null,
  cognome       text,
  ruolo         text not null default 'consulente' check (ruolo in ('admin', 'consulente')),
  attivo        boolean not null default true,
  airtable_nome text unique,                              -- come compare su Airtable: 'NINA'
  creato_il     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Le persone
-- ---------------------------------------------------------------------------

create table if not exists public.utenti (
  id            uuid primary key default gen_random_uuid(),
  nome          text,
  cognome       text,
  email         text,
  email_norm    text generated always as (public.normalizza_email(email)) stored,
  telefono      text,
  telefono_norm text generated always as (public.normalizza_telefono(telefono)) stored,
  member_id     bigint,                                   -- perfectgym.members.id
  data_nascita  date,
  codice_fiscale text,
  note          text,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);
create index if not exists utenti_email_idx on public.utenti (email_norm);
create index if not exists utenti_telefono_idx on public.utenti (telefono_norm);
create index if not exists utenti_member_idx on public.utenti (member_id);
-- La ricerca per nome e cognome, in qualunque ordine li si scriva.
create index if not exists utenti_nome_idx on public.utenti (lower(coalesce(nome, '') || ' ' || coalesce(cognome, '')));

-- ---------------------------------------------------------------------------
-- I contenitori
-- ---------------------------------------------------------------------------

create table if not exists public.lead (
  id                    uuid primary key default gen_random_uuid(),
  utente_id             uuid not null references public.utenti (id),
  fonte                 text not null check (fonte in ('sito', 'tour', 'referral', 'meta', 'altro')),
  fonte_dettaglio       text,          -- il bottone del sito, il canale, la campagna
  attivita_interesse    text,
  orario_ricontatto     text,
  presentato_da         text,          -- referral: chi l'ha portato
  telefono_presentatore text,
  meta_campagna         text,
  meta_adset            text,
  meta_form             text,
  fase                  text not null default 'da_gestire'
                        check (fase in ('da_gestire', 'in_gestione', 'vinta', 'persa')),
  esito                 text check (esito in ('prova', 'contratto')),  -- per le vinte
  assegnato_a           uuid references public.staff (id),
  preso_in_carico_il    timestamptz,
  chiuso_il             timestamptz,
  contract_id           bigint,        -- il contratto (o il pass) che l'ha chiusa
  doppione_di           uuid references public.lead (id),
  note                  text,
  creato_il             timestamptz not null default now(),
  aggiornato_il         timestamptz not null default now(),
  airtable_id           text unique
);
create index if not exists lead_utente_idx on public.lead (utente_id);
create index if not exists lead_fase_idx on public.lead (fase, creato_il desc);
create index if not exists lead_assegnato_idx on public.lead (assegnato_a) where fase = 'in_gestione';

create table if not exists public.prove (
  id            uuid primary key default gen_random_uuid(),
  utente_id     uuid not null references public.utenti (id),
  lead_id       uuid references public.lead (id),
  contract_id   bigint unique,         -- il pass su PerfectGym
  tipo_pass     text,                  -- 'Guest Pass: Sala + Corsi 7gg', ...
  data_inizio   timestamptz,
  data_fine     timestamptz,
  gestito_da    uuid references public.staff (id),
  esito         text check (esito in ('iscritto', 'non_iscritto')),
  obiezione     text,
  insegnante    text,
  note          text,
  creato_il     timestamptz not null default now(),
  airtable_id   text unique
);
create index if not exists prove_scadenza_idx on public.prove (data_fine);
create index if not exists prove_utente_idx on public.prove (utente_id);

create table if not exists public.nuovi_contratti (
  contract_id          bigint primary key,   -- perfectgym.contracts.id
  utente_id            uuid references public.utenti (id),
  member_id            bigint,
  controllo            text not null default 'da_controllare'
                       check (controllo in ('da_controllare', 'in_corso', 'errore', 'controllato')),
  metodo_pagamento_ok  boolean,
  codice_fiscale_ok    boolean,
  tesseramento         text check (tesseramento in ('si', 'gia_presente', 'no')),
  numero_tessera       text,
  errore_asi           text,
  fonte                text,
  referral             text,
  note                 text,
  gestito_da           uuid references public.staff (id),
  gestito_il           timestamptz,
  creato_il            timestamptz not null default now(),
  airtable_id          text unique
);

create table if not exists public.disdette (
  id                 uuid primary key default gen_random_uuid(),
  contract_id        bigint unique,          -- perfectgym.contracts.id, quando si conosce
  utente_id          uuid references public.utenti (id),
  member_id          bigint,
  data_disdetta      date,
  motivo             text,
  contatto           text check (contatto in ('telefonata', 'appuntamento')),
  esito              text check (esito in ('vinto', 'perso', 'standby')),
  gestito_da         uuid references public.staff (id),
  gestito_il         timestamptz,
  valore_contratto   numeric,
  note               text,
  creato_il          timestamptz not null default now(),
  airtable_id        text unique
);
create index if not exists disdette_utente_idx on public.disdette (utente_id);

-- ---------------------------------------------------------------------------
-- Il lavoro sulle persone
-- ---------------------------------------------------------------------------

create table if not exists public.commenti (
  id           uuid primary key default gen_random_uuid(),
  utente_id    uuid not null references public.utenti (id),
  lead_id      uuid references public.lead (id),
  testo        text not null,
  autore_id    uuid references public.staff (id),
  autore_nome  text,                        -- se l'autore non e' (piu') nello staff
  creato_il    timestamptz not null default now(),
  airtable_id  text unique
);
create index if not exists commenti_utente_idx on public.commenti (utente_id, creato_il desc);

create table if not exists public.task (
  id            uuid primary key default gen_random_uuid(),
  utente_id     uuid not null references public.utenti (id),
  lead_id       uuid references public.lead (id),
  tipo          text not null check (tipo in ('telefonata', 'in_sede', 'whatsapp', 'email', 'richiamare', 'appuntamento')),
  data          timestamptz,                -- quando va fatto
  nota          text,
  assegnato_a   uuid references public.staff (id),
  creato_da     uuid references public.staff (id),
  autore_nome   text,
  completato_il timestamptz,
  esito         text check (esito in ('positivo', 'negativo')),
  creato_il     timestamptz not null default now(),
  airtable_id   text unique
);
create index if not exists task_utente_idx on public.task (utente_id, creato_il desc);
create index if not exists task_da_fare_idx on public.task (assegnato_a, data) where completato_il is null;

-- ---------------------------------------------------------------------------
-- Nessuno legge dal client
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['staff', 'utenti', 'lead', 'prove', 'nuovi_contratti', 'disdette', 'commenti', 'task'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lo staff
-- ---------------------------------------------------------------------------

-- Gli operatori (nomi ed email personali) non stanno in questo file: il
-- repository e' pubblico. Si inseriscono a mano nel database, una riga per
-- persona, con `airtable_nome` uguale al nome in maiuscolo della tabella
-- Commerciali di Airtable (serve all'import per riconoscere le assegnazioni):
--
--   insert into public.staff (email, nome, cognome, ruolo, airtable_nome)
--   values ('nome@esempio.it', 'Nome', 'Cognome', 'consulente', 'NOME');
--
-- Il 28/09/2026 sono stati inseriti i 12 utenti dell'interfaccia Airtable
-- «Interface Commerciali» piu' una consulente che ha una pipeline ma nessun
-- accesso (senza email).
