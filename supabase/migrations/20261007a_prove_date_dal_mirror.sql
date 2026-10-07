-- Le date di una prova seguono il pass su PerfectGym
--
-- La prova copiava inizio e fine del pass quando nasceva e non le toccava piu':
-- se su PerfectGym il pass veniva spostato, la sezione Prove restava indietro
-- (es. contratto 81353: Prove 30/09-06/10, PerfectGym e Abbonamenti 01/10-07/10).
-- Il 07/10/2026 le prove con le date diverse erano 444, 7 ancora aperte.
--
-- Ora le date si riallineano a quelle del contratto, una volta per tutte le
-- prove di oggi e poi a ogni passata di crm.prove_dal_mirror().
--   - si usa il contratto non cancellato che ha la data di inizio; se la data di
--     fine manca su PerfectGym, quella della prova resta com'e';
--   - stesso formato di quando la prova nasce: inizio a mezzanotte di Roma, fine
--     alle 23:59:59 di Roma del giorno di fine.
--
-- Attenzione: chi ha il pass spostato in avanti (es. 80972 e 80975, ora dal
-- 19/10) risulta con le date di PerfectGym, quindi non ancora iniziato.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- 0. Il backup: le date com'erano prima, per tornare indietro.
--    Per ripristinare: update public.prove p set data_inizio = b.data_inizio,
--    data_fine = b.data_fine from crm.prove_date_prima_20261007 b where b.id = p.id;
create table crm.prove_date_prima_20261007 as
select p.id, p.contract_id, p.data_inizio, p.data_fine, p.esito
  from public.prove p
  join perfectgym.contracts k on k.id = p.contract_id
 where not k.is_deleted
   and k.data_inizio is not null
   and ((p.data_inizio at time zone 'Europe/Rome')::date is distinct from k.data_inizio
        or (k.data_fine is not null and (p.data_fine at time zone 'Europe/Rome')::date is distinct from k.data_fine));
alter table crm.prove_date_prima_20261007 enable row level security;

-- 1. Una volta: le prove di oggi.
update public.prove p
   set data_inizio = k.data_inizio::timestamp at time zone 'Europe/Rome',
       data_fine = coalesce(((k.data_fine + 1)::timestamp at time zone 'Europe/Rome') - interval '1 second', p.data_fine)
  from perfectgym.contracts k
 where k.id = p.contract_id
   and not k.is_deleted
   and k.data_inizio is not null
   and ((p.data_inizio at time zone 'Europe/Rome')::date is distinct from k.data_inizio
        or (k.data_fine is not null and (p.data_fine at time zone 'Europe/Rome')::date is distinct from k.data_fine));

-- 2. Sempre: lo stesso aggiornamento, in testa a crm.prove_dal_mirror().
do $$
declare
  def text;
  nuova text;
  punto text := $s$  -- 1. Il pass di una richiesta aperta: la richiesta diventa la prova del pass.$s$;
  passo text := $s$  -- 0. Le date delle prove che hanno gia' il contratto: quelle di PerfectGym.
  update public.prove p
     set data_inizio = k.data_inizio::timestamp at time zone 'Europe/Rome',
         data_fine = coalesce(((k.data_fine + 1)::timestamp at time zone 'Europe/Rome') - interval '1 second', p.data_fine)
    from perfectgym.contracts k
   where k.id = p.contract_id
     and not k.is_deleted
     and k.data_inizio is not null
     and ((p.data_inizio at time zone 'Europe/Rome')::date is distinct from k.data_inizio
          or (k.data_fine is not null and (p.data_fine at time zone 'Europe/Rome')::date is distinct from k.data_fine));

$s$;
begin
  def := pg_get_functiondef('crm.prove_dal_mirror()'::regprocedure);
  if position(punto in def) = 0 then
    raise exception 'crm.prove_dal_mirror: punto di inserimento non trovato';
  end if;
  nuova := replace(def, punto, passo || punto);
  execute nuova;
end;
$$;
