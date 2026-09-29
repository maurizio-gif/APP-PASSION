-- Utenti: l'invito e il link per la password partono dal CRM
--
-- Finora «Crea utente» scriveva solo in `staff`: l'accesso andava creato a
-- mano in Supabase (Authentication -> Add user), e nessuna email partiva. E
-- «Password dimenticata» con l'email di chi l'accesso non ce l'ha risponde
-- come se tutto andasse bene (per non dire quali indirizzi esistono), ma
-- l'email non parte. Cosi' nessun operatore nuovo poteva entrare.
--
-- Ora l'Edge Function `crm-invito`, chiamata da Utenti con la sessione di chi
-- e' entrato, chiede qui l'email dell'operatore e poi:
--   - se non ha ancora l'accesso, lo invita (email di Supabase «Invite user»:
--     il link porta a /auth/callback, dove sceglie la password);
--   - se ce l'ha, gli manda il link per una nuova password.
-- Parte da sola dopo «Crea utente», e c'e' un bottone su ogni scheda.
--
-- Le regole sono quelle di Utenti (20260928q): serve «Gestione utenti», un
-- admin lo invita solo un admin, l'operatore dev'essere attivo e avere
-- un'email.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

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
  if s.ruolo = 'admin' and not crm.e_admin() then
    raise exception 'Un admin lo invita solo un altro admin' using errcode = '42501';
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

revoke all on function public.crm_utente_email_invito(uuid) from public, anon;
grant execute on function public.crm_utente_email_invito(uuid) to authenticated;
