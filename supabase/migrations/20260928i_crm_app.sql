-- L'app del CRM: cosa legge e cosa fa
--
-- L'app non legge le tabelle: chiama funzioni `public.crm_*`. Ognuna e'
-- `security definer`, ha `search_path` vuoto e, come prima cosa, controlla che
-- chi chiama sia nello staff attivo (l'email della sessione di Supabase Auth
-- in `public.staff`). La chiave anon da sola non ne esegue nessuna: sono
-- concesse solo ad `authenticated`. Cosi' su Vercel c'e' solo la chiave anon.
--
-- Le regole della riunione del 28/09/2026 stanno qui, non nell'app:
--   - un lead non assegnato lo puo' prendere in carico chiunque;
--   - un lead assegnato lo riassegna o lo chiude solo chi ce l'ha, o un admin;
--   - commenti e task li scrive chiunque, e un task si puo' assegnare a un
--     altro operatore.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- Chi sono
-- ---------------------------------------------------------------------------

create or replace function crm.io()
returns public.staff
language sql
stable
security definer
set search_path = ''
as $$
  select s.* from public.staff s
   where s.attivo and s.email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- L'id di chi chiama, o un errore se non e' dello staff.
create or replace function crm.chi()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare s public.staff;
begin
  s := crm.io();
  if s.id is null then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  return s.id;
end;
$$;

create or replace function crm.e_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((crm.io()).ruolo = 'admin', false) $$;

create or replace function public.crm_io()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.id is null then null
         else jsonb_build_object('id', s.id, 'email', s.email, 'nome', s.nome, 'cognome', s.cognome, 'ruolo', s.ruolo) end
    from (select (crm.io()).*) s
$$;

