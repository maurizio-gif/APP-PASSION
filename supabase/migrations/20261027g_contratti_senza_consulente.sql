-- Contratti senza consulente: gli abbonamenti senza un consulente si assegnano dal CRM
--
-- Un abbonamento nuovo puo' arrivare senza che nessuno abbia seguito
-- un'opportunita' («in prima battuta»: la persona si iscrive e basta). Il
-- consulente su PerfectGym non e' attendibile e NON si usa: si assegna dal CRM,
-- con la stessa logica di disdette e rinnovi («Prendo in carico» / «Assegna»).
--
-- Chi vende un abbonamento (`crm.consulente_vendita`), in ordine:
--   1. l'assegnazione fatta nel CRM (`public.assegnazioni_contratto`): un
--      consulente, oppure «Online» (iscrizione autonoma, di nessuno);
--   2. se non c'e', il consulente dell'opportunita' che l'ha chiuso o, se non
--      c'e', dell'ultima opportunita' assegnata alla persona (la regola di prima);
--   3. altrimenti di nessuno: l'abbonamento e' «da assegnare».
--
-- Da assegnare sono gli abbonamenti NUOVI (non rinnovi o cambi: la regola dei
-- 30 giorni degli Abbonamenti), a pagamento, non pass ne' aggiuntivi, firmati dal
-- giorno in `crm.impostazioni.assegnazioni_dal` (28/09/2026, l'inizio del CRM):
-- prima sono storia. Chi non li ha ancora presi in carico li vede in
-- «Contratti senza consulente» (il riquadro nella Dashboard consulente li porta li').
--
-- Prendere in carico un contratto richiede una NOTA (obbligatoria): come e'
-- nato il contratto, cosa si e' detto alla persona. La nota resta sul contratto
-- e compare anche come commento nella scheda della persona (e quindi nel Report
-- giornaliero). Segnare «Online» (iscrizione autonoma, di nessuno) la nota e'
-- facoltativa.
--
-- Chi puo' fare cosa (come per le disdette): un abbonamento di nessuno lo
-- prende o lo assegna chiunque veda le Opportunita'; uno gia' assegnato (anche
-- da un'opportunita') lo riassegna o lo rimette da assegnare solo chi lo ha in
-- carico o chi ha l'autorizzazione «Opportunita' degli altri» (gli admin).
--
-- Le righe di `assegnazioni_contratto` si leggono solo da queste funzioni.
-- Chi le legge: l'elenco Contratti senza consulente, la home, il Report giornaliero e la
-- performance del consulente (che conta anche, a parte, le iscrizioni dirette).
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

insert into crm.impostazioni (chiave, valore)
select 'assegnazioni_dal', '2026-09-28'
 where not exists (select 1 from crm.impostazioni where chiave = 'assegnazioni_dal');

create table if not exists public.assegnazioni_contratto (
  contract_id bigint primary key,
  consulente_id uuid references public.staff (id),
  online boolean not null default false,
  assegnato_da uuid references public.staff (id),
  assegnato_il timestamptz not null default now(),
  note text,
  check (not (online and consulente_id is not null)),
  check (online or consulente_id is not null)
);
alter table public.assegnazioni_contratto enable row level security;
revoke all on public.assegnazioni_contratto from public, anon, authenticated;

-- Il consulente dell'opportunita' che ha portato il contratto (regola 2).
create or replace function crm.consulente_da_opportunita(p_contratto bigint, p_socio bigint)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.assegnato_a
    from public.lead l
   where l.utente_id in (select x.id from public.utenti x where x.member_id = p_socio)
     and l.assegnato_a is not null
   order by (l.vinta_contract_id = p_contratto or l.contract_id = p_contratto) desc nulls last,
            coalesce(l.preso_in_carico_il, l.creato_il) desc
   limit 1
$$;

-- Chi vende il contratto: l'assegnazione fatta nel CRM, altrimenti l'opportunita'.
create or replace function crm.consulente_vendita(p_contratto bigint, p_socio bigint)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when exists (select 1 from public.assegnazioni_contratto a where a.contract_id = p_contratto)
             then (select a.consulente_id from public.assegnazioni_contratto a where a.contract_id = p_contratto)
           else crm.consulente_da_opportunita(p_contratto, p_socio)
         end
$$;

-- Gli abbonamenti nuovi dal giorno di partenza, con chi li vende e lo stato.
create or replace function crm.iscrizioni_nuove()
returns table (contract_id bigint, member_id bigint, data_firma date, data_inizio date, piano text, canone numeric,
               mesi integer, consulente_id uuid, online boolean, assegnato_da uuid, assegnato_il timestamptz,
               note text, da_opportunita boolean, stato text)
language sql
stable
security definer
set search_path = ''
as $$
  with nuovi as (
    select a.id from crm.abbonamenti((now() at time zone 'Europe/Rome')::date) a where not a.rinnovo)
  select c.id, c.member_id, coalesce(c.data_firma, c.data_inizio), c.data_inizio, p.nome, p.canone,
         greatest(coalesce((p.dati -> 'commitmentPeriod' ->> 'months')::int, 1), 1),
         x.consulente, coalesce(m.online, false), m.assegnato_da, m.assegnato_il, m.note, x.da_opp is not null,
         case when m.contract_id is not null and m.online then 'online'
              when x.consulente is null then 'da_assegnare'
              else 'assegnata' end
    from perfectgym.contracts c
    join perfectgym.payment_plans p on p.id = c.payment_plan_id
    join nuovi n on n.id = c.id
    left join public.assegnazioni_contratto m on m.contract_id = c.id
    cross join lateral (select crm.consulente_da_opportunita(c.id, c.member_id) as da_opp) o
    cross join lateral (select case when m.contract_id is not null then m.consulente_id else o.da_opp end as consulente,
                                o.da_opp) x
   where c.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
     and not c.is_deleted
     and not crm.e_pass(p.nome) and p.canone > 0 and not coalesce(p.aggiuntivo, false)
     and coalesce(c.data_firma, c.data_inizio) >= (select valore::date from crm.impostazioni where chiave = 'assegnazioni_dal')
$$;

-- Una vendita diretta: assegnata nel CRM a un consulente, senza opportunita' che la porti.
create or replace function crm.vendita_diretta(p_contratto bigint, p_socio bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.assegnazioni_contratto a where a.contract_id = p_contratto and a.consulente_id is not null)
     and crm.consulente_da_opportunita(p_contratto, p_socio) is null
$$;

-- L'elenco di Contratti senza consulente: da_assegnare, assegnate, online, tutte.
create or replace function public.crm_iscrizioni(p_vista text default 'da_assegnare', p_limite integer default 300)
returns table (contract_id bigint, utente_id uuid, nome text, cognome text, telefono text, email text,
               piano text, canone numeric, mesi integer, data_firma date, data_inizio date, stato text,
               consulente_id uuid, consulente text, assegnato_da text, assegnato_il timestamptz, note text, da_opportunita boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform crm.richiedi_sezione('lead');
  return query
  select i.contract_id, u.id, coalesce(u.nome, m.nome), coalesce(u.cognome, m.cognome),
         coalesce(u.telefono, m.telefono), coalesce(u.email, m.email),
         i.piano, i.canone, i.mesi, i.data_firma, i.data_inizio, i.stato,
         i.consulente_id, crm.nome_staff(i.consulente_id), crm.nome_staff(i.assegnato_da), i.assegnato_il, i.note, i.da_opportunita
    from crm.iscrizioni_nuove() i
    left join perfectgym.members m on m.id = i.member_id
    left join lateral (select x.* from public.utenti x
                        where x.member_id = i.member_id
                        order by exists (select 1 from public.lead l where l.utente_id = x.id) desc, x.aggiornato_il desc
                        limit 1) u on true
   where case coalesce(p_vista, 'da_assegnare')
           when 'da_assegnare' then i.stato = 'da_assegnare'
           when 'assegnate' then i.stato = 'assegnata'
           when 'online' then i.stato = 'online'
           else true end
   order by i.data_firma desc, i.contract_id desc
   limit least(greatest(coalesce(p_limite, 300), 1), 1000);
end;
$$;

-- Prendere in carico (p_consulente nullo: io), assegnare a un collega, o segnare «Online».
create or replace function public.crm_iscrizione_assegna(p_contratto bigint, p_consulente uuid default null, p_online boolean default false, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  chi uuid := coalesce(p_consulente, me);
  nota text := nullif(trim(coalesce(p_note, '')), '');
  utente uuid;
  i record;
begin
  perform crm.richiedi_sezione('lead');
  select * into i from crm.iscrizioni_nuove() x where x.contract_id = p_contratto;
  if i.contract_id is null then raise exception 'Abbonamento non trovato fra le iscrizioni nuove'; end if;
  if not p_online and not exists (select 1 from public.staff where id = chi and attivo) then
    raise exception 'Operatore non valido';
  end if;
  if not p_online and nota is null then
    raise exception 'Scrivi una nota: come è nato il contratto, cosa vi siete detti';
  end if;
  -- Di nessuno lo prende chiunque; di qualcuno solo chi lo ha in carico o chi ha l'autorizzazione.
  if i.consulente_id is not null and i.consulente_id <> me and not crm.ha('lead_altrui') then
    raise exception 'Questo abbonamento è già di %: lo riassegna solo lui, o un admin', crm.nome_staff(i.consulente_id)
      using errcode = '42501';
  end if;
  insert into public.assegnazioni_contratto (contract_id, consulente_id, online, assegnato_da, assegnato_il, note)
  values (p_contratto, case when p_online then null else chi end, p_online, me, now(), nota)
  on conflict (contract_id) do update
    set consulente_id = excluded.consulente_id, online = excluded.online, assegnato_da = excluded.assegnato_da,
        assegnato_il = excluded.assegnato_il, note = excluded.note;
  -- La nota anche nella scheda della persona, come commento di chi ha preso in carico.
  if nota is not null then
    select x.id into utente from public.utenti x
     where x.member_id = i.member_id
     order by exists (select 1 from public.lead l where l.utente_id = x.id) desc, x.aggiornato_il desc
     limit 1;
    if utente is not null then
      insert into public.commenti (utente_id, testo, autore_id)
      values (utente, 'Contratto «' || ltrim(i.piano, '#^ ') || '» preso in carico da ' || crm.nome_staff(chi) || ': ' || nota, me);
      update public.utenti set aggiornato_il = now() where id = utente;
    end if;
  end if;
end;
$$;

-- Rimetterlo da assegnare: toglie l'assegnazione fatta nel CRM.
create or replace function public.crm_iscrizione_rilascia(p_contratto bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := crm.chi();
  i record;
begin
  perform crm.richiedi_sezione('lead');
  select * into i from crm.iscrizioni_nuove() x where x.contract_id = p_contratto;
  if i.contract_id is null then raise exception 'Abbonamento non trovato fra le iscrizioni nuove'; end if;
  if i.consulente_id is not null and i.consulente_id <> me and not crm.ha('lead_altrui') then
    raise exception 'Questo abbonamento è già di %: lo rimette da assegnare solo lui, o un admin', crm.nome_staff(i.consulente_id)
      using errcode = '42501';
  end if;
  delete from public.assegnazioni_contratto where contract_id = p_contratto;
end;
$$;

revoke all on function public.crm_iscrizioni(text, integer) from public, anon;
revoke all on function public.crm_iscrizione_assegna(bigint, uuid, boolean, text) from public, anon;
revoke all on function public.crm_iscrizione_rilascia(bigint) from public, anon;
grant execute on function public.crm_iscrizioni(text, integer) to authenticated;
grant execute on function public.crm_iscrizione_assegna(bigint, uuid, boolean, text) to authenticated;
grant execute on function public.crm_iscrizione_rilascia(bigint) to authenticated;

-- Le letture che attribuivano la vendita da sole usano ora la regola unica.
do $$
declare
  def text;
  function_name text;
  vecchio text;
  nuovo text;
  volte int;
begin
  for function_name, vecchio, nuovo, volte in
    select * from (values
      ('public.crm_home()',
       E'    ''rinnovi_da_gestire'',',
       E'    ''iscrizioni_da_assegnare'', (select count(*) from crm.iscrizioni_nuove() i where i.stato = ''da_assegnare'' and crm.puo_vedere(''lead'')),\n    ''rinnovi_da_gestire'',', 1),
      ('public.crm_report_giornaliero(date, uuid)',
       E'           (select l.assegnato_a from public.lead l
             where l.utente_id in (select x.id from public.utenti x where x.member_id = k.member_id)
               and l.assegnato_a is not null
             order by (l.vinta_contract_id = k.id or l.contract_id = k.id) desc nulls last,
                      coalesce(l.preso_in_carico_il, l.creato_il) desc
             limit 1),',
       E'           crm.consulente_vendita(k.id, k.member_id),', 1),
      ('public.crm_performance(uuid, integer)',
       E'       and (select l.assegnato_a from public.lead l
             where l.utente_id in (select x.id from public.utenti x where x.member_id = c.member_id)
               and l.assegnato_a is not null
             order by (l.vinta_contract_id = c.id or l.contract_id = c.id) desc nulls last,
                      coalesce(l.preso_in_carico_il, l.creato_il) desc
             limit 1) = chi',
       E'       and crm.consulente_vendita(c.id, c.member_id) = chi', 1),
      ('public.crm_performance(uuid, integer)',
       E'p.canone as canone, greatest(',
       E'crm.vendita_diretta(c.id, c.member_id) as diretta, p.canone as canone, greatest(', 1),
      ('public.crm_performance(uuid, integer)',
       E'''importo_mensile'',',
       E'''abbonamenti_diretti'', (select count(*) from vendite v where v.sett = s.lun and v.diretta),\n             ''importo_diretti'', (select coalesce(sum(v.canone), 0) from vendite v where v.sett = s.lun and v.diretta),\n             ''importo_mensile'',', 1)
    ) as t (f, a, b, n)
  loop
    def := pg_get_functiondef(function_name::regprocedure);
    if (length(def) - length(replace(def, vecchio, ''))) / length(vecchio) <> volte then
      raise exception '%: il pezzo da cambiare non c''e'' esattamente % volta/e', function_name, volte;
    end if;
    execute replace(def, vecchio, nuovo);
  end loop;
end;
$$;
