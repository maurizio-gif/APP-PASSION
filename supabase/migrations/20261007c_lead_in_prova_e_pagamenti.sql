-- Lead «In prova» a parte, e lo stato dei pagamenti su prove e abbonamenti
--
-- Lead: «Vinte» mostra solo i lead chiusi con un abbonamento; quelli chiusi con
-- il Pass (esito «prova») stanno nel nuovo filtro «In prova»
-- (`crm_lead('in_prova')`). Un lead vinto senza esito resta fra le Vinte.
--
-- Pagamenti: `crm_pagamenti(contratti)` dice, per ogni contratto di PerfectGym,
-- se e' stato pagato, leggendo il mirror (addebiti `contract_charges`, pagamenti
-- `contract_payments`, saldo `member_balances`):
--   scaduto            quanto c'e' da pagare sugli addebiti con scadenza fino a
--                      oggi (non cancellati); sopra zero il contratto e' «da pagare»;
--   scaduto_dal        la scadenza piu' vecchia ancora aperta;
--   da_pagare_futuro   gli addebiti con scadenza dopo oggi (es. il prossimo canone);
--   pagato             i pagamenti del contratto, meno i rimborsi;
--   ultimo_pagamento   la data dell'ultimo pagamento;
--   saldo              il saldo del socio su PerfectGym (negativo = in debito).
-- Nessun dato si copia: si legge ogni volta, come per i debitori (20260929a).
-- `crm_persona()` restituisce ora anche `contract_id` per ogni prova, cosi' la
-- scheda puo' mostrare il pagamento del Pass.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function public.crm_pagamenti(p_contratti bigint[])
returns table (
  contract_id bigint,
  member_id bigint,
  saldo numeric,
  pagato numeric,
  addebiti integer,
  scaduto numeric,
  scaduto_dal date,
  da_pagare_futuro numeric,
  prossima_scadenza date,
  ultimo_pagamento timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  perform crm.chi();
  return query
  select k.id, k.member_id,
         (select b.saldo from perfectgym.member_balances b where b.id = k.member_id),
         coalesce(p.pagato, 0),
         coalesce(a.addebiti, 0)::integer,
         coalesce(a.scaduto, 0),
         a.scaduto_dal,
         coalesce(a.futuro, 0),
         a.prossima,
         p.ultimo
    from perfectgym.contracts k
    left join lateral (
      select count(*) as addebiti,
             sum(c.da_pagare) filter (where c.scadenza <= oggi) as scaduto,
             min(c.scadenza) filter (where c.scadenza <= oggi and c.da_pagare > 0) as scaduto_dal,
             sum(c.da_pagare) filter (where c.scadenza > oggi) as futuro,
             min(c.scadenza) filter (where c.scadenza > oggi and c.da_pagare > 0) as prossima
        from perfectgym.contract_charges c
       where c.contract_id = k.id and not c.is_deleted and not coalesce(c.annullato, false)
    ) a on true
    left join lateral (
      select sum(case when y.rimborso then -y.importo else y.importo end) as pagato,
             max(y.data) filter (where not y.rimborso) as ultimo
        from perfectgym.contract_payments y
       where y.contract_id = k.id and not y.is_deleted
    ) p on true
   where k.id = any (p_contratti) and not k.is_deleted;
end;
$$;

revoke all on function public.crm_pagamenti(bigint[]) from public, anon;
grant execute on function public.crm_pagamenti(bigint[]) to authenticated;

do $$
declare
  def text;
  nuova text;
  vecchio text;
begin
  -- Lead: «Vinte» solo con abbonamento, «In prova» a parte.
  def := pg_get_functiondef('public.crm_lead(text,text,text,integer,uuid)'::regprocedure);
  nuova := def;
  vecchio := $a$when 'vinte' then l.fase = 'vinta'$a$;
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_lead: vinte non trovato una volta sola';
  end if;
  nuova := replace(nuova, vecchio, $b$when 'vinte' then l.fase = 'vinta' and l.esito is distinct from 'prova'
           when 'in_prova' then l.fase = 'vinta' and l.esito = 'prova'$b$);
  vecchio := $a$p_vista in ('vinte', 'perse')$a$;
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_lead: ordinamento non trovato una volta sola';
  end if;
  nuova := replace(nuova, vecchio, $b$p_vista in ('vinte', 'in_prova', 'perse')$b$);
  execute nuova;

  -- Scheda persona: il contratto di ogni prova.
  def := pg_get_functiondef('public.crm_persona(uuid)'::regprocedure);
  vecchio := $a$'id', p.id, 'tipo_pass', p.tipo_pass,$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_persona: prove non trovate una volta sola';
  end if;
  execute replace(def, vecchio, $b$'id', p.id, 'contract_id', p.contract_id, 'tipo_pass', p.tipo_pass,$b$);
end;
$$;