create or replace function public.crm_staff()
returns table (id uuid, nome text, cognome text, ruolo text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  return query select s.id, s.nome, s.cognome, s.ruolo from public.staff s where s.attivo order by s.nome;
end;
$$;

create or replace function crm.nome_staff(p uuid) returns text
language sql stable security definer set search_path = ''
as $$ select nullif(concat_ws(' ', s.nome, s.cognome), '') from public.staff s where s.id = p $$;

create or replace function crm.inizio_oggi() returns timestamptz
language sql stable set search_path = ''
as $$ select (((now() at time zone 'Europe/Rome')::date)::timestamp at time zone 'Europe/Rome') $$;

-- ---------------------------------------------------------------------------
-- La home: cosa c'e' da gestire
-- ---------------------------------------------------------------------------

create or replace function public.crm_home()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  oggi timestamptz := crm.inizio_oggi();
begin
  return jsonb_build_object(
    'lead_da_gestire', (select count(*) from public.lead where fase = 'da_gestire'),
    'miei_lead', (select count(*) from public.lead where fase = 'in_gestione' and assegnato_a = me),
    'lead_in_gestione', (select count(*) from public.lead where fase = 'in_gestione'),
    'prove_in_scadenza', (select count(*) from public.prove where esito is null and data_fine between now() and now() + interval '2 days'),
    'prove_in_corso', (select count(*) from public.prove where esito is null and data_fine >= now()),
    'prove_senza_esito', (select count(*) from public.prove where esito is null and data_fine < now() and data_fine > now() - interval '30 days'),
    'contratti_da_controllare', (select count(*) from public.nuovi_contratti where controllo <> 'controllato'),
    'disdette_da_gestire', (select count(*) from public.disdette where esito is null or esito = 'standby'),
    'miei_task_arretrati', (select count(*) from public.task where completato_il is null and assegnato_a = me and data < oggi),
    'miei_task_oggi', (select count(*) from public.task where completato_il is null and assegnato_a = me and data >= oggi and data < oggi + interval '1 day'),
    'task_senza_assegnatario', (select count(*) from public.task where completato_il is null and assegnato_a is null)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Lead
-- ---------------------------------------------------------------------------

-- p_vista: da_gestire | in_gestione | mie | vinte | perse | tutte
create or replace function public.crm_lead(p_vista text default 'da_gestire', p_fonte text default null, p_testo text default null, p_limite int default 200)
returns table (
  id uuid, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
  fonte text, fonte_dettaglio text, attivita_interesse text, orario_ricontatto text, presentato_da text,
  fase text, esito text, assegnato_a uuid, assegnato_nome text, preso_in_carico_il timestamptz,
  creato_il timestamptz, chiuso_il timestamptz, note text,
  commenti bigint, ultimo_commento text, ultimo_commento_il timestamptz,
  task_aperti bigint, prossimo_task timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  parole text[] := array_remove(regexp_split_to_array(lower(trim(coalesce(p_testo, ''))), '\s+'), '');
begin
  return query
  select l.id, u.id, u.nome, u.cognome, u.telefono, u.email, u.member_id,
         l.fonte, l.fonte_dettaglio, l.attivita_interesse, l.orario_ricontatto, l.presentato_da,
         l.fase, l.esito, l.assegnato_a, crm.nome_staff(l.assegnato_a), l.preso_in_carico_il,
         l.creato_il, l.chiuso_il, l.note,
         (select count(*) from public.commenti c where c.utente_id = u.id),
         (select c.testo from public.commenti c where c.utente_id = u.id order by c.creato_il desc limit 1),
         (select max(c.creato_il) from public.commenti c where c.utente_id = u.id),
         (select count(*) from public.task t where t.utente_id = u.id and t.completato_il is null),
         (select min(t.data) from public.task t where t.utente_id = u.id and t.completato_il is null)
    from public.lead l
    join public.utenti u on u.id = l.utente_id
   where case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then l.fase = 'da_gestire'
           when 'in_gestione' then l.fase = 'in_gestione'
           when 'mie' then l.fase = 'in_gestione' and l.assegnato_a = me
           when 'vinte' then l.fase = 'vinta'
           when 'perse' then l.fase = 'persa'
           else true end
     and (p_fonte is null or l.fonte = p_fonte)
     and (cardinality(parole) = 0 or not exists (
           select 1 from unnest(parole) w
            where lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm)) not like '%' || w || '%'))
   order by case when p_vista in ('vinte', 'perse') then l.chiuso_il end desc nulls last,
            l.creato_il desc
   limit least(greatest(coalesce(p_limite, 200), 1), 500);
end;
$$;

-- ---------------------------------------------------------------------------
-- Prove
-- ---------------------------------------------------------------------------

-- p_vista: in_corso | in_scadenza | senza_esito | chiuse | tutte
create or replace function public.crm_prove(p_vista text default 'in_corso', p_limite int default 300)
returns table (
  id uuid, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
  lead_id uuid, fonte text, fonte_dettaglio text, contract_id bigint,
  tipo_pass text, data_inizio timestamptz, data_fine timestamptz, giorni_rimasti int,
  gestito_da uuid, gestito_nome text, esito text, obiezione text, note text,
  ingressi bigint, ultimo_ingresso timestamptz, prenotazioni bigint, presenze bigint,
  iscritto_su_pgm boolean, task_aperti bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  return query
  select p.id, u.id, u.nome, u.cognome, u.telefono, u.email, u.member_id,
         p.lead_id, l.fonte, l.fonte_dettaglio, p.contract_id,
         p.tipo_pass, p.data_inizio, p.data_fine,
         case when p.data_fine is not null then ceil(extract(epoch from p.data_fine - now()) / 86400)::int end,
         p.gestito_da, crm.nome_staff(p.gestito_da), p.esito, p.obiezione, p.note,
         -- La settimana di prova, dal mirror: ingressi e lezioni fra inizio e fine.
         (select count(*) from perfectgym.member_club_visits v
           where v.member_id = u.member_id and not v.is_deleted
             and v.entrata >= p.data_inizio and v.entrata <= coalesce(p.data_fine, now())),
         (select max(v.entrata) from perfectgym.member_club_visits v
           where v.member_id = u.member_id and not v.is_deleted and v.entrata >= p.data_inizio),
         (select count(*) from perfectgym.class_bookings b join perfectgym.classes c on c.id = b.class_id
           where b.member_id = u.member_id and not b.is_deleted and not coalesce(b.annullata, false)
             and c.inizio >= p.data_inizio and c.inizio <= coalesce(p.data_fine, now()) + interval '1 day'),
         (select count(*) from perfectgym.class_bookings b join perfectgym.classes c on c.id = b.class_id
           where b.member_id = u.member_id and not b.is_deleted and coalesce(b.presente, false)
             and c.inizio >= p.data_inizio and c.inizio <= coalesce(p.data_fine, now()) + interval '1 day'),
         -- Si e' iscritto? Un contratto vero (non un pass) firmato dall'inizio della prova.
         exists (select 1 from perfectgym.contracts k join perfectgym.payment_plans pp on pp.id = k.payment_plan_id
                  where k.member_id = u.member_id and not k.is_deleted and not crm.e_pass(pp.nome)
                    and k.data_firma >= (p.data_inizio at time zone 'Europe/Rome')::date),
         (select count(*) from public.task t where t.utente_id = u.id and t.completato_il is null)
    from public.prove p
    join public.utenti u on u.id = p.utente_id
    left join public.lead l on l.id = p.lead_id
   where case coalesce(p_vista, 'in_corso')
           when 'in_corso' then p.esito is null and p.data_fine >= now()
           when 'in_scadenza' then p.esito is null and p.data_fine between now() and now() + interval '2 days'
           when 'senza_esito' then p.esito is null and p.data_fine < now()
           when 'chiuse' then p.esito is not null
           else true end
   order by case when coalesce(p_vista, 'in_corso') in ('in_corso', 'in_scadenza') then p.data_fine end asc nulls last,
            p.data_fine desc nulls last
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- Nuovi contratti
-- ---------------------------------------------------------------------------

-- p_vista: da_controllare | controllati | tutti
create or replace function public.crm_nuovi_contratti(p_vista text default 'da_controllare', p_limite int default 300)
returns table (
  contract_id bigint, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
  numero_socio text, codice_fiscale_pgm text, piano text, canone numeric,
  data_firma date, data_inizio date, data_fine date, stato_pgm text, metodo_pagamento_pgm boolean, consulente_pgm text,
  controllo text, metodo_pagamento_ok boolean, codice_fiscale_ok boolean, tesseramento text, numero_tessera text,
  errore_asi text, fonte text, referral text, note text, gestito_nome text, gestito_il timestamptz, creato_il timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  return query
  select n.contract_id, u.id, coalesce(m.nome, u.nome), coalesce(m.cognome, u.cognome), coalesce(m.telefono, u.telefono),
         coalesce(m.email, u.email), n.member_id, m.numero, m.codice_fiscale, pp.nome, pp.canone,
         c.data_firma, c.data_inizio, c.data_fine, c.stato, (c.dati ->> 'paymentSourceId') is not null,
         nullif(concat_ws(' ', e.nome, e.cognome), ''),
         n.controllo, n.metodo_pagamento_ok, n.codice_fiscale_ok, n.tesseramento, n.numero_tessera,
         n.errore_asi, n.fonte, n.referral, n.note, crm.nome_staff(n.gestito_da), n.gestito_il, n.creato_il
    from public.nuovi_contratti n
    left join public.utenti u on u.id = n.utente_id
    left join perfectgym.contracts c on c.id = n.contract_id
    left join perfectgym.members m on m.id = coalesce(n.member_id, c.member_id)
    left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
    left join perfectgym.employees e on e.id = c.consulente_id
   where case coalesce(p_vista, 'da_controllare')
           when 'da_controllare' then n.controllo <> 'controllato'
           when 'controllati' then n.controllo = 'controllato'
           else true end
   order by coalesce(c.data_firma, n.creato_il::date) desc, n.contract_id desc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- Disdette
-- ---------------------------------------------------------------------------

-- p_vista: da_gestire | gestite | tutte
create or replace function public.crm_disdette(p_vista text default 'da_gestire', p_limite int default 300)
returns table (
  id uuid, contract_id bigint, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
  piano text, canone numeric, data_firma date, data_fine date, data_disdetta date,
  esito text, contatto text, motivo text, note text, gestito_nome text, gestito_il timestamptz, creato_il timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  return query
  select d.id, d.contract_id, u.id, coalesce(m.nome, u.nome), coalesce(m.cognome, u.cognome), coalesce(m.telefono, u.telefono),
         coalesce(m.email, u.email), coalesce(d.member_id, c.member_id),
         pp.nome, coalesce(pp.canone, d.valore_contratto), c.data_firma, c.data_fine, coalesce(d.data_disdetta, c.data_disdetta),
         d.esito, d.contatto, d.motivo, d.note, crm.nome_staff(d.gestito_da), d.gestito_il, d.creato_il
    from public.disdette d
    left join public.utenti u on u.id = d.utente_id
    left join perfectgym.contracts c on c.id = d.contract_id
    left join perfectgym.members m on m.id = coalesce(d.member_id, c.member_id)
    left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
   where case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then d.esito is null or d.esito = 'standby'
           when 'gestite' then d.esito in ('vinto', 'perso')
           else true end
   order by d.creato_il desc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- Task
-- ---------------------------------------------------------------------------

-- p_chi: miei | tutti | nessuno ; p_quando: arretrati | oggi | prossimi | fatti
create or replace function public.crm_task(p_chi text default 'miei', p_quando text default 'oggi', p_limite int default 300)
returns table (
  id uuid, utente_id uuid, nome text, cognome text, telefono text, lead_id uuid, prova_id uuid,
  tipo text, data timestamptz, nota text, assegnato_a uuid, assegnato_nome text, autore text,
  completato_il timestamptz, esito text, creato_il timestamptz
)
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
         t.completato_il, t.esito, t.creato_il
    from public.task t
    join public.utenti u on u.id = t.utente_id
   where case coalesce(p_chi, 'miei')
           when 'miei' then t.assegnato_a = me
           when 'nessuno' then t.assegnato_a is null
           else true end
     and case coalesce(p_quando, 'oggi')
           when 'arretrati' then t.completato_il is null and t.data < oggi
           when 'oggi' then t.completato_il is null and t.data >= oggi and t.data < oggi + interval '1 day'
           when 'prossimi' then t.completato_il is null and t.data >= oggi + interval '1 day'
           when 'fatti' then t.completato_il is not null
           else t.completato_il is null end
   order by case when p_quando = 'fatti' then t.completato_il end desc nulls last, t.data asc nulls last
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- La scheda della persona
-- ---------------------------------------------------------------------------

create or replace function public.crm_persona(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare out jsonb;
begin
  perform crm.chi();
  select jsonb_build_object(
    'persona', jsonb_build_object('id', u.id, 'nome', u.nome, 'cognome', u.cognome, 'email', u.email,
                                  'telefono', u.telefono, 'telefono_norm', u.telefono_norm, 'member_id', u.member_id,
                                  'codice_fiscale', coalesce(m.codice_fiscale, u.codice_fiscale),
                                  'data_nascita', coalesce(m.data_nascita, u.data_nascita), 'creato_il', u.creato_il),
    'socio', case when m.id is null then null else jsonb_build_object(
       'numero', m.numero, 'tipo', m.member_type, 'attivo', m.attivo, 'creato_il', m.creato_il,
       'saldo', (select b.saldo from perfectgym.member_balances b where b.id = m.id),
       'contratti', coalesce((select jsonb_agg(jsonb_build_object(
            'id', c.id, 'piano', pp.nome, 'canone', pp.canone, 'stato', c.stato, 'data_firma', c.data_firma,
            'data_inizio', c.data_inizio, 'data_fine', c.data_fine, 'data_disdetta', c.data_disdetta)
            order by (c.stato = 'Current') desc, c.data_inizio desc)
          from perfectgym.contracts c left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
         where c.member_id = m.id and not c.is_deleted and c.club_id = 1), '[]'::jsonb),
       'ingressi', coalesce((select jsonb_agg(jsonb_build_object('entrata', v.entrata, 'uscita', v.uscita) order by v.entrata desc)
          from (select * from perfectgym.member_club_visits v where v.member_id = m.id and not v.is_deleted
                 order by v.entrata desc limit 15) v), '[]'::jsonb),
       'ingressi_30gg', (select count(*) from perfectgym.member_club_visits v
                          where v.member_id = m.id and not v.is_deleted and v.entrata > now() - interval '30 days'),
       'prenotazioni', coalesce((select jsonb_agg(jsonb_build_object('inizio', c.inizio, 'lezione', t.nome,
                                   'annullata', b.annullata, 'presente', b.presente) order by c.inizio desc)
          from (select * from perfectgym.class_bookings b where b.member_id = m.id and not b.is_deleted
                 order by b.id desc limit 15) b
          join perfectgym.classes c on c.id = b.class_id
          left join perfectgym.class_types t on t.id = c.class_type_id), '[]'::jsonb)
    ) end,
    'lead', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'fonte', l.fonte, 'fonte_dettaglio', l.fonte_dettaglio, 'attivita_interesse', l.attivita_interesse,
        'fase', l.fase, 'esito', l.esito, 'assegnato_a', l.assegnato_a, 'assegnato_nome', crm.nome_staff(l.assegnato_a),
        'creato_il', l.creato_il, 'chiuso_il', l.chiuso_il, 'note', l.note, 'presentato_da', l.presentato_da,
        'orario_ricontatto', l.orario_ricontatto) order by l.creato_il desc)
      from public.lead l where l.utente_id = u.id), '[]'::jsonb),
    'prove', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'tipo_pass', p.tipo_pass, 'data_inizio', p.data_inizio, 'data_fine', p.data_fine,
        'esito', p.esito, 'obiezione', p.obiezione, 'gestito_nome', crm.nome_staff(p.gestito_da), 'note', p.note)
        order by p.data_inizio desc)
      from public.prove p where p.utente_id = u.id), '[]'::jsonb),
    'nuovi_contratti', coalesce((select jsonb_agg(jsonb_build_object(
        'contract_id', n.contract_id, 'controllo', n.controllo, 'tesseramento', n.tesseramento,
        'numero_tessera', n.numero_tessera, 'note', n.note, 'creato_il', n.creato_il) order by n.creato_il desc)
      from public.nuovi_contratti n where n.utente_id = u.id), '[]'::jsonb),
    'disdette', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'contract_id', d.contract_id, 'data_disdetta', d.data_disdetta, 'esito', d.esito,
        'motivo', d.motivo, 'contatto', d.contatto, 'note', d.note) order by d.creato_il desc)
      from public.disdette d where d.utente_id = u.id), '[]'::jsonb),
    -- La storia: commenti e task insieme, dal piu' recente.
    'storia', coalesce((select jsonb_agg(x.j order by x.quando desc) from (
        select c.creato_il as quando, jsonb_build_object('tipo', 'commento', 'id', c.id, 'quando', c.creato_il,
               'testo', c.testo, 'autore', coalesce(crm.nome_staff(c.autore_id), c.autore_nome)) as j
          from public.commenti c where c.utente_id = u.id
        union all
        select coalesce(t.completato_il, t.data, t.creato_il), jsonb_build_object('tipo', 'task', 'id', t.id,
               'quando', coalesce(t.completato_il, t.data, t.creato_il), 'task_tipo', t.tipo, 'data', t.data,
               'nota', t.nota, 'completato_il', t.completato_il, 'esito', t.esito,
               'assegnato_nome', crm.nome_staff(t.assegnato_a),
               'autore', coalesce(crm.nome_staff(t.creato_da), t.autore_nome))
          from public.task t where t.utente_id = u.id
        order by 1 desc limit 200) x), '[]'::jsonb)
  ) into out
  from public.utenti u
  left join perfectgym.members m on m.id = u.member_id
  where u.id = p_id;
  return out;
