-- Debitori: chi ha il saldo negativo su PerfectGym, e il lavoro per recuperarlo
--
-- Il saldo non si copia: si legge ogni volta da `perfectgym.member_balances`
-- (il mirror, che lo aggiorna col polling e, a ogni pagamento o modifica del
-- socio, col webhook). Debitore e' un socio di Passion (club 1) con
-- `currentBalance` sotto lo zero; appena il saldo torna a zero o sopra, esce
-- dall'elenco, anche prima che il CRM se ne accorga.
--
-- Qui sta il lavoro: `public.debiti`, una riga per ogni volta che un socio
-- va in negativo (aperta finche' il saldo non rientra), con chi segue il
-- recupero; e i task, che si agganciano al debito (`task.debito_id`) e
-- compaiono anche fra i task e nella storia della persona. `crm.alimenta()`
-- apre i debiti nuovi e chiude quelli rientrati ogni 5 minuti; i task si
-- possono mettere anche prima, il debito si apre da solo.
--
-- Abbonamento attivo: un contratto di Passion, non cancellato, di un piano
-- non aggiuntivo con canone sopra lo zero (come nella dashboard
-- abbonamenti), nello stato Current, Freezed o NotStarted. Scaduto: tutti gli
-- altri (l'ultimo abbonamento e' finito, o non c'e' mai stato).
--
-- La sezione `debitori` si aggiunge alle sezioni operative: la ricevono
-- tutti gli operatori, e si toglie da Utenti.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- ---------------------------------------------------------------------------
-- La sezione
-- ---------------------------------------------------------------------------

alter table public.staff drop constraint if exists staff_sezioni_note;
alter table public.staff add constraint staff_sezioni_note
  check (sezioni <@ array['lead', 'prove', 'contratti', 'disdette', 'task', 'cerca', 'debitori', 'abbonamenti']);
alter table public.staff alter column sezioni
  set default array['lead', 'prove', 'contratti', 'disdette', 'task', 'cerca', 'debitori'];
update public.staff set sezioni = sezioni || array['debitori'] where not ('debitori' = any (sezioni));

-- Il saldo si ricontrolla ogni 2 minuti, come contratti e pagamenti (era 5).
update perfectgym.entita set intervallo_minuti = 2 where nome = 'MemberBalances';

-- ---------------------------------------------------------------------------
-- I debiti
-- ---------------------------------------------------------------------------

create table if not exists public.debiti (
  id             uuid primary key default gen_random_uuid(),
  member_id      bigint not null,
  utente_id      uuid references public.utenti (id),
  negativo_da    timestamptz,                -- da PerfectGym, quando si apre
  saldo_iniziale numeric,                    -- il saldo quando si apre
  assegnato_a    uuid references public.staff (id),
  creato_il      timestamptz not null default now(),
  rientrato_il   timestamptz                 -- saldo tornato a zero o sopra
);
create unique index if not exists debiti_aperti_idx on public.debiti (member_id) where rientrato_il is null;
create index if not exists debiti_utente_idx on public.debiti (utente_id);

alter table public.debiti enable row level security;
revoke all on public.debiti from anon, authenticated;

alter table public.task add column if not exists debito_id uuid references public.debiti (id);
create index if not exists task_debito_idx on public.task (debito_id) where debito_id is not null;

-- Il debito aperto del socio; se non c'e' e il saldo e' negativo, lo apre.
create or replace function crm.debito_aperto(p_member bigint)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  d uuid;
  b perfectgym.member_balances;
begin
  select id into d from public.debiti where member_id = p_member and rientrato_il is null;
  if d is not null then return d; end if;
  select * into b from perfectgym.member_balances where id = p_member and not is_deleted;
  if b.id is null or b.saldo >= 0 then
    raise exception 'Il saldo di questo socio su PerfectGym non e'' negativo';
  end if;
  insert into public.debiti (member_id, utente_id, negativo_da, saldo_iniziale)
  values (p_member, crm.persona_del_socio(p_member), b.negativo_da, b.saldo)
  on conflict (member_id) where rientrato_il is null do nothing
  returning id into d;
  if d is null then
    select id into d from public.debiti where member_id = p_member and rientrato_il is null;
  end if;
  return d;
end;
$$;

-- Dal mirror: apre i debiti nuovi, chiude quelli rientrati.
create or replace function crm.debiti_dal_mirror()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  aperti int;
  rientrati int;
begin
  insert into public.debiti (member_id, utente_id, negativo_da, saldo_iniziale)
  select b.id, crm.persona_del_socio(b.id), b.negativo_da, b.saldo
    from perfectgym.member_balances b
    join perfectgym.members m on m.id = b.id and not m.is_deleted and m.home_club_id = club
   where not b.is_deleted and b.saldo < 0
     and not exists (select 1 from public.debiti d where d.member_id = b.id and d.rientrato_il is null)
  on conflict (member_id) where rientrato_il is null do nothing;
  get diagnostics aperti = row_count;

  update public.debiti d set rientrato_il = now()
   where d.rientrato_il is null
     and not exists (select 1 from perfectgym.member_balances b
                      where b.id = d.member_id and not b.is_deleted and b.saldo < 0);
  get diagnostics rientrati = row_count;

  return jsonb_build_object('aperti', aperti, 'rientrati', rientrati);
end;
$$;

revoke all on function crm.debito_aperto(bigint), crm.debiti_dal_mirror() from public, anon, authenticated;

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
    'task_fine_prova', crm.task_fine_prova(),
    'debiti', crm.debiti_dal_mirror());
  insert into crm.alimenta_log (esito) values (out);
  delete from crm.alimenta_log where il < now() - interval '14 days';
  return out;
