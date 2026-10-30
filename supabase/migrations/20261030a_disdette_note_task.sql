-- Disdette: le note dei task, come «Nota task» nelle Opportunita'
--
-- `crm_disdette` restituisce in piu' `note_task`: le note dei task legati alla
-- disdetta (tutte, dalla piu' recente, separate da una virgola), calcolate come
-- per i lead con `crm.nota_task`. Il resto della funzione e' quello di
-- 20261027b, senza altre modifiche.

drop function if exists public.crm_disdette(text, integer, uuid, text, date, date, date, date, text);

create or replace function public.crm_disdette(
  p_vista text default 'da_gestire',
  p_limite integer default 300,
  p_consulente uuid default null,
  p_testo text default null,
  p_scadenza_da date default null,
  p_scadenza_a date default null,
  p_disdetta_da date default null,
  p_disdetta_a date default null,
  p_ordine text default null
) returns table(id uuid, contract_id bigint, utente_id uuid, nome text, cognome text, telefono text, email text,
                member_id bigint, piano text, canone numeric, data_firma date, data_fine date, data_disdetta date,
                esito text, contatto text, motivo text, note text, gestito_nome text, gestito_il timestamptz,
                creato_il timestamptz, gestito_da uuid, note_task text)
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  parole text[] := array_remove(regexp_split_to_array(lower(trim(coalesce(p_testo, ''))), '\s+'), '');
begin
  return query
  select d.id, d.contract_id, u.id, coalesce(m.nome, u.nome), coalesce(m.cognome, u.cognome), coalesce(m.telefono, u.telefono),
         coalesce(m.email, u.email), coalesce(d.member_id, c.member_id),
         pp.nome, coalesce(pp.canone, d.valore_contratto), c.data_firma, c.data_fine, coalesce(d.data_disdetta, c.data_disdetta),
         d.esito, d.contatto, d.motivo, d.note, crm.nome_staff(d.gestito_da), d.gestito_il, d.creato_il, d.gestito_da,
         (select string_agg(crm.nota_task(t), ', ' order by coalesce(t.completato_il, t.data, t.creato_il) desc)
            from public.task t where t.disdetta_id = d.id and crm.nota_task(t) is not null)
    from public.disdette d
    left join public.utenti u on u.id = d.utente_id
    left join perfectgym.contracts c on c.id = d.contract_id
    left join perfectgym.members m on m.id = coalesce(d.member_id, c.member_id)
    left join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
   where (p_consulente is null or d.gestito_da = p_consulente)
     and not d.cambio_abbonamento
     and case when coalesce(p_vista, 'da_gestire') in ('da_gestire', 'in_gestione', 'mie')
              then (d.esito is null or d.esito = 'standby')
                   and coalesce(d.data_disdetta, c.data_disdetta) >= (now() at time zone 'Europe/Rome')::date - 30
              else true end
     and case coalesce(p_vista, 'da_gestire')
           when 'da_gestire' then d.gestito_da is null
           when 'in_gestione' then d.gestito_da is not null
           when 'mie' then d.gestito_da = me
           when 'gestite' then d.esito in ('vinto', 'perso')
           else true end
     and (p_scadenza_da is null or c.data_fine >= p_scadenza_da)
     and (p_scadenza_a is null or c.data_fine <= p_scadenza_a)
     and (p_disdetta_da is null or coalesce(d.data_disdetta, c.data_disdetta) >= p_disdetta_da)
     and (p_disdetta_a is null or coalesce(d.data_disdetta, c.data_disdetta) <= p_disdetta_a)
     and (cardinality(parole) = 0 or not exists (
           select 1 from unnest(parole) w
            where lower(concat_ws(' ', coalesce(m.nome, u.nome), coalesce(m.cognome, u.cognome), coalesce(m.email, u.email),
                                  coalesce(m.telefono, u.telefono), u.telefono_norm,
                                  regexp_replace(coalesce(m.telefono, u.telefono, ''), '\D', '', 'g')))
                  not like '%' || w || '%'))
   order by case when p_ordine = 'scadenza_asc' then c.data_fine end asc nulls last,
            case when p_ordine = 'scadenza_desc' then c.data_fine end desc nulls last,
            case when p_ordine = 'disdetta_asc' then coalesce(d.data_disdetta, c.data_disdetta) end asc nulls last,
            case when p_ordine = 'disdetta_desc' then coalesce(d.data_disdetta, c.data_disdetta) end desc nulls last,
            d.creato_il desc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

revoke all on function public.crm_disdette(text, integer, uuid, text, date, date, date, date, text) from public, anon;
grant execute on function public.crm_disdette(text, integer, uuid, text, date, date, date, date, text) to authenticated;
