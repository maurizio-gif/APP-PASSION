-- La pipeline dei lead: da gestire, in gestione, poi abbonamento o prova
--
--   da gestire → in gestione → abbonamento ............ Vinte
--                            → prova (Pass attivato) .. Prove in corso
--                                 → fine del pass, senza abbonamento .. Prove scadute
--                                 → abbonamento (prima o dopo la fine) . Vinte
--
-- Fino a oggi `crm.lead_vinti_dal_mirror()` guardava solo i lead aperti: uno
-- gia' chiuso come «prova» non passava piu' a «Vinta» quando la persona firmava
-- l'abbonamento (il 07/10/2026 erano 1.000+). Ora un lead vinto con esito
-- «prova» diventa «vinta / contratto» appena su PerfectGym compare un
-- abbonamento firmato dopo l'arrivo del lead; il contratto che l'ha chiuso resta
-- in `vinta_contract_id`, la data di chiusura e' quella della firma.
--
-- Le schede dei lead (`crm_lead`): «In prova» diventa «Prove in corso» (il Pass
-- della prova non e' ancora finito) e nasce «Prove scadute» (il pass e' finito e
-- l'abbonamento non c'e').
--
-- Annullare: le righe com'erano prima stanno in
-- crm.lead_in_prova_prima_20261007; per rimetterle:
--   update public.lead l set fase = b.fase, esito = b.esito, chiuso_il = b.chiuso_il,
--     vinta_contract_id = b.vinta_contract_id from crm.lead_in_prova_prima_20261007 b where b.id = l.id;
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create table crm.lead_in_prova_prima_20261007 as
select l.id, l.fase, l.esito, l.chiuso_il, l.vinta_contract_id
  from public.lead l
 where l.fase = 'vinta' and l.esito = 'prova';
alter table crm.lead_in_prova_prima_20261007 enable row level security;
revoke all on crm.lead_in_prova_prima_20261007 from public, anon, authenticated;

do $$
declare
  def text;
  nuova text;
  vecchio text;
begin
  -- Il lead in prova passa a vinto quando arriva l'abbonamento.
  def := pg_get_functiondef('crm.lead_vinti_dal_mirror()'::regprocedure);
  vecchio := $a$where l.fase in ('da_gestire', 'in_gestione')$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm.lead_vinti_dal_mirror: filtro sulla fase non trovato una volta sola';
  end if;
  execute replace(def, vecchio, $b$where (l.fase in ('da_gestire', 'in_gestione')
            -- gia' in prova: solo un abbonamento lo porta a vinto
            or (l.fase = 'vinta' and l.esito = 'prova' and not crm.e_pass(pp.nome)))$b$);

  -- Le schede: Prove in corso e Prove scadute.
  def := pg_get_functiondef('public.crm_lead(text,text,text,integer,uuid)'::regprocedure);
  nuova := def;
  vecchio := $a$when 'in_prova' then l.fase = 'vinta' and l.esito = 'prova'$a$;
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_lead: in_prova non trovato una volta sola';
  end if;
  nuova := replace(nuova, vecchio, $b$when 'in_prova' then l.fase = 'vinta' and l.esito = 'prova'
                                  and exists (select 1 from public.prove pr
                                               where pr.lead_id = l.id and pr.esito is null and pr.data_fine >= now())
           when 'prove_scadute' then l.fase = 'vinta' and l.esito = 'prova'
                                  and not exists (select 1 from public.prove pr
                                                   where pr.lead_id = l.id and pr.esito is null and pr.data_fine >= now())$b$);
  vecchio := $a$p_vista in ('vinte', 'in_prova', 'perse')$a$;
  if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm_lead: ordinamento non trovato una volta sola';
  end if;
  nuova := replace(nuova, vecchio, $b$p_vista in ('vinte', 'in_prova', 'prove_scadute', 'perse')$b$);
  execute nuova;
end;
$$;

-- Una passata subito: i lead in prova che hanno gia' l'abbonamento passano a Vinte.
select crm.lead_vinti_dal_mirror();
