-- Disdette e rinnovi si prendono in carico come i lead
--
-- Una disdetta o un rinnovo aperto che nessuno segue e' «da gestire»: lo
-- prende chi arriva, con «Prendo in carico». Chi ce l'ha lo passa a un collega
-- («Assegna») o lo rimette da assegnare. Le regole sono quelle dei lead
-- (crm.puo_gestire()): uno di nessuno lo prende chiunque; quello di un collega
-- lo riassegna, lo rimette da assegnare o lo chiude solo lui, un admin o chi ha
-- l'autorizzazione «Lead degli altri». L'esito, il contatto, il motivo e le
-- note si scrivono nella scheda della persona, come per i lead.
--
--   crm_disdetta_assegna(p_id, p_staff)  p_staff vuoto: a me («Prendo in carico»)
--   crm_disdetta_rilascia(p_id)          torna da gestire, di nessuno
--   crm_rinnovo_assegna, crm_rinnovo_rilascia: uguali
--
-- Chi prende una disdetta o un rinnovo prende anche i suoi task aperti che non
-- sono di nessuno (quelli automatici: «chiamare per capire il motivo»,
-- «chiamare per il rinnovo»). Rimettendolo da assegnare, i task restano a chi
-- li aveva, come per i lead.
--
-- crm_disdetta_aggiorna() e crm_rinnovo_aggiorna(): quella di un collega la
-- salva solo chi puo' gestirla; salvare quella di nessuno la prende in carico.
--
-- Le viste, come per i lead: da_gestire (aperti, di nessuno), in_gestione
-- (aperti, di qualcuno), mie (aperti, miei), piu' quelle chiuse di prima. Le
-- disdette aperte restano quelle degli ultimi 30 giorni. In home, «Disdette da
-- gestire» e «Rinnovi da gestire» contano quelli di nessuno.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- Chi puo' gestirli: come i lead
-- ---------------------------------------------------------------------------

