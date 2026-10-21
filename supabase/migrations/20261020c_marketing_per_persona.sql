-- Marketing si dà persona per persona
--
-- La sezione `marketing` (20261020a) la vedevano d'ufficio tutti gli admin,
-- come le altre sezioni. Ora non piu': come Utenti la da' (o toglie) a ogni
-- persona con la sua spunta, e nemmeno un admin la vede se non l'ha ricevuta.
--
-- `crm.puo_vedere(sezione)` resta quella di prima per tutte le altre sezioni
-- (admin, superadmin e supporto le vedono tutte); per le sezioni «per persona»
-- guarda solo l'elenco `staff.sezioni` di chi chiama. Una sezione si aggiunge
-- alle «per persona» scrivendola nell'elenco qui sotto (e in
-- SEZIONI_PER_PERSONA di lib/permessi.ts).
--
-- A chi spetta non sta in questo file (il repository e' pubblico): si da' da
-- Utenti, o a mano con
--   update public.staff set sezioni = array_append(sezioni, 'marketing') where id = '<operatore>';
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.puo_vedere(p_sezione text)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select coalesce((
    select (crm.ruolo_admin(s.ruolo) and p_sezione <> all (array['marketing']))
           or p_sezione = any (s.sezioni)
      from crm.io() s
     where s.id is not null
  ), false)
$$;
