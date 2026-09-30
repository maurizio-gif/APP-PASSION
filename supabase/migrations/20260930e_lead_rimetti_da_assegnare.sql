-- Lead: rimettere da assegnare
--
-- Chi ha un lead in gestione (o un admin, o chi ha «Lead degli altri»: le
-- regole di crm.puo_gestire(), come per riassegnarlo) puo' toglierselo: il
-- lead torna da gestire, senza nessuno, e lo prende chi arriva. I task gia'
-- programmati restano a chi li aveva.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_lead_rilascia(p_lead uuid)
returns void
language plpgsql
volatile security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  l public.lead;
begin
  select * into l from public.lead where id = p_lead for update;
  if l.id is null then
    raise exception 'Lead inesistente';
  end if;
  if l.fase <> 'in_gestione' then
    raise exception 'Si rimette da assegnare solo un lead in gestione';
  end if;
  if not crm.puo_gestire(p_lead) then
    raise exception 'Solo chi ha in carico il lead, o un admin, può rimetterlo da assegnare' using errcode = '42501';
  end if;
  update public.lead
     set assegnato_a = null, fase = 'da_gestire', preso_in_carico_il = null, aggiornato_il = now()
   where id = p_lead;
end;
$$;

revoke all on function public.crm_lead_rilascia(uuid) from public, anon;
grant execute on function public.crm_lead_rilascia(uuid) to authenticated;
