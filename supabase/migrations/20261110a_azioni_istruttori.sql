-- Azioni istruttore: il cluster «Istruttori · nuovi iscritti» e la prima azione
--
-- Una parte degli istruttori lavora su azioni dedicate, che il CRM crea da sole.
-- Chi fa parte del cluster si sceglie in Utenti (spunta «Cluster» nella scheda
-- dell'utente) e vede la sezione «Azioni istruttore». Gli admin la vedono sempre.
--
-- La prima azione, «benvenuto» (tipo `benvenuto`): N giorni dopo l'iscrizione su
-- PerfectGym nasce un'azione per chi rispetta le regole dell'automazione. Le regole
-- NON sono scritte nel codice: stanno in `public.automazioni` e si cambiano dalla
-- sezione «Impostazioni automazioni» (giorni, da quando, abbonamento, lezioni):
--   giorni              dopo quanti giorni dall'iscrizione nasce l'azione (oggi 7)
--   iscritti_dal        si guardano solo gli iscritti da questo giorno in poi, cosi'
--                       all'accensione non arriva tutto lo storico
--   abbonamento         mai | nessuno_attivo | non_controllare. «Abbonamento vero» e' un
--                       contratto di Passion non cancellato, che non e' un pass, una prova
--                       o un Guest Pass, non e' un aggiuntivo, ha un canone (come in
--                       crm.abbonamenti / 20260929u) e il cui piano non e' fra i
--                       `piani_esclusi` (Wellhub, Gympass, Fitprime e simili non contano)
--   lezioni             nessuna | almeno_una | non_controllare: prenotazioni (non annullate,
--                       non in lista d'attesa) di una lezione della `categoria_lezione`
--                       (oggi Formula 8, categoria 8)
-- Si valuta quando l'azione nasce; se poi la persona si abbona l'azione resta e chi la
-- lavora lo vede. Un cambio di regole vale per le azioni nuove, quelle gia' nate restano.
--
-- Come si lavora: «presa in carico», come per le opportunita'. L'azione nasce
-- libera; un istruttore del cluster se la assegna, la lavora e la chiude con un
-- esito: prenotata una lezione Formula 8, interessata (da richiamare), non
-- risponde, non interessata. Si puo' lasciare per rimetterla fra le libere. Se
-- l'istruttore viene tolto o disattivato le sue azioni aperte tornano libere.
--
-- Il generatore gira ogni ora (cron `crm-azioni-istruttori`).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- Il cluster sull'utente
-- ---------------------------------------------------------------------------

alter table public.staff add column if not exists cluster text[] not null default '{}';
alter table public.staff drop constraint if exists staff_cluster_noti;
alter table public.staff add constraint staff_cluster_noti
  check (cluster <@ array['istruttori_nuovi_iscritti']::text[]);

-- La sezione «Impostazioni automazioni»: la vedono gli admin, e chi la riceve dalle sezioni.
alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note check (sezioni <@ array[
  'lead', 'prove', 'contratti', 'disdette', 'rinnovi', 'task', 'cerca', 'debitori', 'abbonamenti',
  'ticket', 'curriculum', 'marketing', 'appello', 'appello_tutte', 'automazioni']::text[]);

-- Chi sono: anche il cluster.
create or replace function public.crm_io()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.id is null then null
         else jsonb_build_object('id', s.id, 'email', s.email, 'nome', s.nome, 'cognome', s.cognome, 'ruolo', s.ruolo,
                                 'sezioni', to_jsonb(s.sezioni), 'autorizzazioni', to_jsonb(s.autorizzazioni),
                                 'assegnabile', s.assegnabile, 'cluster', to_jsonb(s.cluster)) end
    from (select (crm.io()).*) s
$$;

-- La sezione «Azioni istruttore» non ha una spunta fra le sezioni: la vede chi e'
-- nel cluster, e gli admin.
create or replace function crm.puo_vedere(p_sezione text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select (crm.ruolo_admin(s.ruolo) and p_sezione <> all (array['marketing']))
           or p_sezione = any (s.sezioni)
           or (p_sezione = 'appello_tutte' and s.assegnabile)
           or (p_sezione = 'azioni_istruttori' and 'istruttori_nuovi_iscritti' = any (s.cluster))
      from crm.io() s
     where s.id is not null
  ), false)
$$;

