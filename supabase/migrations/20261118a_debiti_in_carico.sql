-- Debitori: la presa in carico segue la persona, e si gestisce anche dalla sua scheda
--
-- Prima: chi segue il recupero stava sul singolo debito. Appena il saldo tornava a zero o sopra
-- (anche per pochi giorni, dopo ogni addebito mensile) il debito si chiudeva, e al successivo
-- saldo negativo ne nasceva uno nuovo senza nessuno: il socio tornava «Da assegnare».
--
-- Adesso:
--   1. un debito nuovo parte gia' in carico a chi seguiva l'ultimo debito chiuso della stessa
--      persona, se si e' chiuso da meno di 90 giorni e quel consulente e' ancora attivo. Ogni
--      debito che si chiude fa ripartire i 90 giorni, quindi chi ha debiti ricorrenti resta
--      con lo stesso consulente. Vale per i debiti nuovi: quelli gia' aperti non cambiano;
--   2. crm_debito_rilascia: rimette un debito da assegnare;
--   3. crm_debito_persona: il debito aperto di una persona, per mostrarlo nella sua scheda.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- Chi seguiva l'ultimo debito chiuso, se si e' chiuso da meno di 90 giorni e lavora ancora qui.
create or replace function crm.debito_assegnatario_precedente(p_member bigint)
returns uuid
language sql
stable
set search_path = ''
as $$
  select u.assegnato_a
    from (select d.assegnato_a
            from public.debiti d
           where d.member_id = p_member and d.rientrato_il is not null
             and d.rientrato_il >= now() - interval '90 days'
           order by d.rientrato_il desc, d.creato_il desc
           limit 1) u
    join public.staff s on s.id = u.assegnato_a and s.attivo and s.rimosso_il is null
$$;
revoke all on function crm.debito_assegnatario_precedente(bigint) from public, anon, authenticated;

-- I debiti nuovi dal mirror: partono da chi seguiva l'ultimo.
create or replace function crm.debiti_dal_mirror()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  aperti int;
  rientrati int;
begin
  insert into public.debiti (member_id, utente_id, negativo_da, saldo_iniziale, assegnato_a)
  select b.id, crm.persona_del_socio(b.id), b.negativo_da, b.saldo, crm.debito_assegnatario_precedente(b.id)
    from perfectgym.member_balances b
    join perfectgym.members m on m.id = b.id and not m.is_deleted and m.home_club_id = club
   where not b.is_deleted and b.saldo < 0
     and not exists (select 1 from public.debiti d where d.member_id = b.id and d.rientrato_il is null)
  on conflict (member_id) where rientrato_il is null do nothing;
  get diagnostics aperti = row_count;

  update public.debiti d set rientrato_il = now()
   where d.rientrato_il is null
     and not exists (select 1 from perfectgym.member_balances b
                      where b.id = d.member_id and not b.is_deleted and b.saldo < 0);
  get diagnostics rientrati = row_count;

  return jsonb_build_object('aperti', aperti, 'rientrati', rientrati);
end;
$$;

-- Il debito aperto del socio; se non c'e' e il saldo e' negativo, lo apre (anche qui, da chi seguiva l'ultimo).
create or replace function crm.debito_aperto(p_member bigint)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  d uuid;
  b perfectgym.member_balances;
begin
  select id into d from public.debiti where member_id = p_member and rientrato_il is null;
  if d is not null then return d; end if;
  select * into b from perfectgym.member_balances where id = p_member and not is_deleted;
  if b.id is null or b.saldo >= 0 then
    raise exception 'Il saldo di questo socio su PerfectGym non e'' negativo';
  end if;
  insert into public.debiti (member_id, utente_id, negativo_da, saldo_iniziale, assegnato_a)
  values (p_member, crm.persona_del_socio(p_member), b.negativo_da, b.saldo, crm.debito_assegnatario_precedente(p_member))
  on conflict (member_id) where rientrato_il is null do nothing
  returning id into d;
  if d is null then
    select id into d from public.debiti where member_id = p_member and rientrato_il is null;
  end if;
  return d;
end;
$$;

-- Rimette il debito da assegnare: di nessuno.
create or replace function public.crm_debito_rilascia(p_member bigint)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform crm.richiedi_sezione('debitori');
  update public.debiti set assegnato_a = null where member_id = p_member and rientrato_il is null;
end;
$$;
revoke all on function public.crm_debito_rilascia(bigint) from public, anon;
grant execute on function public.crm_debito_rilascia(bigint) to authenticated;

-- Il debito aperto di una persona (vuoto se non ne ha), per la sua scheda.
create or replace function public.crm_debito_persona(p_member bigint)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.richiedi_sezione('debitori');
  return (
    select jsonb_build_object('saldo', b.saldo, 'negativo_da', d.negativo_da,
                              'assegnato_a', d.assegnato_a, 'assegnato_nome', crm.nome_staff(d.assegnato_a))
      from public.debiti d
      left join perfectgym.member_balances b on b.id = d.member_id and not b.is_deleted
     where d.member_id = p_member and d.rientrato_il is null
  );
end;
$$;
revoke all on function public.crm_debito_persona(bigint) from public, anon;
grant execute on function public.crm_debito_persona(bigint) to authenticated;
