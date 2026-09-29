-- Utenti: rimuovere un operatore
--
-- Fino a oggi un operatore si poteva solo spegnere («Attivo»), e restava fra
-- i «Non più attivi». Ora da Utenti si rimuove:
--
--   - il lavoro aperto passa a un altro operatore scelto, o torna da
--     assegnare: i lead da gestire o in gestione (senza nessuno tornano «da
--     prendere»), i task aperti, i debitori ancora da recuperare, i rinnovi
--     senza esito;
--   - chi non ha storia nel CRM (nessun lead, task, commento, prova,
--     contratto, disdetta, debito o rinnovo, nemmeno chiuso) si cancella del
--     tutto; chi ce l'ha resta nella storia col suo nome (chi ha gestito cosa,
--     chi ha scritto quel commento), spento e segnato rimosso (`rimosso_il`),
--     e sparisce da Utenti e da ogni elenco di operatori;
--   - l'accesso in Supabase (auth.users con la sua email) si cancella: non
--     entra piu', e per riaverlo serve un nuovo Add user.
--
-- Le regole sono quelle di Utenti (20260928q): serve «Gestione utenti», un
-- admin lo rimuove solo un admin, nessuno rimuove se stesso. Ricreare un
-- utente con l'email di uno rimosso lo riporta com'era, con la sua storia.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.staff add column if not exists rimosso_il timestamptz;

-- Utenti: senza i rimossi, e con quanto lavoro aperto ha ciascuno (quello che
-- passerebbe a un altro rimuovendolo).
drop function if exists public.crm_utenti();
create function public.crm_utenti()
returns table (id uuid, email text, nome text, cognome text, ruolo text, attivo boolean,
               sezioni text[], autorizzazioni text[], accesso boolean, ultimo_accesso timestamptz,
               lead_aperti int, task_aperti int, altro_aperto int)
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
      from public.staff s
      left join auth.users u on lower(u.email) = s.email
     where s.rimosso_il is null
     order by s.attivo desc, s.ruolo, s.nome, s.cognome;
end;
$$;

-- p_passa_a: a chi passa il lavoro aperto; vuoto = torna da assegnare.
-- Restituisce 'cancellato' (nessuna storia) o 'rimosso' (resta nella storia).
create or replace function public.crm_utente_rimuovi(p_id uuid, p_passa_a uuid default null)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid := crm.chi();
  s public.staff;
begin
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into s from public.staff where id = p_id and rimosso_il is null;
  if s.id is null then
    raise exception 'Utente inesistente';
  end if;
  if p_id = me then
    raise exception 'Non puoi rimuovere te stesso: lo fa un altro' using errcode = '42501';
  end if;
  if s.ruolo = 'admin' and not crm.e_admin() then
    raise exception 'Un admin lo rimuove solo un altro admin' using errcode = '42501';
  end if;
  if p_passa_a is not null and (p_passa_a = p_id
       or not exists (select 1 from public.staff where id = p_passa_a and attivo and rimosso_il is null)) then
    raise exception 'Scegli a chi passare il lavoro fra gli operatori attivi';
  end if;

  -- Il lavoro aperto.
  update public.lead
     set assegnato_a = p_passa_a,
         fase = case when p_passa_a is null then 'da_gestire' else fase end,
         preso_in_carico_il = case when p_passa_a is null then null else coalesce(preso_in_carico_il, now()) end,
         aggiornato_il = now()
   where assegnato_a = p_id and fase in ('da_gestire', 'in_gestione');
  update public.task set assegnato_a = p_passa_a
   where assegnato_a = p_id and completato_il is null and not archiviato;
  update public.debiti set assegnato_a = p_passa_a
   where assegnato_a = p_id and rientrato_il is null;
  update public.rinnovi set assegnato_a = p_passa_a
   where assegnato_a = p_id and esito is null;

  -- L'accesso.
  if s.email is not null then
    delete from auth.users where lower(email) = s.email;
  end if;

  -- Senza storia si cancella; con la storia resta, spento e rimosso.
  begin
    delete from public.staff where id = p_id;
    return 'cancellato';
  exception when foreign_key_violation then
    update public.staff set attivo = false, rimosso_il = now() where id = p_id;
    return 'rimosso';
  end;
end;
$$;

-- Un nuovo utente con l'email di uno rimosso: torna quello, con la sua storia.
create or replace function public.crm_utente_nuovo(p_email text, p_nome text, p_cognome text, p_ruolo text default 'consulente')
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare nuovo uuid;
begin
  perform crm.chi();
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  if p_ruolo = 'admin' and not crm.e_admin() then
    raise exception 'Solo un admin crea un admin' using errcode = '42501';
  end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or coalesce(trim(p_nome), '') = '' then
    raise exception 'Servono un nome e un''email valida';
  end if;
  update public.staff
     set nome = trim(p_nome), cognome = nullif(trim(p_cognome), ''), ruolo = coalesce(p_ruolo, 'consulente'),
         attivo = true, rimosso_il = null
   where email = lower(trim(p_email)) and rimosso_il is not null
  returning id into nuovo;
  if nuovo is not null then
    return nuovo;
  end if;
  insert into public.staff (email, nome, cognome, ruolo)
  values (lower(trim(p_email)), trim(p_nome), nullif(trim(p_cognome), ''), coalesce(p_ruolo, 'consulente'))
  returning id into nuovo;
  return nuovo;
end;
$$;

revoke all on function public.crm_utenti(), public.crm_utente_rimuovi(uuid, uuid) from public, anon;
grant execute on function public.crm_utenti(), public.crm_utente_rimuovi(uuid, uuid) to authenticated;
