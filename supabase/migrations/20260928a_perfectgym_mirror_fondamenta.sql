-- Il mirror di PerfectGym: le fondamenta
--
-- Lo scopo e' avere qui dentro **tutto** il database di PerfectGym di Passion
-- Fitness (passion.perfectgym.com), tenuto aggiornato, cosi' che query,
-- automazioni e l'app partano da Supabase - e, un giorno, che PerfectGym si
-- possa sostituire senza perdere niente.
--
-- E' la stessa macchina costruita per Athlon il 28/09/2026 (repo APP-ATHLON,
-- migrazioni 20260928d..j), portata qui nella sua forma finale in un file solo:
-- il progetto e' nuovo e non ha una storia da ripercorrere.
--
-- Vive nello schema `perfectgym`, non esposto da PostgREST. Ci scrivono solo le
-- Edge Function `perfectgym-sync` e `perfectgym-webhook`, collegandosi
-- direttamente al database.
--
-- Come funziona:
--   - `entita` dice cosa scaricare: una riga per entity set di PerfectGym, con
--     la tabella di destinazione, il campo che fa da cursore e le colonne da
--     tenere tipizzate accanto alla riga intera;
--   - `crea_tabella()` crea la tabella di un'entita' da quella configurazione;
--   - `salva()` riceve una pagina dell'API (fino a 500 righe) e fa l'upsert;
--   - `sync_stato` tiene, per ogni entita', fin dove si e' arrivati;
--   - `webhook_eventi` tiene ogni evento arrivato da PerfectGym.
--
-- Il cursore e' `version` (un contatore unico per tutto il database di
-- PerfectGym, che cresce a ogni modifica): si scarica con
-- `$filter=version gt <cursore>&$orderby=version`, pagina dopo pagina, e a
-- download finito lo stesso cursore continua a raccogliere le novita'. Le
-- entita' senza `version` usano `id` e si rileggono da capo ogni tot ore
-- (`riscansione_ore`). Niente `$skip`: se una riga cambia mentre si scarica,
-- le pagine con `$skip` scivolano e se ne perde qualcuna.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create extension if not exists pgcrypto with schema extensions;

create schema if not exists perfectgym;
revoke all on schema perfectgym from public, anon, authenticated;
comment on schema perfectgym is
  'Copia del database di PerfectGym (passion.perfectgym.com), tenuta aggiornata da perfectgym-sync e perfectgym-webhook.';

-- ---------------------------------------------------------------------------
-- Cosa scaricare
-- ---------------------------------------------------------------------------

create table if not exists perfectgym.entita (
  nome              text primary key,          -- entity set di PerfectGym: 'Members'
  tabella           text not null unique,      -- tabella qui dentro: 'members'
  chiave            text not null default 'id',-- campo JSON che identifica la riga
  cursore           text not null default 'version' check (cursore in ('version', 'id')),
  -- Colonne tipizzate accanto a `dati`:
  -- [{"colonna": "member_id", "campo": "memberId", "tipo": "bigint", "indice": true}].
  -- `campo` accetta un percorso con i punti ("amount.gross"); `tipo` e' un tipo
  -- Postgres; `indice` crea un indice sulla colonna.
  colonne           jsonb not null default '[]',
  ordine            int not null default 100,  -- in che ordine le prende il sync
  attiva            boolean not null default false,
  intervallo_minuti int not null default 60,
  riscansione_ore   int,                       -- solo cursore 'id': ogni quante ore rileggerla da capo
  percorso          text,
  filtro            text,
  espandi           text,
  note              text
);

comment on column perfectgym.entita.intervallo_minuti is
  'Finito il download, ogni quanti minuti ricontrollare le novita''. Durante il download iniziale non conta: si va avanti a ogni giro.';
comment on column perfectgym.entita.percorso is
  'L''entity set di PerfectGym da chiamare, se diverso da nome (MemberLevels si legge da Members).';
comment on column perfectgym.entita.filtro is
  'Una condizione OData da aggiungere, con and, a quella del cursore.';
comment on column perfectgym.entita.espandi is
  'Un $expand da aggiungere alla richiesta. Dentro un $expand PerfectGym restituisce al massimo 100 elementi.';

create table if not exists perfectgym.sync_stato (
  entita           text primary key references perfectgym.entita (nome) on delete cascade,
  fase             text not null default 'iniziale' check (fase in ('iniziale', 'delta')),
  cursore          bigint not null default 0,
  righe_lette      bigint not null default 0,
  pagine_lette     int not null default 0,
  iniziato_il      timestamptz,
  completato_il    timestamptz,               -- fine dell'ultimo giro completo
  ultimo_giro_il   timestamptz,
  ultimo_errore    text,
  ultimo_errore_il timestamptz
);

