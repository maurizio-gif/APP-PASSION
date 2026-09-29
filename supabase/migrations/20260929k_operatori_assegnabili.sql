-- A chi si assegnano lead e task: solo agli operatori veri
--
-- Nelle tendine «A chi» (lead, task, debitori, rinnovi) e nei filtri per
-- consulente comparivano tutti gli operatori attivi: anche chi non ha un
-- accesso al CRM (Chiara, senza email) e gli admin tecnici di Ready2Digital.
-- Da qui `crm_staff()`, che riempie quelle tendine, restituisce solo chi:
--   - e' attivo (e non rimosso);
--   - ha un accesso in Supabase (invitato o gia' entrato);
--   - riceve lead e task (`staff.assegnabile`, nuova spunta in Utenti).
-- Fra gli admin riceve lead e task solo Marco Morandini: gli altri admin
-- (Ready2Digital) partono con la spunta spenta.
--
-- `crm_utente_aggiorna()` salva la spunta (`p_assegnabile`, vuoto = com'era) e
-- `crm_utenti()` la restituisce.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.staff add column if not exists assegnabile boolean not null default true;

update public.staff set assegnabile = false
 where ruolo = 'admin' and email is distinct from 'marco@passionfitness.it';

create or replace function public.crm_staff()
returns table (id uuid, nome text, cognome text, ruolo text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  return query
    select s.id, s.nome, s.cognome, s.ruolo
      from public.staff s
     where s.attivo and s.rimosso_il is null and s.assegnabile
       and exists (select 1 from auth.users u where lower(u.email) = s.email)
     order by s.nome, s.cognome;
end;
$$;

drop function if exists public.crm_utenti();
create function public.crm_utenti()
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
     order by s.attivo desc, s.ruolo, s.nome, s.cognome;
end;
$$;

drop function if exists public.crm_utente_aggiorna(uuid, text, boolean, text[], text[]);
create function public.crm_utente_aggiorna(
  p_id uuid, p_ruolo text, p_attivo boolean, p_sezioni text[], p_autorizzazioni text[], p_assegnabile boolean default null)
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
  if (prima.ruolo = 'admin' or p_ruolo = 'admin') and prima.ruolo is distinct from p_ruolo and not crm.e_admin() then
    raise exception 'Solo un admin da'' o toglie il ruolo admin' using errcode = '42501';
  end if;
  if prima.ruolo = 'admin' and not crm.e_admin() then
    raise exception 'Un admin lo modifica solo un altro admin' using errcode = '42501';
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

revoke all on function public.crm_utenti(), public.crm_utente_aggiorna(uuid, text, boolean, text[], text[], boolean) from public, anon;
grant execute on function public.crm_utenti(), public.crm_utente_aggiorna(uuid, text, boolean, text[], text[], boolean) to authenticated;
