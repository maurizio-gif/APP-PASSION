-- Prove: la richiesta e il pass sono la stessa prova
--
-- Chi chiede il pass dal sito (o l'aveva chiesto su Airtable) ha una prova
-- «richiesta»: la data di inizio che ha chiesto, niente fine, niente pass.
-- Quando su PerfectGym gli attivano il pass, il mirror la collegava solo se il
-- pass partiva entro tre giorni dalla data chiesta; se in reception il pass
-- partiva piu' tardi (la data spostata su PerfectGym), nasceva una seconda
-- prova dal mirror, e la persona ne aveva due in corso: la richiesta senza
-- fine e il pass con le sue date. Qui:
--
--   collegare  una richiesta aperta diventa la prova del pass della stessa
--              persona che parte fra 3 giorni prima e 30 giorni dopo la data
--              chiesta: il pass porta tipo, inizio e fine di PerfectGym. Se
--              le richieste aperte sono piu' d'una, il pass va alla piu'
--              vicina;
--   unire      se la prova del pass c'e' gia' (il mirror l'ha fatta prima),
--              la richiesta ci si fonde dentro (`crm.prove_unisci()`): resta
--              la prova del pass, con le date di PerfectGym, e prende dalla
--              richiesta quello che le manca (chi la segue, il lead, le note,
--              il record di Airtable); i task passano alla prova che resta.
--              Stessa finestra del collegare, e in piu' la richiesta fatta
--              mentre il pass e' ancora in corso. Due richieste aperte della
--              stessa persona a meno di 7 giorni l'una dall'altra sono la
--              stessa prova: la piu' vecchia si fonde nella piu' nuova. La
--              prova tolta resta, com'era, in `crm.prove_unite`;
--   7 giorni   la richiesta che il pass non ce l'ha dura 7 giorni, come il
--              Guest Pass e come gia' contava l'esito (20260929u): cosi'
--              compare fra le «In corso», poi «In scadenza» con il suo task
--              di fine prova, poi «Finite senza esito». Se il pass arriva
--              dopo, le date diventano quelle del pass.
--
-- Il 30/09/2026, alla prima passata: 7 richieste aperte si fondono nella
-- prova del loro pass (una persona ne aveva due sullo stesso pass), una nella
-- richiesta del giorno dopo, e 26 richieste senza pass prendono i 7 giorni.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- Quello che si fonde resta qui, com'era: la prova tolta, in quale e' finita e
-- i task che sono passati.
create table if not exists crm.prove_unite (
  id uuid primary key,
  unita_in uuid not null,
  unita_il timestamptz not null default now(),
  prova jsonb not null,
  task uuid[] not null default '{}'
);
alter table crm.prove_unite enable row level security;
revoke all on crm.prove_unite from public, anon, authenticated;

