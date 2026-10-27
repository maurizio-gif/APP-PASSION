-- Le disdette sono definitive: un cambio abbonamento non e' una disdetta
--
-- Una disdetta e' una persona che se ne va. Se c'e' continuita' con un altro
-- abbonamento, e' un CAMBIO di abbonamento e non deve comparire fra le
-- disdette, ne' da gestire ne' gia' gestite, e non deve contare nei numeri.
--
-- Cambio abbonamento (`crm.disdetta_cambio`): la persona ha un altro
-- abbonamento principale a pagamento (non aggiuntivo, non un pass), diverso da
-- quello disdetto, che il giorno della fine di quello e' gia' in corso o parte al
-- piu' il giorno dopo, e prosegue oltre quella fine. Esempio: il vecchio finisce
-- il 26, il nuovo comincia il 27. Un nuovo abbonamento che parte dopo una
-- pausa, anche di un solo giorno in piu', non da' continuita': quella e'
-- una disdetta vera (poi si puo' recuperare). La data di fine e' quella del
-- contratto; per le disdette senza contratto (le vecchie dell'ex gestionale) e'
-- la data di disdetta.
--
-- Il risultato sta in `public.disdette.cambio_abbonamento`, ricalcolato a ogni
-- passata di `crm.alimenta()` (ogni 5 minuti) da `crm.disdette_cambi()`, quindi
-- anche a ritroso e anche quando il nuovo abbonamento compare dopo la disdetta.
-- Le righe non si cancellano: restano nel database, solo che le letture le
-- escludono. Chi le legge: l'elenco Disdette, i numeri della home, la scheda
-- persona, il Report giornaliero, la performance del consulente e i task.
--
-- I task automatici ancora aperti di un cambio («chiamare per capire il
-- motivo») si archiviano: non servono, e archiviati non contano ne' fra gli
-- aperti ne' fra i fatti (come in 20260928k). Quelli scritti da una persona
-- restano.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

alter table public.disdette add column if not exists cambio_abbonamento boolean not null default false;

create or replace function crm.disdetta_cambio(p_contratto bigint, p_socio bigint, p_fine date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_socio is not null and p_fine is not null and exists (
    select 1
      from perfectgym.contracts k
      join perfectgym.payment_plans p on p.id = k.payment_plan_id
     where k.member_id = p_socio
       and k.club_id = (select valore::bigint from crm.impostazioni where chiave = 'club_id')
       and not k.is_deleted
       and k.id is distinct from p_contratto
       and not coalesce(p.aggiuntivo, false) and p.canone > 0 and not crm.e_pass(p.nome)
       and k.data_inizio <= p_fine + 1
       and coalesce(k.data_fine, 'infinity'::date) > p_fine)
$$;

create or replace function crm.disdette_cambi()
returns integer
language plpgsql
set search_path = ''
as $$
declare n int;
begin
  with nuovo as (
    select d.id,
           crm.disdetta_cambio(d.contract_id, coalesce(d.member_id, c.member_id),
                               coalesce(c.data_fine, c.data_disdetta, d.data_disdetta)) as cambio
      from public.disdette d
      left join perfectgym.contracts c on c.id = d.contract_id)
  update public.disdette d set cambio_abbonamento = nuovo.cambio
    from nuovo
   where nuovo.id = d.id and d.cambio_abbonamento is distinct from nuovo.cambio;
  get diagnostics n = row_count;

  update public.task t set archiviato = true, completato_il = now(), esito = null
    from public.disdette d
   where t.disdetta_id = d.id and d.cambio_abbonamento
     and t.completato_il is null and t.autore_nome = 'CRM (automatico)';
  return n;
end;
$$;

do $$
declare
  def text;
  nuova text;
  function_name text;
  vecchio text;
  nuovo text;
  volte int;
begin
  -- Un pezzo di una funzione: si sostituisce solo se c'e' esattamente quante volte previsto.
  -- (lo si fa su ogni funzione, una alla volta, con lo stesso controllo)
  for function_name, vecchio, nuovo, volte in
    select * from (values
      ('crm.disdette_dal_mirror()',
       E'  get diagnostics n = row_count;\n  return n;',
       E'  get diagnostics n = row_count;\n  perform crm.disdette_cambi();\n  return n;', 1),
      ('crm.task_disdette()',
       E'     and d.utente_id is not null and d.esito is null\n',
       E'     and d.utente_id is not null and d.esito is null and not d.cambio_abbonamento\n', 1),
      ('public.crm_disdette(text, integer, uuid, text, date, date, date, date, text)',
       E'   where (p_consulente is null or d.gestito_da = p_consulente)\n',
       E'   where (p_consulente is null or d.gestito_da = p_consulente)\n     and not d.cambio_abbonamento\n', 1),
      ('public.crm_home()',
       E'(d.esito is null or d.esito = ''standby'') and d.gestito_da is null',
       E'(d.esito is null or d.esito = ''standby'') and d.gestito_da is null and not d.cambio_abbonamento', 1),
      ('public.crm_home()',
       E'(d.esito is null or d.esito = ''standby'') and d.gestito_da = me',
       E'(d.esito is null or d.esito = ''standby'') and d.gestito_da = me and not d.cambio_abbonamento', 1),
      ('public.crm_persona(uuid)',
       E'from public.disdette d where d.utente_id = u.id)',
       E'from public.disdette d where d.utente_id = u.id and not d.cambio_abbonamento)', 1),
      ('public.crm_report_giornaliero(date, uuid)',
       E'from public.disdette d where (d.creato_il at time zone ''Europe/Rome'')::date = giorno',
       E'from public.disdette d where not d.cambio_abbonamento and (d.creato_il at time zone ''Europe/Rome'')::date = giorno', 1),
      ('public.crm_report_giornaliero(date, uuid)',
       E'from public.disdette d where (d.gestito_il at time zone ''Europe/Rome'')::date = giorno',
       E'from public.disdette d where not d.cambio_abbonamento and (d.gestito_il at time zone ''Europe/Rome'')::date = giorno', 1),
      ('public.crm_performance(uuid, integer)',
       E'where d.gestito_da = chi and date_trunc(',
       E'where d.gestito_da = chi and not d.cambio_abbonamento and date_trunc(', 1),
      ('public.crm_performance(uuid, integer)',
       E'where d.gestito_da = chi and d.esito = ''vinto''',
       E'where d.gestito_da = chi and not d.cambio_abbonamento and d.esito = ''vinto''', 1)
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

-- Una prima passata: segna i cambi di ieri, di oggi e di tutta la storia.
select crm.disdette_cambi();
