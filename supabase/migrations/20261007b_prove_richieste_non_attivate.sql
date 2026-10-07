-- Una richiesta di prova non e' una prova attivata
--
-- Chi chiedeva il pass dal sito veniva trattato come se l'avesse gia': il lead
-- nasceva «vinta» (esito prova) e la prova finiva fra le «In corso» con 7 giorni
-- inventati, anche se su PerfectGym non c'era nessun contratto Pass (es. Lorenzo
-- Ciaffone, richiesta del 30/09/2026). Il 07/10/2026 erano 28 lead vinti senza
-- contratto e 51 prove aperte senza contratto, 17 con un task «La prova finisce».
-- Ora:
--
--   richiesta   `nuova_richiesta()` crea il lead «da gestire» (non piu' vinta) e
--               la prova resta una richiesta: senza contratto, senza fine. Vinta
--               la mette `crm.lead_vinti_dal_mirror()` quando compare il Pass;
--   prove       In corso, In scadenza e Finite senza esito mostrano solo le prove
--               con il contratto Pass su PerfectGym; le richieste hanno la loro
--               scheda, «Richieste» (`crm_prove('richieste')`). Anche i conteggi
--               della home seguono la stessa regola;
--   7 giorni    la richiesta non prende piu' una fine inventata, e il task «La
--               prova finisce il ...» nasce solo per le prove con il contratto;
--   dati        i lead n8n vinti senza contratto tornano «da gestire» (se il Pass
--               c'e', il mirror li richiude da solo entro 5 minuti), le richieste
--               aperte perdono la fine inventata e i task «La prova finisce» non
--               ancora fatti delle richieste si tolgono.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text;
  nuova text;
  vecchio text;

  -- cambia `vecchio` in `nuovo`, una volta sola
  procedure_unica constant text := 'non trovato una volta sola';
begin
  -- 1. La richiesta «pass» non vince il lead.
  def := pg_get_functiondef('crm.nuova_richiesta(jsonb)'::regprocedure);
  nuova := def;
  foreach vecchio in array array[
    $a$case when tipo = 'pass' then 'vinta' else 'da_gestire' end,$a$,
    $a$case when tipo = 'pass' then 'prova' end,$a$,
    $a$case when tipo = 'pass' then now() end,$a$] loop
    if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
      raise exception 'crm.nuova_richiesta: % %', vecchio, procedure_unica;
    end if;
  end loop;
  nuova := replace(nuova, $a$case when tipo = 'pass' then 'vinta' else 'da_gestire' end,$a$, $b$'da_gestire',$b$);
  nuova := replace(nuova, $a$case when tipo = 'pass' then 'prova' end,$a$, $b$null,$b$);
  nuova := replace(nuova, $a$case when tipo = 'pass' then now() end,$a$, $b$null,$b$);
  execute nuova;

  -- 2. Le schede delle prove: solo quelle con il Pass; le richieste a parte.
  def := pg_get_functiondef('public.crm_prove(text,integer,uuid)'::regprocedure);
  nuova := def;
  foreach vecchio in array array[
    $a$when 'in_corso' then p.esito is null and p.data_fine >= now()$a$,
    $a$when 'in_scadenza' then p.esito is null and p.data_fine >= now() and$a$,
    $a$when 'senza_esito' then p.esito is null and p.data_fine < now()$a$,
    $a$p.data_fine desc nulls last
   limit$a$] loop
    if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
      raise exception 'public.crm_prove: % %', vecchio, procedure_unica;
    end if;
  end loop;
  nuova := replace(nuova, $a$when 'in_corso' then p.esito is null and p.data_fine >= now()$a$,
                          $b$when 'richieste' then p.esito is null and p.contract_id is null
           when 'in_corso' then p.esito is null and p.contract_id is not null and p.data_fine >= now()$b$);
  nuova := replace(nuova, $a$when 'in_scadenza' then p.esito is null and p.data_fine >= now() and$a$,
                          $b$when 'in_scadenza' then p.esito is null and p.contract_id is not null and p.data_fine >= now() and$b$);
  nuova := replace(nuova, $a$when 'senza_esito' then p.esito is null and p.data_fine < now()$a$,
                          $b$when 'senza_esito' then p.esito is null and p.contract_id is not null and p.data_fine < now()$b$);
  nuova := replace(nuova, $a$p.data_fine desc nulls last
   limit$a$, $b$p.data_fine desc nulls last, p.data_inizio desc
   limit$b$);
  execute nuova;

  -- 3. I conteggi della home.
  def := pg_get_functiondef('public.crm_home()'::regprocedure);
  nuova := def;
  foreach vecchio in array array[
    $a$p.esito is null and p.data_fine >= now() and (p.data_fine at time zone$a$,
    $a$'prove_in_corso', (select count(*) from public.prove where esito is null and data_fine >= now())$a$,
    $a$'prove_senza_esito', (select count(*) from public.prove where esito is null and data_fine < now()$a$] loop
    if (length(nuova) - length(replace(nuova, vecchio, ''))) / length(vecchio) <> 1 then
      raise exception 'public.crm_home: % %', vecchio, procedure_unica;
    end if;
  end loop;
  nuova := replace(nuova, $a$p.esito is null and p.data_fine >= now() and (p.data_fine at time zone$a$,
                          $b$p.esito is null and p.contract_id is not null and p.data_fine >= now() and (p.data_fine at time zone$b$);
  nuova := replace(nuova, $a$'prove_in_corso', (select count(*) from public.prove where esito is null and data_fine >= now())$a$,
                          $b$'prove_in_corso', (select count(*) from public.prove where esito is null and contract_id is not null and data_fine >= now())$b$);
  nuova := replace(nuova, $a$'prove_senza_esito', (select count(*) from public.prove where esito is null and data_fine < now()$a$,
                          $b$'prove_senza_esito', (select count(*) from public.prove where esito is null and contract_id is not null and data_fine < now()$b$);
  execute nuova;

  -- 4. Il task «La prova finisce»: solo per le prove con il Pass.
  def := pg_get_functiondef('crm.task_fine_prova()'::regprocedure);
  vecchio := $a$where pr.esito is null
     and pr.data_fine between$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm.task_fine_prova: % %', vecchio, procedure_unica;
  end if;
  execute replace(def, vecchio, $b$where pr.esito is null and pr.contract_id is not null
     and pr.data_fine between$b$);

  -- 5. La richiesta senza pass non prende piu' i 7 giorni (passo 6 di prove_dal_mirror).
  def := pg_get_functiondef('crm.prove_dal_mirror()'::regprocedure);
  vecchio := $a$  -- 6. La richiesta senza pass dura 7 giorni, fino a fine giornata.
  update public.prove
     set data_fine = (((data_inizio at time zone 'Europe/Rome')::date + 8)::timestamp at time zone 'Europe/Rome')
                     - interval '1 second'
   where data_fine is null and contract_id is null and esito is null and data_inizio is not null;
$a$;
  if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> 1 then
    raise exception 'crm.prove_dal_mirror: passo 6 %', procedure_unica;
  end if;
  execute replace(def, vecchio, '');
end;
$$;

-- I dati di oggi.
-- Il backup: quello che si cambia qui sotto, per tornare indietro.
create table crm.richieste_non_attivate_prima_20261007 as
select 'lead'::text as tabella, l.id, to_jsonb(l) as riga
  from public.lead l
 where l.fase = 'vinta' and l.esito = 'prova' and l.vinta_contract_id is null and l.origine = 'n8n'
union all
select 'prova', p.id, to_jsonb(p)
  from public.prove p
 where p.contract_id is null and p.esito is null and p.data_fine is not null
union all
select 'task', t.id, to_jsonb(t)
  from public.task t join public.prove p on p.id = t.prova_id
 where p.contract_id is null and p.esito is null and t.completato_il is null
   and t.autore_nome = 'CRM (automatico)' and t.nota like 'La prova finisce il %';
alter table crm.richieste_non_attivate_prima_20261007 enable row level security;
revoke all on crm.richieste_non_attivate_prima_20261007 from public, anon, authenticated;

delete from public.task t
 using public.prove p
 where p.id = t.prova_id and p.contract_id is null and p.esito is null and t.completato_il is null
   and t.autore_nome = 'CRM (automatico)' and t.nota like 'La prova finisce il %';

update public.prove
   set data_fine = null
 where contract_id is null and esito is null and data_fine is not null;

update public.lead
   set fase = 'da_gestire', esito = null, chiuso_il = null, aggiornato_il = now()
 where fase = 'vinta' and esito = 'prova' and vinta_contract_id is null and origine = 'n8n';