create or replace function crm.prove_unisci(p_richiesta uuid, p_pass uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  m public.prove;
begin
  if p_richiesta = p_pass then return; end if;
  select * into m from public.prove where id = p_richiesta for update;
  if m.id is null then return; end if;
  perform 1 from public.prove where id = p_pass for update;
  if not found then return; end if;

  insert into crm.prove_unite (id, unita_in, prova, task)
  values (m.id, p_pass, to_jsonb(m),
          coalesce((select array_agg(t.id) from public.task t where t.prova_id = p_richiesta), '{}'));
  update public.task set prova_id = p_pass where prova_id = p_richiesta;
  -- Prima si toglie la richiesta: il record di Airtable (unico) passa al pass.
  delete from public.prove where id = p_richiesta;
  update public.prove x set
    lead_id = coalesce(x.lead_id, m.lead_id),
    gestito_da = coalesce(x.gestito_da, m.gestito_da),
    obiezione = coalesce(x.obiezione, m.obiezione),
    insegnante = coalesce(x.insegnante, m.insegnante),
    note = nullif(concat_ws(E'\n', nullif(m.note, ''), nullif(x.note, '')), ''),
    airtable_id = coalesce(x.airtable_id, m.airtable_id),
    airtable_stato_il = case when x.airtable_id is null then m.airtable_stato_il else x.airtable_stato_il end,
    airtable_assegnato = case when x.airtable_id is null then m.airtable_assegnato else x.airtable_assegnato end,
    creato_il = least(x.creato_il, m.creato_il)
  where x.id = p_pass;
end;
$$;

revoke all on function crm.prove_unisci(uuid, uuid) from public, anon, authenticated;

create or replace function crm.prove_dal_mirror()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  n int := 0;
  k int;
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  r record;
begin
  -- 1. Il pass di una richiesta aperta: la richiesta diventa la prova del pass.
  for r in
    select distinct on (c.id) c.id as contract_id, pr.id as prova_id, p.nome, c.data_inizio, c.data_fine
      from perfectgym.contracts c
      join perfectgym.payment_plans p on p.id = c.payment_plan_id and crm.e_pass(p.nome)
      join public.utenti u on u.member_id = c.member_id
      join public.prove pr on pr.utente_id = u.id and pr.contract_id is null and pr.esito is null
                          and pr.data_inizio is not null
     where not c.is_deleted and c.club_id = club
       and c.data_inizio between (pr.data_inizio at time zone 'Europe/Rome')::date - 3
                             and (pr.data_inizio at time zone 'Europe/Rome')::date + 30
       and not exists (select 1 from public.prove o where o.contract_id = c.id)
     order by c.id, pr.data_inizio desc, pr.creato_il desc
  loop
    update public.prove
       set contract_id = r.contract_id, tipo_pass = r.nome,
           data_inizio = r.data_inizio::timestamp at time zone 'Europe/Rome',
           data_fine = ((r.data_fine + 1)::timestamp at time zone 'Europe/Rome') - interval '1 second'
     where id = r.prova_id and contract_id is null;
    get diagnostics k = row_count; n := n + k;
  end loop;

  -- 2. I pass che non sono di nessuna richiesta: una prova nuova.
  insert into public.prove (utente_id, contract_id, tipo_pass, data_inizio, data_fine, creato_il, origine)
  select crm.persona_del_socio(c.member_id), c.id, p.nome,
         (c.data_inizio::timestamp at time zone 'Europe/Rome'),
         ((c.data_fine + 1)::timestamp at time zone 'Europe/Rome') - interval '1 second',
         now(), 'mirror'
    from perfectgym.contracts c
    join perfectgym.payment_plans p on p.id = c.payment_plan_id
   where not c.is_deleted
     and c.club_id = club
     and crm.e_pass(p.nome)
     and c.data_inizio >= (crm.dal_vivo_dal() at time zone 'Europe/Rome')::date
     and not exists (select 1 from public.prove o where o.contract_id = c.id)
  on conflict (contract_id) do nothing;
  get diagnostics k = row_count; n := n + k;

  -- 3. La richiesta aperta di chi ha gia' la prova del pass: si fonde in quella.
  for r in
    select m.id as richiesta,
           (select x.id from public.prove x
             where x.utente_id = m.utente_id and x.contract_id is not null
               and (x.data_inizio at time zone 'Europe/Rome')::date <= (m.data_inizio at time zone 'Europe/Rome')::date + 30
               and ((x.data_inizio at time zone 'Europe/Rome')::date >= (m.data_inizio at time zone 'Europe/Rome')::date - 3
                    or x.data_fine >= m.data_inizio)
             order by x.data_inizio, x.creato_il limit 1) as pass
      from public.prove m
     where m.contract_id is null and m.esito is null and m.data_inizio is not null
     order by m.data_inizio, m.creato_il
  loop
    if r.pass is not null then
      perform crm.prove_unisci(r.richiesta, r.pass);
      n := n + 1;
    end if;
  end loop;

  -- La stessa persona che chiede la prova due volte in 7 giorni: una prova
  -- sola, la richiesta piu' nuova. Se la piu' nuova se n'e' gia' andata in una
  -- terza, questa aspetta la passata dopo.
  for r in
    select m.id as richiesta,
           (select y.id from public.prove y
             where y.utente_id = m.utente_id and y.id <> m.id
               and y.contract_id is null and y.esito is null and y.data_inizio is not null
               and (y.data_inizio, y.creato_il) > (m.data_inizio, m.creato_il)
               and (y.data_inizio at time zone 'Europe/Rome')::date <= (m.data_inizio at time zone 'Europe/Rome')::date + 7
             order by y.data_inizio, y.creato_il limit 1) as nuova
      from public.prove m
     where m.contract_id is null and m.esito is null and m.data_inizio is not null
     order by m.data_inizio, m.creato_il
  loop
    if r.nuova is not null then
      perform crm.prove_unisci(r.richiesta, r.nuova);
      n := n + 1;
    end if;
  end loop;

  -- 4. Il lead delle prove nate dal mirror: l'ultimo della persona.
  update public.prove pr set lead_id = x.lead_id
    from (select pr2.id, (select l.id from public.lead l
                           where l.utente_id = pr2.utente_id and l.creato_il <= pr2.creato_il + interval '1 day'
                           order by l.creato_il desc limit 1) as lead_id
            from public.prove pr2 where pr2.lead_id is null and pr2.origine = 'mirror') x
   where x.id = pr.id and x.lead_id is not null;

  -- 5. Chi segue la prova, se non e' detto: chi ha il lead.
  update public.prove pr set gestito_da = l.assegnato_a
    from public.lead l
   where l.id = pr.lead_id and pr.gestito_da is null and l.assegnato_a is not null and pr.esito is null;

  -- 6. La richiesta senza pass dura 7 giorni, fino a fine giornata.
  update public.prove
     set data_fine = (((data_inizio at time zone 'Europe/Rome')::date + 8)::timestamp at time zone 'Europe/Rome')
                     - interval '1 second'
   where data_fine is null and contract_id is null and esito is null and data_inizio is not null;
  return n;
end;
$$;