create or replace function crm.puo_gestire_disdetta(p_id uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select crm.ha('lead_altrui') or exists (select 1 from public.disdette d where d.id = p_id
                                          and (d.gestito_da is null or d.gestito_da = crm.chi()))
$$;

create or replace function crm.puo_gestire_rinnovo(p_id uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select crm.ha('lead_altrui') or exists (select 1 from public.rinnovi r where r.id = p_id
                                          and (r.assegnato_a is null or r.assegnato_a = crm.chi()))
$$;

revoke all on function crm.puo_gestire_disdetta(uuid), crm.puo_gestire_rinnovo(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Disdette: prendere, assegnare, rimettere da assegnare
-- ---------------------------------------------------------------------------

create or replace function public.crm_disdetta_assegna(p_id uuid, p_staff uuid default null)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  chi uuid := coalesce(p_staff, me);
  d public.disdette;
begin
  perform crm.richiedi_sezione('disdette');
  select * into d from public.disdette where id = p_id for update;
  if d.id is null then
    raise exception 'Disdetta inesistente';
  end if;
  if d.esito in ('vinto', 'perso') then
    raise exception 'La disdetta è chiusa: per riassegnarla, prima si riapre';
  end if;
  if not crm.puo_gestire_disdetta(p_id) then
    if p_staff is null then
      raise exception 'Questa disdetta è già in carico a %', crm.nome_staff(d.gestito_da) using errcode = '42501';
    end if;
    raise exception 'Solo chi ha in carico la disdetta, o un admin, può riassegnarla' using errcode = '42501';
  end if;
  if not exists (select 1 from public.staff where id = chi and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.disdette set gestito_da = chi where id = p_id;
  update public.task set assegnato_a = chi
   where disdetta_id = p_id and completato_il is null and assegnato_a is null;
end;
$$;

create or replace function public.crm_disdetta_rilascia(p_id uuid)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  d public.disdette;
begin
  perform crm.richiedi_sezione('disdette');
  select * into d from public.disdette where id = p_id for update;
  if d.id is null then
    raise exception 'Disdetta inesistente';
  end if;
  if d.esito in ('vinto', 'perso') or d.gestito_da is null then
    raise exception 'Si rimette da assegnare solo una disdetta aperta in carico a qualcuno';
  end if;
  if not crm.puo_gestire_disdetta(p_id) then
    raise exception 'Solo chi ha in carico la disdetta, o un admin, può rimetterla da assegnare' using errcode = '42501';
  end if;
  update public.disdette set gestito_da = null where id = p_id;
end;
$$;

-- L'esito dalla scheda (e dalla pagina, finche' c'e' la versione di prima):
-- quella di un collega solo chi puo' gestirla; quella di nessuno si prende.
create or replace function public.crm_disdetta_aggiorna(p_id uuid, p_esito text, p_contatto text, p_motivo text, p_note text,
                                                        p_assegnato uuid default null)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  chi uuid;
begin
  perform crm.richiedi_sezione('disdette');
  if not crm.puo_gestire_disdetta(p_id) then
    raise exception 'Solo chi ha in carico la disdetta, o un admin, può aggiornarla' using errcode = '42501';
  end if;
  if p_assegnato is not null and not exists (select 1 from public.staff where id = p_assegnato and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.disdette
     set esito = nullif(p_esito, ''), contatto = nullif(p_contatto, ''), motivo = nullif(trim(coalesce(p_motivo, '')), ''),
         note = nullif(trim(coalesce(p_note, '')), ''),
         gestito_da = coalesce(p_assegnato, gestito_da, me),
         gestito_il = case when nullif(p_esito, '') is not null then now() else gestito_il end
   where id = p_id
  returning gestito_da into chi;
  update public.task set assegnato_a = chi
   where disdetta_id = p_id and completato_il is null and assegnato_a is null and chi is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rinnovi: uguali
-- ---------------------------------------------------------------------------

create or replace function public.crm_rinnovo_assegna(p_id uuid, p_staff uuid default null)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  chi uuid := coalesce(p_staff, me);
  r public.rinnovi;
begin
  perform crm.richiedi_sezione('rinnovi');
  select * into r from public.rinnovi where id = p_id for update;
  if r.id is null then
    raise exception 'Rinnovo inesistente';
  end if;
  if r.esito is not null then
    raise exception 'Il rinnovo è chiuso: per riassegnarlo, prima si riapre';
  end if;
  if not crm.puo_gestire_rinnovo(p_id) then
    if p_staff is null then
      raise exception 'Questo rinnovo è già in carico a %', crm.nome_staff(r.assegnato_a) using errcode = '42501';
    end if;
    raise exception 'Solo chi ha in carico il rinnovo, o un admin, può riassegnarlo' using errcode = '42501';
  end if;
  if not exists (select 1 from public.staff where id = chi and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.rinnovi set assegnato_a = chi where id = p_id;
  update public.task set assegnato_a = chi
   where rinnovo_id = p_id and completato_il is null and assegnato_a is null;
end;
$$;

create or replace function public.crm_rinnovo_rilascia(p_id uuid)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  r public.rinnovi;
begin
  perform crm.richiedi_sezione('rinnovi');
  select * into r from public.rinnovi where id = p_id for update;
  if r.id is null then
    raise exception 'Rinnovo inesistente';
  end if;
  if r.esito is not null or r.assegnato_a is null then
    raise exception 'Si rimette da assegnare solo un rinnovo aperto in carico a qualcuno';
  end if;
  if not crm.puo_gestire_rinnovo(p_id) then
    raise exception 'Solo chi ha in carico il rinnovo, o un admin, può rimetterlo da assegnare' using errcode = '42501';
  end if;
  update public.rinnovi set assegnato_a = null where id = p_id;
end;
$$;

create or replace function public.crm_rinnovo_aggiorna(p_id uuid, p_esito text, p_assegnato uuid, p_note text)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  me uuid;
  chi uuid;
begin
  perform crm.richiedi_sezione('rinnovi');
  me := crm.chi();
  if coalesce(p_esito, '') not in ('', 'rinnovato', 'non_rinnovato') then raise exception 'Esito non valido'; end if;
  if not exists (select 1 from public.rinnovi where id = p_id) then raise exception 'Rinnovo non trovato'; end if;
  if not crm.puo_gestire_rinnovo(p_id) then
    raise exception 'Solo chi ha in carico il rinnovo, o un admin, può aggiornarlo' using errcode = '42501';
  end if;
  if p_assegnato is not null and not exists (select 1 from public.staff where id = p_assegnato and attivo) then
    raise exception 'Operatore non valido';
  end if;
  update public.rinnovi set
    esito = nullif(p_esito, ''),
    gestito_il = case when nullif(p_esito, '') is distinct from esito then case when nullif(p_esito, '') is null then null else now() end
                      else gestito_il end,
    assegnato_a = coalesce(p_assegnato, assegnato_a, me),
    note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_id
  returning assegnato_a into chi;
  update public.task set assegnato_a = chi
   where rinnovo_id = p_id and completato_il is null and assegnato_a is null and chi is not null;
end;
$$;

revoke all on function public.crm_disdetta_assegna(uuid, uuid), public.crm_disdetta_rilascia(uuid),
                       public.crm_rinnovo_assegna(uuid, uuid), public.crm_rinnovo_rilascia(uuid),
                       public.crm_disdetta_aggiorna(uuid, text, text, text, text, uuid),
                       public.crm_rinnovo_aggiorna(uuid, text, uuid, text) from public, anon;
grant execute on function public.crm_disdetta_assegna(uuid, uuid), public.crm_disdetta_rilascia(uuid),
                          public.crm_rinnovo_assegna(uuid, uuid), public.crm_rinnovo_rilascia(uuid),
                          public.crm_disdetta_aggiorna(uuid, text, text, text, text, uuid),
                          public.crm_rinnovo_aggiorna(uuid, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Le viste
-- ---------------------------------------------------------------------------

create or replace function public.crm_disdette(p_vista text default 'da_gestire', p_limite integer default 300,
                                               p_consulente uuid default null)
returns table (id uuid, contract_id bigint, utente_id uuid, nome text, cognome text, telefono text, email text,
               member_id bigint, piano text, canone numeric, data_firma date, data_fine date, data_disdetta date,
               esito text, contatto text, motivo text, note text, gestito_nome text, gestito_il timestamptz,
               creato_il timestamptz, gestito_da uuid)
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
begin
  return query
  select d.id, d.contract_id, u.id, coalesce(m.nome, u.nome), coalesce(m.cognome, u.cognome), coalesce(m.telefono, u.telefono),
         coalesce(m.email, u.email), coalesce(d.member_id, c.member_id),
         pp.nome, coalesce(pp.canone, d.valore_contratto), c.data_firma, c.data_fine, coalesce(d.data_disdetta, c.data_disdetta),
         d.esito, d.contatto, d.motivo, d.note, crm.nome_staff(d.gestito_da), d.gestito_il, d.creato_il, d.gestito_da
    from public.disdette d
    left join public.utenti u on u.id = d.utente_id
    left join perfectgym.contracts c on c.id = d.contract_id
    left join perfectgym.members m on m.id = coalesce(d.member_id, c.member_id)
    left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
   where (p_consulente is null or d.gestito_da = p_consulente)
     and case when coalesce(p_vista, 'da_gestire') in ('da_gestire', 'in_gestione', 'mie')
              then (d.esito is null or d.esito = 'standby')
                   and coalesce(d.data_disdetta, c.data_disdetta) >= (now() at time zone 'Europe/Rome')::date - 30
              else true end
     and case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then d.gestito_da is null
           when 'in_gestione' then d.gestito_da is not null
           when 'mie' then d.gestito_da = me
           when 'gestite' then d.esito in ('vinto', 'perso')
           else true end
   order by d.creato_il desc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

create or replace function public.crm_rinnovi(p_vista text default 'da_gestire', p_limite integer default 500,
                                              p_consulente uuid default null)
returns table (id uuid, utente_id uuid, nome text, cognome text, telefono text, email text, member_id bigint,
               contract_id bigint, piano text, scadenza date, valore numeric, stato_contratto text,
               rinnovato_su_pgm boolean, esito text, assegnato_a uuid, assegnato_nome text,
               gestito_il timestamptz, note text, task_aperti integer, creato_il timestamptz)
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  me uuid;
begin
  perform crm.richiedi_sezione('rinnovi');
  me := crm.chi();
  return query
  select r.id, u.id, coalesce(m.nome, u.nome), coalesce(m.cognome, u.cognome), coalesce(m.telefono, u.telefono),
         coalesce(m.email, u.email), coalesce(r.member_id, u.member_id),
         r.contract_id, coalesce(pp.nome, r.piano), coalesce(c.data_fine, r.scadenza), coalesce(pp.canone, r.valore), c.stato,
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
   where (p_consulente is null or r.assegnato_a = p_consulente)
     and case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then r.esito is null and r.assegnato_a is null
           when 'in_gestione' then r.esito is null and r.assegnato_a is not null
           when 'mie' then r.esito is null and r.assegnato_a = me
           when 'rinnovati' then r.esito = 'rinnovato'
           when 'non_rinnovati' then r.esito = 'non_rinnovato'
           else true end
   order by case when coalesce(p_vista, 'da_gestire') in ('da_gestire', 'in_gestione', 'mie') then coalesce(c.data_fine, r.scadenza) end asc nulls last,
            coalesce(r.gestito_il, r.creato_il) desc
   limit least(greatest(coalesce(p_limite, 500), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- La home: da gestire = di nessuno, come i lead
-- ---------------------------------------------------------------------------

create or replace function public.crm_home()
returns jsonb
language plpgsql
stable security definer
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
    'disdette_da_gestire', (select count(*) from public.disdette d
                               where (d.esito is null or d.esito = 'standby') and d.gestito_da is null
                                 and coalesce(d.data_disdetta, (select c.data_disdetta from perfectgym.contracts c where c.id = d.contract_id))
                                     >= (now() at time zone 'Europe/Rome')::date - 30),
    'mie_disdette', (select count(*) from public.disdette d
                        where (d.esito is null or d.esito = 'standby') and d.gestito_da = me
                          and coalesce(d.data_disdetta, (select c.data_disdetta from perfectgym.contracts c where c.id = d.contract_id))
                              >= (now() at time zone 'Europe/Rome')::date - 30),
    'rinnovi_da_gestire', (select count(*) from public.rinnovi where esito is null and assegnato_a is null),
    'miei_rinnovi', (select count(*) from public.rinnovi where esito is null and assegnato_a = me),
    'miei_task_arretrati', (select count(*) from public.task where completato_il is null and assegnato_a = me and data < oggi),
    'miei_task_oggi', (select count(*) from public.task where completato_il is null and assegnato_a = me and data >= oggi and data < oggi + interval '1 day'),
    'task_senza_assegnatario', (select count(*) from public.task where completato_il is null and assegnato_a is null)
  );
end;
$$;
