-- I curriculum, nel CRM
--
-- «Inviaci il tuo CV» sul sito portava a un Typeform: le candidature restavano
-- li', fuori dal CRM. Ora il sito ha un modulo suo (passionfitness.it/lavora-con-noi/)
-- che manda tutto all'Edge Function `crm-candidatura`: le risposte finiscono in
-- `public.candidature`, il file (JPEG, DNG, PDF, Word, fino a 10 MB) nel bucket
-- privato `curriculum` di Storage. Il CRM li mostra nella sezione «Curriculum».
--
-- Sono dati personali (nome, contatti, data di nascita e tutto quello che c'e'
-- scritto in un CV), quindi:
--   - la sezione `curriculum` non e' fra quelle date a tutti: la vedono gli admin
--     e chi la riceve da Utenti. Lo stesso vale per il bucket: chi non ha la
--     sezione non legge i file, nemmeno con un link a mano;
--   - il sito non scrive mai nel database: passa dalla funzione, che controlla
--     tutto un'altra volta e limita gli invii (`crm.candidatura_limite`);
--   - dal browser non si legge niente (RLS accesa, nessuna policy).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- 1. La tabella
-- ---------------------------------------------------------------------------

create table if not exists public.candidature (
  id                  bigint generated always as identity primary key,
  posizione           text not null check (posizione in ('istruttore_fitness', 'istruttore_sala_pesi', 'receptionist')),
  nome                text not null check (btrim(nome) <> ''),
  cognome             text not null check (btrim(cognome) <> ''),
  email               text not null check (btrim(email) <> ''),
  telefono            text not null check (btrim(telefono) <> ''),
  data_nascita        date not null,
  -- Il file su Storage (bucket `curriculum`) e come si chiamava per chi l'ha mandato.
  file_percorso       text not null unique,
  file_nome           text not null,
  file_tipo           text not null,
  file_dimensione     bigint not null check (file_dimensione > 0),
  -- La persona ha letto l'informativa privacy prima di inviare.
  consenso_privacy_il timestamptz not null,
  -- Impronta dell'IP, solo per limitare gli invii ripetuti: non e' l'IP.
  ip_hash             text,
  creato_il           timestamptz not null default now()
);
create index if not exists candidature_creato_idx on public.candidature (creato_il desc);
create index if not exists candidature_email_idx on public.candidature (email, creato_il desc);
create index if not exists candidature_ip_idx on public.candidature (ip_hash, creato_il desc);
alter table public.candidature enable row level security;
revoke all on public.candidature from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. La sezione
-- ---------------------------------------------------------------------------

-- Non entra nel default: i curriculum li vede chi ne ha bisogno.
alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note
  check (sezioni <@ array['lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori',
                          'abbonamenti', 'ticket', 'curriculum']);

-- ---------------------------------------------------------------------------
-- 3. Scrivere: solo dall'Edge Function (connessione diretta al database)
-- ---------------------------------------------------------------------------

-- Troppi invii dalla stessa rete o con la stessa email? Prima di caricare il
-- file, cosi' non si riempie Storage. Cinque all'ora per rete, tre al giorno
-- per email: piu' che larghi per una persona vera.
create or replace function crm.candidatura_limite(p_ip_hash text, p_email text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select count(*) from public.candidature
                    where p_ip_hash is not null and ip_hash = p_ip_hash and creato_il > now() - interval '1 hour'), 0) >= 5
      or coalesce((select count(*) from public.candidature
                    where email = lower(btrim(p_email)) and creato_il > now() - interval '1 day'), 0) >= 3
$$;

-- Registra la candidatura. I controlli veri sono nell'Edge Function; qui
-- restano quelli che il database non puo' non fare.
create or replace function crm.nuova_candidatura(p jsonb) returns bigint
language plpgsql volatile security definer set search_path = ''
as $$
declare nuovo bigint;
begin
  insert into public.candidature (posizione, nome, cognome, email, telefono, data_nascita,
                                  file_percorso, file_nome, file_tipo, file_dimensione, consenso_privacy_il, ip_hash)
  values (p ->> 'posizione', btrim(p ->> 'nome'), btrim(p ->> 'cognome'), lower(btrim(p ->> 'email')),
          btrim(p ->> 'telefono'), (p ->> 'data_nascita')::date,
          p ->> 'file_percorso', coalesce(nullif(btrim(p ->> 'file_nome'), ''), 'curriculum'), p ->> 'file_tipo',
          (p ->> 'file_dimensione')::bigint, now(), nullif(p ->> 'ip_hash', ''))
  returning id into nuovo;
  return nuovo;
end;
$$;
revoke all on function crm.candidatura_limite(text, text), crm.nuova_candidatura(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Leggere: solo chi ha la sezione
-- ---------------------------------------------------------------------------

create or replace function public.crm_candidature(p_posizione text default null)
returns table (id bigint, posizione text, nome text, cognome text, email text, telefono text, data_nascita date,
               file_percorso text, file_nome text, file_tipo text, file_dimensione bigint, creato_il timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.richiedi_sezione('curriculum');
  return query
    select c.id, c.posizione, c.nome, c.cognome, c.email, c.telefono, c.data_nascita,
           c.file_percorso, c.file_nome, c.file_tipo, c.file_dimensione, c.creato_il
      from public.candidature c
     where p_posizione is null or c.posizione = p_posizione
     order by c.creato_il desc
     limit 1000;
end;
$$;

-- Quante, per posizione (le schede della pagina).
create or replace function public.crm_candidature_conti()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.richiedi_sezione('curriculum');
  return jsonb_build_object(
    'tutte', (select count(*) from public.candidature),
    'istruttore_fitness', (select count(*) from public.candidature where posizione = 'istruttore_fitness'),
    'istruttore_sala_pesi', (select count(*) from public.candidature where posizione = 'istruttore_sala_pesi'),
    'receptionist', (select count(*) from public.candidature where posizione = 'receptionist'));
end;
$$;

-- Per la policy di Storage: chi chiama vede la sezione Curriculum?
create or replace function public.crm_puo_vedere_curriculum() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(crm.puo_vedere('curriculum'), false) $$;

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public'
              and p.proname in ('crm_candidature', 'crm_candidature_conti', 'crm_puo_vedere_curriculum') loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. I file su Storage
-- ---------------------------------------------------------------------------

-- Privato, 10 MB, solo i formati che il modulo accetta. Li carica l'Edge
-- Function con la chiave di servizio (che non passa dalle policy): per lo staff
-- c'e' solo la lettura, e solo con la sezione.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curriculum', 'curriculum', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/x-adobe-dng', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "curriculum: chi vede la sezione legge i file" on storage.objects;
create policy "curriculum: chi vede la sezione legge i file" on storage.objects
  for select to authenticated using (bucket_id = 'curriculum' and public.crm_puo_vedere_curriculum());
