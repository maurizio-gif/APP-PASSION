-- Recupero Formula 8: tutti gli attivi, meno chi ha provato Formula 8
--
-- Correzione di 20261110d. «Attivo» era un contratto Current senza disdetta: lasciava fuori chi ha
-- dato disdetta ma e' ancora dentro fino alla fine e chi e' in pausa. Ora un abbonamento vero attivo
-- e' un contratto in stato Current o Freezed (in pausa), con la fine non passata, di un piano che non
-- e' pass/prova/Guest Pass, ne' un aggiuntivo, ne' escluso (Wellhub e simili), con un canone.
--
-- Il numero: 2.508 soci con un abbonamento vero in corso, 94 hanno gia' prenotato Formula 8, restano
-- 2.408 (iscritti prima del giorno di partenza del benvenuto). La lista fissa aveva 2.142 persone: si
-- aggiungono le altre 266 (disdetta in corso o pausa), senza toccare le azioni gia' presenti.
-- Stessa definizione per il benvenuto e per l'abbonamento mostrato in lista.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $mig$
declare
  def text;
  nuova text;
begin
  def := pg_get_functiondef('crm.azioni_istruttori_candidati(jsonb, date, date)'::regprocedure);
  nuova := replace(def, $a$c.stato = 'Current' and c.data_disdetta is null and (c.data_fine is null or c.data_fine >= r.oggi)$a$,
    $b$c.stato in ('Current', 'Freezed') and (c.data_fine is null or c.data_fine >= r.oggi)$b$);
  if nuova = def then raise exception 'azioni_istruttori_candidati: controllo attivo non trovato'; end if;
  execute nuova;

  def := pg_get_functiondef('public.crm_azioni_istruttori(text, text, text, text, integer)'::regprocedure);
  nuova := replace(def, $a$c.stato = 'Current' and c.data_disdetta is null and (c.data_fine is null or c.data_fine >= oggi)$a$,
    $b$c.stato in ('Current', 'Freezed') and (c.data_fine is null or c.data_fine >= oggi)$b$);
  if nuova = def then raise exception 'crm_azioni_istruttori: controllo attivo non trovato'; end if;
  execute nuova;
end;
$mig$;

-- Le azioni che mancano, con le regole del benvenuto (abbonamento attivo, nessuna prenotazione Formula 8),
-- per chi era iscritto prima del giorno di partenza del benvenuto e non ha ancora nessuna azione.
insert into public.azioni_istruttori (tipo, utente_id, member_id, iscritto_il, da_fare_dal)
select 'recupero_formula8', crm.persona_del_socio(c.member_id), c.member_id, c.iscritto, (now() at time zone 'Europe/Rome')::date
  from public.automazioni b
  cross join lateral crm.azioni_istruttori_candidati(
    b.parametri, '2000-01-01'::date,
    coalesce((b.parametri ->> 'iscritti_dal')::date, (now() at time zone 'Europe/Rome')::date) - 1) c
 where b.chiave = 'azioni_istruttori_benvenuto'
   and not exists (select 1 from public.azioni_istruttori x where x.member_id = c.member_id)
on conflict (tipo, member_id) do nothing;
