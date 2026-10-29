-- Istruttori da invitare: solo chi ha lezioni in calendario
--
-- `crm_istruttori_con_lezioni()` dice quali utenti con la sola sezione «Appello
-- istruttore» hanno almeno una lezione futura (non cancellata) in calendario su
-- PerfectGym: chi non ne ha non ha niente da verificare, e non rientra
-- nell'invito multiplo di Utenti (resta invitabile a mano dalla sua scheda).
-- L'istruttore e' quello con la stessa email o, se su PerfectGym manca, lo
-- stesso nome (come `crm.miei_istruttori`). Solo per chi gestisce gli utenti.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_istruttori_con_lezioni()
returns table (staff_id uuid, prossime integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.chi();
  if not crm.ha('gestione_utenti') then raise exception 'Non autorizzato' using errcode = '42501'; end if;
  return query
  select s.id, count(c.id)::integer
    from public.staff s
    join perfectgym.employees e on not e.is_deleted and (
         (nullif(lower(trim(coalesce(e.dati ->> 'email', ''))), '') is not null and lower(trim(e.dati ->> 'email')) = s.email)
      or (nullif(trim(coalesce(e.dati ->> 'email', '')), '') is null
          and lower(trim(coalesce(e.nome, '') || ' ' || coalesce(e.cognome, ''))) = lower(trim(coalesce(s.nome, '') || ' ' || coalesce(s.cognome, '')))))
    join perfectgym.classes c on c.instructor_id = e.id and not c.is_deleted and c.inizio >= now()
   where s.attivo and s.sezioni = array['appello']::text[]
   group by s.id;
end;
$$;

revoke all on function public.crm_istruttori_con_lezioni() from public, anon;
grant execute on function public.crm_istruttori_con_lezioni() to authenticated;
