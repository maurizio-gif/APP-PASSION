-- I ruoli: superadmin, admin, supporto, consulente
--
-- Fino a oggi i ruoli erano due, admin e consulente. Dal 30/09/2026 sono
-- quattro, con i ticket (20260930b):
--
--   - superadmin: R2D. Vede tutto e puo' tutto, come un admin; in piu' e'
--     l'assistenza dei ticket (li prende, chiede informazioni al desk, li
--     chiude con causa e soluzione) e scrive le modifiche decise nella
--     riunione settimanale. Il ruolo superadmin lo da' e lo toglie solo un
--     superadmin, e solo un superadmin modifica, invita o rimuove un superadmin;
--   - supporto: un admin che in piu' riceve i ticket aperti dagli altri, li
--     verifica e li manda a R2D (chi segue il desk, e chi lo sostituisce);
--   - admin: vede tutto e puo' tutto il resto (Utenti, lead degli altri...);
--     i ticket li apre, ma passano dal supporto;
--   - consulente: come prima, le sezioni e le autorizzazioni scelte in Utenti.
--
-- «Un admin» nelle regole di prima (vede tutte le sezioni, ha tutte le
-- autorizzazioni, il ruolo admin lo da' solo un admin) vale per superadmin,
-- admin e supporto: crm.e_admin(). Chi ha quale ruolo non sta qui (il
-- repository e' pubblico): si sceglie da Utenti, e il primo superadmin si
-- mette a mano.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.staff drop constraint if exists staff_ruolo_check;
alter table public.staff add constraint staff_ruolo_check
  check (ruolo in ('superadmin', 'admin', 'supporto', 'consulente'));

-- I ruoli con i poteri di un admin.
create or replace function crm.ruolo_admin(p_ruolo text) returns boolean
language sql immutable set search_path = ''
as $$ select coalesce(p_ruolo in ('superadmin', 'admin', 'supporto'), false) $$;

create or replace function crm.e_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select crm.ruolo_admin((crm.io()).ruolo) $$;

create or replace function crm.e_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((crm.io()).ruolo = 'superadmin', false) $$;

create or replace function crm.puo_vedere(p_sezione text) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select crm.ruolo_admin(s.ruolo) or p_sezione = any (s.sezioni) from crm.io() s where s.id is not null), false) $$;

create or replace function crm.ha(p_autorizzazione text) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select crm.ruolo_admin(s.ruolo) or p_autorizzazione = any (s.autorizzazioni) from crm.io() s where s.id is not null), false) $$;

-- Chi puo' toccare un operatore col ruolo p_ruolo: un superadmin solo un
-- superadmin, un admin (o supporto) solo chi ha i poteri di un admin.
create or replace function crm.puo_toccare_ruolo(p_ruolo text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case when p_ruolo = 'superadmin' then crm.e_superadmin()
              when crm.ruolo_admin(p_ruolo) then crm.e_admin()
              else true end
$$;

-- ---------------------------------------------------------------------------
-- Utenti
-- ---------------------------------------------------------------------------

create or replace function public.crm_utente_aggiorna(p_id uuid, p_ruolo text, p_attivo boolean, p_sezioni text[],
                                                      p_autorizzazioni text[], p_assegnabile boolean default null)
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
         assegnabile = coalesce(p_assegnabile, assegnabile)
   where id = p_id;
end;
$$;

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
  if not crm.puo_toccare_ruolo(p_ruolo) then
    raise exception '%', case when p_ruolo = 'superadmin' then 'Solo un superadmin crea un superadmin'
                              else 'Solo un admin crea un admin o un supporto' end
      using errcode = '42501';
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
  if not crm.puo_toccare_ruolo(s.ruolo) then
    raise exception '%', case when s.ruolo = 'superadmin' then 'Un superadmin lo rimuove solo un altro superadmin'
                              else 'Un admin lo rimuove solo un altro admin' end
      using errcode = '42501';
  end if;
  if p_passa_a is not null and (p_passa_a = p_id
       or not exists (select 1 from public.staff where id = p_passa_a and attivo and rimosso_il is null)) then
    raise exception 'Scegli a chi passare il lavoro fra gli operatori attivi';
  end if;

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

  if s.email is not null then
    delete from auth.users where lower(email) = s.email;
  end if;

  begin
    delete from public.staff where id = p_id;
    return 'cancellato';
  exception when foreign_key_violation then
    update public.staff set attivo = false, rimosso_il = now() where id = p_id;
    return 'rimosso';
  end;
end;
$$;

create or replace function public.crm_utente_email_invito(p_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare s public.staff;
begin
  perform crm.chi();
  if not crm.ha('gestione_utenti') then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
  select * into s from public.staff where id = p_id and rimosso_il is null;
  if s.id is null then
    raise exception 'Utente inesistente';
  end if;
  if not crm.puo_toccare_ruolo(s.ruolo) then
    raise exception '%', case when s.ruolo = 'superadmin' then 'Un superadmin lo invita solo un altro superadmin'
                              else 'Un admin lo invita solo un altro admin' end
      using errcode = '42501';
  end if;
  if not s.attivo then
    raise exception 'L''utente non e'' attivo: riattivalo prima di invitarlo';
  end if;
  if s.email is null then
    raise exception 'L''utente non ha un''email';
  end if;
  return s.email;
end;
$$;

-- Utenti in ordine di ruolo: superadmin, admin, supporto, consulenti.
create or replace function public.crm_utenti()
returns table (id uuid, email text, nome text, cognome text, ruolo text, attivo boolean,
               sezioni text[], autorizzazioni text[], accesso boolean, ultimo_accesso timestamptz,
               lead_aperti int, task_aperti int, altro_aperto int, assegnabile boolean)
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
             + (select count(*)::int from public.rinnovi r where r.assegnato_a = s.id and r.esito is null),
           s.assegnabile
      from public.staff s
      left join auth.users u on lower(u.email) = s.email
     where s.rimosso_il is null
     order by s.attivo desc, array_position(array['superadmin', 'admin', 'supporto', 'consulente'], s.ruolo), s.nome, s.cognome;
end;
$$;

revoke all on function public.crm_utente_aggiorna(uuid, text, boolean, text[], text[], boolean),
                       public.crm_utente_nuovo(text, text, text, text),
                       public.crm_utente_rimuovi(uuid, uuid),
                       public.crm_utente_email_invito(uuid),
                       public.crm_utenti() from public, anon;
grant execute on function public.crm_utente_aggiorna(uuid, text, boolean, text[], text[], boolean),
                          public.crm_utente_nuovo(text, text, text, text),
                          public.crm_utente_rimuovi(uuid, uuid),
                          public.crm_utente_email_invito(uuid),
                          public.crm_utenti() to authenticated;