-- Utenti: con il cluster.
drop function if exists public.crm_utenti();
create function public.crm_utenti()
returns table (id uuid, email text, nome text, cognome text, ruolo text, attivo boolean,
               sezioni text[], autorizzazioni text[], accesso boolean, ultimo_accesso timestamptz,
               lead_aperti int, task_aperti int, altro_aperto int, assegnabile boolean, cluster text[])
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
    select s.id, s.email, s.nome, s.cognome, s.ruolo, s.attivo, s.sezioni, s.autorizzazioni,
           u.id is not null, u.last_sign_in_at,
           (select count(*)::int from public.lead l where l.assegnato_a = s.id and l.fase in ('da_gestire', 'in_gestione')),
           (select count(*)::int from public.task t where t.assegnato_a = s.id and t.completato_il is null and not t.archiviato),
           (select count(*)::int from public.debiti d where d.assegnato_a = s.id and d.rientrato_il is null)
             + (select count(*)::int from public.rinnovi r where r.assegnato_a = s.id and r.esito is null)
             + (select count(*)::int from public.azioni_istruttori z where z.assegnato_a = s.id and z.completato_il is null),
           s.assegnabile, s.cluster
      from public.staff s
      left join auth.users u on lower(u.email) = s.email
     where s.rimosso_il is null
     order by s.attivo desc, array_position(array['superadmin', 'admin', 'supporto', 'consulente'], s.ruolo), s.nome, s.cognome;
end;
$$;

-- Salvare l'utente: con il cluster (se manca, resta quello che c'e').
drop function if exists public.crm_utente_aggiorna(uuid, text, boolean, text[], text[], boolean);
create function public.crm_utente_aggiorna(p_id uuid, p_ruolo text, p_attivo boolean, p_sezioni text[],
                                           p_autorizzazioni text[], p_assegnabile boolean default null,
                                           p_cluster text[] default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  prima public.staff;
begin
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into prima from public.staff where id = p_id;
  if prima.id is null then
    raise exception 'Utente inesistente';
  end if;
  if not crm.puo_toccare_ruolo(prima.ruolo) then
    raise exception '%', case when prima.ruolo = 'superadmin' then 'Un superadmin lo modifica solo un altro superadmin'
                              else 'Un admin lo modifica solo un altro admin' end
      using errcode = '42501';
  end if;
  if prima.ruolo is distinct from p_ruolo and not crm.puo_toccare_ruolo(p_ruolo) then
    raise exception '%', case when p_ruolo = 'superadmin' then 'Il ruolo superadmin lo dà solo un superadmin'
                              else 'Solo un admin dà il ruolo admin o supporto' end
      using errcode = '42501';
  end if;
  if p_id = me and (p_ruolo is distinct from prima.ruolo or p_attivo is distinct from prima.attivo
                    or ('gestione_utenti' = any (prima.autorizzazioni) and not 'gestione_utenti' = any (coalesce(p_autorizzazioni, '{}')))) then
    raise exception 'Il proprio ruolo, l''accesso e la gestione utenti li cambia un altro' using errcode = '42501';
  end if;
  update public.staff
     set ruolo = p_ruolo,
         attivo = p_attivo,
         sezioni = (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_sezioni, '{}')) x),
         autorizzazioni = (select coalesce(array_agg(distinct x order by x), '{}') from unnest(coalesce(p_autorizzazioni, '{}')) x),
         assegnabile = coalesce(p_assegnabile, assegnabile),
         cluster = case when p_cluster is null then cluster
                        else (select coalesce(array_agg(distinct x order by x), '{}') from unnest(p_cluster) x) end
   where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Le azioni
-- ---------------------------------------------------------------------------

create table if not exists public.azioni_istruttori (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('benvenuto')),
  utente_id uuid not null references public.utenti (id) on delete cascade,
  member_id bigint not null,
  iscritto_il date not null,
  da_fare_dal date not null,
  assegnato_a uuid references public.staff (id),
  preso_in_carico_il timestamptz,
  completato_il timestamptz,
  completato_da uuid references public.staff (id),
  esito text check (esito in ('prenotata', 'da_richiamare', 'non_risponde', 'non_interessata')),
  nota text,
  creato_il timestamptz not null default now(),
  unique (tipo, member_id)
);
create index if not exists azioni_istruttori_aperte_idx on public.azioni_istruttori (da_fare_dal) where completato_il is null;
create index if not exists azioni_istruttori_assegnato_idx on public.azioni_istruttori (assegnato_a) where assegnato_a is not null;
alter table public.azioni_istruttori enable row level security;
revoke all on public.azioni_istruttori from anon, authenticated;