end;
$$;

-- La ricerca: ogni parola deve comparire in nome, cognome, email o telefono,
-- in qualunque ordine. Un numero si cerca anche normalizzato.
create or replace function public.crm_cerca(p_testo text, p_limite int default 50)
returns table (id uuid, nome text, cognome text, email text, telefono text, member_id bigint,
               lead_aperti bigint, ultima_attivita timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parole text[] := array_remove(regexp_split_to_array(lower(trim(coalesce(p_testo, ''))), '\s+'), '');
  tel text := public.normalizza_telefono(p_testo);
begin
  perform crm.chi();
  if cardinality(parole) = 0 then return; end if;
  return query
  select u.id, u.nome, u.cognome, u.email, u.telefono, u.member_id,
         (select count(*) from public.lead l where l.utente_id = u.id and l.fase in ('da_gestire', 'in_gestione')),
         u.aggiornato_il
    from public.utenti u
   where (tel is not null and p_testo ~ '^[\s\d+()./-]{6,}$' and u.telefono_norm like '%' || right(tel, 9) || '%')
      or not exists (select 1 from unnest(parole) w
                      where lower(concat_ws(' ', u.nome, u.cognome, u.email, u.telefono, u.telefono_norm)) not like '%' || w || '%')
   order by u.aggiornato_il desc nulls last
   limit least(greatest(coalesce(p_limite, 50), 1), 200);
end;
$$;

-- ---------------------------------------------------------------------------
-- Le azioni sui lead
-- ---------------------------------------------------------------------------

create or replace function crm.puo_gestire(p_lead uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select crm.e_admin() or exists (select 1 from public.lead l where l.id = p_lead
                                   and (l.assegnato_a is null or l.assegnato_a = crm.chi()))
$$;

create or replace function public.crm_lead_prendi(p_lead uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  if not crm.puo_gestire(p_lead) then
    raise exception 'Questo lead e'' gia'' in carico a %', (select crm.nome_staff(assegnato_a) from public.lead where id = p_lead)
      using errcode = '42501';
  end if;
  update public.lead
     set assegnato_a = me, fase = case when fase = 'da_gestire' then 'in_gestione' else fase end,
         preso_in_carico_il = coalesce(preso_in_carico_il, now()), aggiornato_il = now()
   where id = p_lead;
end;
$$;

create or replace function public.crm_lead_assegna(p_lead uuid, p_staff uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_gestire(p_lead) then
    raise exception 'Solo chi ha in carico il lead, o un admin, puo'' riassegnarlo' using errcode = '42501';
  end if;
  if not exists (select 1 from public.staff where id = p_staff and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.lead
     set assegnato_a = p_staff, fase = case when fase = 'da_gestire' then 'in_gestione' else fase end,
         preso_in_carico_il = coalesce(preso_in_carico_il, now()), aggiornato_il = now()
   where id = p_lead;
end;
$$;

-- p_fase: vinta | persa ; p_esito (per le vinte): prova | contratto
create or replace function public.crm_lead_chiudi(p_lead uuid, p_fase text, p_esito text default null, p_nota text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); u uuid;
begin
  if p_fase not in ('vinta', 'persa') then raise exception 'Fase non valida'; end if;
  if not crm.puo_gestire(p_lead) then
    raise exception 'Solo chi ha in carico il lead, o un admin, puo'' chiuderlo' using errcode = '42501';
  end if;
  update public.lead
     set fase = p_fase, esito = case when p_fase = 'vinta' then p_esito end,
         assegnato_a = coalesce(assegnato_a, me), chiuso_il = now(), aggiornato_il = now()
   where id = p_lead
  returning utente_id into u;
  if nullif(trim(coalesce(p_nota, '')), '') is not null then
    insert into public.commenti (utente_id, lead_id, testo, autore_id) values (u, p_lead, trim(p_nota), me);
  end if;
end;
$$;

create or replace function public.crm_lead_riapri(p_lead uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.puo_gestire(p_lead) then
    raise exception 'Solo chi ha avuto in carico il lead, o un admin, puo'' riaprirlo' using errcode = '42501';
  end if;
  update public.lead
     set fase = case when assegnato_a is null then 'da_gestire' else 'in_gestione' end, esito = null, chiuso_il = null,
         aggiornato_il = now()
   where id = p_lead;
end;
$$;

-- Un lead nuovo inserito dall'app: tour/walk-in, telefonata, email.
create or replace function public.crm_lead_nuovo(
  p_nome text, p_cognome text, p_telefono text, p_email text,
  p_fonte text, p_fonte_dettaglio text default null, p_attivita text default null,
  p_nota text default null, p_prendo boolean default true)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); u uuid; l uuid;
begin
  if coalesce(p_fonte, '') not in ('sito', 'tour', 'referral', 'meta', 'altro') then raise exception 'Fonte non valida'; end if;
  if public.normalizza_telefono(p_telefono) is null and public.normalizza_email(p_email) is null then
    raise exception 'Serve almeno un telefono o un''email';
  end if;
  u := crm.persona(p_nome, p_cognome, p_email, p_telefono,
                   (select m.id from perfectgym.members m
                     where not m.is_deleted and coalesce(m.home_club_id, 1) = 1
                       and (lower(m.email) = public.normalizza_email(p_email)
                            or public.normalizza_telefono(m.telefono) = public.normalizza_telefono(p_telefono))
                     order by (m.member_type = 'Member') desc, m.version desc limit 1));
  insert into public.lead (utente_id, fonte, fonte_dettaglio, attivita_interesse, fase, assegnato_a, preso_in_carico_il, origine)
  values (u, p_fonte, nullif(trim(coalesce(p_fonte_dettaglio, '')), ''), nullif(trim(coalesce(p_attivita, '')), ''),
          case when p_prendo then 'in_gestione' else 'da_gestire' end,
          case when p_prendo then me end, case when p_prendo then now() end, 'app')
  returning id into l;
  if nullif(trim(coalesce(p_nota, '')), '') is not null then
    insert into public.commenti (utente_id, lead_id, testo, autore_id) values (u, l, trim(p_nota), me);
  end if;
  return l;
end;
$$;

-- ---------------------------------------------------------------------------
-- Commenti e task
-- ---------------------------------------------------------------------------

create or replace function public.crm_commento(p_utente uuid, p_testo text, p_lead uuid default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); c uuid;
begin
  if nullif(trim(coalesce(p_testo, '')), '') is null then raise exception 'Il commento e'' vuoto'; end if;
  insert into public.commenti (utente_id, lead_id, testo, autore_id)
  values (p_utente, p_lead, trim(p_testo), me) returning id into c;
  update public.utenti set aggiornato_il = now() where id = p_utente;
  return c;
end;
$$;

create or replace function public.crm_task_nuovo(p_utente uuid, p_tipo text, p_data timestamptz, p_nota text default null,
                                                 p_assegnato uuid default null, p_lead uuid default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); t uuid;
begin
  insert into public.task (utente_id, lead_id, tipo, data, nota, assegnato_a, creato_da)
  values (p_utente, p_lead, p_tipo, coalesce(p_data, now()), nullif(trim(coalesce(p_nota, '')), ''),
          coalesce(p_assegnato, me), me)
  returning id into t;
  update public.utenti set aggiornato_il = now() where id = p_utente;
  return t;
end;
$$;

create or replace function public.crm_task_completa(p_task uuid, p_esito text default null, p_nota text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); u uuid; l uuid;
begin
  if p_esito is not null and p_esito not in ('positivo', 'negativo') then raise exception 'Esito non valido'; end if;
  update public.task
     set completato_il = now(), esito = p_esito, assegnato_a = coalesce(assegnato_a, me)
   where id = p_task and completato_il is null
  returning utente_id, lead_id into u, l;
  if u is not null and nullif(trim(coalesce(p_nota, '')), '') is not null then
    insert into public.commenti (utente_id, lead_id, testo, autore_id) values (u, l, trim(p_nota), me);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prove, contratti, disdette
-- ---------------------------------------------------------------------------

create or replace function public.crm_prova_aggiorna(p_prova uuid, p_esito text default null, p_obiezione text default null,
                                                     p_note text default null, p_gestisco boolean default false)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  if p_esito is not null and p_esito not in ('iscritto', 'non_iscritto', '') then raise exception 'Esito non valido'; end if;
  update public.prove
     set esito = nullif(p_esito, ''),
         obiezione = nullif(trim(coalesce(p_obiezione, '')), ''),
         note = nullif(trim(coalesce(p_note, '')), ''),
         gestito_da = case when p_gestisco or nullif(p_esito, '') is not null then coalesce(gestito_da, me) else gestito_da end
   where id = p_prova;
end;
$$;

create or replace function public.crm_contratto_aggiorna(
  p_contract bigint, p_metodo_pagamento_ok boolean, p_codice_fiscale_ok boolean, p_tesseramento text,
  p_numero_tessera text, p_errore_asi text, p_fonte text, p_referral text, p_note text, p_controllo text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  if p_controllo not in ('da_controllare', 'in_corso', 'errore', 'controllato') then raise exception 'Stato non valido'; end if;
  update public.nuovi_contratti
     set metodo_pagamento_ok = p_metodo_pagamento_ok, codice_fiscale_ok = p_codice_fiscale_ok,
         tesseramento = nullif(p_tesseramento, ''), numero_tessera = nullif(trim(coalesce(p_numero_tessera, '')), ''),
         errore_asi = nullif(trim(coalesce(p_errore_asi, '')), ''), fonte = nullif(trim(coalesce(p_fonte, '')), ''),
         referral = nullif(trim(coalesce(p_referral, '')), ''), note = nullif(trim(coalesce(p_note, '')), ''),
         controllo = p_controllo,
         gestito_da = case when p_controllo = 'controllato' then me else gestito_da end,
         gestito_il = case when p_controllo = 'controllato' then now() else gestito_il end
   where contract_id = p_contract;
end;
$$;

create or replace function public.crm_disdetta_aggiorna(p_id uuid, p_esito text, p_contatto text, p_motivo text, p_note text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi();
begin
  update public.disdette
     set esito = nullif(p_esito, ''), contatto = nullif(p_contatto, ''), motivo = nullif(trim(coalesce(p_motivo, '')), ''),
         note = nullif(trim(coalesce(p_note, '')), ''),
         gestito_da = case when nullif(p_esito, '') is not null then me else gestito_da end,
         gestito_il = case when nullif(p_esito, '') is not null then now() else gestito_il end
   where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chi puo' chiamare cosa
-- ---------------------------------------------------------------------------

do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'crm\_%' loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end;
$$;

-- La persona di un lead: dopo averlo creato l'app apre la sua scheda.
create or replace function public.crm_utente_del_lead(p_lead uuid)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  return (select utente_id from public.lead where id = p_lead);
end;
$$;
revoke all on function public.crm_utente_del_lead(uuid) from public, anon;
grant execute on function public.crm_utente_del_lead(uuid) to authenticated;
