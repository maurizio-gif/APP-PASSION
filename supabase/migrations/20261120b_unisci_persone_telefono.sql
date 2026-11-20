-- Persone doppie: il CRM le unisce da solo quando il telefono arriva dopo (ticket #1084)
--
-- Il caso: un'opportunita' crea la persona con un'email sbagliata («gmail.con») e il telefono; pochi
-- minuti dopo il desk crea la scheda su Perfect Gym, ancora senza telefono. Il CRM non trova la stessa
-- email ne' lo stesso telefono e crea una seconda persona: l'opportunita' sta su una, la prova sull'altra.
-- Quando il telefono arriva su Perfect Gym, nessuno ricontrollava.
--
-- Adesso, a ogni passata di crm.alimenta() (ogni 5 minuti), crm.unisci_per_telefono() unisce le due
-- persone quando:
--   - una non ha una scheda Perfect Gym (nata da un'opportunita') e l'altra si';
--   - il telefono della prima e' quello della scheda Perfect Gym dell'altra;
--   - il primo nome e' lo stesso (cosi' due persone che danno lo stesso numero, per esempio madre e
--     figlio, restano separate);
--   - la coppia e' unica (un solo candidato da una parte e dall'altra).
-- Resta la persona nata dall'opportunita': prende la scheda Perfect Gym, l'email e il telefono della
-- scheda (Perfect Gym fa fede, come in 20261105a), e tutto quello che stava sull'altra (prove, debiti,
-- task, ...). L'altra si cancella.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

-- Sposta tutto da p_togli a p_tieni e cancella p_togli.
create or replace function crm.unisci_persone(p_tieni uuid, p_togli uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  t public.utenti;
  pm perfectgym.members;
begin
  if p_tieni = p_togli then raise exception 'Stessa persona'; end if;
  select * into t from public.utenti where id = p_togli for update;
  if t.id is null then raise exception 'Persona da unire non trovata'; end if;
  perform 1 from public.utenti where id = p_tieni for update;
  if not found then raise exception 'Persona da tenere non trovata'; end if;

  update public.lead              set utente_id = p_tieni where utente_id = p_togli;
  update public.prove             set utente_id = p_tieni where utente_id = p_togli;
  update public.nuovi_contratti   set utente_id = p_tieni where utente_id = p_togli;
  update public.disdette          set utente_id = p_tieni where utente_id = p_togli;
  update public.commenti          set utente_id = p_tieni where utente_id = p_togli;
  update public.task              set utente_id = p_tieni where utente_id = p_togli;
  update public.debiti            set utente_id = p_tieni where utente_id = p_togli;
  update public.rinnovi           set utente_id = p_tieni where utente_id = p_togli;
  update public.ticket            set utente_id = p_tieni where utente_id = p_togli;
  update public.azioni_istruttori set utente_id = p_tieni where utente_id = p_togli;
  update crm.disdette_nascoste    set utente_id = p_tieni where utente_id = p_togli;

  select * into pm from perfectgym.members where id = t.member_id;
  delete from public.utenti where id = p_togli;
  update public.utenti u
     set member_id = coalesce(u.member_id, t.member_id),
         email = coalesce(nullif(pm.email, ''), u.email, t.email),
         telefono = coalesce(nullif(pm.telefono, ''), u.telefono, t.telefono),
         nome = coalesce(u.nome, t.nome), cognome = coalesce(u.cognome, t.cognome),
         aggiornato_il = now()
   where u.id = p_tieni;
end;
$$;
revoke all on function crm.unisci_persone(uuid, uuid) from public, anon, authenticated;

-- Le coppie da unire (vedi sopra) e l'unione.
create or replace function crm.unisci_per_telefono()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    with c as (
      select k.id as tieni, d.id as togli, k.nome as kn, pm.nome as mn,
             count(*) over (partition by k.id) as nk, count(*) over (partition by d.id) as nd
        from public.utenti k
        join perfectgym.members pm on not pm.is_deleted and public.normalizza_telefono(pm.telefono) = k.telefono_norm
        join public.utenti d on d.member_id = pm.id and d.id <> k.id
       where k.member_id is null and k.telefono_norm is not null and not crm.cancellata(pm.id)
    )
    select tieni, togli from c
     where nk = 1 and nd = 1
       and lower(split_part(trim(kn), ' ', 1)) = lower(split_part(trim(mn), ' ', 1))
  loop
    perform crm.unisci_persone(r.tieni, r.togli);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function crm.unisci_per_telefono() from public, anon, authenticated;

-- In crm.alimenta(), prima di collegare i soci.
do $mig$
declare
  def text;
  vecchio text := $a$'collega_soci', crm.collega_soci(),$a$;
  nuovo text := $b$'unisci_telefono', crm.unisci_per_telefono(),
    'collega_soci', crm.collega_soci(),$b$;
  volte int;
begin
  def := pg_get_functiondef('crm.alimenta()'::regprocedure);
  volte := (length(def) - length(replace(def, vecchio, ''))) / length(vecchio);
  if volte <> 1 then
    raise exception 'crm.alimenta: il pezzo da cambiare compare % volte (atteso 1)', volte;
  end if;
  execute replace(def, vecchio, nuovo);
end
$mig$;
