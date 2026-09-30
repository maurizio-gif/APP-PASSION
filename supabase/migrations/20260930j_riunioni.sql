-- Report riunioni
--
-- Una sezione per superadmin e admin: i report delle riunioni del progetto.
-- Per ogni riunione il riepilogo, le decisioni, i passaggi successivi con il
-- loro stato (da fare, in corso, fatto) e la trascrizione completa. Un posto
-- solo per lo stato d'avanzamento del progetto, per restare coerenti con
-- quello che ci si dice.
--
-- I contenuti stanno solo nel database (il repository e' pubblico):
--   public.riunioni         una riga per riunione: data e ora, titolo,
--                           partecipanti, durata, il documento da cui viene,
--                           il report (`contenuto`, jsonb: sintesi, aree,
--                           concordato, da_approfondire, dettagli) e la
--                           trascrizione (testo: righe «[hh:mm:ss]» e
--                           «Nome: testo»);
--   public.riunioni_azioni  i passaggi successivi: chi, cosa, lo stato, una
--                           nota su com'e' andata.
-- RLS accesa e nessuna policy: si leggono e si scrivono solo con le funzioni
-- crm_riunion*, che vogliono un superadmin o un admin (crm.puo_riunioni()).
-- Il supporto e i consulenti no.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create table if not exists public.riunioni (
  id           uuid primary key default gen_random_uuid(),
  data         date not null,
  ora          time,
  titolo       text not null,
  partecipanti text[] not null default '{}',
  durata       text,
  fonte_url    text,
  contenuto    jsonb not null default '{}',
  trascrizione text,
  creato_il    timestamptz not null default now()
);
alter table public.riunioni enable row level security;
revoke all on public.riunioni from anon, authenticated;

create table if not exists public.riunioni_azioni (
  id            uuid primary key default gen_random_uuid(),
  riunione_id   uuid not null references public.riunioni (id) on delete cascade,
  ordine        int not null,
  chi           text[] not null default '{}',
  titolo        text not null,
  descrizione   text,
  stato         text not null default 'da_fare' check (stato in ('da_fare', 'in_corso', 'fatto')),
  nota          text,
  fatto_il      timestamptz,
  aggiornato_il timestamptz,
  aggiornato_da uuid references public.staff (id)
);
create index if not exists riunioni_azioni_riunione on public.riunioni_azioni (riunione_id, ordine);
alter table public.riunioni_azioni enable row level security;
revoke all on public.riunioni_azioni from anon, authenticated;

-- Chi le vede: superadmin e admin.
create or replace function crm.puo_riunioni()
returns boolean
language sql
stable security definer
set search_path = ''
as $$ select coalesce((select s.ruolo in ('superadmin', 'admin') from crm.io() s where s.id is not null), false) $$;

create or replace function crm.richiedi_riunioni()
returns void
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_riunioni() then
    raise exception 'I report delle riunioni li vedono solo superadmin e admin' using errcode = '42501';
  end if;
end;
$$;

revoke all on function crm.puo_riunioni(), crm.richiedi_riunioni() from public, anon;

-- L'elenco: le riunioni, dalla piu' recente, con quante decisioni e a che
-- punto sono i passaggi successivi.
create or replace function public.crm_riunioni()
returns table (id uuid, data date, ora time, titolo text, partecipanti text[], durata text, sintesi text,
               decisioni integer, azioni integer, fatte integer, in_corso integer)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform crm.richiedi_riunioni();
  return query
  select r.id, r.data, r.ora, r.titolo, r.partecipanti, r.durata, r.contenuto ->> 'sintesi',
         (coalesce(jsonb_array_length(r.contenuto -> 'concordato'), 0)
          + coalesce(jsonb_array_length(r.contenuto -> 'da_approfondire'), 0))::int,
         (select count(*)::int from public.riunioni_azioni a where a.riunione_id = r.id),
         (select count(*)::int from public.riunioni_azioni a where a.riunione_id = r.id and a.stato = 'fatto'),
         (select count(*)::int from public.riunioni_azioni a where a.riunione_id = r.id and a.stato = 'in_corso')
    from public.riunioni r
   order by r.data desc, r.ora desc nulls last, r.creato_il desc;
end;
$$;

-- Una riunione: il report e i passaggi successivi (la trascrizione a parte).
create or replace function public.crm_riunione(p_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform crm.richiedi_riunioni();
  return (
    select jsonb_build_object(
      'id', r.id, 'data', r.data, 'ora', r.ora, 'titolo', r.titolo, 'partecipanti', to_jsonb(r.partecipanti),
      'durata', r.durata, 'fonte_url', r.fonte_url, 'contenuto', r.contenuto,
      'trascrizione_caratteri', coalesce(length(r.trascrizione), 0),
      'azioni', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', a.id, 'chi', to_jsonb(a.chi), 'titolo', a.titolo, 'descrizione', a.descrizione,
                  'stato', a.stato, 'nota', a.nota, 'fatto_il', a.fatto_il,
                  'aggiornato_il', a.aggiornato_il, 'aggiornato_nome', crm.nome_staff(a.aggiornato_da))
                  order by a.ordine)
                  from public.riunioni_azioni a where a.riunione_id = r.id), '[]'::jsonb))
      from public.riunioni r where r.id = p_id);
end;
$$;

create or replace function public.crm_riunione_trascrizione(p_id uuid)
returns text
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform crm.richiedi_riunioni();
  return (select r.trascrizione from public.riunioni r where r.id = p_id);
end;
$$;

-- Lo stato di un passaggio successivo, con la nota.
create or replace function public.crm_riunione_azione(p_id uuid, p_stato text, p_nota text default null)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
begin
  perform crm.richiedi_riunioni();
  if coalesce(p_stato, '') not in ('da_fare', 'in_corso', 'fatto') then
    raise exception 'Stato non valido';
  end if;
  update public.riunioni_azioni
     set stato = p_stato,
         nota = nullif(trim(coalesce(p_nota, '')), ''),
         fatto_il = case when p_stato = 'fatto' then coalesce(fatto_il, now()) end,
         aggiornato_il = now(), aggiornato_da = me
   where id = p_id;
  if not found then
    raise exception 'Passaggio non trovato';
  end if;
end;
$$;

revoke all on function public.crm_riunioni(), public.crm_riunione(uuid), public.crm_riunione_trascrizione(uuid),
                       public.crm_riunione_azione(uuid, text, text) from public, anon;
grant execute on function public.crm_riunioni(), public.crm_riunione(uuid), public.crm_riunione_trascrizione(uuid),
                          public.crm_riunione_azione(uuid, text, text) to authenticated;
