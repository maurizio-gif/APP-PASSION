-- Disdette da gestire: solo quelle recenti
--
-- «Da gestire» mostrava anche disdette di anni fa (165 senza esito, 140 con la
-- data di disdetta passata da piu' di un mese, mai chiuse su Airtable). Da qui
-- in «Da gestire», e nel numero «Disdette» della home, ci sono solo quelle con
-- la data di disdetta nel futuro o al massimo 30 giorni fa (a Roma). «Gestite»
-- e «Tutte» restano complete, e non si cancella niente.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

do $$
declare
  def text;
  nuova text;
begin
  def := pg_get_functiondef('public.crm_disdette(text,integer)'::regprocedure);
  nuova := replace(def,
    $a$           when 'da_gestire' then d.esito is null or d.esito = 'standby'$a$,
    $b$           when 'da_gestire' then (d.esito is null or d.esito = 'standby')
                                  and coalesce(d.data_disdetta, c.data_disdetta) >= (now() at time zone 'Europe/Rome')::date - 30$b$);
  if nuova = def then raise exception 'crm_disdette: testo da sostituire non trovato'; end if;
  execute nuova;

  def := pg_get_functiondef('public.crm_home()'::regprocedure);
  nuova := replace(def,
    $a$'disdette_da_gestire', (select count(*) from public.disdette where esito is null or esito = 'standby'),$a$,
    $b$'disdette_da_gestire', (select count(*) from public.disdette d
                               where (d.esito is null or d.esito = 'standby')
                                 and coalesce(d.data_disdetta, (select c.data_disdetta from perfectgym.contracts c where c.id = d.contract_id))
                                     >= (now() at time zone 'Europe/Rome')::date - 30),$b$);
  if nuova = def then raise exception 'crm_home: testo da sostituire non trovato'; end if;
  execute nuova;
end;
$$;