-- Se un istruttore viene tolto o disattivato, le sue azioni aperte tornano libere.
create or replace function crm.azioni_istruttori_libera()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.rimosso_il is not null and old.rimosso_il is null) or (not new.attivo and old.attivo) then
    update public.azioni_istruttori set assegnato_a = null, preso_in_carico_il = null
     where assegnato_a = new.id and completato_il is null;
  end if;
  return new;
end;
$$;
drop trigger if exists staff_azioni_istruttori_libera on public.staff;
create trigger staff_azioni_istruttori_libera after update of attivo, rimosso_il on public.staff
  for each row execute function crm.azioni_istruttori_libera();

-- ---------------------------------------------------------------------------
-- Le automazioni e le loro regole (si cambiano da «Impostazioni automazioni»)
-- ---------------------------------------------------------------------------

create table if not exists public.automazioni (
  chiave text primary key,
  nome text not null,
  descrizione text,
  attiva boolean not null default true,
  parametri jsonb not null default '{}'::jsonb,
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references public.staff (id)
);
alter table public.automazioni enable row level security;
revoke all on public.automazioni from anon, authenticated;

insert into public.automazioni (chiave, nome, descrizione, attiva, parametri)
values ('azioni_istruttori_benvenuto', 'Benvenuto ai nuovi iscritti',
        'Crea un''azione per gli istruttori del cluster «Istruttori · nuovi iscritti».', true,
        jsonb_build_object(
          'giorni', 7,
          'iscritti_dal', '2026-11-03',
          'abbonamento', 'mai',
          'piani_esclusi', (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from perfectgym.payment_plans
                             where not is_deleted and nome ~* 'wellhub|gympass|fitprime'),
          'lezioni', 'nessuna',
          'categoria_lezione', 8))
on conflict (chiave) do nothing;

