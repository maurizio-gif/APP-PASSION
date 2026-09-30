-- Task «Customer care» e il consulente del nuovo lead
--
-- Task: un tipo in piu', «Customer care» (customer_care), per il lavoro sui
-- soci che non e' una vendita: si programma e si registra come gli altri.
--
-- Nuovo lead (crm_lead_nuovo): si sceglie a chi va (`p_assegnato`, un
-- operatore attivo). Assegnato, il lead nasce in gestione a lui; senza
-- nessuno, da gestire. `p_prendo` resta per la versione di prima dell'app:
-- vale solo se `p_assegnato` e' vuoto.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.task drop constraint if exists task_tipo_check;
alter table public.task add constraint task_tipo_check
  check (tipo = any (array['telefonata', 'in_sede', 'whatsapp', 'email', 'customer_care', 'richiamare', 'appuntamento']));

drop function if exists public.crm_lead_nuovo(text, text, text, text, text, text, text, text, boolean, boolean);
create function public.crm_lead_nuovo(p_nome text, p_cognome text, p_telefono text, p_email text, p_fonte text,
                                      p_fonte_dettaglio text default null, p_attivita text default null,
                                      p_nota text default null, p_prendo boolean default true,
                                      p_privacy boolean default null, p_assegnato uuid default null)
returns uuid
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  chi uuid := coalesce(p_assegnato, case when p_prendo then me end);
  u uuid;
  l uuid;
begin
  if coalesce(p_fonte, '') not in ('sito', 'tour', 'referral', 'meta', 'altro') then raise exception 'Fonte non valida'; end if;
  if public.normalizza_telefono(p_telefono) is null and public.normalizza_email(p_email) is null then
    raise exception 'Serve almeno un telefono o un''email';
  end if;
  if p_assegnato is not null and not exists (select 1 from public.staff where id = p_assegnato and attivo) then
    raise exception 'Operatore non valido';
  end if;
  u := crm.persona(p_nome, p_cognome, p_email, p_telefono,
                   (select m.id from perfectgym.members m
                     where not m.is_deleted and coalesce(m.home_club_id, 1) = 1
                       and (lower(m.email) = public.normalizza_email(p_email)
                            or public.normalizza_telefono(m.telefono) = public.normalizza_telefono(p_telefono))
                     order by (m.member_type = 'Member') desc, m.version desc limit 1));
  insert into public.lead (utente_id, fonte, fonte_dettaglio, attivita_interesse, fase, assegnato_a, preso_in_carico_il, origine, consenso_privacy)
  values (u, p_fonte, nullif(trim(coalesce(p_fonte_dettaglio, '')), ''), nullif(trim(coalesce(p_attivita, '')), ''),
          case when chi is not null then 'in_gestione' else 'da_gestire' end,
          chi, case when chi is not null then now() end, 'app', p_privacy)
  returning id into l;
  if nullif(trim(coalesce(p_nota, '')), '') is not null then
    insert into public.commenti (utente_id, lead_id, testo, autore_id) values (u, l, trim(p_nota), me);
  end if;
  return l;
end;
$$;

revoke all on function public.crm_lead_nuovo(text, text, text, text, text, text, text, text, boolean, boolean, uuid) from public, anon;
grant execute on function public.crm_lead_nuovo(text, text, text, text, text, text, text, text, boolean, boolean, uuid) to authenticated;
