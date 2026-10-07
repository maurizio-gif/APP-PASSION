-- Le persone che sono gia' su PerfectGym come lead si agganciano da sole
--
-- Nel CRM `utenti.member_id` si metteva solo quando compariva un contratto. Chi
-- su PerfectGym e' solo un lead (anagrafica di tipo «Lead») restava non
-- agganciato: niente «Apri su PerfectGym» nella scheda, niente sezione «Su
-- PerfectGym» (es. Matteo Schiavi, member 69226, 07/10/2026).
--
-- `crm.collega_soci()`, dentro `crm.alimenta()` (ogni 5 minuti), aggancia ogni
-- persona senza `member_id` all'anagrafica di PerfectGym (non cancellata) con la
-- stessa email. Se le anagrafiche con quell'email sono piu' d'una (un doppione)
-- sceglie quella gia' socia, poi la piu' vecchia. Non aggancia un member che e'
-- gia' di un'altra persona del CRM. Solo email: il telefono da solo e' troppo
-- poco sicuro.
--
-- Il 07/10/2026: 46 persone agganciate. Non si cambia altro: chi ha il
-- `member_id` ha lo stesso trattamento di chi lo aveva gia'.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.collega_soci()
returns integer
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  with scelti as (
    select distinct on (u.id) u.id as utente, m.id as member
      from public.utenti u
      join perfectgym.members m on not m.is_deleted and public.normalizza_email(m.email) = u.email_norm
     where u.member_id is null and u.email_norm is not null
     order by u.id, (m.member_type = 'Member') desc, m.id
  ),
  unici as (
    select distinct on (s.member) s.utente, s.member
      from scelti s
     where not exists (select 1 from public.utenti o where o.member_id = s.member)
     order by s.member, s.utente
  )
  update public.utenti u set member_id = x.member, aggiornato_il = now()
    from unici x
   where x.utente = u.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function crm.collega_soci() from public, anon, authenticated;

do $$
declare
  def text;
  vecchio text := $a$'nuovi_contratti', crm.nuovi_contratti_dal_mirror(),$a$;
begin
  def := pg_get_functiondef('crm.alimenta()'::regprocedure);
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm.alimenta: nuovi_contratti non trovato una volta sola';
  end if;
  execute replace(def, vecchio, $b$'collega_soci', crm.collega_soci(),
    $b$ || vecchio);
end;
$$;

select crm.collega_soci();