-- Chi rispetta le regole `p`, fra gli iscritti dal giorno p_dal al giorno p_al: lo usano
-- il generatore e l'anteprima delle impostazioni.
create or replace function crm.azioni_istruttori_candidati(p jsonb, p_dal date, p_al date)
returns table (member_id bigint, iscritto date)
language sql
stable
set search_path = ''
as $$
  with r as (
    select coalesce(p ->> 'abbonamento', 'mai') as abb,
           coalesce(p ->> 'lezioni', 'nessuna') as lez,
           nullif(p ->> 'categoria_lezione', '')::bigint as cat,
           coalesce((select array_agg(t.v::bigint) from jsonb_array_elements_text(coalesce(p -> 'piani_esclusi', '[]'::jsonb)) as t(v)),
                    '{}'::bigint[]) as esclusi
  )
  select m.id, i.giorno
    from perfectgym.members m
    cross join r
    cross join lateral (select (m.creato_il at time zone 'Europe/Rome')::date as giorno) i
   where not m.is_deleted
     and not crm.cancellata(m.id)
     and i.giorno between p_dal and p_al
     and case r.abb
           when 'mai' then not exists (
             select 1 from perfectgym.contracts c
               join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
              where c.member_id = m.id and not c.is_deleted
                and not crm.e_pass(pp.nome) and pp.id <> all (r.esclusi)
                and not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD'))
           when 'nessuno_attivo' then not exists (
             select 1 from perfectgym.contracts c
               join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
              where c.member_id = m.id and not c.is_deleted and coalesce(c.attivo, false)
                and not crm.e_pass(pp.nome) and pp.id <> all (r.esclusi)
                and not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD'))
           else true end
     and case when r.cat is null then true
              else case r.lez
                when 'nessuna' then not exists (
                  select 1 from perfectgym.class_bookings b
                    join perfectgym.classes k on k.id = b.class_id
                    join perfectgym.class_types t on t.id = k.class_type_id
                   where b.member_id = m.id and not b.is_deleted
                     and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
                     and t.category_id = r.cat)
                when 'almeno_una' then exists (
                  select 1 from perfectgym.class_bookings b
                    join perfectgym.classes k on k.id = b.class_id
                    join perfectgym.class_types t on t.id = k.class_type_id
                   where b.member_id = m.id and not b.is_deleted
                     and not coalesce(b.annullata, false) and not coalesce(b.in_attesa, false)
                     and t.category_id = r.cat)
                else true end end
$$;
revoke all on function crm.azioni_istruttori_candidati(jsonb, date, date) from public, anon, authenticated;

-- Il generatore: ogni iscritto, N giorni dopo, che rispetta le regole. Si puo' rilanciare
-- quanto si vuole; se l'automazione e' spenta non fa niente.
create or replace function crm.azioni_istruttori_genera()
returns int
language plpgsql
set search_path = ''
as $$
declare
  a public.automazioni;
  n int;
  oggi date := (now() at time zone 'Europe/Rome')::date;
  giorni int;
  dal date;
begin
  select * into a from public.automazioni where chiave = 'azioni_istruttori_benvenuto';
  if a.chiave is null or not a.attiva then return 0; end if;
  giorni := coalesce((a.parametri ->> 'giorni')::int, 7);
  dal := coalesce((a.parametri ->> 'iscritti_dal')::date, oggi);

  insert into public.azioni_istruttori (tipo, utente_id, member_id, iscritto_il, da_fare_dal)
  select 'benvenuto', crm.persona_del_socio(c.member_id), c.member_id, c.iscritto, c.iscritto + giorni
    from crm.azioni_istruttori_candidati(a.parametri, dal, oggi - giorni) c
   where not exists (select 1 from public.azioni_istruttori x where x.tipo = 'benvenuto' and x.member_id = c.member_id)
  on conflict (tipo, member_id) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function crm.azioni_istruttori_genera() from public, anon, authenticated;

select cron.schedule('crm-azioni-istruttori', '10 * * * *', $cron$ select crm.azioni_istruttori_genera() $cron$);

-- Le automazioni, per la pagina Impostazioni automazioni.
create or replace function public.crm_automazioni()
returns table (chiave text, nome text, descrizione text, attiva boolean, parametri jsonb,
               aggiornato_il timestamptz, aggiornato_da_nome text, azioni_create int, azioni_aperte int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
    select a.chiave, a.nome, a.descrizione, a.attiva, a.parametri, a.aggiornato_il, crm.nome_staff(a.aggiornato_da),
           (select count(*)::int from public.azioni_istruttori z where z.tipo = 'benvenuto'),
           (select count(*)::int from public.azioni_istruttori z where z.tipo = 'benvenuto' and z.completato_il is null)
      from public.automazioni a
     order by a.nome;
end;
$$;

-- Le scelte possibili: le categorie di lezione e i piani di abbonamento di PerfectGym.
create or replace function public.crm_automazioni_opzioni()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'categorie', (select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'nome', k.nome) order by k.nome), '[]'::jsonb)
                    from perfectgym.class_categories k where not k.is_deleted),
    'piani', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'canone', p.canone) order by p.nome), '[]'::jsonb)
                from perfectgym.payment_plans p
               where not p.is_deleted and not crm.e_pass(p.nome) and not coalesce(p.aggiuntivo, false)));
end;
$$;

-- Quante azioni al giorno farebbero queste regole: sugli iscritti degli ultimi 30 giorni
-- (che hanno gia' compiuto i giorni dell'automazione), guardando la situazione di adesso.
create or replace function public.crm_automazione_anteprima(p_chiave text, p_parametri jsonb)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  giorni int := least(greatest(coalesce((p_parametri ->> 'giorni')::int, 7), 0), 60);
  dal date := coalesce(nullif(p_parametri ->> 'iscritti_dal', '')::date, oggi - 30 - giorni);
  n int;
begin
  perform crm.chi();
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select count(*) into n from crm.azioni_istruttori_candidati(p_parametri, greatest(oggi - 30 - giorni, '2000-01-01'::date), oggi - giorni);
  return jsonb_build_object('persone_30_giorni', n, 'al_giorno', round(n / 30.0, 1));
end;
$$;

