-- I ticket di assistenza, nel CRM
--
-- Fino a oggi i ticket arrivavano da un modulo Google e finivano in un foglio
-- (TICKET ASSISTENZA PASSION): 592 da agosto 2024 a settembre 2026, aperti da
-- quindici persone diverse, un terzo senza risposta scritta. Da qui in avanti
-- passano dal CRM, con le regole decise dopo l'analisi del 30/09/2026:
--
--   - tutti scrivono, il supporto invia. Chiunque dello staff apre una
--     segnalazione (dalla sezione Ticket o dalla scheda del socio); resta «da
--     verificare» finche' chi ha il ruolo supporto (chi segue il desk, e chi
--     lo sostituisce: 20260930a) non la manda a R2D, la risolve al desk o la
--     unisce a un ticket gia' aperto. Il supporto e i superadmin, quando aprono
--     loro, mandano subito;
--   - R2D risponde nel CRM. I superadmin (lo staff di R2D) prendono
--     in carico, chiedono informazioni al desk («in attesa»: il ticket torna in
--     lavorazione alla prima risposta di Passion) e chiudono. Non si chiude senza
--     la natura del ticket, la causa e la soluzione: sono le categorie
--     dell'analisi, e il resoconto mensile esce da solo;
--   - le modifiche le scrive R2D. Il titolare non apre ticket: le modifiche
--     nascono nella riunione settimanale con R2D, che le scrive come «modifica»
--     (cosa cambia, per quali abbonamenti, da quando, cosa si dice ai soci),
--     ne registra la conferma del titolare e, dopo il rilascio, cosa ha verificato.
--     Le proposte del desk (tipo «proposta») non vanno a R2D: aspettano la
--     riunione e si chiudono al desk con quello che si e' deciso.
--
-- Ogni ticket sul socio si porta dietro la fotografia della sua situazione al
-- momento dell'apertura (abbonamento, saldo, certificato, ingressi,
-- prenotazioni), letta dal mirror come nella scheda persona: e' la checklist
-- che prima si chiedeva a voce.
--
-- La numerazione parte da 1001, cosi' un ticket nuovo non si confonde con le
-- righe del vecchio foglio (#2..#593). Gli allegati (foto, video, PDF) stanno
-- nel bucket privato `ticket` di Storage, sotto `<numero ticket>/`: li carica
-- il browser di chi e' entrato, e li legge solo lo staff.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- 1. Tabelle
-- ---------------------------------------------------------------------------

create table if not exists public.ticket (
  id               bigint generated always as identity (start with 1001) primary key,
  tipo             text not null check (tipo in ('guasto', 'domanda', 'attivita', 'proposta', 'modifica')),
  stato            text not null check (stato in ('da_verificare', 'inviato', 'in_lavorazione', 'in_attesa',
                                                  'risolto', 'risolto_desk', 'doppione',
                                                  'da_confermare', 'confermata', 'rilasciata', 'annullata')),
  titolo           text not null check (btrim(titolo) <> ''),
  descrizione      text not null check (btrim(descrizione) <> ''),
  utente_id        uuid references public.utenti (id) on delete set null,
  -- La situazione del socio all'apertura (crm_persona() -> socio, ridotta).
  contesto         jsonb,
  verifiche        text[] not null default '{}'
                   check (verifiche <@ array['contratto_iniziato', 'saldo', 'certificato', 'pacchetto',
                                             'regola_accesso', 'app_riavviata']),
  bloccante        boolean not null default false,
  aperto_da        uuid not null references public.staff (id),
  aperto_il        timestamptz not null default now(),
  inviato_da       uuid references public.staff (id),
  inviato_il       timestamptz,
  preso_da         uuid references public.staff (id),
  preso_il         timestamptz,
  chiuso_da        uuid references public.staff (id),
  chiuso_il        timestamptz,
  doppione_di      bigint references public.ticket (id),
  natura           text check (natura in ('errore_configurazione', 'guasto_terze_parti', 'funziona_come_impostato',
                                          'errore_operativo', 'problema_socio', 'domanda', 'attivita',
                                          'richiesta_modifica')),
  causa            text,
  soluzione        text,
  -- Solo per le modifiche.
  abbonamenti      text,
  dal              date,
  comunicazione    text,
  riunione         date,
  confermata_da    uuid references public.staff (id),
  confermata_il    timestamptz,
  confermata_nota  text,
  aggiornato_il    timestamptz not null default now(),
  constraint ticket_modifica_stati check (
    (tipo = 'modifica') = (stato in ('da_confermare', 'confermata', 'rilasciata', 'annullata')))
);
create index if not exists ticket_stato_idx on public.ticket (stato);
create index if not exists ticket_utente_idx on public.ticket (utente_id);
create index if not exists ticket_aperto_da_idx on public.ticket (aperto_da);
alter table public.ticket enable row level security;
revoke all on public.ticket from anon, authenticated;

-- Il filo del ticket: i messaggi di Passion e di R2D, e i passaggi di stato
-- (`evento`: inviato, preso, in_attesa, risolto, ...), in ordine di tempo.
create table if not exists public.ticket_messaggi (
  id         bigint generated always as identity primary key,
  ticket_id  bigint not null references public.ticket (id) on delete cascade,
  autore     uuid not null references public.staff (id),
  lato       text not null check (lato in ('passion', 'r2d')),
  testo      text,
  evento     text,
  creato_il  timestamptz not null default now(),
  check (coalesce(btrim(testo), '') <> '' or evento is not null)
);
create index if not exists ticket_messaggi_ticket_idx on public.ticket_messaggi (ticket_id, creato_il);
alter table public.ticket_messaggi enable row level security;
revoke all on public.ticket_messaggi from anon, authenticated;

create table if not exists public.ticket_allegati (
  id            bigint generated always as identity primary key,
  ticket_id     bigint not null references public.ticket (id) on delete cascade,
  messaggio_id  bigint references public.ticket_messaggi (id) on delete set null,
  percorso      text not null unique,
  nome          text not null,
  tipo          text,
  dimensione    bigint,
  caricato_da   uuid not null references public.staff (id),
  caricato_il   timestamptz not null default now()
);
create index if not exists ticket_allegati_ticket_idx on public.ticket_allegati (ticket_id);
alter table public.ticket_allegati enable row level security;
revoke all on public.ticket_allegati from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. La sezione
-- ---------------------------------------------------------------------------

alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note
  check (sezioni <@ array['lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori',
                          'abbonamenti', 'ticket']);
alter table public.staff alter column sezioni
  set default array['lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori', 'ticket'];
-- Tutti scrivono: la sezione la ricevono tutti quelli che ci sono.
update public.staff set sezioni = sezioni || array['ticket'] where not ('ticket' = any (sezioni));

-- ---------------------------------------------------------------------------
-- 3. Le regole
-- ---------------------------------------------------------------------------

-- Chi smista i ticket del desk: il supporto e i superadmin. Chi li lavora e li
-- chiude (l'assistenza): i superadmin, cioe' R2D. Un admin di Passion i ticket
-- li apre e li legge, ma non li smista e non li chiude.
create or replace function crm.smista() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((crm.io()).ruolo in ('supporto', 'superadmin'), false) $$;

create or replace function crm.assiste() returns boolean
language sql stable security definer set search_path = ''
as $$ select crm.e_superadmin() $$;

-- Da che parte scrive un operatore: R2D i superadmin, Passion tutti gli altri.
create or replace function crm.ticket_lato(p_staff uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case when exists (select 1 from public.staff s where s.id = p_staff and s.ruolo = 'superadmin')
              then 'r2d' else 'passion' end
$$;

-- p_cosa: null (basta la sezione Ticket), 'smistamento' o 'assistenza'.
create or replace function crm.ticket_richiedi(p_cosa text) returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid;
begin
  perform crm.richiedi_sezione('ticket');
  me := crm.chi();
  if p_cosa = 'smistamento' and not crm.smista() then
    raise exception 'Solo il supporto può farlo' using errcode = '42501';
  end if;
  if p_cosa = 'assistenza' and not crm.assiste() then
    raise exception 'Solo l''assistenza R2D può farlo' using errcode = '42501';
  end if;
  return me;
end;
$$;

-- Il ticket, bloccato per la modifica; errore se non c'e'.
create or replace function crm.ticket_prendi_riga(p_id bigint) returns public.ticket
language plpgsql volatile security definer set search_path = ''
as $$
declare t public.ticket;
begin
  select * into t from public.ticket where id = p_id for update;
  if t.id is null then
    raise exception 'Ticket #% inesistente', p_id;
  end if;
  return t;
end;
$$;

create or replace function crm.ticket_evento(p_ticket bigint, p_evento text, p_testo text default null) returns bigint
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); nuovo bigint;
begin
  insert into public.ticket_messaggi (ticket_id, autore, lato, testo, evento)
  values (p_ticket, me, crm.ticket_lato(me), nullif(btrim(coalesce(p_testo, '')), ''), p_evento)
  returning id into nuovo;
  update public.ticket set aggiornato_il = now() where id = p_ticket;
  return nuovo;
end;
$$;

create or replace function crm.testo_obbligatorio(p_testo text, p_cosa text) returns text
language plpgsql immutable set search_path = ''
as $$
begin
  if coalesce(btrim(p_testo), '') = '' then
    raise exception 'Scrivi %', p_cosa;
  end if;
  return btrim(p_testo);
end;
$$;

-- La situazione del socio che resta nel ticket: quella della scheda persona,
-- ridotta a quello che serve per capire il problema.
create or replace function crm.ticket_contesto(p_utente uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare s jsonb := public.crm_persona(p_utente);
        v jsonb;
        lista constant text := 'array';
begin
  if s is null then
    raise exception 'Persona inesistente';
  end if;
  v := s -> 'socio';
  if v is null or jsonb_typeof(v) = 'null' then
    return jsonb_build_object('socio', false, 'fotografata_il', now());
  end if;
  return jsonb_build_object(
    'socio', true,
    'fotografata_il', now(),
    'numero', v -> 'numero',
    'saldo', v -> 'saldo',
    'certificato', v -> 'certificato',
    'abbonamenti', coalesce((select jsonb_agg(c) from (select c from jsonb_array_elements(
                     case when jsonb_typeof(v -> 'contratti') = lista then v -> 'contratti' else '[]' end) c limit 2) x), '[]'),
    'ingressi_30gg', v -> 'ingressi_30gg',
    'ultimo_ingresso', case when jsonb_typeof(v -> 'ingressi') = lista then v -> 'ingressi' -> 0 -> 'entrata' end,
    'prenotazioni', coalesce((select jsonb_agg(p) from (select p from jsonb_array_elements(
                      case when jsonb_typeof(v -> 'prenotazioni') = lista then v -> 'prenotazioni' else '[]' end) p limit 3) x), '[]'));
end;
$$;

-- Per le policy di Storage: chi chiama e' dello staff attivo?
create or replace function public.crm_e_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select (crm.io()).id is not null $$;

-- ---------------------------------------------------------------------------
-- 4. Leggere
-- ---------------------------------------------------------------------------

-- Le viste: da_verificare, r2d (inviati e in lavorazione), in_attesa (R2D
-- aspetta Passion), modifiche (da confermare o da rilasciare), miei (aperti da
-- me e non chiusi), chiusi (ultimi 90 giorni), tutti. Con p_utente: tutti i
-- ticket di quella persona, qualunque vista.
create or replace function public.crm_ticket_elenco(p_vista text default 'da_verificare', p_utente uuid default null)
returns table (id bigint, tipo text, stato text, titolo text, bloccante boolean,
               utente_id uuid, nome text, cognome text, member_id bigint,
               aperto_da_nome text, aperto_il timestamptz, preso_nome text, aggiornato_il timestamptz,
               chiuso_il timestamptz, natura text, dal date, riunione date, doppione_di bigint,
               messaggi int, allegati int, ultimo_lato text)
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
begin
  return query
    select t.id, t.tipo, t.stato, t.titolo, t.bloccante,
           t.utente_id, u.nome, u.cognome, u.member_id,
           crm.nome_staff(t.aperto_da), t.aperto_il, crm.nome_staff(t.preso_da), t.aggiornato_il,
           t.chiuso_il, t.natura, t.dal, t.riunione, t.doppione_di,
           (select count(*)::int from public.ticket_messaggi m where m.ticket_id = t.id and m.testo is not null),
           (select count(*)::int from public.ticket_allegati a where a.ticket_id = t.id),
           (select m.lato from public.ticket_messaggi m where m.ticket_id = t.id and m.testo is not null
             order by m.creato_il desc limit 1)
      from public.ticket t
      left join public.utenti u on u.id = t.utente_id
     where case
             when p_utente is not null then t.utente_id = p_utente
             when p_vista = 'da_verificare' then t.stato = 'da_verificare'
             when p_vista = 'r2d' then t.stato in ('inviato', 'in_lavorazione')
             when p_vista = 'in_attesa' then t.stato = 'in_attesa'
             when p_vista = 'modifiche' then t.stato in ('da_confermare', 'confermata')
             when p_vista = 'miei' then t.aperto_da = me
                                        and t.stato not in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')
             when p_vista = 'chiusi' then t.stato in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')
                                          and t.chiuso_il >= now() - interval '90 days'
             when p_vista = 'tutti' then true
             else false
           end
     order by case when p_vista = 'chiusi' then t.chiuso_il end desc nulls last,
              case when p_utente is not null or p_vista = 'tutti' then t.aperto_il end desc nulls last,
              t.bloccante desc, t.aperto_il
     limit 300;
end;
$$;

create or replace function public.crm_ticket(p_id bigint)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
        t public.ticket;
begin
  select * into t from public.ticket where id = p_id;
  if t.id is null then
    return null;
  end if;
  return to_jsonb(t) || jsonb_build_object(
    'aperto_da_nome', crm.nome_staff(t.aperto_da),
    'aperto_da_lato', crm.ticket_lato(t.aperto_da),
    'inviato_nome', crm.nome_staff(t.inviato_da),
    'preso_nome', crm.nome_staff(t.preso_da),
    'chiuso_nome', crm.nome_staff(t.chiuso_da),
    'confermata_nome', crm.nome_staff(t.confermata_da),
    'persona', (select jsonb_build_object('id', u.id, 'nome', u.nome, 'cognome', u.cognome, 'member_id', u.member_id,
                                          'telefono', u.telefono, 'email', u.email)
                  from public.utenti u where u.id = t.utente_id),
    'messaggi', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', m.id, 'testo', m.testo, 'evento', m.evento, 'lato', m.lato,
                    'autore', crm.nome_staff(m.autore), 'creato_il', m.creato_il) order by m.creato_il, m.id)
                  from public.ticket_messaggi m where m.ticket_id = t.id), '[]'),
    'allegati', coalesce((select jsonb_agg(jsonb_build_object(
                    'id', a.id, 'percorso', a.percorso, 'nome', a.nome, 'tipo', a.tipo, 'dimensione', a.dimensione,
                    'messaggio_id', a.messaggio_id, 'caricato_nome', crm.nome_staff(a.caricato_da),
                    'caricato_il', a.caricato_il) order by a.caricato_il, a.id)
                  from public.ticket_allegati a where a.ticket_id = t.id), '[]'),
    -- I ticket uniti a questo, e gli altri aperti sulla stessa persona.
    'doppioni', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'titolo', d.titolo,
                                                              'aperto_da_nome', crm.nome_staff(d.aperto_da),
                                                              'aperto_il', d.aperto_il) order by d.aperto_il)
                  from public.ticket d where d.doppione_di = t.id), '[]'),
    'stessa_persona', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'titolo', o.titolo, 'stato', o.stato)
                                                 order by o.aperto_il desc)
                  from public.ticket o
                 where t.utente_id is not null and o.utente_id = t.utente_id and o.id <> t.id
                   and o.stato not in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')), '[]'));
