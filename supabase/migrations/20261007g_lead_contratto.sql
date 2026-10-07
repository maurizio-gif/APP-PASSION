-- Lead: il contratto che li ha chiusi (abbonamento o Pass)
--
-- Nelle schede «Prove in corso», «Prove scadute» e «Vinte» la tabella dei lead
-- mostra il nome dell'abbonamento (o del Pass) e la data di inizio, al posto di
-- attivita' di interesse e note dei task. `crm_lead_contratti(lead)` li da', un
-- giro solo per tutta la pagina:
--   1. il contratto che ha chiuso il lead (`vinta_contract_id`);
--   2. altrimenti il Pass della sua prova;
--   3. altrimenti il primo contratto della persona firmato dopo l'arrivo del
--      lead: abbonamento per i lead «contratto», Pass per quelli «prova».
--
--
-- Nelle Vinte la tabella mostra la data di firma (`data_firma`, o l'inizio se
-- manca) al posto della data di creazione, dal piu' recente.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

drop function if exists public.crm_lead_contratti(uuid[]);
create function public.crm_lead_contratti(p_lead uuid[])
returns table (lead_id uuid, contract_id bigint, piano text, data_firma date, data_inizio date, e_pass boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform crm.chi();
  return query
  select x.id, k.id, pp.nome, coalesce(k.data_firma, k.data_inizio), k.data_inizio, crm.e_pass(pp.nome)
    from (
      select l.id,
             coalesce(
               l.vinta_contract_id,
               (select pr.contract_id from public.prove pr
                 where pr.lead_id = l.id and pr.contract_id is not null
                 order by pr.data_inizio desc limit 1),
               (select c.id
                  from perfectgym.contracts c
                  join perfectgym.payment_plans p2 on p2.id = c.payment_plan_id
                 where c.member_id = u.member_id and not c.is_deleted
                   and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
                   and not coalesce(c.aggiuntivo, false)
                   and crm.e_pass(p2.nome) = (coalesce(l.esito, 'contratto') = 'prova')
                   and coalesce(c.data_firma, c.data_inizio) >= (l.creato_il at time zone 'Europe/Rome')::date
                 order by coalesce(c.data_firma, c.data_inizio) limit 1)
             ) as cid
        from public.lead l
        join public.utenti u on u.id = l.utente_id
       where l.id = any (p_lead)
    ) x
    join perfectgym.contracts k on k.id = x.cid
    left join perfectgym.payment_plans pp on pp.id = k.payment_plan_id;
end;
$$;

revoke all on function public.crm_lead_contratti(uuid[]) from public, anon;
grant execute on function public.crm_lead_contratti(uuid[]) to authenticated;