-- Salva le regole di un'automazione, controllando ogni valore.
create or replace function public.crm_automazione_salva(p_chiave text, p_attiva boolean, p_parametri jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  giorni int;
  dal date;
  abb text := coalesce(p_parametri ->> 'abbonamento', 'mai');
  lez text := coalesce(p_parametri ->> 'lezioni', 'nessuna');
  cat bigint := nullif(p_parametri ->> 'categoria_lezione', '')::bigint;
  piani jsonb := coalesce(p_parametri -> 'piani_esclusi', '[]'::jsonb);
begin
  if not crm.puo_vedere('automazioni') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if not exists (select 1 from public.automazioni where chiave = p_chiave) then
    raise exception 'Automazione inesistente';
  end if;
  begin
    giorni := (p_parametri ->> 'giorni')::int;
  exception when others then
    raise exception 'I giorni devono essere un numero';
  end;
  if giorni is null or giorni < 0 or giorni > 60 then
    raise exception 'I giorni devono essere da 0 a 60';
  end if;
  begin
    dal := (p_parametri ->> 'iscritti_dal')::date;
  exception when others then
    raise exception 'La data di partenza non è valida';
  end;
  if dal is null then raise exception 'Scegli da quale giorno guardare gli iscritti'; end if;
  if abb not in ('mai', 'nessuno_attivo', 'non_controllare') then raise exception 'Abbonamento non valido'; end if;
  if lez not in ('nessuna', 'almeno_una', 'non_controllare') then raise exception 'Regola sulle lezioni non valida'; end if;
  if cat is not null and not exists (select 1 from perfectgym.class_categories where id = cat) then
    raise exception 'Categoria di lezione inesistente';
  end if;
  if jsonb_typeof(piani) <> 'array' then raise exception 'Elenco dei piani non valido'; end if;

  update public.automazioni
     set attiva = coalesce(p_attiva, attiva),
         parametri = jsonb_build_object('giorni', giorni, 'iscritti_dal', dal, 'abbonamento', abb,
                                        'piani_esclusi', piani, 'lezioni', lez, 'categoria_lezione', cat),
         aggiornato_il = now(), aggiornato_da = me
   where chiave = p_chiave;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cosa vede l'istruttore
-- ---------------------------------------------------------------------------

-- La lista. p_chi: mie, libere, tutte. p_quando: da_fare (aperte), fatte.
create or replace function public.crm_azioni_istruttori(p_chi text default 'mie', p_quando text default 'da_fare', p_limite int default 300)
returns table (id uuid, tipo text, utente_id uuid, nome text, cognome text, telefono text, email text,
               iscritto_il date, da_fare_dal date, giorni_ritardo int,
               assegnato_a uuid, assegnato_nome text, pass_nome text, pass_fine date, abbonato_ora boolean,
               completato_il timestamptz, completato_da_nome text, esito text, nota text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return query
  select a.id, a.tipo, u.id,
         coalesce(nullif(pm.nome, ''), u.nome), coalesce(nullif(pm.cognome, ''), u.cognome),
         coalesce(nullif(pm.telefono, ''), u.telefono), coalesce(nullif(pm.email, ''), u.email),
         a.iscritto_il, a.da_fare_dal, greatest(oggi - a.da_fare_dal, 0)::int,
         a.assegnato_a, crm.nome_staff(a.assegnato_a), pass.nome, pass.fine,
         exists (select 1 from perfectgym.contracts c
                   join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
                  where c.member_id = a.member_id and not c.is_deleted
                    and not crm.e_pass(pp.nome) and pp.nome !~* 'wellhub|gympass|fitprime'
                    and not coalesce(pp.aggiuntivo, false) and (pp.canone > 0 or pp.nome ~* '^OLD')),
         a.completato_il, crm.nome_staff(a.completato_da), a.esito, a.nota
    from public.azioni_istruttori a
    join public.utenti u on u.id = a.utente_id and not crm.cancellata(u.member_id)
    left join perfectgym.members pm on pm.id = a.member_id
    left join lateral (
      select p.nome, c.data_fine as fine
        from perfectgym.contracts c
        join perfectgym.payment_plans p on p.id = c.payment_plan_id
       where c.member_id = a.member_id and not c.is_deleted and crm.e_pass_prova(p.nome)
       order by c.data_inizio desc nulls last limit 1) pass on true
   where case coalesce(p_chi, 'mie')
           when 'mie' then a.assegnato_a = me
           when 'libere' then a.assegnato_a is null
           else true end
     and case coalesce(p_quando, 'da_fare')
           when 'fatte' then a.completato_il is not null
           else a.completato_il is null and a.da_fare_dal <= oggi end
   order by case when p_quando = 'fatte' then a.completato_il end desc nulls last, a.da_fare_dal asc, a.creato_il asc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

-- I numeri in alto: le mie da fare, le mie in ritardo, le libere, le mie fatte negli ultimi 7 giorni.
create or replace function public.crm_azioni_istruttori_numeri()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'mie_da_fare', (select count(*) from public.azioni_istruttori where assegnato_a = me and completato_il is null and da_fare_dal <= oggi),
    'mie_in_ritardo', (select count(*) from public.azioni_istruttori where assegnato_a = me and completato_il is null and da_fare_dal < oggi),
    'libere', (select count(*) from public.azioni_istruttori where assegnato_a is null and completato_il is null and da_fare_dal <= oggi),
    'fatte_settimana', (select count(*) from public.azioni_istruttori where completato_da = me and completato_il >= now() - interval '7 days'));
end;
$$;

-- Presa in carico: se e' libera, e' mia. Se e' di un altro, serve l'autorizzazione «Opportunita' degli altri».
create or replace function public.crm_azione_istruttore_prendi(p_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  a public.azioni_istruttori;
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into a from public.azioni_istruttori where id = p_id for update;
  if a.id is null then raise exception 'Azione non trovata'; end if;
  if a.completato_il is not null then raise exception 'Questa azione è già chiusa'; end if;
  if a.assegnato_a is not null and a.assegnato_a <> me and not crm.ha('lead_altrui') then
    raise exception 'Questa azione è già in carico a %', crm.nome_staff(a.assegnato_a) using errcode = '42501';
  end if;
  update public.azioni_istruttori set assegnato_a = me, preso_in_carico_il = now() where id = p_id;
end;
$$;

-- La rimette fra le libere (la mia, o di un altro con l'autorizzazione).
create or replace function public.crm_azione_istruttore_lascia(p_id uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  update public.azioni_istruttori set assegnato_a = null, preso_in_carico_il = null
   where id = p_id and completato_il is null and (assegnato_a = me or crm.ha('lead_altrui'));
  if not found then raise exception 'Azione non trovata, già chiusa o in carico a un altro'; end if;
end;
$$;

-- La chiude con l'esito. Se era libera, la prende chi la chiude.
create or replace function public.crm_azione_istruttore_completa(p_id uuid, p_esito text, p_nota text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  a public.azioni_istruttori;
begin
  if not crm.puo_vedere('azioni_istruttori') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if p_esito is null or p_esito not in ('prenotata', 'da_richiamare', 'non_risponde', 'non_interessata') then
    raise exception 'Scegli come è andata';
  end if;
  select * into a from public.azioni_istruttori where id = p_id for update;
  if a.id is null then raise exception 'Azione non trovata'; end if;
  if a.completato_il is not null then raise exception 'Questa azione è già chiusa'; end if;
  if a.assegnato_a is not null and a.assegnato_a <> me and not crm.ha('lead_altrui') then
    raise exception 'Questa azione è in carico a %', crm.nome_staff(a.assegnato_a) using errcode = '42501';
  end if;
  update public.azioni_istruttori
     set completato_il = now(), completato_da = me, esito = p_esito,
         nota = nullif(trim(coalesce(p_nota, '')), ''),
         assegnato_a = coalesce(assegnato_a, me), preso_in_carico_il = coalesce(preso_in_carico_il, now())
   where id = p_id;
end;
$$;

revoke all on function public.crm_utenti(),
                       public.crm_utente_aggiorna(uuid, text, boolean, text[], text[], boolean, text[]),
                       public.crm_azioni_istruttori(text, text, int),
                       public.crm_azioni_istruttori_numeri(),
                       public.crm_azione_istruttore_prendi(uuid),
                       public.crm_azione_istruttore_lascia(uuid),
                       public.crm_azione_istruttore_completa(uuid, text, text),
                       public.crm_automazioni(), public.crm_automazioni_opzioni(),
                       public.crm_automazione_anteprima(text, jsonb), public.crm_automazione_salva(text, boolean, jsonb) from public, anon;
grant execute on function public.crm_utenti(),
                          public.crm_utente_aggiorna(uuid, text, boolean, text[], text[], boolean, text[]),
                          public.crm_azioni_istruttori(text, text, int),
                          public.crm_azioni_istruttori_numeri(),
                          public.crm_azione_istruttore_prendi(uuid),
                          public.crm_azione_istruttore_lascia(uuid),
                          public.crm_azione_istruttore_completa(uuid, text, text),
                          public.crm_automazioni(), public.crm_automazioni_opzioni(),
                          public.crm_automazione_anteprima(text, jsonb), public.crm_automazione_salva(text, boolean, jsonb) to authenticated;
