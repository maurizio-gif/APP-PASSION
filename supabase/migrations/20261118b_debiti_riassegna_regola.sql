-- Debitori: un debito in carico a un collega lo cambia solo chi ha l'autorizzazione
--
-- Come per opportunita', disdette e rinnovi (crm.puo_gestire): un debito si prende, si passa o si
-- rimette da assegnare solo se e' di nessuno, se e' mio, o se si ha l'autorizzazione
-- «Opportunita' degli altri» (gli admin ce l'hanno). Prima il database non controllava nulla,
-- e dall'elenco Debitori chiunque poteva togliere il caso a un collega.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_debito_assegna(p_member bigint, p_staff uuid default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid;
  d uuid;
  attuale uuid;
begin
  perform crm.richiedi_sezione('debitori');
  me := crm.chi();
  if p_staff is not null and not exists (select 1 from public.staff where id = p_staff and attivo) then
    raise exception 'Operatore non trovato';
  end if;
  d := crm.debito_aperto(p_member);
  select assegnato_a into attuale from public.debiti where id = d for update;
  if attuale is not null and attuale <> me and not crm.ha('lead_altrui') then
    raise exception 'Questo debito è in carico a %', crm.nome_staff(attuale) using errcode = '42501';
  end if;
  update public.debiti set assegnato_a = coalesce(p_staff, me) where id = d;
end;
$$;

create or replace function public.crm_debito_rilascia(p_member bigint)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid;
  d public.debiti;
begin
  perform crm.richiedi_sezione('debitori');
  me := crm.chi();
  select * into d from public.debiti where member_id = p_member and rientrato_il is null for update;
  if d.id is null then return; end if;
  if d.assegnato_a is not null and d.assegnato_a <> me and not crm.ha('lead_altrui') then
    raise exception 'Questo debito è in carico a %', crm.nome_staff(d.assegnato_a) using errcode = '42501';
  end if;
  update public.debiti set assegnato_a = null where id = d.id;
end;
$$;
