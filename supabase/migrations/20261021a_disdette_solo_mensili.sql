-- Disdette solo dei piani mensili: quelle dei piani a termine si nascondono
--
-- Dal 30/09/2026 (20260930c) le disdette nascono dal mirror solo per i piani
-- ricorrenti, e i piani a termine (Percorsi «I ❤️ My Trainer», Reformer 12
-- mesi, PT Elite) sono rinnovi. Le disdette aperte arrivate da Airtable sui
-- piani a termine erano pero' rimaste: su PerfectGym un contratto a termine ha
-- la data di disdetta uguale alla fine, e Airtable lo trattava da disdetta.
-- Cosi' la stessa persona compariva sia in Disdette sia in Rinnovi, per lo
-- stesso contratto, a volte con in piu' un doppione senza contratto.
--
-- Al 21/10/2026 si nascondono (non si cancellano):
--   - le 45 disdette aperte (senza esito o in sospeso) di contratti a termine:
--     40 sono gia' fra i rinnovi, le altre 5 ci entrano da sole 30 giorni prima
--     della fine;
--   - le 5 disdette aperte senza contratto, doppioni di un'altra disdetta della
--     stessa persona con la stessa data.
-- Nessuna aveva note, motivo o contatto. Ogni disdetta si copia intera in
-- crm.disdette_nascoste e si toglie da public.disdette, cosi' sparisce da
-- Disdette, dalla home e dalla scheda persona senza toccare quelle funzioni.
-- I suoi task restano: si staccano dalla disdetta (il legame si ricorda in
-- crm.disdette_nascoste_task) e quelli non fatti si archiviano, perche' il
-- rinnovo ha gia' la sua telefonata (crm.task_rinnovi). Le disdette gia'
-- chiuse con un esito restano dove sono: sono storia.
--
-- Per rimetterne una: reinserire la riga da crm.disdette_nascoste in
-- public.disdette (senza il trigger, o togliendolo un momento) e ricollegare i
-- task da crm.disdette_nascoste_task.
--
-- Da qui in avanti un contratto a termine non entra mai fra le disdette: lo
-- ferma il trigger qui sotto, qualunque cosa provi a inserirlo.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

create table if not exists crm.disdette_nascoste (
  like public.disdette,
  nascosta_il timestamptz not null default now(),
  perche text not null
);

create table if not exists crm.disdette_nascoste_task (
  task_id uuid primary key,
  disdetta_id uuid not null,
  era_archiviato boolean
);

revoke all on crm.disdette_nascoste, crm.disdette_nascoste_task from public, anon, authenticated;

create temporary table da_nascondere on commit drop as
  select d.id, 'piano a termine: e'' un rinnovo' as perche
    from public.disdette d
    join perfectgym.contracts c on c.id = d.contract_id
    join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
   where (d.esito is null or d.esito = 'standby')
     and not crm.piano_ricorrente(pp.dati)
  union
  select d.id, 'doppione senza contratto'
    from public.disdette d
   where d.contract_id is null
     and (d.esito is null or d.esito = 'standby')
     and exists (select 1 from public.disdette x
                  where x.utente_id = d.utente_id and x.id <> d.id
                    and x.contract_id is not null and x.data_disdetta = d.data_disdetta);

insert into crm.disdette_nascoste
  select d.*, now(), h.perche
    from public.disdette d join da_nascondere h on h.id = d.id;

insert into crm.disdette_nascoste_task (task_id, disdetta_id, era_archiviato)
  select t.id, t.disdetta_id, t.archiviato
    from public.task t
   where t.disdetta_id in (select id from da_nascondere);

update public.task
   set disdetta_id = null,
       archiviato = archiviato or completato_il is null
 where disdetta_id in (select id from da_nascondere);

delete from public.disdette where id in (select id from da_nascondere);

-- Un contratto di un piano a termine non diventa una disdetta.
create or replace function crm.disdetta_solo_ricorrenti()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.contract_id is not null and exists (
       select 1 from perfectgym.contracts c
         join perfectgym.payment_plans pp on pp.id = c.payment_plan_id
        where c.id = new.contract_id and not crm.piano_ricorrente(pp.dati)) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists disdetta_solo_ricorrenti on public.disdette;
create trigger disdetta_solo_ricorrenti
  before insert on public.disdette
  for each row execute function crm.disdetta_solo_ricorrenti();