end;
$$;

-- I numeri per la home e per le schede della sezione.
create or replace function public.crm_ticket_conti()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
begin
  return (
    select jsonb_build_object(
      'da_verificare', count(*) filter (where stato = 'da_verificare'),
      'proposte', count(*) filter (where stato = 'da_verificare' and tipo = 'proposta'),
      'r2d', count(*) filter (where stato in ('inviato', 'in_lavorazione')),
      'in_attesa', count(*) filter (where stato = 'in_attesa'),
      'bloccanti', count(*) filter (where bloccante and stato in ('da_verificare', 'inviato', 'in_lavorazione', 'in_attesa')),
      'miei', count(*) filter (where aperto_da = me
                                 and stato not in ('risolto', 'risolto_desk', 'doppione', 'rilasciata', 'annullata')),
      'modifiche_da_confermare', count(*) filter (where stato = 'da_confermare'),
      'modifiche_da_rilasciare', count(*) filter (where stato = 'confermata'))
      from public.ticket);
end;
$$;

-- Il resoconto: per mese, i ticket aperti per tipo e quelli chiusi per natura
-- (le categorie dell'analisi), quanti chiusi al desk e uniti come doppioni, e
-- quante ore passano in mediana dall'invio a R2D alla soluzione.
create or replace function public.crm_ticket_resoconto(p_mesi int default 6)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
begin
  return coalesce((
    with mesi as (
      select generate_series(date_trunc('month', (now() at time zone 'Europe/Rome')) - make_interval(months => greatest(p_mesi, 1) - 1),
                             date_trunc('month', (now() at time zone 'Europe/Rome')), interval '1 month')::date as mese
    ), t as (
      select x.*, date_trunc('month', x.aperto_il at time zone 'Europe/Rome')::date as mese_aperto,
             date_trunc('month', x.chiuso_il at time zone 'Europe/Rome')::date as mese_chiuso
        from public.ticket x
    )
    select jsonb_agg(jsonb_build_object(
             'mese', to_char(m.mese, 'YYYY-MM'),
             'aperti', (select count(*) from t where t.mese_aperto = m.mese and t.tipo <> 'modifica'),
             'per_tipo', (select coalesce(jsonb_object_agg(tipo, n), '{}') from
                            (select t.tipo, count(*) n from t where t.mese_aperto = m.mese group by t.tipo) a),
             'chiusi', (select count(*) from t where t.mese_chiuso = m.mese and t.stato in ('risolto', 'risolto_desk')),
             'per_natura', (select coalesce(jsonb_object_agg(natura, n), '{}') from
                              (select t.natura, count(*) n from t
                                where t.mese_chiuso = m.mese and t.stato in ('risolto', 'risolto_desk') and t.natura is not null
                                group by t.natura) b),
             'al_desk', (select count(*) from t where t.mese_chiuso = m.mese and t.stato = 'risolto_desk'),
             'doppioni', (select count(*) from t where t.mese_chiuso = m.mese and t.stato = 'doppione'),
             'modifiche_rilasciate', (select count(*) from t where t.mese_chiuso = m.mese and t.stato = 'rilasciata'),
             'ore_mediane', (select round((percentile_cont(0.5) within group (
                                      order by extract(epoch from t.chiuso_il - coalesce(t.inviato_il, t.aperto_il)) / 3600))::numeric, 1)
                               from t where t.mese_chiuso = m.mese and t.stato = 'risolto'))
           order by m.mese desc)
      from mesi m), '[]');
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Aprire e scrivere
-- ---------------------------------------------------------------------------

-- Guasto, domanda, attivita' o proposta. Il supporto e i superadmin mandano
-- subito a R2D (tranne le proposte, che aspettano la riunione).
create or replace function public.crm_ticket_nuovo(p_tipo text, p_titolo text, p_descrizione text,
                                                   p_utente uuid default null, p_verifiche text[] default '{}',
                                                   p_bloccante boolean default false)
returns bigint
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
        diretto boolean;
        nuovo bigint;
begin
  if p_tipo is null or p_tipo not in ('guasto', 'domanda', 'attivita', 'proposta') then
    raise exception 'Scegli il tipo: qualcosa non funziona, una domanda, un''attività o una proposta';
  end if;
  diretto := crm.smista() and p_tipo <> 'proposta';
  insert into public.ticket (tipo, stato, titolo, descrizione, utente_id, contesto, verifiche, bloccante,
                             aperto_da, inviato_da, inviato_il)
  values (p_tipo, case when diretto then 'inviato' else 'da_verificare' end,
          crm.testo_obbligatorio(p_titolo, 'in breve di cosa si tratta'),
          crm.testo_obbligatorio(p_descrizione, 'cosa succede'),
          p_utente, case when p_utente is not null then crm.ticket_contesto(p_utente) end,
          (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_verifiche, '{}')) x),
          coalesce(p_bloccante, false) and p_tipo = 'guasto',
          me, case when diretto then me end, case when diretto then now() end)
  returning id into nuovo;
  perform crm.ticket_evento(nuovo, case when diretto then 'aperto_inviato' else 'aperto' end);
  return nuovo;
