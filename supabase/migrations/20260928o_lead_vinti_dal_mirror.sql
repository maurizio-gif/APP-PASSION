-- Vinta non si segna a mano: lo dice PerfectGym. Un lead aperto la cui
-- persona ha, su PerfectGym, un contratto firmato da quando e' arrivato il
-- lead, si chiude da solo: vinta con esito «contratto» se e' un abbonamento,
-- «prova» se e' un Pass. Lo fa `crm.lead_vinti_dal_mirror()`, dentro
-- `crm.alimenta()` ogni 5 minuti. A mano resta solo «persa», con la nota che
-- finisce nelle note del lead (i commenti non si mostrano piu' nella scheda).

-- Il contratto di PerfectGym che ha chiuso il lead: per rileggerlo, e per
-- tornare indietro se servisse.
alter table public.lead add column if not exists vinta_contract_id bigint;

create or replace function crm.lead_vinti_dal_mirror()
returns int
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  with vinti as (
    select distinct on (l.id) l.id, c.id as contract_id,
           case when crm.e_pass(pp.nome) then 'prova' else 'contratto' end as esito,
           coalesce((c.dati ->> 'signUpDate')::timestamptz, c.data_firma::timestamp at time zone 'Europe/Rome', now()) as il
      from public.lead l
      join public.utenti u on u.id = l.utente_id and u.member_id is not null
      join perfectgym.contracts c on c.member_id = u.member_id and not c.is_deleted
      join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
     where l.fase in ('da_gestire', 'in_gestione')
       and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
       and not coalesce(c.aggiuntivo, false)
       and coalesce(c.data_firma, c.data_inizio) >= (l.creato_il at time zone 'Europe/Rome')::date
     -- Se ci sono sia il Pass sia l'abbonamento, vince l'abbonamento.
     order by l.id, crm.e_pass(pp.nome), coalesce(c.data_firma, c.data_inizio)
  )
  update public.lead l
     set fase = 'vinta', esito = v.esito, chiuso_il = v.il, aggiornato_il = now(), vinta_contract_id = v.contract_id
    from vinti v
   where v.id = l.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function crm.alimenta()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare out jsonb;
begin
  out := jsonb_build_object(
    'lead_da_airtable', airtable.importa_nuovi_lead(),
    'nuovi_contratti', crm.nuovi_contratti_dal_mirror(),
    'disdette', crm.disdette_dal_mirror(),
    'prove', crm.prove_dal_mirror(),
    'lead_vinti', crm.lead_vinti_dal_mirror(),
    'task_fine_prova', crm.task_fine_prova());
  insert into crm.alimenta_log (esito) values (out);
  delete from crm.alimenta_log where il < now() - interval '14 days';
  return out;
exception when others then
  insert into crm.alimenta_log (errore) values (sqlerrm);
  return jsonb_build_object('errore', sqlerrm);
end;
$$;

-- Dall'app si chiude solo come persa; la nota va nelle note del lead.
create or replace function public.crm_lead_chiudi(p_lead uuid, p_fase text, p_esito text default null, p_nota text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := crm.chi(); nota text := nullif(trim(coalesce(p_nota, '')), '');
begin
  if p_fase = 'vinta' then
    raise exception 'Vinta si segna da sola, quando su PerfectGym compare la prova o il contratto';
  end if;
  if p_fase <> 'persa' then raise exception 'Fase non valida'; end if;
  if not crm.puo_gestire(p_lead) then
    raise exception 'Solo chi ha in carico il lead, o un admin, puo'' chiuderlo' using errcode = '42501';
  end if;
  update public.lead
     set fase = 'persa', esito = null,
         assegnato_a = coalesce(assegnato_a, me), chiuso_il = now(), aggiornato_il = now(),
         note = case when nota is null then note
                     else concat_ws(E'\n', note, 'Persa: ' || nota) end
   where id = p_lead;
end;
$$;