create table if not exists perfectgym.sync_log (
  id          bigint generated always as identity primary key,
  entita      text not null,
  iniziato_il timestamptz not null default now(),
  durata_ms   int,
  righe       int,
  cursore_da  bigint,
  cursore_a   bigint,
  errore      text
);
create index if not exists sync_log_entita_idx on perfectgym.sync_log (entita, iniziato_il desc);

-- Un solo giro alla volta: pg_cron chiama ogni minuto, e un giro lento non
-- deve sovrapporsi al successivo.
create table if not exists perfectgym.sync_lucchetto (
  id     int primary key default 1 check (id = 1),
  fino_a timestamptz
);
insert into perfectgym.sync_lucchetto (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Creare la tabella di un'entita'
-- ---------------------------------------------------------------------------

create or replace function perfectgym.crea_tabella(p_entita text)
returns void
language plpgsql
as $$
declare
  e perfectgym.entita;
  c jsonb;
  extra text := '';
begin
  select * into e from perfectgym.entita where nome = p_entita;
  if not found then
    raise exception 'Entita'' % non configurata', p_entita;
  end if;

  for c in select * from jsonb_array_elements(e.colonne) loop
    extra := extra || format(', %I %s', c->>'colonna', c->>'tipo');
  end loop;

  execute format(
    'create table if not exists perfectgym.%I (
       id bigint primary key,
       version bigint,
       is_deleted boolean not null default false,
       dati jsonb not null,
       sincronizzato_il timestamptz not null default now()%s
     )', e.tabella, extra);

  -- Colonne aggiunte alla configurazione dopo la creazione.
  for c in select * from jsonb_array_elements(e.colonne) loop
    execute format('alter table perfectgym.%I add column if not exists %I %s',
                   e.tabella, c->>'colonna', c->>'tipo');
    if (c->>'indice')::boolean then
      execute format('create index if not exists %I on perfectgym.%I (%I)',
                     e.tabella || '_' || (c->>'colonna') || '_idx', e.tabella, c->>'colonna');
    end if;
  end loop;

  execute format('create index if not exists %I on perfectgym.%I (version)',
                 e.tabella || '_version_idx', e.tabella);

  insert into perfectgym.sync_stato (entita) values (p_entita) on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Salvare una pagina dell'API
-- ---------------------------------------------------------------------------

-- L'espressione che estrae un campo dalla riga JSON `r`, gia' convertita.
create or replace function perfectgym.espressione(p_campo text, p_tipo text)
returns text
language sql
immutable
as $$
  select case
    -- Le date di PerfectGym sono date-ora ("2024-07-01T00:00:00"): per una
    -- data secca conta la parte scritta, senza passare dal fuso.
    when p_tipo = 'date' then format('left(r #>> %L, 10)::date', string_to_array(p_campo, '.'))
    else format('(r #>> %L)::%s', string_to_array(p_campo, '.'), p_tipo)
  end
$$;

-- L'unico punto che scrive nel mirror. Due guardie:
--   - una riga arrivata due volte nella stessa pagina (su MemberCards e
--     Crm2Leads PerfectGym lo fa) diventa una, la piu' recente per `version`:
--     un `on conflict do update` non puo' toccare due volte la stessa riga;
--   - una riga non si sovrascrive mai con una `version` piu' vecchia, perche'
--     sync e webhook scrivono sulle stesse righe e l'ordine d'arrivo non deve
--     decidere. Senza `version` (entita' lette per id) vince l'ultima.
create or replace function perfectgym.salva(p_entita text, p_righe jsonb)
returns table (righe int, cursore_max bigint)
language plpgsql
as $$
declare
  e perfectgym.entita;
  c jsonb;
  nomi text := 'id, version, is_deleted, dati, sincronizzato_il';
  valori text;
  aggiorna text := 'version = excluded.version, is_deleted = excluded.is_deleted, dati = excluded.dati, sincronizzato_il = excluded.sincronizzato_il';
  n int;
begin
  select * into e from perfectgym.entita where nome = p_entita;
  if not found then
    raise exception 'Entita'' % non configurata', p_entita;
  end if;

  valori := format('(r ->> %L)::bigint, (r ->> ''version'')::bigint, coalesce((r ->> ''isDeleted'')::boolean, false), r, now()', e.chiave);

  for c in select * from jsonb_array_elements(e.colonne) loop
    nomi := nomi || format(', %I', c->>'colonna');
    valori := valori || ', ' || perfectgym.espressione(c->>'campo', c->>'tipo');
    aggiorna := aggiorna || format(', %1$I = excluded.%1$I', c->>'colonna');
  end loop;

  execute format(
    'insert into perfectgym.%1$I as t (%2$s)
       select %3$s
         from (select distinct on ((r ->> %5$L)::bigint) r
                 from jsonb_array_elements($1) r
                order by (r ->> %5$L)::bigint, (r ->> ''version'')::bigint desc nulls last) u
     on conflict (id) do update set %4$s
       where t.version is null or excluded.version is null or excluded.version >= t.version',
    e.tabella, nomi, valori, aggiorna, e.chiave)
  using p_righe;
  get diagnostics n = row_count;

  righe := n;
  select max((r ->> case e.cursore when 'version' then 'version' else e.chiave end)::bigint)
    into cursore_max
    from jsonb_array_elements(p_righe) r;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- I webhook
-- ---------------------------------------------------------------------------

-- PerfectGym manda un evento quando succede qualcosa. L'evento porta pochi
-- dati: e' un campanello. `perfectgym-webhook` lo scrive qui cosi' com'e',
-- risponde 200 e rilegge da PerfectGym le righe che tocca. Cio' che non riesce
-- resta con l'errore, e il job `perfectgym-webhook-coda` lo riprova.
create table if not exists perfectgym.webhook_eventi (
  id            bigint generated always as identity primary key,
  ricevuto_il   timestamptz not null default now(),
  evento        text,
  scattato_il   timestamptz,              -- `triggeredDate` di PerfectGym
  member_id     bigint,
  payload       jsonb not null,
  hash          text not null unique,     -- md5 del corpo: le ripetizioni si fermano qui
  stato         text not null default 'da_fare' check (stato in ('da_fare', 'in_corso', 'fatto', 'errore', 'ignorato')),
  tentativi     int not null default 0,
  preso_il      timestamptz,
  elaborato_il  timestamptz,
  riletto       jsonb,                    -- cosa e' stato riletto: {"Contracts": 1, "Members": 1}
  errore        text
);
create index if not exists webhook_eventi_coda_idx on perfectgym.webhook_eventi (stato, ricevuto_il) where stato in ('da_fare', 'in_corso', 'errore');
create index if not exists webhook_eventi_evento_idx on perfectgym.webhook_eventi (evento, ricevuto_il desc);
create index if not exists webhook_eventi_member_idx on perfectgym.webhook_eventi (member_id);

comment on table perfectgym.webhook_eventi is
  'Ogni evento arrivato da PerfectGym, cosi'' com''e'', con lo stato della sua rilettura. Per UserCardScanned e'' l''unica fonte.';

-- Prende in carico un lotto di eventi da elaborare, senza che due chiamate
-- prendano lo stesso: quelli nuovi, quelli in errore sotto i cinque tentativi,
-- e quelli rimasti "in corso" da piu' di cinque minuti (una chiamata morta).
create or replace function perfectgym.webhook_prendi(p_limite int default 50, p_ids bigint[] default null)
returns setof perfectgym.webhook_eventi
language sql
as $$
  update perfectgym.webhook_eventi w
     set stato = 'in_corso', preso_il = now(), tentativi = w.tentativi + 1
   where w.id in (
     select id from perfectgym.webhook_eventi
      where (p_ids is null or id = any(p_ids))
        and (stato = 'da_fare'
             or (stato = 'errore' and tentativi < 5)
             or (stato = 'in_corso' and preso_il < now() - interval '5 minutes'))
        and ricevuto_il > now() - interval '7 days'
      order by id
      limit p_limite
      for update skip locked)
  returning w.*
$$;

-- ---------------------------------------------------------------------------
-- I token, nel Vault
-- ---------------------------------------------------------------------------

-- Generati qui: le funzioni li rileggono dal database, e nessuno deve copiarli
-- a mano da nessuna parte (salvo il token del webhook, che va nell'URL
-- registrato su PerfectGym).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'perfectgym_sync_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'perfectgym_sync_token',
      'Token con cui pg_cron chiama le Edge Function perfectgym-*');
  end if;
  if not exists (select 1 from vault.secrets where name = 'perfectgym_webhook_token') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(24), 'hex'),
      'perfectgym_webhook_token',
      'Token nell''URL del webhook registrato su PerfectGym (?t=...)');
  end if;
end;
$$;