exception when others then
  insert into crm.alimenta_log (errore) values (sqlerrm);
  return jsonb_build_object('errore', sqlerrm);
end;
$$;

-- ---------------------------------------------------------------------------
-- L'elenco
-- ---------------------------------------------------------------------------

-- p_vista: attivi | scaduti | tutti (saldo negativo adesso) | rientrati (gli
-- ultimi 90 giorni); p_chi: tutti | miei | nessuno (chi segue il recupero).
create or replace function public.crm_debitori(p_vista text default 'attivi', p_chi text default 'tutti', p_limite int default 500)
returns table (
  member_id bigint, debito_id uuid, utente_id uuid, nome text, cognome text, telefono text, email text,
  saldo numeric, negativo_da timestamptz, abbonamento_attivo boolean, piano text, stato_contratto text, data_fine date,
  ultimo_pagamento timestamptz, ultimo_importo numeric, assegnato_a uuid, assegnato_nome text,
  task_aperti int, prossimo_task timestamptz, note_task text, rientrato_il timestamptz, saldo_controllato_il timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid;
  club bigint := (select valore::bigint from crm.impostazioni where chiave = 'club_id');
  controllato timestamptz := (select s.ultimo_giro_il from perfectgym.sync_stato s where s.entita = 'MemberBalances');
begin
  perform crm.richiedi_sezione('debitori');
  me := crm.chi();
  return query
  with righe as (
    -- Chi e' in negativo adesso, col suo debito aperto se c'e' gia'.
    select b.id as mid, d.id as did, b.saldo, b.negativo_da, d.assegnato_a, d.utente_id as uid, null::timestamptz as rientrato
      from perfectgym.member_balances b
      join perfectgym.members m on m.id = b.id and not m.is_deleted and m.home_club_id = club
      left join public.debiti d on d.member_id = b.id and d.rientrato_il is null
     where coalesce(p_vista, 'attivi') <> 'rientrati' and not b.is_deleted and b.saldo < 0
    union all
    -- I debiti chiusi, o aperti ma col saldo gia' rientrato sul mirror.
    select d.member_id, d.id, b.saldo, d.negativo_da, d.assegnato_a, d.utente_id, coalesce(d.rientrato_il, b.sincronizzato_il)
      from public.debiti d
      left join perfectgym.member_balances b on b.id = d.member_id and not b.is_deleted
     where p_vista = 'rientrati'
       and (d.rientrato_il > now() - interval '90 days'
            or (d.rientrato_il is null and coalesce(b.saldo, 0) >= 0))
  )
  select r.mid, r.did,
         coalesce(r.uid, (select u.id from public.utenti u where u.member_id = r.mid order by u.creato_il limit 1)),
         m.nome, m.cognome, m.telefono, m.email,
         r.saldo, r.negativo_da, coalesce(a.attivo, false), a.nome, a.stato, a.data_fine,
         pg.data, pg.importo, r.assegnato_a, crm.nome_staff(r.assegnato_a),
         coalesce(t.aperti, 0)::int, t.prossimo, t.note, r.rientrato, controllato
    from righe r
    join perfectgym.members m on m.id = r.mid
    -- L'abbonamento: quello attivo, o l'ultimo.
    left join lateral (
      select pp.nome, c.stato, c.data_fine, c.stato in ('Current', 'Freezed', 'NotStarted') as attivo
        from perfectgym.contracts c
        join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
       where c.member_id = r.mid and c.club_id = club and not c.is_deleted
         and not coalesce(pp.aggiuntivo, false) and pp.canone > 0
       order by (c.stato in ('Current', 'Freezed', 'NotStarted')) desc, c.data_inizio desc nulls last
       limit 1) a on true
    left join lateral (
      select p.data, p.importo
        from perfectgym.contract_payments p
       where p.member_id = r.mid and p.club_id = club and not p.is_deleted and not coalesce(p.rimborso, false)
       order by p.data desc
       limit 1) pg on true
    left join lateral (
      select count(*) filter (where x.completato_il is null) as aperti,
             min(x.data) filter (where x.completato_il is null) as prossimo,
             string_agg(crm.nota_task(x), ', ' order by coalesce(x.completato_il, x.data, x.creato_il) desc)
               filter (where crm.nota_task(x) is not null) as note
        from public.task x
       where r.did is not null and x.debito_id = r.did) t on true
   where case coalesce(p_vista, 'attivi')
           when 'attivi' then coalesce(a.attivo, false)
           when 'scaduti' then not coalesce(a.attivo, false)
           else true end
     and case coalesce(p_chi, 'tutti')
           when 'miei' then r.assegnato_a = me
           when 'nessuno' then r.assegnato_a is null
           else true end
   order by case when p_vista = 'rientrati' then r.rientrato end desc nulls last, r.saldo asc
   limit least(greatest(coalesce(p_limite, 500), 1), 1000);
end;
$$;

-- ---------------------------------------------------------------------------
-- Le azioni
-- ---------------------------------------------------------------------------

-- Un task di recupero: sulla persona e sul debito. Chi lo riceve, se il
-- debito non lo segue ancora nessuno, diventa chi segue il recupero.
create or replace function public.crm_debito_task(p_member bigint, p_tipo text, p_data timestamptz, p_nota text default null,
                                                  p_assegnato uuid default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me uuid;
  d public.debiti;
  t uuid;
begin
  perform crm.richiedi_sezione('debitori');
  me := crm.chi();
  select * into d from public.debiti where id = crm.debito_aperto(p_member);
  if d.utente_id is null then raise exception 'Socio non trovato'; end if;
  insert into public.task (utente_id, debito_id, tipo, data, nota, assegnato_a, creato_da)
  values (d.utente_id, d.id, p_tipo, coalesce(p_data, now()), nullif(trim(coalesce(p_nota, '')), ''),
          coalesce(p_assegnato, me), me)
  returning id into t;
  update public.debiti set assegnato_a = coalesce(assegnato_a, p_assegnato, me) where id = d.id;
  update public.utenti set aggiornato_il = now() where id = d.utente_id;
  return t;
end;
$$;

-- Chi segue il recupero: prenderlo (p_staff vuoto = io) o passarlo a un altro.
create or replace function public.crm_debito_assegna(p_member bigint, p_staff uuid default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid;
begin
  perform crm.richiedi_sezione('debitori');
  me := crm.chi();
  if p_staff is not null and not exists (select 1 from public.staff where id = p_staff and attivo) then
    raise exception 'Operatore non trovato';
  end if;
  update public.debiti set assegnato_a = coalesce(p_staff, me) where id = crm.debito_aperto(p_member);
end;
$$;

revoke all on function public.crm_debitori(text, text, int), public.crm_debito_task(bigint, text, timestamptz, text, uuid),
                       public.crm_debito_assegna(bigint, uuid) from public, anon;
grant execute on function public.crm_debitori(text, text, int), public.crm_debito_task(bigint, text, timestamptz, text, uuid),
                          public.crm_debito_assegna(bigint, uuid) to authenticated;

-- I debiti di oggi, subito.
select crm.debiti_dal_mirror();
