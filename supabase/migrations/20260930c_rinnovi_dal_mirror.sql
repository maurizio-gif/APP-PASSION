-- Rinnovi dal mirror; disdette solo dei piani ricorrenti
--
-- Dal 30/09/2026 Airtable e' spento: tutto quello che non e' un lead dei moduli
-- deve nascere dal mirror di PerfectGym. Fino a oggi i rinnovi li creava
-- un'automazione di Airtable a fine mese; da qui li crea crm.alimenta().
--
-- Su PerfectGym un contratto ha la data di fine solo quando ha anche la data di
-- disdetta, e a Passion ci sono due tipi di piano:
--
--   - a termine, pagati in un'unica soluzione, senza rinnovo automatico:
--     nascono gia' con la data di fine (Reformer 12 mesi, Percorsi «I ❤️ My
--     Trainer», PT Elite, e le versioni di questi piani non piu' in vendita,
--     che restano da gestire). Sono i RINNOVI: il contratto entra in
--     public.rinnovi da 30 giorni prima della fine a 30 giorni dopo, se la
--     persona non ha gia' l'abbonamento nuovo; crm.task_rinnovi() mette la
--     telefonata 15 giorni prima (subito, se quel giorno e' passato);
--   - ricorrenti, con addebito mensile (SDD o carta): finiscono solo se il
--     socio disdice. Sono le DISDETTE, come prima.
--
-- Il tipo si legge dal piano: e' ricorrente se permette l'addebito ricorrente
-- (allowedPaymentTypes). Sui dati di Airtable la regola torna 9 volte su 10:
-- 252 rinnovi su 274 erano piani a termine, 811 disdette su 891 ricorrenti.
-- Le disdette gia' aperte di piani a termine restano come sono.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create or replace function crm.piano_ricorrente(p_dati jsonb) returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce((p_dati -> 'allowedPaymentTypes' ->> 'isRecurringDirectDebitPaymentAllowed')::boolean, false)
      or coalesce((p_dati -> 'allowedPaymentTypes' ->> 'isRecurringCreditCardPaymentAllowed')::boolean, false)
$$;

-- I rinnovi: abbonamenti principali a pagamento di un piano a termine, che
-- finiscono fra 30 giorni fa e 30 giorni da oggi, se su PerfectGym non c'e'
-- gia' l'abbonamento nuovo (la stessa regola di crm.task_rinnovi()). Chi li
-- segue si sceglie in Rinnovi.
create or replace function crm.rinnovi_dal_mirror()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  n int;
begin
  insert into public.rinnovi (utente_id, member_id, contract_id, piano, scadenza, valore, creato_il)
  select crm.persona_del_socio(c.member_id), c.member_id, c.id, ltrim(p.nome, '#^ '), c.data_fine, p.canone, now()
    from perfectgym.contracts c
    join perfectgym.payment_plans p on p.id = c.payment_plan_id
   where not c.is_deleted
     and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and not coalesce(c.aggiuntivo, false) and not coalesce(p.aggiuntivo, false)
     and coalesce(p.canone, 0) > 0
     and not crm.e_pass(p.nome)
     and not crm.piano_ricorrente(p.dati)
     and c.data_fine between oggi - 30 and oggi + 30
     and not exists (select 1 from public.rinnovi r where r.contract_id = c.id)
     and not exists (select 1 from perfectgym.contracts c2
                       join perfectgym.payment_plans p2 on p2.id = c2.payment_plan_id
                      where c2.member_id = c.member_id and not c2.is_deleted and c2.id <> c.id
                        and not coalesce(c2.aggiuntivo, false) and p2.canone > 0
                        and c2.data_inizio >= c.data_fine - 30);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Le disdette: come prima, ma solo dei piani ricorrenti. La fine di un piano a
-- termine e' un rinnovo, non una disdetta.
create or replace function crm.disdette_dal_mirror()
returns integer
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  insert into public.disdette (contract_id, utente_id, member_id, data_disdetta, creato_il, origine)
  select c.id, crm.persona_del_socio(c.member_id), c.member_id, c.data_disdetta, now(), 'mirror'
    from perfectgym.contracts c
    join perfectgym.payment_plans p on p.id = c.payment_plan_id
   where not c.is_deleted
     and c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and c.data_disdetta is not null
     and coalesce(p.canone, 0) <> 0
     and not crm.e_pass(p.nome)
     and crm.piano_ricorrente(p.dati)
     and not exists (select 1 from crm.disdette_note k where k.contract_id = c.id)
     and not exists (select 1 from public.disdette d where d.contract_id = c.id)
  on conflict (contract_id) do nothing;
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
    'airtable', airtable.allinea(),
    'nuovi_contratti', crm.nuovi_contratti_dal_mirror(),
    'disdette', crm.disdette_dal_mirror(),
    'rinnovi', crm.rinnovi_dal_mirror(),
    'prove', crm.prove_dal_mirror(),
    'lead_vinti', crm.lead_vinti_dal_mirror(),
    'prove_esiti', crm.prove_esiti_dal_mirror(),
    'task_fine_prova', crm.task_fine_prova(),
    'task_disdette', crm.task_disdette(),
    'task_rinnovi', crm.task_rinnovi(),
    'debiti', crm.debiti_dal_mirror());
  insert into crm.alimenta_log (esito) values (out);
  delete from crm.alimenta_log where il < now() - interval '14 days';
  return out;
exception when others then
  insert into crm.alimenta_log (errore) values (sqlerrm);
  return jsonb_build_object('errore', sqlerrm);
end;
$$;