end;
$$;

-- Un messaggio nel filo. Se R2D aspettava Passion, il ticket torna in lavorazione.
create or replace function public.crm_ticket_messaggio(p_id bigint, p_testo text)
returns bigint
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
        t public.ticket := crm.ticket_prendi_riga(p_id);
        nuovo bigint;
begin
  if t.stato = 'doppione' then
    raise exception 'Il ticket #% è unito al #%: scrivi lì', t.id, t.doppione_di;
  end if;
  insert into public.ticket_messaggi (ticket_id, autore, lato, testo)
  values (t.id, me, crm.ticket_lato(me), crm.testo_obbligatorio(p_testo, 'il messaggio'))
  returning id into nuovo;
  if t.stato = 'in_attesa' and crm.ticket_lato(me) = 'passion' then
    update public.ticket set stato = 'in_lavorazione', aggiornato_il = now() where id = t.id;
    perform crm.ticket_evento(t.id, 'risposta_passion');
  else
    update public.ticket set aggiornato_il = now() where id = t.id;
  end if;
  return nuovo;
end;
$$;

-- Un allegato gia' caricato su Storage dal browser: si registra nel ticket.
create or replace function public.crm_ticket_allegato(p_id bigint, p_percorso text, p_nome text, p_tipo text default null,
                                                      p_dimensione bigint default null, p_messaggio bigint default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if p_percorso is null or p_percorso not like t.id::text || '/%' then
    raise exception 'Allegato fuori dal ticket #%', t.id;
  end if;
  if p_messaggio is not null and not exists (select 1 from public.ticket_messaggi m where m.id = p_messaggio and m.ticket_id = t.id) then
    raise exception 'Messaggio non di questo ticket';
  end if;
  insert into public.ticket_allegati (ticket_id, messaggio_id, percorso, nome, tipo, dimensione, caricato_da)
  values (t.id, p_messaggio, p_percorso, coalesce(nullif(btrim(p_nome), ''), 'allegato'), p_tipo, p_dimensione, me)
  on conflict (percorso) do nothing;
  update public.ticket set aggiornato_il = now() where id = t.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Lo smistamento (il supporto)
-- ---------------------------------------------------------------------------

create or replace function public.crm_ticket_invia(p_id bigint, p_nota text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('smistamento');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.stato <> 'da_verificare' then
    raise exception 'Il ticket #% non è da verificare', t.id;
  end if;
  if t.tipo = 'proposta' then
    raise exception 'Le proposte di modifica non vanno a R2D: si decidono nella riunione settimanale. Chiudila al desk con quello che si è deciso.';
  end if;
  update public.ticket set stato = 'inviato', inviato_da = me, inviato_il = now(), aggiornato_il = now() where id = t.id;
  perform crm.ticket_evento(t.id, 'inviato', p_nota);
end;
$$;

create or replace function public.crm_ticket_risolvi_desk(p_id bigint, p_natura text, p_risposta text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('smistamento');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.stato <> 'da_verificare' then
    raise exception 'Il ticket #% non è da verificare', t.id;
  end if;
  if p_natura is null then
    raise exception 'Scegli di che cosa si trattava';
  end if;
  update public.ticket
     set stato = 'risolto_desk', natura = p_natura, soluzione = crm.testo_obbligatorio(p_risposta, 'la risposta'),
         chiuso_da = me, chiuso_il = now(), aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'risolto_desk', p_risposta);
end;
$$;

-- Unire un ticket a un altro gia' aperto sullo stesso problema. Lo fanno il
-- supporto e R2D.
create or replace function public.crm_ticket_unisci(p_id bigint, p_in bigint)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
        t public.ticket := crm.ticket_prendi_riga(p_id);
        dest public.ticket;
begin
  if not crm.smista() then
    raise exception 'Solo il supporto o l''assistenza R2D può unire i ticket' using errcode = '42501';
  end if;
  if t.stato not in ('da_verificare', 'inviato', 'in_lavorazione', 'in_attesa') then
    raise exception 'Si uniscono solo i ticket ancora aperti';
  end if;
  select * into dest from public.ticket where id = p_in;
  if dest.id is null or dest.id = t.id then
    raise exception 'Scegli un altro ticket a cui unirlo';
  end if;
  if dest.stato = 'doppione' then
    raise exception 'Il #% è già unito al #%: uniscilo a quello', dest.id, dest.doppione_di;
  end if;
  if dest.tipo = 'modifica' then
    raise exception 'Una segnalazione non si unisce a una modifica';
  end if;
  update public.ticket set stato = 'doppione', doppione_di = dest.id, chiuso_da = me, chiuso_il = now(), aggiornato_il = now()
   where id = t.id;
  -- Chi aveva unito qualcosa a questo, ora punta al nuovo.
  update public.ticket set doppione_di = dest.id where doppione_di = t.id;
  perform crm.ticket_evento(t.id, 'unito', format('Unito al #%s', dest.id));
  perform crm.ticket_evento(dest.id, 'unito_qui', format('#%s «%s», aperto da %s', t.id, t.titolo, crm.nome_staff(t.aperto_da)));
end;
$$;

-- Riaprire un ticket chiuso: torna a R2D se c'era gia' arrivato, altrimenti
-- torna da verificare. Lo fanno il supporto e R2D, con il motivo.
create or replace function public.crm_ticket_riapri(p_id bigint, p_motivo text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi(null);
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if not crm.smista() then
    raise exception 'Solo il supporto o l''assistenza R2D può riaprire i ticket' using errcode = '42501';
  end if;
  if t.stato not in ('risolto', 'risolto_desk', 'doppione') then
    raise exception 'Il ticket #% non è chiuso', t.id;
  end if;
  update public.ticket
     set stato = case when t.inviato_il is not null then 'inviato' else 'da_verificare' end,
         doppione_di = null, chiuso_da = null, chiuso_il = null, aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'riaperto', crm.testo_obbligatorio(p_motivo, 'perché si riapre'));
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. L'assistenza R2D
-- ---------------------------------------------------------------------------

create or replace function public.crm_ticket_prendi(p_id bigint)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.stato not in ('inviato', 'in_attesa', 'in_lavorazione') then
    raise exception 'Il ticket #% non è fra quelli mandati a R2D', t.id;
  end if;
  update public.ticket set stato = 'in_lavorazione', preso_da = me, preso_il = coalesce(preso_il, now()), aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'preso');
end;
$$;

-- R2D chiede informazioni al desk: il ticket aspetta Passion.
create or replace function public.crm_ticket_chiedi(p_id bigint, p_domanda text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.stato not in ('inviato', 'in_lavorazione') then
    raise exception 'Il ticket #% non è in lavorazione', t.id;
  end if;
  update public.ticket set stato = 'in_attesa', preso_da = coalesce(preso_da, me), preso_il = coalesce(preso_il, now()),
                           aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'in_attesa', crm.testo_obbligatorio(p_domanda, 'cosa serve sapere'));
end;
$$;

-- Si chiude solo con la natura, la causa e la soluzione.
create or replace function public.crm_ticket_risolvi(p_id bigint, p_natura text, p_causa text, p_soluzione text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.stato not in ('inviato', 'in_lavorazione', 'in_attesa') then
    raise exception 'Il ticket #% non è fra quelli mandati a R2D', t.id;
  end if;
  if p_natura is null then
    raise exception 'Scegli di che cosa si trattava';
  end if;
  update public.ticket
     set stato = 'risolto', natura = p_natura,
         causa = crm.testo_obbligatorio(p_causa, 'la causa'),
         soluzione = crm.testo_obbligatorio(p_soluzione, 'la soluzione'),
         preso_da = coalesce(preso_da, me), preso_il = coalesce(preso_il, now()),
         chiuso_da = me, chiuso_il = now(), aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'risolto');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Le modifiche (dalla riunione settimanale)
-- ---------------------------------------------------------------------------

create or replace function public.crm_modifica_nuova(p_titolo text, p_descrizione text, p_abbonamenti text default null,
                                                     p_dal date default null, p_comunicazione text default null,
                                                     p_riunione date default null)
returns bigint
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        nuovo bigint;
begin
  insert into public.ticket (tipo, stato, titolo, descrizione, abbonamenti, dal, comunicazione, riunione, aperto_da)
  values ('modifica', 'da_confermare',
          crm.testo_obbligatorio(p_titolo, 'in breve la modifica'),
          crm.testo_obbligatorio(p_descrizione, 'cosa cambia'),
          nullif(btrim(coalesce(p_abbonamenti, '')), ''), p_dal, nullif(btrim(coalesce(p_comunicazione, '')), ''),
          coalesce(p_riunione, (now() at time zone 'Europe/Rome')::date), me)
  returning id into nuovo;
  perform crm.ticket_evento(nuovo, 'modifica_scritta');
  return nuovo;
end;
$$;

-- Finche' non e' confermata la modifica si corregge.
create or replace function public.crm_modifica_aggiorna(p_id bigint, p_titolo text, p_descrizione text,
                                                        p_abbonamenti text default null, p_dal date default null,
                                                        p_comunicazione text default null, p_riunione date default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.tipo <> 'modifica' or t.stato <> 'da_confermare' then
    raise exception 'Si corregge solo una modifica ancora da confermare';
  end if;
  update public.ticket
     set titolo = crm.testo_obbligatorio(p_titolo, 'in breve la modifica'),
         descrizione = crm.testo_obbligatorio(p_descrizione, 'cosa cambia'),
         abbonamenti = nullif(btrim(coalesce(p_abbonamenti, '')), ''), dal = p_dal,
         comunicazione = nullif(btrim(coalesce(p_comunicazione, '')), ''),
         riunione = coalesce(p_riunione, t.riunione), aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'modifica_corretta');
end;
$$;

-- La conferma del titolare: chi, come e quando e' arrivata (email, WhatsApp, riunione).
create or replace function public.crm_modifica_conferma(p_id bigint, p_nota text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.tipo <> 'modifica' or t.stato <> 'da_confermare' then
    raise exception 'La modifica #% non è da confermare', t.id;
  end if;
  update public.ticket
     set stato = 'confermata', confermata_da = me, confermata_il = now(),
         confermata_nota = crm.testo_obbligatorio(p_nota, 'come è arrivata la conferma'), aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'confermata', p_nota);
end;
$$;

-- Rilasciata: con quello che si e' verificato prima e dopo.
create or replace function public.crm_modifica_rilascia(p_id bigint, p_verifica text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.tipo <> 'modifica' or t.stato <> 'confermata' then
    raise exception 'Si rilascia solo una modifica confermata';
  end if;
  update public.ticket
     set stato = 'rilasciata', natura = 'richiesta_modifica', soluzione = crm.testo_obbligatorio(p_verifica, 'cosa hai verificato'),
         chiuso_da = me, chiuso_il = now(), aggiornato_il = now()
   where id = t.id;
  perform crm.ticket_evento(t.id, 'rilasciata', p_verifica);
end;
$$;

create or replace function public.crm_modifica_annulla(p_id bigint, p_motivo text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.ticket_richiedi('assistenza');
        t public.ticket := crm.ticket_prendi_riga(p_id);
begin
  if t.tipo <> 'modifica' or t.stato not in ('da_confermare', 'confermata') then
    raise exception 'Si annulla solo una modifica non ancora rilasciata';
  end if;
  update public.ticket set stato = 'annullata', chiuso_da = me, chiuso_il = now(), aggiornato_il = now() where id = t.id;
  perform crm.ticket_evento(t.id, 'annullata', crm.testo_obbligatorio(p_motivo, 'perché si annulla'));
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Gli allegati su Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket', 'ticket', false, 26214400,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
              'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ticket: lo staff legge gli allegati" on storage.objects;
create policy "ticket: lo staff legge gli allegati" on storage.objects
  for select to authenticated using (bucket_id = 'ticket' and public.crm_e_staff());
drop policy if exists "ticket: lo staff carica gli allegati" on storage.objects;
create policy "ticket: lo staff carica gli allegati" on storage.objects
  for insert to authenticated with check (bucket_id = 'ticket' and public.crm_e_staff());

-- ---------------------------------------------------------------------------
-- Chi puo' chiamare cosa
-- ---------------------------------------------------------------------------

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
              and (p.proname like 'crm\_ticket%' or p.proname like 'crm\_modifica%' or p.proname = 'crm_e_staff') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end;
$$;
